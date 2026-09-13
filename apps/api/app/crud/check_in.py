from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.check_in import CheckIn
from app.schemas.check_in import CheckInCreate, CheckInUpdate


def create_check_in(
    db: Session,
    data: CheckInCreate,
) -> CheckIn:

    check_in = CheckIn(**data.model_dump())

    db.add(check_in)
    db.commit()
    db.refresh(check_in)

    return check_in


def get_check_in(
    db: Session,
    check_in_id: int,
) -> CheckIn | None:

    return db.get(CheckIn, check_in_id)


def get_check_ins(
    db: Session,
    patient_id: int | None = None,
    navigator_id: int | None = None,
) -> list[CheckIn]:

    query = select(CheckIn).order_by(
        CheckIn.checked_in_at.desc()
    )

    if patient_id is not None:
        query = query.where(
            CheckIn.patient_id == patient_id
        )

    if navigator_id is not None:
        query = query.where(
            CheckIn.navigator_id == navigator_id
        )

    return list(db.scalars(query).all())


def update_check_in(
    db: Session,
    check_in: CheckIn,
    data: CheckInUpdate,
) -> CheckIn:

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(check_in, field, value)

    db.commit()
    db.refresh(check_in)

    return check_in


def delete_check_in(
    db: Session,
    check_in: CheckIn,
) -> None:

    db.delete(check_in)
    db.commit()