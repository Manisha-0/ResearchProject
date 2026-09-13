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
    AttentionStatus,
    NavigationNeedStatus,
)


def enum_values(enum_class):
    return [item.value for item in enum_class]


class NavigationNeed(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "navigation_needs"

    __table_args__ = (
        UniqueConstraint(
            "patient_id",
            "need_type",
            "context_key",
            name="uq_navigation_need_context",
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

    need_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    context_key: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    explanation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    recommended_action: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    attention_status: Mapped[
        AttentionStatus
    ] = mapped_column(
        SQLEnum(
            AttentionStatus,
            name="attention_status",
            values_callable=enum_values,
        ),
        nullable=False,
        index=True,
    )

    status: Mapped[
        NavigationNeedStatus
    ] = mapped_column(
        SQLEnum(
            NavigationNeedStatus,
            name="navigation_need_status",
            values_callable=enum_values,
        ),
        default=NavigationNeedStatus.OPEN,
        nullable=False,
        index=True,
    )

    due_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    resolved_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    signal_links = relationship(
        "NavigationNeedSignal",
        back_populates="navigation_need",
        cascade="all, delete-orphan",
    )