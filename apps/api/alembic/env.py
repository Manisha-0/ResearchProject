from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

from app.core.config import settings
from app.db.base import Base



# Import models here so Alembic can detect them
# We will add model imports as we create models.
from app.models.organization import Organization
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.caregiver import CaregiverProfile
from app.models.navigator import NavigatorProfile
from app.models.assignment import Assignment
from app.models.care_journey import CareJourneyItem
from app.models.appointment import Appointment
from app.models.document import Document
from app.models.check_in import CheckIn

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Alembic uses this to detect changes in SQLAlchemy models
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in offline mode."""

    url = settings.DATABASE_URL

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in online mode."""

    configuration = config.get_section(config.config_ini_section)

    configuration["sqlalchemy.url"] = settings.DATABASE_URL

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()