from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db

from app.models.enums import (
    InvitationPurpose,
    UserRole,
    UserStatus,
)

from app.models.navigator import (
    NavigatorProfile,
)

from app.models.user import User

from app.schemas.admin import (
    AdminNavigatorResponse,
    NavigatorCreateRequest,
    NavigatorCreateResponse,
)

from app.services.audit_service import (
    write_audit_log,
)

from app.services.email_service import (
    get_email_service,
)

from app.services.invitation_service import (
    create_invitation,
)


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


@router.get(
    "/navigators",
    response_model=list[
        AdminNavigatorResponse
    ],
)
def get_navigators(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.SUPER_ADMIN
            )
        ),
    ],
) -> list[
    AdminNavigatorResponse
]:
    rows = db.execute(
        select(
            User,
            NavigatorProfile,
        )
        .join(
            NavigatorProfile,
            NavigatorProfile.user_id
            == User.id,
        )
        .where(
            User.organization_id
            == current_user.organization_id,
            User.role
            == UserRole.NAVIGATOR,
        )
        .order_by(
            NavigatorProfile.last_name,
            NavigatorProfile.first_name,
        )
    ).all()

    return [
        AdminNavigatorResponse(
            user_id=user.id,
            email=user.email,
            status=user.status.value,
            first_name=profile.first_name,
            last_name=profile.last_name,
            job_title=profile.job_title,
            department=profile.department,
            phone=profile.phone,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        )
        for user, profile in rows
    ]


@router.post(
    "/navigators",
    response_model=NavigatorCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_navigator(
    payload: NavigatorCreateRequest,
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.SUPER_ADMIN
            )
        ),
    ],
) -> NavigatorCreateResponse:
    email = (
        str(payload.email)
        .strip()
        .lower()
    )

    existing_user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    if (
        existing_user
        is not None
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "An account with this email "
                "already exists."
            ),
        )

    first_name = (
        payload.first_name
        .strip()
    )

    last_name = (
        payload.last_name
        .strip()
    )

    job_title = (
        payload.job_title
        .strip()
    )

    if not first_name:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "First name is required."
            ),
        )

    if not last_name:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "Last name is required."
            ),
        )

    if not job_title:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "Job title is required."
            ),
        )

    navigator_user = User(
        organization_id=(
            current_user.organization_id
        ),
        email=email,
        password_hash=None,
        role=UserRole.NAVIGATOR,
        status=UserStatus.PENDING,
    )

    db.add(
        navigator_user
    )

    db.flush()

    navigator_profile = (
        NavigatorProfile(
            user_id=(
                navigator_user.id
            ),
            first_name=(
                first_name
            ),
            last_name=(
                last_name
            ),
            job_title=(
                job_title
            ),
            department=(
                payload.department.strip()
                if (
                    payload.department
                    and
                    payload.department.strip()
                )
                else None
            ),
            phone=(
                payload.phone.strip()
                if (
                    payload.phone
                    and
                    payload.phone.strip()
                )
                else None
            ),
        )
    )

    db.add(
        navigator_profile
    )

    invitation, raw_token = (
        create_invitation(
            db,
            user=(
                navigator_user
            ),
            purpose=(
                InvitationPurpose
                .NAVIGATOR_ACTIVATION
            ),
            created_by_user_id=(
                current_user.id
            ),
        )
    )

    write_audit_log(
        db,
        organization_id=(
            current_user.organization_id
        ),
        actor_user_id=(
            current_user.id
        ),
        action=(
            "NAVIGATOR_INVITED"
        ),
        resource_type="user",
        resource_id=str(
            navigator_user.id
        ),
        metadata_json={
            "invitation_id": str(
                invitation.id
            ),
        },
    )

    db.commit()

    email_service = (
        get_email_service()
    )

    email_service.send_account_invitation(
        email=(
            navigator_user.email
        ),
        first_name=(
            navigator_profile.first_name
        ),
        activation_token=(
            raw_token
        ),
    )

    return (
        NavigatorCreateResponse(
            user_id=(
                navigator_user.id
            ),
            email=(
                navigator_user.email
            ),
            status=(
                navigator_user
                .status
                .value
            ),
            message=(
                "Navigator invitation "
                "created."
            ),
        )
    )