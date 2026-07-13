from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from cryptography.fernet import Fernet
from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    api_host: str 
    api_port: int

    database_url: str

    jwt_secret_key: str
    jwt_algorithm: str
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    refresh_token_cookie_name: str = "refresh_token"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    api_key_encryption_key: SecretStr

    debug: bool = False

    agent_max_iterations: int = 5

    bg_model: str
    bg_image_model: str
    bg_image_size: str = "1536x1024"
    bg_image_quality: str = "medium"

    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: SecretStr
    minio_bucket: str
    minio_secure: bool

    redis_url: str = "redis://localhost:6379/0"
    draft_ttl_seconds: int = 259200

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("api_key_encryption_key")
    @classmethod
    def validate_api_key_encryption_key(cls, value: SecretStr) -> SecretStr:
        try:
            Fernet(value.get_secret_value().encode("utf-8"))
        except (TypeError, ValueError) as error:
            raise ValueError("must be a valid Fernet key") from error
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()