import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.enums import InvitationPurpose
from app.models.invitation import AccountInvitation
from app.models.user import User


def hash_invitation_token(
    token: str,
) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def create_invitation(
    db: Session,
    *,
    user: User,
    purpose: InvitationPurpose,
    created_by_user_id,
) -> tuple[AccountInvitation, str]:
    raw_token = secrets.token_urlsafe(48)

    token_hash = hash_invitation_token(
        raw_token
    )

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(
            hours=settings.account_invitation_expire_hours
        )
    )

    invitation = AccountInvitation(
        user_id=user.id,
        token_hash=token_hash,
        purpose=purpose,
        expires_at=expires_at,
        created_by_user_id=created_by_user_id,
    )

    db.add(invitation)
    db.flush()

    return invitation, raw_token


def get_valid_invitation(
    db: Session,
    *,
    raw_token: str,
    purpose: InvitationPurpose | None = None,
) -> AccountInvitation | None:
    token_hash = hash_invitation_token(
        raw_token
    )

    statement = select(
        AccountInvitation
    ).where(
        AccountInvitation.token_hash
        == token_hash
    )

    if purpose is not None:
        statement = statement.where(
            AccountInvitation.purpose
            == purpose
        )

    invitation = db.scalar(statement)

    if invitation is None:
        return None

    now = datetime.now(timezone.utc)

    if invitation.used_at is not None:
        return None

    if invitation.expires_at <= now:
        return None

    return invitation