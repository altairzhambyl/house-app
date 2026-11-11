"""Flats of the manager's building, their join codes and their residents.

Join codes are credentials, so only managers of the flat's building see them.
"""

import re
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from postgrest.exceptions import APIError

from app import join_codes
from app.deps import CurrentManager, SupabaseDep
from app.rate_limit import rate_limited
from app.schemas import FlatOut, FlatResidentOut

router = APIRouter(prefix="/api/flats", tags=["flats"])

COLUMNS = "id, number, join_code, residents(count)"
# Applied to the embedded count: removed residents no longer live in the flat.
ACTIVE_RESIDENTS = ("residents.removed_at", "null")
# PostgREST caps a response at max_rows (supabase/config.toml); page past it.
PAGE_SIZE = 1000
UNIQUE_VIOLATION = "23505"
ROTATE_ATTEMPTS = 3


def _to_out(row: dict[str, Any]) -> FlatOut:
    counts = row.get("residents") or [{"count": 0}]
    return FlatOut.model_validate({**row, "resident_count": counts[0]["count"]})


def _natural_key(number: str) -> tuple[int, str]:
    """Order "7A" before "14B": leading digits numerically, then the rest."""
    match = re.match(r"\d+", number)
    return (int(match.group()) if match else 0, number)


async def _get_in_building(supabase: SupabaseDep, flat_id: UUID, building_id: UUID) -> FlatOut:
    response = (
        await supabase.table("flats")
        .select(COLUMNS)
        .is_(*ACTIVE_RESIDENTS)
        .eq("id", str(flat_id))
        .eq("building_id", str(building_id))
        .maybe_single()
        .execute()
    )
    # Another building's flat is "not found", so its existence does not leak.
    if response is None or response.data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Flat not found")
    return _to_out(response.data)


@router.get("")
async def list_flats(supabase: SupabaseDep, manager: CurrentManager) -> list[FlatOut]:
    """Every flat of the manager's building with its join code, ordered by number."""
    flats: list[FlatOut] = []
    while True:
        response = (
            await supabase.table("flats")
            .select(COLUMNS)
            .is_(*ACTIVE_RESIDENTS)
            .eq("building_id", str(manager.building_id))
            .order("id")
            .range(len(flats), len(flats) + PAGE_SIZE - 1)
            .execute()
        )
        flats.extend(_to_out(row) for row in response.data)
        if len(response.data) < PAGE_SIZE:
            break
    return sorted(flats, key=lambda flat: _natural_key(flat.number))


@router.post("/{flat_id}/rotate-code", dependencies=[rate_limited("flat_admin")])
async def rotate_code(flat_id: UUID, supabase: SupabaseDep, manager: CurrentManager) -> FlatOut:
    """Replace the flat's join code, e.g. after it leaked.

    Residents who already joined stay linked; remove them one by one with
    DELETE /api/flats/{flat_id}/residents/{resident_id} (which rotates the code too).
    """
    await _get_in_building(supabase, flat_id, manager.building_id)
    await _rotate(supabase, flat_id, manager.building_id)
    return await _get_in_building(supabase, flat_id, manager.building_id)


async def _rotate(supabase: SupabaseDep, flat_id: UUID, building_id: UUID) -> None:
    """Give the flat a fresh join code. The caller has checked the building."""
    for attempt in range(ROTATE_ATTEMPTS):
        try:
            await (
                supabase.table("flats")
                .update({"join_code": join_codes.generate()})
                .eq("id", str(flat_id))
                .eq("building_id", str(building_id))
                .execute()
            )
            return
        except APIError as exc:
            # A collision in 31^10 codes is next to impossible, but not impossible.
            if exc.code != UNIQUE_VIOLATION or attempt == ROTATE_ATTEMPTS - 1:
                raise


@router.get("/{flat_id}/residents")
async def list_flat_residents(
    flat_id: UUID, supabase: SupabaseDep, manager: CurrentManager
) -> list[FlatResidentOut]:
    """The flat's active residents, oldest first. Managers of its building only."""
    await _get_in_building(supabase, flat_id, manager.building_id)
    residents: list[FlatResidentOut] = []
    while True:
        response = (
            await supabase.table("residents")
            .select("id, full_name, created_at")
            .eq("flat_id", str(flat_id))
            .eq("building_id", str(manager.building_id))
            .eq("role", "resident")
            .is_("removed_at", "null")
            .order("created_at")
            .order("id")
            .range(len(residents), len(residents) + PAGE_SIZE - 1)
            .execute()
        )
        residents.extend(FlatResidentOut.model_validate(row) for row in response.data)
        if len(response.data) < PAGE_SIZE:
            break
    return residents


@router.delete("/{flat_id}/residents/{resident_id}", dependencies=[rate_limited("flat_admin")])
async def remove_flat_resident(
    flat_id: UUID, resident_id: UUID, supabase: SupabaseDep, manager: CurrentManager
) -> FlatOut:
    """Remove a resident from the flat: they lose access on their next request.

    Their row is kept (flagged `removed_at`), so the requests, status history and
    channel messages they wrote stay with the building. The flat's join code is
    rotated in the same call: otherwise the removed person could rejoin at once
    with the code they already have. Other residents of the flat stay linked;
    the response carries the new code for future members.
    Managers - including the caller - never match, so they cannot be removed here.
    """
    await _get_in_building(supabase, flat_id, manager.building_id)
    response = (
        await supabase.table("residents")
        .update({"removed_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", str(resident_id))
        .eq("flat_id", str(flat_id))
        .eq("building_id", str(manager.building_id))
        .eq("role", "resident")
        .is_("removed_at", "null")
        .execute()
    )
    if not response.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resident not found in this flat")
    await _rotate(supabase, flat_id, manager.building_id)
    return await _get_in_building(supabase, flat_id, manager.building_id)
