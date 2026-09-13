from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud.check_in import (
    create_check_in,
    delete_check_in,
    get_check_in,
    get_check_ins,
    update_check_in,
)
from app.db.database import get_db
from app.schemas.check_in import (
    CheckInCreate,
    CheckInResponse,
    CheckInUpdate,
)


router = APIRouter(
    prefix="/check-ins",
    tags=["Check-ins"],
)


@router.post("", response_model=CheckInResponse, status_code=201)
def create_check_in_route(
    data: CheckInCreate,
    db: Session = Depends(get_db),
):
    return create_check_in(db, data)


@router.get("", response_model=list[CheckInResponse])
def list_check_ins(
    patient_id: int | None = Query(default=None),
    navigator_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_check_ins(
        db,
        patient_id=patient_id,
        navigator_id=navigator_id,
    )


@router.get("/{check_in_id}", response_model=CheckInResponse)
def get_check_in_route(
    check_in_id: int,
    db: Session = Depends(get_db),
):
    check_in = get_check_in(db, check_in_id)

    if check_in is None:
        raise HTTPException(404, "Check-in not found")

    return check_in


@router.patch("/{check_in_id}", response_model=CheckInResponse)
def update_check_in_route(
    check_in_id: int,
    data: CheckInUpdate,
    db: Session = Depends(get_db),
):
    check_in = get_check_in(db, check_in_id)

    if check_in is None:
        raise HTTPException(404, "Check-in not found")

    return update_check_in(db, check_in, data)


@router.delete("/{check_in_id}", status_code=204)
def delete_check_in_route(
    check_in_id: int,
    db: Session = Depends(get_db),
):
    check_in = get_check_in(db, check_in_id)

    if check_in is None:
        raise HTTPException(404, "Check-in not found")

    delete_check_in(db, check_in)