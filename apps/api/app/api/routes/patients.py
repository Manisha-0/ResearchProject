from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud.patient import (
    create_patient,
    delete_patient,
    get_patient,
    get_patients,
    update_patient,
)
from app.db.database import get_db
from app.schemas.patient import (
    PatientCreate,
    PatientResponse,
    PatientUpdate,
)


router = APIRouter(
    prefix="/patients",
    tags=["Patients"],
)


@router.post(
    "",
    response_model=PatientResponse,
    status_code=201,
)
def create_patient_route(
    patient_data: PatientCreate,
    db: Session = Depends(get_db),
):
    return create_patient(db, patient_data)


@router.get(
    "",
    response_model=list[PatientResponse],
)
def list_patients(
    organization_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_patients(
        db,
        organization_id=organization_id,
    )


@router.get(
    "/{patient_id}",
    response_model=PatientResponse,
)
def get_patient_route(
    patient_id: int,
    db: Session = Depends(get_db),
):
    patient = get_patient(db, patient_id)

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    return patient


@router.patch(
    "/{patient_id}",
    response_model=PatientResponse,
)
def update_patient_route(
    patient_id: int,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
):
    patient = get_patient(db, patient_id)

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    return update_patient(
        db,
        patient,
        patient_data,
    )


@router.delete(
    "/{patient_id}",
    status_code=204,
)
def delete_patient_route(
    patient_id: int,
    db: Session = Depends(get_db),
):
    patient = get_patient(db, patient_id)

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    delete_patient(db, patient)

    return None