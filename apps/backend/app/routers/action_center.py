from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.models.attention_snapshot import (
    AttentionSnapshot,
)
from app.models.enums import (
    AttentionStatus,
    NavigationNeedStatus,
    UserRole,
)
from app.models.navigation_need import (
    NavigationNeed,
)
from app.models.patient import (
    NavigatorPatientAssignment,
    PatientProfile,
)
from app.models.user import User
from app.schemas.navigation_need import (
    ActionCenterPatientResponse,
)
from app.services.context_engine import (
    evaluate_and_snapshot_patient,
)


router = APIRouter(
    prefix="/navigator",
    tags=["Navigator Action Center"],
)


@router.get(
    "/action-center",
    response_model=list[
        ActionCenterPatientResponse
    ],
)
def get_action_center(
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
):
    patients = db.scalars(
        select(PatientProfile)
        .join(
            NavigatorPatientAssignment,
            NavigatorPatientAssignment
            .patient_id
            == PatientProfile.id,
        )
        .where(
            NavigatorPatientAssignment
            .navigator_user_id
            == current_user.id
        )
    ).all()

    result = []

    for patient in patients:
        (
            attention_status,
            explanation,
            needs,
        ) = evaluate_and_snapshot_patient(
            db,
            patient_id=patient.id,
        )

        result.append(
            ActionCenterPatientResponse(
                patient_id=patient.id,
                first_name=patient.first_name,
                last_name=patient.last_name,
                attention_status=(
                    attention_status
                ),
                explanation=explanation,
                open_need_count=len(needs),
            )
        )

    db.commit()

    priority_order = {
        AttentionStatus.NEEDS_ATTENTION: 0,
        AttentionStatus.FOLLOW_UP: 1,
        AttentionStatus.ON_TRACK: 2,
    }

    return sorted(
        result,
        key=lambda item: (
            priority_order[
                item.attention_status
            ],
            item.last_name,
            item.first_name,
        ),
    )