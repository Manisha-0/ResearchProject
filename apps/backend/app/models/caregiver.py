import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    CaregiverAccessStatus,
    CaregiverPermissionType,
)


class CaregiverProfile(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "caregiver_profiles"

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

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )


class CaregiverPatientAccess(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "caregiver_patient_access"

    __table_args__ = (
        UniqueConstraint(
            "caregiver_user_id",
            "patient_id",
            name="uq_caregiver_patient_access",
        ),
    )

    caregiver_user_id: Mapped[uuid.UUID] = mapped_column(
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

    relationship: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    status: Mapped[CaregiverAccessStatus] = mapped_column(
        Enum(
            CaregiverAccessStatus,
            name="caregiver_access_status",
            values_callable=lambda enum: [
                item.value for item in enum
            ],
        ),
        default=(
            CaregiverAccessStatus.PENDING_PATIENT_APPROVAL
        ),
        nullable=False,
    )

    initiated_by_user_id: Mapped[uuid.UUID] = (
        mapped_column(
            UUID(as_uuid=True),
            ForeignKey(
                "users.id",
                ondelete="RESTRICT",
            ),
            nullable=False,
        )
    )

    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class CaregiverPermission(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "caregiver_permissions"

    __table_args__ = (
        UniqueConstraint(
            "caregiver_access_id",
            "permission",
            name="uq_caregiver_permission",
        ),
    )

    caregiver_access_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "caregiver_patient_access.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    permission: Mapped[CaregiverPermissionType] = (
        mapped_column(
            Enum(
                CaregiverPermissionType,
                name="caregiver_permission_type",
                values_callable=lambda enum: [
                    item.value for item in enum
                ],
            ),
            nullable=False,
        )
    )