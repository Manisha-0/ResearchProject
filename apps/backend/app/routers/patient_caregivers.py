from datetime import (
    datetime,
    timezone,
)
from typing import Annotated
import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import (
    delete,
    select,
)
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
    InvitationPurpose,
    UserRole,
    UserStatus,
)
from app.models.patient import (
    PatientProfile,
)
from app.models.user import User
from app.schemas.caregiver import (
    CaregiverAccessSummaryResponse,
    CaregiverApprovalRequest,
    CaregiverApprovalResponse,
    CaregiverPermissionUpdateRequest,
    CaregiverPermissionUpdateResponse,
    CaregiverRevokeResponse,
    PatientCaregiverCreateRequest,
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


def get_current_patient(
    db: Session,
    *,
    current_user: User,
) -> PatientProfile:
    patient = db.scalar(
        select(PatientProfile).where(
            PatientProfile.user_id
            == current_user.id
        )
    )

    if patient is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Patient profile not found.",
        )

    return patient


def get_patient_caregiver_access(
    db: Session,
    *,
    patient_id: uuid.UUID,
    caregiver_access_id: uuid.UUID,
) -> CaregiverPatientAccess:
    access = db.scalar(
        select(
            CaregiverPatientAccess
        ).where(
            CaregiverPatientAccess.id
            == caregiver_access_id,
            CaregiverPatientAccess.patient_id
            == patient_id,
        )
    )

    if access is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Caregiver access not found."
            ),
        )

    return access


def replace_permissions(
    db: Session,
    *,
    caregiver_access_id: uuid.UUID,
    permissions,
) -> None:
    db.execute(
        delete(
            CaregiverPermission
        ).where(
            CaregiverPermission
            .caregiver_access_id
            == caregiver_access_id
        )
    )

    for permission in set(permissions):
        db.add(
            CaregiverPermission(
                caregiver_access_id=(
                    caregiver_access_id
                ),
                permission=permission,
            )
        )


def build_caregiver_summary(
    db: Session,
    *,
    access: CaregiverPatientAccess,
) -> (
    CaregiverAccessSummaryResponse
    | None
):
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
        return None

    permissions = db.scalars(
        select(
            CaregiverPermission.permission
        ).where(
            CaregiverPermission
            .caregiver_access_id
            == access.id
        )
    ).all()

    return CaregiverAccessSummaryResponse(
        caregiver_access_id=access.id,
        caregiver_user_id=(
            caregiver_user.id
        ),
        caregiver_name=(
            f"{caregiver_profile.first_name} "
            f"{caregiver_profile.last_name}"
        ),
        email=caregiver_user.email,
        relationship=access.relationship,
        status=access.status,
        permissions=list(permissions),
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
    patient = get_current_patient(
        db,
        current_user=current_user,
    )

    accesses = db.scalars(
        select(
            CaregiverPatientAccess
        )
        .where(
            CaregiverPatientAccess.patient_id
            == patient.id
        )
        .order_by(
            CaregiverPatientAccess
            .created_at
            .desc()
        )
    ).all()

    result: list[
        CaregiverAccessSummaryResponse
    ] = []

    for access in accesses:
        summary = build_caregiver_summary(
            db,
            access=access,
        )

        if summary is not None:
            result.append(summary)

    return result


@router.post(
    "",
    response_model=(
        CaregiverAccessSummaryResponse
    ),
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def add_my_caregiver(
    payload: PatientCaregiverCreateRequest,
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
) -> CaregiverAccessSummaryResponse:
    patient = get_current_patient(
        db,
        current_user=current_user,
    )

    email = (
        str(payload.email)
        .strip()
        .lower()
    )

    if email == current_user.email.lower():
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "You cannot add yourself "
                "as a caregiver."
            ),
        )

    caregiver_user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    if caregiver_user is not None:
        if (
            caregiver_user.role
            != UserRole.CAREGIVER
            or caregiver_user.organization_id
            != current_user.organization_id
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "An account with this "
                    "email already exists."
                ),
            )

        if caregiver_user.status in {
            UserStatus.SUSPENDED,
            UserStatus.DISABLED,
        }:
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "This caregiver account "
                    "cannot currently be used."
                ),
            )

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
        select(
            CaregiverPatientAccess
        ).where(
            CaregiverPatientAccess
            .caregiver_user_id
            == caregiver_user.id,
            CaregiverPatientAccess.patient_id
            == patient.id,
        )
    )

    now = datetime.now(
        timezone.utc
    )

    if existing_access is not None:
        if (
            existing_access.status
            != CaregiverAccessStatus.REVOKED
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Caregiver access already "
                    "exists for this patient."
                ),
            )

        access = existing_access

        access.relationship = (
            payload.relationship.strip()
        )

        access.initiated_by_user_id = (
            current_user.id
        )

        access.revoked_at = None
        access.approved_at = now

    else:
        access = CaregiverPatientAccess(
            caregiver_user_id=(
                caregiver_user.id
            ),
            patient_id=patient.id,
            relationship=(
                payload.relationship.strip()
            ),
            status=(
                CaregiverAccessStatus.INVITED
            ),
            initiated_by_user_id=(
                current_user.id
            ),
            approved_at=now,
        )

        db.add(access)
        db.flush()

    replace_permissions(
        db,
        caregiver_access_id=access.id,
        permissions=payload.permissions,
    )

    raw_token: str | None = None

    if (
        caregiver_user.status
        == UserStatus.ACTIVE
    ):
        access.status = (
            CaregiverAccessStatus.ACTIVE
        )

    else:
        access.status = (
            CaregiverAccessStatus.INVITED
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

        invitation_id = str(
            invitation.id
        )

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action=(
            "PATIENT_CAREGIVER_ADDED"
        ),
        resource_type=(
            "caregiver_patient_access"
        ),
        resource_id=str(access.id),
        metadata_json={
            "permissions": [
                permission.value
                for permission
                in set(
                    payload.permissions
                )
            ],
            "status": access.status.value,
            **(
                {
                    "invitation_id": (
                        invitation_id
                    )
                }
                if raw_token is not None
                else {}
            ),
        },
    )

    db.commit()
    db.refresh(access)

    if raw_token is not None:
        email_service = (
            get_email_service()
        )

        email_service.send_account_invitation(
            email=caregiver_user.email,
            first_name=(
                caregiver_profile.first_name
            ),
            activation_token=raw_token,
            activation_type="caregiver",
        )

    summary = build_caregiver_summary(
        db,
        access=access,
    )

    if summary is None:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to load caregiver."
            ),
        )

    return summary


