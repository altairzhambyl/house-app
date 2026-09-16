# TSIS 1 + TSIS 2 — Project Initiation and Idea List

**Course:** IT Project Management (PjM 101) · **Team:** house-app · **Date:** 2026-09-16
**Members:** Altair Zhambyl, Zere Bayzhan

## 1. Project / Idea Description

**Project name:** house-app

**Problem.** A residential complex is coordinated through an ad-hoc messaging group. A new resident
must find someone and ask to be added, so the channel is not discoverable. Management announcements
are buried under unrelated conversation, and planned water or power shutdowns often go unannounced.
When something breaks, ten neighbours report the same fault separately, management spends effort
separating duplicates, and nobody can see whether the problem is being worked on. Owners who rent
their units out pay the service fee but belong to no chat and learn nothing about the building.

**Proposed solution.** A web platform replacing the messaging group with a channel tied to the
building. Residents verify against their unit and get access without asking anyone. Faults become
requests with a photo, an owner and a status, so duplicates merge and progress is visible.
Management announces planned works and emergencies through one entry point that reaches every unit,
holds votes on collective decisions, and collects contributions for agreed works.

**Target audience.** Management companies operating residential complexes in Kazakhstan are the
paying customer; residents, owner-landlords, tenants and technicians are the users.

**Expected deliverable (MVP).** A deployed web application in which a resident joins by verifying
against a unit, files a fault request with a photo and follows its status, and management issues an
announcement that reaches the whole building. Scope is bound by the three project constraints of
time, cost and scope (Meredith & Mantel, ch. 1, pp. 4-6).

## 2. RACI Matrix

Built over the WBS and using the four roles defined in Meredith & Mantel, ch. 6, section 6.3,
pp. 240-242: **R**esponsible does the work, **A**ccountable approves and answers for the result,
**C**onsult is agreed with beforehand, **I**nform is notified. Exactly one A per task.

**Roles.** PM, BE (backend) and QA - Altair Zhambyl. FE (frontend) and UX - Zere Bayzhan.
SPON (sponsor) - course instructor. Two members hold several roles each.

| # | Task / Activity | PM | BE | FE | UX | QA | SPON |
|---|---|---|---|---|---|---|---|
| 1 | Define scope and MVP | **A** | C | C | C | I | C |
| 2 | Stakeholder interviews | **A**/R | C | I | C | I | I |
| 3 | Competitor research | **A**/R | I | I | C | I | I |
| 4 | Requirements and feature list | **A** | C | C | C | C | C |
| 5 | Database schema design | C | **A**/R | C | I | C | I |
| 6 | Set up repository, tracking, deployment | C | **A**/R | C | I | I | I |
| 7 | Brand, colour scheme, wireframes | I | I | C | **A**/R | I | C |
| 8 | Authentication and authorisation | I | **A**/R | C | I | C | I |
| 9 | Fault requests with photo and status | C | **A**/R | C | C | C | I |
| 10 | Frontend request screens | C | C | **A**/R | C | C | I |
| 11 | Test MVP and fix defects | C | C | C | I | **A**/R | I |
| 12 | Demo and course artefacts | **A**/R | C | C | C | I | I |

*A/R = the same role both executes and approves.*

## 3. List of Stakeholder's Expectations

Grouped by the four parties-at-interest defined in Meredith & Mantel, ch. 1, p. 13: client, parent
organization, project team and the public. Each group defines success differently, so the table
records how each expectation will be managed rather than merely stating it.

| Stakeholder | Group | Expectation | Priority | How we manage it |
|---|---|---|---|---|
| Management company | Client (buyer) | Each fault once, not ten times; a defensible record | High | Duplicates merge; every request keeps a timestamped history |
| Residents | Client (user) | Reach management unaided; see if work is happening | High | Unit verification grants access; status on every request |
| Owner-landlords | Client (user) | See a building they pay for but do not live in | Medium | Access tied to the unit, not chat membership |
| Technicians | Client (user) | Fix the fault on the first visit | Medium | Photo, location and description before dispatch |
| Course instructor | Parent org (sponsor) | Artefacts on time; methodology shown | High | Weekly plan-and-fact report; one-week sprints |
| Project team | Project team | Even workload; clear ownership | High | One accountable role per task; weekly planning |
| Utility providers | Public | Publish an outage once, reach everyone | Low | One announcement entry point per building |

## 4. Idea List

| # | Idea | Why |
|---|---|---|
| 1 | Building channel, notices separated from chat | Announcements are lost in chat noise |
| 2 | Fault requests with photo, owner and status | Kills duplicates; makes progress visible |
| 3 | Planned-works announcements (water, power, gas) | Most frequent failure of the current process |
| 4 | Emergency broadcast to every unit | Gas, fire and flooding have no channel today |
| 5 | Electronic voting on collective decisions | Physical meetings rarely reach quorum |
| 6 | Collection of contributions for agreed works | Removes cash handling; total raised is visible |
| 7 | Per-asset fault history | A lift failing repeatedly is invisible today |
| 8 | Owner-landlord access | They pay and hold liability, served by nothing |

## 5. Initial Features List

| Feature | Description | Why (user value) | Priority |
|---|---|---|---|
| Resident sign-in | Verify against a unit | Access without asking a person | **Must** |
| Building channel | Messages scoped to a building | One place, not scattered chats | **Must** |
| Fault request with photo | Image, location, description | Technician arrives prepared | **Must** |
| Request status | Open / in progress / done, timestamped | Progress visible; work provable | **Must** |
| Announcements | Notices including planned outages | Shutdowns known in advance | **Must** |
| Duplicate merging | Reports attach to one request | Management handles it once | **Should** |
| Emergency broadcast | Instant alert: gas, fire, flood | Must never be missed | **Should** |
| Complaint tracking | Visible to management only | No face-to-face confrontation | **Should** |
| Electronic voting | Proposal, deadline, visible tally | Decisions without a gathering | **Should** |
| Contribution collection | Request and track payment | Replaces cash; total is visible | **Should** |
| Per-asset statistics | Failures and repair times per asset | Shows what to replace | **Could** |
| Owner-landlord access | Grantable to a tenant, revocable | Absent owners stay informed | **Could** |

## 6. AI Disclosure

Generative AI (Claude) was used for document structure, English wording, and for organising the
team's raw problem list into the tables above. The choice of project, the stakeholder set, the
feature list and its priorities were decided by the team. AI assistance was also used for the
software scaffolding of the project repository, which is not part of this submission.
