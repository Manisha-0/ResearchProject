from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.patient import PatientProfile
from app.schemas.patient import PatientCreate, PatientUpdate


def create_patient(
    db: Session,
    patient_data: PatientCreate,
) -> PatientProfile:

    patient = PatientProfile(
        organization_id=patient_data.organization_id,
        user_id=patient_data.user_id,
        first_name=patient_data.first_name,
        last_name=patient_data.last_name,
        date_of_birth=patient_data.date_of_birth,
        medical_record_number=patient_data.medical_record_number,
    )

    db.add(patient)
    db.commit()
    db.refresh(patient)

    return patient


def get_patient(
    db: Session,
    patient_id: int,
) -> PatientProfile | None:

    return db.get(PatientProfile, patient_id)


def get_patients(
    db: Session,
    organization_id: int | None = None,
) -> list[PatientProfile]:

    query = select(PatientProfile).order_by(PatientProfile.id)

    if organization_id is not None:
        query = query.where(
            PatientProfile.organization_id == organization_id
        )

    return list(db.scalars(query).all())


def update_patient(
    db: Session,
    patient: PatientProfile,
    patient_data: PatientUpdate,
) -> PatientProfile:

    update_data = patient_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)

    return patient


def delete_patient(
    db: Session,
    patient: PatientProfile,
) -> None:

    db.delete(patient)
    db.commit()