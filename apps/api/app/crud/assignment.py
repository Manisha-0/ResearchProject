from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate


def create_assignment(
    db: Session,
    data: AssignmentCreate,
) -> Assignment:

    # End any currently active assignment for this patient.
    active_assignment = db.scalar(
        select(Assignment).where(
            Assignment.patient_id == data.patient_id,
            Assignment.status == "active",
        )
    )

    if active_assignment:
        active_assignment.status = "ended"
        active_assignment.ended_at = datetime.now(timezone.utc)

    assignment = Assignment(
        **data.model_dump(),
        status="active",
    )

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment


def get_assignment(
    db: Session,
    assignment_id: int,
) -> Assignment | None:

    return db.get(Assignment, assignment_id)


def get_assignments(
    db: Session,
    patient_id: int | None = None,
    navigator_id: int | None = None,
) -> list[Assignment]:

    query = select(Assignment).order_by(
        Assignment.assigned_at.desc()
    )

    if patient_id is not None:
        query = query.where(
            Assignment.patient_id == patient_id
        )

    if navigator_id is not None:
        query = query.where(
            Assignment.navigator_id == navigator_id
        )

    return list(db.scalars(query).all())


def update_assignment(
    db: Session,
    assignment: Assignment,
    data: AssignmentUpdate,
) -> Assignment:

    values = data.model_dump(exclude_unset=True)

    if values.get("status") == "ended":
        values["ended_at"] = (
            values.get("ended_at")
            or datetime.now(timezone.utc)
        )

    for field, value in values.items():
        setattr(assignment, field, value)

    db.commit()
    db.refresh(assignment)

    return assignment


def delete_assignment(
    db: Session,
    assignment: Assignment,
) -> None:

    db.delete(assignment)
    db.commit()