from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.navigator import NavigatorProfile
from app.schemas.navigator import NavigatorCreate, NavigatorUpdate


def create_navigator(
    db: Session,
    data: NavigatorCreate,
) -> NavigatorProfile:

    navigator = NavigatorProfile(**data.model_dump())

    db.add(navigator)
    db.commit()
    db.refresh(navigator)

    return navigator


def get_navigator(
    db: Session,
    navigator_id: int,
) -> NavigatorProfile | None:

    return db.get(NavigatorProfile, navigator_id)


def get_navigators(
    db: Session,
    organization_id: int | None = None,
) -> list[NavigatorProfile]:

    query = select(NavigatorProfile).order_by(NavigatorProfile.id)

    if organization_id is not None:
        query = query.where(
            NavigatorProfile.organization_id == organization_id
        )

    return list(db.scalars(query).all())


def update_navigator(
    db: Session,
    navigator: NavigatorProfile,
    data: NavigatorUpdate,
) -> NavigatorProfile:

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(navigator, field, value)

    db.commit()
    db.refresh(navigator)

    return navigator


def delete_navigator(
    db: Session,
    navigator: NavigatorProfile,
) -> None:

    db.delete(navigator)
    db.commit()