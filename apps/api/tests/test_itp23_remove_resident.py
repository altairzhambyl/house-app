"""ITP-23: a manager removes a resident from a flat, end to end against local Supabase.

Every test uses a throwaway flat from make_flat, so the seed flats and their
resident counts stay untouched.
"""

from datetime import datetime

import httpx
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from tests.conftest import BUILDING_A, BUILDING_B

NOT_LINKED = "This account is not linked to a building yet"
MISSING = "00000000-0000-0000-0000-000000000000"
# Parses the API's "...Z" timestamps on Python 3.10 too.
TIMESTAMP = TypeAdapter(datetime)


def _join(client: TestClient, headers: dict[str, str], code: str, name: str):
    return client.post("/api/join", headers=headers, json={"code": code, "full_name": name})


def _resident_of(client: TestClient, make_account, flat: dict, name: str = "Dana"):
    """A fresh account that joined `flat` with its join code, as a resident would."""
    account = make_account(None)
    joined = _join(client, account.headers, flat["join_code"], name)
    assert joined.status_code == 200, joined.text
    return account


def _remove(client: TestClient, headers: dict[str, str], flat_id: str, resident_id: str):
    return client.delete(f"/api/flats/{flat_id}/residents/{resident_id}", headers=headers)


def _file_request(client: TestClient, headers: dict[str, str], text: str):
    return client.post(
        "/api/requests", headers=headers, json={"category": "plumbing", "description": text}
    )


def test_manager_lists_flat_residents(client: TestClient, make_account, make_flat) -> None:
    manager = make_account(BUILDING_A, None, role="manager")
    outsider_manager = make_account(BUILDING_B, None, role="manager")
    flat = make_flat(BUILDING_A)
    empty = make_flat(BUILDING_A)
    dana = _resident_of(client, make_account, flat)
    # The schema allows a manager linked to a flat; they are still not a resident of it.
    flat_manager = make_account(BUILDING_A, flat["id"], role="manager")
    url = f"/api/flats/{flat['id']}/residents"

    assert client.get(url).status_code == 401
    assert client.get(url, headers=dana.headers).status_code == 403
    assert client.get(url, headers=outsider_manager.headers).status_code == 404
    missing = client.get(f"/api/flats/{MISSING}/residents", headers=manager.headers)
    assert missing.status_code == 404
    assert client.get("/api/flats/nope/residents", headers=manager.headers).status_code == 422

    listed = client.get(url, headers=manager.headers)
    assert listed.status_code == 200, listed.text
    assert [(r["id"], r["full_name"]) for r in listed.json()] == [(dana.id, "Dana")]
    assert flat_manager.id not in {r["id"] for r in listed.json()}

    assert client.get(f"/api/flats/{empty['id']}/residents", headers=manager.headers).json() == []


def test_removed_resident_loses_access(client: TestClient, make_account, make_flat) -> None:
    """Done means: the removed resident's next API call is denied, their history stays."""
    manager = make_account(BUILDING_A, None, role="manager")
    flat = make_flat(BUILDING_A)
    dana = _resident_of(client, make_account, flat)

    filed = _file_request(client, dana.headers, "Radiator cold")
    assert filed.status_code == 201, filed.text
    request_id = filed.json()["id"]
    posted = client.post("/api/messages", headers=dana.headers, json={"body": "Hi neighbours"})
    assert posted.status_code == 201, posted.text
    message_id = posted.json()["id"]

    removed = _remove(client, manager.headers, flat["id"], dana.id)
    assert removed.status_code == 200, removed.text
    assert removed.json()["id"] == flat["id"]
    assert removed.json()["resident_count"] == 0
    by_id = {f["id"]: f for f in client.get("/api/flats", headers=manager.headers).json()}
    assert by_id[flat["id"]]["resident_count"] == 0

    # The same, still valid token is cut off on its next call.
    assert client.get("/api/me", headers=dana.headers).json()["resident"] is None
    for response in (
        client.get("/api/requests", headers=dana.headers),
        client.get(f"/api/requests/{request_id}", headers=dana.headers),
        _file_request(client, dana.headers, "After removal"),
        client.get("/api/messages", headers=dana.headers),
        client.post("/api/messages", headers=dana.headers, json={"body": "Still here?"}),
        client.get("/api/announcements", headers=dana.headers),
    ):
        assert response.status_code == 403, response.text
        assert response.json() == {"detail": NOT_LINKED}

    listed = client.get(f"/api/flats/{flat['id']}/residents", headers=manager.headers).json()
    assert dana.id not in {r["id"] for r in listed}

    # Nothing the resident wrote is lost: the building keeps the request, its
    # history and the channel message, with the author's name and flat.
    detail = client.get(f"/api/requests/{request_id}", headers=manager.headers)
    assert detail.status_code == 200, detail.text
    assert detail.json()["author_id"] == dana.id
    assert detail.json()["author_name"] == "Dana"
    assert detail.json()["flat_number"] == flat["number"]
    assert [e["status"] for e in detail.json()["history"]] == ["pending"]
    building_requests = client.get(
        "/api/requests", headers=manager.headers, params={"limit": 100}
    ).json()
    assert request_id in {r["id"] for r in building_requests}
    feed = client.get("/api/messages", headers=manager.headers, params={"limit": 100}).json()
    message = next(m for m in feed if m["id"] == message_id)
    assert message["author_name"] == "Dana"
    assert message["flat_number"] == flat["number"]


