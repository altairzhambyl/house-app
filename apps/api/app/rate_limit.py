"""Rate limits for write endpoints (ITP-26, ITP-32).

Counters live in Postgres (public.hit_rate_limit), not in memory: on Vercel the
API runs as many short-lived instances, so a per-process counter would not
limit anything.

Usage: `@router.post(..., dependencies=[rate_limited("message")])`.
"""

import logging
import time
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status

from app.config import get_settings
from app.deps import CurrentUser, SupabaseDep

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Limit:
    calls: int
    window_seconds: int


# One place for every limit. Generous enough for the demo flows (sign up, join,
# file a request with a photo, chat; a manager rotating codes and removing
# residents), tight enough to stop scripted abuse.
LIMITS: dict[str, Limit] = {
    "join": Limit(10, 15 * 60),  # per user: guessing flat codes
    "join_ip": Limit(30, 15 * 60),  # per client IP: many throwaway accounts
    "request_create": Limit(20, 60 * 60),
    "photo_upload": Limit(30, 60 * 60),  # signed upload tickets (see ITP-29)
    "message": Limit(30, 60),
    "announcement": Limit(20, 60 * 60),
    "flat_admin": Limit(60, 60 * 60),  # rotate codes, remove residents
    "request_withdraw": Limit(20, 60 * 60),  # ITP-53
    # ITP-51: on top of "announcement" - each one lands in the managers' queue.
    "resident_news": Limit(5, 60 * 60),
    "news_moderation": Limit(60, 60 * 60),  # approve / reject resident news
}


def client_ip(request: Request) -> str:
    """The caller's IP, trusting proxy headers only where the platform sets them.

    On Vercel, x-real-ip is written by Vercel's edge and cannot be supplied by
    the client. Anywhere else a client could forge it, so the socket address is
    used instead.
    """
    if get_settings().vercel:
        real_ip = request.headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip
    return request.client.host if request.client else "unknown"


def retry_after(limit: Limit) -> int:
    """Seconds until the current fixed window ends (at least 1)."""
    return max(1, limit.window_seconds - int(time.time()) % limit.window_seconds)


async def _allowed(supabase: SupabaseDep, key: str, limit: Limit) -> bool:
    try:
        response = await supabase.rpc(
            "hit_rate_limit",
            {"p_key": key, "p_limit": limit.calls, "p_window_seconds": limit.window_seconds},
        ).execute()
    except Exception:
        # Fail open on purpose: a broken limiter must not take the whole app
        # down. It is logged so the outage is visible.
        logger.exception("Rate-limit check failed for %s; allowing the call", key)
        return True
    return response.data is not False


def rate_limited(action: str, *, ip_action: str | None = None) -> object:
    """A dependency that counts the call against the user (and optionally the IP)."""
    checks = [action] + ([ip_action] if ip_action else [])
    for name in checks:
        if name not in LIMITS:
            raise KeyError(f"unknown rate limit {name!r}")

    async def dependency(request: Request, supabase: SupabaseDep, user: CurrentUser) -> None:
        keys = [(f"{action}:user:{user.id}", LIMITS[action])]
        if ip_action:
            keys.append((f"{ip_action}:ip:{client_ip(request)}", LIMITS[ip_action]))
        for key, limit in keys:
            if not await _allowed(supabase, key, limit):
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    "Too many requests, try again later",
                    headers={"Retry-After": str(retry_after(limit))},
                )

    return Depends(dependency)


async def enforce_limit(supabase: SupabaseDep, action: str, user_id: object) -> None:
    """Count one call against the user from inside a handler.

    For limits that apply only to some callers (e.g. residents, not managers),
    which a route-level dependency cannot express.
    """
    limit = LIMITS[action]
    if not await _allowed(supabase, f"{action}:user:{user_id}", limit):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many requests, try again later",
            headers={"Retry-After": str(retry_after(limit))},
        )
