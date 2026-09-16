"""Supabase client lifecycle for the backend.

The backend authenticates with the SERVICE ROLE key, which bypasses row-level
security. It must never be exposed to the browser - the frontend uses the anon
key, or goes through this API.

A single client is created at application startup and reused, rather than being
rebuilt per request.
"""

from supabase import AsyncClient, AsyncClientOptions, acreate_client

from app.config import Settings

_client: AsyncClient | None = None


async def init_supabase(settings: Settings) -> AsyncClient | None:
    """Create the shared client. Returns None when Supabase is not configured."""
    global _client

    if not settings.supabase_configured:
        return None

    # Narrowing for the type checker - supabase_configured guarantees both.
    assert settings.supabase_url is not None
    assert settings.supabase_service_role_key is not None

    _client = await acreate_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
        options=AsyncClientOptions(
            # There is no interactive session on a server: nothing to refresh
            # and nowhere to persist it to.
            auto_refresh_token=False,
            persist_session=False,
        ),
    )
    return _client


def get_client() -> AsyncClient | None:
    """The shared client, or None when Supabase is not configured."""
    return _client


async def close_supabase() -> None:
    global _client
    _client = None
