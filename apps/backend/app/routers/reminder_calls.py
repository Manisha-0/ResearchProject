import logging
import uuid
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Request,
    Response,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.config import settings
from app.core.database import get_db
from app.models.appointment import Appointment
from app.models.enums import (
    ReminderCallChannel,
    ReminderCallStatus,
    UserRole,
)
from app.models.reminder_call import ReminderCall
from app.models.user import User
from app.schemas.reminder_call import (
    ReminderCallDetail,
    ReminderCallReplyRequest,
    ReminderCallSummary,
    ReminderCallTurnResponse,
    RunDueCallsResponse,
    StartReminderCallRequest,
    UpcomingCallItem,
    UpcomingCallsResponse,
)
from app.services import reminder_call_service as calls
from app.services import twilio_service
from app.services.permissions import get_patient_for_navigator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reminder-calls", tags=["Reminder Calls"])
voice_router = APIRouter(prefix="/voice/reminder-calls", tags=["Twilio Voice"])

Navigator = Annotated[User, Depends(require_roles(UserRole.NAVIGATOR))]
DB = Annotated[Session, Depends(get_db)]


def _summary(call: ReminderCall) -> ReminderCallSummary:
    return ReminderCallSummary.model_validate(call, from_attributes=True)


def _detail(call: ReminderCall) -> ReminderCallDetail:
    answers = {k: v for k, v in (call.answers or {}).items() if not k.startswith("_")}
    return ReminderCallDetail.model_validate(
        {
            **_summary(call).model_dump(),
            "phone_number": call.phone_number,
            "transcript": call.transcript or [],
            "answers": answers,
            "check_in_id": call.check_in_id,
            "error_message": call.error_message,
        }
    )


def _get_call_for_navigator(db: Session, call_id: uuid.UUID, navigator: User) -> ReminderCall:
    call = db.get(ReminderCall, call_id)
    if call is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Call not found.")
    get_patient_for_navigator(db, patient_id=call.patient_id, navigator=navigator)
    return call


# =========================================================
# Navigator endpoints
# =========================================================


@router.get("/upcoming", response_model=UpcomingCallsResponse)
def list_upcoming(db: DB, navigator: Navigator) -> UpcomingCallsResponse:
    """Appointments in the next 48 hours and their call status."""

    calls.expire_stale_calls(db)
    db.commit()

    items = []
    for item in calls.upcoming_appointments(db, navigator=navigator):
        appointment = item.appointment
        items.append(
            UpcomingCallItem(
                appointment_id=appointment.id,
                patient_id=item.patient.id,
                patient_first_name=item.patient.first_name,
                patient_last_name=item.patient.last_name,
                patient_phone=item.patient.phone,
                preferred_language=item.patient.preferred_language,
                appointment_label=(
                    appointment.appointment_type
                    or (item.journey_item.title if item.journey_item else "Appointment")
                ),
                provider_name=appointment.provider_name,
                location_name=appointment.location_name,
                scheduled_start=appointment.scheduled_start,
                attempts=item.attempts,
                reached=item.reached,
                due=calls.due_for_phone_call(item),
                latest_call=_summary(item.latest_call) if item.latest_call else None,
            )
        )

    return UpcomingCallsResponse(
        phone_calls_enabled=twilio_service.is_configured(),
        auto_dial_enabled=settings.reminder_call_auto_dial,
        window_hours=settings.reminder_call_window_hours,
        items=items,
    )


@router.get("/patients/{patient_id}", response_model=list[ReminderCallSummary])
def list_patient_calls(patient_id: uuid.UUID, db: DB, navigator: Navigator):
    get_patient_for_navigator(db, patient_id=patient_id, navigator=navigator)
    rows = db.scalars(
        select(ReminderCall)
        .where(ReminderCall.patient_id == patient_id)
        .order_by(ReminderCall.created_at.desc())
        .limit(50)
    ).all()
    return [_summary(c) for c in rows]


@router.get("/{call_id}", response_model=ReminderCallDetail)
def get_call(call_id: uuid.UUID, db: DB, navigator: Navigator):
    return _detail(_get_call_for_navigator(db, call_id, navigator))


@router.post("", response_model=ReminderCallTurnResponse, status_code=status.HTTP_201_CREATED)
def start_call(payload: StartReminderCallRequest, db: DB, navigator: Navigator):
    """
    Start a reminder call.

    simulated: the conversation runs in the browser and
    the first thing the agent says comes back right away.

    phone: Twilio dials the patient; the conversation then
    happens through the /voice webhooks below.
    """

    appointment = db.get(Appointment, payload.appointment_id)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found.")
    get_patient_for_navigator(db, patient_id=appointment.patient_id, navigator=navigator)

    if payload.channel == ReminderCallChannel.PHONE and not twilio_service.is_configured():
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Phone calls are not set up. Add Twilio settings to the backend .env, "
            "or use the call simulator.",
        )

    try:
        call = calls.create_call(
            db, appointment=appointment, channel=payload.channel, initiated_by=navigator
        )
    except calls.ReminderCallError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc

    if payload.channel == ReminderCallChannel.SIMULATED:
        turn = calls.begin(db, call)
        db.commit()
        return ReminderCallTurnResponse(
            call=_detail(call), say=turn.say, done=turn.done, expects=turn.expects
        )

    try:
        call.provider_call_sid = twilio_service.start_call(
            to_number=call.phone_number, call_id=str(call.id)
        )
        call.status = ReminderCallStatus.RINGING
    except twilio_service.TwilioError as exc:
        calls.mark_unreached(db, call, status=ReminderCallStatus.FAILED, error=str(exc))
        db.commit()
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Could not place the call: {exc}") from exc

    db.commit()
    return ReminderCallTurnResponse(call=_detail(call), say="", done=False, expects="none")


