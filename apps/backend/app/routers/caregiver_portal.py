from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.models.caregiver import (
    CaregiverPatientAccess,
    CaregiverPermission,
)
from app.models.enums import (
    CaregiverAccessStatus,
    UserRole,
)
from app.models.patient import PatientProfile
from app.models.user import User


router = APIRouter(
    prefix="/caregiver",
    tags=["Caregiver Portal"],
)


@router.get("/patients")
def list_caregiver_patients(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.CAREGIVER
            )
        ),
    ],
):
    accesses = db.scalars(
        select(CaregiverPatientAccess)
        .where(
            CaregiverPatientAccess
            .caregiver_user_id
            == current_user.id,
            CaregiverPatientAccess.status
            == CaregiverAccessStatus.ACTIVE,
        )
    ).all()

    result = []

    for access in accesses:
        patient = db.get(
            PatientProfile,
            access.patient_id,
        )

        if patient is None:
            continue

        permissions = db.scalars(
            select(
                CaregiverPermission.permission
            ).where(
                CaregiverPermission
                .caregiver_access_id
                == access.id
            )
        ).all()

        result.append(
            {
                "patient_id": str(
                    patient.id
                ),
                "first_name": (
                    patient.first_name
                ),
                "last_name": (
                    patient.last_name
                ),
                "relationship": (
                    access.relationship
                ),
                "permissions": [
                    permission.value
                    for permission
                    in permissions
                ],
            }
        )

    return result