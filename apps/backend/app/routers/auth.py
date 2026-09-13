from datetime import datetime, timezone
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    verify_password_or_dummy,
)
from app.models.enums import CaregiverAccessStatus, UserStatus
from app.models.user import User
from app.schemas.auth import (
    CaregiverActivateRequest,
    CaregiverActivationValidateRequest,
    CaregiverActivationValidateResponse,
    CurrentUserResponse,
    LoginRequest,
    TokenResponse,
)
from app.services.audit_service import (
    write_audit_log,
)
from app.core.security import (
    create_access_token,
    hash_password,
    validate_password_strength,
    verify_password_or_dummy,
)
from app.models.enums import (
    InvitationPurpose,
    UserStatus,
)
from app.schemas.auth import (
    AccountActivateRequest,
    AccountActivateResponse,
    CurrentUserResponse,
    InvitationValidateRequest,
    InvitationValidateResponse,
    LoginRequest,
    TokenResponse,
)
from app.services.invitation_service import (
    get_valid_invitation,
)
from app.models.patient import PatientProfile
from app.schemas.auth import (
    AccountActivateRequest,
    AccountActivateResponse,
    CurrentUserResponse,
    InvitationValidateRequest,
    InvitationValidateResponse,
    LoginRequest,
    PatientActivateRequest,
    PatientActivationValidateRequest,
    PatientActivationValidateResponse,
    TokenResponse,
)
from app.models.caregiver import (
    CaregiverPatientAccess,
    CaregiverProfile,
)
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    email = (
        str(payload.email)
        .strip()
        .lower()
    )

    user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    valid_password = (
        verify_password_or_dummy(
            payload.password,
            (
                user.password_hash
                if user is not None
                else None
            ),
        )
    )

    if user is None or not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active.",
        )

    user.last_login_at = datetime.now(
        timezone.utc
    )

    write_audit_log(
        db,
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="LOGIN_SUCCESS",
        resource_type="user",
        resource_id=str(user.id),
    )

    db.commit()

    access_token = create_access_token(
        user_id=str(user.id),
        role=user.role.value,
        organization_id=str(
            user.organization_id
        ),
    )

    return TokenResponse(
        access_token=access_token,
    )


@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
def me(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> CurrentUserResponse:
    return CurrentUserResponse(
        id=current_user.id,
        organization_id=(
            current_user.organization_id
        ),
        email=current_user.email,
        role=current_user.role,
        status=current_user.status,
    )

@router.post(
    "/activate/validate",
    response_model=InvitationValidateResponse,
)
def validate_activation(
    payload: InvitationValidateRequest,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
) -> InvitationValidateResponse:
    invitation = get_valid_invitation(
        db,
        raw_token=payload.token,
         purpose=(
        InvitationPurpose
        .NAVIGATOR_ACTIVATION
    ),
    )

    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invitation is invalid "
                "or has expired."
            ),
        )

    user = db.get(
        User,
        invitation.user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is invalid.",
        )

    if user.status != UserStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This account cannot "
                "be activated."
            ),
        )

    return InvitationValidateResponse(
        valid=True,
        email=user.email,
        role=user.role,
    )

@router.post(
    "/activate",
    response_model=AccountActivateResponse,
)
def activate_account(
    payload: AccountActivateRequest,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
) -> AccountActivateResponse:
    invitation = get_valid_invitation(
        db,
        raw_token=payload.token,
         purpose=(
        InvitationPurpose
        .NAVIGATOR_ACTIVATION
    ),
    )

    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invitation is invalid "
                "or has expired."
            ),
        )

    user = db.get(
        User,
        invitation.user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is invalid.",
        )

    if user.status != UserStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This account cannot "
                "be activated."
            ),
        )

    try:
        validate_password_strength(
            payload.password
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    now = datetime.now(timezone.utc)

    user.password_hash = hash_password(
        payload.password
    )

    user.email_verified_at = now
    user.status = UserStatus.ACTIVE

    invitation.used_at = now

    write_audit_log(
        db,
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="ACCOUNT_ACTIVATED",
        resource_type="user",
        resource_id=str(user.id),
        metadata_json={
            "invitation_id": str(
                invitation.id
            ),
            "purpose": (
                invitation.purpose.value
            ),
        },
    )

    db.commit()

    return AccountActivateResponse(
        message=(
            "Account activated successfully. "
            "You can now log in."
        ),
    )

@router.post(
    "/patient-activate/validate",
    response_model=(
        PatientActivationValidateResponse
    ),
)
def validate_patient_activation(
    payload: PatientActivationValidateRequest,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
) -> PatientActivationValidateResponse:
    invitation = get_valid_invitation(
        db,
        raw_token=payload.token,
        purpose=(
            InvitationPurpose
            .PATIENT_ACTIVATION
        ),
    )

    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invitation is invalid "
                "or has expired."
            ),
        )

    user = db.get(
        User,
        invitation.user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is invalid.",
        )

    if user.status != UserStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This account cannot "
                "be activated."
            ),
        )

    patient_profile = db.scalar(
        select(PatientProfile).where(
            PatientProfile.user_id
            == user.id
        )
    )

    if patient_profile is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient profile not found.",
        )

    if (
        patient_profile.date_of_birth
        != payload.date_of_birth
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unable to verify patient "
                "information."
            ),
        )

    return (
        PatientActivationValidateResponse(
            valid=True,
            email=user.email,
            first_name=(
                patient_profile.first_name
            ),
        )
    )

