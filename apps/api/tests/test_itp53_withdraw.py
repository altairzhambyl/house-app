"""ITP-53: a resident withdraws their own request while it is still new.

Checked end to end against local Supabase.
"""

import httpx
from fastapi.testclient import TestClient

from tests.conftest import BUILDING_A, BUILDING_B, FLAT_A_7A, FLAT_A_14B, FLAT_B_22C


def _file_request(client: TestClient, headers: dict[str, str], text: str) -> dict:
    response = client.post(
        "/api/requests", headers=headers, json={"category": "plumbing", "description": text}
    )
    assert response.status_code == 201, response.text
    return response.json()


def _withdraw(client: TestClient, headers: dict[str, str], request_id: str) -> httpx.Response:
    return client.post(f"/api/requests/{request_id}/withdraw", headers=headers)


def test_author_withdraws_pending_request(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    manager = make_account(BUILDING_A, None, role="manager")
    created = _file_request(client, alice.headers, "Tap dripping, fixed it myself")

    response = _withdraw(client, alice.headers, created["id"])
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["id"] == created["id"]
    assert body["status"] == "withdrawn"
    assert [(e["status"], e["actor_name"]) for e in body["history"]] == [
        ("pending", "Test resident"),
        ("withdrawn", "Test resident"),
    ]

    # Nothing is deleted: it stays in the resident's and the manager's lists.
    mine = client.get("/api/requests", params={"mine": "true"}, headers=alice.headers).json()
    assert {r["id"]: r["status"] for r in mine}[created["id"]] == "withdrawn"
    seen = client.get(f"/api/requests/{created['id']}", headers=manager.headers)
    assert seen.status_code == 200
    assert seen.json()["status"] == "withdrawn"


def test_only_pending_requests_can_be_withdrawn(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    manager = make_account(BUILDING_A, None, role="manager")
    created = _file_request(client, alice.headers, "Boiler noise")
    url = f"/api/requests/{created['id']}"

    moved = client.patch(url, headers=manager.headers, json={"status": "in_progress"})
    assert moved.status_code == 200, moved.text
    late = _withdraw(client, alice.headers, created["id"])
    assert late.status_code == 409, late.text

    # Reopened by the manager, it is pending again and can be withdrawn - once.
    assert client.patch(url, headers=manager.headers, json={"status": "pending"}).status_code == 200
    assert _withdraw(client, alice.headers, created["id"]).status_code == 200
    again = _withdraw(client, alice.headers, created["id"])
    assert again.status_code == 409, again.text

    history = client.get(url, headers=alice.headers).json()["history"]
    assert [e["status"] for e in history] == ["pending", "in_progress", "pending", "withdrawn"]


def test_cannot_withdraw_someone_elses_request(client: TestClient, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    neighbour = make_account(BUILDING_A, FLAT_A_7A)
    manager = make_account(BUILDING_A, None, role="manager")
    outsider = make_account(BUILDING_B, FLAT_B_22C)
    created = _file_request(client, alice.headers, "Door closer broken")

    for account in (neighbour, manager, outsider):
        response = _withdraw(client, account.headers, created["id"])
        assert response.status_code == 404, response.text
    missing = _withdraw(client, alice.headers, "00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 404

    detail = client.get(f"/api/requests/{created['id']}", headers=alice.headers).json()
    assert detail["status"] == "pending"
    assert len(detail["history"]) == 1


def test_withdrawn_request_is_final_for_managers(client: TestClient, stack, make_account) -> None:
    alice = make_account(BUILDING_A, FLAT_A_14B)
    manager = make_account(BUILDING_A, None, role="manager")
    created = _file_request(client, alice.headers, "Lift button sticky")
    other = _file_request(client, alice.headers, "Still pending")
    url = f"/api/requests/{created['id']}"

    # Managers cannot withdraw through the status endpoint.
    forged = client.patch(
        f"/api/requests/{other['id']}", headers=manager.headers, json={"status": "withdrawn"}
    )
    assert forged.status_code == 422

    assert _withdraw(client, alice.headers, created["id"]).status_code == 200
    for target in ("pending", "in_progress", "done"):
        response = client.patch(url, headers=manager.headers, json={"status": target})
        assert response.status_code == 409, response.text

    # RLS second line: the manager's token straight against Supabase REST.
    with httpx.Client(
        base_url=f"{stack['API_URL']}/rest/v1",
        headers={"apikey": stack["ANON_KEY"], "Authorization": f"Bearer {manager.access_token}"},
    ) as rest:
        reopen = rest.patch(
            "/requests", params={"id": f"eq.{created['id']}"}, json={"status": "in_progress"}
        )
        assert reopen.status_code >= 400, reopen.text
        withdraw = rest.patch(
            "/requests", params={"id": f"eq.{other['id']}"}, json={"status": "withdrawn"}
        )
        assert withdraw.status_code >= 400, withdraw.text
        rpc = rest.post(
            "/rpc/withdraw_request",
            json={
                "p_request_id": other["id"],
                "p_building_id": BUILDING_A,
                "p_author_id": alice.id,
            },
        )
        assert rpc.status_code in {401, 403, 404}, rpc.text

    history = client.get(url, headers=alice.headers).json()["history"]
    assert [e["status"] for e in history] == ["pending", "withdrawn"]
    untouched = client.get(f"/api/requests/{other['id']}", headers=alice.headers).json()
    assert untouched["status"] == "pending"
    assert len(untouched["history"]) == 1


def test_withdraw_is_rate_limited(client: TestClient, make_account) -> None:
    # 20 per hour per user; refused calls count too.
    alice = make_account(BUILDING_A, FLAT_A_14B)
    created = _file_request(client, alice.headers, "Rate limit probe")
    statuses = [_withdraw(client, alice.headers, created["id"]).status_code for _ in range(21)]
    assert statuses[0] == 200
    assert statuses[1:20] == [409] * 19
    assert statuses[20] == 429
