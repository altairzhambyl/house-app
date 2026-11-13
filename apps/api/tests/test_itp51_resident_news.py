"""ITP-51: residents submit building news, managers approve or reject it.

End to end against local Supabase.
"""

import httpx
from fastapi.testclient import TestClient

from tests.conftest import BUILDING_A, BUILDING_B, FLAT_A_7A, FLAT_A_14B, FLAT_B_22C

MISSING = "00000000-0000-0000-0000-000000000000"
NEWS = {"title": "Lost cat", "body": "Grey cat found near entrance 2, ask at flat 14B."}


def _post(client: TestClient, headers: dict[str, str], news: dict = NEWS) -> dict:
    response = client.post("/api/announcements", headers=headers, json=news)
    assert response.status_code == 201, response.text
    return response.json()


def _ids(client: TestClient, headers: dict[str, str], **params: str) -> set[str]:
    response = client.get("/api/announcements", headers=headers, params=params)
    assert response.status_code == 200, response.text
    return {a["id"] for a in response.json()}


def _approve(client: TestClient, headers: dict[str, str], news_id: str) -> httpx.Response:
    return client.post(f"/api/announcements/{news_id}/approve", headers=headers)


def _reject(
    client: TestClient, headers: dict[str, str], news_id: str, reason: str | None = None
) -> httpx.Response:
    body = None if reason is None else {"reason": reason}
    return client.post(f"/api/announcements/{news_id}/reject", headers=headers, json=body)


def test_resident_news_is_pending_and_hidden_from_neighbours(
    client: TestClient, make_account
) -> None:
    author = make_account(BUILDING_A, FLAT_A_14B)
    neighbour = make_account(BUILDING_A, FLAT_A_7A)
    manager = make_account(BUILDING_A, None, role="manager")

    created = _post(client, author.headers)
    assert created["status"] == "pending"
    assert created["is_official"] is False
    assert created["author_flat_number"] == "14B"
    assert created["reject_reason"] is None
    assert created["reviewed_at"] is None
    assert "author_name" not in created  # flat label only, never the name

    assert created["id"] in _ids(client, author.headers)
    assert created["id"] in _ids(client, author.headers, status="pending")
    assert created["id"] not in _ids(client, neighbour.headers)
    assert created["id"] not in _ids(client, neighbour.headers, status="pending")
    assert created["id"] in _ids(client, manager.headers, status="pending")
    assert created["id"] not in _ids(client, manager.headers, status="published")


def test_manager_news_is_official_and_published(client: TestClient, make_account) -> None:
    manager = make_account(BUILDING_A, None, role="manager")
    resident = make_account(BUILDING_A, FLAT_A_14B)

    created = _post(client, manager.headers)
    assert created["status"] == "published"
    assert created["is_official"] is True
    assert created["author_flat_number"] is None
    assert created["id"] in _ids(client, resident.headers, status="published")


def test_manager_approves_resident_news(client: TestClient, make_account) -> None:
    author = make_account(BUILDING_A, FLAT_A_14B)
    neighbour = make_account(BUILDING_A, FLAT_A_7A)
    manager = make_account(BUILDING_A, None, role="manager")
    created = _post(client, author.headers)

    approved = _approve(client, manager.headers, created["id"])
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "published"
    assert approved.json()["reviewed_at"] is not None
    assert approved.json()["is_official"] is False  # still the resident's post

    assert created["id"] in _ids(client, neighbour.headers)
    assert created["id"] not in _ids(client, manager.headers, status="pending")

    # Only a pending post can be reviewed.
    assert _approve(client, manager.headers, created["id"]).status_code == 409
    assert _reject(client, manager.headers, created["id"]).status_code == 409


def test_manager_rejects_resident_news(client: TestClient, make_account) -> None:
    author = make_account(BUILDING_A, FLAT_A_14B)
    neighbour = make_account(BUILDING_A, FLAT_A_7A)
    manager = make_account(BUILDING_A, None, role="manager")
    with_reason = _post(client, author.headers)
    without_reason = _post(client, author.headers)

    rejected = _reject(client, manager.headers, with_reason["id"], "  Please use the chat  ")
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["status"] == "rejected"
    assert rejected.json()["reject_reason"] == "Please use the chat"

    bare = _reject(client, manager.headers, without_reason["id"])
    assert bare.status_code == 200, bare.text
    assert bare.json()["reject_reason"] is None

    # The author sees their rejected posts with the reason; neighbours never do.
    own = {a["id"]: a for a in client.get("/api/announcements", headers=author.headers).json()}
    assert own[with_reason["id"]]["status"] == "rejected"
    assert own[with_reason["id"]]["reject_reason"] == "Please use the chat"
    assert with_reason["id"] not in _ids(client, neighbour.headers)
    assert with_reason["id"] not in _ids(client, neighbour.headers, status="rejected")

    assert _approve(client, manager.headers, with_reason["id"]).status_code == 409


