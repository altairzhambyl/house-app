# Project: home-app — resident↔management app for Kazakhstani ЖК (residential complexes)

University course project (SIS & TSIS). Pivoted 2026-09-16 from a Taplink-competitor idea;
the prior research is preserved in git at tag `archive/taplink-2026-09-16` and is **not** to be reused.

## Context
- Product: replaces the ЖК WhatsApp group with structured resident↔УК (management company) communication.
- Sale is B2B (to the УК / developer); daily usage is B2C (residents).
- Linear: workspace `itpm-houseapp`, team key `ITP`. Every task tracked there.
- Team (2 people): **Altair Zhambyl** — backend, testing, PM/analyst. **Zere Bayzhan** — frontend, design.
- Process: Agile, one-week sprints. Currently week 3.

## Hard constraints
- **All submitted documents in English.** Working notes with the user in Russian.
- **Every market/competitor claim carries a source URL and an observation date.** No invented statistics;
  unverifiable → mark `UNVERIFIED` rather than guessing. This is the main failure mode to avoid.
- Deliverables in `docs/sis/` (one file per assignment); raw research in `docs/research/`.
- Submission-length: 2–4 pages each, tables over prose.

## Stack — DECIDED 2026-09-16
- Frontend: **Vite + React** (Zere)
- Backend: **FastAPI** (Altair)

- Data / auth / storage: **Supabase** (Postgres), reached from FastAPI

Supersedes the Next.js + Supabase line from the planning chat — Supabase stays, Next.js does not.
The backend holds the **service role key**, which bypasses row-level security: server-side only,
never sent to the browser. Credentials live in `apps/api/.env` (gitignored); see `.env.example`.
They are optional — without them the API still starts and reports `supabase: not configured`.

## Hosting — DECIDED 2026-11-11
- Live: https://house-app-blush.vercel.app — one Vercel project (Services: `/api/*` → FastAPI, rest → Vite), region `fra1`.
- Supabase project `house-app` (Frankfurt, free plan). Migrations are applied by hand with `supabase db push`; CI does not touch production data.
- CI: `.github/workflows/ci.yml` (typecheck, vitest, ruff, pytest against a throwaway local Supabase — skipped tests fail the job). `prod-smoke.yml` runs read-only checks after each production deploy and weekly.
- Write endpoints are rate-limited in Postgres (`hit_rate_limit`, limits in `apps/api/app/rate_limit.py`); in-memory limits do not work on serverless.

## Done means
`bash scripts/verify.sh` is green. It checks:
- docs: every expected file in `docs/sis/` exists, is non-empty, has no TODO/TBD, and contains no Cyrillic
- web: `tsc --noEmit` passes for `apps/web`
- web: vitest unit tests pass
- api: `ruff check` and `pytest` pass for `apps/api` (integration tests need local Supabase; CI runs them for real)

Docs are also done only when they answer every clause of the syllabus task, are in English, source every factual claim, and match the other assignments (stakeholder names, feature IDs, team roles).

Code lives in a pnpm workspace with one frontend (`apps/web`) and one backend (`apps/api`), and `pnpm dev` runs both. Do not add parallel frontend folders.
