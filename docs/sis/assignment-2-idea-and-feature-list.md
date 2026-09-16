# Assignment 2. Idea List and Initial Feature List

**Project:** house-app · **Team:** Altair Zhambyl, Zere Bayzhan · **Date:** 2026-09-16

## 1. Ideas considered

Four directions were evaluated in the planning session of 2026-09-16.

| # | Idea | Assessment | Outcome |
|---|---|---|---|
| I1 | Link-in-bio storefront for social-media sellers | Established international competitors; the team's own research found the incumbent already operates as a Kazakhstan legal entity, so "no local player" was not true | Rejected |
| I2 | CRM for niche businesses with content upload | No specific customer identified; the team could not name who would buy it | Rejected |
| I3 | Regional crowdfunding platform | Two-sided marketplace. Requires both funders and projects before it is useful to either | Rejected |
| I4 | **Resident-to-management platform for residential complexes** | Concrete problem the team experiences directly; a single identifiable buyer per building; usable from the first building onward | **Selected** |

**Why I4 won.** It has one paying customer per building rather than a market to be aggregated, the
team has direct access to users for validation, and it delivers value at a scale of one building —
unlike I3, which is worthless until both sides are populated.

**Commercial model: B2B.** The management organisation buys the product per building. Residents use
it and never pay. The product is therefore justified by what it saves the organisation, not by
resident satisfaction alone:

| What the buyer gets | Feature |
|---|---|
| The same fault reported once instead of ten times | F3 |
| A defensible record of what was done and when, in a dispute | F2, F3 |
| Technicians dispatched with a photograph and a location instead of a phone call | F3 |
| Failing assets identified before they fail again | F3 |
| One announcement that provably reached every unit | F4, F5 |

Resident-facing features earn their place by producing this evidence as a by-product. A resident who
files a structured request is generating the buyer's audit trail.

## 2. Problem to feature mapping

Forty-three problems were catalogued and grouped. The MVP addresses the communication and
request-handling groups.

| ID | Feature | Problems addressed | Serves |
|---|---|---|---|
| F1 | Structured building chat, separated from official notices | No single channel; joining needs permission; notices lost in noise | E1 |
| F2 | Complaint and violation tracking | No visibility on resolution; neighbour disputes handled face to face | E2, E5 |
| F3 | Fault requests with photographs, status and per-asset statistics | Technicians arrive without context; repeated failures invisible; duplicate reports | E2, E9, E11, E13 |
| F4 | Announcements, including planned outages | Outages announced badly or not at all | E3, E15 |
| F5 | Emergency broadcast | No way to reach every resident at once | E4 |

## 3. Scope boundary

Recording what the product deliberately does **not** do is as important as what it does. The
following were identified as real problems and consciously excluded from the MVP:

| Excluded | Reason |
|---|---|
| Payments, tariffs, invoices, meter readings | Requires financial integration and a payment licence question the team cannot resolve this semester |
| Electronic voting and general meetings | Likely regulated by statute; a compliance feature, not a convenience one, and it needs legal verification first |
| Access control, guest passes, parking | Requires physical hardware integration |
| Multi-building management dashboard | Only relevant once more than one complex uses the product |

These exclusions are decisions, not omissions. The money and voting groups are where the buyer's own
obligations sit, and they are the most likely direction for the product after the MVP.

## 4. MVP definition

| Release | Contents | Definition of done |
|---|---|---|
| MVP | F1, F3, F4 | A resident can join by verifying against a unit, report a fault with a photograph, and see its status change. Management can announce an outage that reaches everyone. |
| Next | F2, F5 | Complaints routed privately to management; emergency broadcast tested against a full building. |
| Later | Excluded scope above, in the order listed | Subject to validation and to the legal question on voting. |

## 5. Technical approach

| Layer | Choice | Owner |
|---|---|---|
| Frontend | Vite, React, TypeScript | Zere Bayzhan |
| Backend | FastAPI, Python | Altair Zhambyl |
| Data, authentication, storage | Supabase, PostgreSQL | Altair Zhambyl |
| Repository, tracking, deployment | GitHub, Linear, Vercel | shared |

Frontend and backend run from a single command in one repository, so either team member can start
the whole system without configuring the other half.

## 6. Open questions

| # | Question | Effect if answered differently |
|---|---|---|
| Q2 | Is the absent landlord the entry point to the market, or a distraction? | The landlord was the first problem the team named and is the least served by F1 to F5 |
| Q3 | Do competing Kazakhstani products already exist? | Not yet researched for this idea. Must be answered before any market claim is made |
| Q4 | Are general meetings and reporting obligations set by law? | Would move electronic voting from optional to mandatory, and change who signs the contract |
