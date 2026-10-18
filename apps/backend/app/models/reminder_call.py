import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import (
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)
from app.models.enums import (
    ReminderCallAnsweredBy,
    ReminderCallChannel,
    ReminderCallStatus,
)


def enum_values(enum_class):
    return [item.value for item in enum_class]


class ReminderCall(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    """
    One automated reminder call about one appointment.

    The transcript and the structured answers are kept
    so the navigator can always see exactly what was
    asked and what the patient (or caregiver) said.
    """

    __tablename__ = "reminder_calls"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    appointment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Null when the scheduler placed the call.
    initiated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    channel: Mapped[ReminderCallChannel] = mapped_column(
        SQLEnum(
            ReminderCallChannel,
            name="reminder_call_channel",
            values_callable=enum_values,
        ),
        nullable=False,
    )

    status: Mapped[ReminderCallStatus] = mapped_column(
        SQLEnum(
            ReminderCallStatus,
            name="reminder_call_status",
            values_callable=enum_values,
        ),
        default=ReminderCallStatus.QUEUED,
        nullable=False,
    )

    answered_by: Mapped[ReminderCallAnsweredBy | None] = mapped_column(
        SQLEnum(
            ReminderCallAnsweredBy,
            name="reminder_call_answered_by",
            values_callable=enum_values,
        ),
        nullable=True,
    )

    attempt_number: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False
    )

    phone_number: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )

    provider_call_sid: Mapped[str | None] = mapped_column(
        String(64), index=True, nullable=True
    )

    # Conversation state
    current_step: Mapped[str] = mapped_column(
        String(40), default="identity", nullable=False
    )

    reprompt_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )

    # [{"speaker": "agent" | "caller", "text": ..., "step": ..., "at": ...}]
    transcript: Mapped[list] = mapped_column(
        JSONB, default=list, nullable=False
    )

    # {"attendance": "yes", "symptom_severity": 4, ...}
    answers: Mapped[dict] = mapped_column(
        JSONB, default=dict, nullable=False
    )

    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    needs_follow_up: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    safety_flag: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    check_in_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("check_ins.id", ondelete="SET NULL"),
        nullable=True,
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    error_message: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