@router.post(
    "/{caregiver_access_id}/approve",
    response_model=(
        CaregiverApprovalResponse
    ),
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
    patient = get_current_patient(
        db,
        current_user=current_user,
    )

    access = get_patient_caregiver_access(
        db,
        patient_id=patient.id,
        caregiver_access_id=(
            caregiver_access_id
        ),
    )

    if (
        access.status
        != CaregiverAccessStatus
        .PENDING_PATIENT_APPROVAL
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
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
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Caregiver account is invalid."
            ),
        )

    replace_permissions(
        db,
        caregiver_access_id=access.id,
        permissions=payload.permissions,
    )

    access.approved_at = datetime.now(
        timezone.utc
    )

    raw_token: str | None = None

    if (
        caregiver_user.status
        == UserStatus.ACTIVE
    ):
        access.status = (
            CaregiverAccessStatus.ACTIVE
        )

    else:
        access.status = (
            CaregiverAccessStatus.INVITED
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

        invitation_id = str(
            invitation.id
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
            "permissions": [
                permission.value
                for permission
                in set(
                    payload.permissions
                )
            ],
            **(
                {
                    "invitation_id": (
                        invitation_id
                    )
                }
                if raw_token is not None
                else {}
            ),
        },
    )

    db.commit()

    if raw_token is not None:
        email_service = (
            get_email_service()
        )

        email_service.send_account_invitation(
            email=caregiver_user.email,
            first_name=(
                caregiver_profile.first_name
            ),
            activation_token=raw_token,
            activation_type="caregiver",
        )

    return CaregiverApprovalResponse(
        caregiver_access_id=access.id,
        status=access.status,
        permissions=list(
            set(payload.permissions)
        ),
        message=(
            "Caregiver access approved."
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
    patient = get_current_patient(
        db,
        current_user=current_user,
    )

    access = get_patient_caregiver_access(
        db,
        patient_id=patient.id,
        caregiver_access_id=(
            caregiver_access_id
        ),
    )

    if (
        access.status
        != CaregiverAccessStatus
        .PENDING_PATIENT_APPROVAL
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
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
            "Caregiver access request "
            "declined."
        )
    }


@router.patch(
    "/{caregiver_access_id}/permissions",
    response_model=(
        CaregiverPermissionUpdateResponse
    ),
)
def update_caregiver_permissions(
    caregiver_access_id: uuid.UUID,
    payload: (
        CaregiverPermissionUpdateRequest
    ),
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
) -> CaregiverPermissionUpdateResponse:
    patient = get_current_patient(
        db,
        current_user=current_user,
    )

    access = get_patient_caregiver_access(
        db,
        patient_id=patient.id,
        caregiver_access_id=(
            caregiver_access_id
        ),
    )

    if access.status not in {
        CaregiverAccessStatus.ACTIVE,
        CaregiverAccessStatus.INVITED,
    }:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "Permissions cannot be "
                "changed for this caregiver."
            ),
        )

    replace_permissions(
        db,
        caregiver_access_id=access.id,
        permissions=payload.permissions,
    )

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action=(
            "CAREGIVER_PERMISSIONS_UPDATED"
        ),
        resource_type=(
            "caregiver_patient_access"
        ),
        resource_id=str(access.id),
        metadata_json={
            "permissions": [
                permission.value
                for permission
                in set(
                    payload.permissions
                )
            ],
        },
    )

    db.commit()

    return (
        CaregiverPermissionUpdateResponse(
            caregiver_access_id=(
                access.id
            ),
            permissions=list(
                set(payload.permissions)
            ),
            message=(
                "Caregiver permissions "
                "updated."
            ),
        )
    )


@router.post(
    "/{caregiver_access_id}/revoke",
    response_model=CaregiverRevokeResponse,
)
def revoke_caregiver_access(
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
) -> CaregiverRevokeResponse:
    patient = get_current_patient(
        db,
        current_user=current_user,
    )

    access = get_patient_caregiver_access(
        db,
        patient_id=patient.id,
        caregiver_access_id=(
            caregiver_access_id
        ),
    )

    if (
        access.status
        == CaregiverAccessStatus.REVOKED
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "Caregiver access is already "
                "revoked."
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
            "CAREGIVER_ACCESS_REVOKED"
        ),
        resource_type=(
            "caregiver_patient_access"
        ),
        resource_id=str(access.id),
    )

    db.commit()

    return CaregiverRevokeResponse(
        caregiver_access_id=access.id,
        status=access.status,
        message=(
            "Caregiver access revoked."
        ),
    )