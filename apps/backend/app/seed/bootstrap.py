from app.core.database import SessionLocal
from app.services.bootstrap_service import (
    bootstrap_system,
)


def main() -> None:
    with SessionLocal() as db:
        organization, admin = bootstrap_system(db)

        print("Bootstrap complete")
        print(f"Organization: {organization.name}")
        print(f"Admin: {admin.email}")


if __name__ == "__main__":
    main()