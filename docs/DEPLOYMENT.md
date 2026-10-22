# Deployment — PipleSolution (Phase 00 Discovery v3)

> Status: OPTIONS + OPERATIONAL PLAN ONLY. Nothing deployed to production. No production database created. No domain configured. Spike executed (see below); production untouched.
> Last updated: 2026-10-09 — v3 revision + spike/finalization addendum.

## 1. Constraints carried from decisions

- Domain direction APPROVED (D-24): use a business-owned domain; exact domain pending identification (TBD-06 stays OPEN) — no DNS changes authorized. Final topology not decided (TBD-11); environment boundaries APPROVED (D-23): separate D1 resources for dev/staging/prod (none exist yet). Adapter architecture APPROVED: Option A (D-17, design — implementation pending). Backup Option B + RPO/RTO targets APPROVED (D-19/D-20, targets — nothing implemented or rehearsed). Media needs unknown (TBD-13).
- Frontend and backend are separate applications; both target Cloudflare-compatible hosting. The three digital products are deployed and maintained separately (D-28) — the website never embeds product source; product cards link configurable external demo URLs only.

## 2. Topology options (proposed, none selected)

**Option A (recommended for evaluation):** Frontend static build → Cloudflare Pages / Workers Static Assets; Backend Hono → Cloudflare Workers + D1 binding. Separate origins (`www.*` + `api.*`), CORS allowlist, env-bound D1 `database_id` per environment.

**Option B:** Single Worker serving API + static assets. Simpler ops, but couples release cadence and complicates caching rules.

- Recommendation is to spike Option A first (preview + staging D1) once TBD-11/12 are addressed. This is **not** a decision.

## 3. Environments (proposed)

| Env | Purpose | DB | Notes |
|-----|---------|----|-------|
| local | dev | SQLite file or dedicated dev D1 (per D-23; not created) | No cloud credentials needed for SQLite path |
| preview | PR previews | staging D1 or ephemeral (not created) | Seeded fake data only |
| staging | pre-prod verification | staging D1 (not created) | Migration rehearsal + adapter parity check |
| production | live | prod D1 (not created) | Requires TBD-03 + identified domain (D-24/TBD-06); backup before migrate (Option B approved, unrehearsed) |

Phase 01 actual local topology (implemented, D-33): frontend `vite dev :5173` (or `vite build` + `preview`) with `/api` proxied to backend Hono `:8787` + file SQLite (`backend/dev.db`, gitignored; e2e uses `backend/e2e.db`, fresh per run). No production target configured; nothing deployed.

## 4. Build & release (proposed)

- Frontend: `vite build` → content-hashed assets; prod build fails closed if WhatsApp placeholder, draft-only content, unpublished/unverified content exposure, or non-allowlisted settings detected (proposed guards).
- Backend: `wrangler deploy` with explicit environment + migration step (`wrangler d1 migrations apply --remote`); never auto-migrate on request. Migration tooling final only after the mandatory spike (TBD-12; criteria in `ARCHITECTURE.md` §3.4).
- Rollback APPROVED as design (D-21, Option C — runbook untested): compensating migrations for schema corrections + backup restoration for data-recovery incidents (no down-migrations); re-deploy previous frontend build + previous Worker version; D1 restore via export/time-travel before any destructive migration. Backup strategy Option B + RPO/RTO targets per D-19/D-20 (nothing implemented or rehearsed).

## 5. Secrets, bootstrap & recovery operations (proposed runbook outline; NOT executed)

- Secrets (session secret, bootstrap token, admin credentials) live only in server-side env bindings per environment; never in frontend bundles, public env vars, docs, or the public settings surface (owner decision v3 C).
- Local dev: documented disposable bootstrap (single-use when zero admins; reset procedure for dev DB). Production: owner-authorized bootstrap/recovery with audit entries (see `SECURITY.md` §2, `WORKFLOW.md` §3); already-bootstrapped systems reject bootstrap with `403`. Credential provisioning and recovery authorization are TBD-14 items.
- No Cloudflare production resources, secrets, or DNS entries are created in Phase 00. Single exception (separately approved spike): one disposable D1 database `piple-spike-d1` (APAC) + `[SEED]` rows, retained pending separate cleanup approval; it must never become staging or production.

## 5. What Phase 00 did NOT do

- No `wrangler` project, no Pages/Workers provisioned, no production D1 created, no secrets set, no DNS touched, no deploy executed. (Spike-only: `piple-spike-d1` created under separate approval; see above.)
