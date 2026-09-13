import uuid
from datetime import date

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)


class PatientCreateRequest(BaseModel):
    first_name: str = Field(
        min_length=1,
        max_length=100,
    )

    last_name: str = Field(
        min_length=1,
        max_length=100,
    )

    date_of_birth: date

    email: EmailStr

    phone: str | None = Field(
        default=None,
        max_length=30,
    )

    preferred_language: str = Field(
        default="English",
        min_length=1,
        max_length=50,
    )

    preferred_contact_method: str | None = Field(
        default=None,
        max_length=30,
    )

    care_program: str | None = Field(
        default=None,
        max_length=150,
    )

    external_patient_reference: str | None = Field(
        default=None,
        max_length=150,
    )


class PatientCreateResponse(BaseModel):
    patient_id: uuid.UUID
    user_id: uuid.UUID
    email: EmailStr
    status: str
    message: str


class PatientSummaryResponse(BaseModel):
    patient_id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr
    status: str
    care_program: str | None