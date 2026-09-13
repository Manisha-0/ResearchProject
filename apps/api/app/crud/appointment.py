from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
)


def create_appointment(
    db: Session,
    data: AppointmentCreate,
) -> Appointment:

    appointment = Appointment(**data.model_dump())

    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return appointment


def get_appointment(
    db: Session,
    appointment_id: int,
) -> Appointment | None:

    return db.get(Appointment, appointment_id)


def get_appointments(
    db: Session,
    patient_id: int | None = None,
    navigator_id: int | None = None,
) -> list[Appointment]:

    query = select(Appointment).order_by(
        Appointment.scheduled_at
    )

    if patient_id is not None:
        query = query.where(
            Appointment.patient_id == patient_id
        )

    if navigator_id is not None:
        query = query.where(
            Appointment.navigator_id == navigator_id
        )

    return list(db.scalars(query).all())


def update_appointment(
    db: Session,
    appointment: Appointment,
    data: AppointmentUpdate,
) -> Appointment:

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(appointment, field, value)

    db.commit()
    db.refresh(appointment)

    return appointment


def delete_appointment(
    db: Session,
    appointment: Appointment,
) -> None:

    db.delete(appointment)
    db.commit()