from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    organization_id: int
    email: str
    full_name: str
    role: str


class UserUpdate(BaseModel):
    email: str | None = None
    full_name: str | None = None
    role: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    email: str
    full_name: str
    role: str
    created_at: datetime