"""Building news from the management company ("news" in the week-4 plan)."""

from fastapi import APIRouter, HTTPException, status

from app.deps import CurrentResident, SupabaseDep
from app.schemas import AnnouncementCreate, AnnouncementOut, Role

router = APIRouter(prefix="/api/announcements", tags=["announcements"])

COLUMNS = "id, building_id, author_id, title, body, created_at"


@router.get("")
async def list_announcements(
    supabase: SupabaseDep, resident: CurrentResident
) -> list[AnnouncementOut]:
    response = (
        await supabase.table("announcements")
        .select(COLUMNS)
        .eq("building_id", str(resident.building_id))
        .order("created_at", desc=True)
        .execute()
    )
    return [AnnouncementOut.model_validate(row) for row in response.data]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_announcement(
    body: AnnouncementCreate, supabase: SupabaseDep, resident: CurrentResident
) -> AnnouncementOut:
    if resident.role is not Role.manager:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only managers can post news")
    response = (
        await supabase.table("announcements")
        .insert(
            {
                "building_id": str(resident.building_id),
                "author_id": str(resident.id),
                "title": body.title,
                "body": body.body,
            }
        )
        .execute()
    )
    return AnnouncementOut.model_validate(response.data[0])