def test_removed_resident_cannot_read_directly(
    client: TestClient, stack, make_account, make_flat
) -> None:
    """RLS second line: the removed resident's token used straight against Supabase REST."""
    manager = make_account(BUILDING_A, None, role="manager")
    flat = make_flat(BUILDING_A)
    dana = _resident_of(client, make_account, flat)
    assert _file_request(client, dana.headers, "Before removal").status_code == 201
    assert client.post("/api/messages", headers=dana.headers, json={"body": "x"}).status_code == 201

    rest = httpx.Client(
        base_url=f"{stack['API_URL']}/rest/v1",
        headers={"apikey": stack["ANON_KEY"], "Authorization": f"Bearer {dana.access_token}"},
    )
    assert rest.get("/requests", params={"select": "id"}).json() != []  # sanity: sees it now

    assert _remove(client, manager.headers, flat["id"], dana.id).status_code == 200
    for table in ("requests", "messages", "announcements", "flats", "request_events"):
        response = rest.get(f"/{table}", params={"select": "id"})
        assert response.status_code == 200, (table, response.text)
        assert response.json() == [], table
    forged = rest.post(
        "/messages", json={"building_id": BUILDING_A, "author_id": dana.id, "body": "direct"}
    )
    assert forged.status_code in {401, 403}
    rest.close()


def test_remove_rules(client: TestClient, make_account, make_flat) -> None:
    manager = make_account(BUILDING_A, None, role="manager")
    outsider_manager = make_account(BUILDING_B, None, role="manager")
    flat = make_flat(BUILDING_A)
    other_flat = make_flat(BUILDING_A)
    dana = _resident_of(client, make_account, flat)
    neighbour = _resident_of(client, make_account, flat, name="Neighbour")
    # Linked to the flat itself, so only the role check keeps them out of reach.
    other_manager = make_account(BUILDING_A, flat["id"], role="manager")

    def still_linked(account) -> bool:
        return client.get("/api/me", headers=account.headers).json()["resident"] is not None

    # A plain resident cannot remove anyone, not even a flatmate.
    assert _remove(client, neighbour.headers, flat["id"], dana.id).status_code == 403
    # Another building's manager: the flat does not exist for them.
    assert _remove(client, outsider_manager.headers, flat["id"], dana.id).status_code == 404
    assert still_linked(dana)
    # The right resident, but not in this flat.
    assert _remove(client, manager.headers, other_flat["id"], dana.id).status_code == 404
    assert still_linked(dana)
    # Managers - the caller included - are never removed here.
    assert _remove(client, manager.headers, flat["id"], manager.id).status_code == 404
    assert client.get("/api/flats", headers=manager.headers).status_code == 200
    assert _remove(client, manager.headers, flat["id"], other_manager.id).status_code == 404
    assert _remove(client, other_manager.headers, flat["id"], other_manager.id).status_code == 404
    assert client.get("/api/flats", headers=other_manager.headers).status_code == 200
    # Unknown ids.
    assert _remove(client, manager.headers, flat["id"], MISSING).status_code == 404
    assert _remove(client, manager.headers, MISSING, dana.id).status_code == 404
    assert _remove(client, manager.headers, flat["id"], "nope").status_code == 422

    assert _remove(client, manager.headers, flat["id"], dana.id).status_code == 200
    assert not still_linked(dana)
    assert still_linked(neighbour)  # only the chosen resident goes
    # Twice is "not found": they are no longer in the flat.
    assert _remove(client, manager.headers, flat["id"], dana.id).status_code == 404


def test_removed_resident_rejoins_only_with_current_code(
    client: TestClient, make_account, make_flat
) -> None:
    manager = make_account(BUILDING_A, None, role="manager")
    flat = make_flat(BUILDING_A)
    dana = _resident_of(client, make_account, flat)
    neighbour = _resident_of(client, make_account, flat, name="Neighbour")
    filed = _file_request(client, dana.headers, "Leaking tap")
    assert filed.status_code == 201
    url = f"/api/flats/{flat['id']}/residents"
    first_joined = client.get(url, headers=manager.headers).json()[0]
    assert first_joined["id"] == dana.id

    assert _remove(client, manager.headers, flat["id"], dana.id).status_code == 200
    rotated = client.post(f"/api/flats/{flat['id']}/rotate-code", headers=manager.headers).json()

    # The leaked code is dead, so removal sticks.
    assert _join(client, dana.headers, flat["join_code"], "Dana").status_code == 404
    assert client.get("/api/me", headers=dana.headers).json()["resident"] is None

    # With the current code they come back, as the same account.
    rejoined = _join(client, dana.headers, rotated["join_code"], "Dana K")
    assert rejoined.status_code == 200, rejoined.text
    assert rejoined.json()["id"] == dana.id
    assert rejoined.json()["flat_id"] == flat["id"]
    assert rejoined.json()["full_name"] == "Dana K"
    assert client.get("/api/me", headers=dana.headers).json()["resident"]["flat_id"] == flat["id"]
    assert client.get("/api/requests", headers=dana.headers).status_code == 200
    # An active account still cannot join twice.
    assert _join(client, dana.headers, rotated["join_code"], "Dana").status_code == 409

    # Their earlier request is still theirs.
    mine = client.get("/api/requests", headers=dana.headers, params={"mine": "true"}).json()
    assert [r["id"] for r in mine] == [filed.json()["id"]]
    # They show as newly joined, after the flatmate who never left.
    listed = client.get(url, headers=manager.headers).json()
    assert [r["id"] for r in listed] == [neighbour.id, dana.id]
    rejoined_at = TIMESTAMP.validate_python(listed[1]["created_at"])
    assert rejoined_at > TIMESTAMP.validate_python(first_joined["created_at"])
