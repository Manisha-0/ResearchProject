from functools import lru_cache

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):
    app_name: str = "Project Compass API"
    app_env: str = "development"
    debug: bool = False

    database_url: str

    frontend_url: str = (
        "http://localhost:3000"
    )

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    bootstrap_organization_name: str
    bootstrap_organization_slug: str
    bootstrap_admin_email: str
    bootstrap_admin_password: str

    account_invitation_expire_hours: int = 24

    activation_url: str = (
        "http://localhost:3000/activate"
    )

    email_provider: str = "console"

    # Supabase Storage — S3 compatible API
    supabase_storage_bucket: str = "compass"
    supabase_s3_endpoint: str
    supabase_s3_region: str
    supabase_s3_access_key_id: str
    supabase_s3_secret_access_key: str

    # Gemini
    gemini_api_key: str
    gemini_model: str = (
        "gemini-3.6-flash"
    )

    # Maximum amount of extracted PDF text
    # sent to Gemini for one summary.
    document_summary_max_characters: int = (
        100_000
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()