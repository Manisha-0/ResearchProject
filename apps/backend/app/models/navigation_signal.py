import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import (
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)
from app.models.enums import (
    NavigationSignalCategory,
    NavigationSignalSourceType,
    NavigationSignalStatus,
)


def enum_values(enum_class):
    return [item.value for item in enum_class]


class NavigationSignal(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "navigation_signals"

    __table_args__ = (
        UniqueConstraint(
            "source_type",
            "source_reference",
            "signal_type",
            name="uq_navigation_signal_source_type",
        ),
    )

    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "patient_profiles.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    category: Mapped[
        NavigationSignalCategory
    ] = mapped_column(
        SQLEnum(
            NavigationSignalCategory,
            name="navigation_signal_category",
            values_callable=enum_values,
        ),
        nullable=False,
    )

    signal_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    status: Mapped[
        NavigationSignalStatus
    ] = mapped_column(
        SQLEnum(
            NavigationSignalStatus,
            name="navigation_signal_status",
            values_callable=enum_values,
        ),
        default=NavigationSignalStatus.OPEN,
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    source_type: Mapped[
        NavigationSignalSourceType
    ] = mapped_column(
        SQLEnum(
            NavigationSignalSourceType,
            name="navigation_signal_source_type",
            values_callable=enum_values,
        ),
        nullable=False,
    )

    source_reference: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    observed_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    resolved_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )