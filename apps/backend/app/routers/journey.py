from typing import Annotated
import uuid

from fastapi import (
    APIRouter,
    Depends,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.models.enums import (
    JourneyItemStatus,
    UserRole,
)
from app.models.journey import CareJourneyItem
from app.models.user import User
from app.schemas.journey import (
    JourneyItemCreateRequest,
    JourneyItemResponse,
)
from app.services.audit_service import write_audit_log
from app.services.permissions import (
    get_patient_for_navigator,
)
from sqlalchemy.orm import selectinload

from app.models.appointment import Appointment
from app.schemas.journey import (
    AppointmentResponse,
    JourneyTimelineItemResponse,
)

router = APIRouter(
    prefix="/patients/{patient_id}/journey",
    tags=["Care Journey"],
)


@router.post(
    "",
    response_model=JourneyItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_journey_item(
    patient_id: uuid.UUID,
    payload: JourneyItemCreateRequest,
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
) -> JourneyItemResponse:
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    item = CareJourneyItem(
        patient_id=patient.id,
        created_by_user_id=current_user.id,
        item_type=payload.item_type,
        status=JourneyItemStatus.UPCOMING,
        title=payload.title.strip(),
        description=(
            payload.description.strip()
            if payload.description
            else None
        ),
        scheduled_at=payload.scheduled_at,
        patient_visible=payload.patient_visible,
        source_type="navigator",
    )

    db.add(item)
    db.flush()

    write_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action="CARE_JOURNEY_ITEM_CREATED",
        resource_type="care_journey_item",
        resource_id=str(item.id),
        metadata_json={
            "item_type": item.item_type.value,
        },
    )

    db.commit()
    db.refresh(item)

    return JourneyItemResponse(
        id=item.id,
        patient_id=item.patient_id,
        item_type=item.item_type,
        status=item.status,
        title=item.title,
        description=item.description,
        scheduled_at=item.scheduled_at,
        completed_at=item.completed_at,
        patient_visible=item.patient_visible,
        source_type=item.source_type,
    )

@router.get(
    "",
    response_model=list[
        JourneyTimelineItemResponse
    ],
)
def get_patient_journey(
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
) -> list[JourneyTimelineItemResponse]:
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    items = db.scalars(
        select(CareJourneyItem)
        .options(
            selectinload(
                CareJourneyItem.appointment
            )
        )
        .where(
            CareJourneyItem.patient_id
            == patient.id
        )
        .order_by(
            CareJourneyItem.scheduled_at.asc()
            .nulls_last(),
            CareJourneyItem.created_at.asc(),
        )
    ).all()

    result = []

    for item in items:
        appointment_response = None

        if item.appointment is not None:
            appointment = item.appointment

            appointment_response = (
                AppointmentResponse(
                    id=appointment.id,
                    patient_id=appointment.patient_id,
                    journey_item_id=(
                        appointment.journey_item_id
                    ),
                    title=item.title,
                    scheduled_start=(
                        appointment.scheduled_start
                    ),
                    scheduled_end=(
                        appointment.scheduled_end
                    ),
                    status=appointment.status,
                    appointment_type=(
                        appointment.appointment_type
                    ),
                    provider_name=(
                        appointment.provider_name
                    ),
                    department=appointment.department,
                    location_name=(
                        appointment.location_name
                    ),
                    address_text=(
                        appointment.address_text
                    ),
                    notes=appointment.notes,
                )
            )

        result.append(
            JourneyTimelineItemResponse(
                id=item.id,
                item_type=item.item_type,
                status=item.status,
                title=item.title,
                description=item.description,
                scheduled_at=item.scheduled_at,
                completed_at=item.completed_at,
                patient_visible=item.patient_visible,
                appointment=appointment_response,
            )
        )

    return result