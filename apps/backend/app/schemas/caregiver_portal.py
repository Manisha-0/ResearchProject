import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import (
    AppointmentStatus,
    CaregiverPermissionType,
)


class CaregiverPortalAppointmentResponse(BaseModel):
    appointment_id: uuid.UUID
    title: str

    scheduled_start: datetime
    scheduled_end: datetime | None

    status: AppointmentStatus

    appointment_type: str | None
    provider_name: str | None
    department: str | None
    location_name: str | None
    address_text: str | None


class CaregiverPortalPatientResponse(BaseModel):
    patient_id: uuid.UUID

    first_name: str
    last_name: str

    relationship: str

    permissions: list[
        CaregiverPermissionType
    ]

    next_appointment: (
        CaregiverPortalAppointmentResponse
        | None
    )


class CaregiverPortalResponse(BaseModel):
    caregiver_first_name: str
    caregiver_last_name: str

    patients: list[
        CaregiverPortalPatientResponse
    ]