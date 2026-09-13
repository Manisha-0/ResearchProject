import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.core.database import Base
from app.models.base import (
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)
from app.models.enums import AppointmentStatus


def enum_values(enum_class):
    return [item.value for item in enum_class]


class Appointment(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "appointments"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "patient_profiles.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    journey_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "care_journey_items.id",
            ondelete="CASCADE",
        ),
        unique=True,
        nullable=False,
    )

    created_by_user_id: Mapped[
        uuid.UUID | None
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    scheduled_start: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        index=True,
        nullable=False,
    )

    scheduled_end: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    status: Mapped[AppointmentStatus] = mapped_column(
        SQLEnum(
            AppointmentStatus,
            name="appointment_status",
            values_callable=enum_values,
        ),
        default=AppointmentStatus.SCHEDULED,
        nullable=False,
    )

    appointment_type: Mapped[
        str | None
    ] = mapped_column(
        String(150),
        nullable=True,
    )

    provider_name: Mapped[
        str | None
    ] = mapped_column(
        String(150),
        nullable=True,
    )

    department: Mapped[
        str | None
    ] = mapped_column(
        String(150),
        nullable=True,
    )

    location_name: Mapped[
        str | None
    ] = mapped_column(
        String(200),
        nullable=True,
    )

    address_text: Mapped[
        str | None
    ] = mapped_column(
        String(300),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    journey_item = relationship(
        "CareJourneyItem",
        back_populates="appointment",
    )