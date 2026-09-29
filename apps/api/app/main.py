from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import announcements, flats, messages, requests, residents
from app.supabase_client import close_supabase, get_client, init_supabase


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await init_supabase(get_settings())
    yield
    await close_supabase()


app = FastAPI(title="house-app API", lifespan=lifespan)

# In development the Vite dev server proxies /api, so same-origin applies and CORS
# is not involved. This is here for direct calls to :8000 (docs, curl, debugging).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Liveness plus whether the backend has working Supabase credentials.

    Reports configuration state rather than failing, so a checkout without
    credentials is obviously degraded instead of silently broken.
    """
    return {
        "status": "ok",
        "service": "house-app-api",
        "supabase": "configured" if get_client() is not None else "not configured",
    }


app.include_router(residents.router)
app.include_router(flats.router)
app.include_router(requests.router)
app.include_router(messages.router)
app.include_router(announcements.router)
