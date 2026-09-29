"""API models. Enum values mirror the Postgres enums in supabase/migrations."""

from datetime import datetime
from enum import Enum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, StringConstraints, field_validator


# Trimmed, non-blank text - matches the `length(trim(...)) > 0` checks in the DB.
def _text(max_length: int) -> StringConstraints:
    # Postgres text cannot store NUL; reject it here instead of failing in the DB.
    return StringConstraints(
        strip_whitespace=True, min_length=1, max_length=max_length, pattern=r"^[^\x00]*$"
    )


class Role(str, Enum):
    resident = "resident"
    manager = "manager"


class RequestStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"


class RequestCategory(str, Enum):
    plumbing = "plumbing"
    electrical = "electrical"
    locksmith = "locksmith"
    sanitation = "sanitation"
    cleaning = "cleaning"
    other = "other"


class ResidentOut(BaseModel):
    """The caller's profile. `building_id` fixes what they may access."""

    id: UUID
    building_id: UUID
    building_name: str
    flat_id: UUID | None
    flat_number: str | None
    full_name: str
    role: Role


class MeOut(BaseModel):
    user_id: UUID
    email: str | None
    # None: signed in, but not linked to a flat yet - the client shows "join".
    resident: ResidentOut | None


class JoinRequest(BaseModel):
    code: Annotated[str, StringConstraints(max_length=64)]
    full_name: Annotated[str, _text(100)]


class FlatOut(BaseModel):
    id: UUID
    number: str
    join_code: str
    resident_count: int


class RequestCreate(BaseModel):
    category: RequestCategory
    description: Annotated[str, _text(2000)]
    location: Annotated[str, _text(200)] | None = None

    @field_validator("location", mode="before")
    @classmethod
    def blank_location_is_none(cls, value: object) -> object:
        # An empty optional form field means "no location", not an error.
        return None if isinstance(value, str) and not value.strip() else value


class RequestOut(BaseModel):
    id: UUID
    number: int
    building_id: UUID
    flat_id: UUID
    author_id: UUID
    category: RequestCategory
    description: str
    location: str | None
    status: RequestStatus
    created_at: datetime
    updated_at: datetime
    flat_number: str
    author_name: str
    # Short-lived signed URL; only filled on the single-request endpoint.
    photo_url: str | None = None
    has_photo: bool = False


class RequestEvent(BaseModel):
    status: RequestStatus
    at: datetime
    actor_name: str


class RequestDetailOut(RequestOut):
    # Oldest first; the creation is the first entry.
    history: list[RequestEvent]


class StatusUpdate(BaseModel):
    status: RequestStatus


class AnnouncementCreate(BaseModel):
    title: Annotated[str, _text(200)]
    body: Annotated[str, _text(5000)]


class AnnouncementOut(BaseModel):
    id: UUID
    building_id: UUID
    author_id: UUID
    title: str
    body: str
    created_at: datetime


class MessageCreate(BaseModel):
    body: Annotated[str, _text(2000)]


class MessageOut(BaseModel):
    id: UUID
    author_id: UUID
    author_name: str
    flat_number: str | None
    role: Role
    body: str
    created_at: datetime
