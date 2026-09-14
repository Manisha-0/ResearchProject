import uuid

from sqlalchemy import (
    BigInteger,
    ForeignKey,
    String,
)

from sqlalchemy.dialects.postgresql import (
    UUID,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.core.database import Base

from app.models.base import (
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class Document(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "documents"

    organization_id: Mapped[
        uuid.UUID
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "organizations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    patient_id: Mapped[
        uuid.UUID
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "patient_profiles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    uploaded_by_user_id: Mapped[
        uuid.UUID
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    document_type: Mapped[
        str
    ] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    original_filename: Mapped[
        str
    ] = mapped_column(
        String(500),
        nullable=False,
    )

    storage_bucket: Mapped[
        str
    ] = mapped_column(
        String(100),
        nullable=False,
    )

    storage_path: Mapped[
        str
    ] = mapped_column(
        String(1000),
        unique=True,
        nullable=False,
    )

    content_type: Mapped[
        str
    ] = mapped_column(
        String(150),
        nullable=False,
    )

    file_size_bytes: Mapped[
        int
    ] = mapped_column(
        BigInteger,
        nullable=False,
    )