"""Flats of the manager's building and their join codes.

Join codes are credentials, so only managers of the flat's building see them.
"""

import re
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from postgrest.exceptions import APIError

from app import join_codes
from app.deps import CurrentManager, SupabaseDep
from app.schemas import FlatOut

router = APIRouter(prefix="/api/flats", tags=["flats"])

COLUMNS = "id, number, join_code, residents(count)"
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
            .eq("building_id", str(manager.building_id))
            .order("id")
            .range(len(flats), len(flats) + PAGE_SIZE - 1)
            .execute()
        )
        flats.extend(_to_out(row) for row in response.data)
        if len(response.data) < PAGE_SIZE:
            break
    return sorted(flats, key=lambda flat: _natural_key(flat.number))


@router.post("/{flat_id}/rotate-code")
async def rotate_code(flat_id: UUID, supabase: SupabaseDep, manager: CurrentManager) -> FlatOut:
    """Replace the flat's join code, e.g. after it leaked. Existing residents stay linked."""
    await _get_in_building(supabase, flat_id, manager.building_id)
    for attempt in range(ROTATE_ATTEMPTS):
        try:
            await (
                supabase.table("flats")
                .update({"join_code": join_codes.generate()})
                .eq("id", str(flat_id))
                .eq("building_id", str(manager.building_id))
                .execute()
            )
            break
        except APIError as exc:
            # A collision in 31^10 codes is next to impossible, but not impossible.
            if exc.code != UNIQUE_VIOLATION or attempt == ROTATE_ATTEMPTS - 1:
                raise
    return await _get_in_building(supabase, flat_id, manager.building_id)
