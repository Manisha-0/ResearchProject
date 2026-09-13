import uuid

from sqlalchemy import (
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.core.database import Base
from app.models.base import (
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class NavigationNeedSignal(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "navigation_need_signals"

    __table_args__ = (
        UniqueConstraint(
            "navigation_need_id",
            "navigation_signal_id",
            name="uq_navigation_need_signal",
        ),
    )

    navigation_need_id: Mapped[
        uuid.UUID
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "navigation_needs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    navigation_signal_id: Mapped[
        uuid.UUID
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "navigation_signals.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    navigation_need = relationship(
        "NavigationNeed",
        back_populates="signal_links",
    )