from datetime import datetime, timedelta, timezone


from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.enums import (
    AttentionStatus,
    NavigationNeedStatus,
    NavigationSignalStatus,
)
from app.models.navigation_need import (
    NavigationNeed,
)
from app.models.navigation_need_signal import (
    NavigationNeedSignal,
)
from app.models.navigation_signal import (
    NavigationSignal,
)
from app.models.attention_snapshot import (
    AttentionSnapshot,
)

import uuid

def get_open_signals(
    db: Session,
    *,
    patient_id,
) -> list[NavigationSignal]:
    return list(
        db.scalars(
            select(NavigationSignal).where(
                NavigationSignal.patient_id
                == patient_id,
                NavigationSignal.status
                == NavigationSignalStatus.OPEN,
            )
        ).all()
    )


def find_signal(
    signals: list[NavigationSignal],
    signal_type: str,
) -> NavigationSignal | None:
    return next(
        (
            signal
            for signal in signals
            if signal.signal_type == signal_type
        ),
        None,
    )

def upsert_navigation_need(
    db: Session,
    *,
    patient_id,
    need_type: str,
    context_key: str,
    title: str,
    explanation: str,
    recommended_action: str | None,
    attention_status: AttentionStatus,
    due_at=None,
    signals: list[NavigationSignal],
) -> NavigationNeed:
    """
    Create or update a navigation need.

    Behavior:
    - Creates the need if it does not already exist.
    - Updates descriptive/context fields when it already exists.
    - Links supporting navigation signals without duplicates.
    - A resolved need stays resolved when the engine sees only
      the same historical evidence.
    - A resolved need reopens only when genuinely new supporting
      evidence is received.
    """

    need = db.scalar(
        select(NavigationNeed).where(
            NavigationNeed.patient_id == patient_id,
            NavigationNeed.need_type == need_type,
            NavigationNeed.context_key == context_key,
        )
    )

    if need is None:
        need = NavigationNeed(
            patient_id=patient_id,
            need_type=need_type,
            context_key=context_key,
            title=title,
            explanation=explanation,
            recommended_action=recommended_action,
            attention_status=attention_status,
            status=NavigationNeedStatus.OPEN,
            due_at=due_at,
        )

        db.add(need)
        db.flush()

    else:
        # Keep the descriptive/context information current.
        need.title = title
        need.explanation = explanation
        need.recommended_action = recommended_action
        need.attention_status = attention_status
        need.due_at = due_at

        # Find all signals that have already been associated
        # with this need.
        existing_signal_ids = set(
            db.scalars(
                select(
                    NavigationNeedSignal.navigation_signal_id
                ).where(
                    NavigationNeedSignal.navigation_need_id
                    == need.id
                )
            ).all()
        )

        # Signals currently supporting this evaluation.
        incoming_signal_ids = {
            signal.id
            for signal in signals
        }
        has_new_evidence = bool(
            incoming_signal_ids
            - existing_signal_ids
        )

        # A resolved need should NOT reopen merely because the
        # context engine evaluates the same historical signals.
        #
        # It reopens only when new evidence appears.
        if (
            need.status
            == NavigationNeedStatus.RESOLVED
            and has_new_evidence
        ):
            need.status = NavigationNeedStatus.OPEN
            need.resolved_at = None

    for signal in signals:
        existing_link = db.scalar(
            select(NavigationNeedSignal).where(
                NavigationNeedSignal.navigation_need_id
                == need.id,
                NavigationNeedSignal.navigation_signal_id
                == signal.id,
            )
        )

        if existing_link is None:
            link = NavigationNeedSignal(
                navigation_need_id=need.id,
                navigation_signal_id=signal.id,
            )

            db.add(link)

    db.flush()

    return need
def evaluate_transportation_need(
    db: Session,
    *,
    patient_id,
    signals: list[NavigationSignal],
) -> NavigationNeed | None:
    transportation_signal = find_signal(
        signals,
        "transportation_unconfirmed",
    )

    appointment_signal = find_signal(
        signals,
        "upcoming_appointment",
    )

    if (
        transportation_signal is None
        or appointment_signal is None
    ):
        return None

    appointment = db.get(
        Appointment,
        uuid.UUID(
        appointment_signal.source_reference
    ),
    )

    due_at = (
        appointment.scheduled_start
        if appointment
        else None
    )

    return upsert_navigation_need(
        db,
        patient_id=patient_id,
        need_type=(
            "transportation_before_appointment"
        ),
        context_key=(
            "transportation:"
            f"{appointment_signal.source_reference}"
        ),
        title=(
            "Resolve transportation before "
            "upcoming appointment"
        ),
        explanation=(
            "Transportation is not confirmed "
            "and an appointment is scheduled "
            "within the next 48 hours."
        ),
        recommended_action=(
            "Confirm transportation or arrange "
            "alternative travel support before "
            "the appointment."
        ),
        attention_status=(
            AttentionStatus.NEEDS_ATTENTION
        ),
        due_at=due_at,
        signals=[
            transportation_signal,
            appointment_signal,
        ],
    )

