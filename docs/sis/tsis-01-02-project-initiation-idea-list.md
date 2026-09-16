# TSIS 1 + TSIS 2 — Project Initiation and Idea List

**Course:** IT Project Management (PjM 101) · **Team:** house-app · **Date:** 2026-09-16

---

## 1. Project / Idea Description

**Project name:** house-app

**Problem.** A residential complex is coordinated today through an ad-hoc messaging group. A new
resident must find a person and ask to be added, so the channel is not discoverable. Announcements
from the management company are buried under unrelated conversation, and planned water or power
shutdowns are often not communicated at all. When something breaks, ten neighbours report the same
fault separately, the management company spends effort separating duplicates, and no one can see
whether the problem is being worked on. Owners who rent their units out are in a worse position
again: they pay the service fee but belong to no chat and learn nothing about the building.

**Proposed solution.** A web platform that replaces the messaging group with a structured channel
tied to the building. Residents verify against their unit and get access without asking anyone.
Faults are submitted as requests with a photograph, an owner and a status, so duplicates merge into
one item and progress is visible to everyone. The management company publishes announcements and
emergency alerts through one entry point that provably reaches every unit, holds votes on collective
decisions, and collects contributions for agreed works.

**Target audience.** Management companies operating residential complexes in Kazakhstan are the
paying customer. Residents, owner-landlords, tenants and technicians are the users.

**Expected deliverable (MVP).** A deployed web application in which a resident joins by verifying
against a unit, files a fault request with a photograph and follows its status, and the management
company issues an announcement that reaches the whole building.

**Alignment with course goals.** The scope is bounded to an MVP that fits the academic calendar and
produces the full set of project-management artefacts — charter, WBS, RACI, sprint backlog and risk
register — over the semester.

---

## 2. RACI Matrix

**Roles.** The team has two members, so each holds several roles. Exactly one role is Accountable
for each task.

| Code | Role | Held by |
|---|---|---|
| PM | Project Manager — scope, schedule, course artefacts | Altair Zhambyl |
| BE | Backend developer — API, database, authentication | Altair Zhambyl |
| FE | Frontend developer — web client | Zere Bayzhan |
| UX | UX / UI — wireframes, brand, visual design | Zere Bayzhan |
| QA | Quality and testing | Altair Zhambyl |
| SPON | Sponsor — course instructor / product owner | Course instructor |

| # | Task / Activity | PM | BE | FE | UX | QA | SPON |
|---|---|---|---|---|---|---|---|
| 1 | Define project scope and MVP | **A** | C | C | C | I | C |
| 2 | Stakeholder interviews with residents and management staff | **A**/R | C | I | C | I | I |
| 3 | Competitor research on existing products | **A**/R | I | I | C | I | I |
| 4 | Requirements and initial feature list | **A** | C | C | C | C | C |
| 5 | Database schema design | C | **A**/R | C | I | C | I |
| 6 | Set up workspace: repository, issue tracking, deployment | C | **A**/R | C | I | I | I |
| 7 | Brand design, colour scheme and UI wireframes | I | I | C | **A**/R | I | C |
| 8 | Implement authentication and authorisation | I | **A**/R | C | I | C | I |
| 9 | Implement fault requests with photographs and status | C | **A**/R | C | C | C | I |
| 10 | Implement frontend request screens | C | C | **A**/R | C | C | I |
| 11 | Test MVP and fix defects | C | C | C | I | **A**/R | I |
| 12 | Prepare demo and submit course artefacts | **A**/R | C | C | C | I | I |

*Legend: R = Responsible (does the work), A = Accountable (approves, answerable for the result),
C = Consult (agreed with before execution), I = Inform (notified of progress or result).
Where A/R appear together, the same role both executes and approves.*

---

## 3. List of Stakeholder's Expectations

