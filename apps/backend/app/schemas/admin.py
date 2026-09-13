import uuid
from datetime import datetime

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)


class NavigatorCreateRequest(BaseModel):
    email: EmailStr

    first_name: str = Field(
        min_length=1,
        max_length=100,
    )

    last_name: str = Field(
        min_length=1,
        max_length=100,
    )

    job_title: str = Field(
        min_length=1,
        max_length=150,
    )

    department: str | None = Field(
        default=None,
        max_length=150,
    )

    phone: str | None = Field(
        default=None,
        max_length=30,
    )


class NavigatorCreateResponse(BaseModel):
    user_id: uuid.UUID

    email: EmailStr

    status: str

    message: str


class AdminNavigatorResponse(BaseModel):
    user_id: uuid.UUID

    email: EmailStr

    status: str

    first_name: str

    last_name: str

    job_title: str

    department: str | None

    phone: str | None

    created_at: datetime

    last_login_at: datetime | None