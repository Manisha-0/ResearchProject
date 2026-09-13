from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud.navigator import (
    create_navigator,
    delete_navigator,
    get_navigator,
    get_navigators,
    update_navigator,
)
from app.db.database import get_db
from app.schemas.navigator import (
    NavigatorCreate,
    NavigatorResponse,
    NavigatorUpdate,
)


router = APIRouter(
    prefix="/navigators",
    tags=["Navigators"],
)


@router.post("", response_model=NavigatorResponse, status_code=201)
def create_navigator_route(
    data: NavigatorCreate,
    db: Session = Depends(get_db),
):
    return create_navigator(db, data)


@router.get("", response_model=list[NavigatorResponse])
def list_navigators(
    organization_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_navigators(db, organization_id)


@router.get("/{navigator_id}", response_model=NavigatorResponse)
def get_navigator_route(
    navigator_id: int,
    db: Session = Depends(get_db),
):
    navigator = get_navigator(db, navigator_id)

    if navigator is None:
        raise HTTPException(404, "Navigator not found")

    return navigator


@router.patch("/{navigator_id}", response_model=NavigatorResponse)
def update_navigator_route(
    navigator_id: int,
    data: NavigatorUpdate,
    db: Session = Depends(get_db),
):
    navigator = get_navigator(db, navigator_id)

    if navigator is None:
        raise HTTPException(404, "Navigator not found")

    return update_navigator(db, navigator, data)


@router.delete("/{navigator_id}", status_code=204)
def delete_navigator_route(
    navigator_id: int,
    db: Session = Depends(get_db),
):
    navigator = get_navigator(db, navigator_id)

    if navigator is None:
        raise HTTPException(404, "Navigator not found")

    delete_navigator(db, navigator)