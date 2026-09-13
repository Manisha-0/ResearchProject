from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy import select
from sqlalchemy.orm import (
    Session,
    selectinload,
)

from app.core.auth import require_roles
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.journey import CareJourneyItem
from app.models.patient import PatientProfile
from app.models.user import User
from app.schemas.journey import (
    AppointmentResponse,
    JourneyTimelineItemResponse,
)


router = APIRouter(
    prefix="/me/journey",
    tags=["Patient Journey"],
)


@router.get(
    "",
    response_model=list[
        JourneyTimelineItemResponse
    ],
)
def get_my_journey(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.PATIENT
            )
        ),
    ],
):
    patient = db.scalar(
        select(PatientProfile).where(
            PatientProfile.user_id
            == current_user.id
        )
    )

    if patient is None:
        return []

    items = db.scalars(
        select(CareJourneyItem)
        .options(
            selectinload(
                CareJourneyItem.appointment
            )
        )
        .where(
            CareJourneyItem.patient_id
            == patient.id,
            CareJourneyItem.patient_visible
            .is_(True),
        )
        .order_by(
            CareJourneyItem.scheduled_at.asc()
            .nulls_last(),
        )
    ).all()

    result = []

    for item in items:
        appointment_response = None

        if item.appointment is not None:
            appointment = item.appointment

            appointment_response = AppointmentResponse(
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