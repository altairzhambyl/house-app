"""Service requests (faults / repairs) - week-4 tasks 4.1 and 4.3.

Every query is filtered by the caller's building. The API uses the service
role key, so this filter - not RLS - is what keeps buildings apart here.
"""

import logging
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, UploadFile, status
from storage3.exceptions import StorageApiError

from app.deps import CurrentResident, SupabaseDep
from app.schemas import RequestCreate, RequestOut, Role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/requests", tags=["requests"])

PHOTO_BUCKET = "request-photos"
PHOTO_URL_TTL_SECONDS = 3600
MAX_PHOTO_BYTES = 5 * 1024 * 1024
PHOTO_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

COLUMNS = (
    "id, number, building_id, flat_id, author_id, category, description, "
    "location, status, photo_path, created_at, updated_at"
)


def _to_out(row: dict[str, Any], photo_url: str | None = None) -> RequestOut:
    return RequestOut.model_validate(
        {**row, "has_photo": row.get("photo_path") is not None, "photo_url": photo_url}
    )


async def _get_in_building(supabase: SupabaseDep, request_id: UUID, building_id: UUID) -> dict:
    response = (
        await supabase.table("requests")
        .select(COLUMNS)
        .eq("id", str(request_id))
        .eq("building_id", str(building_id))
        .maybe_single()
        .execute()
    )
    # A request in another building is reported as missing, not forbidden,
    # so its existence does not leak across buildings.
    if response is None or response.data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    return response.data


@router.get("")
async def list_requests(
    supabase: SupabaseDep, resident: CurrentResident, mine: bool = False
) -> list[RequestOut]:
    """Requests of the caller's building, newest first. `mine=true` narrows to own."""
    query = (
        supabase.table("requests")
        .select(COLUMNS)
        .eq("building_id", str(resident.building_id))
        .order("created_at", desc=True)
    )
    if mine:
        query = query.eq("author_id", str(resident.id))
    response = await query.execute()
    return [_to_out(row) for row in response.data]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_request(
    body: RequestCreate, supabase: SupabaseDep, resident: CurrentResident
) -> RequestOut:
    if resident.flat_id is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only residents with a flat can file requests"
        )
    response = (
        await supabase.table("requests")
        .insert(
            {
                "building_id": str(resident.building_id),
                "flat_id": str(resident.flat_id),
                "author_id": str(resident.id),
                "category": body.category.value,
                "description": body.description,
                "location": body.location,
            }
        )
        .execute()
    )
    return _to_out(response.data[0])


@router.get("/{request_id}")
async def get_request(
    request_id: UUID, supabase: SupabaseDep, resident: CurrentResident
) -> RequestOut:
    row = await _get_in_building(supabase, request_id, resident.building_id)
    photo_url = None
    if row["photo_path"]:
        signed = await supabase.storage.from_(PHOTO_BUCKET).create_signed_url(
            row["photo_path"], PHOTO_URL_TTL_SECONDS
        )
        photo_url = signed["signedURL"]
    return _to_out(row, photo_url)


@router.put("/{request_id}/photo")
async def upload_photo(
    request_id: UUID, photo: UploadFile, supabase: SupabaseDep, resident: CurrentResident
) -> RequestOut:
    """Attach (or replace) the request's photo. Author or a building manager only."""
    row = await _get_in_building(supabase, request_id, resident.building_id)
    if row["author_id"] != str(resident.id) and resident.role is not Role.manager:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the author can add a photo")

    extension = PHOTO_TYPES.get(photo.content_type or "")
    if extension is None:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Photo must be JPEG, PNG or WebP"
        )
    # Read one byte past the limit to detect oversize without trusting headers.
    data = await photo.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Photo must be 5 MB or smaller")
    if not data:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Photo is empty")

    bucket = supabase.storage.from_(PHOTO_BUCKET)
    path = f"{row['building_id']}/{row['id']}/{uuid4()}.{extension}"
    try:
        await bucket.upload(path, data, {"content-type": photo.content_type or ""})
    except StorageApiError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"Photo upload for request {request_id} failed"
        ) from exc

    response = (
        await supabase.table("requests").update({"photo_path": path}).eq("id", row["id"]).execute()
    )
    # The old object is unreferenced now; failing to delete it only costs storage.
    if row["photo_path"]:
        try:
            await bucket.remove([row["photo_path"]])
        except StorageApiError:
            logger.warning(
                "Could not delete replaced photo %s of request %s", row["photo_path"], row["id"]
            )

    signed = await bucket.create_signed_url(path, PHOTO_URL_TTL_SECONDS)
    return _to_out(response.data[0], signed["signedURL"])
