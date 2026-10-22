# Architecture — PipleSolution (Phase 00 Discovery v3)

> Status: PROPOSED, not implemented. No code, database, deployment, or technical spike exists. Unverified technical choices are marked proposed/pending.
> Last updated: 2026-10-09 — v3 revision (targeted; supersedes v2 service taxonomy).

## 1. Proposed stack (owner-validated direction)

| Layer | Choice (proposed) | Notes |
|-------|-------------------|-------|
| Frontend | React + TypeScript + Vite | Separate application from backend. Public language Bahasa Indonesia. |
| Backend | Hono + TypeScript | Runs on Cloudflare Workers (see §3 constraints). |
| Validation | Zod | Shared schemas (proposed: `packages/shared` or duplicated schema source with contract tests). |
| Dev DB | SQLite (local development) | File-based, zero-ops. |
| Prod DB | Cloudflare D1 | SQLite-compatible serverless DB, accessed via binding — **not** via Node driver. |
| Backend runtime | Cloudflare Workers | V8 isolates; no Node APIs unless via compat flags. |
| Frontend delivery | Cloudflare-compatible static asset delivery | e.g. Pages / Workers Static Assets; final topology TBD-11. |
| Testing | Vitest (unit/integration) + Playwright (e2e) | No suites implemented in Phase 00. |

Frontend and backend **remain separate applications** with an HTTP API boundary (see `API.md`). No monolith, no server-rendered admin coupled to public site.

## 2. System topology (proposed, pending TBD-11)

```
[Visitor / ID content] → [Frontend static assets (Cloudflare)] ──HTTPS──▶ [Hono API on Workers]
                                                                            │  ├─ D1 binding (prod)
                                                                            │  └─ SQLite file (local dev only)
[Super Admin] ──HTTPS──▶ [Admin SPA (same frontend app, /admin/*, single role)] ─▶ [Hono API]
[WhatsApp CTA] ──▶ [wa.me link w/ allowlisted public setting whatsapp_number + template TBD-03] (no server round-trip, no secrets exposed)
[Inquiry form — Phase 01 scope APPROVED (D-27), NOT implemented, D-25 closed] ──▶ [Hono API → DB → CMS Leads inbox (Super Admin only; no auto email/WhatsApp)]
[Public settings read] ──▶ [GET /api/v1/settings/public returns EXPLICIT ALLOWLIST ONLY, never whole settings record] (owner decision v3 C)
```

- No production topology is finalized. Options and recommendation live in `DEPLOYMENT.md`.
- Domain/DNS unresolved (TBD-06). Local and preview hostnames only in Phase 00.

## 3. Architecture validation — runtime & database abstraction (core risk)

### 3.1 Runtime compatibility: Node SQLite drivers do NOT run in Workers

- **Do not assume** a Node.js SQLite driver (`better-sqlite3`, `node:sqlite`, `sqlite3`) can execute unchanged inside Cloudflare Workers.
- Workers run V8 isolates without synchronous file I/O or native addons. Production D1 access is via the **`env.DB` binding** (`D1Database` interface: `prepare().bind().all()/run()/first()`), not a socket/file driver.
- Consequence: any data-access code written directly against `better-sqlite3` will **fail at deploy/deploy-time** even if local tests pass.

### 3.2 Required abstraction (recommendation, not implementation)

- Introduce a **repository/port interface** (e.g. `DbPort`) with two adapters:
  - `SqliteLocalAdapter` — for `npm run dev` and Vitest (file-backed SQLite).
  - `D1Adapter` — thin wrapper over `env.DB` for Workers.
- Business logic and Hono handlers depend only on the port. Adapter selection is by environment injection, never by conditional imports inside handlers.
- Schema defined once (proposed: Drizzle ORM or Kysely + SQL migrations). Migration runner differs per env:
  - Local: `drizzle-kit` / `kysely` CLI against SQLite file; migrations checked into repo.
  - Prod D1: `wrangler d1 migrations apply` (or equivalent) against remote D1; never auto-migrate on request path.
