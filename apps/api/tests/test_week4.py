"""Week-4 done-when criteria, checked end to end against local Supabase.

4.1 - a request can be saved and read back.
4.2 - a resident signs in and sees only their own building.
4.3 - an image uploads and shows on a request.
"""

import struct
import zlib

import httpx
from fastapi.testclient import TestClient

from tests.conftest import BUILDING_A, BUILDING_B, FLAT_A_7A, FLAT_A_14B, FLAT_B_22C


def _png() -> bytes:
    """A valid 1x1 PNG."""

    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    pixels = zlib.compress(b"\x00\xff\x00\x00")
    return (
        b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", pixels) + chunk(b"IEND", b"")
    )


def _file_request(client: TestClient, headers: dict[str, str], text: str) -> dict:
    response = client.post(
        "/api/requests",
        headers=headers,
        json={"category": "plumbing", "description": text, "location": "Kitchen"},
    )
    assert response.status_code == 201, response.text
    return response.json()


# --- 4.1 ------------------------------------------------------------------


def test_request_round_trip(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    created = _file_request(client, alice.headers, "  Hot water pipe leaking  ")

    assert created["status"] == "pending"
    assert created["description"] == "Hot water pipe leaking"
    assert created["flat_id"] == FLAT_A_14B
    assert created["building_id"] == BUILDING_A
    assert created["has_photo"] is False

    read = client.get(f"/api/requests/{created['id']}", headers=alice.headers)
    assert read.status_code == 200
    assert read.json()["number"] == created["number"]

    mine = client.get("/api/requests", params={"mine": "true"}, headers=alice.headers).json()
    assert [r["id"] for r in mine] == [created["id"]]


def test_request_validation(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    blank = client.post(
        "/api/requests", headers=alice.headers, json={"category": "other", "description": "   "}
    )
    assert blank.status_code == 422
    bad_category = client.post(
        "/api/requests", headers=alice.headers, json={"category": "magic", "description": "x"}
    )
    assert bad_category.status_code == 422
    empty_location = client.post(
        "/api/requests",
        headers=alice.headers,
        json={"category": "other", "description": "x", "location": ""},
    )
    assert empty_location.status_code == 201
    assert empty_location.json()["location"] is None
    nul = client.post(
        "/api/requests",
        headers=alice.headers,
        json={"category": "other", "description": "a\u0000b"},
    )
    assert nul.status_code == 422


def test_request_list_is_paged(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    for n in range(3):
        _file_request(client, alice.headers, f"Paged {n}")
    params = {"mine": "true", "limit": 2}
    first = client.get("/api/requests", headers=alice.headers, params=params).json()
    rest = client.get("/api/requests", headers=alice.headers, params={**params, "offset": 2}).json()
    assert len(first) == 2
    assert len(rest) == 1
    assert not {r["id"] for r in first} & {r["id"] for r in rest}
    too_big = client.get("/api/requests", headers=alice.headers, params={"limit": 1000})
    assert too_big.status_code == 422


# --- 4.2 ------------------------------------------------------------------


def test_me_reports_building(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    me = client.get("/api/me", headers=alice.headers).json()
    assert me["building_id"] == BUILDING_A
    assert me["role"] == "resident"


def test_unauthenticated_is_rejected(client: TestClient) -> None:
    assert client.get("/api/requests").status_code == 401
    bad = client.get("/api/requests", headers={"Authorization": "Bearer nope"})
    assert bad.status_code == 401


def test_residents_see_only_their_building(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    neighbour = make_account(BUILDING_A, FLAT_A_7A)
    outsider = make_account(BUILDING_B, FLAT_B_22C)

    in_a = _file_request(client, alice.headers, "Building A request")
    in_b = _file_request(client, outsider.headers, "Building B request")

    neighbour_ids = {r["id"] for r in client.get("/api/requests", headers=neighbour.headers).json()}
    assert in_a["id"] in neighbour_ids
    assert in_b["id"] not in neighbour_ids

    outsider_ids = {r["id"] for r in client.get("/api/requests", headers=outsider.headers).json()}
    assert in_a["id"] not in outsider_ids

    # Another building's request is "not found", so its existence does not leak.
    assert client.get(f"/api/requests/{in_a['id']}", headers=outsider.headers).status_code == 404


def test_direct_database_access_cannot_bypass_workflow(
    client: TestClient, stack, make_account
) -> None:
    """RLS second line: a resident token used straight against Supabase REST."""
    alice = make_account(BUILDING_A, FLAT_A_14B)
    rest = httpx.Client(
        base_url=f"{stack['API_URL']}/rest/v1",
        headers={"apikey": stack["ANON_KEY"], "Authorization": f"Bearer {alice.access_token}"},
    )
    row = {
        "building_id": BUILDING_A,
        "flat_id": FLAT_A_14B,
        "author_id": alice.id,
        "category": "other",
        "description": "direct",
    }
    for forged in ({"status": "done"}, {"photo_path": f"{BUILDING_B}/x/y.png"}):
        assert rest.post("/requests", json={**row, **forged}).status_code == 403

    created = _file_request(client, alice.headers, "Try to self-close")
    changed = rest.patch(
        "/requests",
        params={"id": f"eq.{created['id']}"},
        headers={"Prefer": "return=representation"},
        json={"status": "done"},
    )
    assert changed.json() == []  # residents match no update policy
    rewrite = rest.patch(
        "/requests", params={"id": f"eq.{created['id']}"}, json={"photo_path": "x"}
    )
    assert rewrite.status_code in {401, 403}  # column privilege, even for managers
    rest.close()


def test_only_managers_post_news_and_news_is_per_building(client: TestClient, make_account) -> None:
    resident = make_account(BUILDING_A, FLAT_A_14B)
    manager = make_account(BUILDING_A, None, role="manager")
    outsider = make_account(BUILDING_B, FLAT_B_22C)

    news = {"title": "Water off", "body": "Tomorrow 09:00-14:00, pipe inspection."}
    assert client.post("/api/announcements", headers=resident.headers, json=news).status_code == 403

    posted = client.post("/api/announcements", headers=manager.headers, json=news)
    assert posted.status_code == 201
    news_id = posted.json()["id"]

    seen = {a["id"] for a in client.get("/api/announcements", headers=resident.headers).json()}
    assert news_id in seen
    hidden = {a["id"] for a in client.get("/api/announcements", headers=outsider.headers).json()}
    assert news_id not in hidden


def test_account_without_building_is_forbidden(client: TestClient, stack, make_account) -> None:
    # A signed-in user with no resident row must not reach building data.
    account = make_account(BUILDING_A, FLAT_A_14B)
    httpx.delete(
        f"{stack['API_URL']}/rest/v1/residents",
        params={"id": f"eq.{account.id}"},
        headers={
            "apikey": stack["SERVICE_ROLE_KEY"],
            "Authorization": f"Bearer {stack['SERVICE_ROLE_KEY']}",
        },
    ).raise_for_status()
    assert client.get("/api/requests", headers=account.headers).status_code == 403


# --- 4.3 ------------------------------------------------------------------


def test_photo_uploads_and_shows_on_request(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    created = _file_request(client, alice.headers, "Door lock broken")
    png = _png()

    uploaded = client.put(
        f"/api/requests/{created['id']}/photo",
        headers=alice.headers,
        files={"photo": ("door.png", png, "image/png")},
    )
    assert uploaded.status_code == 200, uploaded.text
    assert uploaded.json()["has_photo"] is True

    detail = client.get(f"/api/requests/{created['id']}", headers=alice.headers).json()
    assert detail["photo_url"]
    image = httpx.get(detail["photo_url"])
    assert image.status_code == 200
    assert image.content == png


def test_photo_rules(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    neighbour = make_account(BUILDING_A, FLAT_A_7A)
    outsider = make_account(BUILDING_B, FLAT_B_22C)
    created = _file_request(client, alice.headers, "Light flickering")
    url = f"/api/requests/{created['id']}/photo"

    def put(headers: dict[str, str], content: bytes, mime: str) -> int:
        return client.put(url, headers=headers, files={"photo": ("f", content, mime)}).status_code

    assert put(alice.headers, b"not an image", "text/plain") == 415
    assert put(alice.headers, b"\x00" * (5 * 1024 * 1024 + 1), "image/png") == 413
    assert put(neighbour.headers, _png(), "image/png") == 403
    assert put(outsider.headers, _png(), "image/png") == 404
