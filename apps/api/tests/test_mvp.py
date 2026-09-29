"""MVP: sign-in by flat, request status with history, and the building channel.

Checked end to end against local Supabase, including the demo accounts from
supabase/seed.sql.
"""

from datetime import datetime
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from supabase_auth.errors import AuthApiError, AuthRetryableError

from tests.conftest import (
    BUILDING_A,
    BUILDING_B,
    CODE_A_14B,
    DEMO_PASSWORD,
    FLAT_A_14B,
    FLAT_B_22C,
    sign_in,
)

NOT_LINKED = "This account is not linked to a building yet"


def _file_request(client: TestClient, headers: dict[str, str], text: str) -> dict:
    response = client.post(
        "/api/requests", headers=headers, json={"category": "plumbing", "description": text}
    )
    assert response.status_code == 201, response.text
    return response.json()


# --- Sign-in and joining a flat ----------------------------------------------


def _auth_raising(error: Exception) -> SimpleNamespace:
    """A stand-in Supabase client whose token check fails with `error`."""

    async def get_user(_token: str) -> None:
        raise error

    return SimpleNamespace(auth=SimpleNamespace(get_user=get_user))


@pytest.mark.parametrize(
    "error",
    [
        AuthRetryableError("Bad Gateway", 502),
        AuthRetryableError("Connection reset", 0),
        AuthApiError("Internal Server Error", 500, None),
        httpx.ConnectError("connection refused"),
    ],
)
def test_auth_outage_is_503_not_401(client: TestClient, error: Exception) -> None:
    # A 401 makes the frontend drop the session, so an Auth outage must not look
    # like a bad token.
    from app.deps import require_supabase
    from app.main import app

    app.dependency_overrides[require_supabase] = lambda: _auth_raising(error)
    try:
        response = client.get("/api/me", headers={"Authorization": "Bearer some-token"})
    finally:
        app.dependency_overrides.pop(require_supabase)
    assert response.status_code == 503, response.text


