"""Building polls (ITP-40) and resident proposals moderated by managers (ITP-55).

Any resident may propose a poll; it stays `proposed` - seen only by its author
and the building's managers - until a manager approves (`open`) or rejects it
with a reason. A manager's own poll opens immediately. Options are fixed
(for / against / abstain), each resident votes once, and no vote is accepted
after `ends_at`. Results are advisory, not a legally binding owners' vote.

Every query is filtered by the caller's building: the API uses the service role
key, so this filter - not RLS - is what keeps buildings apart here.
"""

from datetime import datetime, timedelta, timezone
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from postgrest.exceptions import APIError
from postgrest.types import CountMethod
from pydantic import TypeAdapter

from app.deps import CurrentManager, CurrentResident, SupabaseDep
from app.rate_limit import rate_limited
from app.schemas import (
    PollCreate,
    PollOut,
    PollReject,
    PollStatus,
    PollVote,
    ResidentOut,
    Role,
)

router = APIRouter(prefix="/api/polls", tags=["polls"])

COLUMNS = (
    "id, building_id, author_id, question, description, ends_at, status, "
    "reject_reason, reviewed_at, created_at, author:residents!polls_author_id_fkey(full_name)"
)
UNIQUE_VIOLATION = "23505"
CHECK_VIOLATION = "23514"  # guard_poll_vote: closed or ended since we read it
# Long enough for any building decision, short enough to catch a typo in the year.
MAX_DURATION = timedelta(days=366)
TIMESTAMP = TypeAdapter(datetime)
VISIBLE_TO_ALL = (PollStatus.open.value, PollStatus.closed.value)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_time(value: str) -> datetime:
    # Pydantic, not fromisoformat: Postgres trims fractional seconds ("10:00:00.5+00"),
    # which Python 3.10's fromisoformat rejects.
    return TIMESTAMP.validate_python(value)


def _iso(value: datetime) -> str:
    # "Z", not "+00:00": a "+" in a query-string filter could be read as a space.
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def _effective_status(row: dict[str, Any], now: datetime) -> PollStatus:
    if row["status"] == PollStatus.open.value and _parse_time(row["ends_at"]) <= now:
        return PollStatus.closed
    return PollStatus(row["status"])


async def _eligible_voters(supabase: SupabaseDep, building_id: UUID) -> int:
    response = (
        await supabase.table("residents")
        .select("id", count=CountMethod.exact, head=True)
        .eq("building_id", str(building_id))
        .eq("role", Role.resident.value)
        .is_("removed_at", "null")
        .execute()
    )
    return response.count or 0


async def _to_out(
    supabase: SupabaseDep, resident: ResidentOut, rows: list[dict[str, Any]]
) -> list[PollOut]:
    """Attach tallies, the eligible-voter count and the caller's own choice."""
    if not rows:
        return []
    ids = [row["id"] for row in rows]
    tallies_response = await supabase.rpc(
        "poll_tallies", {"p_building_id": str(resident.building_id), "p_poll_ids": ids}
    ).execute()
    tallies = {t["poll_id"]: t for t in tallies_response.data or []}
    mine_response = (
        await supabase.table("poll_votes")
        .select("poll_id, choice")
        .eq("resident_id", str(resident.id))
        .in_("poll_id", ids)
        .execute()
    )
    mine = {v["poll_id"]: v["choice"] for v in mine_response.data}
    eligible = await _eligible_voters(supabase, resident.building_id)

    now = _now()
    out: list[PollOut] = []
    for row in rows:
        tally = tallies.get(row["id"], {})
        counts = {
            "votes_for": tally.get("votes_for", 0),
            "votes_against": tally.get("votes_against", 0),
            "votes_abstain": tally.get("votes_abstain", 0),
        }
        out.append(
            PollOut.model_validate(
                {
                    **row,
                    **counts,
                    "status": _effective_status(row, now),
                    "author_name": row["author"]["full_name"],
                    "votes_total": sum(counts.values()),
                    "eligible_voters": eligible,
                    "my_choice": mine.get(row["id"]),
                }
            )
        )
    return out


async def _one_out(supabase: SupabaseDep, resident: ResidentOut, row: dict[str, Any]) -> PollOut:
    return (await _to_out(supabase, resident, [row]))[0]


def _may_see(row: dict[str, Any], resident: ResidentOut) -> bool:
    return (
        row["status"] in VISIBLE_TO_ALL
        or row["author_id"] == str(resident.id)
        or resident.role is Role.manager
    )


async def _get_in_building(
    supabase: SupabaseDep, poll_id: UUID | str, resident: ResidentOut
) -> dict[str, Any]:
    response = (
        await supabase.table("polls")
        .select(COLUMNS)
        .eq("id", str(poll_id))
        .eq("building_id", str(resident.building_id))
        .maybe_single()
        .execute()
    )
    # Another building's poll, or someone else's proposal, is "not found", so
    # its existence does not leak.
    if response is None or response.data is None or not _may_see(response.data, resident):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Poll not found")
    return response.data


