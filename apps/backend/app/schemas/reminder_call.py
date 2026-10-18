import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import (
    ReminderCallAnsweredBy,
    ReminderCallChannel,
    ReminderCallStatus,
)


class TranscriptEntry(BaseModel):
    speaker: str
    text: str
    step: str | None = None
    at: datetime | None = None


class ReminderCallSummary(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    appointment_id: uuid.UUID
    channel: ReminderCallChannel
    status: ReminderCallStatus
    answered_by: ReminderCallAnsweredBy | None
    attempt_number: int
    summary: str | None
    needs_follow_up: bool
    safety_flag: bool
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime


class ReminderCallDetail(ReminderCallSummary):
    phone_number: str | None
    transcript: list[TranscriptEntry]
    answers: dict[str, Any]
    check_in_id: uuid.UUID | None
    error_message: str | None


class UpcomingCallItem(BaseModel):
    appointment_id: uuid.UUID
    patient_id: uuid.UUID
    patient_first_name: str
    patient_last_name: str
    patient_phone: str | None
    preferred_language: str
    appointment_label: str
    provider_name: str | None
    location_name: str | None
    scheduled_start: datetime
    attempts: int
    reached: bool
    due: bool
    latest_call: ReminderCallSummary | None


class UpcomingCallsResponse(BaseModel):
    phone_calls_enabled: bool
    auto_dial_enabled: bool
    window_hours: int
    items: list[UpcomingCallItem]


class StartReminderCallRequest(BaseModel):
    appointment_id: uuid.UUID
    channel: ReminderCallChannel = ReminderCallChannel.SIMULATED


class ReminderCallReplyRequest(BaseModel):
    text: str = Field(default="", max_length=2000)
    digits: str | None = Field(default=None, max_length=4)


class ReminderCallTurnResponse(BaseModel):
    call: ReminderCallDetail
    say: str
    done: bool
    expects: str


class RunDueCallsResponse(BaseModel):
    placed: int
