import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import (
    AttentionStatus,
    NavigationNeedStatus,
)
from app.schemas.navigation_signal import (
    NavigationSignalResponse,
)


class NavigationNeedResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID

    need_type: str

    title: str
    explanation: str
    recommended_action: str | None

    attention_status: AttentionStatus
    status: NavigationNeedStatus

    due_at: datetime | None
    resolved_at: datetime | None

    signals: list[
        NavigationSignalResponse
    ]


class AttentionSummaryResponse(BaseModel):
    patient_id: uuid.UUID
    status: AttentionStatus

    explanation: str

    open_need_count: int

    needs: list[
        NavigationNeedResponse
    ]

class ActionCenterPatientResponse(BaseModel):
    patient_id: uuid.UUID
    first_name: str
    last_name: str

    attention_status: AttentionStatus

    explanation: str

    open_need_count: int