| Stakeholder | Role (group) | Expectation | Priority | How we will manage it |
|---|---|---|---|---|
| Management company | Client — buyer | Receive each fault once instead of ten times, and hold a defensible record of what was done and when | High | Duplicate requests merge into one item; every request keeps a timestamped history |
| Residents | Client — users | Reach the management company without asking permission, and see whether a problem is being worked on | High | Verification against a unit grants access unaided; status is visible on every request |
| Owner-landlords | Client — users | See what happens in a building they pay for but do not live in | Medium | Access is tied to the unit, not to chat membership; announcements reach absent owners |
| Technicians | Client — users | Arrive with enough context to fix the fault on the first visit | Medium | Requests carry a photograph, a location and a description before dispatch |
| Course instructor | Parent organization — sponsor | Artefacts delivered on the course calendar; the project demonstrates the methodology | High | Weekly plan-and-fact report; one-week sprints tracked on the project board |
| Project team | Project team | Even workload across two members and clear ownership of each task | High | RACI above assigns one accountable role per task; sprint planning each week |
| Utility providers | Public / external | Publish an outage once and have it reach every affected resident | Low | Announcements are issued from a single entry point per building |

---

## 4. Idea List

| # | Idea | Why |
|---|---|---|
| 1 | Structured building channel, official notices separated from conversation | The central problem: announcements are lost in chat noise |
| 2 | Fault requests with photograph, owner and status | Removes duplicates and makes progress visible — the buyer's main cost |
| 3 | Announcements for planned water, power and gas works | The most frequently reported failure of the current process |
| 4 | Emergency broadcast to every unit at once | Gas, fire and flooding have no channel today |
| 5 | Electronic voting on collective decisions | Physical general meetings rarely reach quorum |
| 6 | Collection of contributions for agreed works | Removes cash handling and makes the total raised visible |
| 7 | Per-asset fault history and statistics | A lift failing repeatedly is currently invisible to anyone |
| 8 | Access for owner-landlords who do not live in the building | They pay the fee, hold the liability, and are served by nothing today |

---

## 5. Initial Features List

| Feature | Description | Why (user value) | Priority |
|---|---|---|---|
| Resident verification and sign-in | Join by verifying against a unit in a building | Access without finding a person and asking permission | **Must** |
| Building channel | Messages scoped to one building, official notices pinned separately | One place per building instead of scattered chats | **Must** |
| Fault request with photograph | Submit a problem with image, location and description | The technician arrives prepared; no phone call needed | **Must** |
| Request status and history | Open / in progress / done, with a timestamped trail | Residents see progress; management can prove what was done | **Must** |
| Announcements | Management publishes notices, including planned outages | Residents learn about shutdowns before they happen | **Must** |
| Duplicate request merging | Reports of the same fault attach to one request | Management stops processing the same problem ten times | **Should** |
| Emergency broadcast | Immediate alert to every unit — gas, fire, flood | The only channel that must never be missed | **Should** |
| Violation and complaint tracking | Complaints about noise or misuse, visible to management only | Raises an issue without a face-to-face confrontation | **Should** |
| Electronic voting | Proposals with a deadline and a visible tally | Decisions without gathering everyone physically | **Should** |
| Contribution collection | Request and track payment towards an agreed work | Replaces cash collection; the total raised is visible | **Should** |
| Per-asset fault statistics | Failure counts and repair times per lift, entrance, pipe | Identifies assets that should be replaced, not repaired again | **Should** |
| Owner-landlord access | Unit access that can be granted to a tenant and withdrawn | Absent owners stay informed; access survives tenant changes | **Could** |
| Technician assignment | Route a request to a named technician with a due date | Work stops being handed over verbally and getting lost | **Could** |

---

## 6. AI Disclosure

Generative AI (Claude) was used for document structure, English wording, and for organising the
team's raw problem list into the tables above. The choice of project, the stakeholder set, the
feature list and its priorities were decided by the team. AI assistance was also used for the
software scaffolding of the repository, which is not part of this submission.
