import uuid
from datetime import datetime

from pydantic import (
    BaseModel,
    Field,
)

from app.models.enums import (
    AttentionStatus,
    NavigationTaskStatus,
)


class NavigationTaskCreateRequest(BaseModel):
    title: str | None = Field(
        default=None,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=3000,
    )

    due_at: datetime | None = None


class NavigationTaskResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    navigation_need_id: uuid.UUID

    assigned_to_user_id: uuid.UUID

    title: str
    description: str | None

    status: NavigationTaskStatus

    due_at: datetime | None
    completed_at: datetime | None
    resolution_note: str | None

    created_at: datetime


class NavigationTaskUpdateRequest(BaseModel):
    status: NavigationTaskStatus

    resolution_note: str | None = Field(
        default=None,
        max_length=3000,
    )


class NavigatorTaskQueueResponse(BaseModel):
    task: NavigationTaskResponse

    patient_first_name: str
    patient_last_name: str

    need_title: str
    attention_status: AttentionStatus