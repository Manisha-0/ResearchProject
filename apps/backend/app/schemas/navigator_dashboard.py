import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import (
    AttentionStatus,
    NavigationTaskStatus,
)


class NavigatorDashboardCountsResponse(
    BaseModel
):
    total_patients: int
    needs_attention: int
    follow_up: int
    on_track: int

    open_tasks: int
    in_progress_tasks: int


class NavigatorDashboardPatientResponse(
    BaseModel
):
    patient_id: uuid.UUID

    first_name: str
    last_name: str

    care_program: str | None

    attention_status: AttentionStatus
    explanation: str

    open_need_count: int

    next_appointment_at: (
        datetime | None
    )


class NavigatorDashboardTaskResponse(
    BaseModel
):
    task_id: uuid.UUID
    patient_id: uuid.UUID

    patient_first_name: str
    patient_last_name: str

    title: str
    status: NavigationTaskStatus

    due_at: datetime | None


class NavigatorDashboardResponse(
    BaseModel
):
    counts: NavigatorDashboardCountsResponse

    patients: list[
        NavigatorDashboardPatientResponse
    ]

    tasks: list[
        NavigatorDashboardTaskResponse
    ]