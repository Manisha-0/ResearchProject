import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
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


class NavigationTaskItem(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    """
    One line on a follow-up task's checklist.

    A follow-up task groups every open navigation need for a
    patient so the navigator handles them in one call. Each
    item points at one need; ticking the item resolves it.
    """

    __tablename__ = "navigation_task_items"

    __table_args__ = (
        UniqueConstraint(
            "task_id",
            "navigation_need_id",
            name="uq_navigation_task_item_need",
        ),
    )

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "navigation_tasks.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    navigation_need_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "navigation_needs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    label: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    done_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    done_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )
