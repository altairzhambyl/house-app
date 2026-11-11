"""ITP-26 / ITP-32: rate limits, safe 500s, request ids, docs off on Vercel."""

import os
import subprocess
import sys
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from tests.conftest import BUILDING_A, BUILDING_B, FLAT_A_14B, FLAT_B_22C

API_DIR = Path(__file__).resolve().parents[1]


# --- no database needed ------------------------------------------------------


def _app_settings_on(env: dict[str, str]) -> str:
    """Import the app in a fresh interpreter with `env` and print its doc URLs."""
    code = "from app.main import app; print(app.docs_url, app.openapi_url, app.redoc_url)"
    clean = {k: v for k, v in os.environ.items() if k not in {"VERCEL", "PYTHONPATH"}}
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=API_DIR,
        env={**clean, **env},
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def test_docs_are_off_on_vercel() -> None:
    assert _app_settings_on({"VERCEL": "1"}) == "None None None"


def test_docs_are_on_locally() -> None:
    assert _app_settings_on({}) == "/api/docs /api/openapi.json None"


def test_unhandled_error_is_generic_and_tagged() -> None:
    from app.main import app

    async def boom() -> None:
        raise RuntimeError("secret internal detail: password=hunter2")

    app.add_api_route("/api/__boom", boom)
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.get("/api/__boom")
    finally:
        app.router.routes = [
            r for r in app.router.routes if getattr(r, "path", "") != "/api/__boom"
        ]

    assert response.status_code == 500
    body = response.json()
    assert body["detail"] == "Internal server error"
    assert "hunter2" not in response.text and "RuntimeError" not in response.text
    assert body["request_id"] == response.headers["X-Request-ID"]


# --- against local Supabase --------------------------------------------------


def test_every_api_response_has_a_request_id(client: TestClient) -> None:
    first = client.get("/api/health")
    second = client.get("/api/health")
    assert first.headers["X-Request-ID"] != second.headers["X-Request-ID"]
    assert first.json()["database"] == "ok"


def test_join_attempts_are_rate_limited_per_user(client: TestClient, make_account) -> None:
    guesser = make_account(None)
    other = make_account(None)

    def join(headers: dict[str, str]) -> httpx.Response:
        # Wrong codes still count: the limit exists to stop code guessing.
        return client.post(
            "/api/join", headers=headers, json={"code": "AAAAAAAAAA", "full_name": "Guesser"}
        )

    for _ in range(10):
        assert join(guesser.headers).status_code == 404
    limited = join(guesser.headers)
    assert limited.status_code == 429
    assert int(limited.headers["Retry-After"]) >= 1

    # Another account is not affected.
    assert join(other.headers).status_code == 404


def test_join_is_rate_limited_per_ip(client: TestClient, make_account) -> None:
    # 30 per IP per window: four fresh accounts x 8 attempts all come from the
    # test client's address, so the 31st call is refused even for a new user.
    accounts = [make_account(None) for _ in range(4)]
    statuses = [
        client.post(
            "/api/join",
            headers=a.headers,
            json={"code": "AAAAAAAAAA", "full_name": "Guesser"},
        ).status_code
        for a in accounts
        for _ in range(8)
    ]
    assert statuses[:30] == [404] * 30
    assert set(statuses[30:]) == {429}


def test_limiter_is_not_reachable_by_users(stack, make_account) -> None:
    user = make_account(BUILDING_A, FLAT_A_14B)
    rest = f"{stack['API_URL']}/rest/v1"
    for token in (stack["ANON_KEY"], user.access_token):
        headers = {"apikey": stack["ANON_KEY"], "Authorization": f"Bearer {token}"}
        rpc = httpx.post(
            f"{rest}/rpc/hit_rate_limit",
            headers=headers,
            json={"p_key": f"join:user:{user.id}", "p_limit": 1000, "p_window_seconds": 60},
        )
        assert rpc.status_code in (401, 403, 404), rpc.text
        table = httpx.get(f"{rest}/rate_limit_hits", headers=headers)
        assert table.status_code in (401, 403) or table.json() == [], table.text


def test_other_writes_are_limited(client: TestClient, make_account) -> None:
    # Messages: 30 per minute per user.
    author = make_account(BUILDING_B, FLAT_B_22C)
    statuses = [
        client.post("/api/messages", headers=author.headers, json={"body": f"hi {i}"}).status_code
        for i in range(31)
    ]
    assert statuses[:30] == [201] * 30
    assert statuses[30] == 429
