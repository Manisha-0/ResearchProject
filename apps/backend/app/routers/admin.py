from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.auth import require_roles
from app.models.enums import UserRole
from app.models.user import User


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


@router.get("/test")
def admin_test(
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.SUPER_ADMIN
            )
        ),
    ],
):
    return {
        "message": "Super Admin access granted.",
        "user_id": str(current_user.id),
    }