from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud.appointment import (
    create_appointment,
    delete_appointment,
    get_appointment,
    get_appointments,
    update_appointment,
)
from app.db.database import get_db
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
)


router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"],
)


@router.post("", response_model=AppointmentResponse, status_code=201)
def create_appointment_route(
    data: AppointmentCreate,
    db: Session = Depends(get_db),
):
    return create_appointment(db, data)


@router.get("", response_model=list[AppointmentResponse])
def list_appointments(
    patient_id: int | None = Query(default=None),
    navigator_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_appointments(
        db,
        patient_id=patient_id,
        navigator_id=navigator_id,
    )


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment_route(
    appointment_id: int,
    db: Session = Depends(get_db),
):
    appointment = get_appointment(db, appointment_id)

    if appointment is None:
        raise HTTPException(404, "Appointment not found")

    return appointment


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment_route(
    appointment_id: int,
    data: AppointmentUpdate,
    db: Session = Depends(get_db),
):
    appointment = get_appointment(db, appointment_id)

    if appointment is None:
        raise HTTPException(404, "Appointment not found")

    return update_appointment(db, appointment, data)


@router.delete("/{appointment_id}", status_code=204)
def delete_appointment_route(
    appointment_id: int,
    db: Session = Depends(get_db),
):
    appointment = get_appointment(db, appointment_id)

    if appointment is None:
        raise HTTPException(404, "Appointment not found")

    delete_appointment(db, appointment)