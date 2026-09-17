from datetime import (
    datetime,
    timedelta,
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
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db

from app.models.caregiver import (
    CaregiverPatientAccess,
    CaregiverPermission,
)
from app.models.check_in import CheckIn
from app.models.enums import (
    CaregiverAccessStatus,
    CaregiverPermissionType,
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
from app.services.context_engine import (
    evaluate_and_snapshot_patient,
)
from app.services.signal_service import (
    generate_signals_from_check_in,
)


router = APIRouter(
    prefix="/me/check-ins",
    tags=["Check-Ins"],
)


# ---------------------------------------------------------
# Duplicate protection
# ---------------------------------------------------------
#
# We allow multiple check-ins because a patient's
# situation can change during the day.
#
# We only reject an identical check-in submitted by
# the same user for the same patient within this
# short window.
#
# Patient and caregiver reports remain independent
# because submitted_by_user_id is part of the
# duplicate lookup.
# ---------------------------------------------------------

DUPLICATE_CHECK_IN_WINDOW_MINUTES = 5


def normalize_free_text(
    value: str | None,
) -> str | None:
    """
    Normalize optional free text before storing or
    comparing check-ins.

    Examples:
        None        -> None
        ""          -> None
        "   "       -> None
        " hello "   -> "hello"
    """

    if value is None:
        return None

    normalized = value.strip()

    if not normalized:
        return None

    return normalized


def check_ins_have_same_content(
    *,
    existing: CheckIn,
    payload: CheckInCreateRequest,
) -> bool:
    """
    Return True when an existing check-in contains
    the same meaningful answers as the incoming
    request.

    Reporter and patient identity are intentionally
    not compared here because the database query
    already scopes by:
        - patient_id
        - submitted_by_user_id
    """

    return (
        existing.symptom_severity
        == payload.symptom_severity
        and existing.transportation_confirmed
        == payload.transportation_confirmed
        and existing.medication_access_issue
        == payload.medication_access_issue
        and existing.financial_concern
        == payload.financial_concern
        and existing.requested_help
        == payload.requested_help
        and normalize_free_text(
            existing.free_text
        )
        == normalize_free_text(
            payload.free_text
        )
    )


def find_recent_duplicate_check_in(
    db: Session,
    *,
    patient_id: uuid.UUID,
    submitted_by_user_id: uuid.UUID,
    payload: CheckInCreateRequest,
) -> CheckIn | None:
    """
    Find an identical check-in submitted recently
    by the same user for the same patient.

    Important:

    Elena submitting a report does not prevent
    Rachel from submitting the same answers because
    their submitted_by_user_id values are different.

    Likewise, two different caregivers would not
    block each other's reports.
    """

    cutoff = (
        datetime.now(timezone.utc)
        - timedelta(
            minutes=(
                DUPLICATE_CHECK_IN_WINDOW_MINUTES
            )
        )
    )

    recent_check_ins = db.scalars(
        select(CheckIn)
        .where(
            CheckIn.patient_id
            == patient_id,
            CheckIn.submitted_by_user_id
            == submitted_by_user_id,
            CheckIn.created_at
            >= cutoff,
        )
        .order_by(
            CheckIn.created_at.desc(),
        )
    ).all()

    for existing in recent_check_ins:
        if check_ins_have_same_content(
            existing=existing,
            payload=payload,
        ):
            return existing

    return None


def reject_duplicate_check_in() -> None:
    """
    Reject an accidental duplicate without creating
    another CheckIn, navigation signal, attention
    snapshot, or audit submission event.
    """

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            "An identical check-in was already "
            "submitted recently. If the situation "
            "has changed, update the answers and "
            "submit again."
        ),
    )


def build_check_in_response(
    check_in: CheckIn,
) -> CheckInResponse:
    """
    Build the shared API response used by both
    patient and caregiver check-in endpoints.
    """

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


