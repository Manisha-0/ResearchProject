from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.navigator_dashboard import (
    NavigatorDashboardResponse,
)
from app.services.navigator_dashboard_service import (
    build_navigator_dashboard,
)


router = APIRouter(
    prefix="/navigator",
    tags=["Navigator Dashboard"],
)


@router.get(
    "/dashboard",
    response_model=NavigatorDashboardResponse,
)
def get_navigator_dashboard(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.NAVIGATOR
            )
        ),
    ],
) -> NavigatorDashboardResponse:
    response = build_navigator_dashboard(
        db,
        navigator=current_user,
    )

    # Context evaluation may create new
    # AttentionSnapshot rows.
    db.commit()

    return response