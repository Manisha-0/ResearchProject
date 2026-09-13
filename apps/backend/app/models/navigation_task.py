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
)

from app.core.database import Base
from app.models.base import (
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)
from app.models.enums import NavigationTaskStatus


def enum_values(enum_class):
    return [item.value for item in enum_class]


class NavigationTask(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "navigation_tasks"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "patient_profiles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    navigation_need_id: Mapped[
        uuid.UUID
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "navigation_needs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    assigned_to_user_id: Mapped[
        uuid.UUID
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    created_by_user_id: Mapped[
        uuid.UUID
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
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

    status: Mapped[
        NavigationTaskStatus
    ] = mapped_column(
        SQLEnum(
            NavigationTaskStatus,
            name="navigation_task_status",
            values_callable=enum_values,
        ),
        default=NavigationTaskStatus.OPEN,
        nullable=False,
        index=True,
    )

    due_at: Mapped[
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

    completed_by_user_id: Mapped[
        uuid.UUID | None
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    resolution_note: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )