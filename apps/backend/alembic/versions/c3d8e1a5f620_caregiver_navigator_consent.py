"""navigator-recorded caregiver consent

Revision ID: c3d8e1a5f620
Revises: 9a4c1f2e7b31
Create Date: 2026-10-19 15:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3d8e1a5f620"
down_revision: Union[str, Sequence[str], None] = "9a4c1f2e7b31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("caregiver_patient_access", sa.Column("consent_method", sa.String(length=20), nullable=True))
    op.add_column("caregiver_patient_access", sa.Column("consent_given_by", sa.String(length=150), nullable=True))
    op.add_column("caregiver_patient_access", sa.Column("consent_note", sa.Text(), nullable=True))
    op.add_column("caregiver_patient_access", sa.Column("consent_recorded_by_user_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_caregiver_access_consent_recorded_by_users",
        "caregiver_patient_access",
        "users",
        ["consent_recorded_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_caregiver_access_consent_recorded_by_users", "caregiver_patient_access", type_="foreignkey")
    op.drop_column("caregiver_patient_access", "consent_recorded_by_user_id")
    op.drop_column("caregiver_patient_access", "consent_note")
    op.drop_column("caregiver_patient_access", "consent_given_by")
    op.drop_column("caregiver_patient_access", "consent_method")
