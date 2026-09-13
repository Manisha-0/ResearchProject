import uuid
from datetime import datetime

from pydantic import (
    BaseModel,
    Field,
)

from app.models.enums import CheckInSource


class CheckInCreateRequest(BaseModel):
    symptom_severity: int | None = Field(
        default=None,
        ge=0,
        le=10,
    )

    transportation_confirmed: (
        bool | None
    ) = None

    medication_access_issue: bool = False
    financial_concern: bool = False
    requested_help: bool = False

    free_text: str | None = Field(
        default=None,
        max_length=3000,
    )


class CheckInResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    source: CheckInSource

    symptom_severity: int | None
    transportation_confirmed: bool | None
    medication_access_issue: bool
    financial_concern: bool
    requested_help: bool
    free_text: str | None

    created_at: datetime