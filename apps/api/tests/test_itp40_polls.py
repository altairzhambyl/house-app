"""ITP-40 + ITP-55: building polls, end to end against local Supabase.

Residents propose, managers approve or reject; managers' polls open at once.
One vote per resident; no votes on proposals, rejections, closed or expired polls.
"""

from datetime import datetime, timedelta, timezone

import httpx
from fastapi.testclient import TestClient

from tests.conftest import BUILDING_A, BUILDING_B, FLAT_A_7A, FLAT_A_14B, FLAT_B_22C

MISSING = "00000000-0000-0000-0000-000000000000"


def _in(days: float) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def _create(client: TestClient, headers: dict[str, str], question: str, **extra) -> dict:
    response = client.post(
        "/api/polls", headers=headers, json={"question": question, "ends_at": _in(7), **extra}
    )
    assert response.status_code == 201, response.text
    return response.json()


def _vote(client: TestClient, headers: dict[str, str], poll_id: str, choice: str):
    return client.post(f"/api/polls/{poll_id}/vote", headers=headers, json={"choice": choice})


def _listed(client: TestClient, headers: dict[str, str]) -> dict[str, dict]:
    response = client.get("/api/polls", headers=headers)
    assert response.status_code == 200, response.text
    return {p["id"]: p for p in response.json()}


