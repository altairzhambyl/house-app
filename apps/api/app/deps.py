from typing import Annotated, Any
from uuid import UUID

import httpx
from fastapi import Depends, Header, HTTPException, status
from supabase import AsyncClient, AuthError
from supabase_auth.errors import AuthApiError, AuthRetryableError, AuthUnknownError
from supabase_auth.types import User

from app.schemas import ResidentOut, Role
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
    auth_unavailable = HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Sign-in service is temporarily unavailable, try again shortly",
    )

    if not authorization or not authorization.lower().startswith("bearer "):
        raise unauthorized

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise unauthorized

    try:
        response = await supabase.auth.get_user(token)
    except (AuthRetryableError, AuthUnknownError, httpx.TransportError) as exc:
        # Supabase Auth is down or unreachable: the token may be perfectly valid,
        # and a 401 here would make the frontend sign the user out.
        raise auth_unavailable from exc
    except AuthApiError as exc:
        if exc.status >= 500:
            raise auth_unavailable from exc
        raise unauthorized from exc
    except AuthError as exc:
        raise unauthorized from exc

    if response is None or response.user is None:
        raise unauthorized

    return response.user


CurrentUser = Annotated[User, Depends(get_current_user)]


RESIDENT_COLUMNS = (
    "id, building_id, flat_id, full_name, role, building:buildings(name), flat:flats(number)"
)


def resident_from_row(row: dict[str, Any]) -> ResidentOut:
    """Flatten a residents row selected with RESIDENT_COLUMNS."""
    flat = row.get("flat")
    return ResidentOut.model_validate(
        {
            **row,
            "building_name": row["building"]["name"],
            "flat_number": flat["number"] if flat else None,
        }
    )


async def load_resident(supabase: AsyncClient, user_id: UUID | str) -> ResidentOut | None:
    """The user's resident profile, or None if they have not joined a flat yet."""
    response = (
        await supabase.table("residents")
        .select(RESIDENT_COLUMNS)
        .eq("id", str(user_id))
        .maybe_single()
        .execute()
    )
    if response is None or response.data is None:
        return None
    return resident_from_row(response.data)


async def get_current_resident(supabase: SupabaseDep, user: CurrentUser) -> ResidentOut:
    """The caller's resident profile, which fixes the building they may access.

    The service role key bypasses row-level security, so every building-scoped
    query in this API must filter by `resident.building_id` from here.
    """
    resident = await load_resident(supabase, user.id)
    if resident is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not linked to a building yet",
        )
    return resident


CurrentResident = Annotated[ResidentOut, Depends(get_current_resident)]


async def get_current_manager(resident: CurrentResident) -> ResidentOut:
    if resident.role is not Role.manager:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only managers can do this")
    return resident


CurrentManager = Annotated[ResidentOut, Depends(get_current_manager)]
