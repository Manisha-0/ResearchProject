import uuid

from pydantic import BaseModel, EmailStr, Field


class NavigatorCreateRequest(BaseModel):
    first_name: str = Field(
        min_length=1,
        max_length=100,
    )

    last_name: str = Field(
        min_length=1,
        max_length=100,
    )

    email: EmailStr

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