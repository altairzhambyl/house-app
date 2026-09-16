from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Backend configuration, read from the environment or apps/api/.env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase credentials are deliberately optional. A fresh checkout has no
    # .env, and `pnpm dev` must still start for anyone who has not been given
    # credentials yet - they get a clearly-degraded API, not a crash on boot.
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
