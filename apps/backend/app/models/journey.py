import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
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
from app.models.enums import (
    JourneyItemStatus,
    JourneyItemType,
)


def enum_values(enum_class):
    return [item.value for item in enum_class]


class CareJourneyItem(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "care_journey_items"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "patient_profiles.id",
            ondelete="CASCADE",
        ),
        index=True,
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

    item_type: Mapped[JourneyItemType] = mapped_column(
        SQLEnum(
            JourneyItemType,
            name="journey_item_type",
            values_callable=enum_values,
        ),
        nullable=False,
    )

    status: Mapped[JourneyItemStatus] = mapped_column(
        SQLEnum(
            JourneyItemStatus,
            name="journey_item_status",
            values_callable=enum_values,
        ),
        default=JourneyItemStatus.UPCOMING,
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    scheduled_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    completed_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    patient_visible: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    source_type: Mapped[str] = mapped_column(
        String(50),
        default="navigator",
        nullable=False,
    )

    source_reference: Mapped[
        str | None
    ] = mapped_column(
        String(200),
        nullable=True,
    )

    appointment = relationship(
        "Appointment",
        back_populates="journey_item",
        uselist=False,
    )