@router.post("/{call_id}/reply", response_model=ReminderCallTurnResponse)
def simulated_reply(call_id: uuid.UUID, payload: ReminderCallReplyRequest, db: DB, navigator: Navigator):
    call = _get_call_for_navigator(db, call_id, navigator)
    if call.channel != ReminderCallChannel.SIMULATED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only simulated calls take typed replies.")

    try:
        turn = calls.reply(db, call, text=payload.text, digits=payload.digits)
    except calls.ReminderCallError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc

    db.commit()
    return ReminderCallTurnResponse(call=_detail(call), say=turn.say, done=turn.done, expects=turn.expects)


@router.post("/{call_id}/end", response_model=ReminderCallDetail)
def end_call(call_id: uuid.UUID, db: DB, navigator: Navigator):
    call = _get_call_for_navigator(db, call_id, navigator)
    calls.hang_up_early(db, call)
    db.commit()
    return _detail(call)


@router.post("/run-due", response_model=RunDueCallsResponse)
def run_due_calls(
    db: DB,
    x_cron_secret: Annotated[str | None, Header()] = None,
):
    """
    For an external scheduler (cron job, Render cron,
    GitHub Actions). Send the secret in X-Cron-Secret.
    """

    if not settings.reminder_call_cron_secret or x_cron_secret != settings.reminder_call_cron_secret:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid cron secret.")

    placed = calls.place_due_calls(db)
    return RunDueCallsResponse(placed=len(placed))


# =========================================================
# Twilio webhooks
# =========================================================


async def _twilio_form(request: Request) -> dict[str, str]:
    form = await request.form()
    params = {key: str(value) for key, value in form.items()}

    path = request.url.path
    if request.url.query:
        path = f"{path}?{request.url.query}"

    if not twilio_service.validate_signature(
        twilio_service.public_url(path),
        params,
        request.headers.get("X-Twilio-Signature"),
    ):
        logger.warning("Rejected Twilio webhook with a bad signature: %s", path)
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid signature.")

    return params


def _xml(body: str) -> Response:
    return Response(content=body, media_type="application/xml")


def _load_phone_call(db: Session, call_id: uuid.UUID) -> ReminderCall:
    call = db.get(ReminderCall, call_id)
    if call is None or call.channel != ReminderCallChannel.PHONE:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Call not found.")
    return call


@voice_router.post("/{call_id}/answer")
async def twilio_answer(call_id: uuid.UUID, request: Request, db: DB):
    await _twilio_form(request)
    call = _load_phone_call(db, call_id)

    try:
        turn = calls.begin(db, call)
    except calls.ReminderCallError:
        return _xml(twilio_service.hang_up(say="Goodbye."))

    db.commit()
    return _xml(twilio_service.gather(say=turn.say, call_id=str(call.id), expects=turn.expects))


@voice_router.post("/{call_id}/reply")
async def twilio_reply(call_id: uuid.UUID, request: Request, db: DB):
    params = await _twilio_form(request)
    call = _load_phone_call(db, call_id)

    silent = request.query_params.get("silent") == "1"
    text = "" if silent else params.get("SpeechResult", "")
    digits = None if silent else (params.get("Digits") or None)

    try:
        turn = calls.reply(db, call, text=text, digits=digits)
    except calls.ReminderCallError:
        return _xml(twilio_service.hang_up(say="Goodbye."))

    db.commit()

    if turn.done:
        return _xml(twilio_service.hang_up(say=turn.say))
    return _xml(twilio_service.gather(say=turn.say, call_id=str(call.id), expects=turn.expects))


@voice_router.post("/{call_id}/status")
async def twilio_status(call_id: uuid.UUID, request: Request, db: DB):
    params = await _twilio_form(request)
    call = _load_phone_call(db, call_id)
    twilio_status_value = params.get("CallStatus", "")

    if twilio_status_value == "ringing" and call.status == ReminderCallStatus.QUEUED:
        call.status = ReminderCallStatus.RINGING
    elif twilio_status_value in ("no-answer", "busy", "canceled"):
        calls.mark_unreached(db, call, status=ReminderCallStatus.NO_ANSWER)
    elif twilio_status_value == "failed":
        calls.mark_unreached(db, call, status=ReminderCallStatus.FAILED, error="Twilio reported failed.")
    elif twilio_status_value == "completed":
        # Caller hung up before the script finished.
        calls.hang_up_early(db, call)

    db.commit()
    return Response(status_code=204)
