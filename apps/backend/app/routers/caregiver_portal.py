from datetime import datetime, timezone
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
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


router = APIRouter(
    prefix="/caregiver",
    tags=["Caregiver Portal"],
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
        select(CaregiverProfile).where(
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
            CaregiverPatientAccess
            .caregiver_user_id
            == current_user.id,
            CaregiverPatientAccess.status
            == CaregiverAccessStatus.ACTIVE,
        )
        .order_by(
            CaregiverPatientAccess.created_at
            .asc()
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

        permissions = list(
            db.scalars(
                select(
                    CaregiverPermission.permission
                ).where(
                    CaregiverPermission
                    .caregiver_access_id
                    == access.id
                )
            ).all()
        )

        next_appointment = None

        if (
            CaregiverPermissionType
            .APPOINTMENTS
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
                    Appointment.scheduled_start
                    .asc()
                )
                .limit(1)
            ).first()

            if row is not None:
                appointment, journey_item = (
                    row
                )

                next_appointment = (
                    CaregiverPortalAppointmentResponse(
                        appointment_id=(
                            appointment.id
                        ),
                        title=(
                            journey_item.title
                        ),
                        scheduled_start=(
                            appointment
                            .scheduled_start
                        ),
                        scheduled_end=(
                            appointment
                            .scheduled_end
                        ),
                        status=(
                            appointment.status
                        ),
                        appointment_type=(
                            appointment
                            .appointment_type
                        ),
                        provider_name=(
                            appointment
                            .provider_name
                        ),
                        department=(
                            appointment
                            .department
                        ),
                        location_name=(
                            appointment
                            .location_name
                        ),
                        address_text=(
                            appointment
                            .address_text
                        ),
                    )
                )

        patients.append(
            CaregiverPortalPatientResponse(
                patient_id=patient.id,
                first_name=patient.first_name,
                last_name=patient.last_name,
                relationship=(
                    access.relationship
                ),
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


@router.get("/patients")
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
        select(CaregiverPatientAccess)
        .where(
            CaregiverPatientAccess
            .caregiver_user_id
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

        permissions = db.scalars(
            select(
                CaregiverPermission.permission
            ).where(
                CaregiverPermission
                .caregiver_access_id
                == access.id
            )
        ).all()

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