def test_only_managers_of_the_building_review(client: TestClient, make_account) -> None:
    author = make_account(BUILDING_A, FLAT_A_14B)
    neighbour = make_account(BUILDING_A, FLAT_A_7A)
    outsider_manager = make_account(BUILDING_B, None, role="manager")
    outsider = make_account(BUILDING_B, FLAT_B_22C)
    created = _post(client, author.headers)

    assert _approve(client, author.headers, created["id"]).status_code == 403
    assert _approve(client, neighbour.headers, created["id"]).status_code == 403
    assert _reject(client, neighbour.headers, created["id"]).status_code == 403

    # Another building's post is "not found", so its existence does not leak.
    assert _approve(client, outsider_manager.headers, created["id"]).status_code == 404
    assert _reject(client, outsider_manager.headers, created["id"]).status_code == 404
    assert _approve(client, outsider_manager.headers, MISSING).status_code == 404
    assert created["id"] not in _ids(client, outsider_manager.headers)
    assert created["id"] not in _ids(client, outsider.headers)

    # Nothing changed: still in the building's queue.
    manager = make_account(BUILDING_A, None, role="manager")
    assert created["id"] in _ids(client, manager.headers, status="pending")


def test_reject_reason_is_validated(client: TestClient, make_account) -> None:
    author = make_account(BUILDING_A, FLAT_A_14B)
    manager = make_account(BUILDING_A, None, role="manager")
    created = _post(client, author.headers)

    too_long = _reject(client, manager.headers, created["id"], "x" * 501)
    assert too_long.status_code == 422
    blank = _reject(client, manager.headers, created["id"], "   ")
    assert blank.status_code == 200, blank.text
    assert blank.json()["reject_reason"] is None


def test_direct_database_access_respects_news_review(
    client: TestClient, stack, make_account
) -> None:
    """RLS second line: resident tokens used straight against Supabase REST."""
    author = make_account(BUILDING_A, FLAT_A_14B)
    neighbour = make_account(BUILDING_A, FLAT_A_7A)

    def rest(account) -> httpx.Client:
        return httpx.Client(
            base_url=f"{stack['API_URL']}/rest/v1",
            headers={
                "apikey": stack["ANON_KEY"],
                "Authorization": f"Bearer {account.access_token}",
            },
        )

    author_rest, neighbour_rest = rest(author), rest(neighbour)
    row = {"building_id": BUILDING_A, "author_id": author.id, **NEWS}
    # The column default is 'published', so a resident must ask for 'pending'.
    for forged in ({}, {"status": "published"}, {"status": "rejected"}):
        assert author_rest.post("/announcements", json={**row, **forged}).status_code == 403
    impersonation = {**row, "author_id": neighbour.id, "status": "pending"}
    assert author_rest.post("/announcements", json=impersonation).status_code == 403

    created = _post(client, author.headers)
    params = {"select": "id", "id": f"eq.{created['id']}"}
    assert author_rest.get("/announcements", params=params).json() == [{"id": created["id"]}]
    assert neighbour_rest.get("/announcements", params=params).json() == []

    # No update policy: a resident cannot publish their own post.
    changed = author_rest.patch(
        "/announcements",
        params={"id": f"eq.{created['id']}"},
        headers={"Prefer": "return=representation"},
        json={"status": "published"},
    )
    # Either no UPDATE privilege at all, or no row matches an update policy.
    assert changed.status_code in {200, 401, 403}, changed.text
    if changed.status_code == 200:
        assert changed.json() == []
    assert created["id"] not in _ids(client, neighbour.headers)
    author_rest.close()
    neighbour_rest.close()


def test_resident_submissions_are_rate_limited(client: TestClient, make_account) -> None:
    # Residents: 5 suggestions per hour (rate_limit.LIMITS["resident_news"]).
    author = make_account(BUILDING_B, FLAT_B_22C)
    statuses = [
        client.post("/api/announcements", headers=author.headers, json=NEWS).status_code
        for _ in range(6)
    ]
    assert statuses[:5] == [201] * 5
    assert statuses[5] == 429

    # Managers are held only to the general "announcement" limit.
    manager = make_account(BUILDING_B, None, role="manager")
    for _ in range(6):
        assert _post(client, manager.headers)["status"] == "published"


def test_news_list_is_paged(client: TestClient, make_account) -> None:
    manager = make_account(BUILDING_B, None, role="manager")
    older = _post(client, manager.headers)
    newer = _post(client, manager.headers)

    def page(**params: str) -> httpx.Response:
        return client.get("/api/announcements", headers=manager.headers, params=params)

    # Newest first, one row per page, nothing lost between pages.
    first = page(limit="1")
    assert first.status_code == 200, first.text
    assert [a["id"] for a in first.json()] == [newer["id"]]
    second = page(limit="1", offset="1")
    assert second.status_code == 200, second.text
    assert [a["id"] for a in second.json()] == [older["id"]]
    assert page(limit="101").status_code == 422
