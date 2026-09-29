"""Who the caller is, and linking a fresh account to a flat by its join code."""

from fastapi import APIRouter, HTTPException, status
from postgrest.exceptions import APIError

from app import join_codes
from app.deps import CurrentUser, SupabaseDep, load_resident
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


@router.post("/join")
async def join(body: JoinRequest, supabase: SupabaseDep, user: CurrentUser) -> ResidentOut:
    """Link the caller to the flat that owns `code`. Several residents may share a flat."""
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
        # Two concurrent joins for one account: the second loses on the primary key.
        if exc.code == UNIQUE_VIOLATION:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "This account is already linked to a flat"
            ) from exc
        raise

    resident = await load_resident(supabase, user.id)
    if resident is None:
        raise RuntimeError(f"Resident row for user {user.id} vanished right after joining")
    return resident
