from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.care_journey import CareJourneyItem
from app.schemas.care_journey import (
    CareJourneyCreate,
    CareJourneyUpdate,
)


def create_care_journey_item(
    db: Session,
    data: CareJourneyCreate,
) -> CareJourneyItem:

    item = CareJourneyItem(**data.model_dump())

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


def get_care_journey_item(
    db: Session,
    item_id: int,
) -> CareJourneyItem | None:

    return db.get(CareJourneyItem, item_id)


def get_care_journey_items(
    db: Session,
    patient_id: int | None = None,
) -> list[CareJourneyItem]:

    query = select(CareJourneyItem).order_by(
        CareJourneyItem.occurred_at.desc()
    )

    if patient_id is not None:
        query = query.where(
            CareJourneyItem.patient_id == patient_id
        )

    return list(db.scalars(query).all())


def update_care_journey_item(
    db: Session,
    item: CareJourneyItem,
    data: CareJourneyUpdate,
) -> CareJourneyItem:

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item


def delete_care_journey_item(
    db: Session,
    item: CareJourneyItem,
) -> None:

    db.delete(item)
    db.commit()