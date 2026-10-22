# PipleSolution — Company Website (Phase 01 implemented locally, D-33)

> Local implementation only. No production deployment, DNS, or billing.
> Public language: Bahasa Indonesia. Details: `docs/PRODUCT-REQUIREMENTS.md`,
> plan + acceptance: `docs/phases/PHASE-01-IMPLEMENTATION.md`.

Software house + digital product provider company website with single-Super-Admin CMS and inquiry/Leads workflow.

## Structure

- `frontend/` — React + TS + Vite public site + CMS SPA. Self-contained: `npm run dev/build` inside `frontend/` works for UI work (API proxied to backend in dev).
- `backend/` — Hono + TS API, repository + SQLite/D1 adapters, `db/migrations/`, Vitest suites. Secrets only via env (see `backend/.env.example`).
- `shared/` — Zod contracts + types used by both sides.
- `tests/` — Playwright e2e (real frontend + backend + SQLite).
- `docs/` — planning, decisions (D-01–D-33), TBD-01–16 register.

## Development (from repository root)

Prerequisites: Node ≥ 20 (`node --version` ≥ 20).

```sh
npm install
cp backend/.env.example backend/.env   # then fill BOOTSTRAP_TOKEN + SESSION_SECRET
# generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run migrate --workspace=backend     # idempotent local SQLite migrations
npm run seed --workspace=backend        # draft-only fake seeds (nothing published)
npm run dev --workspace=backend        # API on http://localhost:8787
npm run dev --workspace=frontend       # site on http://localhost:5173 (/api proxied)
```

First Super Admin: `POST /api/v1/admin/auth/bootstrap` with `{email, password ≥12 chars, bootstrap_token}` (single-use; body only). Then log in at `/admin/login`.

## Test & build

```sh
npm run build --workspace=shared
npm run build --workspace=backend      # tsc typecheck
npm run test --workspace=backend       # Vitest (ephemeral SQLite, no network)
npm run build --workspace=frontend     # tsc + vite build → frontend/dist
npm run test:e2e --workspace=tests     # Playwright headless (needs both dev servers)
npm run test:e2e-headed --workspace=tests  # Playwright headed Chromium
```

E2E isolation: use a fresh database per run (`DATABASE_FILE=./e2e.db`, delete before run, restart backend) — bootstrap/inquiry rate limits are in-memory.

## Status

Phase 01 acceptance: see `docs/phases/PHASE-01-IMPLEMENTATION.md` (acceptance report). Deferred: production deploy, DNS/domain, WhatsApp number, demo URLs, content/brand inputs, consent/retention docs, backup rehearsal, concurrency suite (see TBD register).
