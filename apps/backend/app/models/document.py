import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    String,
    Text,
)

from sqlalchemy.dialects.postgresql import (
    JSONB,
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

    patient_visible: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )


class DocumentSummary(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = (
        "document_summaries"
    )

    document_id: Mapped[
        uuid.UUID
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "documents.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

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

    generated_by_user_id: Mapped[
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

    model_name: Mapped[
        str
    ] = mapped_column(
        String(150),
        nullable=False,
    )

    summary: Mapped[
        str
    ] = mapped_column(
        Text,
        nullable=False,
    )

    key_details: Mapped[
        list
    ] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    navigation_actions: Mapped[
        list
    ] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    important_dates: Mapped[
        list
    ] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    limitations: Mapped[
        list
    ] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    source_character_count: Mapped[
        int
    ] = mapped_column(
        BigInteger,
        nullable=False,
    )

    source_truncated: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )