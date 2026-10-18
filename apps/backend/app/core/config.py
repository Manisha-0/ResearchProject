from functools import lru_cache

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):
    app_name: str = "Project Compass API"
    app_env: str = "development"
    debug: bool = False

    # Database
    database_url: str

    # Frontend
    frontend_url: str = (
        "http://localhost:3000"
    )

    # Authentication / JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Bootstrap organization / admin
    bootstrap_organization_name: str
    bootstrap_organization_slug: str
    bootstrap_admin_email: str
    bootstrap_admin_password: str

    # Account invitations
    account_invitation_expire_hours: int = 24

    activation_url: str = (
        "http://localhost:3000/activate"
    )

    # Email
    #
    # Supported providers:
    # - console
    # - resend
    email_provider: str = "console"

    # Resend
    #
    # Keep the API key server-side only.
    # Do not expose this through the frontend.
    resend_api_key: str | None = None

    resend_from_email: str = (
        "Compass <anish.gyawali7@gmail.com>"
    )

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

    # Appointment reminder calls
    #
    # The call agent phones patients who have an
    # appointment in the next 48 hours.
    #
    # Without Twilio credentials only the browser
    # call simulator is available.
    clinic_timezone: str = "America/Chicago"
    reminder_call_window_hours: int = 48
    reminder_call_max_attempts: int = 2
    reminder_call_retry_minutes: int = 120
    reminder_call_use_ai: bool = True
    reminder_call_auto_dial: bool = False
    reminder_call_poll_minutes: int = 30
    reminder_call_cron_secret: str | None = None

    # "scripted" = fixed questions, "agent" = Gemini agent.
    # The navigator can pick either for each call; this is
    # the default and what automatic calls use.
    reminder_call_mode: str = "scripted"
    # Leave empty to use GEMINI_MODEL.
    reminder_call_agent_model: str | None = None

    # A caller who asks for a person is put through to their
    # navigator only during these hours (clinic time zone,
    # Monday to Friday). Otherwise a call back is booked.
    clinic_hours_start: int = 9
    clinic_hours_end: int = 17

    # Public URL of this API. Twilio must be able
    # to reach it (for local work use ngrok).
    public_api_url: str = "http://localhost:8000"

    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None
    twilio_voice: str = "Polly.Joanna"

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