# Phase 3 — Backend & Integration Readiness Audit (Read-Only)

**Status:** AUDIT COMPLETE — **no remediation performed, no deployment, no dependency upgrade, no infrastructure change**
**Date:** 2026-10-22
**Baseline:** `89ce5db` (Phase 2D-R3), working tree clean at audit start
**Authority:** Phase 3 read-only audit + implementation plan only. A/B/C/D remediation tracks below are proposals requiring explicit owner approval.
**Scope:** backend readiness, frontend/API integration, auth/session/CSRF, validation/rate limiting/proxy trust, repositories/SQLite/D1/migrations/transactions/concurrency, DB integrity/soft deletion/retention/publication consistency, backup/restore status, test coverage, dependency advisories (analysis only), Cloudflare/D1 readiness, and docs-vs-implementation drift.

> Phase 2D-R3 remains **owner review pending**; this audit does not mark it accepted, and it does not reopen or rewrite prior reports.

---

## 0. Executive verdict

| Dimension | Verdict | Basis |
|---|---|---|
| Local backend behavior | **GREEN for local development** | Source inspection; backend Vitest **27/27 PASS** and `tsc --noEmit` PASS re-run in this audit (in-memory SQLite only) |
| Local frontend/API integration | **AMBER** | Core flows work and were previously e2e-tested, but there are verified truthfulness/error-handling regressions and a production-origin assumption in the API client |
| Staging readiness | **RED** | No backend Workers entry or Wrangler config; D1 application path is stub-tested only; no staging D1 integration evidence |
| Production readiness | **RED** | No deployment path, backups, restore rehearsal, retention/purge, recovery runbook, edge abuse controls, observability, CSP/HSTS, or production topology/domain |
| Dependency health | **AMBER** | OSV reports **6 advisories across 3 packages (2 critical, 4 moderate)**; all are dev-only or SPA/non-SSR in current use, but unresolved |
| Documentation truthfulness | **AMBER/RED** | Phase 00 documents still say “not implemented”; API/security/testing/deployment claims diverge from the built system in material places |

**Bottom line:** the local product is coherent and its 27 backend tests pass, but the backend is **not deployable as a production service** in its current state. The production path, operational controls, privacy/retention, recovery, and edge protections are absent, not merely unverified. Do not deploy or create production/staging resources under this audit.

**Findings:** 23 total — **3 critical, 6 high, 12 medium, 2 low** (detail in §3).

---

## 1. Method, evidence, and limits

### 1.1 Read