# =========================================================
# Patient self check-in
# =========================================================


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
                UserRole.PATIENT,
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

    # -----------------------------------------------------
    # Duplicate guard
    #
    # Only blocks:
    # same patient
    # + same submitting user
    # + identical answers
    # + within 5 minutes
    #
    # A changed answer is accepted immediately.
    # -----------------------------------------------------

    duplicate = (
        find_recent_duplicate_check_in(
            db,
            patient_id=patient.id,
            submitted_by_user_id=(
                current_user.id
            ),
            payload=payload,
        )
    )

    if duplicate is not None:
        reject_duplicate_check_in()

    # -----------------------------------------------------
    # Create patient check-in
    # -----------------------------------------------------

    check_in = CheckIn(
        patient_id=patient.id,
        submitted_by_user_id=(
            current_user.id
        ),
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
        requested_help=(
            payload.requested_help
        ),
        free_text=normalize_free_text(
            payload.free_text
        ),
    )

    db.add(check_in)
    db.flush()

    # -----------------------------------------------------
    # Convert the new check-in into navigation signals.
    # -----------------------------------------------------

    generate_signals_from_check_in(
        db,
        check_in=check_in,
    )

    # -----------------------------------------------------
    # Keep Navigation Needs and Attention Status
    # synchronized immediately after submission.
    # -----------------------------------------------------

    evaluate_and_snapshot_patient(
        db,
        patient_id=patient.id,
    )

    # -----------------------------------------------------
    # Audit
    # -----------------------------------------------------

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action=(
            "PATIENT_CHECK_IN_SUBMITTED"
        ),
        resource_type="check_in",
        resource_id=str(
            check_in.id
        ),
    )

    db.commit()
    db.refresh(check_in)

    return build_check_in_response(
        check_in
    )


# =========================================================
# Caregiver proxy check-in
# =========================================================


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
                UserRole.CAREGIVER,
            )
        ),
    ],
) -> CheckInResponse:
    # -----------------------------------------------------
    # Verify ACTIVE caregiver relationship.
    # -----------------------------------------------------

    access = db.scalar(
        select(
            CaregiverPatientAccess
        ).where(
            CaregiverPatientAccess
            .caregiver_user_id
            == current_user.id,
            CaregiverPatientAccess
            .patient_id
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

    # -----------------------------------------------------
    # Verify PROXY_CHECK_IN permission.
    # -----------------------------------------------------

    permission = db.scalar(
        select(
            CaregiverPermission
        ).where(
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

    # -----------------------------------------------------
    # Duplicate guard
    #
    # The submitting caregiver's user ID is part of
    # the lookup.
    #
    # Therefore:
    #
    # Patient submits X
    # Caregiver submits X
    #     -> ACCEPTED
    #
    # Caregiver Rachel submits X
    # Caregiver Rachel immediately submits X again
    #     -> REJECTED
    # -----------------------------------------------------

    duplicate = (
        find_recent_duplicate_check_in(
            db,
            patient_id=patient_id,
            submitted_by_user_id=(
                current_user.id
            ),
            payload=payload,
        )
    )

    if duplicate is not None:
        reject_duplicate_check_in()

    # -----------------------------------------------------
    # Create caregiver-sourced check-in.
    # -----------------------------------------------------

    check_in = CheckIn(
        patient_id=patient_id,
        submitted_by_user_id=(
            current_user.id
        ),
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
        requested_help=(
            payload.requested_help
        ),
        free_text=normalize_free_text(
            payload.free_text
        ),
        submitted_for_relationship=(
            access.relationship
        ),
    )

    db.add(check_in)
    db.flush()

    # -----------------------------------------------------
    # Generate navigation signals from caregiver-reported
    # data.
    # -----------------------------------------------------

    generate_signals_from_check_in(
        db,
        check_in=check_in,
    )

    # -----------------------------------------------------
    # Keep Navigation Needs and Attention Status
    # synchronized immediately after the caregiver
    # submission as well.
    # -----------------------------------------------------

    evaluate_and_snapshot_patient(
        db,
        patient_id=patient_id,
    )

    # -----------------------------------------------------
    # Audit
    # -----------------------------------------------------

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient_id,
        action=(
            "CAREGIVER_CHECK_IN_SUBMITTED"
        ),
        resource_type="check_in",
        resource_id=str(
            check_in.id
        ),
        metadata_json={
            "caregiver_access_id": str(
                access.id
            ),
        },
    )

    db.commit()
    db.refresh(check_in)

    return build_check_in_response(
        check_in
    )