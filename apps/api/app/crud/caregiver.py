from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.caregiver import CaregiverProfile
from app.schemas.caregiver import CaregiverCreate, CaregiverUpdate


def create_caregiver(
    db: Session,
    data: CaregiverCreate,
) -> CaregiverProfile:

    caregiver = CaregiverProfile(**data.model_dump())

    db.add(caregiver)
    db.commit()
    db.refresh(caregiver)

    return caregiver


def get_caregiver(
    db: Session,
    caregiver_id: int,
) -> CaregiverProfile | None:

    return db.get(CaregiverProfile, caregiver_id)


def get_caregivers(
    db: Session,
    organization_id: int | None = None,
) -> list[CaregiverProfile]:

    query = select(CaregiverProfile).order_by(CaregiverProfile.id)

    if organization_id is not None:
        query = query.where(
            CaregiverProfile.organization_id == organization_id
        )

    return list(db.scalars(query).all())


def update_caregiver(
    db: Session,
    caregiver: CaregiverProfile,
    data: CaregiverUpdate,
) -> CaregiverProfile:

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(caregiver, field, value)

    db.commit()
    db.refresh(caregiver)

    return caregiver


def delete_caregiver(
    db: Session,
    caregiver: CaregiverProfile,
) -> None:

    db.delete(caregiver)
    db.commit()