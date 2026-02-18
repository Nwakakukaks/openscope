"""OpenScope configuration."""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Groq AI
    groq_api_key: Optional[str] = None

    # GitHub
    github_token: Optional[str] = None
    github_owner: Optional[str] = None

    # Scope API
    scope_api_url: str = "http://localhost:8000"

    # Cloud (for remote inference)
    scope_cloud_app_id: Optional[str] = None
    scope_cloud_api_key: Optional[str] = None
    scope_cloud_user_id: Optional[str] = None

    # App
    app_name: str = "OpenScope"
    debug: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings."""
    return Settings()


# Singleton instance for use in main and elsewhere
settings = get_settings()
