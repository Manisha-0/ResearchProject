from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AssignmentCreate(BaseModel):
    organization_id: int
    navigator_id: int
    patient_id: int


class AssignmentUpdate(BaseModel):
    status: str | None = None
    ended_at: datetime | None = None


class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    navigator_id: int
    patient_id: int
    status: str
    assigned_at: datetime
    ended_at: datetime | None