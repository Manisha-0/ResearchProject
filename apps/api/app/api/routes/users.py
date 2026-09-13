from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud.user import (
    create_user,
    delete_user,
    get_user,
    get_users,
    update_user,
)
from app.db.database import get_db
from app.schemas.user import UserCreate, UserResponse, UserUpdate


router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", response_model=UserResponse, status_code=201)
def create_user_route(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    return create_user(db, user_data)


@router.get("", response_model=list[UserResponse])
def list_users(
    organization_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_users(db, organization_id=organization_id)


@router.get("/{user_id}", response_model=UserResponse)
def get_user_route(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = get_user(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user_route(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
):
    user = get_user(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return update_user(db, user, user_data)


@router.delete("/{user_id}", status_code=204)
def delete_user_route(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = get_user(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    delete_user(db, user)

    return None