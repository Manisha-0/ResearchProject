"""add reminder calls

Revision ID: 3b7e21c4d9a0
Revises: 9789a5168730
Create Date: 2026-10-17 15:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "3b7e21c4d9a0"
down_revision: Union[str, Sequence[str], None] = "9789a5168730"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


channel_enum = postgresql.ENUM(
    "phone", "simulated",
    name="reminder_call_channel",
    create_type=False,
)
status_enum = postgresql.ENUM(
    "queued", "ringing", "in_progress", "completed",
    "ended_early", "no_answer", "failed",
    name="reminder_call_status",
    create_type=False,
)
answered_by_enum = postgresql.ENUM(
    "patient", "caregiver", "wrong_person", "unknown",
    name="reminder_call_answered_by",
    create_type=False,
)


def upgrade() -> None:
    # A new value on an existing Postgres enum cannot be
    # added inside the migration transaction.
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE check_in_source "
            "ADD VALUE IF NOT EXISTS 'voice_call'"
        )

    bind = op.get_bind()
    channel_enum.create(bind, checkfirst=True)
    status_enum.create(bind, checkfirst=True)
    answered_by_enum.create(bind, checkfirst=True)

    op.create_table(
        "reminder_calls",
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("patient_id", sa.UUID(), nullable=False),
        sa.Column("appointment_id", sa.UUID(), nullable=False),
        sa.Column("initiated_by_user_id", sa.UUID(), nullable=True),
        sa.Column("channel", channel_enum, nullable=False),
        sa.Column("status", status_enum, nullable=False),
        sa.Column("answered_by", answered_by_enum, nullable=True),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("phone_number", sa.String(length=30), nullable=True),
        sa.Column("provider_call_sid", sa.String(length=64), nullable=True),
        sa.Column("current_step", sa.String(length=40), nullable=False),
        sa.Column("reprompt_count", sa.Integer(), nullable=False),
        sa.Column("transcript", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("answers", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("needs_follow_up", sa.Boolean(), nullable=False),
        sa.Column("safety_flag", sa.Boolean(), nullable=False),
        sa.Column("check_in_id", sa.UUID(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.String(length=500), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["patient_id"], ["patient_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["initiated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["check_in_id"], ["check_ins.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reminder_calls_organization_id"), "reminder_calls", ["organization_id"])
    op.create_index(op.f("ix_reminder_calls_patient_id"), "reminder_calls", ["patient_id"])
    op.create_index(op.f("ix_reminder_calls_appointment_id"), "reminder_calls", ["appointment_id"])
    op.create_index(op.f("ix_reminder_calls_provider_call_sid"), "reminder_calls", ["provider_call_sid"])


def downgrade() -> None:
    op.drop_index(op.f("ix_reminder_calls_provider_call_sid"), table_name="reminder_calls")
    op.drop_index(op.f("ix_reminder_calls_appointment_id"), table_name="reminder_calls")
    op.drop_index(op.f("ix_reminder_calls_patient_id"), table_name="reminder_calls")
    op.drop_index(op.f("ix_reminder_calls_organization_id"), table_name="reminder_calls")
    op.drop_table("reminder_calls")

    bind = op.get_bind()
    answered_by_enum.drop(bind, checkfirst=True)
    status_enum.drop(bind, checkfirst=True)
    channel_enum.drop(bind, checkfirst=True)

    # Postgres cannot remove a value from an enum, so
    # 'voice_call' stays on check_in_source.
