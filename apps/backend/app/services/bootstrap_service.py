from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.enums import UserRole, UserStatus
from app.models.organization import Organization
from app.models.user import User
from app.services.audit_service import write_audit_log


def bootstrap_system(
    db: Session,
) -> tuple[Organization, User]:
    organization = db.scalar(
        select(Organization).where(
            Organization.slug
            == settings.bootstrap_organization_slug
        )
    )

    if organization is None:
        organization = Organization(
            name=settings.bootstrap_organization_name,
            slug=settings.bootstrap_organization_slug,
        )

        db.add(organization)
        db.flush()

    admin_email = (
        settings.bootstrap_admin_email
        .strip()
        .lower()
    )

    admin = db.scalar(
        select(User).where(
            User.email == admin_email
        )
    )

    if admin is None:
        admin = User(
            organization_id=organization.id,
            email=admin_email,
            password_hash=hash_password(
                settings.bootstrap_admin_password
            ),
            role=UserRole.SUPER_ADMIN,
            status=UserStatus.ACTIVE,
            email_verified_at=datetime.now(
                timezone.utc
            ),
        )

        db.add(admin)
        db.flush()

        write_audit_log(
            db,
            organization_id=organization.id,
            actor_user_id=admin.id,
            action="SYSTEM_BOOTSTRAP_ADMIN_CREATED",
            resource_type="user",
            resource_id=str(admin.id),
        )

    db.commit()

    db.refresh(organization)
    db.refresh(admin)

    return organization, admin