- TBD-12 adapter architecture DECIDED 2026-10-09: **Option A APPROVED (D-17)** — hand-rolled thin async repository/port + env adapters (SQLite-local, D1-Workers), no ORM for MVP. Raw-SQL pattern verified on all spike legs (`spike/d1-sqlite/RESULTS.md`); implementation still to be built. Persistence implementation additionally gated on Phase 01 authorization — NOT approved (D-25).

### 3.3 How each environment works (proposed)

| Environment | Frontend | Backend | Database | Migrations |
|-------------|----------|---------|----------|------------|
| Local dev | `vite dev` | `wrangler dev` or Hono node server (dev-only) | SQLite file (gitignored, seeded with fake data) | Apply local SQLite migrations on dev start |
| Automated tests | Vitest (jsdom/node) + Playwright | Hono app injected with in-memory/file SQLite adapter | Ephemeral SQLite (per-test file or `:memory:`) — never D1 | Test harness runs migrations per run |
| Preview/staging | Static build to preview host | Workers preview with staging D1 | Staging D1 (separate database_id) | Explicit `wrangler d1 migrations apply --remote` |
| Production | Cloudflare static delivery + custom domain (TBD-06) | Workers production | Production D1 | Explicit, reviewed migration; backup first (TBD-16) |

- No production database has been created. Do not create one in Phase 00.
- Zod schemas validate at the API boundary in all environments; DB constraints are the second line of defense (see `API.md`, `DATABASE.md`).

### 3.4 Mandatory database technical spike — acceptance criteria & planned verification (owner decision v3, [APPROVED] B; EXECUTED 2026-10-09 — see §6 addendum + `spike/d1-sqlite/RESULTS.md`)

Phase 00 remains documentation and planning. The spike is a dedicated prerequisite activity; full Phase 01 implementation must not begin until required planning approval and this spike's prerequisites are satisfied. This revision documents the spike plan only — it does not implement it, install dependencies, create migrations, or provision Cloudflare resources.

Proposed adapter/interface (pending spike proof): repository/port interface (e.g. `DbPort`) with `SqliteLocalAdapter` (local dev + tests) and `D1Adapter` (thin wrapper over `env.DB` Workers binding); single schema source with per-env migration runners. All of this stays **proposed/pending** until the spike proves it.

Minimum spike coverage (acceptance criteria):

1. **Initialization + migrations in both envs** — same forward-only migration set applies cleanly to a fresh local SQLite file and to a disposable Workers-compatible D1 database (local/staging, never production); reproducible commands recorded.
2. **CRUD in both envs** — create, read, update, delete (incl. soft-delete predicate behavior) demonstrated against the planned schema shape in both environments with equivalent outcomes.
3. **Consistent schema behavior + data types** — TEXT PKs, ISO-8601 TEXT timestamps, `draft/published/archived` + `readiness` enums, nullable `price_amount` (INTEGER minor units), UNIQUE slugs behave identically; divergences recorded.
4. **Constraint + error behavior** — UNIQUE/CHECK/NOT NULL violations surface equivalent, safely mappable errors in both envs (no stack-trace leaks; mappable to API `4xx` codes).
5. **Automated tests or reproducible verification commands** — a runnable suite (proposed: Vitest) or step-by-step command log that a reviewer can re-execute to reproduce the result; pass/fail recorded, not asserted by claim.
6. **Environment-difference + limitation record** — written note of every observed SQLite-vs-D1 difference (driver API, binding access, FK/pragma posture, migration runner, timestamp handling) and what remains unverified.

Planned verification procedure (to be executed later, not in this revision): prepare disposable SQLite file + disposable D1 database → apply migrations per env → run CRUD/constraint script or suite in each env → diff observed behavior → record differences/limitations → Agent 2 + owner review → only then finalize TBD-12. Success is claimed only after actual execution with evidence.

## 4. CMS & content architecture