@router.post(
    "/patient-activate",
    response_model=AccountActivateResponse,
)
def activate_patient(
    payload: PatientActivateRequest,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
) -> AccountActivateResponse:
    invitation = get_valid_invitation(
        db,
        raw_token=payload.token,
        purpose=(
            InvitationPurpose
            .PATIENT_ACTIVATION
        ),
    )

    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invitation is invalid "
                "or has expired."
            ),
        )

    user = db.get(
        User,
        invitation.user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is invalid.",
        )

    if user.status != UserStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This account cannot "
                "be activated."
            ),
        )

    patient_profile = db.scalar(
        select(PatientProfile).where(
            PatientProfile.user_id
            == user.id
        )
    )

    if patient_profile is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient profile not found.",
        )

    if (
        patient_profile.date_of_birth
        != payload.date_of_birth
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unable to verify patient "
                "information."
            ),
        )

    try:
        validate_password_strength(
            payload.password
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=str(exc),
        ) from exc

    now = datetime.now(timezone.utc)

    user.password_hash = hash_password(
        payload.password
    )

    user.email_verified_at = now
    user.status = UserStatus.ACTIVE

    invitation.used_at = now

    write_audit_log(
        db,
        organization_id=user.organization_id,
        actor_user_id=user.id,
        patient_id=patient_profile.id,
        action="ACCOUNT_ACTIVATED",
        resource_type="patient",
        resource_id=str(
            patient_profile.id
        ),
        metadata_json={
            "invitation_id": str(
                invitation.id
            ),
            "purpose": (
                invitation.purpose.value
            ),
        },
    )

    db.commit()

    return AccountActivateResponse(
        message=(
            "Account activated successfully. "
            "You can now log in."
        ),
    )

@router.post(
    "/caregiver-activate/validate",
    response_model=(
        CaregiverActivationValidateResponse
    ),
)
def validate_caregiver_activation(
    payload: CaregiverActivationValidateRequest,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
) -> CaregiverActivationValidateResponse:
    invitation = get_valid_invitation(
        db,
        raw_token=payload.token,
        purpose=(
            InvitationPurpose
            .CAREGIVER_ACTIVATION
        ),
    )

    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invitation is invalid "
                "or has expired."
            ),
        )

    user = db.get(
        User,
        invitation.user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is invalid.",
        )

    profile = db.scalar(
        select(CaregiverProfile).where(
            CaregiverProfile.user_id
            == user.id
        )
    )

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Caregiver profile not found.",
        )

    return (
        CaregiverActivationValidateResponse(
            valid=True,
            email=user.email,
            first_name=profile.first_name,
        )
    )

@router.post(
    "/caregiver-activate",
    response_model=AccountActivateResponse,
)
def activate_caregiver(
    payload: CaregiverActivateRequest,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
) -> AccountActivateResponse:
    invitation = get_valid_invitation(
        db,
        raw_token=payload.token,
        purpose=(
            InvitationPurpose
            .CAREGIVER_ACTIVATION
        ),
    )

    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invitation is invalid "
                "or has expired."
            ),
        )

    user = db.get(
        User,
        invitation.user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is invalid.",
        )

    if user.status not in {
        UserStatus.PENDING,
        UserStatus.ACTIVE,
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This account cannot "
                "be activated."
            ),
        )

    try:
        validate_password_strength(
            payload.password
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=str(exc),
        ) from exc

    now = datetime.now(timezone.utc)

    if user.status == UserStatus.PENDING:
        user.password_hash = hash_password(
            payload.password
        )
        user.email_verified_at = now
        user.status = UserStatus.ACTIVE

    invitation.used_at = now

    access_rows = db.scalars(
        select(CaregiverPatientAccess)
        .where(
            CaregiverPatientAccess
            .caregiver_user_id
            == user.id,
            CaregiverPatientAccess.status
            == CaregiverAccessStatus.INVITED,
        )
    ).all()

    for access in access_rows:
        access.status = (
            CaregiverAccessStatus.ACTIVE
        )

    write_audit_log(
        db,
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="ACCOUNT_ACTIVATED",
        resource_type="caregiver",
        resource_id=str(user.id),
        metadata_json={
            "invitation_id": str(
                invitation.id
            ),
            "purpose": (
                invitation.purpose.value
            ),
        },
    )

    db.commit()

    return AccountActivateResponse(
        message=(
            "Account activated successfully. "
            "You can now log in."
        ),
    )