import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models.enums import (
    AttentionStatus,
    CaregiverAccessStatus,
    CaregiverPermissionType,
    CheckInSource,
    NavigationNeedStatus,
    NavigationTaskStatus,
)


class Patient360ProfileResponse(BaseModel):
    patient_id: uuid.UUID
    user_id: uuid.UUID

    first_name: str
    last_name: str
    date_of_birth: date

    email: str

    phone: str | None
    preferred_language: str | None
    preferred_contact_method: str | None
    care_program: str | None
    external_patient_reference: str | None


class Patient360AppointmentResponse(BaseModel):
    appointment_id: uuid.UUID
    journey_item_id: uuid.UUID

    title: str

    scheduled_start: datetime
    scheduled_end: datetime | None

    status: str

    appointment_type: str | None
    provider_name: str | None
    department: str | None
    location_name: str | None


class Patient360CheckInResponse(BaseModel):
    check_in_id: uuid.UUID
    source: CheckInSource

    symptom_severity: int | None
    transportation_confirmed: bool | None
    medication_access_issue: bool
    financial_concern: bool
    requested_help: bool

    free_text: str | None

    created_at: datetime


class Patient360CaregiverResponse(BaseModel):
    caregiver_access_id: uuid.UUID
    caregiver_user_id: uuid.UUID

    first_name: str
    last_name: str

    relationship: str
    status: CaregiverAccessStatus

    permissions: list[CaregiverPermissionType]


class Patient360NeedResponse(BaseModel):
    need_id: uuid.UUID

    need_type: str
    title: str
    explanation: str

    recommended_action: str | None

    attention_status: AttentionStatus
    status: NavigationNeedStatus

    due_at: datetime | None


class Patient360TaskResponse(BaseModel):
    task_id: uuid.UUID
    navigation_need_id: uuid.UUID

    title: str
    description: str | None

    status: NavigationTaskStatus

    due_at: datetime | None
    completed_at: datetime | None

    resolution_note: str | None


class Patient360ResolutionResponse(BaseModel):
    task_id: uuid.UUID
    navigation_need_id: uuid.UUID

    need_title: str
    task_title: str

    completed_at: datetime
    resolution_note: str


class Patient360AttentionResponse(BaseModel):
    status: AttentionStatus
    explanation: str
    open_need_count: int


class Patient360Response(BaseModel):
    profile: Patient360ProfileResponse

    attention: Patient360AttentionResponse

    upcoming_appointments: list[
        Patient360AppointmentResponse
    ]

    recent_check_ins: list[
        Patient360CheckInResponse
    ]

    caregivers: list[
        Patient360CaregiverResponse
    ]

    open_needs: list[
        Patient360NeedResponse
    ]

    active_tasks: list[
        Patient360TaskResponse
    ]

    recent_resolutions: list[
        Patient360ResolutionResponse
    ]