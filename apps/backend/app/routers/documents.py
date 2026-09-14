import uuid

from pathlib import Path

from typing import Annotated

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

from sqlalchemy.exc import (
    SQLAlchemyError,
)

from sqlalchemy.orm import Session

from app.core.auth import (
    require_roles,
)

from app.core.config import settings

from app.core.database import get_db

from app.models.document import (
    Document,
)

from app.models.enums import (
    UserRole,
)

from app.models.user import User

from app.schemas.document import (
    DocumentAccessResponse,
    DocumentResponse,
)

from app.services.audit_service import (
    write_audit_log,
)

from app.services.permissions import (
    get_patient_for_navigator,
)

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


MAX_DOCUMENT_SIZE_BYTES = (
    10 * 1024 * 1024
)


ALLOWED_DOCUMENT_TYPES = {
    "referral",
    "care_plan",
    "discharge_instructions",
    "administrative",
    "other",
}


@router.get(
    "",
    response_model=list[
        DocumentResponse
    ],
)
def list_documents(
    patient_id: uuid.UUID,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.NAVIGATOR
            )
        ),
    ],
) -> list[DocumentResponse]:
    get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    documents = db.scalars(
        select(Document)
        .where(
            Document.patient_id
            == patient_id,
            Document.organization_id
            == current_user.organization_id,
        )
        .order_by(
            Document.created_at.desc()
        )
    ).all()

    return [
        build_document_response(
            document
        )
        for document in documents
    ]


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
async def upload_patient_document(
    patient_id: uuid.UUID,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.NAVIGATOR
            )
        ),
    ],
    document_type: Annotated[
        str,
        Form(),
    ],
    file: Annotated[
        UploadFile,
        File(),
    ],
) -> DocumentResponse:
    patient = (
        get_patient_for_navigator(
            db,
            patient_id=patient_id,
            navigator=current_user,
        )
    )

    normalized_document_type = (
        document_type
        .strip()
        .lower()
    )

    if (
        normalized_document_type
        not in ALLOWED_DOCUMENT_TYPES
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "Invalid document type."
            ),
        )

    original_filename = (
        Path(
            file.filename
            or "document.pdf"
        ).name
    )

    if not (
        original_filename
        .lower()
        .endswith(".pdf")
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_415_UNSUPPORTED_MEDIA_TYPE
            ),
            detail=(
                "Only PDF documents "
                "are supported."
            ),
        )

    content = await file.read(
        MAX_DOCUMENT_SIZE_BYTES
        + 1
    )

    await file.close()

    if not content:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "The uploaded document "
                "is empty."
            ),
        )

    if (
        len(content)
        > MAX_DOCUMENT_SIZE_BYTES
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_413_CONTENT_TOO_LARGE
            ),
            detail=(
                "Document exceeds the "
                "10 MB upload limit."
            ),
        )

    # Do not rely only on filename or
    # browser-provided Content-Type.
    if not content.startswith(
        b"%PDF-"
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_415_UNSUPPORTED_MEDIA_TYPE
            ),
            detail=(
                "The uploaded file is "
                "not a valid PDF."
            ),
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
            status_code=(
                status
                .HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to store the "
                "document."
            ),
        ) from exc

    document = Document(
        id=document_id,
        organization_id=(
            current_user.organization_id
        ),
        patient_id=patient.id,
        uploaded_by_user_id=(
            current_user.id
        ),
        document_type=(
            normalized_document_type
        ),
        original_filename=(
            original_filename
        ),
        storage_bucket=(
            settings
            .supabase_storage_bucket
        ),
        storage_path=(
            storage_path
        ),
        content_type=(
            "application/pdf"
        ),
        file_size_bytes=(
            len(content)
        ),
    )

    try:
        db.add(document)

        write_audit_log(
            db,
            organization_id=(
                current_user
                .organization_id
            ),
            actor_user_id=(
                current_user.id
            ),
            patient_id=patient.id,
            action=(
                "PATIENT_DOCUMENT_UPLOADED"
            ),
            resource_type="document",
            resource_id=str(
                document.id
            ),
            metadata_json={
                "document_type": (
                    normalized_document_type
                ),
                "original_filename": (
                    original_filename
                ),
                "file_size_bytes": (
                    len(content)
                ),
            },
        )

        db.commit()

        db.refresh(
            document
        )

    except SQLAlchemyError as exc:
        db.rollback()

        try:
            delete_document(
                storage_path=(
                    storage_path
                ),
            )
        except StorageServiceError:
            pass

        raise HTTPException(
            status_code=(
                status
                .HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to save document "
                "metadata."
            ),
        ) from exc

    return build_document_response(
        document
    )


@router.post(
    "/{document_id}/access",
    response_model=(
        DocumentAccessResponse
    ),
)
def create_document_access(
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
                UserRole.NAVIGATOR
            )
        ),
    ],
) -> DocumentAccessResponse:
    get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    document = db.scalar(
        select(Document).where(
            Document.id
            == document_id,
            Document.patient_id
            == patient_id,
            Document.organization_id
            == current_user.organization_id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Document not found."
            ),
        )

    expires_in_seconds = 300

    try:
        url = (
            create_document_access_url(
                storage_path=(
                    document.storage_path
                ),
                expires_in_seconds=(
                    expires_in_seconds
                ),
            )
        )

    except StorageServiceError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to access the "
                "document."
            ),
        ) from exc

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=(
            current_user.id
        ),
        patient_id=patient_id,
        action=(
            "PATIENT_DOCUMENT_ACCESSED"
        ),
        resource_type="document",
        resource_id=str(
            document.id
        ),
    )

    db.commit()

    return DocumentAccessResponse(
        url=url,
        expires_in_seconds=(
            expires_in_seconds
        ),
    )


def build_document_response(
    document: Document,
) -> DocumentResponse:
    return DocumentResponse(
        id=document.id,
        patient_id=(
            document.patient_id
        ),
        document_type=(
            document.document_type
        ),
        original_filename=(
            document.original_filename
        ),
        content_type=(
            document.content_type
        ),
        file_size_bytes=(
            document.file_size_bytes
        ),
        uploaded_by_user_id=(
            document.uploaded_by_user_id
        ),
        created_at=(
            document.created_at
        ),
    )