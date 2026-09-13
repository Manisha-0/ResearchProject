from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CareJourneyCreate(BaseModel):
    organization_id: int
    patient_id: int
    item_type: str
    title: str
    description: str | None = None
    status: str = "pending"
    occurred_at: datetime | None = None


class CareJourneyUpdate(BaseModel):
    item_type: str | None = None
    title: str | None = None
    description: str | None = None
    status: str | None = None
    occurred_at: datetime | None = None


class CareJourneyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    patient_id: int
    item_type: str
    title: str
    description: str | None
    status: str
    occurred_at: datetime | None
    created_at: datetime