from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NavigatorCreate(BaseModel):
    organization_id: int
    user_id: int


class NavigatorUpdate(BaseModel):
    user_id: int | None = None


class NavigatorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    user_id: int
    created_at: datetime