"""agent caller fields on reminder calls

Revision ID: 7c2d9e5f1a44
Revises: 3b7e21c4d9a0
Create Date: 2026-10-18 12:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "7c2d9e5f1a44"
down_revision: Union[str, Sequence[str], None] = "3b7e21c4d9a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("reminder_calls", sa.Column("mode", sa.String(length=20), server_default="scripted", nullable=False))
    op.add_column(
        "reminder_calls",
        sa.Column("agent_history", postgresql.JSONB(astext_type=sa.Text()), server_default="[]", nullable=False),
    )
    op.add_column("reminder_calls", sa.Column("transfer_status", sa.String(length=20), nullable=True))
    op.add_column("reminder_calls", sa.Column("transferred_to_user_id", sa.UUID(), nullable=True))
    op.add_column("reminder_calls", sa.Column("callback_topic", sa.String(length=30), nullable=True))
    op.add_column("reminder_calls", sa.Column("callback_reason", sa.Text(), nullable=True))
    op.add_column("reminder_calls", sa.Column("callback_urgency", sa.String(length=20), nullable=True))
    op.create_foreign_key(
        "fk_reminder_calls_transferred_to_user_id_users",
        "reminder_calls",
        "users",
        ["transferred_to_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_reminder_calls_transferred_to_user_id_users", "reminder_calls", type_="foreignkey")
    for column in (
        "callback_urgency",
        "callback_reason",
        "callback_topic",
        "transferred_to_user_id",
        "transfer_status",
        "agent_history",
        "mode",
    ):
        op.drop_column("reminder_calls", column)
