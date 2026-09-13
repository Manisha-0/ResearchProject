from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud.caregiver import (
    create_caregiver,
    delete_caregiver,
    get_caregiver,
    get_caregivers,
    update_caregiver,
)
from app.db.database import get_db
from app.schemas.caregiver import (
    CaregiverCreate,
    CaregiverResponse,
    CaregiverUpdate,
)


router = APIRouter(
    prefix="/caregivers",
    tags=["Caregivers"],
)


@router.post("", response_model=CaregiverResponse, status_code=201)
def create_caregiver_route(
    data: CaregiverCreate,
    db: Session = Depends(get_db),
):
    return create_caregiver(db, data)


@router.get("", response_model=list[CaregiverResponse])
def list_caregivers(
    organization_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_caregivers(db, organization_id)


@router.get("/{caregiver_id}", response_model=CaregiverResponse)
def get_caregiver_route(
    caregiver_id: int,
    db: Session = Depends(get_db),
):
    caregiver = get_caregiver(db, caregiver_id)

    if caregiver is None:
        raise HTTPException(404, "Caregiver not found")

    return caregiver


@router.patch("/{caregiver_id}", response_model=CaregiverResponse)
def update_caregiver_route(
    caregiver_id: int,
    data: CaregiverUpdate,
    db: Session = Depends(get_db),
):
    caregiver = get_caregiver(db, caregiver_id)

    if caregiver is None:
        raise HTTPException(404, "Caregiver not found")

    return update_caregiver(db, caregiver, data)


@router.delete("/{caregiver_id}", status_code=204)
def delete_caregiver_route(
    caregiver_id: int,
    db: Session = Depends(get_db),
):
    caregiver = get_caregiver(db, caregiver_id)

    if caregiver is None:
        raise HTTPException(404, "Caregiver not found")

    delete_caregiver(db, caregiver)