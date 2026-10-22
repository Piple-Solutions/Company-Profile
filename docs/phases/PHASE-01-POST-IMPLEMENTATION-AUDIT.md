# Phase 01 Post-Implementation Audit — Read-Only (2026-10-09)

> Scope: verify, do not change. No code edits, no installs/upgrades, no DB
> resets, no Cloudflare/production changes, no Phase 02. `piple-spike-d1`
> untouched (no Cloudflare command was run in this audit). One new file:
> this report. Method: file reads, `tsc --noEmit`, Vitest
> (in-memory only), `npm audit` (read-only). NOT rerun: `vite build`
> (writes `dist/`), Playwright (needs servers + writable test DB).

## 1. Document existence & accuracy — VERIFIED

- `docs/DECISIONS.md:113` — D-33 present: gate D-25 OPENED, Phase 01
  authorized per approved scope; history (D-26 hold) preserved.
- `docs/CHANGELOG.md` — `[phase01]` entry matches the built tree
  (workspace split, backend/frontend features, 27 Vitest + 10+10 Playwright,
  secret scan, audit note).
- `docs/PHASE-01-READINESS-ASSESSMENT.md` — gate note records D-33; TBD-09
  remainder and deferred items unchanged and accurate.
- `docs/phases/PHASE-01-IMPLEMENTATION.md` — plan M1–M10 + progress log +
  `## Acceptance report (Phase 01, local)` all present and consistent with
  the implementation found on disk (routes, modules, placeholders, gates).

## 2. Exact local commands (from `package.json` scripts, verified present)

```sh
npm install                                   # install dependencies (workspaces)
npm run dev --workspace=backend               # API http://localhost:8787 (needs backend/.env)
npm run dev --workspace=frontend              # site http://localhost:5173 (/api proxied)
npm run test --workspace=backend              # Vitest unit/integration (ephemeral SQLite)
npm run test:e2e-headed --workspace=tests     # Playwright headed Chromium (needs both servers + fresh test DB)
npm run build --workspace=shared              # tsc typecheck shared
npm run build --workspace=backend             # tsc typecheck backend (incl. tests)
npm run build --workspace=frontend            # tsc + vite build → frontend/dist
npm run migrate --workspace=backend           # idempotent local SQLite migrations
npm run seed --workspace=backend              # draft-only fake seeds (nothing published)
```

First admin: `POST /api/v1/admin/auth/bootstrap`
`{email, password ≥12 chars, bootstrap_token}` (single-use, body only),
then `/admin/login`. E2E isolation: fresh DB per run
(`DATABASE_FILE=./e2e.db`, delete before run, restart backend) — rate
limiters are in-memory and budgets do not survive a shared DB across runs.

## 3. Directory separation — VERIFIED with one observation

Present and correctly populated: `frontend/` (9 src files + config),
`backend/` (20 src/script files + `db/migrations/0001_init.sql` + 5 tests),
`shared/` (1 contract module), `tests/` (spec + config), `docs/`
(+ `spike/` evidence). No backend code under `frontend/`; no migrations,
secrets, or backend tests under `frontend/`; no source under `docs/`.
Declared deps: backend→`@piple/shared`, frontend→`@piple/shared` (both
declared in their `package.json`); `tests/` dependency-free.
Observation (non-blocking): backend imports shared via relative path
(`../../../shared/src/index.ts`, 4 files) instead of the `@piple/shared`
package specifier (frontend uses the specifier). Works via workspaces but
bypasses the package boundary — recommend switching to the specifier with an
`exports` map later.

## 4. Reproducibility (no destructive actions taken)

- RERAN, PASS: `tsc --noEmit` shared + backend (exit 0); Vitest 27/27
  (5 files; in-memory SQLite, no network, no files written).
- NOT rerun (would write): `vite build` (rewrites `frontend/dist/`),
  Playwright headless/headed (requires running servers + writing the local
  test DB). Prior evidence stands as recorded (10/10 headless + 10/10 headed
  Chromium with commands, counts, and fixes in the Phase 01 report); this
  audit makes no new claim about them.
- `piple-spike-d1` was not listed, queried, or touched; no Cloudflare,
  migration, deployment, DNS, or secret operation occurred.

## 5. npm audit findings — exact detail + applicability

`npm audit --omit=dev` reports 2 moderate findings, both on
`react-router@6.30.6` (via `react-router-dom@6.30.6`, frontend only):

1. GHSA-wrjc-x8rr-h8h6 — open redirect via backslash in `<Link>`/`useNavigate`
   (CVE-2025-68470 bypass), CWE-601, range >=6.0.0 <7.18.0.
2. GHSA-337j-9hxr-rhxg — constructor injection via `deserializeErrors()` in
   SSR hydration, CWE-470, CVSS 6.1, range >=6.4.0 <7.18.0.

Applicability (verified by code inspection, `frontend/src/**`):
(2) NOT APPLICABLE as built — pure client-side SPA; no SSR, hydration,
`deserializeErrors`, or `StaticRouter` anywhere. (1) NOT EXPLOITABLE as
built — every `<Link to>`/`<NavLink>`/`navigate()` target is a static
literal or a server-validated slug (`^[a-z0-9-]+$`); external URLs use plain
`<a>`, never `<Link>`; no attacker-controlled `to` sink exists. Residual:
upgrade to react-router ≥7.18 when convenient (breaking major; justifiably
deferred). No dependency changed in this audit.

## 6. Manual browser smoke-test checklist

Public (`http://localhost:5173`, backend `:8787` running, fresh DB + seeds):
1. `/` renders hero, 7 service cards, product teaser, WhatsApp placeholder
   (disabled, "segera hadir", zero `wa.me` links).
2. `/layanan`, `/produk`, `/portofolio` (empty state), `/harga`
   ("segera diumumkan" + WA CTA), `/artikel` (empty), `/tentang`, `/privasi`.
3. Unknown slugs (`/produk/x`, `/portofolio/x`) show not-found states.
4. `/kontak`: invalid email → Indonesian field errors; valid submit →
   success message; consent required.
5. Mobile 375px: hamburger toggles nav; desktop grid intact; Tab order +
   visible focus; `role=alert`/`status` announced.
Admin: `/admin` → redirects to `/admin/login` when logged out; wrong
credentials → generic error; login → dashboard; create service → publish →
visible publicly → unpublish → hidden; `/admin/leads` shows submissions,
filter + status update + detail work; `/admin/settings` allowlist save;
logout invalidates session (protected routes redirect again).

## 7. Findings by category

**Verified:** D-33/changelog/readiness/acceptance docs exist and match the
repo; workspace scripts as listed; physical separation (1 observation);
tsc shared+backend PASS; Vitest 27/27 reproduced; audit advisories
identified with applicability assessed; `.env.example` placeholders-only;
`.env` + `*.db` gitignored; no secrets in sources (per recorded scan).
**Not independently verified (this turn):** `vite build` output, Playwright
headless/headed reruns, D1Adapter against real remote D1 beyond spike SQL
parity, session behavior under load, backup/restore/rollback/concurrency
execution, RPO/RTO measurement.
**Known limitations:** relative shared imports (boundary hygiene);
react-router advisories deferred (justified above); e2e requires fresh-DB
discipline; dev plume `.db` files present as local artifacts (`dev.db`,
`e2e.db` — gitignored, disposable).
**Blockers:** none for local Phase 01 acceptance. Production remains gated
(D-23 env DBs, TBD-11/14/16 ops, rehearsals, domain/DNS, content/consent
inputs) — unchanged from prior reports.
