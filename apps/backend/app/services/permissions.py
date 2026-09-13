import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.patient import (
    NavigatorPatientAssignment,
    PatientProfile,
)
from app.models.user import User


def get_patient_for_navigator(
    db: Session,
    *,
    patient_id: uuid.UUID,
    navigator: User,
) -> PatientProfile:
    patient = db.scalar(
        select(PatientProfile)
        .join(
            NavigatorPatientAssignment,
            NavigatorPatientAssignment.patient_id
            == PatientProfile.id,
        )
        .where(
            PatientProfile.id == patient_id,
            NavigatorPatientAssignment.navigator_user_id
            == navigator.id,
        )
    )

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    patient_user = db.get(
        User,
        patient.user_id,
    )

    if (
        patient_user is None
        or patient_user.organization_id
        != navigator.organization_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    return patient