# house-app

Resident ↔ management application for Kazakhstani ЖК (residential complexes).
Replaces the building's WhatsApp group with structured chats, complaint routing,
fault tracking, announcements and emergency alerts.

University course project (SIS & TSIS).

| | |
|---|---|
| Frontend | Vite + React — Zere Bayzhan |
| Backend | FastAPI — Altair Zhambyl |
| Tracking | Linear — workspace `itpm-houseapp`, team `ITP` |

## Getting started

Requires Node >= 20, [pnpm](https://pnpm.io) >= 10 and [uv](https://docs.astral.sh/uv/).

```bash
pnpm install              # node deps for the workspace
pnpm --filter api setup   # python venv for the backend (uv sync)
cp apps/api/.env.example apps/api/.env   # then fill in Supabase credentials
pnpm dev                  # starts BOTH apps
```

The `.env` step is optional to get running: without credentials the API starts and
reports `supabase: not configured`, and Supabase-backed routes return 503 with an
explanation instead of crashing.

`pnpm dev` runs the frontend and backend together:

| App | URL | Notes |
|---|---|---|
| web | http://localhost:5173 | Vite dev server |
| api | http://localhost:8000 | FastAPI, `--reload`; docs at `/docs` |

### Local database

The schema lives in `supabase/migrations/`, with demo data in `supabase/seed.sql`
(two buildings, three flats). Run it locally with the Supabase CLI and Docker:

```bash
supabase start            # applies migrations + seed; prints local URL and keys
supabase db reset         # re-create from migrations after editing them
```

Put the printed `API_URL` and `SERVICE_ROLE_KEY` into `apps/api/.env`, and `API_URL`
and `ANON_KEY` into `apps/web/.env.local` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
The anon key is the only key the browser ever gets.

Local demo accounts (seed only, password `demo-password`): `manager@demo.test` (УК of
Demo Block A) and `resident@demo.test` (flat 14B). New users sign up and join a flat with
its code — seed codes are listed in `supabase/seed.sql`; managers see and rotate them
under «Квартиры и коды». `pnpm --filter api test` runs the backend tests against this local stack
(they refuse any non-local URL and skip if it is not running).

The frontend proxies `/api/*` to the backend, so the browser only ever talks to
one origin and CORS is not involved in development.

> Vite binds to IPv6 loopback (`[::1]`). Use `localhost`, not `127.0.0.1`, when
> curling the frontend or writing test scripts.

## Layout

| Path | |
|---|---|
| `apps/web/` | Vite + React + TypeScript + Tailwind (Zere) |
| `supabase/` | database schema (migrations), seed, local stack config |
| `apps/api/` | FastAPI (uv-managed; `pyproject.toml` is the real manifest — `package.json` only exists so pnpm can start it) |
| `docs/sis/` | course deliverables (English) |
| `docs/research/` | raw research and source records |

## Verify

```bash
bash scripts/verify.sh        # docs + code
bash scripts/verify.sh code   # frontend typecheck + backend lint + backend tests
bash scripts/verify.sh docs   # deliverables present, complete, English-only
```

See `CLAUDE.md` for project constraints.
