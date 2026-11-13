"""API models. Enum values mirror the Postgres enums in supabase/migrations."""

from datetime import datetime
from enum import Enum
from typing import Annotated
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, StringConstraints, field_validator


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
    # Final; set only by the author through POST /api/requests/{id}/withdraw (ITP-53).
    withdrawn = "withdrawn"


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


class FlatResidentOut(BaseModel):
    """An active resident of a flat, as a manager of its building sees them."""

    id: UUID
    full_name: str
    created_at: datetime


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

    @field_validator("status")
    @classmethod
    def not_withdrawn(cls, value: RequestStatus) -> RequestStatus:
        # Withdrawing is the author's action, not a manager's status change.
        if value is RequestStatus.withdrawn:
            raise ValueError("only the author can withdraw a request")
        return value


class PhotoType(str, Enum):
    jpeg = "image/jpeg"
    png = "image/png"
    webp = "image/webp"


class PhotoUploadCreate(BaseModel):
    content_type: PhotoType


class PhotoUploadOut(BaseModel):
    """A one-time ticket to upload straight to Storage with uploadToSignedUrl."""

    bucket: str
    path: str
    token: str


class PhotoAttach(BaseModel):
    # The path returned by POST /photo-upload; checked against the request's folder.
    path: Annotated[str, _text(300)]


class AnnouncementCreate(BaseModel):
    title: Annotated[str, _text(200)]
    body: Annotated[str, _text(5000)]


class AnnouncementStatus(str, Enum):
    """Mirrors the check on public.announcements.status (ITP-51)."""

    pending = "pending"  # a resident's post, waiting for a manager
    published = "published"
    rejected = "rejected"


class AnnouncementReject(BaseModel):
    # Optional; shown to the author. Blank means "no reason given".
    reason: Annotated[str, _text(500)] | None = None

    @field_validator("reason", mode="before")
    @classmethod
    def blank_reason_is_none(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value


class AnnouncementOut(BaseModel):
    id: UUID
    building_id: UUID
    author_id: UUID
    title: str
    body: str
    created_at: datetime
    status: AnnouncementStatus
    # Only on rejected posts; only the author and managers ever see those.
    reject_reason: str | None
    reviewed_at: datetime | None
    # True for posts by the management company (a manager), false for residents.
    is_official: bool
    # Residents' posts are labelled by flat only, never by name.
    author_flat_number: str | None


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


# --- Polls (ITP-40, ITP-55) ---------------------------------------------------


class PollStatus(str, Enum):
    proposed = "proposed"
    open = "open"
    rejected = "rejected"
    closed = "closed"


class PollChoice(str, Enum):
    for_ = "for"
    against = "against"
    abstain = "abstain"


class PollCreate(BaseModel):
    question: Annotated[str, _text(300)]
    description: Annotated[str, _text(2000)] | None = None
    # Must carry a UTC offset: a bare local time would be read differently per server.
    ends_at: AwareDatetime

    @field_validator("description", mode="before")
    @classmethod
    def blank_description_is_none(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value


class PollReject(BaseModel):
    reason: Annotated[str, _text(500)]


class PollVote(BaseModel):
    choice: PollChoice


class PollOut(BaseModel):
    id: UUID
    building_id: UUID
    author_id: UUID
    author_name: str
    question: str
    description: str | None
    ends_at: datetime
    # "closed" also when an open poll's ends_at has passed.
    status: PollStatus
    reject_reason: str | None
    reviewed_at: datetime | None
    created_at: datetime
    votes_for: int
    votes_against: int
    votes_abstain: int
    votes_total: int
    # Active residents (role resident) of the building, i.e. who may vote.
    eligible_voters: int
    my_choice: PollChoice | None
