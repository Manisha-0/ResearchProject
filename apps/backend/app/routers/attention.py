from typing import Annotated
import uuid
from fastapi import (
    APIRouter,
    Depends,
    HTTPException, status
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.navigation_need import (
    NavigationNeed,
)
from app.models.navigation_need_signal import (
    NavigationNeedSignal,
)
from app.models.navigation_signal import (
    NavigationSignal,
)
from app.models.user import User
from app.schemas.navigation_need import (
    AttentionSummaryResponse,
    NavigationNeedResponse,
)
from app.schemas.navigation_signal import (
    NavigationSignalResponse,
)
from app.services.context_engine import (
    evaluate_and_snapshot_patient,
    resolve_need,
)
from app.services.permissions import (
    get_patient_for_navigator,
)
from app.models.attention_snapshot import (
    AttentionSnapshot,
)
from app.models.enums import (
    NavigationNeedStatus,
)

from app.models.enums import NavigationNeedStatus
from app.services.audit_service import (
    write_audit_log,
)

router = APIRouter(
    prefix="/patients/{patient_id}/attention",
    tags=["Attention"],
)

@router.post(
    "/refresh",
    response_model=AttentionSummaryResponse,
)
def refresh_attention(
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
):
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    (
        attention_status,
        explanation,
        needs,
    ) = evaluate_and_snapshot_patient(
        db,
        patient_id=patient.id,
    )

    db.commit()

    return build_attention_response(
        db,
        patient_id=patient.id,
        attention_status=attention_status,
        explanation=explanation,
        needs=needs,
    )

def build_attention_response(
    db: Session,
    *,
    patient_id,
    attention_status,
    explanation,
    needs,
) -> AttentionSummaryResponse:
    need_responses = []

    for need in needs:
        signal_ids = db.scalars(
            select(
                NavigationNeedSignal
                .navigation_signal_id
            ).where(
                NavigationNeedSignal
                .navigation_need_id
                == need.id
            )
        ).all()

        signals = []

        for signal_id in signal_ids:
            signal = db.get(
                NavigationSignal,
                signal_id,
            )

            if signal is None:
                continue

            signals.append(
                NavigationSignalResponse(
                    id=signal.id,
                    patient_id=signal.patient_id,
                    category=signal.category,
                    signal_type=signal.signal_type,
                    status=signal.status,
                    title=signal.title,
                    description=(
                        signal.description
                    ),
                    source_type=(
                        signal.source_type
                    ),
                    source_reference=(
                        signal.source_reference
                    ),
                    observed_at=(
                        signal.observed_at
                    ),
                    resolved_at=(
                        signal.resolved_at
                    ),
                )
            )

        need_responses.append(
            NavigationNeedResponse(
                id=need.id,
                patient_id=need.patient_id,
                need_type=need.need_type,
                title=need.title,
                explanation=need.explanation,
                recommended_action=(
                    need.recommended_action
                ),
                attention_status=(
                    need.attention_status
                ),
                status=need.status,
                due_at=need.due_at,
                resolved_at=need.resolved_at,
                signals=signals,
            )
        )

    return AttentionSummaryResponse(
        patient_id=patient_id,
        status=attention_status,
        explanation=explanation,
        open_need_count=len(needs),
        needs=need_responses,
    )

@router.get(
    "",
    response_model=AttentionSummaryResponse,
)
def get_attention(
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
):
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    latest_snapshot = db.scalar(
        select(AttentionSnapshot)
        .where(
            AttentionSnapshot.patient_id
            == patient.id
        )
        .order_by(
            AttentionSnapshot.created_at.desc()
        )
        .limit(1)
    )

    if latest_snapshot is None:
        (
            attention_status,
            explanation,
            needs,
        ) = evaluate_and_snapshot_patient(
            db,
            patient_id=patient.id,
        )

        db.commit()

    else:
        attention_status = (
            latest_snapshot.status
        )
        explanation = (
            latest_snapshot.explanation
        )

        needs = list(
            db.scalars(
                select(NavigationNeed).where(
                    NavigationNeed.patient_id
                    == patient.id,
                    NavigationNeed.status
                    == NavigationNeedStatus.OPEN,
                )
            ).all()
        )

    return build_attention_response(
        db,
        patient_id=patient.id,
        attention_status=attention_status,
        explanation=explanation,
        needs=needs,
    )

@router.patch(
    "/needs/{need_id}/resolve",
)
def resolve_navigation_need(
    patient_id: uuid.UUID,
    need_id: uuid.UUID,
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
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    need = db.get(
        NavigationNeed,
        need_id,
    )

    if (
        need is None
        or need.patient_id != patient.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Navigation need not found.",
        )

    resolve_need(db, need)
    evaluate_and_snapshot_patient(
        db,
        patient_id=patient.id,
    )

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action="NAVIGATION_NEED_RESOLVED",
        resource_type="navigation_need",
        resource_id=str(need.id),
        metadata_json={
            "need_type": need.need_type,
        },
    )

    db.commit()

    return {
        "message": (
            "Navigation need resolved."
        )
    }