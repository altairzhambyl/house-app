import asyncio
import logging
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import announcements, flats, messages, requests, residents
from app.supabase_client import close_supabase, get_client, init_supabase


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await init_supabase(get_settings())
    yield
    await close_supabase()


logger = logging.getLogger("app")

# The interactive docs describe every endpoint and schema; useful locally, an
# unnecessary map for strangers on the public demo.
_docs = not get_settings().on_vercel
app = FastAPI(
    title="house-app API",
    lifespan=lifespan,
    docs_url="/api/docs" if _docs else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if _docs else None,
)

REQUEST_ID_HEADER = "X-Request-ID"


@app.middleware("http")
async def request_id(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Tag every request with an id, returned to the client and used in error logs."""
    request.state.request_id = uuid.uuid4().hex
    response = await call_next(request)
    response.headers[REQUEST_ID_HEADER] = request.state.request_id
    return response


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
    """Last resort: log the details, return nothing internal to the client."""
    rid = getattr(request.state, "request_id", None) or uuid.uuid4().hex
    logger.error(
        "Unhandled error on %s %s (request %s)",
        request.method,
        request.url.path,
        rid,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": rid},
        headers={REQUEST_ID_HEADER: rid},
    )


# In development the Vite dev server proxies /api, so same-origin applies and CORS
# is not involved. This is here for direct calls to :8000 (docs, curl, debugging).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


HEALTH_DB_TIMEOUT_SECONDS = 2.0


@app.get("/api/health")
async def health() -> dict[str, str]:
    """Liveness, whether Supabase is configured, and whether the database answers.

    Never fails: it reports degraded state instead, so a checkout without
    credentials or a paused database is obviously degraded, not silently broken.
    """
    client = get_client()
    database = "not configured"
    if client is not None:
        try:
            await asyncio.wait_for(
                client.table("buildings").select("id").limit(1).execute(),
                HEALTH_DB_TIMEOUT_SECONDS,
            )
            database = "ok"
        except Exception:
            logger.warning("Health check: database unreachable", exc_info=True)
            database = "unreachable"
    return {
        "status": "ok",
        "service": "house-app-api",
        "supabase": "configured" if client is not None else "not configured",
        "database": database,
    }


app.include_router(residents.router)
app.include_router(flats.router)
app.include_router(requests.router)
app.include_router(messages.router)
app.include_router(announcements.router)
