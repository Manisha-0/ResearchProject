"""follow-up tasks with checklist items

Revision ID: 9a4c1f2e7b31
Revises: 7c2d9e5f1a44
Create Date: 2026-10-19 14:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "9a4c1f2e7b31"
down_revision: Union[str, Sequence[str], None] = "7c2d9e5f1a44"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "navigation_tasks",
        sa.Column("kind", sa.String(length=20), server_default="need", nullable=False),
    )

    op.create_table(
        "navigation_task_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("task_id", sa.UUID(), nullable=False),
        sa.Column("navigation_need_id", sa.UUID(), nullable=False),
        sa.Column("label", sa.String(length=200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("done_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("done_by_user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["navigation_tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["navigation_need_id"], ["navigation_needs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["done_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", "navigation_need_id", name="uq_navigation_task_item_need"),
    )
    op.create_index("ix_navigation_task_items_task_id", "navigation_task_items", ["task_id"])
    op.create_index(
        "ix_navigation_task_items_navigation_need_id", "navigation_task_items", ["navigation_need_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_navigation_task_items_navigation_need_id", table_name="navigation_task_items")
    op.drop_index("ix_navigation_task_items_task_id", table_name="navigation_task_items")
    op.drop_table("navigation_task_items")
    op.drop_column("navigation_tasks", "kind")
