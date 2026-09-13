import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import UniqueConstraint

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class PatientProfile(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "patient_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        unique=True,
        nullable=False,
    )

    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    date_of_birth: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    preferred_language: Mapped[str] = mapped_column(
        String(50),
        default="English",
        nullable=False,
    )

    preferred_contact_method: Mapped[str | None] = (
        mapped_column(
            String(30),
            nullable=True,
        )
    )

    care_program: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    external_patient_reference: Mapped[str | None] = (
        mapped_column(
            String(150),
            nullable=True,
        )
    )
    
class NavigatorPatientAssignment(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "navigator_patient_assignments"

    __table_args__ = (
        UniqueConstraint(
            "navigator_user_id",
            "patient_id",
            name="uq_navigator_patient_assignment",
        ),
    )

    navigator_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "patient_profiles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )