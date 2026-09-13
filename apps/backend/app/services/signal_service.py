from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.check_in import CheckIn
from app.models.enums import (
    NavigationSignalCategory,
    NavigationSignalSourceType,
    NavigationSignalStatus,
)
from app.models.navigation_signal import (
    NavigationSignal,
)
from datetime import timedelta

from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus

def create_signal_if_missing(
    db: Session,
    *,
    patient_id,
    category: NavigationSignalCategory,
    signal_type: str,
    title: str,
    description: str | None,
    source_type: NavigationSignalSourceType,
    source_reference: str,
    observed_at: datetime,
) -> NavigationSignal:
    existing = db.scalar(
        select(NavigationSignal).where(
            NavigationSignal.source_type
            == source_type,
            NavigationSignal.source_reference
            == source_reference,
            NavigationSignal.signal_type
            == signal_type,
        )
    )

    if existing is not None:
        return existing

    signal = NavigationSignal(
        patient_id=patient_id,
        category=category,
        signal_type=signal_type,
        status=NavigationSignalStatus.OPEN,
        title=title,
        description=description,
        source_type=source_type,
        source_reference=source_reference,
        observed_at=observed_at,
    )

    db.add(signal)
    db.flush()

    return signal


def generate_signals_from_check_in(
    db: Session,
    *,
    check_in: CheckIn,
) -> list[NavigationSignal]:
    signals: list[NavigationSignal] = []

    observed_at = (
        check_in.created_at
        or datetime.now(timezone.utc)
    )

    source_reference = str(check_in.id)

    if (
        check_in.transportation_confirmed
        is False
    ):
        signals.append(
            create_signal_if_missing(
                db,
                patient_id=check_in.patient_id,
                category=(
                    NavigationSignalCategory.ACCESS
                ),
                signal_type=(
                    "transportation_unconfirmed"
                ),
                title=(
                    "Transportation not confirmed"
                ),
                description=(
                    "Patient reported that "
                    "transportation is not confirmed."
                ),
                source_type=(
                    NavigationSignalSourceType
                    .CHECK_IN
                ),
                source_reference=source_reference,
                observed_at=observed_at,
            )
        )

    if check_in.medication_access_issue:
        signals.append(
            create_signal_if_missing(
                db,
                patient_id=check_in.patient_id,
                category=(
                    NavigationSignalCategory.ACCESS
                ),
                signal_type=(
                    "medication_access_issue"
                ),
                title=(
                    "Medication access concern"
                ),
                description=(
                    "Patient reported difficulty "
                    "accessing medication."
                ),
                source_type=(
                    NavigationSignalSourceType
                    .CHECK_IN
                ),
                source_reference=source_reference,
                observed_at=observed_at,
            )
        )

    if check_in.financial_concern:
        signals.append(
            create_signal_if_missing(
                db,
                patient_id=check_in.patient_id,
                category=(
                    NavigationSignalCategory
                    .FINANCIAL
                ),
                signal_type="financial_concern",
                title="Financial concern reported",
                description=(
                    "Patient reported a financial "
                    "barrier or concern."
                ),
                source_type=(
                    NavigationSignalSourceType
                    .CHECK_IN
                ),
                source_reference=source_reference,
                observed_at=observed_at,
            )
        )

    if check_in.requested_help:
        signals.append(
            create_signal_if_missing(
                db,
                patient_id=check_in.patient_id,
                category=(
                    NavigationSignalCategory
                    .PATIENT_REPORTED
                ),
                signal_type=(
                    "patient_requested_help"
                ),
                title="Patient requested help",
                description=(
                    "Patient explicitly requested "
                    "navigator assistance."
                ),
                source_type=(
                    NavigationSignalSourceType
                    .CHECK_IN
                ),
                source_reference=source_reference,
                observed_at=observed_at,
            )
        )

    if (
        check_in.symptom_severity is not None
        and check_in.symptom_severity >= 7
    ):
        signals.append(
            create_signal_if_missing(
                db,
                patient_id=check_in.patient_id,
                category=(
                    NavigationSignalCategory
                    .PATIENT_REPORTED
                ),
                signal_type=(
                    "high_symptom_severity"
                ),
                title=(
                    "High symptom severity reported"
                ),
                description=(
                    f"Patient reported symptom "
                    f"severity "
                    f"{check_in.symptom_severity}/10."
                ),
                source_type=(
                    NavigationSignalSourceType
                    .CHECK_IN
                ),
                source_reference=source_reference,
                observed_at=observed_at,
            )
        )

    return signals

def generate_signals_from_appointments(
    db: Session,
    *,
    patient_id,
) -> list[NavigationSignal]:
    now = datetime.now(timezone.utc)

    next_48_hours = now + timedelta(
        hours=48
    )

    appointments = db.scalars(
        select(Appointment).where(
            Appointment.patient_id
            == patient_id,
        )
    ).all()

    signals: list[NavigationSignal] = []

    for appointment in appointments:
        source_reference = str(
            appointment.id
        )

        if (
            appointment.status
            == AppointmentStatus.SCHEDULED
            and now
            <= appointment.scheduled_start
            <= next_48_hours
        ):
            signals.append(
                create_signal_if_missing(
                    db,
                    patient_id=patient_id,
                    category=(
                        NavigationSignalCategory
                        .CARE_COORDINATION
                    ),
                    signal_type=(
                        "upcoming_appointment"
                    ),
                    title=(
                        "Appointment within 48 hours"
                    ),
                    description=(
                        "A scheduled appointment "
                        "is approaching."
                    ),
                    source_type=(
                        NavigationSignalSourceType
                        .APPOINTMENT
                    ),
                    source_reference=source_reference,
                    observed_at=now,
                )
            )

        if (
            appointment.status
            == AppointmentStatus.MISSED
        ):
            signals.append(
                create_signal_if_missing(
                    db,
                    patient_id=patient_id,
                    category=(
                        NavigationSignalCategory
                        .ENGAGEMENT
                    ),
                    signal_type=(
                        "missed_appointment"
                    ),
                    title="Missed appointment",
                    description=(
                        "A scheduled appointment "
                        "was marked as missed."
                    ),
                    source_type=(
                        NavigationSignalSourceType
                        .APPOINTMENT
                    ),
                    source_reference=source_reference,
                    observed_at=now,
                )
            )

    return signals