def evaluate_missed_appointment_need(
    db: Session,
    *,
    patient_id,
    signals: list[NavigationSignal],
) -> NavigationNeed | None:
    signal = find_signal(
        signals,
        "missed_appointment",
    )

    if signal is None:
        return None

    return upsert_navigation_need(
        db,
        patient_id=patient_id,
        need_type="missed_appointment_follow_up",
        context_key=(
            f"missed:{signal.source_reference}"
        ),
        title="Follow up after missed appointment",
        explanation=(
            "A scheduled appointment was marked "
            "as missed and may require outreach "
            "or rescheduling."
        ),
        recommended_action=(
            "Contact the patient to understand "
            "the barrier and determine whether "
            "the appointment should be rescheduled."
        ),
        attention_status=(
            AttentionStatus.NEEDS_ATTENTION
        ),
        signals=[signal],
    )

def evaluate_help_request_need(
    db: Session,
    *,
    patient_id,
    signals: list[NavigationSignal],
) -> NavigationNeed | None:
    signal = find_signal(
        signals,
        "patient_requested_help",
    )

    if signal is None:
        return None

    return upsert_navigation_need(
        db,
        patient_id=patient_id,
        need_type="patient_help_request",
        context_key=(
            f"help:{signal.source_reference}"
        ),
        title="Patient requested navigator help",
        explanation=(
            "The patient explicitly requested "
            "assistance during a recent check-in."
        ),
        recommended_action=(
            "Review the check-in and contact "
            "the patient to identify the needed "
            "support."
        ),
        attention_status=(
            AttentionStatus.NEEDS_ATTENTION
        ),
        signals=[signal],
    )

CALLBACK_RULES = {
    # signal type: (hours until due, attention status)
    "callback_urgent": (2, AttentionStatus.NEEDS_ATTENTION),
    "callback_today": (8, AttentionStatus.NEEDS_ATTENTION),
    "callback_routine": (24, AttentionStatus.FOLLOW_UP),
}

CALLBACK_ACTIONS = {
    "symptoms": "Clinical navigator or nurse: call the patient back about how they are feeling.",
    "medicines": "Call the patient back and help with getting their medicines.",
    "a ride": "Call the patient back and arrange transportation before the appointment.",
    "cost or insurance": "Coverage / financial navigator: call the patient back about cost or insurance.",
    "the appointment": "Call the patient back about attending or rescheduling the appointment.",
}


def evaluate_callback_need(
    db: Session,
    *,
    patient_id,
    signals: list[NavigationSignal],
) -> NavigationNeed | None:
    """
    A caller asked a reminder call for a person. Each request
    becomes its own need, due sooner when it is more urgent.
    Returns the most recent one (the others are still saved).
    """

    latest = None
    for signal in signals:
        rule = CALLBACK_RULES.get(signal.signal_type)
        if rule is None:
            continue

        hours, attention = rule
        topic = signal.title.removeprefix("Call back requested about ").strip()
        observed = signal.observed_at or datetime.now(timezone.utc)

        latest = upsert_navigation_need(
            db,
            patient_id=patient_id,
            need_type="callback_request",
            context_key=f"callback:{signal.source_reference}",
            title=signal.title,
            explanation=(
                signal.description
                or "The patient asked to speak with a person during a reminder call."
            ),
            recommended_action=CALLBACK_ACTIONS.get(
                topic, "Call the patient back to find out what help they need."
            ),
            attention_status=attention,
            due_at=observed + timedelta(hours=hours),
            signals=[signal],
        )

    return latest


def evaluate_symptom_need(
    db: Session,
    *,
    patient_id,
    signals: list[NavigationSignal],
) -> NavigationNeed | None:
    signal = find_signal(
        signals,
        "high_symptom_severity",
    )

    if signal is None:
        return None

    return upsert_navigation_need(
        db,
        patient_id=patient_id,
        need_type="reported_symptom_follow_up",
        context_key=(
            f"symptom:{signal.source_reference}"
        ),
        title="Review high symptom report",
        explanation=(
            "A recent check-in contains a high "
            "patient-reported symptom severity."
        ),
        recommended_action=(
            "Review the patient's report and "
            "follow the organization's clinical "
            "escalation workflow when appropriate."
        ),
        attention_status=(
            AttentionStatus.NEEDS_ATTENTION
        ),
        signals=[signal],
    )

