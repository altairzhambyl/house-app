"""Who the caller is, and linking a fresh account to a flat by its join code."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from postgrest.exceptions import APIError

from app import join_codes
from app.deps import CurrentUser, SupabaseDep, load_resident
from app.rate_limit import rate_limited
from app.schemas import JoinRequest, MeOut, ResidentOut

router = APIRouter(prefix="/api", tags=["residents"])

UNIQUE_VIOLATION = "23505"


@router.get("/me")
async def me(supabase: SupabaseDep, user: CurrentUser) -> MeOut:
    """The signed-in user and, once they have joined a flat, their resident profile."""
    return MeOut(
        user_id=user.id,
        email=user.email,
        resident=await load_resident(supabase, user.id),
    )


@router.post("/join", dependencies=[rate_limited("join", ip_action="join_ip")])
async def join(body: JoinRequest, supabase: SupabaseDep, user: CurrentUser) -> ResidentOut:
    """Link the caller to the flat that owns `code`. Several residents may share a flat.

    A resident a manager removed may join again, but only with a current code.
    """
    if await load_resident(supabase, user.id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This account is already linked to a flat")

    not_found = HTTPException(status.HTTP_404_NOT_FOUND, "No flat has this join code")
    code = join_codes.normalize(body.code)
    if code is None:
        raise not_found
    response = (
        await supabase.table("flats")
        .select("id, building_id")
        .eq("join_code", code)
        .maybe_single()
        .execute()
    )
    if response is None or response.data is None:
        raise not_found
    flat = response.data

    try:
        await (
            supabase.table("residents")
            .insert(
                {
                    "id": str(user.id),
                    "building_id": flat["building_id"],
                    "flat_id": flat["id"],
                    "full_name": body.full_name,
                    "role": "resident",
                }
            )
            .execute()
        )
    except APIError as exc:
        if exc.code != UNIQUE_VIOLATION:
            raise
        # The row exists: either a manager removed this account from its flat
        # (re-activate it with the new flat), or two joins raced on the primary key.
        # The removed_at condition lets only one concurrent rejoin win. created_at
        # restarts too: it is the "joined" date managers see and sort by.
        rejoined = (
            await supabase.table("residents")
            .update(
                {
                    "building_id": flat["building_id"],
                    "flat_id": flat["id"],
                    "full_name": body.full_name,
                    "removed_at": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .eq("id", str(user.id))
            .eq("role", "resident")
            .not_.is_("removed_at", "null")
            .execute()
        )
        if not rejoined.data:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "This account is already linked to a flat"
            ) from exc

    resident = await load_resident(supabase, user.id)
    if resident is None:
        raise RuntimeError(f"Resident row for user {user.id} vanished right after joining")
    return resident