@router.get("")
async def list_polls(
    supabase: SupabaseDep,
    resident: CurrentResident,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[PollOut]:
    """Polls of the caller's building, newest first.

    Everyone sees open and closed polls and their own proposals (also rejected
    ones, with the reason). Managers also see every proposal and rejection.
    Paged: fetch the next page with `offset += limit` until fewer than `limit` return.
    """
    query = (
        supabase.table("polls")
        .select(COLUMNS)
        .eq("building_id", str(resident.building_id))
        .order("created_at", desc=True)
        .order("id")
    )
    if resident.role is not Role.manager:
        query = query.or_(f"status.in.({','.join(VISIBLE_TO_ALL)}),author_id.eq.{resident.id}")
    response = await query.range(offset, offset + limit - 1).execute()
    return await _to_out(supabase, resident, response.data)


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[rate_limited("poll_create")])
async def create_poll(
    body: PollCreate, supabase: SupabaseDep, resident: CurrentResident
) -> PollOut:
    """A resident's poll starts as a proposal; a manager's opens immediately."""
    now = _now()
    if body.ends_at <= now:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "ends_at must be in the future")
    if body.ends_at - now > MAX_DURATION:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "ends_at must be within a year from now"
        )
    poll_status = PollStatus.open if resident.role is Role.manager else PollStatus.proposed
    response = (
        await supabase.table("polls")
        .insert(
            {
                "building_id": str(resident.building_id),
                "author_id": str(resident.id),
                "question": body.question,
                "description": body.description,
                "ends_at": _iso(body.ends_at),
                "status": poll_status.value,
            }
        )
        .execute()
    )
    row = await _get_in_building(supabase, response.data[0]["id"], resident)
    return await _one_out(supabase, resident, row)


async def _moderate(
    supabase: SupabaseDep,
    poll_id: UUID,
    manager: ResidentOut,
    *,
    from_status: PollStatus,
    changes: dict[str, Any],
    conflict: str,
    before_end_only: bool,
) -> PollOut:
    """Move a poll out of `from_status` atomically; 404 / 409 when that is not possible.

    `before_end_only` adds "ends_at is still ahead" to the match: approving or
    closing a poll that has already ended means nothing. Rejecting does not need
    it, so a proposal nobody reviewed in time can still leave the queue.
    """
    now = _now()
    query = (
        supabase.table("polls")
        .update({**changes, "reviewed_by": str(manager.id), "reviewed_at": _iso(now)})
        .eq("id", str(poll_id))
        .eq("building_id", str(manager.building_id))
        .eq("status", from_status.value)
    )
    if before_end_only:
        query = query.gt("ends_at", _iso(now))
    updated = await query.execute()
    if not updated.data:
        # Nothing matched: missing / other building (404), or not in from_status
        # or (when required) already past its end date (409).
        await _get_in_building(supabase, poll_id, manager)
        raise HTTPException(status.HTTP_409_CONFLICT, conflict)
    row = await _get_in_building(supabase, poll_id, manager)
    return await _one_out(supabase, manager, row)


@router.post("/{poll_id}/approve", dependencies=[rate_limited("poll_moderate")])
async def approve_poll(poll_id: UUID, supabase: SupabaseDep, manager: CurrentManager) -> PollOut:
    return await _moderate(
        supabase,
        poll_id,
        manager,
        from_status=PollStatus.proposed,
        changes={"status": PollStatus.open.value},
        conflict="Only a proposal that has not ended yet can be approved",
        before_end_only=True,
    )


@router.post("/{poll_id}/reject", dependencies=[rate_limited("poll_moderate")])
async def reject_poll(
    poll_id: UUID, body: PollReject, supabase: SupabaseDep, manager: CurrentManager
) -> PollOut:
    return await _moderate(
        supabase,
        poll_id,
        manager,
        from_status=PollStatus.proposed,
        changes={"status": PollStatus.rejected.value, "reject_reason": body.reason},
        conflict="Only a proposal can be rejected",
        before_end_only=False,
    )


@router.post("/{poll_id}/close", dependencies=[rate_limited("poll_moderate")])
async def close_poll(poll_id: UUID, supabase: SupabaseDep, manager: CurrentManager) -> PollOut:
    """End an open poll before its end date."""
    return await _moderate(
        supabase,
        poll_id,
        manager,
        from_status=PollStatus.open,
        changes={"status": PollStatus.closed.value},
        conflict="Only an open poll can be closed",
        before_end_only=True,
    )


@router.post("/{poll_id}/vote", dependencies=[rate_limited("poll_vote")])
async def vote(
    poll_id: UUID, body: PollVote, supabase: SupabaseDep, resident: CurrentResident
) -> PollOut:
    """Cast the caller's single vote. A second vote is 409, not a change of mind."""
    row = await _get_in_building(supabase, poll_id, resident)
    if resident.role is not Role.resident:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only residents vote")
    if _effective_status(row, _now()) is not PollStatus.open:
        raise HTTPException(status.HTTP_409_CONFLICT, "This poll is not open for voting")
    try:
        await (
            supabase.table("poll_votes")
            .insert(
                {
                    "poll_id": row["id"],
                    "building_id": row["building_id"],
                    "resident_id": str(resident.id),
                    "choice": body.choice.value,
                }
            )
            .execute()
        )
    except APIError as exc:
        if exc.code == CHECK_VIOLATION:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "This poll is not open for voting"
            ) from exc
        if exc.code != UNIQUE_VIOLATION:
            raise
        raise HTTPException(status.HTTP_409_CONFLICT, "You have already voted") from exc
    return await _one_out(supabase, resident, row)
