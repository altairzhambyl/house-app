# Pivot brief — team planning session, 2026-09-16

**Source:** Telegram group planning session, 13:44–14:35 UTC+05:00, 2026-09-16 (83 messages).
Participants: `kekeront` = Altair Zhambyl, `deqwi` = Zere Bayzhan — mapping inferred from the role
assignment at 14:28 and Zere's contact address posted at 14:35.

This is a **primary source record** of decisions the team actually made. It exists because the original
Telegram export lives in a volatile `temp_data/` directory. Everything below is quoted or directly
paraphrased from the chat; nothing is invented. Items the chat did not settle are marked `OPEN`.

---

## 1. The decision

The team discarded three earlier candidate directions and settled on a **ЖК (residential complex)
resident↔management application**, named **`home-app`** by Altair at 14:26.

| Time | Candidate | Outcome |
|---|---|---|
| 13:59 | Taplink analogue / template-based link-in-bio | **dropped** |
| 13:59 | SaaS + polar.sh, CRM for niche businesses | **dropped** |
| 14:05 | Regional Kickstarter analogue | **dropped** |
| 14:07 | Shortlist recorded as "1. таплинк 2. CRM 3. кикстартер" | superseded |
| 14:22 | **ЖК communication app** — MVP posted | **adopted** |

Sale motion is **B2B** (to the управляющая компания / developer); daily usage is B2C (residents).
The core problem named at 14:29 is the ЖК WhatsApp group: unstructured, and complaints do not reach
the technician.

## 2. MVP feature list (Altair, 14:22)

| ID | Feature |
|---|---|
| F1 | Communication inside the ЖК (chats) |
| F2 | Tracking of violations and complaints |
| F3 | Technical faults — statistics, requests, fix-frequency |
| F4 | Announcements of internal activities (subbotniks, planned water/electricity shutoffs) |
| F5 | Emergency alert system (gas, fire, earthquake, flooding) |

## 3. Stakeholder expectations (Zere, 14:29 — draft for Assignment 1)

1. B2B
2. A single, unified format of communication
3. Eliminate the WhatsApp-group problem
4. Complaints routed directly to the technician

> These are the team's raw bullets. Assignment 1 needs them expanded into named stakeholder groups
> with expectations attributed per group — residents, УК/management and technicians are implied but
> were never explicitly enumerated. `OPEN`.

## 4. Roles (Altair, 14:28)

| Person | Role |
|---|---|
| Zere Bayzhan | Frontend, design |
| Altair Zhambyl | Backend, testing |

Rinat (`@r1nattn`) moved to a different group (13:56) — the team is **2 people**, not 3.
Altair additionally carries PM/analyst work in practice.

## 5. Process and tooling

- **Agile**, one-week sprints (13:56–13:57). Waterfall and spiral were floated and rejected.
- **Linear** for issue tracking — workspace `itpm-houseapp`, team key `ITP`.
- Claude Code; Vercel for deployment; GitHub repository to be initialized.
- Stack discussed as **Next.js + Supabase** on freemium tiers (13:59). FastAPI was mentioned at 13:53
  and not carried forward.
- **Caveat:** the Next.js+Supabase line was said at 13:59, *before* the 14:22 pivot to the ЖК app, and
  week 3 lists "develop technical stack" as an open task. Treat the stack as **proposed, not frozen**.

## 6. Assignments named by the team

| # | Title as written in chat |
|---|---|
| 1 | List of stakeholder's expectation |
| 2 | Idea List, Initial features list on elaborated product |
| 3 | Weekly Plan & Fact Report |

`OPEN` — these are titles only. The full syllabus task lines (every clause of which the deliverable
must answer, per Done-means) were never posted to the chat and are still needed.

## 7. Weekly plan (Altair, 14:34 — draft for Assignment 3)

**Week 3**
1. Create workspace — Linear dashboard for issue tracking, initialize GitHub repository
2. Develop technical requirements, DB schema, architecture, technical stack
3. Develop primary brand design, colour schema, UI format

**Week 4**
1. Develop frontend
2. Develop authorization, authentication, DB buckets, basic data storage

> Note: this changes the nature of the project. The previous brief treated weeks 1–5 as
> document-only. From week 3 the team plans to ship **code as well as documents**.

## 8. Reference material posted

| URL | Posted | What it is | Status |
|---|---|---|---|
| https://www.azhk.kz/ru/spetsialnye-razdely/all-graphics | 14:25, Altair | Astana ЖКХ operator — planned-shutoff schedules; relevant to F4 | `UNVERIFIED` — not yet opened or assessed |

## 9. Open questions

| # | Question | Owner |
|---|---|---|
| Q1 | Full syllabus task lines for Assignments 1–3 | Altair |
| Q2 | Explicit stakeholder groups (residents / УК / technicians / developer?) | Altair + Zere |
| Q3 | Is the stack frozen as Next.js + Supabase, or still open? | Altair (week-3 task) |
| Q4 | Does the product handle utility payments? Never mentioned in the session, but it is the obvious ЖК revenue hook and would change the architecture substantially. | Altair |
