"""The building channel: one shared thread per building, replacing the WhatsApp group.

Clients poll GET every few seconds. Every query is filtered by the caller's building.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Query, status
from pydantic import AwareDatetime

from app.deps import CurrentResident, SupabaseDep
from app.schemas import MessageCreate, MessageOut

router = APIRouter(prefix="/api/messages", tags=["messages"])

COLUMNS = "id, author_id, body, created_at, author:residents(full_name, role, flat:flats(number))"


def _to_out(row: dict[str, Any]) -> MessageOut:
    author = row["author"]
    flat = author.get("flat")
    return MessageOut.model_validate(
        {
            **row,
            "author_name": author["full_name"],
            "role": author["role"],
            "flat_number": flat["number"] if flat else None,
        }
    )


@router.get("")
async def list_messages(
    supabase: SupabaseDep,
    resident: CurrentResident,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    # Must carry a timezone: a naive value would be read in the DB session's zone.
    before: AwareDatetime | None = None,
) -> list[MessageOut]:
    """Messages of the caller's building, newest first.

    Paged by cursor: for older messages pass the last message's `created_at`
    as `before`, until fewer than `limit` return.
    """
    query = (
        supabase.table("messages")
        .select(COLUMNS)
        .eq("building_id", str(resident.building_id))
        .order("created_at", desc=True)
        .order("id", desc=True)
    )
    if before is not None:
        query = query.lt("created_at", before.isoformat())
    response = await query.limit(limit).execute()
    return [_to_out(row) for row in response.data]


@router.post("", status_code=status.HTTP_201_CREATED)
async def post_message(
    body: MessageCreate, supabase: SupabaseDep, resident: CurrentResident
) -> MessageOut:
    response = (
        await supabase.table("messages")
        .insert(
            {
                "building_id": str(resident.building_id),
                "author_id": str(resident.id),
                "body": body.body,
            }
        )
        .execute()
    )
    row = response.data[0]
    return MessageOut.model_validate(
        {
            **row,
            "author_name": resident.full_name,
            "role": resident.role,
            "flat_number": resident.flat_number,
        }
    )
