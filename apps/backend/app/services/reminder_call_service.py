"""
Reminder calls: database side.

call_script.py holds the conversation. This module loads
and saves call state, writes the transcript, and when the
call ends turns the answers into a regular Compass
check-in so the existing signal and attention rules pick
them up. Navigation priority is still decided only by the
rules engine.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.appointment import Appointment
from app.models.check_in import CheckIn
from app.models.enums import (
    AppointmentStatus,
    CheckInSource,
    ReminderCallAnsweredBy,
    ReminderCallChannel,
    ReminderCallStatus,
)
from app.models.journey import CareJourneyItem
from app.models.organization import Organization
from app.models.patient import NavigatorPatientAssignment, PatientProfile
from app.models.reminder_call import ReminderCall
from app.models.user import User
from app.services import call_script
from app.services.audit_service import write_audit_log
from app.services.call_interpreter import get_interpreter
from app.services.context_engine import evaluate_and_snapshot_patient
from app.services.signal_service import generate_signals_from_check_in

ACTIVE_STATUSES = (
    ReminderCallStatus.QUEUED,
    ReminderCallStatus.RINGING,
    ReminderCallStatus.IN_PROGRESS,
)

FINISHED_STATUSES = (
    ReminderCallStatus.COMPLETED,
    ReminderCallStatus.ENDED_EARLY,
)

# A call stuck "active" for longer than this is treated as
# dead (for example the browser tab was closed).
STALE_ACTIVE_MINUTES = 20


class ReminderCallError(Exception):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------
# Building what the agent says
# ---------------------------------------------------------


def describe_when(start: datetime, now: datetime | None = None) -> str:
    tz = ZoneInfo(settings.clinic_timezone)
    local = start.astimezone(tz)
    today = (now or _now()).astimezone(tz).date()

    hour = local.strftime("%I").lstrip("0")
    minutes = local.strftime("%M")
    time_text = f"{hour}:{minutes} {local.strftime('%p')}" if minutes != "00" else f"{hour} {local.strftime('%p')}"
    day_text = f"{local.strftime('%A, %B')} {local.day}"

    if local.date() == today:
        day_text = f"today, {day_text},"
    elif local.date() == today + timedelta(days=1):
        day_text = f"tomorrow, {day_text},"
    else:
        day_text = f"on {day_text}"

    return f"{day_text} at {time_text}"


def describe_kind(appointment: Appointment, journey_item: CareJourneyItem | None) -> str:
    label = appointment.appointment_type or (journey_item.title if journey_item else None)
    if not label:
        return "an appointment"
    label = label.strip().rstrip(".")
    if "appointment" in label.lower():
        article = "an" if label[0].lower() in "aeiou" else "a"
        return f"{article} {label.lower()}"
    return f"an appointment for {label.lower()}"


def build_context(db: Session, call: ReminderCall) -> call_script.CallContext:
    patient = db.get(PatientProfile, call.patient_id)
    appointment = db.get(Appointment, call.appointment_id)
    organization = db.get(Organization, call.organization_id)
    journey_item = db.get(CareJourneyItem, appointment.journey_item_id) if appointment else None

    if patient is None or appointment is None:
        raise ReminderCallError("Appointment or patient no longer exists.")

    return call_script.CallContext(
        patient_first_name=patient.first_name,
        organization_name=organization.name if organization else "your care team",
        appointment_kind=describe_kind(appointment, journey_item),
        appointment_when=describe_when(appointment.scheduled_start),
        appointment_place=appointment.location_name or appointment.address_text,
        provider_name=appointment.provider_name,
    )


def _state_from_call(call: ReminderCall) -> call_script.CallState:
    answers = dict(call.answers or {})
    meta = answers.pop("_meta", {})
    return call_script.CallState(
        step=call.current_step,
        reprompts=call.reprompt_count,
        answered_by=call.answered_by.value if call.answered_by else meta.get("answered_by"),
        answers=answers,
        safety_flag=call.safety_flag,
        ended_early=meta.get("ended_early", False),
    )


def _save_state(call: ReminderCall, state: call_script.CallState) -> None:
    call.current_step = state.step
    call.reprompt_count = state.reprompts
    call.safety_flag = state.safety_flag
    if state.answered_by:
        call.answered_by = ReminderCallAnsweredBy(state.answered_by)
    call.answers = {**state.answers, "_meta": {"ended_early": state.ended_early}}


def _append(call: ReminderCall, speaker: str, text: str, step: str) -> None:
    # Reassign so SQLAlchemy notices the JSONB change.
    call.transcript = [
        *(call.transcript or []),
        {"speaker": speaker, "text": text, "step": step, "at": _now().isoformat()},
    ]


def _last_agent_line(call: ReminderCall) -> str:
    for entry in reversed(call.transcript or []):
        if entry.get("speaker") == "agent":
            return entry.get("text", "")
    return ""


# ---------------------------------------------------------
# Call lifecycle
# ---------------------------------------------------------


def create_call(
    db: Session,
    *,
    appointment: Appointment,
    channel: ReminderCallChannel,
    initiated_by: User | None,
) -> ReminderCall:
    patient = db.get(PatientProfile, appointment.patient_id)
    patient_user = db.get(User, patient.user_id)

    if appointment.status != AppointmentStatus.SCHEDULED:
        raise ReminderCallError("Only scheduled appointments can get a reminder call.")

    if channel == ReminderCallChannel.PHONE and not patient.phone:
        raise ReminderCallError("This patient has no phone number on file.")

    expire_stale_calls(db, appointment_id=appointment.id)

    active = db.scalar(
        select(ReminderCall).where(
            ReminderCall.appointment_id == appointment.id,
            ReminderCall.status.in_(ACTIVE_STATUSES),
        )
    )
    if active is not None:
        raise ReminderCallError("A reminder call for this appointment is already in progress.")

    attempts = db.scalar(
        select(func.count(ReminderCall.id)).where(
            ReminderCall.appointment_id == appointment.id,
            ReminderCall.channel == channel,
        )
    ) or 0

    call = ReminderCall(
        organization_id=patient_user.organization_id,
        patient_id=patient.id,
        appointment_id=appointment.id,
        initiated_by_user_id=initiated_by.id if initiated_by else None,
        channel=channel,
        status=ReminderCallStatus.QUEUED,
        attempt_number=attempts + 1,
        phone_number=patient.phone if channel == ReminderCallChannel.PHONE else None,
        current_step=call_script.IDENTITY,
        reprompt_count=0,
        transcript=[],
        answers={},
        needs_follow_up=False,
        safety_flag=False,
    )
    db.add(call)
    db.flush()

    write_audit_log(
        db,
        organization_id=call.organization_id,
        actor_user_id=initiated_by.id if initiated_by else None,
        patient_id=patient.id,
        action="REMINDER_CALL_CREATED",
        resource_type="reminder_call",
        resource_id=str(call.id),
        metadata_json={"channel": channel.value, "attempt": call.attempt_number},
    )
    return call


def begin(db: Session, call: ReminderCall) -> call_script.Turn:
    """The person picked up. Say the greeting."""

    if call.status in FINISHED_STATUSES:
        raise ReminderCallError("This call has already ended.")

    ctx = build_context(db, call)
    turn = call_script.opening(ctx)

    call.status = ReminderCallStatus.IN_PROGRESS
    call.started_at = call.started_at or _now()
    call.current_step = turn.step
    call.reprompt_count = 0
    _append(call, "agent", turn.say, turn.step)
    return turn


def reply(
    db: Session,
    call: ReminderCall,
    *,
    text: str,
    digits: str | None = None,
) -> call_script.Turn:
    """The caller answered. Work out what to say next."""

    if call.status != ReminderCallStatus.IN_PROGRESS:
        raise ReminderCallError("This call is not in progress.")

    ctx = build_context(db, call)
    state = _state_from_call(call)

    heard = (text or "").strip()
    if heard or digits:
        _append(call, "caller", heard or f"(pressed {digits})", state.step)
    else:
        _append(call, "caller", "(no answer)", state.step)

    turn = call_script.advance(
        state,
        ctx,
        heard,
        digits=digits,
        last_question=_last_agent_line(call),
        interpreter=get_interpreter(),
    )

    _save_state(call, state)
    if turn.say:
        _append(call, "agent", turn.say, turn.step)

    if turn.done:
        finish(
            db,
            call,
            status=ReminderCallStatus.ENDED_EARLY if state.ended_early else ReminderCallStatus.COMPLETED,
        )

    return turn


def hang_up_early(db: Session, call: ReminderCall) -> None:
    """Caller hung up, or the navigator stopped the call."""

    if call.status in FINISHED_STATUSES:
        return

    if call.status == ReminderCallStatus.IN_PROGRESS:
        state = _state_from_call(call)
        state.ended_early = True
        _save_state(call, state)
        finish(db, call, status=ReminderCallStatus.ENDED_EARLY)
    else:
        mark_unreached(db, call, status=ReminderCallStatus.NO_ANSWER)


def finish(db: Session, call: ReminderCall, *, status: ReminderCallStatus) -> None:
    ctx = build_context(db, call)
    state = _state_from_call(call)

    call.status = status
    call.ended_at = _now()
    call.summary = call_script.build_summary(state, ctx)
    call.needs_follow_up = call_script.needs_follow_up(state)

    if state.answered_by != "wrong_person":
        check_in = _record_check_in(db, call, state)
        if check_in is not None:
            call.check_in_id = check_in.id

    write_audit_log(
        db,
        organization_id=call.organization_id,
        actor_user_id=call.initiated_by_user_id,
        patient_id=call.patient_id,
        action="REMINDER_CALL_COMPLETED",
        resource_type="reminder_call",
        resource_id=str(call.id),
        metadata_json={
            "status": status.value,
            "answered_by": state.answered_by,
            "needs_follow_up": call.needs_follow_up,
            "safety_flag": call.safety_flag,
        },
    )


def mark_unreached(
    db: Session,
    call: ReminderCall,
    *,
    status: ReminderCallStatus,
    error: str | None = None,
) -> None:
    call.status = status
    call.ended_at = _now()
    call.error_message = error[:500] if error else None
    call.summary = {
        ReminderCallStatus.NO_ANSWER: "No one answered the reminder call.",
        ReminderCallStatus.FAILED: "The reminder call could not be placed.",
    }.get(status, call.summary)

    write_audit_log(
        db,
        organization_id=call.organization_id,
        actor_user_id=call.initiated_by_user_id,
        patient_id=call.patient_id,
        action="REMINDER_CALL_NOT_REACHED",
        resource_type="reminder_call",
        resource_id=str(call.id),
        metadata_json={"status": status.value},
    )


def expire_stale_calls(db: Session, *, appointment_id: uuid.UUID | None = None) -> None:
    cutoff = _now() - timedelta(minutes=STALE_ACTIVE_MINUTES)
    query = select(ReminderCall).where(
        ReminderCall.status.in_(ACTIVE_STATUSES),
        ReminderCall.updated_at < cutoff,
    )
    if appointment_id is not None:
        query = query.where(ReminderCall.appointment_id == appointment_id)

    for call in db.scalars(query).all():
        hang_up_early(db, call)


def _record_check_in(
    db: Session,
    call: ReminderCall,
    state: call_script.CallState,
) -> CheckIn | None:
    a = state.answers
    answered_anything = any(
        a.get(key) is not None
        for key in ("attendance", "transportation", "medication",
                    "symptom_severity", "cost", "callback", "notes")
    )
    if not answered_anything and not state.safety_flag:
        return None

    patient = db.get(PatientProfile, call.patient_id)

    transportation = a.get("transportation")
    severity = a.get("symptom_severity")

    check_in = CheckIn(
        patient_id=call.patient_id,
        # The patient's own account; source=VOICE_CALL tells
        # everyone it came from the phone, not the app.
        submitted_by_user_id=patient.user_id,
        source=CheckInSource.VOICE_CALL,
        symptom_severity=severity if isinstance(severity, int) else None,
        transportation_confirmed=(
            True if transportation == "yes"
            else False if transportation in ("no", "unsure")
            else None
        ),
        medication_access_issue=a.get("medication") == "yes",
        financial_concern=a.get("cost") == "yes",
        requested_help=bool(
            state.safety_flag
            or a.get("callback") == "yes"
            or a.get("attendance") in ("no", "unsure")
        ),
        free_text=f"Reminder call: {call.summary}"[:3000],
        submitted_for_relationship=(
            "caregiver (by phone)" if state.answered_by == "caregiver" else None
        ),
    )
    db.add(check_in)
    db.flush()

    generate_signals_from_check_in(db, check_in=check_in)
    evaluate_and_snapshot_patient(db, patient_id=call.patient_id)
    return check_in


# ---------------------------------------------------------
# Who needs a call
# ---------------------------------------------------------


@dataclass
class UpcomingAppointment:
    appointment: Appointment
    patient: PatientProfile
    journey_item: CareJourneyItem | None
    latest_call: ReminderCall | None
    attempts: int

    @property
    def reached(self) -> bool:
        call = self.latest_call
        return (
            call is not None
            and call.status in FINISHED_STATUSES
            and call.answered_by is not None
            and call.answered_by != ReminderCallAnsweredBy.UNKNOWN
        )


def upcoming_appointments(
    db: Session,
    *,
    navigator: User | None = None,
    organization_id: uuid.UUID | None = None,
) -> list[UpcomingAppointment]:
    now = _now()
    window_end = now + timedelta(hours=settings.reminder_call_window_hours)

    query = (
        select(Appointment, PatientProfile)
        .join(PatientProfile, PatientProfile.id == Appointment.patient_id)
        .where(
            Appointment.status == AppointmentStatus.SCHEDULED,
            Appointment.scheduled_start >= now,
            Appointment.scheduled_start <= window_end,
        )
        .order_by(Appointment.scheduled_start)
    )

    if navigator is not None:
        query = query.join(
            NavigatorPatientAssignment,
            NavigatorPatientAssignment.patient_id == PatientProfile.id,
        ).where(NavigatorPatientAssignment.navigator_user_id == navigator.id)

    if organization_id is not None:
        query = query.join(User, User.id == PatientProfile.user_id).where(
            User.organization_id == organization_id
        )

    rows = db.execute(query).all()
    results: list[UpcomingAppointment] = []

    for appointment, patient in rows:
        calls = db.scalars(
            select(ReminderCall)
            .where(ReminderCall.appointment_id == appointment.id)
            .order_by(ReminderCall.created_at.desc())
        ).all()

        finished = [c for c in calls if c.status in FINISHED_STATUSES]

        results.append(
            UpcomingAppointment(
                appointment=appointment,
                patient=patient,
                journey_item=db.get(CareJourneyItem, appointment.journey_item_id),
                latest_call=finished[0] if finished else (calls[0] if calls else None),
                attempts=len([c for c in calls if c.channel == ReminderCallChannel.PHONE]),
            )
        )

    return results


def due_for_phone_call(item: UpcomingAppointment, now: datetime | None = None) -> bool:
    now = now or _now()
    if item.reached or not item.patient.phone:
        return False
    if item.attempts >= settings.reminder_call_max_attempts:
        return False

    last = item.latest_call
    if last is not None:
        if last.status in ACTIVE_STATUSES:
            return False
        retry_after = (last.ended_at or last.created_at) + timedelta(
            minutes=settings.reminder_call_retry_minutes
        )
        if now < retry_after:
            return False
    return True


def place_due_calls(db: Session) -> list[ReminderCall]:
    """Used by the scheduler and the cron endpoint."""

    from app.services import twilio_service

    if not twilio_service.is_configured():
        return []

    expire_stale_calls(db)
    placed: list[ReminderCall] = []

    for item in upcoming_appointments(db):
        if not due_for_phone_call(item):
            continue

        try:
            call = create_call(
                db,
                appointment=item.appointment,
                channel=ReminderCallChannel.PHONE,
                initiated_by=None,
            )
        except ReminderCallError:
            continue

        try:
            call.provider_call_sid = twilio_service.start_call(
                to_number=call.phone_number, call_id=str(call.id)
            )
            call.status = ReminderCallStatus.RINGING
        except twilio_service.TwilioError as exc:
            mark_unreached(db, call, status=ReminderCallStatus.FAILED, error=str(exc))

        db.commit()
        placed.append(call)

    return placed
