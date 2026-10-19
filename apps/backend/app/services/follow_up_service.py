"""
One follow-up task per patient.

Instead of the navigator creating, starting and completing a
separate task for every navigation need, Compass keeps a single
"follow_up" task for each patient. Its checklist has one item per
open need, so everything is handled on one call:

    Call Mary back — due today 5:00 PM
      [ ] Resolve transportation before upcoming appointment
      [ ] Medication access needs follow-up
      [ ] Review high symptom report

Rules
- Created automatically for the patient's assigned navigator when
  an open need is not already covered by a task.
- New needs are added to the same task while it is open.
- Ticking an item resolves its need; un-ticking reopens it.
- A need resolved elsewhere ticks its item.
- When every item is ticked, the task completes itself.
- Due time = the earliest due time among the unticked items.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import (
    AttentionStatus,
    NavigationNeedStatus,
    NavigationTaskStatus,
)
from app.models.navigation_need import NavigationNeed
from app.models.navigation_need_signal import NavigationNeedSignal
from app.models.navigation_signal import NavigationSignal
from app.models.navigation_task import NavigationTask
from app.models.navigation_task_item import NavigationTaskItem
from app.models.patient import NavigatorPatientAssignment, PatientProfile

FOLLOW_UP = "follow_up"

ACTIVE_STATUSES = (
    NavigationTaskStatus.OPEN,
    NavigationTaskStatus.IN_PROGRESS,
)

ATTENTION_ORDER = {
    AttentionStatus.NEEDS_ATTENTION: 0,
    AttentionStatus.FOLLOW_UP: 1,
    AttentionStatus.ON_TRACK: 2,
}

DESCRIPTION = (
    "Everything open for this patient, gathered into one follow-up. "
    "Cover each item on one call, then tick it when it is sorted."
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _urgency_key(need: NavigationNeed):
    return (
        ATTENTION_ORDER.get(need.attention_status, 3),
        need.due_at is None,
        need.due_at or datetime.max.replace(tzinfo=timezone.utc),
        need.created_at or datetime.max.replace(tzinfo=timezone.utc),
    )


def get_active_follow_up(db: Session, *, patient_id) -> NavigationTask | None:
    return db.scalar(
        select(NavigationTask)
        .where(
            NavigationTask.patient_id == patient_id,
            NavigationTask.kind == FOLLOW_UP,
            NavigationTask.status.in_(ACTIVE_STATUSES),
        )
        .order_by(NavigationTask.created_at.desc())
        .limit(1)
    )


def get_items(db: Session, *, task_id) -> list[NavigationTaskItem]:
    return list(
        db.scalars(
            select(NavigationTaskItem)
            .where(NavigationTaskItem.task_id == task_id)
            .order_by(NavigationTaskItem.position, NavigationTaskItem.created_at)
        ).all()
    )


def need_in_active_follow_up(db: Session, *, need_id) -> NavigationTask | None:
    return db.scalar(
        select(NavigationTask)
        .join(NavigationTaskItem, NavigationTaskItem.task_id == NavigationTask.id)
        .where(
            NavigationTaskItem.navigation_need_id == need_id,
            NavigationTask.status.in_(ACTIVE_STATUSES),
        )
        .limit(1)
    )


def _assigned_navigator_id(db: Session, *, patient_id) -> uuid.UUID | None:
    return db.scalar(
        select(NavigatorPatientAssignment.navigator_user_id)
        .where(NavigatorPatientAssignment.patient_id == patient_id)
        .order_by(NavigatorPatientAssignment.created_at)
        .limit(1)
    )


def _needs_with_single_task(db: Session, *, patient_id) -> set[uuid.UUID]:
    """Needs a navigator already made a task for by hand."""

    return set(
        db.scalars(
            select(NavigationTask.navigation_need_id).where(
                NavigationTask.patient_id == patient_id,
                NavigationTask.kind != FOLLOW_UP,
                NavigationTask.status.in_(ACTIVE_STATUSES),
            )
        ).all()
    )


def _callback_requested(db: Session, need_ids: list[uuid.UUID]) -> bool:
    if not need_ids:
        return False
    return (
        db.scalar(
            select(NavigationSignal.id)
            .join(
                NavigationNeedSignal,
                NavigationNeedSignal.navigation_signal_id == NavigationSignal.id,
            )
            .where(
                NavigationNeedSignal.navigation_need_id.in_(need_ids),
                NavigationSignal.signal_type.like("callback_%"),
            )
            .limit(1)
        )
        is not None
    )


def _complete(task: NavigationTask, *, by_user_id, note: str | None) -> None:
    task.status = NavigationTaskStatus.COMPLETED
    task.completed_at = _now()
    task.completed_by_user_id = by_user_id
    if note:
        task.resolution_note = note
    elif not task.resolution_note:
        task.resolution_note = "All checklist items resolved."


def sync_follow_up_task(
    db: Session,
    *,
    patient_id,
    actor_user_id=None,
) -> NavigationTask | None:
    task = get_active_follow_up(db, patient_id=patient_id)

    # 1. Keep existing items in step with their needs.
    items: list[NavigationTaskItem] = []
    if task is not None:
        items = get_items(db, task_id=task.id)
        for item in items:
            need = db.get(NavigationNeed, item.navigation_need_id)
            if need is None:
                continue
            if need.status == NavigationNeedStatus.RESOLVED and item.done_at is None:
                item.done_at = need.resolved_at or _now()
            elif need.status == NavigationNeedStatus.OPEN and item.done_at is not None:
                item.done_at = None
                item.done_by_user_id = None

    # 2. Open needs nobody is working on yet.
    covered = _needs_with_single_task(db, patient_id=patient_id)
    covered |= {item.navigation_need_id for item in items}

    open_needs = list(
        db.scalars(
            select(NavigationNeed).where(
                NavigationNeed.patient_id == patient_id,
                NavigationNeed.status == NavigationNeedStatus.OPEN,
            )
        ).all()
    )
    uncovered = sorted(
        (need for need in open_needs if need.id not in covered),
        key=_urgency_key,
    )

    if uncovered and task is None:
        navigator_id = _assigned_navigator_id(db, patient_id=patient_id)
        if navigator_id is None:
            return None
        task = NavigationTask(
            patient_id=patient_id,
            navigation_need_id=uncovered[0].id,
            assigned_to_user_id=navigator_id,
            created_by_user_id=navigator_id,
            kind=FOLLOW_UP,
            title="Follow up",
            description=DESCRIPTION,
            status=NavigationTaskStatus.OPEN,
        )
        db.add(task)
        db.flush()

    if task is None:
        return None

    next_position = max((item.position for item in items), default=-1) + 1
    for need in uncovered:
        item = NavigationTaskItem(
            task_id=task.id,
            navigation_need_id=need.id,
            label=need.title[:200],
            position=next_position,
        )
        next_position += 1
        db.add(item)
        items.append(item)
    db.flush()

    # 3. Title, due time and completion follow the open items.
    open_items = [item for item in items if item.done_at is None]
    open_item_needs = [
        need
        for need in (db.get(NavigationNeed, item.navigation_need_id) for item in open_items)
        if need is not None
    ]

    if not open_items:
        last_ticker = next(
            (item.done_by_user_id for item in sorted(items, key=lambda i: i.done_at or _now(), reverse=True)),
            None,
        )
        _complete(task, by_user_id=actor_user_id or last_ticker, note=None)
        db.flush()
        return task

    for item, need in zip(open_items, open_item_needs):
        item.label = need.title[:200]

    patient = db.get(PatientProfile, patient_id)
    first_name = patient.first_name if patient else "the patient"
    task.title = (
        f"Call {first_name} back"
        if _callback_requested(db, [item.navigation_need_id for item in items])
        else f"Follow up with {first_name}"
    )
    due_times = [need.due_at for need in open_item_needs if need.due_at is not None]
    task.due_at = min(due_times) if due_times else None
    most_urgent = min(open_item_needs, key=_urgency_key, default=None)
    if most_urgent is not None:
        task.navigation_need_id = most_urgent.id

    db.flush()
    return task


def set_item_done(
    db: Session,
    *,
    task: NavigationTask,
    item: NavigationTaskItem,
    done: bool,
    user_id,
) -> None:
    """Tick or untick one checklist item and its need."""

    from app.services.context_engine import reopen_need, resolve_need

    need = db.get(NavigationNeed, item.navigation_need_id)
    if done:
        item.done_at = _now()
        item.done_by_user_id = user_id
        if need is not None and need.status == NavigationNeedStatus.OPEN:
            resolve_need(db, need, at=item.done_at)
    else:
        item.done_at = None
        item.done_by_user_id = None
        if need is not None and need.status == NavigationNeedStatus.RESOLVED:
            reopen_need(db, need)
    db.flush()


def complete_follow_up(
    db: Session,
    *,
    task: NavigationTask,
    user_id,
    note: str | None,
) -> None:
    """Finish the whole follow-up: every remaining item is resolved."""

    for item in get_items(db, task_id=task.id):
        if item.done_at is None:
            set_item_done(db, task=task, item=item, done=True, user_id=user_id)
    _complete(task, by_user_id=user_id, note=note)
    db.flush()