def evaluate_medication_access_need(
    db: Session,
    *,
    patient_id,
    signals: list[NavigationSignal],
) -> NavigationNeed | None:
    signal = find_signal(
        signals,
        "medication_access_issue",
    )

    if signal is None:
        return None

    return upsert_navigation_need(
        db,
        patient_id=patient_id,
        need_type="medication_access",
        context_key=(
            f"medication:{signal.source_reference}"
        ),
        title="Medication access needs follow-up",
        explanation=(
            "The patient reported difficulty "
            "accessing medication."
        ),
        recommended_action=(
            "Clarify the access barrier and "
            "coordinate with the appropriate "
            "pharmacy, financial, or care-team "
            "resource."
        ),
        attention_status=(
            AttentionStatus.FOLLOW_UP
        ),
        signals=[signal],
    )

def evaluate_financial_need(
    db: Session,
    *,
    patient_id,
    signals: list[NavigationSignal],
) -> NavigationNeed | None:
    signal = find_signal(
        signals,
        "financial_concern",
    )

    if signal is None:
        return None

    return upsert_navigation_need(
        db,
        patient_id=patient_id,
        need_type="financial_support",
        context_key=(
            f"financial:{signal.source_reference}"
        ),
        title="Financial concern needs follow-up",
        explanation=(
            "A recent check-in reported a "
            "financial concern that may affect "
            "the patient's care journey."
        ),
        recommended_action=(
            "Review the reported concern and "
            "connect the patient with appropriate "
            "financial or social support resources."
        ),
        attention_status=(
            AttentionStatus.FOLLOW_UP
        ),
        signals=[signal],
    )

def evaluate_patient_context(
    db: Session,
    *,
    patient_id,
) -> list[NavigationNeed]:
    signals = get_open_signals(
        db,
        patient_id=patient_id,
    )

    evaluators = [
        evaluate_transportation_need,
        evaluate_missed_appointment_need,
        evaluate_help_request_need,
        evaluate_callback_need,
        evaluate_symptom_need,
        evaluate_medication_access_need,
        evaluate_financial_need,
    ]

    needs: list[NavigationNeed] = []

    for evaluator in evaluators:
        need = evaluator(
            db,
            patient_id=patient_id,
            signals=signals,
        )

        if need is not None:
            needs.append(need)

    return needs

def determine_attention_status(
    needs: list[NavigationNeed],
) -> AttentionStatus:
    open_needs = [
        need
        for need in needs
        if need.status
        == NavigationNeedStatus.OPEN
    ]

    if any(
        need.attention_status
        == AttentionStatus.NEEDS_ATTENTION
        for need in open_needs
    ):
        return AttentionStatus.NEEDS_ATTENTION

    if any(
        need.attention_status
        == AttentionStatus.FOLLOW_UP
        for need in open_needs
    ):
        return AttentionStatus.FOLLOW_UP

    return AttentionStatus.ON_TRACK

def build_attention_explanation(
    status: AttentionStatus,
    needs: list[NavigationNeed],
) -> str:
    open_needs = [
        need
        for need in needs
        if need.status
        == NavigationNeedStatus.OPEN
    ]

    if status == AttentionStatus.ON_TRACK:
        return (
            "No currently identified unresolved "
            "navigation needs require follow-up."
        )

    relevant = [
        need.title
        for need in open_needs
        if need.attention_status == status
    ]

    if not relevant:
        return (
            "Open navigation work requires "
            "navigator review."
        )

    return "; ".join(relevant)

def evaluate_and_snapshot_patient(
    db: Session,
    *,
    patient_id,
):
    evaluate_patient_context(
        db,
        patient_id=patient_id,
    )

    needs = list(
        db.scalars(
            select(NavigationNeed).where(
                NavigationNeed.patient_id
                == patient_id,
                NavigationNeed.status
                == NavigationNeedStatus.OPEN,
            )
        ).all()
    )

    attention_status = (
        determine_attention_status(needs)
    )

    explanation = (
        build_attention_explanation(
            attention_status,
            needs,
        )
    )

    latest_snapshot = db.scalar(
        select(AttentionSnapshot)
        .where(
            AttentionSnapshot.patient_id
            == patient_id
        )
        .order_by(
            AttentionSnapshot.created_at.desc()
        )
        .limit(1)
    )

    snapshot_changed = (
        latest_snapshot is None
        or latest_snapshot.status
        != attention_status
        or latest_snapshot.open_need_count
        != len(needs)
        or latest_snapshot.explanation
        != explanation
    )

    if snapshot_changed:
        snapshot = AttentionSnapshot(
            patient_id=patient_id,
            status=attention_status,
            open_need_count=len(needs),
            explanation=explanation,
        )

        db.add(snapshot)
        db.flush()

    return (
        attention_status,
        explanation,
        needs,
    )