"""Service requests (faults / repairs) - week-4 tasks 4.1 and 4.3, plus status history.

Every query is filtered by the caller's building. The API uses the service
role key, so this filter - not RLS - is what keeps buildings apart here.
"""

import logging
import re
from typing import Annotated, Any
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, status
from storage3.exceptions import StorageApiError

from app.deps import CurrentManager, CurrentResident, SupabaseDep
from app.rate_limit import rate_limited
from app.schemas import (
    PhotoAttach,
    PhotoType,
    PhotoUploadCreate,
    PhotoUploadOut,
    RequestCreate,
    RequestDetailOut,
    RequestEvent,
    RequestOut,
    Role,
    StatusUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/requests", tags=["requests"])

PHOTO_BUCKET = "request-photos"
PHOTO_URL_TTL_SECONDS = 3600
PHOTO_EXTENSIONS = {PhotoType.jpeg: "jpg", PhotoType.png: "png", PhotoType.webp: "webp"}

COLUMNS = (
    "id, number, building_id, flat_id, author_id, category, description, "
    "location, status, photo_path, created_at, updated_at, "
    "flat:flats(number), author:residents(full_name)"
)
# Shown in the history when the account that changed the status was deleted.
UNKNOWN_ACTOR = "Deleted account"


def _fields(row: dict[str, Any], photo_url: str | None) -> dict[str, Any]:
    return {
        **row,
        "flat_number": row["flat"]["number"],
        "author_name": row["author"]["full_name"],
        "has_photo": row.get("photo_path") is not None,
        "photo_url": photo_url,
    }


def _to_out(row: dict[str, Any]) -> RequestOut:
    return RequestOut.model_validate(_fields(row, None))


async def _history(supabase: SupabaseDep, request_id: str) -> list[RequestEvent]:
    """Status changes of one request, oldest first. Caller has checked the building."""
    response = (
        await supabase.table("request_events")
        .select("status, created_at, actor:residents(full_name)")
        .eq("request_id", request_id)
        .order("id")
        .execute()
    )
    return [
        RequestEvent(
            status=row["status"],
            at=row["created_at"],
            actor_name=row["actor"]["full_name"] if row["actor"] else UNKNOWN_ACTOR,
        )
        for row in response.data
    ]


async def _detail(supabase: SupabaseDep, row: dict[str, Any]) -> RequestDetailOut:
    photo_url = await _signed_photo_url(supabase, row)
    history = await _history(supabase, row["id"])
    return RequestDetailOut.model_validate({**_fields(row, photo_url), "history": history})


async def _get_in_building(
    supabase: SupabaseDep, request_id: UUID | str, building_id: UUID
) -> dict[str, Any]:
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


def _own_photo_path(row: dict[str, Any]) -> str | None:
    """The row's photo path, only if it lies under the request's own folder.

    The service role can sign or delete any object, so a path pointing outside
    <building_id>/<request_id>/ is never trusted.
    """
    path = row.get("photo_path")
    if path and path.startswith(f"{row['building_id']}/{row['id']}/"):
        return path
    if path:
        logger.warning("Request %s has foreign photo_path %r; ignoring it", row["id"], path)
    return None


async def _signed_photo_url(supabase: SupabaseDep, row: dict[str, Any]) -> str | None:
    path = _own_photo_path(row)
    if path is None:
        return None
    try:
        signed = await supabase.storage.from_(PHOTO_BUCKET).create_signed_url(
            path, PHOTO_URL_TTL_SECONDS
        )
    except StorageApiError:
        # A missing object should not hide the request itself.
        logger.warning("Could not sign photo %s of request %s", path, row["id"])
        return None
    return signed["signedURL"]


@router.get("")
async def list_requests(
    supabase: SupabaseDep,
    resident: CurrentResident,
    mine: bool = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[RequestOut]:
    """Requests of the caller's building, newest first. `mine=true` narrows to own.

    Paged: fetch the next page with `offset += limit` until fewer than `limit` return.
    """
    query = (
        supabase.table("requests")
        .select(COLUMNS)
        .eq("building_id", str(resident.building_id))
        .order("created_at", desc=True)
    )
    if mine:
        query = query.eq("author_id", str(resident.id))
    response = await query.range(offset, offset + limit - 1).execute()
    return [_to_out(row) for row in response.data]


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[rate_limited("request_create")])
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
    # Re-read for the joined flat number and author name.
    return _to_out(await _get_in_building(supabase, response.data[0]["id"], resident.building_id))


@router.get("/{request_id}")
async def get_request(
    request_id: UUID, supabase: SupabaseDep, resident: CurrentResident
) -> RequestDetailOut:
    row = await _get_in_building(supabase, request_id, resident.building_id)
    return await _detail(supabase, row)


@router.patch("/{request_id}")
async def update_status(
    request_id: UUID, body: StatusUpdate, supabase: SupabaseDep, manager: CurrentManager
) -> RequestDetailOut:
    """Move a request through pending / in_progress / done. Managers of its building only.

    Setting the current status again is a no-op and adds no history entry.
    """
    # One transaction in the DB: lock, compare, update, log the history entry.
    response = await supabase.rpc(
        "set_request_status",
        {
            "p_request_id": str(request_id),
            "p_building_id": str(manager.building_id),
            "p_status": body.status.value,
            "p_actor_id": str(manager.id),
        },
    ).execute()
    if response.data is not True:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    row = await _get_in_building(supabase, request_id, manager.building_id)
    return await _detail(supabase, row)


async def _photo_target(
    supabase: SupabaseDep, request_id: UUID, resident: CurrentResident
) -> dict[str, Any]:
    """The request row, if the caller may change its photo: author or a building manager."""
    row = await _get_in_building(supabase, request_id, resident.building_id)
    if row["author_id"] != str(resident.id) and resident.role is not Role.manager:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the author can add a photo")
    return row


@router.post("/{request_id}/photo-upload", dependencies=[rate_limited("photo_upload")])
async def create_photo_upload(
    request_id: UUID,
    body: PhotoUploadCreate,
    supabase: SupabaseDep,
    resident: CurrentResident,
) -> PhotoUploadOut:
    """Step 1 of 2: a signed URL for uploading the photo straight to Storage.

    The bytes never pass through this API (Vercel caps function bodies at 4.5 MB).
    The bucket itself enforces the 5 MB size and the JPEG/PNG/WebP types.
    """
    row = await _photo_target(supabase, request_id, resident)
    path = f"{row['building_id']}/{row['id']}/{uuid4()}.{PHOTO_EXTENSIONS[body.content_type]}"
    try:
        signed = await supabase.storage.from_(PHOTO_BUCKET).create_signed_upload_url(path)
    except StorageApiError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Could not prepare a photo upload for request {request_id}",
        ) from exc
    return PhotoUploadOut(bucket=PHOTO_BUCKET, path=path, token=signed["token"])


