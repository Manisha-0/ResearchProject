from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import settings


password_hash = PasswordHash.recommended()

# Used when an email does not exist so authentication still
# performs a password hash verification operation.
DUMMY_PASSWORD_HASH = password_hash.hash(
    "compass-dummy-password"
)


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return password_hash.verify(
        plain_password,
        hashed_password,
    )


def verify_password_or_dummy(
    plain_password: str,
    hashed_password: str | None,
) -> bool:
    if hashed_password is None:
        return password_hash.verify(
            plain_password,
            DUMMY_PASSWORD_HASH,
        )

    return verify_password(
        plain_password,
        hashed_password,
    )


def create_access_token(
    *,
    user_id: str,
    role: str,
    organization_id: str,
) -> str:
    now = datetime.now(timezone.utc)

    expires_at = now + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload: dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "organization_id": organization_id,
        "iat": now,
        "exp": expires_at,
        "type": "access",
    }

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(
    token: str,
) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except InvalidTokenError as exc:
        raise ValueError(
            "Invalid or expired access token."
        ) from exc

    if payload.get("type") != "access":
        raise ValueError("Invalid token type.")

    if not payload.get("sub"):
        raise ValueError("Token subject is missing.")

    return payload