- CMS modules (7): Services (7 commercial categories only, §3 PRD — portfolio excluded), Products (configurable external demo URLs per D-28; no embedded product source), Portfolio (standalone section/resource), Articles, Leads (functional inbox in approved Phase 01 scope D-27; not implemented, D-25 closed), Pricing, Settings — per `PRODUCT-REQUIREMENTS.md` §6.
- Single Super Admin role; bootstrap/recovery lifecycle + session/auth design in `SECURITY.md` (documented, not implemented; no hardcoded secrets; high-entropy out-of-band bootstrap token for production, never in URLs/bundles/config/logs; atomic single-use + rate-limited; all planned and unverified until implemented and tested; no public registration), choices pending TBD-14.
- Public Settings reads expose **only an explicitly allowlisted schema** (owner decision v3 C; exact public field set pending owner confirmation; allowlist shape in `API.md`). Whole-record/generic-JSON exposure is forbidden by design; secrets never enter frontend bundles or public env vars.
- Content lifecycle Draft/Published (+Archived) enforced at API + query layer (only eligible `published` rows served publicly; unverified content stays `draft`; editorial `status` vs product `readiness` distinct; no auto-publish via defaults/seeds). See `WORKFLOW.md` / `DATABASE.md`.
- Media: `image_url`/`image_key` fields reserved in schema; storage backend pending TBD-13 (repo-bundled default proposed; R2 optional).

## 5. Risks & mitigations

| Risk | Impact | Mitigation (Phase 00) |
|------|--------|-----------------------|
| Node SQLite driver used in Workers code | Prod crash | Repository interface + adapter spike required (TBD-12) |
| D1 differences (no extensions, eventual consistency nuances, binding-only access) | Subtle prod-only bugs | Keep SQL portable; integration test against D1 staging before release |
| WhatsApp number hard-coded or secret leaked via settings | Broken primary CTA / credential exposure | Centralize in Settings with explicit public allowlist; whole-record exposure forbidden; prod build guard blocks placeholder (TBD-03) |
| Inquiry-form scope creep or premature launch | Privacy/spam liability; pre-launch docs missing | Approved Phase 01 scope (D-27) with explicit exclusions; privacy/retention/data-handling docs required before public launch; requirements in WORKFLOW/SECURITY |
| Unverified content published (status/price/portfolio/contact/testimonial) | Misleading claims, legal/reputational risk | Draft-by-default; review/publishing gate; public reads only eligible published rows; seed-guard tests (TBD-01/02/05/07/10) |
| Open registration, bootstrap secret exposure, or missing bootstrap/recovery | Lockout or admin takeover | Single-use bootstrap when zero admins (high-entropy out-of-band token, body-only, never in URLs/logs/bundles), disabled otherwise with safe errors; atomic single-use against concurrent requests; no public registration; owner-authorized recovery with audit (TBD-14); all planned, unverified |
| Brand/domain late arrival | Rework | Placeholder tokens + hostnames; no prod wiring (TBD-04/06) |
| Single admin credential compromise | Full CMS takeover | Strong hashing, sessions, rate limits, lockout (TBD-14) |

## 6. What Phase 00 did NOT do

- No repos scaffolded, no dependencies installed, no migrations written or applied, no D1 database created, no Worker deployed, no adapter spike executed.
- Next technical step (requires approval): dedicated database technical spike proving SQLite-local ↔ D1-Workers parity per §3.4 (TBD-12) before Phase 01 backend persistence is finalized; full Phase 01 must not begin until planning approval + technical prerequisites are satisfied.
- Addendum 2026-10-09: the spike above has been EXECUTED (`spike/d1-sqlite/RESULTS.md`, all legs PASS) under separate owner approval; `piple-spike-d1` (APAC) is the single spike database and must never become production. Owner decisions recorded: adapter Option A (D-17), D1 sessions (D-18), backup Option B + RPO/RTO targets (D-19/D-20), rollback Option C (D-21), concurrency scope Option B (D-22), separate dev/staging/prod D1s (D-23) — all design-only, validation pending. Phase 01 is NOT approved to start (D-25).
