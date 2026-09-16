from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from supabase import AsyncClient, AuthError
from supabase_auth.types import User

from app.supabase_client import get_client


def require_supabase() -> AsyncClient:
    client = get_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Supabase is not configured. Set SUPABASE_URL and "
                "SUPABASE_SERVICE_ROLE_KEY in apps/api/.env - see .env.example."
            ),
        )
    return client


SupabaseDep = Annotated[AsyncClient, Depends(require_supabase)]


async def get_current_user(
    supabase: SupabaseDep,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    """Resolve the caller from a Supabase Auth bearer token."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid bearer token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not authorization or not authorization.lower().startswith("bearer "):
        raise unauthorized

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise unauthorized

    try:
        response = await supabase.auth.get_user(token)
    except AuthError as exc:
        raise unauthorized from exc

    if response is None or response.user is None:
        raise unauthorized

    return response.user


CurrentUser = Annotated[User, Depends(get_current_user)]