@router.put("/{request_id}/photo")
async def attach_photo(
    request_id: UUID, body: PhotoAttach, supabase: SupabaseDep, resident: CurrentResident
) -> RequestDetailOut:
    """Step 2 of 2: attach (or replace) the photo uploaded in step 1."""
    row = await _photo_target(supabase, request_id, resident)
    # Only a path this endpoint could have issued for this request is accepted:
    # the service role can read any object, so a foreign path would leak it.
    folder = re.escape(f"{row['building_id']}/{row['id']}/")
    if not re.fullmatch(rf"{folder}[0-9a-f-]{{36}}\.(jpg|png|webp)", body.path):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Photo path does not belong to this request"
        )
    if body.path == row.get("photo_path"):
        return await _detail(supabase, row)

    bucket = supabase.storage.from_(PHOTO_BUCKET)
    try:
        uploaded = await bucket.exists(body.path)
    except StorageApiError:
        uploaded = False
    if not uploaded:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Photo was not uploaded")

    path = body.path
    await supabase.table("requests").update({"photo_path": path}).eq("id", row["id"]).execute()
    # The old object is unreferenced now; failing to delete it only costs storage.
    old_path = _own_photo_path(row)
    if old_path:
        try:
            await bucket.remove([old_path])
        except StorageApiError:
            logger.warning("Could not delete replaced photo %s of request %s", old_path, row["id"])

    updated = await _get_in_building(supabase, request_id, resident.building_id)
    return await _detail(supabase, updated)
