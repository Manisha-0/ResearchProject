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
from app.models.navigation_task_item import (
    NavigationTaskItem,
)
from app.models.user import User
from app.schemas.navigation_task import (
    NavigationTaskCreateRequest,
    NavigationTaskItemUpdateRequest,
    NavigationTaskResponse,
    NavigationTaskUpdateRequest,
)
from app.services.audit_service import (
    write_audit_log,
)
from app.services.context_engine import (
    evaluate_and_snapshot_patient,
    resolve_need,
)
from app.services.permissions import (
    get_patient_for_navigator,
)
from app.services.follow_up_service import (
    FOLLOW_UP,
    complete_follow_up,
    set_item_done,
    sync_follow_up_task,
)
from app.services.task_service import (
    build_task_response,
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
                "This need is already on an "
                "open task."
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

    return build_task_response(db, task)

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

    if (
        task.kind == FOLLOW_UP
        and payload.status
        == NavigationTaskStatus.COMPLETED
    ):
        # Finishing a follow-up resolves every item left on it.
        complete_follow_up(
            db,
            task=task,
            user_id=current_user.id,
            note=payload.resolution_note.strip(),
        )
        evaluate_and_snapshot_patient(
            db,
            patient_id=patient.id,
        )
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
                "kind": FOLLOW_UP,
            },
        )
        db.commit()
        db.refresh(task)
        return build_task_response(db, task)

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
            resolve_need(db, need, at=now)

        evaluate_and_snapshot_patient(
            db,
            patient_id=patient.id,
        )

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

    return build_task_response(db, task)



@router.patch(
    "/tasks/{task_id}/items/{item_id}",
    response_model=NavigationTaskResponse,
)
def update_navigation_task_item(
    patient_id: uuid.UUID,
    task_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: NavigationTaskItemUpdateRequest,
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
    """Tick or untick one item on a follow-up checklist.

    Ticking resolves that need. Ticking the last item
    completes the follow-up task.
    """

    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    task = db.get(NavigationTask, task_id)
    if (
        task is None
        or task.patient_id != patient.id
        or task.assigned_to_user_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Navigation task not found.",
        )

    if task.status == NavigationTaskStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A completed task cannot be modified.",
        )

    item = db.get(NavigationTaskItem, item_id)
    if item is None or item.task_id != task.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist item not found.",
        )

    set_item_done(
        db,
        task=task,
        item=item,
        done=payload.done,
        user_id=current_user.id,
    )
    sync_follow_up_task(
        db,
        patient_id=patient.id,
        actor_user_id=current_user.id,
    )
    evaluate_and_snapshot_patient(
        db,
        patient_id=patient.id,
    )

    write_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action="NAVIGATION_TASK_ITEM_UPDATED",
        resource_type="navigation_task",
        resource_id=str(task.id),
        metadata_json={
            "item_id": str(item.id),
            "navigation_need_id": str(item.navigation_need_id),
            "done": payload.done,
        },
    )

    db.commit()
    db.refresh(task)

    return build_task_response(db, task)
