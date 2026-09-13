from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AppointmentCreate(BaseModel):
    organization_id: int
    patient_id: int
    navigator_id: int | None = None
    title: str
    appointment_type: str | None = None
    provider_name: str | None = None
    scheduled_at: datetime
    location: str | None = None
    status: str = "scheduled"
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    navigator_id: int | None = None
    title: str | None = None
    appointment_type: str | None = None
    provider_name: str | None = None
    scheduled_at: datetime | None = None
    location: str | None = None
    status: str | None = None
    notes: str | None = None


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    patient_id: int
    navigator_id: int | None
    title: str
    appointment_type: str | None
    provider_name: str | None
    scheduled_at: datetime
    location: str | None
    status: str
    notes: str | None
    created_at: datetime