"""Integration fixtures against the LOCAL Supabase stack (`supabase start`).

Tests create auth users and rows, so they refuse to run against anything but a
loopback URL. Without a running local stack they are skipped, not failed.
"""

import os
import shutil
import subprocess
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

import httpx
import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[3]

# Fixed ids from supabase/seed.sql.
BUILDING_A = "00000000-0000-0000-0000-00000000b001"
BUILDING_B = "00000000-0000-0000-0000-00000000b002"
FLAT_A_14B = "00000000-0000-0000-0000-0000000f0141"
FLAT_A_7A = "00000000-0000-0000-0000-0000000f0071"
FLAT_B_22C = "00000000-0000-0000-0000-0000000f0221"
CODE_A_14B = "HVWXA2345B"
DEMO_PASSWORD = "demo-password"


def _local_stack() -> dict[str, str] | None:
    if shutil.which("supabase") is None:
        return None
    result = subprocess.run(
        ["supabase", "status", "-o", "env"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return None
    values: dict[str, str] = {}
    for line in result.stdout.splitlines():
        key, sep, value = line.partition("=")
        if sep:
            values[key.strip()] = value.strip().strip('"')
    return values if "API_URL" in values and "SERVICE_ROLE_KEY" in values else None


@pytest.fixture(scope="session")
def stack() -> dict[str, str]:
    values = _local_stack()
    if values is None:
        pytest.skip("local Supabase is not running - start it with `supabase start`")
    host = urlparse(values["API_URL"]).hostname
    if host not in {"127.0.0.1", "localhost"}:
        pytest.fail(f"refusing to run integration tests against non-local {values['API_URL']}")
    return values


@pytest.fixture(scope="session")
def client(stack: dict[str, str]) -> Iterator[TestClient]:
    os.environ["SUPABASE_URL"] = stack["API_URL"]
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = stack["SERVICE_ROLE_KEY"]
    from app.config import get_settings
    from app.main import app

    get_settings.cache_clear()
    with TestClient(app) as test_client:
        yield test_client


@dataclass
class Account:
    id: str
    headers: dict[str, str]
    access_token: str


def _admin_headers(stack: dict[str, str]) -> dict[str, str]:
    return {
        "apikey": stack["SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {stack['SERVICE_ROLE_KEY']}",
    }


def sign_in(stack: dict[str, str], email: str, password: str) -> httpx.Response:
    """GoTrue password grant, as the web client does it."""
    return httpx.post(
        f"{stack['API_URL']}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": stack["ANON_KEY"]},
        json={"email": email, "password": password},
        timeout=10,
    )


@pytest.fixture(scope="session")
def make_flat(stack: dict[str, str]) -> Iterator:
    """Create a throwaway flat, so tests never rotate the seed flats' codes."""
    admin = _admin_headers(stack)
    created: list[str] = []
    http = httpx.Client(base_url=stack["API_URL"], timeout=10)

    def _make(building_id: str) -> dict:
        response = http.post(
            "/rest/v1/flats",
            headers={**admin, "Prefer": "return=representation"},
            json={"building_id": building_id, "number": f"T-{uuid.uuid4().hex[:8]}"},
        )
        response.raise_for_status()
        flat = response.json()[0]
        created.append(flat["id"])
        return flat

    yield _make

    # Runs after make_account's teardown (it depends on this fixture), so no
    # resident still points at these flats.
    if created:
        http.delete(
            "/rest/v1/flats", headers=admin, params={"id": f"in.({','.join(created)})"}
        ).raise_for_status()
    http.close()


@pytest.fixture(scope="session")
def make_account(stack: dict[str, str], make_flat) -> Iterator:
    """Create an auth user + resident row and return a signed-in Account.

    With building_id=None the user has no resident row: signed in, not joined.
    """
    admin = _admin_headers(stack)
    created: list[str] = []
    http = httpx.Client(base_url=stack["API_URL"], timeout=10)

    def _make(
        building_id: str | None, flat_id: str | None = None, role: str = "resident"
    ) -> Account:
        email = f"test-{uuid.uuid4().hex[:12]}@example.test"
        password = uuid.uuid4().hex
        user = http.post(
            "/auth/v1/admin/users",
            headers=admin,
            json={"email": email, "password": password, "email_confirm": True},
        )
        user.raise_for_status()
        user_id = user.json()["id"]
        created.append(user_id)
        if building_id is not None:
            _link(user_id, building_id, flat_id, role)
        token = sign_in(stack, email, password)
        token.raise_for_status()
        access_token = token.json()["access_token"]
        return Account(user_id, {"Authorization": f"Bearer {access_token}"}, access_token)

    def _link(user_id: str, building_id: str, flat_id: str | None, role: str) -> None:
        http.post(
            "/rest/v1/residents",
            headers=admin,
            json={
                "id": user_id,
                "building_id": building_id,
                "flat_id": flat_id,
                "full_name": f"Test {role}",
                "role": role,
            },
        ).raise_for_status()

    yield _make

    # Storage objects do not cascade: remove the test photos first.
    if created:
        photos = http.get(
            "/rest/v1/requests",
            headers=admin,
            params={
                "select": "photo_path",
                "author_id": f"in.({','.join(created)})",
                "photo_path": "not.is.null",
            },
        )
        photos.raise_for_status()
        paths = [row["photo_path"] for row in photos.json()]
        if paths:
            http.request(
                "DELETE",
                "/storage/v1/object/request-photos",
                headers=admin,
                json={"prefixes": paths},
            ).raise_for_status()
    # Deleting the auth user cascades to residents, requests and announcements.
    for user_id in created:
        http.delete(f"/auth/v1/admin/users/{user_id}", headers=admin).raise_for_status()
    http.close()
