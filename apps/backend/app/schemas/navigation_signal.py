import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import (
    NavigationSignalCategory,
    NavigationSignalSourceType,
    NavigationSignalStatus,
)


class NavigationSignalResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID

    category: NavigationSignalCategory
    signal_type: str
    status: NavigationSignalStatus

    title: str
    description: str | None

    source_type: NavigationSignalSourceType
    source_reference: str

    observed_at: datetime
    resolved_at: datetime | None

class NavigationSignalStatusUpdateRequest(
    BaseModel
):
    status: NavigationSignalStatus