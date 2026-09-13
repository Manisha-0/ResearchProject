from datetime import datetime, timezone
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    verify_password_or_dummy,
)
from app.models.enums import UserStatus
from app.models.user import User
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    TokenResponse,
)
from app.services.audit_service import (
    write_audit_log,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    email = (
        str(payload.email)
        .strip()
        .lower()
    )

    user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    valid_password = (
        verify_password_or_dummy(
            payload.password,
            (
                user.password_hash
                if user is not None
                else None
            ),
        )
    )

    if user is None or not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active.",
        )

    user.last_login_at = datetime.now(
        timezone.utc
    )

    write_audit_log(
        db,
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="LOGIN_SUCCESS",
        resource_type="user",
        resource_id=str(user.id),
    )

    db.commit()

    access_token = create_access_token(
        user_id=str(user.id),
        role=user.role.value,
        organization_id=str(
            user.organization_id
        ),
    )

    return TokenResponse(
        access_token=access_token,
    )


@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
def me(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> CurrentUserResponse:
    return CurrentUserResponse(
        id=current_user.id,
        organization_id=(
            current_user.organization_id
        ),
        email=current_user.email,
        role=current_user.role,
        status=current_user.status,
    )