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
from app.models.check_in import CheckIn
from app.models.enums import (
    CheckInSource,
    UserRole,
)
from app.models.patient import PatientProfile
from app.models.user import User
from app.schemas.check_in import (
    CheckInCreateRequest,
    CheckInResponse,
)
from app.services.audit_service import (
    write_audit_log,
)
from app.services.signal_service import (
    generate_signals_from_check_in,
)
import uuid

from app.models.caregiver import (
    CaregiverPatientAccess,
    CaregiverPermission,
)
from app.models.enums import (
    CaregiverAccessStatus,
    CaregiverPermissionType,
    CheckInSource,
    UserRole,
)

router = APIRouter(
    prefix="/me/check-ins",
    tags=["Check-Ins"],
)


@router.post(
    "",
    response_model=CheckInResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_patient_check_in(
    payload: CheckInCreateRequest,
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
) -> CheckInResponse:
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

    check_in = CheckIn(
        patient_id=patient.id,
        submitted_by_user_id=current_user.id,
        source=CheckInSource.PATIENT,
        symptom_severity=(
            payload.symptom_severity
        ),
        transportation_confirmed=(
            payload.transportation_confirmed
        ),
        medication_access_issue=(
            payload.medication_access_issue
        ),
        financial_concern=(
            payload.financial_concern
        ),
        requested_help=payload.requested_help,
        free_text=(
            payload.free_text.strip()
            if payload.free_text
            else None
        ),
    )

    db.add(check_in)
    db.flush()

    generate_signals_from_check_in(
        db,
        check_in=check_in,
    )

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action="PATIENT_CHECK_IN_SUBMITTED",
        resource_type="check_in",
        resource_id=str(check_in.id),
    )

    db.commit()
    db.refresh(check_in)

    return CheckInResponse(
        id=check_in.id,
        patient_id=check_in.patient_id,
        source=check_in.source,
        symptom_severity=(
            check_in.symptom_severity
        ),
        transportation_confirmed=(
            check_in.transportation_confirmed
        ),
        medication_access_issue=(
            check_in.medication_access_issue
        ),
        financial_concern=(
            check_in.financial_concern
        ),
        requested_help=(
            check_in.requested_help
        ),
        free_text=check_in.free_text,
        created_at=check_in.created_at,
    )

@router.post(
    "/caregiver/patients/{patient_id}",
    response_model=CheckInResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_caregiver_check_in(
    patient_id: uuid.UUID,
    payload: CheckInCreateRequest,
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
) -> CheckInResponse:
    access = db.scalar(
        select(CaregiverPatientAccess).where(
            CaregiverPatientAccess
            .caregiver_user_id
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
            detail="Patient not found.",
        )

    permission = db.scalar(
        select(CaregiverPermission).where(
            CaregiverPermission
            .caregiver_access_id
            == access.id,
            CaregiverPermission.permission
            == CaregiverPermissionType
            .PROXY_CHECK_IN,
        )
    )

    if permission is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Proxy check-in permission "
                "has not been granted."
            ),
        )

    check_in = CheckIn(
        patient_id=patient_id,
        submitted_by_user_id=current_user.id,
        source=CheckInSource.CAREGIVER,
        symptom_severity=(
            payload.symptom_severity
        ),
        transportation_confirmed=(
            payload.transportation_confirmed
        ),
        medication_access_issue=(
            payload.medication_access_issue
        ),
        financial_concern=(
            payload.financial_concern
        ),
        requested_help=payload.requested_help,
        free_text=(
            payload.free_text.strip()
            if payload.free_text
            else None
        ),
        submitted_for_relationship=(
            access.relationship
        ),
    )

    db.add(check_in)
    db.flush()

    generate_signals_from_check_in(
        db,
        check_in=check_in,
    )

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient_id,
        action="CAREGIVER_CHECK_IN_SUBMITTED",
        resource_type="check_in",
        resource_id=str(check_in.id),
        metadata_json={
            "caregiver_access_id": str(
                access.id
            ),
        },
    )

    db.commit()
    db.refresh(check_in)

    return CheckInResponse(
        id=check_in.id,
        patient_id=check_in.patient_id,
        source=check_in.source,
        symptom_severity=(
            check_in.symptom_severity
        ),
        transportation_confirmed=(
            check_in.transportation_confirmed
        ),
        medication_access_issue=(
            check_in.medication_access_issue
        ),
        financial_concern=(
            check_in.financial_concern
        ),
        requested_help=(
            check_in.requested_help
        ),
        free_text=check_in.free_text,
        created_at=check_in.created_at,
    )