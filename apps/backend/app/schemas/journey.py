import uuid
from datetime import datetime

from pydantic import (
    BaseModel,
    Field,
)

from app.models.enums import (
    AppointmentStatus,
    JourneyItemStatus,
    JourneyItemType,
)


class JourneyItemCreateRequest(BaseModel):
    item_type: JourneyItemType

    title: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    scheduled_at: datetime | None = None

    patient_visible: bool = True


class JourneyItemResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    item_type: JourneyItemType
    status: JourneyItemStatus
    title: str
    description: str | None
    scheduled_at: datetime | None
    completed_at: datetime | None
    patient_visible: bool
    source_type: str


class AppointmentCreateRequest(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=200,
    )

    appointment_type: str | None = Field(
        default=None,
        max_length=150,
    )

    scheduled_start: datetime
    scheduled_end: datetime | None = None

    provider_name: str | None = Field(
        default=None,
        max_length=150,
    )

    department: str | None = Field(
        default=None,
        max_length=150,
    )

    location_name: str | None = Field(
        default=None,
        max_length=200,
    )

    address_text: str | None = Field(
        default=None,
        max_length=300,
    )

    notes: str | None = None

    patient_visible: bool = True


class AppointmentResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    journey_item_id: uuid.UUID

    title: str

    scheduled_start: datetime
    scheduled_end: datetime | None

    status: AppointmentStatus

    appointment_type: str | None
    provider_name: str | None
    department: str | None
    location_name: str | None
    address_text: str | None
    notes: str | None


class AppointmentStatusUpdateRequest(BaseModel):
    status: AppointmentStatus


class JourneyTimelineItemResponse(BaseModel):
    id: uuid.UUID
    item_type: JourneyItemType
    status: JourneyItemStatus

    title: str
    description: str | None

    scheduled_at: datetime | None
    completed_at: datetime | None

    patient_visible: bool

    appointment: AppointmentResponse | None = None