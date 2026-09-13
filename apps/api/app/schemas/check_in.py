from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CheckInCreate(BaseModel):
    organization_id: int
    patient_id: int
    navigator_id: int | None = None
    check_in_type: str
    status: str = "completed"
    notes: str | None = None
    risk_score: int | None = None


class CheckInUpdate(BaseModel):
    navigator_id: int | None = None
    check_in_type: str | None = None
    status: str | None = None
    notes: str | None = None
    risk_score: int | None = None


class CheckInResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    patient_id: int
    navigator_id: int | None
    check_in_type: str
    status: str
    notes: str | None
    risk_score: int | None
    checked_in_at: datetime
    created_at: datetime