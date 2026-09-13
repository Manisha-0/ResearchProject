from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import (
    NavigationTaskStatus,
)
from app.models.navigation_task import (
    NavigationTask,
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
    return db.scalar(
        select(NavigationTask).where(
            NavigationTask.navigation_need_id
            == navigation_need_id,
            NavigationTask.status.in_(
                ACTIVE_TASK_STATUSES
            ),
        )
    )