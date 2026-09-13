from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def create_user(
    db: Session,
    user_data: UserCreate,
) -> User:
    user = User(
        organization_id=user_data.organization_id,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def get_user(
    db: Session,
    user_id: int,
) -> User | None:
    return db.get(User, user_id)


def get_users(
    db: Session,
    organization_id: int | None = None,
) -> list[User]:
    query = select(User).order_by(User.id)

    if organization_id is not None:
        query = query.where(
            User.organization_id == organization_id
        )

    return list(db.scalars(query).all())


def update_user(
    db: Session,
    user: User,
    user_data: UserUpdate,
) -> User:
    update_data = user_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return user


def delete_user(
    db: Session,
    user: User,
) -> None:
    db.delete(user)
    db.commit()