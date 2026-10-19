from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import (
    NavigationTaskStatus,
)
from app.models.navigation_task import (
    NavigationTask,
)
from app.schemas.navigation_task import (
    NavigationTaskItemResponse,
    NavigationTaskResponse,
)
from app.services.follow_up_service import (
    get_items,
    need_in_active_follow_up,
)


ACTIVE_TASK_STATUSES = {
    NavigationTaskStatus.OPEN,
    NavigationTaskStatus.IN_PROGRESS,
}


def get_active_task_for_need(
    db: Session,
    *,
    navigation_need_id,
) -> NavigationTask | None:
    """The active task that already covers this need, if any:
    a single-need task, or a follow-up task listing it."""

    single = db.scalar(
        select(NavigationTask).where(
            NavigationTask.navigation_need_id
            == navigation_need_id,
            NavigationTask.status.in_(
                ACTIVE_TASK_STATUSES
            ),
        )
    )
    if single is not None:
        return single

    return need_in_active_follow_up(
        db,
        need_id=navigation_need_id,
    )


def item_responses(
    db: Session,
    task: NavigationTask,
) -> list[NavigationTaskItemResponse]:
    return [
        NavigationTaskItemResponse(
            item_id=item.id,
            navigation_need_id=item.navigation_need_id,
            label=item.label,
            done=item.done_at is not None,
            done_at=item.done_at,
        )
        for item in get_items(db, task_id=task.id)
    ]


def build_task_response(
    db: Session,
    task: NavigationTask,
) -> NavigationTaskResponse:
    return NavigationTaskResponse(
        id=task.id,
        patient_id=task.patient_id,
        navigation_need_id=task.navigation_need_id,
        assigned_to_user_id=task.assigned_to_user_id,
        title=task.title,
        description=task.description,
        status=task.status,
        due_at=task.due_at,
        completed_at=task.completed_at,
        resolution_note=task.resolution_note,
        created_at=task.created_at,
        kind=task.kind,
        items=item_responses(db, task),
    )
