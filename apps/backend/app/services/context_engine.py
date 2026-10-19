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
    """The most recent open signal of this type.

    Using the latest one matters: a new report of a problem
    that was already resolved must be seen as new evidence.
    """
    matches = [
        signal
        for signal in signals
        if signal.signal_type == signal_type
    ]
    if not matches:
        return None
    return max(
        matches,
        key=lambda signal: (
            signal.observed_at
            or datetime.min.replace(tzinfo=timezone.utc)
        ),
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
        # A newer report of a problem that is still open adds
        # evidence to that need rather than opening a second one.
        need = db.scalar(
            select(NavigationNeed)
            .where(
                NavigationNeed.patient_id == patient_id,
                NavigationNeed.need_type == need_type,
                NavigationNeed.status == NavigationNeedStatus.OPEN,
            )
            .order_by(NavigationNeed.created_at.desc())
            .limit(1)
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


# A call back about one of these topics belongs to the need
# that already describes that problem, not to a need of its own.
CALLBACK_TOPIC_NEED = {
    "symptoms": "reported_symptom_follow_up",
    "medicines": "medication_access",
    "a ride": "transportation_before_appointment",
    "cost or insurance": "financial_support",
    "the appointment": "attendance_uncertain",
}

URGENCY_WORDS = {
    "callback_urgent": "urgently",
    "callback_today": "today",
    "callback_routine": "when convenient",
}


# Signals that describe the situation (an appointment is coming)
# rather than a problem. They stay open when a need is resolved,
# because other needs still depend on them.
CONTEXT_SIGNAL_TYPES = {"upcoming_appointment"}


def _signals_of_need(db: Session, need: NavigationNeed) -> list[NavigationSignal]:
    return list(
        db.scalars(
            select(NavigationSignal)
            .join(
                NavigationNeedSignal,
                NavigationNeedSignal.navigation_signal_id == NavigationSignal.id,
            )
            .where(NavigationNeedSignal.navigation_need_id == need.id)
        ).all()
    )


def resolve_need(db: Session, need: NavigationNeed, *, at: datetime | None = None) -> None:
    """
    Resolve a need and close the reports behind it, so an old
    report ("no ride" last week) does not raise the same need
    again. A new report of the problem opens it afresh.
    """

    at = at or datetime.now(timezone.utc)
    need.status = NavigationNeedStatus.RESOLVED
    need.resolved_at = at

    for signal in _signals_of_need(db, need):
        if signal.signal_type in CONTEXT_SIGNAL_TYPES:
            continue
        still_needed = db.scalar(
            select(NavigationNeed.id)
            .join(
                NavigationNeedSignal,
                NavigationNeedSignal.navigation_need_id == NavigationNeed.id,
            )
            .where(
                NavigationNeedSignal.navigation_signal_id == signal.id,
                NavigationNeed.id != need.id,
                NavigationNeed.status == NavigationNeedStatus.OPEN,
            )
            .limit(1)
        )
        if still_needed is None and signal.status == NavigationSignalStatus.OPEN:
            signal.status = NavigationSignalStatus.RESOLVED
            signal.resolved_at = at
    db.flush()


def reopen_need(db: Session, need: NavigationNeed) -> None:
    """Undo resolve_need (a checklist item was unticked)."""

    need.status = NavigationNeedStatus.OPEN
    need.resolved_at = None
    for signal in _signals_of_need(db, need):
        if signal.status == NavigationSignalStatus.RESOLVED:
            signal.status = NavigationSignalStatus.OPEN
            signal.resolved_at = None
    db.flush()


def link_signal(
    db: Session,
    *,
    need: NavigationNeed,
    signal: NavigationSignal,
) -> bool:
    """Attach a signal to a need. True when it was not attached before."""

    existing = db.scalar(
        select(NavigationNeedSignal).where(
            NavigationNeedSignal.navigation_need_id == need.id,
            NavigationNeedSignal.navigation_signal_id == signal.id,
        )
    )
    if existing is not None:
        return False

    db.add(
        NavigationNeedSignal(
            navigation_need_id=need.id,
            navigation_signal_id=signal.id,
        )
    )
    db.flush()
    return True


def _more_urgent(a: AttentionStatus, b: AttentionStatus) -> AttentionStatus:
    order = [
        AttentionStatus.NEEDS_ATTENTION,
        AttentionStatus.FOLLOW_UP,
        AttentionStatus.ON_TRACK,
    ]
    return a if order.index(a) <= order.index(b) else b


def _retire_standalone_callback(db: Session, *, patient_id, signal: NavigationSignal) -> None:
    """
    Calls recorded before callbacks were merged created a separate
    "Call back requested" need. Close it once the request has been
    folded into the matching need, so it is not counted twice.
    """

    old = db.scalar(
        select(NavigationNeed).where(
            NavigationNeed.patient_id == patient_id,
            NavigationNeed.need_type == "callback_request",
            NavigationNeed.context_key == f"callback:{signal.source_reference}",
            NavigationNeed.status == NavigationNeedStatus.OPEN,
        )
    )
    if old is not None:
        old.status = NavigationNeedStatus.RESOLVED
        old.resolved_at = datetime.now(timezone.utc)


def evaluate_callback_need(
    db: Session,
    *,
    patient_id,
    signals: list[NavigationSignal],
    related: dict[str, NavigationNeed] | None = None,
) -> NavigationNeed | None:
    """
    A caller asked a reminder call for a person.

    When the request is about a problem that already has a need
    (symptoms, medicines, a ride, cost, attending), that need is
    made more urgent and due sooner instead of adding a second
    item. Otherwise the request becomes its own need.

    Returns the most recent standalone callback need, if any.
    """

    related = related or {}
    latest = None
    for signal in signals:
        rule = CALLBACK_RULES.get(signal.signal_type)
        if rule is None:
            continue

        hours, attention = rule
        topic = signal.title.removeprefix("Call back requested about ").strip()
        observed = signal.observed_at or datetime.now(timezone.utc)
        due = observed + timedelta(hours=hours)

        target = related.get(CALLBACK_TOPIC_NEED.get(topic, ""))
        if target is not None:
            new_evidence = link_signal(db, need=target, signal=signal)
            if target.status == NavigationNeedStatus.RESOLVED and new_evidence:
                target.status = NavigationNeedStatus.OPEN
                target.resolved_at = None

            if target.status == NavigationNeedStatus.OPEN:
                target.attention_status = _more_urgent(target.attention_status, attention)
                target.due_at = min(target.due_at, due) if target.due_at else due
                target.explanation = (
                    f"{target.explanation} The caller asked for a call back "
                    f"{URGENCY_WORDS[signal.signal_type]}."
                )
                target.recommended_action = CALLBACK_ACTIONS.get(topic, target.recommended_action)

            _retire_standalone_callback(db, patient_id=patient_id, signal=signal)
            continue

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
            due_at=due,
            signals=[signal],
        )

    return latest


def evaluate_attendance_need(
    db: Session,
    *,
    patient_id,
    signals: list[NavigationSignal],
) -> NavigationNeed | None:
    """The patient (or caregiver) was not sure they can attend."""

    signal = find_signal(signals, "attendance_uncertain")
    if signal is None:
        return None

    appointment_signal = find_signal(signals, "upcoming_appointment")
    appointment = (
        db.get(Appointment, uuid.UUID(appointment_signal.source_reference))
        if appointment_signal
        else None
    )

    return upsert_navigation_need(
        db,
        patient_id=patient_id,
        need_type="attendance_uncertain",
        context_key=f"attendance:{signal.source_reference}",
        title="Confirm the patient can attend",
        explanation=(
            signal.description
            or "The patient may not be able to attend the upcoming appointment."
        ),
        recommended_action=(
            "Find out what is in the way and help, or reschedule "
            "the appointment with the clinic."
        ),
        attention_status=AttentionStatus.NEEDS_ATTENTION,
        due_at=appointment.scheduled_start if appointment else None,
        signals=[signal, appointment_signal] if appointment_signal else [signal],
    )


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
        evaluate_attendance_need,
        evaluate_help_request_need,
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

    # Call-back requests run last, so they can be folded into
    # the need for the same topic found above.
    callback_need = evaluate_callback_need(
        db,
        patient_id=patient_id,
        signals=signals,
        related={need.need_type: need for need in needs},
    )
    if callback_need is not None:
        needs.append(callback_need)

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

    # Keep one follow-up task covering every open need.
    from app.services.follow_up_service import sync_follow_up_task

    sync_follow_up_task(db, patient_id=patient_id)

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