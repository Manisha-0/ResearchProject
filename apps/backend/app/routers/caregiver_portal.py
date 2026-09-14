from datetime import datetime, timezone
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

from app.models.appointment import Appointment
from app.models.caregiver import (
    CaregiverPatientAccess,
    CaregiverPermission,
    CaregiverProfile,
)
from app.models.document import Document
from app.models.enums import (
    AppointmentStatus,
    CaregiverAccessStatus,
    CaregiverPermissionType,
    UserRole,
)
from app.models.journey import CareJourneyItem
from app.models.patient import PatientProfile
from app.models.user import User

from app.schemas.caregiver_portal import (
    CaregiverPortalAppointmentResponse,
    CaregiverPortalPatientResponse,
    CaregiverPortalResponse,
)
from app.schemas.document import (
    DocumentAccessResponse,
    DocumentResponse,
)

from app.services.audit_service import (
    write_audit_log,
)
from app.services.storage_service import (
    StorageServiceError,
    create_document_access_url,
)


router = APIRouter(
    prefix="/caregiver",
    tags=["Caregiver Portal"],
)


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


def get_caregiver_patient_access(
    db: Session,
    *,
    patient_id: uuid.UUID,
    current_user: User,
) -> tuple[
    CaregiverPatientAccess,
    PatientProfile,
]:
    """
    Resolve an ACTIVE caregiver-to-patient relationship
    and verify that the patient belongs to the caregiver's
    organization.
    """

    access = db.scalar(
        select(
            CaregiverPatientAccess
        ).where(
            CaregiverPatientAccess.caregiver_user_id
            == current_user.id,
            CaregiverPatientAccess.patient_id
            == patient_id,
            CaregiverPatientAccess.status
            == CaregiverAccessStatus.ACTIVE,
        )
    )

    if access is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient access not found.",
        )

    patient = db.get(
        PatientProfile,
        access.patient_id,
    )

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    patient_user = db.get(
        User,
        patient.user_id,
    )

    if (
        patient_user is None
        or patient_user.organization_id
        != current_user.organization_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient access not found.",
        )

    return access, patient


def get_caregiver_permissions(
    db: Session,
    *,
    caregiver_access_id: uuid.UUID,
) -> list[CaregiverPermissionType]:
    return list(
        db.scalars(
            select(
                CaregiverPermission.permission
            ).where(
                CaregiverPermission.caregiver_access_id
                == caregiver_access_id
            )
        ).all()
    )


def require_caregiver_permission(
    db: Session,
    *,
    caregiver_access_id: uuid.UUID,
    permission: CaregiverPermissionType,
) -> None:
    has_permission = db.scalar(
        select(
            CaregiverPermission.id
        ).where(
            CaregiverPermission.caregiver_access_id
            == caregiver_access_id,
            CaregiverPermission.permission
            == permission,
        )
    )

    if has_permission is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You do not have permission "
                "to access this resource."
            ),
        )


def get_document_for_caregiver(
    db: Session,
    *,
    patient_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: User,
) -> tuple[
    CaregiverPatientAccess,
    PatientProfile,
    Document,
]:
    access, patient = (
        get_caregiver_patient_access(
            db,
            patient_id=patient_id,
            current_user=current_user,
        )
    )

    require_caregiver_permission(
        db,
        caregiver_access_id=access.id,
        permission=(
            CaregiverPermissionType.DOCUMENTS
        ),
    )

    document = db.scalar(
        select(
            Document
        ).where(
            Document.id == document_id,
            Document.patient_id == patient.id,
            Document.organization_id
            == current_user.organization_id,
            Document.patient_visible.is_(True),
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return (
        access,
        patient,
        document,
    )


@router.get(
    "/portal",
    response_model=CaregiverPortalResponse,
)
def get_caregiver_portal(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.CAREGIVER
            )
        ),
    ],
) -> CaregiverPortalResponse:
    caregiver_profile = db.scalar(
        select(
            CaregiverProfile
        ).where(
            CaregiverProfile.user_id
            == current_user.id
        )
    )

    if caregiver_profile is None:
        return CaregiverPortalResponse(
            caregiver_first_name="Caregiver",
            caregiver_last_name="",
            patients=[],
        )

    accesses = db.scalars(
        select(
            CaregiverPatientAccess
        )
        .where(
            CaregiverPatientAccess.caregiver_user_id
            == current_user.id,
            CaregiverPatientAccess.status
            == CaregiverAccessStatus.ACTIVE,
        )
        .order_by(
            CaregiverPatientAccess.created_at.asc()
        )
    ).all()

    patients = []

    for access in accesses:
        patient = db.get(
            PatientProfile,
            access.patient_id,
        )

        if patient is None:
            continue

        patient_user = db.get(
            User,
            patient.user_id,
        )

        if (
            patient_user is None
            or patient_user.organization_id
            != current_user.organization_id
        ):
            continue

        permissions = (
            get_caregiver_permissions(
                db,
                caregiver_access_id=access.id,
            )
        )

        next_appointment = None

        if (
            CaregiverPermissionType.APPOINTMENTS
            in permissions
        ):
            row = db.execute(
                select(
                    Appointment,
                    CareJourneyItem,
                )
                .join(
                    CareJourneyItem,
                    CareJourneyItem.id
                    == Appointment.journey_item_id,
                )
                .where(
                    Appointment.patient_id
                    == patient.id,
                    Appointment.status
                    == AppointmentStatus.SCHEDULED,
                    Appointment.scheduled_start
                    >= datetime.now(
                        timezone.utc
                    ),
                    CareJourneyItem.patient_visible
                    .is_(True),
                )
                .order_by(
                    Appointment.scheduled_start.asc()
                )
                .limit(1)
            ).first()

            if row is not None:
                appointment, journey_item = row

                next_appointment = (
                    CaregiverPortalAppointmentResponse(
                        appointment_id=appointment.id,
                        title=journey_item.title,
                        scheduled_start=(
                            appointment.scheduled_start
                        ),
                        scheduled_end=(
                            appointment.scheduled_end
                        ),
                        status=appointment.status,
                        appointment_type=(
                            appointment.appointment_type
                        ),
                        provider_name=(
                            appointment.provider_name
                        ),
                        department=(
                            appointment.department
                        ),
                        location_name=(
                            appointment.location_name
                        ),
                        address_text=(
                            appointment.address_text
                        ),
                    )
                )

        patients.append(
            CaregiverPortalPatientResponse(
                patient_id=patient.id,
                first_name=patient.first_name,
                last_name=patient.last_name,
                relationship=access.relationship,
                permissions=permissions,
                next_appointment=(
                    next_appointment
                ),
            )
        )

    return CaregiverPortalResponse(
        caregiver_first_name=(
            caregiver_profile.first_name
        ),
        caregiver_last_name=(
            caregiver_profile.last_name
        ),
        patients=patients,
    )