- All current top-level docs: `DECISIONS.md`, `CHANGELOG.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `PERSISTENCE-DECISION.md`, `PHASE-01-READINESS-ASSESSMENT.md`, `PROJECT-PROGRESS-AUDIT-AND-NEXT-STEPS.md`, `docs/README.md`, plus Phase 01/2D and 2D-R2/R3 reports.
- Backend: `app.ts`, `config.ts`, `dev.ts`, `routes/{public,admin}.ts`, `http/{auth,errors}.ts`, `auth/{passwords,ratelimit}.ts`, `repo/{admin,content,leads,settings}.ts`, `db/{types,sqlite,d1,migrate}.ts`, `db/migrations/0001_init.sql`, scripts, tests.
- Frontend: `src/api.ts`, `src/App.tsx`, `src/pages/public.tsx`, `src/pages/Kontak.tsx`, `src/components/Layout.tsx`, `src/admin/cms.tsx`, `src/data.ts`, `vite.config.ts`, `index.html`.
- Tests/config: backend Vitest suites, Playwright specs/config, package manifests and lockfile entries.

### 1.2 Executed (read-only / in-memory)

- `npm run test --workspace=backend` → **5 files, 27/27 tests PASS** (Vitest 3.2.7; in-memory SQLite; no project DB touched).
- `npm run build --workspace=backend` (`tsc --noEmit`) → **PASS**.
- `npm ls` for installed versions; `node --version` (`v24.20.0`), `npm --version` (`11.19.0`).
- OSV API advisory queries by exact installed version (registry read only).
- Two in-memory application probes (not persisted): whitespace-only inquiry storage; extra-service-slug/published-at behavior.
- `git log`, `git status` — baseline clean.

### 1.3 Not executed / limitations

- **Playwright was not re-run** in this audit: it starts servers and writes `backend/e2e.db`; prior R3 evidence is cited, not claimed as freshly re-executed. This audit did not modify `dev.db`, `e2e.db`, or any DB.
- **`npm audit` was attempted twice and timed out** at 120 s and 300 s. Advisory data was therefore obtained from OSV by exact version. Counts are advisory-level, not npm’s grouped `npm audit` count.
- **No Cloudflare command was run.** `piple-spike-d1` was not listed, queried, or touched. The absence/presence of Cloudflare-side resources is asserted only from repository/docs evidence, not account inspection.
- `backend/.env` was **not read**; no secret values are reproduced here.
- No real D1, Workers runtime, backup/restore, load, or failure-injection test was run.

---

## 2. Implemented and proven vs. planned/unverified

### 2.1 Implemented locally and verified by source/tests

- Public read API for services/products/portfolio/articles/pricing; published + non-deleted gate; product demo state derivation; public settings allowlist projection; inquiry POST with Zod, honeypot, origin/size guard, and rate limiter (`backend/src/routes/public.ts`).
- Admin auth: bootstrap, login, logout, `me`; opaque session token with SHA-256 stored, HttpOnly/SameSite=Lax cookie, CSRF header required for admin mutations; single-winner bootstrap via partial unique index (`backend/src/routes/admin.ts`, `backend/src/http/auth.ts`, `0001_init.sql:160-162`).
- Admin CRUD for five editorial modules, leads list/detail/state/delete, settings get/put; soft delete; per-table write allowlists; safe error envelope (`backend/src/routes/admin.ts`, `backend/src/repo/*`).
- SQLite adapter + forward-only local migration runner; D1 adapter shape; bootstrap/authorization/session/publication/settings/contracts tests (`backend/test/*`).
- Frontend public site + Admin CMS (create/edit/delete/publish/archive, leads, settings, dashboard) using the existing API; prior R3 evidence: Playwright 19/19, tsc, Vite build.
- Phase 00 spike proved SQL **parity** on SQLite/local-D1/remote D1 for the spike harness; it explicitly did **not** prove sessions on D1, app-level D1 behavior, backup/rollback, or concurrent writes (`spike/d1-sqlite/RESULTS.md:136-175`).

### 2.2 Planned, assumed, or unverified (not “implemented”)

- Cloudflare Workers entry, Wrangler environments/bindings, staging/production D1 creation and application migrations.
- D1-backed sessions in the actual app (D-18 is design only; local sessions are SQLite).
- Real D1 adapter behavior under the app, including `meta.changes`, `execScript`, error mapping, latency, and concurrency.
- Backup/restore/rollback rehearsals, measured RPO/RTO, restore authorization.
- Retention/purge of leads, sessions, audit log, and settings history.
- Super Admin password change/recovery/deactivation, bootstrap-token issuance/rotation, session invalidation-all.
- Distributed/edge rate limiting, trusted client-IP handling, WAF/abuse controls at public scale.
- CSP/HSTS/static-host headers, production admin cache policy, observability/alerting, CI.
- Dependency upgrades (only analyzed here).
- Content/privacy/WhatsApp/SEO items tracked by TBD-01…TBD-16; no deferred decision is silently resolved.

---

## 3. Findings (severity-ranked)

Severity means **impact if the system is exposed as intended**, not whether the code runs locally. “Blocker” is stated per environment.

### Critical

#### P3-01 — No deployable Workers entry, Wrangler configuration, or app-level D1 wiring
**Status:** VERIFIED (repository absence); Cloudflare account not inspected
**Evidence:** `backend/src/dev.ts:1-2` states the production Workers entry is documented and not deployed; `backend/package.json:5-12` has no Worker/`wrangler` script; `backend/src/config.ts:3-4` and `backend/src/db/migrate.ts:4` are Node-only (`node:fs`/`path`); the only Wrangler file in the repo is `spike/d1-sqlite/spike-d1-worker/wrangler.toml`. `D1Adapter` exists (`backend/src/db/d1.ts:8-38`) but is exercised only through a stub (`backend/test/demo.test.ts:81-90`). D-18 (D1 sessions) is design-only (`docs/DECISIONS.md:66`).
**Impact:** There is no supported command or artifact that serves this Hono app on Cloudflare Workers with a D1 binding. All “production path” claims remain unimplemented. The app cannot be staged or deployed as-is.
**Blocker:** Local: no · Staging: **yes** · Production: **yes**
**Remediation:** Add a Worker entry (`export default { fetch }`) that constructs `D1Adapter(env.DB)` and maps environment bindings/secrets into `createApp`; add `wrangler.*` per environment with explicit compatibility date/`nodejs_compat`; provision a **staging** D1 only under owner approval; apply migrations with `wrangler d1 migrations apply`; never use `piple-spike-d1`.
**Test approach:** Staging smoke (public list/detail, inquiry, login/CSRF, one CRUD lifecycle, leads, settings) against real D1; compare responses with SQLite; verify migration journal and rollback plan; verify no Node-only import leaks into the Worker bundle.

#### P3-02 — No backup, restore rehearsal, rollback drill, or measured RPO/RTO
**Status:** VERIFIED absence (documented targets only)
**Evidence:** `docs/SECURITY.md:48` (“No backup exists; no restore rehearsed”); `docs/DEPLOYMENT.md:34` (backup/rollback are designs; no production DB); no backup artifacts, schedule, runbook execution, or restore log in the repo. D-19/D-20/D-21 are approved **targets/designs**, not evidence (`docs/DECISIONS.md:69-75`).
**Impact:** RPO ≤ 24 h / RTO ≤ 8 h cannot be demonstrated. A migration error, accidental delete, or D1 incident could cause unrecoverable data loss. This gates any production migration and any launch promise.
**Blocker:** Local: no · Staging: **yes for BK-01 acceptance** · Production: **yes**
**Remediation:** BK-01: schedule and record D1 exports/backups; document retention of backup copies; rehearse restore onto staging; time the restore; run an integrity check after restore; rehearse a compensating migration; record measured RPO/RTO; require a fresh backup before every production migration.
**Test approach:** Executed, timestamped restore drill on staging with row-count/integrity comparisons and measured elapsed time; failed-restore tabletop; owner-authorized restore flow test.

#### P3-03 — No lead retention/purge or privacy/data-handling implementation
**Status:** VERIFIED absence; owner policy remains OPEN (TBD-09)
**Evidence:** Leads are only soft-deleted (`backend/src/repo/leads.ts:43-46`; `backend/src/routes/admin.ts:268-274`); there is no scheduled hard purge, retention field, or purge endpoint. Sessions, audit log, and settings history also have no purge (`repo/admin.ts`, `repo/settings.ts`). `docs/SECURITY.md:34-35` and `docs/DATABASE.md:118,162` require retention + scheduled hard purge; `TBD-09` remains OPEN (pre-launch privacy/retention docs).
**Impact:** Lead PII (name, email, company, message, source page, timestamps) is retained indefinitely; deleted leads remain recoverable in storage. This is a privacy/compliance launch blocker and defeats the documented “minimum retention” posture.
**Blocker:** Local: no · Staging: no (must remain fake data) · Production: **yes**
**Remediation:** Owner defines retention period and consent wording (TBD-09). Implement a scheduled purge (Cloudflare Cron/Worker or documented ops job) for expired leads, expired/revoked sessions, and policy-defined audit/history windows; hard-delete storage on request where required; document privacy/data-handling. Do not invent a period.
**Test approach:** Clock-injected unit tests for eligibility boundaries; staging purge job with fake aged rows; assert public/admin/API invisibility and physical row removal; audit the purge itself without logging PII.

---

### High

#### P3-04 — Abuse controls are local-only and spoofable; no per-account lockout
**Status:** VERIFIED mechanics; production-scale impact SUSPECTED (not load-tested)
**Evidence:** `clientIp` takes the first `x-forwarded-for` value, then `x-real-ip`, then `unknown` (`backend/src/http/auth.ts:23-27`); tests deliberately spoof `X-Forwarded-For: 10.8.8.8` to isolate a bucket (`backend/test/inquiry.test.ts:54`), proving the key is caller-controlled. Limiters are process-local `Map`s (`backend/src/auth/ratelimit.ts:8-10`) with no eviction; login is limited per IP only (`routes/admin.ts:98`), and there is no account-level lockout. `docs/SECURITY.md:18` promises per-IP **and per-account** limiting + lockout.
**Impact:** A caller can rotate/spoof IP headers to bypass login, bootstrap, and inquiry limits; on Workers, each isolate has its own limiter, so limits multiply; unique spoofed keys can grow the in-memory map. This permits distributed brute force, inquiry spam, and memory pressure in a public deployment. Local single-process tests do not prove production resistance.
**Blocker:** Local: no (single trusted process) · Staging: **partial** · Production: **yes** (unless edge rate limiting/WAF is mandatory)
**Remediation:** Introduce an environment-aware trusted-client-IP resolver (`CF-Connecting-IP` on Workers, forwarded headers only from a configured trusted proxy); make limiter state shared/bounded (Cloudflare Rate Limiting, Durable Object, or D1 with strict limits), enforce per-IP + per-account login buckets and lockout/backoff; cap/evict local buckets; add Cloudflare edge rules for public POSTs/reads.
**Test approach:** Unit tests that spoof `X-Forwarded-For` and prove the trusted source wins; multi-isolate/staging tests; brute-force simulation; memory-bound test for eviction; verify 429 behavior and no account enumeration.

#### P3-05 — Super Admin recovery, password change, deactivation, and token rotation are absent
**Status:** VERIFIED absence
**Evidence:** Admin auth surface is only login/logout/me/bootstrap (`backend/src/routes/admin.ts:96-165`); no password-change, deactivate, reset, or session-revoke-all route exists. `revokeAllSessions` is written but unused (`repo/admin.ts:55-57`). There is no recovery CLI/script (`backend/scripts/` contains only `migrate.ts`, `seed.ts`). `docs/SECURITY.md:20-21` describes an owner-authorized recovery runbook, forced invalidation, and audited re-issuance; none is implemented. The bootstrap token is not consumed/rotated (`routes/admin.ts:139-159`); it becomes usable again if the active-admin count returns to zero.
**Impact:** A lost/compromised admin password or account cannot be recovered or contained through the application; the only path is direct DB manipulation. The “single-use bootstrap token” is only guarded by the one-active-admin index, not by token consumption. This is a production operations/security blocker.
**Blocker:** Local: no · Staging: **partial** (owner can reset DB) · Production: **yes**
**Remediation:** Owner-approved TBD-14 runbook + one-time recovery script (out-of-band, audit-logged, never prints secrets); password-change endpoint with current-password verification; force `revokeAllSessions` on change/recovery; admin deactivate/rotate flow; explicitly invalidate the bootstrap token after successful bootstrap (store a consumed marker/hash, or require rotating the env secret and document it).
**Test approach:** Recovery drill on staging; old sessions rejected after change; bootstrap token rejection after consumption; audit entry for recovery (without credentials); lockout/re-enable test.

#### P3-06 — Static-host and admin-response security headers/cache policy are missing
**Status:** VERIFIED absence
**Evidence:** API middleware sets only `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options` (`backend/src/app.ts:27-32`). There is no CSP, HSTS, or `frame-ancestors` for the HTML app (`frontend/index.html` has none); no static-host headers file exists (no `_headers`/worker static config in `frontend/`). Admin/auth/leads GET responses have no `Cache-Control: no-store` (`routes/admin.ts`; `app.ts`). `docs/SECURITY.md:40` lists CSP/frame-ancestors/HSTS as requirements.
**Impact:** The admin HTML can be framed (clickjacking) even though API responses set `X-Frame-Options`; no defense-in-depth against injected script; no HSTS on the production domain; lead PII and auth payloads may be retained by browser/intermediary caches. Production hardening is incomplete.
**Blocker:** Local: no · Staging: **partial** · Production: **yes**
**Remediation:** Configure headers at the static host (CSP with explicit script/style/img/connect/frame-ancestors; HSTS; `X-Content-Type-Options`; `Referrer-Policy`; permissions policy); add `Cache-Control: no-store` for `/api/v1/admin/*` and auth responses; keep public content cacheable with deliberate directives. Decide CSP sources after topology (TBD-11).
**Test approach:** Header assertions in staging for `/`, `/admin/*`, `/api/*`; frame-ancestors/clickjacking smoke; no-store cache test; CSP report-only validation before enforce.

#### P3-07 — Frontend API client assumes same-origin, conflicting with the documented separate-origin topology
**Status:** VERIFIED code; deployment impact SUSPECTED pending TBD-11
**Evidence:** `frontend/src/api.ts:10` uses `credentials: 'same-origin'`; URLs are relative `/api/v1/...` (`api.ts:32-37`). Dev relies on the Vite proxy (`frontend/vite.config.ts:8-10`). But `docs/API.md:9` describes a separate production base URL `https://api.<domain>/api/v1`, and `docs/DEPLOYMENT.md:13` recommends evaluating separate origins (`www.*` + `api.*`). No configurable API base exists.
**Impact:** If the frontend and API are deployed on different origins (the documented Option A), browser requests go to the static host’s `/api` (likely 404) and, even with an absolute URL, `same-origin` credentials would not send the admin session cookie. Admin login/CSRF would fail. If topology is “single Worker/same origin,” the code can work, but that decision is not made.
**Blocker:** Local: no · Staging: **conditional on topology** · Production: **yes if Option A; no if same-origin proxy**
**Remediation:** Decide TBD-11 first. Either (A) serve frontend and API under one origin with an explicit `/api` route/proxy, or (B) add a build-time API base URL and use `credentials: 'include'` + exact CORS allowlist; test preflight and cookie behavior. Do not hardcode secrets or environment values into the bundle.
**Test approach:** Cross-origin staging test (session cookie, CSRF, preflight, logout) and same-origin proxy test; verify no cookie leakage to disallowed origins; e2e admin flow under the chosen topology.

#### P3-08 — D1 adapter is only stub-tested; `transaction()` silently does not provide atomicity
**Status:** VERIFIED code; real D1 behavior UNVERIFIED
**Evidence:** `D1Adapter.transaction()` executes the callback directly (`backend/src/db/d1.ts:35-37`); the port comments acknowledge no interactive transactions but still expose `transaction()` (`backend/src/db/types.ts:12-15`). No call site uses it today (grep), so this is a latent design hazard. `D1Adapter.execScript()` naively splits on `;` (`d1.ts:29-33`). `run()` depends on `meta.changes` (`d1.ts:21-27`), which the stub merely imitates (`backend/test/demo.test.ts:81-90`); real D1 return-shape/latency is not exercised in the app.
**Impact:** Future code can call `transaction()` expecting rollback and silently get partial writes. A semicolon inside a string/comment breaks `execScript`. If D1’s `meta.changes` is absent/different, update/delete operations could return false and be reported as 404 even when they succeeded. The app’s D1 path is not proven.
**Blocker:** Local: no · Staging: **yes for D1 integration** · Production: **yes**
**Remediation:** Remove/replace `transaction()` with an explicit D1-safe API (e.g., `batch()` or documented single-statement invariants) and make unsupported atomicity fail loudly; implement a proper SQL splitter or use Wrangler migrations only; verify `run()` result mapping against real D1; add D1 integration tests for create/update/delete/publish/soft-delete.
**Test approach:** Real staging D1 contract suite; assert changed-row semantics; force a mid-batch failure and assert no partial state; migration apply + re-apply idempotence.

#### P3-09 — Dependency advisories remain unresolved (2 critical, 4 moderate)
**Status:** VERIFIED advisory applicability by exact installed version (OSV, 2026-10-22); `npm audit` itself timed out
**Evidence (installed):** `vitest@3.2.7`, `tinypool@1.1.1`, `@vitest/mocker@3.2.7` (`package-lock.json:1424-1443,2250-2258`), `react-router@6.30.6` / `react-router-dom@6.30.6` (`package-lock.json:2071-2094`), Vite 6.4.4, Hono 4.13.13, Zod 3.25.76.
**Advisories:** `tinypool` **GHSA-5gmw-xhrv-c9v3** (critical, fixed 2.1.1) and **GHSA-85c8-ppgw-ccpr** (critical, fixed 2.1.2) — prototype-pollution gadgets leading to RCE when running test workers with attacker-influenced options. `vitest` **GHSA-82fw-gwwq-j7x9** (moderate, path traversal/arbitrary file read, fixed 4.1.11) and `@vitest/mocker` **GHSA-qxg6-89mg-rqv8** (moderate, code injection via manual mock registration, fixed 4.1.12). `react-router` **GHSA-337j-9hxr-rhxg** (moderate, SSR hydration constructor injection, fixed 7.18.0) and **GHSA-wrjc-x8rr-h8h6** (moderate, open redirect via backslash, fixed 7.18.0).
**Impact:** Tinypool/Vitest are dev-only and not shipped in `dist/`; realistic exposure is running tests on a machine where an attacker can influence worker options or test inputs. React Router findings are not currently exploitable as an SPA without SSR/hydration; route targets are static or slug-based and slugs are server-validated. Still, **two critical dev-tool advisories** and unresolved moderates require a recorded decision; leaving them unrecorded is not acceptable for a production gate.
**Blocker:** Local: no (test tooling only) · Staging: no · Production: no direct runtime exposure
**Remediation (analysis only; no upgrade here):** Prefer the smallest fix: **Vitest 4.1.12** (fixes both Vitest/mocker advisories; Vitest 4 no longer depends on tinypool; engines `^20 || ^22 || >=24`; peer Vite `^6 || ^7 || ^8`; current Node 24.20/Vite 6.4.4 qualify) before considering Vitest 5.0.5. For React Router, **7.18.0** fixes both advisories; requires Node ≥20 and React ≥18 (current React 18.3.1 qualifies), with a declarative-router migration check. Or record a dated deferral with rationale. See B1/B2 in §6.
**Test approach:** Upgrade in separate commits; backend Vitest 27/27 + `tsc`; frontend tsc/build + Playwright 19/19 including all 13 public routes and admin flows; re-run OSV/npm audit; inspect `npm ls tinypool @vitest/mocker` to confirm removal; bundle scan to confirm dev tooling is absent from `dist/`.

---

### Medium

#### P3-10 — Boundary validation/data-integrity gaps (four verified cases)
**Status:** VERIFIED (source and in-memory probes)
**Evidence:**
1. **Whitespace-only leads are accepted and stored empty.** `inquiryInput` enforces `min(2)`/`min(10)` before trimming (`shared/src/index.ts:41-45`); the route trims afterward (`routes/public.ts:82-84`). In-memory probe: a payload with `name: "  "` and `message: "          "` returned **201** and stored `name=""`, `message=""` (length 0). This pollutes the Leads inbox and bypasses the intended minimum content.
2. **Settings values are not parsed/validated per key.** `settingsPutSchema` validates only key membership/length and `value_json` as a string (`routes/admin.ts:79-87`); `publicSettings` exists but is not used on write; `getPublicSettings` falls back to raw text on parse failure (`repo/settings.ts:16`). Invalid JSON or a non-E.164 WhatsApp value can be stored and served. `SECURITY.md:30`/`API.md:88` promise narrow per-key Zod validation.
3. **Service slug is not constrained to the 7 commercial categories.** The DB CHECK applies to `category`, not `slug` (`0001_init.sql:6-10`); create validation accepts any valid slug with a valid category (`routes/admin.ts:40-45`). In-memory probe: creating `{slug:"not-a-service", category:"erp", status:"published"}` returned **201** and the public detail returned **200**, while the frontend only knows the 7 static slugs (`frontend/src/data.ts:9-20`; `public.tsx:247-250`) and will render “Layanan tidak ditemukan.” Published but unreachable content breaks the taxonomy contract.
4. **Creating directly as `published` leaves `published_at` NULL.** `createRow` inserts fields as-is (`repo/content.ts:69-74`); only `updateRow` sets `published_at` (`content.ts:79`). In-memory probe confirmed `status='published'`, `published_at=null`. Public visibility still works, but publication metadata/audit semantics are inconsistent.
**Impact:** Blank/hostile lead records pollute triage; malformed public settings can break the site’s WhatsApp/SEO behavior; extra published service slugs are visible in the API but unreachable in the static frontend taxonomy; publication timestamps are unreliable for create-published rows.
**Blocker:** Local: **partial** (data quality/truthfulness) · Staging: **partial** · Production: **yes for integrity**
**Remediation:** Trim/normalize before length checks (or `.trim().min()`); validate settings JSON + per-key schema before storage; enforce `slug === category`/7-value slug at API and DB (forward migration where feasible); set `published_at` on create when status is published (and decide whether unpublish clears it). Add validation tests with whitespace, invalid JSON, extra service slugs, and create-published.
**Test approach:** Vitest boundary cases for each; in-memory integration asserts stored row shape; public API test asserts only the 7 service slugs can be published; e2e confirms create-as-published metadata.

#### P3-11 — Session lifecycle/config is incomplete (absolute TTL only, no GC, no production fail-closed)
**Status:** VERIFIED
**Evidence:** `getSession` rejects only `expires_at <= now` (`http/auth.ts:48`); TTL is a single absolute value (`config.ts:45`, `auth.ts:52-59`); no idle/last-used timeout, no purge of expired/revoked rows (`repo/admin.ts`), and no session GC job. `config.ts` defaults `COOKIE_SECURE=false` and defaults the origin to localhost even when `NODE_ENV=production`; `isProd` is unused. `SESSION_SECRET` is required by config but unused (`config.ts:10,44`; no consumer).
**Impact:** A stolen session remains valid for the full TTL; expired/revoked rows accumulate (especially D1 cost/storage); a misconfigured production deploy can issue non-Secure cookies against an HTTP/localhost origin. The unused session secret creates false confidence and unnecessary secret handling. `SECURITY.md:19` promises short idle + absolute timeouts and D1 session validation.
**Blocker:** Local: no · Staging: **partial** · Production: **yes**
**Remediation:** Add `last_used_at`/idle timeout and a bounded absolute TTL; purge expired/revoked sessions on a schedule; on production fail closed if `COOKIE_SECURE` is false or `FRONTEND_ORIGIN` is not HTTPS; either remove `SESSION_SECRET` or use it for a documented purpose (e.g., pepper/HMAC); rotate/invalidate on recovery.
**Test approach:** Clock-injected idle/absolute expiry tests; purge job test; production config validation test (missing/insecure values fail startup); cookie flag assertions.

#### P3-12 — Local migration runner is non-atomic and has no checksum/drift protection
**Status:** VERIFIED source; failure behavior SUSPECTED
**Evidence:** `migrate()` executes the whole SQL file via `execScript` and only afterward inserts the journal row (`db/migrate.ts:13-16`); there is no surrounding transaction for SQLite and no checksum. A failure midway can leave partial schema without a journal entry, so retry may fail on “table already exists.” D1 migrations use Wrangler’s journal; local and remote journals are different, with no drift check. `D1Adapter.execScript` split-on-`;` is also fragile (`d1.ts:29-33`).
**Impact:** A bad local migration can leave `dev.db`/`e2e.db` in a partially migrated, hard-to-recover state; modified historical migrations are not detected. Staging/production use Wrangler, but the app’s local proof of migration reproducibility is weaker than claimed.
**Blocker:** Local: **partial** · Staging: no (Wrangler path) · Production: no
**Remediation:** Wrap each SQLite migration in `BEGIN/COMMIT` with rollback on failure; record checksums; refuse modified applied files; add an explicit `migrate --dry-run`/status command; keep D1 on a single documented migration path. Replace `execScript` splitting with a proven parser or restrict to Wrangler.
**Test approach:** Inject a deliberately failing second statement and assert no partial schema + retry succeeds; checksum tamper test; fresh apply/re-apply; staging D1 migration rehearsal.

#### P3-13 — Public truthfulness regressions (D-36) and misleading error states
**Status:** VERIFIED source
**Evidence:**
- `Produk` renders “Katalog produk segera hadir.” whenever `data` is null and `error` is false (`frontend/src/pages/public.tsx:330-332`) — that includes the loading state. D-36 says lists must distinguish loading/error/empty and claims the existing Produk pattern was mirrored (`docs/DECISIONS.md:125`); the “precedent” itself lacks the loading gate.
- Detail pages render “tidak ditemukan” for **any** fetch failure (network, 500, 404): products `public.tsx:354`, portfolio `:422`, articles `:513`. A server outage reads as “content doesn’t exist.”
- WhatsApp settings failure is caught as `null` (`Layout.tsx:20-26`), then rendered as “Chat WhatsApp (segera hadir)” (`:38-44`) — a fetch failure reads as “coming soon,” contrary to D-36/D-30 honesty intent. Every CTA instance repeats the same settings fetch.
- Admin login catches every failure as “Email atau kata sandi salah” (`cms.tsx:129-131`), so 429/500/network errors look like bad credentials.
- Admin list refresh catches 401 as generic “Gagal memuat data” (`cms.tsx:650-655`); only mutations map session expiry.
- `api()` throws an `Error` carrying `status`/`fields`/`message_id` but discards the stable `error.code` (`frontend/src/api.ts:12-16`), so callers cannot cleanly distinguish `RATE_LIMITED`, validation, and other failures.
**Impact:** Users are shown false states (“coming soon,” “not found,” “wrong password”) for outages/rate limits; this is exactly the truthfulness class D-36 was meant to eliminate. Repeated settings fetches add noise.
**Blocker:** Local: **partial** · Staging: **partial** · Production: **yes for UX honesty**
**Remediation:** Add distinct loading gates; distinguish 404 from other errors using the HTTP status already attached by `api()` (and preserve the returned error `code` instead of discarding it); show a retryable “Gagal memuat” state for network/5xx; keep WhatsApp failure distinct from “not configured” (e.g., “Kontak sementara tidak tersedia”); map 429/5xx on login; map 401 lists to the session-expired message; share one settings fetch (context/cache) instead of per-CTA requests.
**Test approach:** Playwright route-abort/500/429 cases for Produk/detail/WhatsApp/login/admin list; assert loading vs empty vs error text; assert no “segera hadir” under simulated failure; verify one settings request per page.

#### P3-14 — Admin CMS data-loss/misleading-state defects
**Status:** VERIFIED source
**Evidence:** Pricing form sends `description_id` (`cms.tsx:713-715`), but the pricing create schema (`routes/admin.ts:68-75`) and writable allowlist (`repo/content.ts:15`) do not include it — the “Isi” textarea shown for every module (`cms.tsx:954-957`) is silently discarded for pricing. Delete confirmation says soft-deleted data “dapat dipulihkan” (`cms.tsx:773`), but no restore API/UI exists (`routes/admin.ts:236-242`; no restore route). Create success always announces “Data baru tersimpan sebagai draft” (`cms.tsx:742`) even when the selected status is published. Dashboard fan-out issues 24 GETs per load (`cms.tsx:270-302`: 5 modules × 4 statuses + 4 leads calls), with no aggregate endpoint.
**Impact:** Admins lose typed pricing descriptions without warning; they are promised a recovery path that does not exist; success messaging can contradict the selected status; dashboard latency/cost scales with modules and is avoidable on D1.
**Blocker:** Local: **partial** · Staging: **partial** · Production: **yes for admin correctness**
**Remediation:** Either remove the dead pricing description field or add `description_id` to the pricing schema/DB (needs owner contract decision); implement restore endpoints + UI or change the copy to “only recoverable via ops/DB”; make the success notice reflect actual status; optionally add a summary endpoint/caching (D-44 currently mandates existing endpoints, so this is a follow-up decision).
**Test approach:** Admin create/edit pricing test asserting no silent drop; restore lifecycle test (delete → restore → public visibility); status-specific notice assertion; dashboard request-count test if aggregate endpoint is approved.

#### P3-15 — DB indexing, projection, and pagination gaps
**Status:** VERIFIED schema/source; performance impact SUSPECTED
**Evidence:** `0001_init.sql` has no secondary indexes for `status/deleted_at/updated_at`, `leads.state/created_at`, `sessions.expires_at`, or `audit_log.created_at`; public/admin queries filter/sort on these columns (`repo/content.ts:34-39,55-66`; `repo/leads.ts:21-26`). Public reads use `SELECT *` (`content.ts:35,39`), returning every editorial column (currently public-safe, but future admin-only columns leak by default). Public lists have no pagination (`routes/public.ts:30-57`).
**Impact:** Full scans and large payloads as content grows; D1 rows-read/cost/latency increase; future column additions can leak through `SELECT *`. This is not a current data leak but a confirmed scaling/security-by-default weakness.
**Blocker:** Local: no (small data) · Staging: **partial** · Production: **yes at scale**
**Remediation:** Forward migration for selective indexes; replace `SELECT *` with explicit public column projections; add public pagination/caching if content grows; keep admin projections explicit as well.
**Test approach:** Query-plan assertions on SQLite for index use; response-shape tests that assert no unexpected columns; load test on staging D1.

#### P3-16 — Audit log is write-only in practice and incomplete
**Status:** VERIFIED
**Evidence:** `audit()` inserts actor/action/target/created_at (`repo/admin.ts:64-66`); there is no admin read endpoint for audit logs (no route in `routes/admin.ts`), so the dashboard’s “activity” data has no trustworthy source (D-44 explains this omission). Failed login attempts return before any audit call (`routes/admin.ts:105-108`); no IP/user agent/session id is recorded; append-only is not enforced by DB permissions/triggers.
**Impact:** Intrusion attempts are invisible; incident review cannot reconstruct who did what from the app; the audit trail cannot be consumed by the CMS without a new endpoint. Production operations/security evidence is incomplete.
**Blocker:** Local: no · Staging: **partial** · Production: **yes for operations**
**Remediation:** Add a Super Admin-only, read-only audit list/detail endpoint with pagination; record failed logins and safe metadata (no passwords/tokens); define retention; restrict direct DB write access; optionally add hash chaining/append-only storage. Do not expose PII unnecessarily.
**Test approach:** Failed-login audit test; read endpoint auth/IDOR tests; pagination; retention window; verify no secrets/PII in logs.

#### P3-17 — Node engine contract is wrong for `node:sqlite`
**Status:** VERIFIED
**Evidence:** Root `package.json:22-24` declares `"node": ">=20"`; `README.md:19` says Node ≥20. `backend/src/db/sqlite.ts:2` imports `node:sqlite`. Node docs: `node:sqlite` was **added in v22.5.0**; it remained behind `--experimental-sqlite` until **v22.13.0** (v24 current is release candidate). A developer on Node 20 (or early Node 22) cannot start the backend/tests without flags the scripts do not pass.
**Impact:** Onboarding and CI reproducibility fail on an allowed engine version; the “zero npm deps” local DB choice is good but the support matrix is misstated. Current machine (Node 24.20.0) passes, which can hide the problem.
**Blocker:** Local: **partial** (for Node 20/early 22) · Staging: no (Workers) · Production: no
**Remediation:** Set engines to `>=22.13.0` (or `>=24`), update README, add `.nvmrc`/CI matrix; consider a startup preflight with a clear message. Do not claim Node 20 support.
**Test approach:** CI matrix on 22.13 and 24; backend start + Vitest; document the `--experimental-sqlite` requirement if supporting 22.5–22.12.

#### P3-18 — No observability, DB health probe, or CI pipeline
**Status:** VERIFIED absence
**Evidence:** `/api/v1/health` returns a static `{ok:true}` without a DB probe (`app.ts:34`); unhandled errors log only `e.name` (`app.ts:51-53`); no request IDs, structured logs, metrics, tracing, alerting, or uptime checks; no `.github/workflows`/CI config in the repo (search found none). Deployment/rollback runbooks are designs only (`DEPLOYMENT.md:34`).
**Impact:** Workers/D1 failures, latency, and error spikes would be invisible; a broken DB can still report healthy; deployments have no automated gate; incident response lacks evidence.
**Blocker:** Local: no · Staging: **yes for acceptance** · Production: **yes**
**Remediation:** Add structured request/error logs with request IDs (never secrets), a DB-backed health/readiness probe, Cloudflare analytics/logpush or equivalent, alert thresholds, and a CI pipeline (install → tsc → Vitest → build → Playwright; optional staging smoke). Document rollback and on-call steps.
**Test approach:** Health endpoint with DB down/up; log schema validation; CI dry run; alert simulation.

#### P3-19 — Documentation is materially out of sync with the implementation
**Status:** VERIFIED
**Evidence:** See the mismatch table in §5. The Phase 00 `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, and `docs/README.md` still carry “not implemented/proposal only” status headers; the built system has local implementations. `API.md` envelope/fields/filters differ; `SECURITY.md` promises argon2/bcrypt, per-account lockout, idle timeouts, D1 sessions, recovery, audit reads, CSP/HSTS, and repeated-submission protection; several are not implemented. `README.md:15` still references D-01–D-33 while D-44 exists. The 2026-10-22 progress audit’s F-1 (“no git”) is now superseded by D-34/`9a9eb41`, and its dependency findings are outdated by installed Vitest 3.2.7 and the 2026-10-21 `@vitest/mocker` advisory.
**Impact:** Readers cannot tell implemented behavior from roadmap; security/API assumptions may be wrong; future agents can re-implement or “fix” already-built behavior. This is a process risk, not a runtime defect.
**Blocker:** Local: no · Staging: **partial** (review confusion) · Production: **yes for operational docs**
**Remediation:** A docs-only status/contract sweep: add “implemented locally on date” headers, update `meta`/filters/inquiry field names, mark unimplemented security claims explicitly, fix README/docs index, and add a “current implementation vs target” section. Do not rewrite historical phase reports or silently resolve TBDs. This audit report is the new current-state reference.
**Test approach:** Documentation review checklist; link/heading checks; no code tests.

#### P3-20 — Request-body size limits are absent or bypassable
**Status:** VERIFIED
**Evidence:** The public inquiry guard checks only `Content-Length` and only if present (`http/auth.ts:92-93`); a chunked request has no `Content-Length`, so the 64 KB cap is bypassed. Admin/auth routes call `c.req.json()` with no size guard at all (`routes/admin.ts:102,136,197,220,259,280`). No Hono `bodyLimit` middleware is registered (`app.ts`).
**Impact:** An unauthenticated or authenticated caller can send oversized JSON to consume memory/CPU; Workers request/memory limits make this a denial-of-service concern. Local Node may be more forgiving, masking the production risk.
**Blocker:** Local: no · Staging: **partial** · Production: **yes**
**Remediation:** Add a global request-size middleware (content-length + streaming byte cap) with route-specific limits; reject oversized bodies before JSON parsing; keep the public 64 KB cap; test chunked bodies.
**Test approach:** Oversized content-length and chunked-body tests for public/admin/auth; assert 413 before parse; load test.

#### P3-21 — Automated tests leave important failure paths unproven
**Status:** VERIFIED counts/gaps
**Evidence:** 27 backend tests cover bootstrap single-winner, login/session/CSRF/expiry, inquiry/honeypot/rate limit, repository publication/allowlist, demo URLs, and D1 call-shape stub (`backend/test/*`). Prior e2e 19/19 (cited R3) covers public/admin happy paths. There are no tests for: real D1/Workers; trusted-proxy/IP spoof resistance; body-size/chunked; settings value validation; whitespace-only inquiries; service-slug taxonomy; create-published `published_at`; migration failure/rollback; backup/restore; session GC; CSP/header/cache policy; login 429/5xx UI; stale-fetch/404-vs-error UI; admin session expiry on list; dashboard call count; public pagination/load.
**Impact:** The green suite proves local happy-path behavior, not production failure behavior. This is consistent with the prior audit’s warning against calling SQLite-only tests “production-ready.”
**Blocker:** Local: no · Staging: **yes for acceptance** · Production: **yes**
**Remediation:** Add the missing Vitest suites as part of A1/A2 and the UI failure tests as part of C1; add a staging D1 contract/load suite in D. Keep e2e on a disposable DB and one worker.
**Test approach:** Table-driven boundary tests; Playwright route interception/abort/500/429; D1 staging smoke; migration fault injection.

---

### Low

#### P3-22 — Password/session configuration polish
**Status:** VERIFIED
**Evidence:** Password hashes are formatted `scrypt$salt$hash` with fixed default scrypt parameters and no parameter/version field (`backend/src/auth/passwords.ts:8-21`), so future cost changes cannot be migrated per hash; `SESSION_SECRET` is required but unused (`config.ts:10,44`); bootstrap rate-limited responses are `429 RATE_LIMITED` while invalid/disabled bootstraps are `403 BOOTSTRAP_DISABLED` (`routes/admin.ts:131-142`), contrary to the “same response whether disabled, rate-limited, or token-invalid” wording in `SECURITY.md:18`.
**Impact:** Harder password-hash upgrades; confusing unused secret; minor response-shape inconsistency (not an account-existence oracle, since rate limiting does not depend on admin existence).
**Blocker:** Local: no · Staging: no · Production: no (polish)
**Remediation:** Include scrypt parameters/version in the hash format and support rehash-on-login; remove or repurpose `SESSION_SECRET`; either document the 429 exception or return a uniform safe response.
**Test approach:** Rehash-on-successful-login test; old/new hash verification; bootstrap response-shape matrix (invalid/disabled/rate-limited); config test asserting unused secrets are not required.

#### P3-23 — Low-severity correctness/maintenance polish
**Status:** VERIFIED
**Evidence:** IDs use `Date.now()` + `Math.random()` (`db/types.ts:31-33`; `routes/admin.ts:145,201`) — adequate non-secret identifiers but not collision-proof; default Zod messages can surface in English despite the Indonesian UI contract (`errors.ts:16-22`); `putSetting` read/upsert/history and create/update+audit are multi-statement without transactions (`repo/settings.ts:26-39`; `routes/admin.ts:200-207`), so a history/audit failure can leave a write applied with a 500; every `WhatsAppCta` independently fetches settings (`Layout.tsx:17-27`).
**Impact:** Low probability collisions/duplicate retries, inconsistent ID-language errors, audit/history gaps under failure, and avoidable requests. None is a launch blocker on its own.
**Blocker:** Local: no · Staging: no · Production: no (polish; audit atomicity becomes more relevant if audit is used for compliance)
**Remediation:** Use `crypto.randomUUID()`/ULID; add Indonesian messages or map defaults; wrap settings/history and write+audit in a transaction (SQLite) / batch or tolerate-and-log (D1); cache public settings once per page.
**Test approach:** ID collision smoke (large batch); validation-message language assertions; failure injection between write and history/audit; page-level request count for settings; no duplicate IDs in seeded/e2e runs.

---

## 4. Area-by-area scorecard

| Audit area | Verdict | Key evidence / findings |
|---|---|---|
| Frontend/API integration | **AMBER** | Core flows wired; P3-07 origin/credentials; P3-13 truthfulness; P3-14 CMS; P3-16 dashboard fan-out |
| Auth, bootstrap/recovery, sessions, CSRF, authorization | **GREEN local / AMBER prod** | Strong opaque-session + CSRF + single-winner implementation and tests; P3-05 recovery/rotation; P3-11 idle/GC/config; P3-22 polish |
| Validation, rate limiting, proxy trust, abuse prevention | **AMBER local / RED prod** | Zod + honeypot + local limits present; P3-04 spoofable/isolate-local; P3-10 whitespace/settings/slug; P3-20 body size |
| Repositories, SQLite/D1 adapters, migrations, transactions, concurrency | **AMBER local / RED staging** | Repositories/allowlists/migrations work on SQLite; P3-01 no Worker/D1 app path; P3-08 no-op transaction/stub-only; P3-12 non-atomic local migrations; D-22 concurrency incomplete |
| DB integrity, soft deletion, retention, published-data consistency | **AMBER local / RED prod** | Publication gate/soft delete verified; P3-03 no retention; P3-10 slug/published_at; P3-15 indexes/projection; no restore (P3-14) |
| Backup/restore vs RPO ≤24 h / RTO ≤8 h | **RED** | P3-02: no artifact, schedule, restore, or rehearsal; targets only |
| Automated tests and untested failure paths | **GREEN local / AMBER** | 27/27 + tsc re-run; prior e2e 19/19; P3-21 gaps; real D1/Workers/backup/load unproven |
| Dependency findings | **AMBER** | P3-09: 6 advisories (2 critical, 4 moderate); dev-only/SPA posture; OSV evidence; npm audit timed out |
| Cloudflare Workers/D1, secrets, observability, rollback, DNS | **RED** | P3-01, P3-06, P3-18; no Wrangler/backend config, no staging D1, no monitoring/rollback drill/domain |
| Documentation vs implementation | **AMBER/RED** | P3-19 + §5; Phase 00 status headers and several security/API/testing claims stale |

---

## 5. Documentation-vs-implementation mismatches

These are **documentation defects**, not permission to implement; historical reports remain unchanged.

| # | Document claim | Actual implementation | Evidence | Severity |
|---|---|---|---|---|
| D1 | `API.md` says “no endpoints implemented” and presents contracts as proposals | Public + admin endpoints are implemented locally | `API.md:3`; `backend/src/routes/*` | Medium |
| D2 | List envelope is `{data, meta:{page, per_page}}` | Content lists return `{data, meta:{total, page}}`; leads returns `{total}` only | `API.md:18`; `admin.ts:189,250`; `api.ts:21-24` | Medium (contract drift) |
| D3 | `sort`/`order` query support | Not implemented | `API.md:19`; `repo/content.ts:65` fixed order | Low |
| D4 | Products `?readiness=` and pricing `?service=` filters | Not implemented | `API.md:31,37`; `routes/public.ts:30-57` | Low |
| D5 | Inquiry body fields `email/service/description` | Actual `contact/need_category/message` | `API.md:57`; `shared/src/index.ts:40-50` | Medium |
| D6 | Service slugs constrained to 7; DB CHECK | DB constrains `category` only; API accepts other slugs | `API.md:20,30`; `0001_init.sql:6-10`; probe in P3-10 | Medium |
| D7 | Admin POST “starts as draft unless explicitly published”; PATCH publishing sets `published_at` | Create-published leaves `published_at` NULL | `API.md:76,78`; `repo/content.ts:69-79`; probe | Low/Medium |
| D8 | Settings PUT has narrow per-key Zod validation, especially E.164 WhatsApp | Only key allowlist + string length; value not parsed | `API.md:88`; `SECURITY.md:30`; `admin.ts:79-87`; `settings.ts:16` | Medium |
| D9 | Leads DELETE is followed by hard purge by retention job | Soft delete only; no purge exists | `API.md:84`; `DATABASE.md:118,162`; `repo/leads.ts:43-46` | High (P3-03) |
| D10 | `DATABASE.md` says no DB/migrations/leads table exist | `dev.db`/`e2e.db` and migrations exist; leads table exists | `DATABASE.md:3,101-103`; `0001_init.sql`; filesystem | Medium (stale status) |
| D11 | Sessions store on D1 (D-18, approved design) | Local sessions use SQLite; D1 app path unvalidated | `DECISIONS.md:66`; `repo/admin.ts`; `d1.ts` stub test | Medium |
| D12 | Argon2/bcrypt proposed; per-IP **and per-account** lockout; short idle + absolute TTL; uniform bootstrap responses; audit readable by Super Admin | scrypt with fixed defaults; per-IP only; absolute TTL only; 429 vs 403 bootstrap; no audit read endpoint | `SECURITY.md:17-21`; `passwords.ts`; `auth.ts`; `admin.ts`; `repo/admin.ts` | High/Medium |
| D13 | CSP, `frame-ancestors`, HSTS on production domain | Only 3 API headers; no static-host headers | `SECURITY.md:40`; `app.ts:27-32`; `index.html` | High (P3-06) |
| D14 | Frontend build fails closed on WhatsApp placeholder/draft exposure/non-allowlisted settings | No build-time guard exists; runtime placeholder only | `DEPLOYMENT.md:32`; `frontend` build script; `Layout.tsx` | Medium |
| D15 | `TESTING.md` says no suites implemented/executed | 27 Vitest + prior 19 Playwright exist | `TESTING.md:3,13`; test files; §1.2 | Medium (stale) |
| D16 | `README.md` says D-01–D-33 and docs index says “nothing implemented” | D-44 exists; local implementation exists | `README.md:15`; `docs/README.md:3` | Medium |
| D17 | Progress audit F-1 “no git” | Local git history exists (`9a9eb41` baseline; `89ce5db` current); still no remote | `docs/phases/PROJECT-PROGRESS-AUDIT-AND-NEXT-STEPS.md:250-253`; `DECISIONS.md:118-119`; `git log` | Low (superseded) |
| D18 | Progress audit dependency count “5 findings / vitest 3.1.1 / fix vitest 5.0.5” | Installed Vitest 3.2.7; OSV now reports 6 advisories; Vitest 4.1.12 also fixes the mocker path and removes tinypool | `docs/phases/PROJECT-PROGRESS-AUDIT-AND-NEXT-STEPS.md:51-60,254-261`; `package-lock`; OSV; `npm view vitest@4.1.12` | High (decision data) |
| D19 | API prod base is `https://api.<domain>`; frontend/backend separate | Frontend uses relative `/api` and `credentials:'same-origin'` | `API.md:9`; `api.ts:10,32-37`; `vite.config.ts:8-10` | High (P3-07) |

---

## 6. Proposed implementation sequence — A/B/C/D

No work in this section is authorized by this audit. Each batch is designed to be independently reviewable, reversible where applicable, and testable.

### A. HA-01 — Backend hardening (local, no infrastructure)

**Goal:** close the cheapest confirmed/potential backend findings before any staging work, without changing the public UI contract unnecessarily.

| Batch | Scope | Files (indicative) | Acceptance / tests | Owner gate |
|---|---|---|---|---|
| **A1** (smallest safe) | Trusted client-IP resolver (`CF-Connecting-IP` only behind trusted proxy) + bounded/shared-limiter seam; global body-size limits; trim-before-min inquiry validation; per-key settings JSON/schema validation; query-param validation; `Cache-Control: no-store` on admin/auth; audit failed logins; session GC; D1 `transaction()` fail-loud/remove; create-published `published_at`; service slug taxonomy check (app-level) | `http/auth.ts`, `auth/ratelimit.ts`, `routes/{admin,public}.ts`, `shared/src/index.ts`, `repo/settings.ts`, `repo/content.ts`, `db/d1.ts`, `repo/admin.ts`, tests | Vitest 27+ with new boundary/IP/GC/settings/slug/published tests; tsc; no frontend behavior change; no DB schema change | **Yes** (kickoff) |
| **A2** (schema, local) | Forward migration for indexes (`status/deleted_at/updated_at`, leads state/created, sessions expiry, audit created) + optional DB CHECK for service slug/is_public/flags; restore endpoints for editorial + leads (or explicitly change UI copy); decide `published_at` unpublish semantics | new `db/migrations/0002_*.sql`, `repo/content.ts`, `repo/leads.ts`, `routes/admin.ts`, `cms.tsx` (restore UI if approved) | Migration apply/re-apply/fault test; restore lifecycle; public visibility after restore; query-plan check; Vitest + e2e | **Yes** (schema/UI) |
| **A3** (owner policy) | Retention/purge (leads/sessions/audit/history), password change + admin deactivation + session revoke-all, bootstrap token consumption/rotation, audited recovery script/runbook | scripts/repo/routes/docs | Purge boundaries; recovery drill; old sessions rejected; audit completeness; privacy docs | **Yes** (TBD-09/TBD-14) |

**A dependencies:** A1 independent; A2 after A1 and a DB backup; A3 needs owner policy decisions. Do not bundle A3’s policy choices into A1.

### B. HA-02 — Dependency compatibility/upgrade decision (analysis; no upgrade yet)

| Batch | Choice | Compatibility evidence | Verification | Owner gate |
|---|---|---|---|---|
| **B1** | **Vitest 4.1.12** (smallest remediation) | Node engines `^20 \|\| ^22 \|\| >=24` (Node 24.20 ✓); peer Vite `^6 \|\| ^7 \|\| ^8` (Vite 6.4.4 ✓); Vitest 4.1.12 depends on `@vitest/mocker@4.1.12` and **no tinypool**; fixes GHSA-82fw + GHSA-qxg6 and removes the tinypool paths | Backend `npm test` 27/27 after upgrade; adjust `vitest.config.ts` `poolOptions` if Vitest 4 changed them; `npm ls tinypool @vitest/mocker`; OSV re-query; bundle scan | **Yes** (major dev dependency) |
| **B2** | **React Router 7.18.0** (fixes both React Router advisories) | Node ≥20, React ≥18 (React 18.3.1 ✓); declarative `BrowserRouter/Routes/Route/Link/NavLink/Outlet/Navigate/useParams` are used (`App.tsx`, `cms.tsx`, `public.tsx`) and remain available in v7; migration needs route regression | Frontend tsc + Vite build; Playwright 19/19 across 13 public + 7 admin routes; bundle diff; no visual changes | **Yes** (major frontend dependency) |
| **B3** | Re-run advisory audit and record a dated decision/deferral | `npm audit` or OSV; document any deferral with rationale | Audit record in changelog/report; no silent gap | Owner records |

**B dependencies:** B1 can run independently; B2 after B1 or in parallel but in a separate commit; both before D’s production gate so tests run on fixed tooling. Do not combine with A/C changes.

### C. Frontend/API integration and regression verification

| Batch | Scope | Files (indicative) | Acceptance / tests | Owner gate |
|---|---|---|---|---|
| **C1** (smallest safe) | Truthfulness/error UX: Produk loading gate; detail error vs 404; WhatsApp failure distinct from unset; login 429/5xx mapping; admin list 401 mapping; delete/restore copy; pricing dead field; status-aware create notice; share settings fetch | `pages/public.tsx`, `components/Layout.tsx`, `admin/cms.tsx`, `api.ts` | Playwright route-abort/500/429/loading/empty cases; existing 19/19; no visual regression at 360/1280 | **Yes** (kickoff) |
| **C2** (topology) | API base URL + credentials strategy per TBD-11; same-origin proxy or `credentials:'include'` + CORS; env build config | `api.ts`, `vite.config.ts`, deployment config | Cross-origin + same-origin admin flows; preflight/cookie/CSRF/logout; no secret in bundle | **Yes** (TBD-11 decision) |
| **C3** (contract/docs) | Align client/API docs: `meta` shape, inquiry field names, settings validation display, service taxonomy, remove stale “not implemented” headers | `docs/API.md`, `docs/SECURITY.md`, `docs/TESTING.md`, `docs/README.md`, README; no historical report rewrite | Docs checklist; contract tests still green; no TBD silently resolved | **Yes** (docs; no code semantics) |
| **C4** | Regression matrix | — | Backend 27/27; frontend tsc + build; Playwright 19/19; targeted failure tests; 360/768/1280 overflow; console/network checks | **Yes** (phase acceptance) |

**C dependencies:** C1 can start in parallel with A1 (pure frontend); C2 waits for TBD-11; C3 after A1 decides the actual contract; C4 after A/B/C changes.

### D. CF-01 / BK-01 / CN-01 / DP-01 — Cloudflare/D1 production readiness (separately gated; **not authorized**)

| Batch | Scope | Dependencies | Acceptance | Owner gate |
|---|---|---|---|---|
| **D1** | Worker entry + Wrangler config + staging D1 (D-23) + bindings/secrets + `nodejs_compat`; apply migrations; validate D1Adapter/sessions in-app; ensure no `piple-spike-d1` use | A1/A2, B1, owner approval to create staging D1 | Public + admin smoke on staging D1; migration journal; secrets not in bundle; adapter contract tests | **Yes** (Cloudflare resource creation) |
| **D2** | Edge security/observability: WAF/rate limits, trusted `CF-Connecting-IP`, CSP/HSTS/frame-ancestors, no-store admin cache, structured logs/metrics/alerts, health probe, rollback runbook | D1, C2 (topology) | Header/rate-limit/observability tests; rollback rehearsal | **Yes** (secrets/DNS/config) |
| **D3** | BK-01 backup/restore/rollback program; measured RPO/RTO; restore authorization flow | D1; owner restore policy | Timestamped backup + restore drill + measured times + integrity check | **Yes** (BK-01) |
| **D4** | CN-01 expanded concurrency suite on D1 (publish/edit/delete races, migration access, bootstrap race) | D1, D3 preferred | Green suite with evidence log; no partial states | **Yes** (staging tests) |
| **D5** | DP-01 pre-production review + deploy + post-deploy smoke (domain TBD-06, DNS, billing, secrets, launch content, WhatsApp verification, privacy docs) | D1–D4 + C4 + content TBDs | Checklist all-green; live smoke; rollback ready | **Yes, per item** (production, DNS, billing, secrets) |

**D is explicitly out of scope for this audit.** No staging/production D1, DNS, secret, or deployment operation may occur without a separate owner authorization.

### 6.1 Smallest safe order (proposed)

1. **A1** — backend hardening, no schema/infra (smallest high-value batch; closes P3-04/IP, P3-10, P3-11/GC, P3-20, P3-08 contract hazards).
2. **B1** — Vitest 4.1.12 only (separate commit; removes tinypool criticals; verify 27/27).
3. **C1** — frontend truthfulness/error fixes (separate commit; can run in parallel with A1 if files do not overlap).
4. **A2** — indexes/restore/schema checks after A1 and a local backup.
5. **B2** — React Router 7.18.0 after B1 (separate commit; full e2e).
6. **C2/C3** — topology + contract/docs after TBD-11 and A1 contract decisions.
7. **D1–D5** — only after A/B/C acceptance and per-batch owner approvals.

### 6.2 Decisions requiring explicit owner approval

| Decision | Why it cannot be assumed | Related |
|---|---|---|
| Approve A1 kickoff (backend code changes) | Phase 3 authorization was audit-only; remediation requires a new go-ahead | A1 |
| Approve Vitest 4.1.12 upgrade (B1) | Major dev dependency + lockfile change | B1, P3-09 |
| Approve React Router 7.18.0 (B2) or record a dated deferral | Major frontend dependency; behavior/route regression risk | B2, P3-09 |
| Approve C1 frontend fixes | Presentation/behavior changes; R3 remains owner-review-pending | C1 |
| TBD-11 topology: same-origin proxy vs separate `api.` origin | Determines API base/credentials/CORS/cookie design | P3-07, C2, D2 |
| TBD-09 retention period + privacy/data-handling docs | No policy may be invented; gates purge implementation | P3-03, A3 |
| TBD-14 recovery/password/deactivation policy | Security operations and audit requirements | P3-05, A3 |
| Staging D1 creation (D-23) + Cloudflare resources | New infrastructure/billing/security surface | D1 |
| BK-01 backup/restore program + restore authorization | Operational data-recovery authority | P3-02, D3 |
| DP-01 production deploy, DNS/domain, billing, secrets | Production launch authority | D5 |

**Preserved:** TBD-01…TBD-16 remain open/historical exactly as recorded; this report does not resolve any deferred decision. D-01…D-44 remain in force.

---

## 7. No-change attestation

- **Application code:** unchanged.
- **Tests:** unchanged; backend Vitest was executed but only against in-memory SQLite.
- **Dependencies/lockfile:** unchanged; no install/upgrade.
- **Schemas/migrations/seeds:** unchanged.
- **Databases:** `backend/dev.db`, `backend/e2e.db`, WAL sidecars, and `piple-spike-d1` untouched; no DB reset or write.
- **Environment:** no `.env` read or modification; no secrets printed.
- **Infrastructure:** no Cloudflare resource, DNS, secret, deployment config, or deploy/push operation.
- **Only expected doc changes after this audit:** this report and a `docs/CHANGELOG.md` audit entry. Historical reports were not rewritten.
- **Git baseline:** `89ce5db`; working tree was clean at audit start.

**Verification limitation:** because Playwright was not re-run, the 19/19 e2e result is cited from the R3 report rather than re-established here. Real D1/Workers, backup/restore, and load behavior remain unverified by design.

---

## 8. Recommended next step

1. Owner reads this report and records a decision on the **A/B/C/D** proposal.
2. If approved, start with **A1 only** (local backend hardening, no schema/infra), with a separate commit and tests; then **B1** (Vitest 4.1.12) as its own commit.
3. Do **not** start C2/D or any dependency upgrade until the relevant owner approvals and TBD-11/TBD-09/TBD-14 inputs exist.
4. Keep the production gate closed: no staging/production D1, DNS, secrets, backup claims, or deployment until D1–D5 are separately authorized and evidenced.

**Stop here for explicit owner approval.**
