from pathlib import Path
from typing import Annotated
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.config import settings
from app.core.database import get_db
from app.models.document import Document
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.document import (
    DocumentAccessResponse,
    DocumentResponse,
)
from app.services.audit_service import write_audit_log
from app.services.permissions import get_patient_for_navigator
from app.services.storage_service import (
    StorageServiceError,
    create_document_access_url,
    delete_document,
    upload_document,
)


router = APIRouter(
    prefix="/patients/{patient_id}/documents",
    tags=["Documents"],
)


MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024

ALLOWED_DOCUMENT_TYPES = {
    "referral",
    "care_plan",
    "discharge_instructions",
    "administrative",
    "other",
}


def build_document_response(
    document: Document,
) -> DocumentResponse:
    return DocumentResponse(
        id=document.id,
        patient_id=document.patient_id,
        document_type=document.document_type,
        original_filename=document.original_filename,
        content_type=document.content_type,
        file_size_bytes=document.file_size_bytes,
        uploaded_by_user_id=document.uploaded_by_user_id,
        patient_visible=document.patient_visible,
        created_at=document.created_at,
    )


def get_document_for_navigator(
    db: Session,
    *,
    patient_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: User,
) -> tuple[object, Document]:
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    document = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.patient_id == patient.id,
            Document.organization_id == current_user.organization_id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return patient, document


@router.get(
    "",
    response_model=list[DocumentResponse],
)
def list_patient_documents(
    patient_id: uuid.UUID,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.NAVIGATOR,
            )
        ),
    ],
) -> list[DocumentResponse]:
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    documents = db.scalars(
        select(Document)
        .where(
            Document.patient_id == patient.id,
            Document.organization_id == current_user.organization_id,
        )
        .order_by(
            Document.created_at.desc(),
        )
    ).all()

    return [
        build_document_response(document)
        for document in documents
    ]


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_patient_document(
    patient_id: uuid.UUID,
    document_type: Annotated[
        str,
        Form(),
    ],
    patient_visible: Annotated[
        bool,
        Form(),
    ] = True,
    file: Annotated[
        UploadFile,
        File(),
    ] = None,
    db: Annotated[
        Session,
        Depends(get_db),
    ] = None,
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.NAVIGATOR,
            )
        ),
    ] = None,
) -> DocumentResponse:
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    if document_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported document type.",
        )

    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A PDF document is required.",
        )

    original_filename = Path(
        file.filename or "document.pdf"
    ).name

    if Path(
        original_filename
    ).suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are supported.",
        )

    content = await file.read(
        MAX_DOCUMENT_SIZE_BYTES + 1
    )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded PDF is empty.",
        )

    if len(content) > MAX_DOCUMENT_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="The PDF exceeds the 10 MB upload limit.",
        )

    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not a valid PDF.",
        )

    document_id = uuid.uuid4()

    storage_path = (
        f"organizations/"
        f"{current_user.organization_id}/"
        f"patients/"
        f"{patient.id}/"
        f"documents/"
        f"{document_id}/"
        f"original.pdf"
    )

    try:
        upload_document(
            storage_path=storage_path,
            content=content,
        )
    except StorageServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to store the document.",
        ) from exc

    document = Document(
        id=document_id,
        organization_id=current_user.organization_id,
        patient_id=patient.id,
        uploaded_by_user_id=current_user.id,
        document_type=document_type,
        original_filename=original_filename,
        storage_bucket=settings.supabase_storage_bucket,
        storage_path=storage_path,
        content_type="application/pdf",
        file_size_bytes=len(content),
        patient_visible=patient_visible,
    )

    try:
        db.add(document)

        write_audit_log(
            db,
            organization_id=current_user.organization_id,
            actor_user_id=current_user.id,
            patient_id=patient.id,
            action="PATIENT_DOCUMENT_UPLOADED",
            resource_type="document",
            resource_id=document.id,
            metadata_json={
                "document_type": document_type,
                "original_filename": original_filename,
                "patient_visible": patient_visible,
            },
        )

        db.commit()
        db.refresh(document)

    except SQLAlchemyError as exc:
        db.rollback()

        try:
            delete_document(
                storage_path=storage_path,
            )
        except StorageServiceError:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save document metadata.",
        ) from exc

    return build_document_response(
        document
    )


@router.post(
    "/{document_id}/access",
    response_model=DocumentAccessResponse,
)
def create_patient_document_access(
    patient_id: uuid.UUID,
    document_id: uuid.UUID,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.NAVIGATOR,
            )
        ),
    ],
) -> DocumentAccessResponse:
    patient, document = get_document_for_navigator(
        db,
        patient_id=patient_id,
        document_id=document_id,
        current_user=current_user,
    )

    try:
        url = create_document_access_url(
            storage_path=document.storage_path,
            expires_in_seconds=300,
        )
    except StorageServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to create document access URL.",
        ) from exc

    write_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action="PATIENT_DOCUMENT_ACCESSED",
        resource_type="document",
        resource_id=document.id,
        metadata_json={
            "original_filename": document.original_filename,
        },
    )

    db.commit()

    return DocumentAccessResponse(
        url=url,
        expires_in_seconds=300,
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_patient_document(
    patient_id: uuid.UUID,
    document_id: uuid.UUID,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.NAVIGATOR,
            )
        ),
    ],
) -> None:
    patient, document = get_document_for_navigator(
        db,
        patient_id=patient_id,
        document_id=document_id,
        current_user=current_user,
    )

    storage_path = document.storage_path
    original_filename = document.original_filename
    patient_visible = document.patient_visible

    try:
        write_audit_log(
            db,
            organization_id=current_user.organization_id,
            actor_user_id=current_user.id,
            patient_id=patient.id,
            action="PATIENT_DOCUMENT_DELETED",
            resource_type="document",
            resource_id=document.id,
            metadata_json={
                "original_filename": original_filename,
                "patient_visible": patient_visible,
            },
        )

        db.delete(document)
        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete document.",
        ) from exc

    try:
        delete_document(
            storage_path=storage_path,
        )
    except StorageServiceError:
        # The database record has already been removed.
        # If storage cleanup fails, the private object is
        # orphaned but can no longer be accessed through Compass.
        pass