@router.get(
    "/patients/{patient_id}/documents",
    response_model=list[DocumentResponse],
)
def list_caregiver_patient_documents(
    patient_id: uuid.UUID,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.CAREGIVER
            )
        ),
    ],
) -> list[DocumentResponse]:
    access, patient = (
        get_caregiver_patient_access(
            db,
            patient_id=patient_id,
            current_user=current_user,
        )
    )

    require_caregiver_permission(
        db,
        caregiver_access_id=access.id,
        permission=(
            CaregiverPermissionType.DOCUMENTS
        ),
    )

    documents = db.scalars(
        select(
            Document
        )
        .where(
            Document.patient_id
            == patient.id,
            Document.organization_id
            == current_user.organization_id,
            Document.patient_visible.is_(True),
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
    (
        "/patients/{patient_id}/documents/"
        "{document_id}/access"
    ),
    response_model=DocumentAccessResponse,
)
def create_caregiver_document_access(
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
                UserRole.CAREGIVER
            )
        ),
    ],
) -> DocumentAccessResponse:
    (
        _access,
        patient,
        document,
    ) = get_document_for_caregiver(
        db,
        patient_id=patient_id,
        document_id=document_id,
        current_user=current_user,
    )

    try:
        url = (
            create_document_access_url(
                storage_path=(
                    document.storage_path
                ),
                expires_in_seconds=300,
            )
        )

    except StorageServiceError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to create "
                "document access URL."
            ),
        ) from exc

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action=(
            "CAREGIVER_DOCUMENT_ACCESSED"
        ),
        resource_type="document",
        resource_id=document.id,
        metadata_json={
            "original_filename": (
                document.original_filename
            ),
            "caregiver_user_id": str(
                current_user.id
            ),
        },
    )

    db.commit()

    return DocumentAccessResponse(
        url=url,
        expires_in_seconds=300,
    )


@router.get(
    "/patients"
)
def list_caregiver_patients(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.CAREGIVER
            )
        ),
    ],
):
    accesses = db.scalars(
        select(
            CaregiverPatientAccess
        ).where(
            CaregiverPatientAccess.caregiver_user_id
            == current_user.id,
            CaregiverPatientAccess.status
            == CaregiverAccessStatus.ACTIVE,
        )
    ).all()

    result = []

    for access in accesses:
        patient = db.get(
            PatientProfile,
            access.patient_id,
        )

        if patient is None:
            continue

        patient_user = db.get(
            User,
            patient.user_id,
        )

        if (
            patient_user is None
            or patient_user.organization_id
            != current_user.organization_id
        ):
            continue

        permissions = (
            get_caregiver_permissions(
                db,
                caregiver_access_id=access.id,
            )
        )

        result.append(
            {
                "patient_id": str(
                    patient.id
                ),
                "first_name": (
                    patient.first_name
                ),
                "last_name": (
                    patient.last_name
                ),
                "relationship": (
                    access.relationship
                ),
                "permissions": [
                    permission.value
                    for permission
                    in permissions
                ],
            }
        )

    return result