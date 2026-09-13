from typing import Annotated
import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.models.appointment import Appointment
from app.models.enums import (
    AppointmentStatus,
    JourneyItemStatus,
    JourneyItemType,
    UserRole,
)
from app.models.journey import CareJourneyItem
from app.models.user import User
from app.schemas.journey import (
    AppointmentCreateRequest,
    AppointmentResponse,
)
from app.services.audit_service import write_audit_log
from app.services.permissions import (
    get_patient_for_navigator,
)
from datetime import datetime, timezone

from app.schemas.journey import (
    AppointmentCreateRequest,
    AppointmentResponse,
    AppointmentStatusUpdateRequest,
)

router = APIRouter(
    prefix="/patients/{patient_id}/appointments",
    tags=["Appointments"],
)


@router.post(
    "",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment(
    patient_id: uuid.UUID,
    payload: AppointmentCreateRequest,
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
) -> AppointmentResponse:
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    if (
        payload.scheduled_end is not None
        and payload.scheduled_end
        <= payload.scheduled_start
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Appointment end time must be "
                "after the start time."
            ),
        )

    journey_item = CareJourneyItem(
        patient_id=patient.id,
        created_by_user_id=current_user.id,
        item_type=JourneyItemType.APPOINTMENT,
        status=JourneyItemStatus.UPCOMING,
        title=payload.title.strip(),
        description=payload.notes,
        scheduled_at=payload.scheduled_start,
        patient_visible=payload.patient_visible,
        source_type="navigator",
    )

    db.add(journey_item)
    db.flush()

    appointment = Appointment(
        patient_id=patient.id,
        journey_item_id=journey_item.id,
        created_by_user_id=current_user.id,
        scheduled_start=payload.scheduled_start,
        scheduled_end=payload.scheduled_end,
        status=AppointmentStatus.SCHEDULED,
        appointment_type=payload.appointment_type,
        provider_name=payload.provider_name,
        department=payload.department,
        location_name=payload.location_name,
        address_text=payload.address_text,
        notes=payload.notes,
    )

    db.add(appointment)
    db.flush()

    write_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action="APPOINTMENT_CREATED",
        resource_type="appointment",
        resource_id=str(appointment.id),
        metadata_json={
            "journey_item_id": str(
                journey_item.id
            ),
        },
    )

    db.commit()
    db.refresh(appointment)

    return AppointmentResponse(
        id=appointment.id,
        patient_id=appointment.patient_id,
        journey_item_id=appointment.journey_item_id,
        title=journey_item.title,
        scheduled_start=appointment.scheduled_start,
        scheduled_end=appointment.scheduled_end,
        status=appointment.status,
        appointment_type=appointment.appointment_type,
        provider_name=appointment.provider_name,
        department=appointment.department,
        location_name=appointment.location_name,
        address_text=appointment.address_text,
        notes=appointment.notes,
    )

@router.patch(
    "/{appointment_id}/status",
    response_model=AppointmentResponse,
)
def update_appointment_status(
    patient_id: uuid.UUID,
    appointment_id: uuid.UUID,
    payload: AppointmentStatusUpdateRequest,
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
) -> AppointmentResponse:
    patient = get_patient_for_navigator(
        db,
        patient_id=patient_id,
        navigator=current_user,
    )

    appointment = db.get(
        Appointment,
        appointment_id,
    )

    if (
        appointment is None
        or appointment.patient_id
        != patient.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found.",
        )

    appointment.status = payload.status

    journey_item = db.get(
        CareJourneyItem,
        appointment.journey_item_id,
    )

    if journey_item is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Appointment journey item "
                "is missing."
            ),
        )

    if (
        payload.status
        == AppointmentStatus.COMPLETED
    ):
        journey_item.status = (
            JourneyItemStatus.COMPLETED
        )
        journey_item.completed_at = (
            datetime.now(timezone.utc)
        )

    elif (
        payload.status
        == AppointmentStatus.CANCELLED
    ):
        journey_item.status = (
            JourneyItemStatus.CANCELLED
        )

    elif (
        payload.status
        == AppointmentStatus.MISSED
    ):
        # Keep this as a completed historical event.
        journey_item.status = (
            JourneyItemStatus.COMPLETED
        )
        journey_item.completed_at = (
            datetime.now(timezone.utc)
        )

    else:
        journey_item.status = (
            JourneyItemStatus.UPCOMING
        )
        journey_item.completed_at = None

    write_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        patient_id=patient.id,
        action="APPOINTMENT_STATUS_UPDATED",
        resource_type="appointment",
        resource_id=str(appointment.id),
        metadata_json={
            "status": appointment.status.value,
        },
    )

    db.commit()
    db.refresh(appointment)

    return AppointmentResponse(
        id=appointment.id,
        patient_id=appointment.patient_id,
        journey_item_id=appointment.journey_item_id,
        title=journey_item.title,
        scheduled_start=appointment.scheduled_start,
        scheduled_end=appointment.scheduled_end,
        status=appointment.status,
        appointment_type=appointment.appointment_type,
        provider_name=appointment.provider_name,
        department=appointment.department,
        location_name=appointment.location_name,
        address_text=appointment.address_text,
        notes=appointment.notes,
    )