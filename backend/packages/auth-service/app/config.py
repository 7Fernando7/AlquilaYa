"""
Configuration and settings for the Auth Service
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings from environment variables"""

    # Application
    app_name: str = "FormaconIA Auth Service"
    app_env: str = "development"
    debug: bool = True
    version: str = "0.1.0"

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/formacion_auth"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT Configuration
    jwt_algorithm: str = "RS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    jwt_private_key_path: str = "private.pem"
    jwt_public_key_path: str = "public.pem"

    # Password Configuration
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_digit: bool = True
    password_require_special: bool = True

    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_failed_attempts: int = 3
    rate_limit_window_minutes: int = 10
    rate_limit_lock_minutes: int = 15

    # Email Configuration
    email_provider: str = "sendgrid"  # or "aws_ses"
    sendgrid_api_key: str = ""
    email_from: str = "noreply@formacion.ai"
    email_from_name: str = "FormaconIA"

    # AWS SES (if using)
    aws_ses_region: str = "eu-west-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # CORS Configuration
    allowed_origins: list = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8001",
    ]

    # Security
    secret_key: str = "your-secret-key-change-in-production"

    # Logging
    log_level: str = "INFO"

    # Token Expiry
    email_verification_expire_hours: int = 48
    password_reset_expire_hours: int = 24

    # Session
    session_expire_days: int = 7

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
