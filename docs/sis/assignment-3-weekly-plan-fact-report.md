# Assignment 3. Weekly Plan and Fact Report

**Project:** house-app · **Team:** Altair Zhambyl, Zere Bayzhan
**Method:** Agile, one-week sprints · **Tracking:** Linear, team `ITP`
**Date:** 2026-09-16

## 1. Week 3 — plan and fact

| # | Plan | Fact | Status | Proof |
|---|---|---|---|---|
| 3.1 | Set up the workspace: task board and repository | Linear board `ITP` is ready. Repository `house-app` is created. We pushed 8 commits | Done | commits `ef8dabc` to `472e863` |
| 3.2 | Write requirements, database schema, architecture and stack | Stack is chosen. Architecture works: one repository, two applications, one start command. Database schema is **not started** | Partly done | `2fb8410`, `8c2ebbd`, `2d99c5e` |
| 3.3 | Make brand design, colours and UI format | Not started | Not done | — |

### What we changed during the week

| Change | Reason |
|---|---|
| We changed the product idea | Our research showed that the market gap of the old idea was not real. We looked at four ideas again and chose the building platform |
| We changed the technical stack | The old stack was for the old product. We chose a new one for this product and for our two roles |
| We chose the database | PostgreSQL through Supabase. It gives database, sign-in and file storage in one service |

### Extra work, not in the plan

| Work | Why we did it |
|---|---|
| We wrote 43 problems and linked them to 9 stakeholders | Without this we could not write Assignments 1 and 2 with real content |
| We wrote a check script for our documents | It checks that every document exists, is complete and is in English |

## 2. Numbers

| Metric | Value |
|---|---|
| Planned tasks | 3 |
| Done | 1 |
| Partly done | 1 |
| Not started | 1 |
| Extra tasks done | 2 |
| Commits | 8 |
| Blocked tasks | 0 |

**Our honest view.** We finished only one task of three. The reason is the change of the product
idea in the same week. It used the time we planned for design work.

Task 3.2 is not simple. The architecture part is better than planned, because both applications
already run and talk to each other. But the database schema in the same task is not started. We
could only start it after we agreed the feature list at the end of the week.

## 3. Week 4 — plan

| # | Task | Owner | Done when |
|---|---|---|---|
| 4.1 | Database schema: buildings, flats, residents, requests, news | Altair | Tables exist. We can save a request and read it back |
| 4.2 | Sign-in and access rights | Altair | A resident signs in and sees only their building |
| 4.3 | File storage for request photos | Altair | An image uploads and shows on a request |
| 4.4 | Brand design, colours, UI format (moved from 3.3) | Zere | Colours, fonts and component style are agreed |
| 4.5 | Screens: request list and one request | Zere | Both screens show real data from the backend |

### Risks

| Risk | What we do |
|---|---|
| Task 3.3 moves into week 4 with new design work | We do 4.4 first, because 4.5 needs it |
| Task 4.5 waits for the schema 4.1 | We do 4.1 first. If it is late, the frontend uses test data |
| We did not study other products for this idea | We plan it for week 5, before we write anything about the market |

## 4. Week 5 — short plan

| # | Task |
|---|---|
| 5.1 | Study other products on this market and write the results with sources |
| 5.2 | Interview residents and management staff |
| 5.3 | Build news and emergency alerts |
| 5.4 | Deploy a working version and compare the result with this plan |
