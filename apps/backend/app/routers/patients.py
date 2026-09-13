from typing import Annotated

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
from app.models.enums import (
    InvitationPurpose,
    UserRole,
    UserStatus,
)
from app.models.patient import (
    NavigatorPatientAssignment,
    PatientProfile,
)
from app.models.user import User
from app.schemas.patient import (
    PatientCreateRequest,
    PatientCreateResponse,
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
from app.schemas.patient import (
    PatientCreateRequest,
    PatientCreateResponse,
    PatientSummaryResponse,
)

router = APIRouter(
    prefix="/patients",
    tags=["Patients"],
)


@router.post(
    "",
    response_model=PatientCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_patient(
    payload: PatientCreateRequest,
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
) -> PatientCreateResponse:
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
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An account with this email "
                "already exists."
            ),
        )

    patient_user = User(
        organization_id=(
            current_user.organization_id
        ),
        email=email,
        password_hash=None,
        role=UserRole.PATIENT,
        status=UserStatus.PENDING,
    )

    db.add(patient_user)
    db.flush()

    patient_profile = PatientProfile(
        user_id=patient_user.id,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        date_of_birth=payload.date_of_birth,
        phone=(
            payload.phone.strip()
            if payload.phone
            else None
        ),
        preferred_language=(
            payload.preferred_language.strip()
        ),
        preferred_contact_method=(
            payload.preferred_contact_method.strip()
            if payload.preferred_contact_method
            else None
        ),
        care_program=(
            payload.care_program.strip()
            if payload.care_program
            else None
        ),
        external_patient_reference=(
            payload.external_patient_reference.strip()
            if payload.external_patient_reference
            else None
        ),
    )

    db.add(patient_profile)
    db.flush()

    assignment = NavigatorPatientAssignment(
        navigator_user_id=current_user.id,
        patient_id=patient_profile.id,
    )

    db.add(assignment)

    invitation, raw_token = create_invitation(
        db,
        user=patient_user,
        purpose=(
            InvitationPurpose
            .PATIENT_ACTIVATION
        ),
        created_by_user_id=current_user.id,
    )

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient_profile.id,
        action="PATIENT_INVITED",
        resource_type="patient",
        resource_id=str(
            patient_profile.id
        ),
        metadata_json={
            "invitation_id": str(
                invitation.id
            ),
        },
    )

    db.commit()

    email_service = get_email_service()

    email_service.send_account_invitation(
        email=patient_user.email,
        first_name=(
            patient_profile.first_name
        ),
        activation_token=raw_token,
    )

    return PatientCreateResponse(
        patient_id=patient_profile.id,
        user_id=patient_user.id,
        email=patient_user.email,
        status=patient_user.status.value,
        message=(
            "Patient invitation created."
        ),
    )

@router.get(
    "",
    response_model=list[
        PatientSummaryResponse
    ],
)
def list_my_patients(
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
) -> list[PatientSummaryResponse]:
    statement = (
        select(
            PatientProfile,
            User,
        )
        .join(
            NavigatorPatientAssignment,
            (
                NavigatorPatientAssignment
                .patient_id
                == PatientProfile.id
            ),
        )
        .join(
            User,
            User.id
            == PatientProfile.user_id,
        )
        .where(
            NavigatorPatientAssignment
            .navigator_user_id
            == current_user.id,
            User.organization_id
            == current_user.organization_id,
        )
        .order_by(
            PatientProfile.last_name,
            PatientProfile.first_name,
        )
    )

    rows = db.execute(
        statement
    ).all()

    return [
        PatientSummaryResponse(
            patient_id=profile.id,
            user_id=user.id,
            first_name=profile.first_name,
            last_name=profile.last_name,
            email=user.email,
            status=user.status.value,
            care_program=profile.care_program,
        )
        for profile, user in rows
    ]