def _admin(stack: dict[str, str]) -> dict[str, str]:
    return {
        "apikey": stack["SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {stack['SERVICE_ROLE_KEY']}",
    }


def test_manager_poll_opens_and_each_resident_votes_once(client: TestClient, make_account) -> None:
    manager = make_account(BUILDING_A, None, role="manager")
    alice = make_account(BUILDING_A, FLAT_A_14B)
    bob = make_account(BUILDING_A, FLAT_A_7A)

    poll = _create(client, manager.headers, "  Install a barrier at the gate?  ", description="   ")
    assert poll["status"] == "open"
    assert poll["question"] == "Install a barrier at the gate?"
    assert poll["description"] is None
    assert poll["building_id"] == BUILDING_A
    assert poll["author_id"] == manager.id
    assert (poll["votes_total"], poll["my_choice"], poll["reject_reason"]) == (0, None, None)

    voted = _vote(client, alice.headers, poll["id"], "for")
    assert voted.status_code == 200, voted.text
    body = voted.json()
    assert body["my_choice"] == "for"
    assert (body["votes_for"], body["votes_against"], body["votes_abstain"]) == (1, 0, 0)
    assert body["votes_total"] == 1

    # One vote per resident: neither the same nor a different choice is accepted again.
    assert _vote(client, alice.headers, poll["id"], "for").status_code == 409
    assert _vote(client, alice.headers, poll["id"], "against").status_code == 409

    assert _vote(client, bob.headers, poll["id"], "against").status_code == 200
    # Managers run the poll; they are not voters.
    assert _vote(client, manager.headers, poll["id"], "abstain").status_code == 403
    assert _vote(client, bob.headers, poll["id"], "maybe").status_code == 422

    seen_by_alice = _listed(client, alice.headers)[poll["id"]]
    seen_by_bob = _listed(client, bob.headers)[poll["id"]]
    seen_by_manager = _listed(client, manager.headers)[poll["id"]]
    assert seen_by_alice["my_choice"] == "for"
    assert seen_by_bob["my_choice"] == "against"
    assert seen_by_manager["my_choice"] is None
    for seen in (seen_by_alice, seen_by_bob, seen_by_manager):
        assert (seen["votes_for"], seen["votes_against"], seen["votes_total"]) == (1, 1, 2)


def test_eligible_voters_are_the_buildings_residents(client: TestClient, make_account) -> None:
    manager = make_account(BUILDING_A, None, role="manager")
    poll = _create(client, manager.headers, "Paint the stairwell green?")
    before = poll["eligible_voters"]
    assert before >= 1  # the seed's demo resident lives in building A

    make_account(BUILDING_A, FLAT_A_7A)
    make_account(BUILDING_A, None, role="manager")  # not a voter
    make_account(BUILDING_B, FLAT_B_22C)  # another building
    assert _listed(client, manager.headers)[poll["id"]]["eligible_voters"] == before + 1


def test_resident_proposal_needs_a_managers_approval(client: TestClient, make_account) -> None:
    manager = make_account(BUILDING_A, None, role="manager")
    author = make_account(BUILDING_A, FLAT_A_14B)
    neighbour = make_account(BUILDING_A, FLAT_A_7A)
    other_manager = make_account(BUILDING_B, None, role="manager")

    proposal = _create(
        client, author.headers, "Add a bike rack?", description="Next to entrance 2."
    )
    assert proposal["status"] == "proposed"
    assert proposal["description"] == "Next to entrance 2."

    # Visible to its author and the building's managers only.
    assert proposal["id"] in _listed(client, author.headers)
    assert proposal["id"] in _listed(client, manager.headers)
    assert proposal["id"] not in _listed(client, neighbour.headers)
    assert proposal["id"] not in _listed(client, other_manager.headers)

    # No votes before approval.
    assert _vote(client, author.headers, proposal["id"], "for").status_code == 409
    assert _vote(client, neighbour.headers, proposal["id"], "for").status_code == 404

    # Residents cannot moderate, not even their own proposal.
    for resident in (author, neighbour):
        approve = client.post(f"/api/polls/{proposal['id']}/approve", headers=resident.headers)
        assert approve.status_code == 403
        reject = client.post(
            f"/api/polls/{proposal['id']}/reject", headers=resident.headers, json={"reason": "x"}
        )
        assert reject.status_code == 403
    # Another building's manager does not even learn that it exists.
    foreign = client.post(f"/api/polls/{proposal['id']}/approve", headers=other_manager.headers)
    assert foreign.status_code == 404
    missing = client.post(f"/api/polls/{MISSING}/approve", headers=manager.headers)
    assert missing.status_code == 404

    approved = client.post(f"/api/polls/{proposal['id']}/approve", headers=manager.headers)
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "open"
    assert approved.json()["reviewed_at"] is not None

    # Only from "proposed".
    assert (
        client.post(f"/api/polls/{proposal['id']}/approve", headers=manager.headers).status_code
        == 409
    )
    reject_open = client.post(
        f"/api/polls/{proposal['id']}/reject", headers=manager.headers, json={"reason": "late"}
    )
    assert reject_open.status_code == 409

    assert proposal["id"] in _listed(client, neighbour.headers)
    assert _vote(client, neighbour.headers, proposal["id"], "abstain").status_code == 200
    assert _vote(client, author.headers, proposal["id"], "for").status_code == 200


def test_rejected_proposal_shows_the_reason_to_its_author(client: TestClient, make_account) -> None:
    manager = make_account(BUILDING_A, None, role="manager")
    author = make_account(BUILDING_A, FLAT_A_14B)
    neighbour = make_account(BUILDING_A, FLAT_A_7A)
    proposal = _create(client, author.headers, "Ban parking in the yard?")
    url = f"/api/polls/{proposal['id']}/reject"

    assert client.post(url, headers=manager.headers, json={"reason": "   "}).status_code == 422
    assert client.post(url, headers=manager.headers, json={}).status_code == 422

    rejected = client.post(url, headers=manager.headers, json={"reason": "  Already decided.  "})
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["status"] == "rejected"
    assert rejected.json()["reject_reason"] == "Already decided."

    mine = _listed(client, author.headers)[proposal["id"]]
    assert (mine["status"], mine["reject_reason"]) == ("rejected", "Already decided.")
    assert proposal["id"] in _listed(client, manager.headers)
    assert proposal["id"] not in _listed(client, neighbour.headers)

    assert _vote(client, author.headers, proposal["id"], "for").status_code == 409
    assert (
        client.post(f"/api/polls/{proposal['id']}/approve", headers=manager.headers).status_code
        == 409
    )
    assert client.post(url, headers=manager.headers, json={"reason": "again"}).status_code == 409


def test_poll_input_is_validated(client: TestClient, make_account) -> None:
    resident = make_account(BUILDING_A, FLAT_A_14B)

    def create(**body) -> int:
        return client.post("/api/polls", headers=resident.headers, json=body).status_code

    assert create(question="Past?", ends_at=_in(-1)) == 422
    assert create(question="Too far?", ends_at=_in(400)) == 422
    assert create(question="No offset?", ends_at="2030-01-01T12:00:00") == 422
    assert create(question="No end date?") == 422
    assert create(question="   ", ends_at=_in(3)) == 422
    assert create(question="x" * 301, ends_at=_in(3)) == 422
    assert create(question="Long text?", description="x" * 2001, ends_at=_in(3)) == 422
    assert create(question="x" * 300, description="x" * 2000, ends_at=_in(3)) == 201


def test_closed_and_expired_polls_take_no_votes(client: TestClient, stack, make_account) -> None:
    manager = make_account(BUILDING_A, None, role="manager")
    resident = make_account(BUILDING_A, FLAT_A_14B)

    poll = _create(client, manager.headers, "Close me early?")
    close_url = f"/api/polls/{poll['id']}/close"
    assert client.post(close_url, headers=resident.headers).status_code == 403
    closed = client.post(close_url, headers=manager.headers)
    assert closed.status_code == 200, closed.text
    assert closed.json()["status"] == "closed"
    assert client.post(close_url, headers=manager.headers).status_code == 409
    assert _vote(client, resident.headers, poll["id"], "for").status_code == 409
    assert _listed(client, resident.headers)[poll["id"]]["status"] == "closed"

    # An open poll past its end date counts as closed.
    expired = _create(client, manager.headers, "Already over?")
    httpx.patch(
        f"{stack['API_URL']}/rest/v1/polls",
        params={"id": f"eq.{expired['id']}"},
        headers=_admin(stack),
        json={"created_at": "2020-01-01T00:00:00Z", "ends_at": "2020-01-02T00:00:00Z"},
        timeout=10,
    ).raise_for_status()
    assert _listed(client, resident.headers)[expired["id"]]["status"] == "closed"
    assert _vote(client, resident.headers, expired["id"], "for").status_code == 409

    # A proposal past its end date can no longer be approved.
    proposal = _create(client, resident.headers, "Too late to approve?")
    httpx.patch(
        f"{stack['API_URL']}/rest/v1/polls",
        params={"id": f"eq.{proposal['id']}"},
        headers=_admin(stack),
        json={"created_at": "2020-01-01T00:00:00Z", "ends_at": "2020-01-02T00:00:00Z"},
        timeout=10,
    ).raise_for_status()
    late = client.post(f"/api/polls/{proposal['id']}/approve", headers=manager.headers)
    assert late.status_code == 409


def test_polls_stay_inside_their_building(client: TestClient, make_account) -> None:
    manager = make_account(BUILDING_A, None, role="manager")
    outsider = make_account(BUILDING_B, FLAT_B_22C)
    outsider_manager = make_account(BUILDING_B, None, role="manager")
    poll = _create(client, manager.headers, "Building A only?")

    assert poll["id"] not in _listed(client, outsider.headers)
    assert poll["id"] not in _listed(client, outsider_manager.headers)
    assert _vote(client, outsider.headers, poll["id"], "for").status_code == 404
    close = client.post(f"/api/polls/{poll['id']}/close", headers=outsider_manager.headers)
    assert close.status_code == 404
    reject = client.post(
        f"/api/polls/{poll['id']}/reject", headers=outsider_manager.headers, json={"reason": "x"}
    )
    assert reject.status_code == 404


def test_direct_database_access_follows_the_poll_rules(
    client: TestClient, stack, make_account
) -> None:
    """RLS second line: user tokens used straight against Supabase REST."""
    manager = make_account(BUILDING_A, None, role="manager")
    alice = make_account(BUILDING_A, FLAT_A_14B)
    bob = make_account(BUILDING_A, FLAT_A_7A)
    open_poll = _create(client, manager.headers, "Direct access?")
    proposal = _create(client, bob.headers, "Bob's idea?")
    assert _vote(client, bob.headers, open_poll["id"], "against").status_code == 200

    rest = httpx.Client(
        base_url=f"{stack['API_URL']}/rest/v1",
        headers={"apikey": stack["ANON_KEY"], "Authorization": f"Bearer {alice.access_token}"},
        timeout=10,
    )
    row = {
        "building_id": BUILDING_A,
        "author_id": alice.id,
        "question": "Forged?",
        "ends_at": _in(3),
    }
    # A resident cannot open a poll themselves or fill in the moderation fields.
    assert rest.post("/polls", json={**row, "status": "open"}).status_code in {401, 403}
    assert rest.post("/polls", json={**row, "reject_reason": "x"}).status_code in {401, 403}
    # Someone else's proposal is invisible; a ballot is private.
    visible = rest.get("/polls", params={"select": "id"}).json()
    assert open_poll["id"] in {p["id"] for p in visible}
    assert proposal["id"] not in {p["id"] for p in visible}
    assert rest.get("/poll_votes", params={"select": "poll_id"}).json() == []

    vote = {"poll_id": proposal["id"], "building_id": BUILDING_A, "resident_id": alice.id}
    assert rest.post("/poll_votes", json={**vote, "choice": "for"}).status_code in {401, 403}
    forged = {**vote, "poll_id": open_poll["id"], "resident_id": bob.id, "choice": "for"}
    assert rest.post("/poll_votes", json=forged).status_code in {401, 403}
    approve = rest.patch("/polls", params={"id": f"eq.{proposal['id']}"}, json={"status": "open"})
    assert approve.status_code in {401, 403}
    tallies = rest.post(
        "/rpc/poll_tallies", json={"p_building_id": BUILDING_A, "p_poll_ids": [open_poll["id"]]}
    )
    assert tallies.status_code in {401, 403, 404}, tallies.text
    rest.close()

    totals = _listed(client, manager.headers)[open_poll["id"]]
    assert (totals["votes_for"], totals["votes_against"]) == (0, 1)


def test_poll_creation_is_rate_limited(client: TestClient, make_account) -> None:
    resident = make_account(BUILDING_B, FLAT_B_22C)
    statuses = [
        client.post(
            "/api/polls", headers=resident.headers, json={"question": f"Q{i}?", "ends_at": _in(2)}
        ).status_code
        for i in range(11)
    ]
    assert statuses[:10] == [201] * 10
    assert statuses[10] == 429
