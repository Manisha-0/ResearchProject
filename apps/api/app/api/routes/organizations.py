from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.crud.organization import (
    create_organization,
    delete_organization,
    get_organization,
    get_organizations,
    update_organization,
)
from app.db.database import get_db
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationResponse,
    OrganizationUpdate,
)


router = APIRouter(
    prefix="/organizations",
    tags=["Organizations"],
)


@router.post("", response_model=OrganizationResponse, status_code=201)
def create_organization_route(
    organization_data: OrganizationCreate,
    db: Session = Depends(get_db),
):
    return create_organization(db, organization_data)


@router.get("", response_model=list[OrganizationResponse])
def list_organizations(
    db: Session = Depends(get_db),
):
    return get_organizations(db)


@router.get("/{organization_id}", response_model=OrganizationResponse)
def get_organization_route(
    organization_id: int,
    db: Session = Depends(get_db),
):
    organization = get_organization(db, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found",
        )

    return organization


@router.patch("/{organization_id}", response_model=OrganizationResponse)
def update_organization_route(
    organization_id: int,
    organization_data: OrganizationUpdate,
    db: Session = Depends(get_db),
):
    organization = get_organization(db, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found",
        )

    return update_organization(
        db,
        organization,
        organization_data,
    )


@router.delete("/{organization_id}", status_code=204)
def delete_organization_route(
    organization_id: int,
    db: Session = Depends(get_db),
):
    organization = get_organization(db, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found",
        )

    delete_organization(db, organization)

    return None