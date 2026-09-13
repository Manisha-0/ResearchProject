from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PatientCreate(BaseModel):
    organization_id: int
    user_id: int | None = None
    first_name: str
    last_name: str
    date_of_birth: date | None = None
    medical_record_number: str | None = None


class PatientUpdate(BaseModel):
    user_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: date | None = None
    medical_record_number: str | None = None


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    user_id: int | None
    first_name: str
    last_name: str
    date_of_birth: date | None
    medical_record_number: str | None
    created_at: datetime