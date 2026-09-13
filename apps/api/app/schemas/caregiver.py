from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CaregiverCreate(BaseModel):
    organization_id: int
    user_id: int | None = None
    patient_id: int | None = None
    first_name: str
    last_name: str
    relationship_to_patient: str | None = None
    phone: str | None = None


class CaregiverUpdate(BaseModel):
    user_id: int | None = None
    patient_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    relationship_to_patient: str | None = None
    phone: str | None = None


class CaregiverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    user_id: int | None
    patient_id: int | None
    first_name: str
    last_name: str
    relationship_to_patient: str | None
    phone: str | None
    created_at: datetime