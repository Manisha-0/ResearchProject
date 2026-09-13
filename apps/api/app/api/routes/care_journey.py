from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud.care_journey import (
    create_care_journey_item,
    delete_care_journey_item,
    get_care_journey_item,
    get_care_journey_items,
    update_care_journey_item,
)
from app.db.database import get_db
from app.schemas.care_journey import (
    CareJourneyCreate,
    CareJourneyResponse,
    CareJourneyUpdate,
)


router = APIRouter(
    prefix="/care-journey",
    tags=["Care Journey"],
)


@router.post("", response_model=CareJourneyResponse, status_code=201)
def create_item(
    data: CareJourneyCreate,
    db: Session = Depends(get_db),
):
    return create_care_journey_item(db, data)


@router.get("", response_model=list[CareJourneyResponse])
def list_items(
    patient_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_care_journey_items(db, patient_id)


@router.get("/{item_id}", response_model=CareJourneyResponse)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = get_care_journey_item(db, item_id)

    if item is None:
        raise HTTPException(404, "Care journey item not found")

    return item


@router.patch("/{item_id}", response_model=CareJourneyResponse)
def update_item(
    item_id: int,
    data: CareJourneyUpdate,
    db: Session = Depends(get_db),
):
    item = get_care_journey_item(db, item_id)

    if item is None:
        raise HTTPException(404, "Care journey item not found")

    return update_care_journey_item(db, item, data)


@router.delete("/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = get_care_journey_item(db, item_id)

    if item is None:
        raise HTTPException(404, "Care journey item not found")

    delete_care_journey_item(db, item)