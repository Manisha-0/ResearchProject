import uuid

from sqlalchemy import (
    Enum as SQLEnum,
    ForeignKey,
    Integer,
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
from app.models.enums import AttentionStatus


def enum_values(enum_class):
    return [item.value for item in enum_class]


class AttentionSnapshot(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "attention_snapshots"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "patient_profiles.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    status: Mapped[
        AttentionStatus
    ] = mapped_column(
        SQLEnum(
            AttentionStatus,
            name="attention_snapshot_status",
            values_callable=enum_values,
        ),
        nullable=False,
        index=True,
    )

    open_need_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    explanation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )