from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.models.enums import (
    NavigationTaskStatus,
    UserRole,
)
from app.models.navigation_need import (
    NavigationNeed,
)
from app.models.navigation_task import (
    NavigationTask,
)
from app.models.patient import PatientProfile
from app.models.user import User
from app.schemas.navigation_task import (
    NavigationTaskResponse,
    NavigatorTaskQueueResponse,
)


router = APIRouter(
    prefix="/navigator/tasks",
    tags=["Navigator Tasks"],
)


@router.get(
    "",
    response_model=list[
        NavigatorTaskQueueResponse
    ],
)
def list_my_tasks(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.NAVIGATOR
            )
        ),
    ],
):
    rows = db.execute(
        select(
            NavigationTask,
            NavigationNeed,
            PatientProfile,
        )
        .join(
            NavigationNeed,
            NavigationNeed.id
            == NavigationTask.navigation_need_id,
        )
        .join(
            PatientProfile,
            PatientProfile.id
            == NavigationTask.patient_id,
        )
        .where(
            NavigationTask.assigned_to_user_id
            == current_user.id
        )
    ).all()

    result = []

    for task, need, patient in rows:
        result.append(
            NavigatorTaskQueueResponse(
                task=NavigationTaskResponse(
                    id=task.id,
                    patient_id=task.patient_id,
                    navigation_need_id=(
                        task.navigation_need_id
                    ),
                    assigned_to_user_id=(
                        task.assigned_to_user_id
                    ),
                    title=task.title,
                    description=task.description,
                    status=task.status,
                    due_at=task.due_at,
                    completed_at=(
                        task.completed_at
                    ),
                    resolution_note=(
                        task.resolution_note
                    ),
                    created_at=task.created_at,
                ),
                patient_first_name=(
                    patient.first_name
                ),
                patient_last_name=(
                    patient.last_name
                ),
                need_title=need.title,
                attention_status=(
                    need.attention_status
                ),
            )
        )

    status_order = {
        NavigationTaskStatus.IN_PROGRESS: 0,
        NavigationTaskStatus.OPEN: 1,
        NavigationTaskStatus.COMPLETED: 2,
        NavigationTaskStatus.CANCELLED: 3,
    }

    return sorted(
        result,
        key=lambda row: (
            status_order[
                row.task.status
            ],
            row.task.due_at is None,
            row.task.due_at,
        ),
    )