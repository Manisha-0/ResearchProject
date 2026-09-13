from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationUpdate


def create_organization(
    db: Session,
    organization_data: OrganizationCreate,
) -> Organization:
    organization = Organization(
        name=organization_data.name,
    )

    db.add(organization)
    db.commit()
    db.refresh(organization)

    return organization


def get_organization(
    db: Session,
    organization_id: int,
) -> Organization | None:
    return db.get(Organization, organization_id)


def get_organizations(
    db: Session,
) -> list[Organization]:
    query = select(Organization).order_by(Organization.id)

    return list(db.scalars(query).all())


def update_organization(
    db: Session,
    organization: Organization,
    organization_data: OrganizationUpdate,
) -> Organization:
    update_data = organization_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(organization, field, value)

    db.commit()
    db.refresh(organization)

    return organization


def delete_organization(
    db: Session,
    organization: Organization,
) -> None:
    db.delete(organization)
    db.commit()