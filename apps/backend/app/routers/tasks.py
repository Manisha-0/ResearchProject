from datetime import datetime, timezone
from typing import Annotated
import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.models.enums import (
    NavigationNeedStatus,
    NavigationTaskStatus,
    UserRole,
)
from app.models.navigation_need import (
    NavigationNeed,
)
from app.models.navigation_task import (
    NavigationTask,
)
from app.models.user import User
from app.schemas.navigation_task import (
    NavigationTaskCreateRequest,
    NavigationTaskResponse,
    NavigationTaskUpdateRequest,
)
from app.services.audit_service import (
    write_audit_log,
)
from app.services.context_engine import (
    evaluate_and_snapshot_patient,
)
from app.services.permissions import (
    get_patient_for_navigator,
)
from app.services.task_service import (
    get_active_task_for_need,
)


router = APIRouter(
    prefix="/patients/{patient_id}",
    tags=["Navigation Tasks"],
)

@router.post(
    "/needs/{need_id}/tasks",
    response_model=NavigationTaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_navigation_task(
    patient_id: uuid.UUID,
    need_id: uuid.UUID,
    payload: NavigationTaskCreateRequest,
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
) -> NavigationTaskResponse:
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    need = db.get(
        NavigationNeed,
        need_id,
    )

    if (
        need is None
        or need.patient_id != patient.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Navigation need not found.",
        )

    if (
        need.status
        != NavigationNeedStatus.OPEN
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A task cannot be created for "
                "a resolved navigation need."
            ),
        )

    active_task = get_active_task_for_need(
        db,
        navigation_need_id=need.id,
    )

    if active_task is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An active task already exists "
                "for this navigation need."
            ),
        )

    task = NavigationTask(
        patient_id=patient.id,
        navigation_need_id=need.id,
        assigned_to_user_id=current_user.id,
        created_by_user_id=current_user.id,
        title=(
            payload.title.strip()
            if payload.title
            else (
                need.recommended_action
                or need.title
            )
        ),
        description=(
            payload.description.strip()
            if payload.description
            else need.explanation
        ),
        status=NavigationTaskStatus.OPEN,
        due_at=(
            payload.due_at
            if payload.due_at
            else need.due_at
        ),
    )

    db.add(task)
    db.flush()

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action="NAVIGATION_TASK_CREATED",
        resource_type="navigation_task",
        resource_id=str(task.id),
        metadata_json={
            "navigation_need_id": str(
                need.id
            ),
        },
    )

    db.commit()
    db.refresh(task)

    return NavigationTaskResponse(
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
        completed_at=task.completed_at,
        resolution_note=task.resolution_note,
        created_at=task.created_at,
    )

@router.patch(
    "/tasks/{task_id}",
    response_model=NavigationTaskResponse,
)
def update_navigation_task(
    patient_id: uuid.UUID,
    task_id: uuid.UUID,
    payload: NavigationTaskUpdateRequest,
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
) -> NavigationTaskResponse:
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    task = db.get(
        NavigationTask,
        task_id,
    )

    if (
        task is None
        or task.patient_id != patient.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Navigation task not found.",
        )

    if (
        task.assigned_to_user_id
        != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Navigation task not found.",
        )

    if (
        task.status
        == NavigationTaskStatus.COMPLETED
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A completed task cannot "
                "be modified."
            ),
        )

    if (
        payload.status
        == NavigationTaskStatus.COMPLETED
        and not payload.resolution_note
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "A resolution note is required "
                "when completing a task."
            ),
        )

    task.status = payload.status

    if payload.resolution_note:
        task.resolution_note = (
            payload.resolution_note.strip()
        )

    if (
        payload.status
        == NavigationTaskStatus.COMPLETED
    ):
        now = datetime.now(timezone.utc)

        task.completed_at = now
        task.completed_by_user_id = (
            current_user.id
        )

        need = db.get(
            NavigationNeed,
            task.navigation_need_id,
        )

        if need is not None:
            need.status = (
                NavigationNeedStatus.RESOLVED
            )
            need.resolved_at = now

    elif (
        payload.status
        != NavigationTaskStatus.COMPLETED
    ):
        task.completed_at = None
        task.completed_by_user_id = None

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action="NAVIGATION_TASK_UPDATED",
        resource_type="navigation_task",
        resource_id=str(task.id),
        metadata_json={
            "status": task.status.value,
            "navigation_need_id": str(
                task.navigation_need_id
            ),
        },
    )

    db.commit()
    db.refresh(task)

    return NavigationTaskResponse(
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
        completed_at=task.completed_at,
        resolution_note=task.resolution_note,
        created_at=task.created_at,
    )

