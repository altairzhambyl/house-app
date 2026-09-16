# Assignment 3. Weekly Plan and Fact Report

**Project:** house-app · **Team:** Altair Zhambyl, Zere Bayzhan
**Process:** Agile, one-week sprints · **Tracking:** Linear, workspace `itpm-houseapp`, team `ITP`
**Reporting date:** 2026-09-16

## 1. Week 3 — plan against fact

| # | Planned | Fact | Status | Evidence |
|---|---|---|---|---|
| 3.1 | Create workspace: Linear board for issue tracking, initialise GitHub repository | Linear workspace `itpm-houseapp` created with team `ITP`. Repository `altairzhambyl/house-app` created; 8 commits pushed to `main` | Done | commits `ef8dabc` to `472e863` |
| 3.2 | Define technical requirements, database schema, architecture, technical stack | Stack fixed and recorded. Architecture built and running: one repository, two applications, a single start command. Database schema **not started** | Partially done | `2fb8410`, `8c2ebbd`, `2d99c5e` |
| 3.3 | Primary brand design, colour scheme, UI format | Not started | Not done | — |

### Changes of direction during week 3

| Change | Reason |
|---|---|
| Product direction replaced | The previous idea was abandoned after the team's own research established that the assumed market gap did not exist as stated. Four candidate ideas were re-evaluated and the residential-complex platform selected. |
| Technical stack replaced | The earlier stack had been chosen for the earlier product. Reassessed against the new product and the split of team roles. |
| Data layer decided | PostgreSQL through Supabase, providing database, authentication and file storage from one dependency. |

### Unplanned work completed

| Item | Why it was done |
|---|---|
| Problem inventory: 43 problems mapped to 9 stakeholders | Required before Assignments 1 and 2 could be written without inventing content |
| Verification script for coursework documents | Checks every deliverable exists, is complete and contains no untranslated text |

## 2. Metrics

| Metric | Value |
|---|---|
| Planned items | 3 |
| Completed | 1 |
| Partially completed | 1 |
| Not started | 1 |
| Unplanned items completed | 2 |
| Commits | 8 |
| Blocked items | 0 |

**Honest assessment.** One of three planned items finished. The shortfall is explained by the change
of product direction inside the same week, which consumed the time budgeted for design work. The
architecture in 3.2 is further ahead than planned — both applications run and communicate — while
the database schema in the same item has not been started, because the feature list it must be
derived from was only settled at the end of the week.

## 3. Week 4 — plan

| # | Task | Owner | Done when |
|---|---|---|---|
| 4.1 | Database schema for buildings, units, residents, requests, announcements | Altair | Tables created in Supabase; a request can be stored and read back |
| 4.2 | Authentication and authorisation | Altair | A resident signs in and sees only their own building |
| 4.3 | File storage for request photographs | Altair | An image uploads and displays against a request |
| 4.4 | Brand design, colour scheme, UI format — carried over from 3.3 | Zere | Palette, typography and component style agreed |
| 4.5 | Frontend: request list and request detail | Zere | Both screens render live data from the backend |

### Risks

| Risk | Mitigation |
|---|---|
| 3.3 carried into week 4 alongside new design work | 4.4 is scheduled first in the week, before 4.5 depends on it |
| Schema 4.1 blocks frontend 4.5 | 4.1 is scheduled first; the frontend can work against fixed sample data if it slips |
| Competing products have not been researched for this idea | Scheduled as a week 5 item, before any market claim is made in a submission |

## 4. Week 5 — outline

| # | Task |
|---|---|
| 5.1 | Research existing products in this market and document findings with sources |
| 5.2 | Validation interviews with residents and management staff |
| 5.3 | Announcements and emergency broadcast |
| 5.4 | Deploy a running version and record measured results against this plan |
