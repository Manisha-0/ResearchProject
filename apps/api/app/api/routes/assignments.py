from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud.assignment import (
    create_assignment,
    delete_assignment,
    get_assignment,
    get_assignments,
    update_assignment,
)
from app.db.database import get_db
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentResponse,
    AssignmentUpdate,
)


router = APIRouter(
    prefix="/assignments",
    tags=["Assignments"],
)


@router.post("", response_model=AssignmentResponse, status_code=201)
def create_assignment_route(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
):
    return create_assignment(db, data)


@router.get("", response_model=list[AssignmentResponse])
def list_assignments(
    patient_id: int | None = Query(default=None),
    navigator_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_assignments(
        db,
        patient_id=patient_id,
        navigator_id=navigator_id,
    )


@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment_route(
    assignment_id: int,
    db: Session = Depends(get_db),
):
    assignment = get_assignment(db, assignment_id)

    if assignment is None:
        raise HTTPException(404, "Assignment not found")

    return assignment


@router.patch("/{assignment_id}", response_model=AssignmentResponse)
def update_assignment_route(
    assignment_id: int,
    data: AssignmentUpdate,
    db: Session = Depends(get_db),
):
    assignment = get_assignment(db, assignment_id)

    if assignment is None:
        raise HTTPException(404, "Assignment not found")

    return update_assignment(db, assignment, data)


@router.delete("/{assignment_id}", status_code=204)
def delete_assignment_route(
    assignment_id: int,
    db: Session = Depends(get_db),
):
    assignment = get_assignment(db, assignment_id)

    if assignment is None:
        raise HTTPException(404, "Assignment not found")

    delete_assignment(db, assignment)