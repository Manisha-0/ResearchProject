import uuid

from sqlalchemy import (
    Boolean,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import (
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)
from app.models.enums import CheckInSource


def enum_values(enum_class):
    return [item.value for item in enum_class]


class CheckIn(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "check_ins"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "patient_profiles.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    submitted_by_user_id: Mapped[
        uuid.UUID
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    source: Mapped[CheckInSource] = mapped_column(
        SQLEnum(
            CheckInSource,
            name="check_in_source",
            values_callable=enum_values,
        ),
        nullable=False,
    )

    symptom_severity: Mapped[
        int | None
    ] = mapped_column(
        Integer,
        nullable=True,
    )

    transportation_confirmed: Mapped[
        bool | None
    ] = mapped_column(
        Boolean,
        nullable=True,
    )

    medication_access_issue: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    financial_concern: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    requested_help: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    free_text: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    submitted_for_relationship: Mapped[
        str | None
    ] = mapped_column(
        String(100),
        nullable=True,
    )