from datetime import date, datetime, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.caregiver import (
    CaregiverPatientAccess,
    CaregiverPermission,
    CaregiverProfile,
)
from app.models.enums import (
    CaregiverAccessStatus,
    CaregiverPermissionType,
    UserRole,
    UserStatus,
)
from app.models.navigator import NavigatorProfile
from app.models.organization import Organization
from app.models.patient import (
    NavigatorPatientAssignment,
    PatientProfile,
)
from app.models.user import User


DEMO_PASSWORD = "Demo123!"


def get_or_create_user(
    db,
    *,
    organization_id,
    email: str,
    role: UserRole,
) -> User:
    normalized_email = email.strip().lower()

    user = db.scalar(
        select(User).where(
            User.email == normalized_email
        )
    )

    if user:
        return user

    user = User(
        organization_id=organization_id,
        email=normalized_email,
        password_hash=hash_password(
            DEMO_PASSWORD
        ),
        role=role,
        status=UserStatus.ACTIVE,
        email_verified_at=datetime.now(
            timezone.utc
        ),
    )

    db.add(user)
    db.flush()

    return user


def main() -> None:
    if settings.app_env != "development":
        raise RuntimeError(
            "Development seed can only run "
            "when APP_ENV=development."
        )

    with SessionLocal() as db:
        organization = db.scalar(
            select(Organization).where(
                Organization.slug
                == settings.bootstrap_organization_slug
            )
        )

        if organization is None:
            raise RuntimeError(
                "Run bootstrap first."
            )

        # Navigator
        james = get_or_create_user(
            db,
            organization_id=organization.id,
            email="james@compass.demo",
            role=UserRole.NAVIGATOR,
        )

        navigator_profile = db.scalar(
            select(NavigatorProfile).where(
                NavigatorProfile.user_id
                == james.id
            )
        )

        if navigator_profile is None:
            navigator_profile = NavigatorProfile(
                user_id=james.id,
                first_name="James",
                last_name="Wilson",
                job_title="Cancer Navigator",
                department="Oncology Navigation",
            )

            db.add(navigator_profile)

        # Patient
        anisha = get_or_create_user(
            db,
            organization_id=organization.id,
            email="anisha@compass.demo",
            role=UserRole.PATIENT,
        )

        patient_profile = db.scalar(
            select(PatientProfile).where(
                PatientProfile.user_id
                == anisha.id
            )
        )

        if patient_profile is None:
            patient_profile = PatientProfile(
                user_id=anisha.id,
                first_name="Anisha",
                last_name="Sharma",
                date_of_birth=date(
                    1965,
                    4,
                    18,
                ),
                preferred_language="English",
                preferred_contact_method="email",
                care_program="Breast Cancer Navigation",
            )

            db.add(patient_profile)
            db.flush()

        assignment = db.scalar(
            select(
                NavigatorPatientAssignment
            ).where(
                NavigatorPatientAssignment.navigator_user_id
                == james.id,
                NavigatorPatientAssignment.patient_id
                == patient_profile.id,
            )
        )

        if assignment is None:
            db.add(
                NavigatorPatientAssignment(
                    navigator_user_id=james.id,
                    patient_id=patient_profile.id,
                )
            )

        # Caregiver
        aarti = get_or_create_user(
            db,
            organization_id=organization.id,
            email="aarti@compass.demo",
            role=UserRole.CAREGIVER,
        )

        caregiver_profile = db.scalar(
            select(CaregiverProfile).where(
                CaregiverProfile.user_id
                == aarti.id
            )
        )

        if caregiver_profile is None:
            caregiver_profile = CaregiverProfile(
                user_id=aarti.id,
                first_name="Aarti",
                last_name="Sharma",
            )

            db.add(caregiver_profile)

        caregiver_access = db.scalar(
            select(
                CaregiverPatientAccess
            ).where(
                CaregiverPatientAccess.caregiver_user_id
                == aarti.id,
                CaregiverPatientAccess.patient_id
                == patient_profile.id,
            )
        )

        if caregiver_access is None:
            caregiver_access = CaregiverPatientAccess(
                caregiver_user_id=aarti.id,
                patient_id=patient_profile.id,
                relationship="Daughter",
                status=CaregiverAccessStatus.ACTIVE,
                initiated_by_user_id=james.id,
                approved_at=datetime.now(
                    timezone.utc
                ),
            )

            db.add(caregiver_access)
            db.flush()

        existing_permissions = {
            permission.permission
            for permission in db.scalars(
                select(CaregiverPermission).where(
                    CaregiverPermission.caregiver_access_id
                    == caregiver_access.id
                )
            ).all()
        }

        desired_permissions = {
            CaregiverPermissionType.APPOINTMENTS,
            CaregiverPermissionType.TRANSPORTATION,
            CaregiverPermissionType.CARE_TASKS,
            CaregiverPermissionType.PROXY_CHECK_IN,
            CaregiverPermissionType.DOCUMENTS,
        }

        for permission in (
            desired_permissions
            - existing_permissions
        ):
            db.add(
                CaregiverPermission(
                    caregiver_access_id=(
                        caregiver_access.id
                    ),
                    permission=permission,
                )
            )

        db.commit()

        print("Development seed complete")
        print("")
        print("Navigator:")
        print("  james@compass.demo")
        print("")
        print("Patient:")
        print("  anisha@compass.demo")
        print("")
        print("Caregiver:")
        print("  aarti@compass.demo")
        print("")
        print("Caregiver permissions:")
        print("  appointments")
        print("  transportation")
        print("  care_tasks")
        print("  proxy_check_in")
        print("  documents")
        print("")
        print(f"Password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()