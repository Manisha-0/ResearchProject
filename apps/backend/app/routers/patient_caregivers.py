from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
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
)
from app.models.patient import PatientProfile
from app.models.user import User
from app.schemas.caregiver import (
    CaregiverAccessSummaryResponse,
)
from datetime import datetime, timezone
import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from app.models.enums import (
    CaregiverAccessStatus,
    InvitationPurpose,
    UserRole,
)
from app.schemas.caregiver import (
    CaregiverAccessSummaryResponse,
    CaregiverApprovalRequest,
    CaregiverApprovalResponse,
)
from app.services.audit_service import (
    write_audit_log,
)
from app.services.email_service import (
    get_email_service,
)
from app.services.invitation_service import (
    create_invitation,
)

router = APIRouter(
    prefix="/me/caregivers",
    tags=["Patient Caregivers"],
)


@router.get(
    "",
    response_model=list[
        CaregiverAccessSummaryResponse
    ],
)
def list_my_caregivers(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.PATIENT
            )
        ),
    ],
) -> list[
    CaregiverAccessSummaryResponse
]:
    patient = db.scalar(
        select(PatientProfile).where(
            PatientProfile.user_id
            == current_user.id
        )
    )

    if patient is None:
        return []

    accesses = db.scalars(
        select(CaregiverPatientAccess)
        .where(
            CaregiverPatientAccess.patient_id
            == patient.id
        )
        .order_by(
            CaregiverPatientAccess.created_at
            .desc()
        )
    ).all()

    result = []

    for access in accesses:
        caregiver_profile = db.scalar(
            select(CaregiverProfile).where(
                CaregiverProfile.user_id
                == access.caregiver_user_id
            )
        )

        caregiver_user = db.get(
            User,
            access.caregiver_user_id,
        )

        permissions = db.scalars(
            select(
                CaregiverPermission.permission
            ).where(
                CaregiverPermission
                .caregiver_access_id
                == access.id
            )
        ).all()

        if (
            caregiver_profile is None
            or caregiver_user is None
        ):
            continue

        result.append(
            CaregiverAccessSummaryResponse(
                caregiver_access_id=(
                    access.id
                ),
                caregiver_user_id=(
                    caregiver_user.id
                ),
                caregiver_name=(
                    f"{caregiver_profile.first_name} "
                    f"{caregiver_profile.last_name}"
                ),
                email=caregiver_user.email,
                relationship=(
                    access.relationship
                ),
                status=access.status,
                permissions=list(
                    permissions
                ),
            )
        )

    return result

@router.post(
    "/{caregiver_access_id}/approve",
    response_model=CaregiverApprovalResponse,
)
def approve_caregiver_access(
    caregiver_access_id: uuid.UUID,
    payload: CaregiverApprovalRequest,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.PATIENT
            )
        ),
    ],
) -> CaregiverApprovalResponse:
    patient = db.scalar(
        select(PatientProfile).where(
            PatientProfile.user_id
            == current_user.id
        )
    )

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found.",
        )

    access = db.scalar(
        select(CaregiverPatientAccess)
        .where(
            CaregiverPatientAccess.id
            == caregiver_access_id,
            CaregiverPatientAccess.patient_id
            == patient.id,
        )
    )

    if access is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Caregiver access request "
                "not found."
            ),
        )

    if (
        access.status
        != CaregiverAccessStatus
        .PENDING_PATIENT_APPROVAL
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Caregiver access request "
                "cannot be approved."
            ),
        )

    caregiver_user = db.get(
        User,
        access.caregiver_user_id,
    )

    caregiver_profile = db.scalar(
        select(CaregiverProfile).where(
            CaregiverProfile.user_id
            == access.caregiver_user_id
        )
    )

    if (
        caregiver_user is None
        or caregiver_profile is None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Caregiver account is invalid.",
        )

    requested_permissions = set(
        payload.permissions
    )

    for permission in requested_permissions:
        db.add(
            CaregiverPermission(
                caregiver_access_id=access.id,
                permission=permission,
            )
        )

    access.status = (
        CaregiverAccessStatus.INVITED
    )

    access.approved_at = datetime.now(
        timezone.utc
    )

    invitation, raw_token = (
        create_invitation(
            db,
            user=caregiver_user,
            purpose=(
                InvitationPurpose
                .CAREGIVER_ACTIVATION
            ),
            created_by_user_id=(
                current_user.id
            ),
        )
    )

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action=(
            "CAREGIVER_ACCESS_APPROVED"
        ),
        resource_type=(
            "caregiver_patient_access"
        ),
        resource_id=str(access.id),
        metadata_json={
            "invitation_id": str(
                invitation.id
            ),
            "permissions": [
                permission.value
                for permission
                in requested_permissions
            ],
        },
    )

    db.commit()

    email_service = get_email_service()

    email_service.send_account_invitation(
        email=caregiver_user.email,
        first_name=(
            caregiver_profile.first_name
        ),
        activation_token=raw_token,
    )

    return CaregiverApprovalResponse(
        caregiver_access_id=access.id,
        status=access.status,
        permissions=list(
            requested_permissions
        ),
        message=(
            "Caregiver access approved "
            "and invitation created."
        ),
    )

@router.post(
    "/{caregiver_access_id}/decline",
)
def decline_caregiver_access(
    caregiver_access_id: uuid.UUID,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.PATIENT
            )
        ),
    ],
):
    patient = db.scalar(
        select(PatientProfile).where(
            PatientProfile.user_id
            == current_user.id
        )
    )

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found.",
        )

    access = db.scalar(
        select(CaregiverPatientAccess)
        .where(
            CaregiverPatientAccess.id
            == caregiver_access_id,
            CaregiverPatientAccess.patient_id
            == patient.id,
        )
    )

    if access is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Caregiver access request "
                "not found."
            ),
        )

    if (
        access.status
        != CaregiverAccessStatus
        .PENDING_PATIENT_APPROVAL
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Caregiver access request "
                "cannot be declined."
            ),
        )

    access.status = (
        CaregiverAccessStatus.REVOKED
    )

    access.revoked_at = datetime.now(
        timezone.utc
    )

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action=(
            "CAREGIVER_ACCESS_DECLINED"
        ),
        resource_type=(
            "caregiver_patient_access"
        ),
        resource_id=str(access.id),
    )

    db.commit()

    return {
        "message": (
            "Caregiver access request declined."
        )
    }