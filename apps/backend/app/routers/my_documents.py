from typing import Annotated
import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.models.document import Document
from app.models.enums import UserRole
from app.models.patient import PatientProfile
from app.models.user import User
from app.schemas.document import (
    DocumentAccessResponse,
    DocumentResponse,
)
from app.services.storage_service import (
    StorageServiceError,
    create_document_access_url,
)


router = APIRouter(
    prefix="/me/documents",
    tags=["Patient Documents"],
)


def get_patient_profile(
    db: Session,
    current_user: User,
) -> PatientProfile:
    patient = db.scalar(
        select(PatientProfile).where(
            PatientProfile.user_id == current_user.id,
        )
    )

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found.",
        )

    return patient


def build_response(
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


@router.get(
    "",
    response_model=list[DocumentResponse],
)
def list_my_documents(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.PATIENT,
            )
        ),
    ],
) -> list[DocumentResponse]:
    patient = get_patient_profile(
        db,
        current_user,
    )

    documents = db.scalars(
        select(Document)
        .where(
            Document.patient_id
            == patient.id,
            Document.organization_id
            == current_user.organization_id,
            Document.patient_visible
            .is_(True),
        )
        .order_by(
            Document.created_at.desc(),
        )
    ).all()

    return [
        build_response(document)
        for document in documents
    ]


@router.post(
    "/{document_id}/access",
    response_model=DocumentAccessResponse,
)
def access_my_document(
    document_id: uuid.UUID,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.PATIENT,
            )
        ),
    ],
) -> DocumentAccessResponse:
    patient = get_patient_profile(
        db,
        current_user,
    )

    document = db.scalar(
        select(Document)
        .where(
            Document.id
            == document_id,
            Document.patient_id
            == patient.id,
            Document.organization_id
            == current_user.organization_id,
            Document.patient_visible
            .is_(True),
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    try:
        url = create_document_access_url(
            document.storage_path,
            expires_in_seconds=300,
        )
    except StorageServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to create document access URL.",
        ) from exc

    return DocumentAccessResponse(
        url=url,
        expires_in_seconds=300,
    )