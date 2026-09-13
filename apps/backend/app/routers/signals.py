from typing import Annotated
import uuid

from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.models.enums import (
    NavigationSignalStatus,
    UserRole,
)
from app.models.navigation_signal import (
    NavigationSignal,
)
from app.models.user import User
from app.schemas.navigation_signal import (
    NavigationSignalResponse,
)
from app.services.permissions import (
    get_patient_for_navigator,
)
from app.services.signal_service import (
    generate_signals_from_appointments,
)

from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.schemas.navigation_signal import (
    NavigationSignalResponse,
    NavigationSignalStatusUpdateRequest,
)
from app.services.audit_service import (
    write_audit_log,
)

router = APIRouter(
    prefix="/patients/{patient_id}/signals",
    tags=["Navigation Signals"],
)


@router.get(
    "",
    response_model=list[
        NavigationSignalResponse
    ],
)
def list_patient_signals(
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
) -> list[NavigationSignalResponse]:
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    signals = db.scalars(
        select(NavigationSignal)
        .where(
            NavigationSignal.patient_id
            == patient.id
        )
        .order_by(
            NavigationSignal.observed_at.desc()
        )
    ).all()

    return [
        NavigationSignalResponse(
            id=signal.id,
            patient_id=signal.patient_id,
            category=signal.category,
            signal_type=signal.signal_type,
            status=signal.status,
            title=signal.title,
            description=signal.description,
            source_type=signal.source_type,
            source_reference=(
                signal.source_reference
            ),
            observed_at=signal.observed_at,
            resolved_at=signal.resolved_at,
        )
        for signal in signals
    ]

@router.post(
    "/refresh",
    response_model=list[
        NavigationSignalResponse
    ],
)
def refresh_patient_signals(
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

    generate_signals_from_appointments(
        db,
        patient_id=patient.id,
    )

    db.commit()

    signals = db.scalars(
        select(NavigationSignal)
        .where(
            NavigationSignal.patient_id
            == patient.id
        )
        .order_by(
            NavigationSignal.observed_at.desc()
        )
    ).all()

    return [
        NavigationSignalResponse(
            id=signal.id,
            patient_id=signal.patient_id,
            category=signal.category,
            signal_type=signal.signal_type,
            status=signal.status,
            title=signal.title,
            description=signal.description,
            source_type=signal.source_type,
            source_reference=(
                signal.source_reference
            ),
            observed_at=signal.observed_at,
            resolved_at=signal.resolved_at,
        )
        for signal in signals
    ]

@router.patch(
    "/{signal_id}",
    response_model=NavigationSignalResponse,
)
def update_signal_status(
    patient_id: uuid.UUID,
    signal_id: uuid.UUID,
    payload: NavigationSignalStatusUpdateRequest,
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

    signal = db.get(
        NavigationSignal,
        signal_id,
    )

    if (
        signal is None
        or signal.patient_id != patient.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signal not found.",
        )

    signal.status = payload.status

    if payload.status in {
        NavigationSignalStatus.RESOLVED,
        NavigationSignalStatus.DISMISSED,
    }:
        signal.resolved_at = datetime.now(
            timezone.utc
        )
    else:
        signal.resolved_at = None

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action="NAVIGATION_SIGNAL_UPDATED",
        resource_type="navigation_signal",
        resource_id=str(signal.id),
        metadata_json={
            "status": signal.status.value,
        },
    )

    db.commit()
    db.refresh(signal)

    return NavigationSignalResponse(
        id=signal.id,
        patient_id=signal.patient_id,
        category=signal.category,
        signal_type=signal.signal_type,
        status=signal.status,
        title=signal.title,
        description=signal.description,
        source_type=signal.source_type,
        source_reference=(
            signal.source_reference
        ),
        observed_at=signal.observed_at,
        resolved_at=signal.resolved_at,
    )