def test_bad_token_is_still_401(client: TestClient) -> None:
    response = client.get("/api/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401, response.text


def test_demo_accounts_sign_in(client: TestClient, stack) -> None:
    for email, role, flat_number in (
        ("manager@demo.test", "manager", None),
        ("resident@demo.test", "resident", "14B"),
    ):
        token = sign_in(stack, email, DEMO_PASSWORD)
        assert token.status_code == 200, token.text
        headers = {"Authorization": f"Bearer {token.json()['access_token']}"}
        resident = client.get("/api/me", headers=headers).json()["resident"]
        assert resident["building_name"] == "Demo Block A"
        assert resident["role"] == role
        assert resident["flat_number"] == flat_number
    assert sign_in(stack, "resident@demo.test", "wrong-password").status_code == 400


def test_unlinked_account_sees_only_me_and_join(client: TestClient, make_account) -> None:
    fresh = make_account(None)
    me = client.get("/api/me", headers=fresh.headers)
    assert me.status_code == 200
    assert me.json()["user_id"] == fresh.id
    assert me.json()["resident"] is None

    for method, url, body in (
        ("GET", "/api/requests", None),
        ("GET", "/api/messages", None),
        ("POST", "/api/messages", {"body": "hi"}),
        ("GET", "/api/announcements", None),
        ("GET", "/api/flats", None),
    ):
        response = client.request(method, url, headers=fresh.headers, json=body)
        assert response.status_code == 403, url
        assert response.json() == {"detail": NOT_LINKED}

    assert client.get("/api/me").status_code == 401
    assert client.post("/api/join", json={"code": CODE_A_14B, "full_name": "X"}).status_code == 401


def test_join_by_code_is_normalized(client: TestClient, make_account) -> None:
    fresh = make_account(None)
    messy = f" {CODE_A_14B[:4].lower()}-{CODE_A_14B[4:7]} {CODE_A_14B[7:].lower()} "
    joined = client.post(
        "/api/join", headers=fresh.headers, json={"code": messy, "full_name": "  Aigerim  "}
    )
    assert joined.status_code == 200, joined.text
    resident = joined.json()
    assert resident["id"] == fresh.id
    assert resident["building_id"] == BUILDING_A
    assert resident["flat_id"] == FLAT_A_14B
    assert resident["flat_number"] == "14B"
    assert resident["full_name"] == "Aigerim"
    assert resident["role"] == "resident"

    # Now linked: /api/me reports it and building routes open up.
    assert client.get("/api/me", headers=fresh.headers).json()["resident"] == resident
    assert client.get("/api/requests", headers=fresh.headers).status_code == 200

    again = client.post(
        "/api/join", headers=fresh.headers, json={"code": CODE_A_14B, "full_name": "Aigerim"}
    )
    assert again.status_code == 409


def test_join_rejects_unknown_codes(client: TestClient, make_account) -> None:
    fresh = make_account(None)
    for code in ("ZZZZZZZZZZ", "HVWXA2345", "HVWXA2345B0", "", "O" * 10, "HVWXA2345B'--"):
        response = client.post(
            "/api/join", headers=fresh.headers, json={"code": code, "full_name": "X"}
        )
        assert response.status_code == 404, code
        assert "detail" in response.json()
    blank_name = client.post(
        "/api/join", headers=fresh.headers, json={"code": CODE_A_14B, "full_name": "   "}
    )
    assert blank_name.status_code == 422
    long_name = client.post(
        "/api/join", headers=fresh.headers, json={"code": CODE_A_14B, "full_name": "x" * 101}
    )
    assert long_name.status_code == 422
    assert client.get("/api/me", headers=fresh.headers).json()["resident"] is None


def test_linked_account_cannot_join_again(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    response = client.post(
        "/api/join", headers=alice.headers, json={"code": CODE_A_14B, "full_name": "Alice"}
    )
    assert response.status_code == 409


# --- Flats and join codes (managers) -----------------------------------------


def test_managers_list_flats_with_codes(client: TestClient, make_account, make_flat) -> None:
    manager = make_account(BUILDING_A, None, role="manager")
    resident = make_account(BUILDING_A, FLAT_A_14B)
    extra = make_flat(BUILDING_A)
    make_flat(BUILDING_B)

    assert client.get("/api/flats", headers=resident.headers).status_code == 403

    flats = client.get("/api/flats", headers=manager.headers).json()
    by_number = {f["number"]: f for f in flats}
    assert {"14B", "7A", extra["number"]} <= set(by_number)
    assert all(f["id"] != FLAT_B_22C for f in flats)
    assert by_number["14B"]["join_code"] == CODE_A_14B
    assert by_number["14B"]["resident_count"] >= 2  # demo resident + this test's resident
    assert by_number[extra["number"]]["resident_count"] == 0
    numbers = [f["number"] for f in flats]
    assert numbers.index("7A") < numbers.index("14B")  # natural order


def test_rotate_code(client: TestClient, make_account, make_flat) -> None:
    manager = make_account(BUILDING_A, None, role="manager")
    resident = make_account(BUILDING_A, FLAT_A_14B)
    outsider_manager = make_account(BUILDING_B, None, role="manager")
    flat = make_flat(BUILDING_A)
    url = f"/api/flats/{flat['id']}/rotate-code"

    assert client.post(url, headers=resident.headers).status_code == 403
    assert client.post(url, headers=outsider_manager.headers).status_code == 404
    missing = "/api/flats/00000000-0000-0000-0000-000000000000/rotate-code"
    assert client.post(missing, headers=manager.headers).status_code == 404

    rotated = client.post(url, headers=manager.headers)
    assert rotated.status_code == 200, rotated.text
    new = rotated.json()
    assert new["id"] == flat["id"]
    assert new["number"] == flat["number"]
    assert new["join_code"] != flat["join_code"]
    assert len(new["join_code"]) == 10
    assert not set(new["join_code"]) & set("01OIL")

    # The old code stops working, the new one links to this flat.
    late = make_account(None)
    old = client.post(
        "/api/join", headers=late.headers, json={"code": flat["join_code"], "full_name": "Late"}
    )
    assert old.status_code == 404
    joined = client.post(
        "/api/join", headers=late.headers, json={"code": new["join_code"], "full_name": "Late"}
    )
    assert joined.status_code == 200
    assert joined.json()["flat_id"] == flat["id"]


def test_generated_codes_use_the_safe_alphabet(make_flat) -> None:
    for _ in range(5):
        code = make_flat(BUILDING_B)["join_code"]
        assert len(code) == 10
        assert not set(code) & set("01OIL")
        assert code == code.upper()


def test_residents_cannot_read_join_codes_directly(client: TestClient, stack, make_account) -> None:
    """RLS second line: flat codes are not readable with a resident token."""
    alice = make_account(BUILDING_A, FLAT_A_14B)
    rest = httpx.Client(
        base_url=f"{stack['API_URL']}/rest/v1",
        headers={"apikey": stack["ANON_KEY"], "Authorization": f"Bearer {alice.access_token}"},
    )
    assert rest.get("/flats", params={"select": "join_code"}).status_code in {401, 403}
    plain = rest.get("/flats", params={"select": "id,number"})
    assert plain.status_code == 200
    assert {f["number"] for f in plain.json()} >= {"14B", "7A"}
    rest.close()


# --- Request status and history ----------------------------------------------


def test_request_shows_flat_and_author(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    created = _file_request(client, alice.headers, "Radiator cold")
    assert created["flat_number"] == "14B"
    assert created["author_name"] == "Test resident"
    listed = client.get("/api/requests", params={"mine": "true"}, headers=alice.headers).json()
    assert listed[0]["flat_number"] == "14B"
    assert listed[0]["author_name"] == "Test resident"

    detail = client.get(f"/api/requests/{created['id']}", headers=alice.headers).json()
    assert [(e["status"], e["actor_name"]) for e in detail["history"]] == [
        ("pending", "Test resident")
    ]


def test_manager_moves_status_and_history_is_ordered(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    manager = make_account(BUILDING_A, None, role="manager")
    created = _file_request(client, alice.headers, "Elevator stuck")
    url = f"/api/requests/{created['id']}"

    for status in ("in_progress", "in_progress", "done"):
        response = client.patch(url, headers=manager.headers, json={"status": status})
        assert response.status_code == 200, response.text
        assert response.json()["status"] == status

    detail = client.get(url, headers=alice.headers).json()
    assert detail["status"] == "done"
    history = detail["history"]
    # The repeated in_progress added nothing.
    assert [(e["status"], e["actor_name"]) for e in history] == [
        ("pending", "Test resident"),
        ("in_progress", "Test manager"),
        ("done", "Test manager"),
    ]
    times = [datetime.fromisoformat(e["at"]) for e in history]
    assert times == sorted(times)
    assert all(t.tzinfo is not None for t in times)

    reopened = client.patch(url, headers=manager.headers, json={"status": "pending"})
    assert [e["status"] for e in reopened.json()["history"]][-1] == "pending"


def test_status_change_rules(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    outsider_manager = make_account(BUILDING_B, None, role="manager")
    manager = make_account(BUILDING_A, None, role="manager")
    created = _file_request(client, alice.headers, "Intercom silent")
    url = f"/api/requests/{created['id']}"

    assert client.patch(url, headers=alice.headers, json={"status": "done"}).status_code == 403
    other = client.patch(url, headers=outsider_manager.headers, json={"status": "done"})
    assert other.status_code == 404
    bad = client.patch(url, headers=manager.headers, json={"status": "closed"})
    assert bad.status_code == 422
    missing = client.patch(
        "/api/requests/00000000-0000-0000-0000-000000000000",
        headers=manager.headers,
        json={"status": "done"},
    )
    assert missing.status_code == 404

    detail = client.get(url, headers=alice.headers).json()
    assert detail["status"] == "pending"
    assert len(detail["history"]) == 1


def test_history_cannot_be_forged_directly(client: TestClient, stack, make_account) -> None:
    """RLS second line: the status RPC and the history table are closed to clients,
    and a manager's direct status update is still logged."""
    alice = make_account(BUILDING_A, FLAT_A_14B)
    manager = make_account(BUILDING_A, None, role="manager")
    created = _file_request(client, alice.headers, "Stairwell light out")

    def rest(account) -> httpx.Client:
        return httpx.Client(
            base_url=f"{stack['API_URL']}/rest/v1",
            headers={
                "apikey": stack["ANON_KEY"],
                "Authorization": f"Bearer {account.access_token}",
            },
        )

    with rest(manager) as as_manager, rest(alice) as as_alice:
        rpc = as_manager.post(
            "/rpc/set_request_status",
            json={
                "p_request_id": created["id"],
                "p_building_id": BUILDING_A,
                "p_status": "done",
                "p_actor_id": alice.id,
            },
        )
        assert rpc.status_code in {401, 403, 404}
        forged = as_alice.post(
            "/request_events",
            json={"request_id": created["id"], "status": "done", "actor_id": manager.id},
        )
        assert forged.status_code in {401, 403}

        direct = as_manager.patch(
            "/requests", params={"id": f"eq.{created['id']}"}, json={"status": "in_progress"}
        )
        assert direct.status_code == 204
        seen = as_alice.get("/request_events", params={"request_id": f"eq.{created['id']}"})
        assert len(seen.json()) == 2

    history = client.get(f"/api/requests/{created['id']}", headers=alice.headers).json()["history"]
    assert [(e["status"], e["actor_name"]) for e in history] == [
        ("pending", "Test resident"),
        ("in_progress", "Test manager"),
    ]


# --- Building channel --------------------------------------------------------


def test_channel_post_and_read(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    manager = make_account(BUILDING_A, None, role="manager")
    outsider = make_account(BUILDING_B, FLAT_B_22C)

    posted = client.post("/api/messages", headers=alice.headers, json={"body": "  Hello!  "})
    assert posted.status_code == 201, posted.text
    message = posted.json()
    assert message["body"] == "Hello!"
    assert message["author_id"] == alice.id
    assert message["author_name"] == "Test resident"
    assert message["flat_number"] == "14B"
    assert message["role"] == "resident"

    reply = client.post("/api/messages", headers=manager.headers, json={"body": "Hi"}).json()
    assert reply["role"] == "manager"
    assert reply["flat_number"] is None

    feed = client.get("/api/messages", headers=alice.headers).json()
    assert [m["id"] for m in feed[:2]] == [reply["id"], message["id"]]  # newest first
    assert feed[1] == message

    outsider_ids = {m["id"] for m in client.get("/api/messages", headers=outsider.headers).json()}
    assert not outsider_ids & {message["id"], reply["id"]}

    for body in ("   ", "x" * 2001, "a\u0000b"):
        bad = client.post("/api/messages", headers=alice.headers, json={"body": body})
        assert bad.status_code == 422


def test_channel_pages_with_before(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    posted = [
        client.post("/api/messages", headers=alice.headers, json={"body": f"m{n}"}).json()
        for n in range(3)
    ]
    first = client.get("/api/messages", headers=alice.headers, params={"limit": 2}).json()
    assert [m["id"] for m in first] == [posted[2]["id"], posted[1]["id"]]

    older = client.get(
        "/api/messages",
        headers=alice.headers,
        params={"limit": 2, "before": first[-1]["created_at"]},
    ).json()
    assert older[0]["id"] == posted[0]["id"]
    assert not {m["id"] for m in older} & {m["id"] for m in first}

    for params in ({"limit": 0}, {"limit": 101}, {"before": "yesterday"}):
        response = client.get("/api/messages", headers=alice.headers, params=params)
        assert response.status_code == 422, params
    naive = client.get(
        "/api/messages", headers=alice.headers, params={"before": "2026-01-01T00:00:00"}
    )
    assert naive.status_code == 422
