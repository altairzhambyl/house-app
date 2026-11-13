"""Building news ("news" in the week-4 plan), from the management company and residents.

ITP-51: a manager's post is published at once. A resident's post starts as
`pending` and is visible only to its author and the building's managers until a
manager approves (`published`) or rejects (`rejected`, optional reason) it.

Every query is filtered by the caller's building. The API uses the service role
key, so this filter - not RLS - is what keeps buildings apart here.
"""

from datetime import datetime, timezone
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.deps import CurrentManager, CurrentResident, SupabaseDep
from app.rate_limit import enforce_limit, rate_limited
from app.schemas import (
    AnnouncementCreate,
    AnnouncementOut,
    AnnouncementReject,
    AnnouncementStatus,
    Role,
)

router = APIRouter(prefix="/api/announcements", tags=["announcements"])

# announcements has two foreign keys to residents (author_id, reviewed_by), so
# the author embed names its constraint.
COLUMNS = (
    "id, building_id, author_id, title, body, created_at, status, reject_reason, reviewed_at, "
    "author:residents!announcements_author_id_fkey(role, flat:flats(number))"
)


def _to_out(row: dict[str, Any]) -> AnnouncementOut:
    author = row["author"]
    flat = author.get("flat")
    return AnnouncementOut.model_validate(
        {
            **row,
            "is_official": author["role"] == Role.manager.value,
            "author_flat_number": flat["number"] if flat else None,
        }
    )


async def _get_in_building(
    supabase: SupabaseDep, announcement_id: UUID | str, building_id: UUID
) -> dict[str, Any]:
    response = (
        await supabase.table("announcements")
        .select(COLUMNS)
        .eq("id", str(announcement_id))
        .eq("building_id", str(building_id))
        .maybe_single()
        .execute()
    )
    # Another building's post is "not found", so its existence does not leak.
    if response is None or response.data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "News not found")
    return response.data


@router.get("")
async def list_announcements(
    supabase: SupabaseDep,
    resident: CurrentResident,
    status_filter: Annotated[AnnouncementStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[AnnouncementOut]:
    """News of the caller's building, newest first.

    Residents get published news plus their own posts in any state; managers get
    every post of the building. `status=pending` narrows to the moderation queue
    (for a resident: their own posts awaiting review).

    Paged: fetch the next page with `offset += limit` until fewer than `limit` return.
    """
    query = (
        supabase.table("announcements")
        .select(COLUMNS)
        .eq("building_id", str(resident.building_id))
        .order("created_at", desc=True)
        .order("id", desc=True)
    )
    if resident.role is not Role.manager:
        query = query.or_(
            f"status.eq.{AnnouncementStatus.published.value},author_id.eq.{resident.id}"
        )
    if status_filter is not None:
        query = query.eq("status", status_filter.value)
    response = await query.range(offset, offset + limit - 1).execute()
    return [_to_out(row) for row in response.data]


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[rate_limited("announcement")])
async def create_announcement(
    body: AnnouncementCreate, supabase: SupabaseDep, resident: CurrentResident
) -> AnnouncementOut:
    """A manager's post is published at once; a resident's waits for review."""
    is_manager = resident.role is Role.manager
    if not is_manager:
        await enforce_limit(supabase, "resident_news", resident.id)
    new_status = AnnouncementStatus.published if is_manager else AnnouncementStatus.pending
    response = (
        await supabase.table("announcements")
        .insert(
            {
                "building_id": str(resident.building_id),
                "author_id": str(resident.id),
                "title": body.title,
                "body": body.body,
                "status": new_status.value,
            }
        )
        .execute()
    )
    # Re-read for the author's role and flat.
    return _to_out(await _get_in_building(supabase, response.data[0]["id"], resident.building_id))


async def _review(
    supabase: SupabaseDep,
    announcement_id: UUID,
    manager: CurrentManager,
    changes: dict[str, Any],
) -> AnnouncementOut:
    """Move a pending post on. Conditional on `status = pending`, so two managers
    acting at once cannot both succeed."""
    response = (
        await supabase.table("announcements")
        .update(
            {
                **changes,
                "reviewed_by": str(manager.id),
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(announcement_id))
        .eq("building_id", str(manager.building_id))
        .eq("status", AnnouncementStatus.pending.value)
        .execute()
    )
    # Nothing updated: either not in this building (404) or not pending (409).
    row = await _get_in_building(supabase, announcement_id, manager.building_id)
    if not response.data:
        raise HTTPException(status.HTTP_409_CONFLICT, f"News is already {row['status']}")
    return _to_out(row)


@router.post("/{announcement_id}/approve", dependencies=[rate_limited("news_moderation")])
async def approve_announcement(
    announcement_id: UUID, supabase: SupabaseDep, manager: CurrentManager
) -> AnnouncementOut:
    """Publish a resident's pending post to the whole building."""
    return await _review(
        supabase, announcement_id, manager, {"status": AnnouncementStatus.published.value}
    )


@router.post("/{announcement_id}/reject", dependencies=[rate_limited("news_moderation")])
async def reject_announcement(
    announcement_id: UUID,
    supabase: SupabaseDep,
    manager: CurrentManager,
    body: AnnouncementReject | None = None,
) -> AnnouncementOut:
    """Turn down a resident's pending post; the optional reason is shown to its author."""
    return await _review(
        supabase,
        announcement_id,
        manager,
        {
            "status": AnnouncementStatus.rejected.value,
            "reject_reason": body.reason if body else None,
        },
    )
