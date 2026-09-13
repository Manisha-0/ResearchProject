from typing import Annotated
import uuid

from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.patient_360 import (
    Patient360Response,
)
from app.services.patient_360_service import (
    build_patient_360,
)
from app.services.permissions import (
    get_patient_for_navigator,
)


router = APIRouter(
    prefix="/patients/{patient_id}",
    tags=["Patient 360"],
)


@router.get(
    "/360",
    response_model=Patient360Response,
)
def get_patient_360(
    patient_id: uuid.UUID,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.NAVIGATOR
            )
        ),
    ],
) -> Patient360Response:
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    response = build_patient_360(
        db,
        patient=patient,
    )

    # build_patient_360 can create the initial
    # AttentionSnapshot when one does not exist.
    db.commit()

    return response