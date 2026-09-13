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
from app.models.caregiver import (
    CaregiverPatientAccess,
    CaregiverPermission,
    CaregiverProfile,
)
from app.models.enums import (
    CaregiverAccessStatus,
    UserRole,
    UserStatus,
)
from app.models.user import User
from app.schemas.caregiver import (
    CaregiverInitiateRequest,
    CaregiverInitiateResponse,
)
from app.services.audit_service import (
    write_audit_log,
)
from app.services.permissions import (
    get_patient_for_navigator,
)


router = APIRouter(
    prefix="/patients/{patient_id}/caregivers",
    tags=["Caregivers"],
)


@router.post(
    "",
    response_model=CaregiverInitiateResponse,
    status_code=status.HTTP_201_CREATED,
)
def initiate_caregiver_access(
    patient_id: uuid.UUID,
    payload: CaregiverInitiateRequest,
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
) -> CaregiverInitiateResponse:
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    email = (
        str(payload.email)
        .strip()
        .lower()
    )

    existing_user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    if existing_user is not None:
        if (
            existing_user.role
            != UserRole.CAREGIVER
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "An account with this email "
                    "already exists."
                ),
            )

        if (
            existing_user.organization_id
            != current_user.organization_id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "An account with this email "
                    "already exists."
                ),
            )

        caregiver_user = existing_user

    else:
        caregiver_user = User(
            organization_id=(
                current_user.organization_id
            ),
            email=email,
            password_hash=None,
            role=UserRole.CAREGIVER,
            status=UserStatus.PENDING,
        )

        db.add(caregiver_user)
        db.flush()

    caregiver_profile = db.scalar(
        select(CaregiverProfile).where(
            CaregiverProfile.user_id
            == caregiver_user.id
        )
    )

    if caregiver_profile is None:
        caregiver_profile = CaregiverProfile(
            user_id=caregiver_user.id,
            first_name=(
                payload.first_name.strip()
            ),
            last_name=(
                payload.last_name.strip()
            ),
            phone=(
                payload.phone.strip()
                if payload.phone
                else None
            ),
        )

        db.add(caregiver_profile)
        db.flush()

    existing_access = db.scalar(
        select(CaregiverPatientAccess).where(
            CaregiverPatientAccess
            .caregiver_user_id
            == caregiver_user.id,
            CaregiverPatientAccess.patient_id
            == patient.id,
        )
    )

    if existing_access is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Caregiver access already exists "
                "for this patient."
            ),
        )

    access = CaregiverPatientAccess(
        caregiver_user_id=caregiver_user.id,
        patient_id=patient.id,
        relationship=(
            payload.relationship.strip()
        ),
        status=(
            CaregiverAccessStatus
            .PENDING_PATIENT_APPROVAL
        ),
        initiated_by_user_id=current_user.id,
    )

    db.add(access)
    db.flush()

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action=(
            "CAREGIVER_ACCESS_INITIATED"
        ),
        resource_type=(
            "caregiver_patient_access"
        ),
        resource_id=str(access.id),
    )

    db.commit()

    return CaregiverInitiateResponse(
        caregiver_user_id=(
            caregiver_user.id
        ),
        caregiver_access_id=access.id,
        email=caregiver_user.email,
        relationship_status=access.status,
        message=(
            "Caregiver access request "
            "created for patient approval."
        ),
    )