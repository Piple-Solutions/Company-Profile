# Phase 3A — Detailed Audit Review, Idempotency Design & SQLite/Cloudflare Architecture Assessment (Read-Only)

**Status:** REVIEW COMPLETE — **no code, test, dependency, lockfile, schema, migration, seed, database, environment, secret, DNS, Cloudflare, or deployment change was made.**
**Date:** 2026-10-22
**Baseline:** `89ce5db` (Phase 2D-R3), with the Phase 3 audit documentation still uncommitted at the start of this review.
**Authority:** Phase 3A is a **read-only review and proposal only**. It does not authorize A1/A2/A3, B1/B2, C1/C2/C3, D1–D5, the new idempotency workstream (I0–I4), any Cloudflare resource creation, or any deployment.
**Inputs from the owner recorded for this phase:** eventual Cloudflare deployment, a SQLite preference, and backend idempotency as a requirement. These are **direction and requirements**, not blanket approval to change persistence code, production resources, or the API contract.

> Phase 2D-R3 remains **owner review pending**. This document does not mark it accepted, does not reopen prior reports, and does not rewrite any historical report.

---

## 0. Executive summary

| Question | Phase 3A conclusion |
|---|---|
| Were all 23 Phase 3 findings reviewed? | **Yes.** All 23 are indexed and reviewed without renumbering, omission, or silent merging. Severity remains **3 critical / 6 high / 12 medium / 2 low**. |
| Is the local backend ready for development? | **Yes, with the documented local caveats.** Phase 3A re-ran backend Vitest: **5 files, 27/27 tests passing**; backend `tsc --noEmit` passes. |
| Is the frontend/API boundary production-ready? | **No.** It is **AMBER**: core flows are wired, but origin/credentials behavior, public truthfulness, and admin error handling remain unresolved. |
| Is staging ready? | **No — RED.** There is no Worker entry, no `wrangler` configuration for this application, no app-level D1 binding, no real-D1 application test, and no backup/restore evidence; retention/privacy remains a production gate. |
| Is production ready? | **No — RED.** The staging blockers plus identity-recovery, trusted-proxy/edge abuse controls, security headers, observability, backup/RPO/RTO, retention/privacy, and deployment gates are unresolved. |
| Does the backend currently provide idempotency? | **No general HTTP idempotency.** The only duplicate-effect defenses are the unique slug constraint, the one-active-admin partial unique index, and state-style updates. Button disabling and per-isolate rate limiting are not idempotency. |
| What is the recommended idempotency approach? | Make **public inquiry creation** idempotent first using a client request key stored atomically with the lead. Treat CMS create as **duplicate-safe for the same slug** via the existing unique constraint, with optional exact replay only if the owner requires lost-response/retry semantics. Treat bootstrap as a **one-time claim/atomicity problem**, not a generic-key problem. Add a generic idempotency table only if exact admin replay is required or future side effects are enabled, and only after the database port exposes an atomic batch proven on real D1; future external effects also need an outbox. |
| Does the current database abstraction support generic idempotency? | **Not on D1.** `D1Adapter.transaction()` is a direct no-op. `DbPort` has no batch method. A reservation-plus-effect design built on the current port would be unsafe. SQLite transactions work; D1 needs a batch/atomic port and real-D1 proof. |
| Does local SQLite plus Cloudflare Workers + D1 work today? | **Local SQLite: yes. Production topology: not implemented.** D1 is managed SQLite-compatible, not the local `node:sqlite` file. The D1 adapter is exercised only by a structural stub. |
| What is the revised sequence? | **A1 → B1 → C1 → I0/I1 → A2 → I2/I3 → B2 → C2/C3 → C4 → D1–D5**, with A3 (policy-dependent identity/privacy) required before D5, idempotency as a named workstream, and real-D1 idempotency proof inside D4. No step is authorized by this report. |
| What must the owner decide next? | The A/B/C batches, the idempotency contract and schema, TBD-11 topology, TBD-09 retention, TBD-14 recovery/session policy, and the separately gated Cloudflare/backup/deployment work. |

**Bottom line:** the local implementation is credible for development, but it is not a deployable Cloudflare application. The highest-risk gaps are not presentation defects; they are the absence of a Worker/D1 application path, no restore evidence, no retention/privacy implementation, and security controls that are only local-process controls.

---

## 1. Method, evidence, and non-claims

### 1.1 Required reading completed

The review used the complete Phase 3 audit and the governing documentation, including:

- `docs/phases/PHASE-3-BACKEND-READINESS-AUDIT.md`
- `docs/DECISIONS.md` (D-01–D-44 and the approval record)
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `docs/DEPLOYMENT.md`
- `docs/PERSISTENCE-DECISION.md`
- `docs/phases/PHASE-2D-R3-ADMIN-MODALS-DASHBOARD.md`
- Relevant Phase 2D/R2/R3 context and the TBD register in `docs/PRODUCT-REQUIREMENTS.md`

### 1.2 Code inspected read-only

Backend:

- `backend/src/app.ts`, `dev.ts`, `config.ts`
- `backend/src/routes/public.ts`, `admin.ts`
- `backend/src/http/auth.ts`, `errors.ts`
- `backend/src/auth/ratelimit.ts`, `passwords.ts`
- `backend/src/db/types.ts`, `sqlite.ts`, `d1.ts`, `migrate.ts`
- `backend/src/repo/admin.ts`, `content.ts`, `leads.ts`, `settings.ts`
- `backend/db/migrations/0001_init.sql`
- `backend/test/helpers.ts`, `demo.test.ts` and the rest of the backend test suite
- `backend/package.json`, root `package.json`
- `backend/scripts/migrate.ts`, `seed.ts`

Frontend and shared:

- `frontend/src/api.ts`
- `frontend/src/admin/cms.tsx`
- `frontend/src/pages/Kontak.tsx`
- `frontend/src/pages/public.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/vite.config.ts`, `frontend/package.json`
- `shared/src/index.ts` and the shared schemas

Spike and deployment evidence:

- `spike/d1-sqlite/RESULTS.md`
- `spike/d1-sqlite/spike-d1-worker/wrangler.toml` (existence and historical role only)
- `docs/PERSISTENCE-DECISION.md`

`piple-spike-d1` was **not accessed or queried**. `.env` was **not read**. `dev.db`, `e2e.db`, and WAL sidecars were **not modified**.

### 1.3 Verification actually performed in Phase 3A

| Check | Result | Notes |
|---|---|---|
| Backend Vitest | **27/27 passing**, 5 files | Re-run in Phase 3A; in-memory SQLite only. |
| Backend TypeScript | **Pass** | `npm run build --workspace=backend` → `tsc --noEmit`. |
| Frontend Playwright | **Not rerun** | Phase 2D-R3 reported 19/19; it was not rerun because the suite writes `backend/e2e.db`. |
| Real isolated D1 | **Not run** | No application staging database exists; no Cloudflare resources were touched. |
| `npm audit` | **Not rerun** | Phase 3 advisory evidence came from OSV after `npm audit` timed out twice. |
| Local SQLite probes | **Not rerun in 3A** | The Phase 3 probes remain the evidence for whitespace/slug/publish behavior. |
| Deployment | **None** | No deploy, DNS, secret, or Cloudflare resource operation. |

### 1.4 Implemented functionality vs. plans vs. unverified claims

| Category | What is actually true |
|---|---|
| **Implemented locally** | SQLite schema/migrations, public read APIs, inquiry POST, admin session/CSRF auth, bootstrap single-winner guard, admin CRUD, soft delete, settings, leads inbox, audit writes, and 27 backend tests. |
| **Designed but not implemented** | Production Worker entry, application D1 binding, D1 session lifecycle, retention/purge, recovery/rotation/deactivation, backup/restore, observability, and deployment. |
| **Unverified** | Real D1 behavior for this application schema; D1 batch atomicity in this workload; D1 concurrency and error shapes; Workers compatibility of the auth crypto path; backup RPO/RTO; idempotency under concurrent isolates; production load. |
| **Historical only** | The `piple-spike-d1` spike and its three-table SQLite/D1 comparison. It is not an application staging database and must never become one. |

### 1.5 Non-claims

This report does **not** claim that:

- the D1 adapter is production-ready;
- the existing spike proves application-level D1 readiness;
- a button being disabled is backend idempotency;
- a unique slug or a one-active-admin index is a general idempotency solution;
- the TBD register has been resolved;
- Phase 2D-R3 is accepted;
- any A/B/C/D/I work is approved;
- a plan is evidence of execution.

---

## 2. Complete review of all 23 Phase 3 findings

### 2.1 Finding index (no omission / no renumbering)

| ID | Severity | Workstream | Original finding | Status in this review |
|---|---|---|---|---|
| P3-01 | Critical | Platform / deployability | No Cloudflare Workers entry, Wrangler config, or app-level D1 wiring | **VERIFIED absence** |
| P3-02 | Critical | Platform / operations | No backup/restore evidence or measured RPO/RTO | **VERIFIED absence** |
| P3-03 | Critical | Data / privacy | No lead retention, purge, or privacy implementation | **VERIFIED absence; policy UNDOCUMENTED/OPEN (TBD-09)** |
| P3-04 | High | Identity / abuse | Spoofable client IP and per-isolate rate limits; no account lockout | **VERIFIED mechanics; production-scale impact SUSPECTED** |
| P3-05 | High | Identity | No admin recovery, password rotation, or deactivation flow | **VERIFIED absence** |
| P3-06 | High | Identity / browser security | Missing CSP, HSTS, frame-ancestors, and admin no-store | **VERIFIED absence** |
| P3-07 | High | Frontend / API | Same-origin client assumption conflicts with documented `api.` origin | **VERIFIED code; deployment impact SUSPECTED pending TBD-11** |
| P3-08 | High | Data / D1 | Stub-only D1 adapter and no-op `transaction()` | **VERIFIED code; real D1 UNVERIFIED** |
| P3-09 | High | Dependencies | Remaining critical/moderate advisories; no upgrade decision | **VERIFIED advisory applicability** |
| P3-10 | Medium | Data / validation | Whitespace-only inquiry, unvalidated settings, service slug outside taxonomy, published create leaves `published_at` null | **VERIFIED source + probes** |
| P3-11 | Medium | Identity / sessions | Session expiry/GC/config gaps; `COOKIE_SECURE` defaults false in production | **VERIFIED source** |
| P3-12 | Medium | Data / migrations | Non-atomic local migration apply and no checksum/drift control | **VERIFIED source; failure behavior SUSPECTED** |
| P3-13 | Medium | Frontend / API | Public and admin error/loading states are not truthful | **VERIFIED source** |
| P3-14 | Medium | Frontend / API | Pricing dead field, restore copy, status notice, dashboard fan-out | **VERIFIED source** |
| P3-15 | Medium | Data / performance | Missing indexes, `SELECT *` public projections, no public pagination | **VERIFIED schema/source; impact SUSPECTED at scale** |
| P3-16 | Medium | Identity / operations | Audit is write-only; failed logins are not audited; no read path or metadata | **VERIFIED absence** |
| P3-17 | Medium | Platform / runtime | Node engine contract conflicts with `node:sqlite` requirement | **VERIFIED** |
| P3-18 | Medium | Platform / operations | Health endpoint is static; no observability, CI, or metrics | **VERIFIED absence** |
| P3-19 | Medium | Platform / documentation | Architecture/security/API docs are stale or contradictory | **VERIFIED** |
| P3-20 | Medium | Identity / abuse | Body-size limit is bypassable; no explicit admin body limit | **VERIFIED** |
| P3-21 | Medium | Testing | Test suite lacks D1/concurrency/backup/retention/failure coverage | **VERIFIED counts and gaps** |
| P3-22 | Low | Identity / polish | Fixed scrypt format, unused `SESSION_SECRET`, bootstrap rate-limit/error inconsistency | **VERIFIED** |
| P3-23 | Low | Data / polish | Collision-prone IDs, English Zod messages, multi-statement writes without transaction, repeated settings fetches | **VERIFIED** |

**Count check:** Critical **P3-01, P3-02, P3-03** = 3; High **P3-04–P3-09** = 6; Medium **P3-10–P3-21** = 12; Low **P3-22–P3-23** = 2.

**Status vocabulary:** **VERIFIED** = directly supported by source, test, or probe; **SUSPECTED** = mechanism is verified but production impact is not measured; **UNDOCUMENTED/OPEN** = no implemented policy or evidence exists (for example, retention). The per-finding status below uses the most specific term available.

> **Idempotency is a Phase 3A workstream, not a retroactive P3 finding.** It is reviewed in §3 because the owner requires backend idempotency. No P3 finding is renumbered, and no historical report is changed.

---

### 2.2 Workstream 1 — Platform, deployability, and operations

#### P3-01 — No Cloudflare Workers entry, Wrangler config, or app-level D1 wiring

- **Issue:** The application cannot be built or deployed as the documented Cloudflare Worker. There is no Worker entry point, no application `wrangler` configuration, no `env.DB` binding, and no app-level D1 repository wiring. The only Wrangler files in the repo belong to the historical spike.
- **Evidence:**
  - `backend/src/dev.ts:1-2` explicitly says the production Workers entry is “documented … and NOT deployed”; the file serves through `@hono/node-server`.
  - `backend/package.json:5-12` has `dev`/`start`/`build`/`test`/`migrate`/`seed`, but no Worker build or deploy command; dependencies include `@hono/node-server`.
  - `backend/src/config.ts:3-4` imports `node:fs` and `node:path`; `backend/src/db/migrate.ts:4-5` imports `node:fs` and `node:path`; `backend/src/db/sqlite.ts:2` imports `node:sqlite`; these are not part of a Worker runtime.
  - `backend/src/auth/passwords.ts:1-4` imports `node:crypto` and `node:util`; this path must be proven under Workers compatibility or replaced with Web Crypto.
  - `backend/src/db/d1.ts:8-38` is a thin adapter, but no application entry constructs it from `env.DB`.
  - Only `spike/d1-sqlite/spike-d1-worker/wrangler.toml` and `wrangler.remote.toml` exist; they are spike artifacts, not an application configuration.
  - `D-18` in `docs/DECISIONS.md` records the session/D1 design only; implementation is not evidence.
- **Status:** **VERIFIED absence** in the repository. The Cloudflare account was **not inspected**; this finding is not a claim about resources the reviewer did not examine.
- **Impact / severity:** **CRITICAL.** No supported artifact can be deployed. Every staging/production gate is blocked. The Node-only imports also mean a naive “point Wrangler at `dev.ts`” attempt would fail or require unproven compatibility flags.
- **Environment blocker:** Local: no. Staging: **yes**. Production: **yes**.
- **Dependencies:** P3-08 (adapter behavior), P3-07/TBD-11 (origin), P3-18 (observability), P3-02 (backup), P3-11 (sessions), and an owner-authorized staging D1 resource.
- **Recommended fix:** Add a dedicated Worker entry that reads bindings from `env`, constructs `D1Adapter(env.DB)`, and calls the existing `createApp`; add an application Wrangler config with a staging environment, compatibility date, D1 binding, secret bindings, and static assets or a separately chosen frontend topology. Remove Node-only modules from the Worker bundle; use Web Crypto or a proven `nodejs_compat` path for password/token work. Use Wrangler migrations, never the local `node:fs` migration runner, in the Worker. Do not reuse `piple-spike-d1`.
- **Acceptance test:** `wrangler deploy --dry-run`/build succeeds for the Worker bundle; a real isolated staging D1 is bound; migrations apply through Wrangler; public and admin smoke tests pass against the Worker; the bundle contains no `node:sqlite`, no `node:fs`, no `.env` reader, and no secrets; a request trace shows `env.DB` and no Node adapter.
- **Change classes:** **code**, **infrastructure**, **configuration**, **API deployment topology**; no schema change is inherently required beyond applying the existing schema, but the migration path must be validated.
- **Owner decision:** **Yes.** A1/A2 approval does not authorize D1 resource creation, secrets, or deployment. D1 staging creation and Worker deployment require a separate explicit Cloudflare gate (D1/D2). TBD-11 and TBD-14 remain open.

#### P3-02 — No backup/restore evidence or measured RPO/RTO

- **Issue:** The approved backup direction and RPO/RTO targets exist only as documentation. There is no scheduled export, restore procedure, restore test, integrity check, or measured recovery time for D1 or local SQLite.
- **Evidence:**
  - `docs/SECURITY.md`/`docs/DEPLOYMENT.md` define backup option B and targets, but the repository contains no backup job, restore script, runbook, or restore log.
  - `docs/PERSISTENCE-DECISION.md` records D1 spike evidence only; it does not include an application backup or restore.
  - The local SQLite file is a single file with no backup automation; WAL sidecars make naive copying unsafe without a proper backup step.
  - No D1 Time Travel/export evidence exists in the repo.
- **Status:** **VERIFIED absence.**
- **Impact / severity:** **CRITICAL.** A migration error, accidental delete, or D1 incident could cause unrecoverable loss. RPO ≤ 24 h / RTO ≤ 8 h cannot be demonstrated.
- **Environment blocker:** Local: no (development data). Staging: **yes for BK-01 acceptance**. Production: **yes**.
- **Dependencies:** P3-01 (there must be a D1 application to back up), P3-18 (observability/alerting), D3, and an owner restore-policy decision.
- **Recommended fix:** Implement and document scheduled D1 exports/backups, retention of backup copies, encryption/access controls, and a restore runbook. Rehearse restore onto an isolated staging database, run integrity checks and row-count comparisons, measure elapsed time/RPO/RTO, and require a fresh backup before every production migration. Include a compensating-migration rehearsal.
- **Acceptance test:** A timestamped restore drill with before/after row counts, schema/journal check, `PRAGMA integrity_check`, measured restore time, and an owner-authorized restore flow; a failed-restore tabletop also recorded.
- **Change classes:** **infrastructure**, **operations**, **documentation**; no application schema change.
- **Owner decision:** **Yes.** BK-01/D3 and explicit approval for any production restore; the target values and backup retention remain owner decisions.

#### P3-17 — Node engine contract conflicts with the `node:sqlite` requirement

- **Issue:** The repository declares Node `>=20` while the local database adapter uses `node:sqlite`, which was added in Node 22.5 and required `--experimental-sqlite` until 22.13. A developer on the declared minimum can fail at import or startup.
- **Evidence:** root `package.json:22-24` declares `engines.node >=20`; the README’s claim (Phase 3 evidence) repeats Node ≥20; `backend/src/db/sqlite.ts:1-2` imports `DatabaseSync` from `node:sqlite`; Phase 3 verification ran Node `v24.20.0`.
- **Status:** **VERIFIED.**
- **Impact / severity:** **MEDIUM.** Local onboarding/CI can fail even though the current machine passes. It is not a runtime production blocker by itself, but it undermines reproducible verification.
- **Environment blocker:** Local: **partial** (depending on Node version). Staging: no. Production: no.
- **Dependencies:** P3-21 (CI matrix), B1 (dependency decision), and documentation.
- **Recommended fix:** Choose and document a supported Node floor (for example a Node 22 LTS release at or above the version where `node:sqlite` is stable, or Node 24), align root/backend `engines`, README, `.nvmrc`/CI, and add a startup check. Do not silently rely on the reviewer’s Node 24.
- **Acceptance test:** Fresh install and backend tests on the declared minimum and current LTS; a Node below the floor fails with a clear message; CI uses the same declared version.
- **Change classes:** **dependency metadata**, **configuration**, **documentation**; no schema.
- **Owner decision:** **No new policy**, but the engine/package change needs the applicable A1/B1 work authorization. A version bump is not authorized here.

#### P3-18 — Static health endpoint; no observability, CI, or metrics

- **Issue:** `/api/v1/health` is a static response and does not verify the database, migration state, or D1 binding. There is no structured request logging with request IDs, error-rate/latency metrics, alerting, or continuous integration in the repository.
- **Evidence:** `backend/src/app.ts` defines a static health route (Phase 3 evidence); error handling logs only the error name (`backend/src/http/errors.ts`); there is no CI workflow, metrics module, trace/request-id middleware, or alert configuration; `docs/DEPLOYMENT.md` treats observability as future work.
- **Status:** **VERIFIED absence.**
- **Impact / severity:** **MEDIUM.** Failures would be discovered by users, not operators. A deployed Worker would be effectively unobservable.
- **Environment blocker:** Local: no. Staging: **yes for acceptance**. Production: **yes**.
- **Dependencies:** P3-01, P3-02, P3-04 (edge signals), P3-06 (header checks), P3-21.
- **Recommended fix:** Add request IDs and structured logs without PII/secrets; record method, route template, status, latency, error code, and D1 outcome; add database-aware readiness (not just liveness), basic metrics/alerts, and a CI workflow that runs typecheck/tests/build. In Workers, use the platform logging/metrics integration rather than Node loggers.
- **Acceptance test:** A forced DB failure makes readiness fail while liveness stays useful; a request ID is traceable through logs; alert rules fire on error/latency thresholds; CI blocks a deliberately broken typecheck/test.
- **Change classes:** **code**, **configuration**, **infrastructure**, **CI**; no schema.
- **Owner decision:** **Yes for D2/CI infrastructure**; local instrumentation can be part of A1, but deployment/alert configuration is separately gated.

#### P3-19 — Documentation is stale or contradicts the implementation

- **Issue:** Several governing documents still describe the system as unimplemented or use status/contract statements that no longer match the local code. This makes audits and owner decisions unreliable.
- **Evidence:** `docs/ARCHITECTURE.md:3` and `docs/DATABASE.md:3` carry “proposed/not implemented” status despite a local backend; `docs/DATABASE.md` says leads are not created while `backend/db/migrations/0001_init.sql` includes `leads`; `docs/API.md` documents an `api.<domain>` base while `frontend/src/api.ts` uses relative same-origin paths; `docs/SECURITY.md` describes lifecycle requirements that are not implemented; `docs/PERSISTENCE-DECISION.md` still carries pending/proposed TBD language; Phase 3 §5 records **19** specific docs-vs-implementation mismatches. D-16/D-17/D-18/D-23 are design approvals, not implementation evidence.
- **Status:** **VERIFIED.**
- **Impact / severity:** **MEDIUM.** An operator or future agent could assume a feature exists or apply the wrong topology. It is not a runtime defect by itself, but it is a production handoff risk.
- **Environment blocker:** Local: no. Staging: **partial** (review confusion). Production: **yes for operations**.
- **Dependencies:** A1/A2 contract decisions, TBD-11, P3-01, and the docs workstream C3.
- **Recommended fix:** Update status headers and implementation matrices after code decisions; distinguish “design approved” from “implemented/verified”; reconcile API origin, D1 session storage, retention, and deployment claims. Preserve historical entries with dated supersession notes rather than rewriting them. Do not mark TBDs resolved unless the owner does so.
- **Acceptance test:** A docs review finds no claim that a missing feature is implemented; every approved design decision links to either verified code/test evidence or an explicit “not implemented” status; API examples match the actual client topology.
- **Change classes:** **documentation**; no schema or runtime.
- **Owner decision:** **Yes for C3 documentation changes**; no new technical policy is created by documenting reality.

---

### 2.3 Workstream 2 — Identity, security, and abuse prevention

#### P3-04 — Spoofable client IP, per-isolate rate limits, and no account lockout

- **Issue:** `clientIp()` trusts the first `X-Forwarded-For` value (or `X-Real-IP`) before any trusted-proxy validation. Rate limiters are in-memory per process/isolate, so a multi-isolate Worker has independent buckets. There is no per-account lockout or durable abuse state; an attacker can rotate spoofed IPs or distribute requests.
- **Evidence:** `backend/src/http/auth.ts:23-27` returns the first forwarded value; `backend/src/auth/ratelimit.ts:1-12` stores buckets in a process-local `Map` with no eviction; `backend/src/http/auth.ts:19-21` creates module-level limiters for login/bootstrap/inquiry; `backend/src/routes/admin.ts:97-117` applies the login limiter; no lockout/unlock route or durable counter exists; tests in `backend/test/auth.test.ts` prove local behavior, not edge/trusted-proxy behavior.
- **Status:** **VERIFIED mechanics.** Production-scale bypass and its exact severity are **SUSPECTED** until an edge/trusted-proxy test and load test exist.
- **Impact / severity:** **HIGH.** Credential stuffing, inquiry spam, and bootstrap abuse controls can be bypassed or multiplied across isolates. Spoofed IP values also pollute audit/rate-limit context.
- **Environment blocker:** Local: no. Staging: **partial**. Production: **yes**.
- **Dependencies:** P3-01, P3-07/TBD-11, P3-18, P3-20, D2; account-lockout policy depends on TBD-14.
- **Recommended fix:** Resolve the client IP only from a documented trusted proxy/edge header (Cloudflare’s trusted client IP mechanism), never from an arbitrary first hop; strip/reject untrusted forwarding headers at the edge. Replace per-isolate limiters with a shared store (Cloudflare rate limiting, Durable Object, or an approved shared service) or explicitly constrain the topology to a single instance for development only. Add per-account lockout/backoff with safe, non-enumerating responses, and bound in-memory growth.
- **Acceptance test:** Spoofed `X-Forwarded-For` does not change the resolved identity; multiple Worker isolates share one limit; repeated failed logins for one account trigger lockout/backoff; inquiry spam is limited across instances; limiter memory is bounded; audit records show a trustworthy source.
- **Change classes:** **code**, **configuration**, **infrastructure/API abuse policy**; a durable limiter may require a Durable Object/shared table, which is an infrastructure/schema decision.
- **Owner decision:** **Yes.** A1 can implement a trusted-IP seam and local tests, but production edge/durable limits require D2 and TBD-11; lockout policy requires TBD-14.

#### P3-05 — No admin recovery, password rotation, or deactivation flow

- **Issue:** The system has login/bootstrap/logout, but no owner-authorized password change, recovery/reset, session revoke-all UI, or deactivation/reactivation flow. `is_active` and `revokeAllSessions` exist in code but are not exposed through a complete lifecycle. A lost password or compromised account has no supported recovery path; bootstrap token consumption is also not durably tracked.
- **Evidence:** `backend/src/routes/admin.ts:97-165` exposes login, logout, and bootstrap only; there is no `/auth/password`, recovery, deactivate, or revoke-all route; `backend/src/repo/admin.ts` contains `revokeAllSessions`/`touchLogin` but no route uses the former (Phase 3 evidence); bootstrap checks the env token and relies on the one-active-admin index, with no consumed marker; `docs/SECURITY.md` describes a lifecycle that is “documented only.”
- **Status:** **VERIFIED absence.**
- **Impact / severity:** **HIGH.** A single Super Admin account is a single point of failure for the CMS. Recovery would require unsafe database surgery; a compromised session cannot be globally revoked through a supported UI.
- **Environment blocker:** Local: no. Staging: **partial**. Production: **yes**.
- **Dependencies:** P3-11 (session revocation/GC), P3-16 (audit), P3-22 (hash/secret polish), TBD-14.
- **Recommended fix:** Obtain TBD-14 policy approval, then add password change with current-password verification, a recovery/reset procedure that uses an out-of-band owner-controlled path (not email unless an approved provider exists), session revoke-all, and deactivate/reactivate with last-active-admin protection. Durably consume the bootstrap token (for example a one-time bootstrap state row/marker) and make bootstrap effects atomic. Add tests for lost-response/retry behavior.
- **Acceptance test:** Password change invalidates old sessions as specified; recovery cannot be triggered by an unauthenticated request; deactivating the last active admin is rejected; reactivation is audited; a consumed bootstrap token cannot create a second admin; every step is audited; no password/token appears in logs.
- **Change classes:** **code**, **API contract**, **schema** for durable bootstrap consumption and any recovery state, **operations** for out-of-band recovery; policy decision required.
- **Owner decision:** **Yes — TBD-14.** This review does not choose email vs. out-of-band recovery.

#### P3-06 — Missing CSP, HSTS, frame-ancestors, and admin no-store

- **Issue:** API responses add only `nosniff`, `Referrer-Policy`, and `X-Frame-Options: SAMEORIGIN`. There is no Content-Security-Policy with `frame-ancestors`, no HSTS, no permissions policy, and no `Cache-Control: no-store` on admin/authenticated responses. `SAMEORIGIN` still permits same-origin framing, so it is not the stronger `DENY`/`frame-ancestors 'none'` posture this review recommends. The static frontend has no documented security-header configuration.
- **Evidence:** `backend/src/app.ts:27-34` sets those three headers; no static host `_headers`/Worker header configuration exists; `backend/src/routes/admin.ts` does not set `no-store`; `frontend` deployment configuration is not present.
- **Status:** **VERIFIED absence.**
- **Impact / severity:** **HIGH.** Admin pages/tokens and sensitive API responses may be cached or framed; the public surface lacks defense-in-depth. HSTS requires HTTPS and a correct domain decision.
- **Environment blocker:** Local: no. Staging: **partial**. Production: **yes**.
- **Dependencies:** P3-01, P3-07/TBD-11, P3-18, D2.
- **Recommended fix:** Define headers for both static frontend and API: a tested CSP compatible with the actual assets, HSTS only on HTTPS production domains, `frame-ancestors 'none'`/`X-Frame-Options: DENY`, `no-store` for `/admin` and authenticated API responses, `Permissions-Policy`, and a referrer policy. Set cookies HttpOnly/Secure/SameSite as approved.
- **Acceptance test:** Header assertions against the real staging host; admin responses are not cached by a proxy/browser; the approved framing policy is enforced (recommended: `frame-ancestors 'none'`/`X-Frame-Options: DENY`); CSP has no unexplained `unsafe-inline`; HSTS is present only on the HTTPS domain and not on localhost.
- **Change classes:** **configuration**, **infrastructure**, **API response headers**; no schema.
- **Owner decision:** **Yes for D2/C2** (domain/topology and edge configuration); no new data policy.

#### P3-11 — Session expiry/GC/config gaps; production cookie default

- **Issue:** Sessions have an absolute TTL but no idle timeout, no scheduled cleanup, and no last-used tracking. `COOKIE_SECURE` defaults to false when unset, including a production misconfiguration. `SESSION_SECRET` is loaded but unused, which creates a misleading security control.
- **Evidence:** `backend/src/http/auth.ts` validates `expires_at` only (Phase 3 evidence); `backend/src/routes/admin.ts` creates sessions without a GC job; `backend/src/config.ts` defaults `cookieSecure` false; `SESSION_SECRET` has no consumer; `docs/SECURITY.md` requires lifecycle handling that is not implemented.
- **Status:** **VERIFIED source.**
- **Impact / severity:** **MEDIUM.** Stolen/abandoned sessions can live until absolute expiry; a production deployment can accidentally issue non-Secure cookies; database growth and unclear secret ownership increase operational risk.
- **Environment blocker:** Local: no. Staging: **partial**. Production: **yes**.
- **Dependencies:** P3-04, P3-05, P3-16, TBD-14.
- **Recommended fix:** Add an approved idle timeout (requires `last_used_at` or equivalent), absolute expiry, scheduled/local GC, and session revocation on password change/recovery/deactivation. Make production fail closed if `COOKIE_SECURE` is not true and if required secrets/config are absent. Either use `SESSION_SECRET` for a defined purpose or remove it from the configuration contract. Add indexes/cleanup for sessions.
- **Acceptance test:** Expired/idle sessions are rejected; a GC run removes expired rows; production startup fails without secure-cookie configuration; password change/deactivation revokes sessions; no orphaned sessions remain after the test window.
- **Change classes:** **code**, **configuration**, **schema** for idle/last-used state and session GC indexes; **API cookie behavior**.
- **Owner decision:** **Yes — TBD-14** for idle timeout/session policy; A1 can implement GC/config hardening, A3 the lifecycle policy.

#### P3-16 — Audit log is write-only; failed logins are not audited; no read path or metadata

- **Issue:** Audit rows are inserted for some admin actions, but there is no admin read endpoint, no pagination/filtering, and failed logins are not recorded. There is no request ID, source IP, user agent, or outcome metadata sufficient for investigation. Audit retention is undefined.
- **Evidence:** `backend/src/routes/admin.ts` calls `audit(...)` on selected mutations but exposes no audit list; `backend/src/routes/admin.ts:97-117` returns 401 before any audit write on failed login; `backend/src/db/migrations/0001_init.sql` defines the audit table without the richer metadata; `docs/SECURITY.md` requires auditability.
- **Status:** **VERIFIED absence.**
- **Impact / severity:** **MEDIUM.** Operators cannot investigate account compromise or data changes; security events are invisible.
- **Environment blocker:** Local: no. Staging: **partial**. Production: **yes**.
- **Dependencies:** P3-03 (retention), P3-05 (recovery), P3-11 (session context), P3-18, TBD-09.
- **Recommended fix:** Audit failed logins, lockouts, bootstrap attempts, password/recovery/deactivation, and destructive actions with safe metadata (request ID, trusted source, action, target, outcome; never secrets/passwords). Add an authenticated, paginated, filterable read path with no-store and owner-approved retention. Add indexes for time/action/actor.
- **Acceptance test:** Failed-login attempts appear with outcome and no password; audit list supports pagination/filtering; mutation and audit are atomic where required; retention/purge is tested; audit rows are immutable to normal admin flows.
- **Change classes:** **code**, **API contract**, **schema** for metadata/indexes/last-used context, **operations**; retention policy is TBD-09.
- **Owner decision:** **Yes — A1/A2/A3 and TBD-09**; audit data is sensitive and its retention is a policy decision.

#### P3-20 — Body-size limit is bypassable; no explicit admin body limit

- **Issue:** The public route’s guard checks `Content-Length` only; a chunked or omitted-length request can bypass it. Admin JSON parsing has no equivalent limit, so an authenticated or CSRF-protected endpoint can still be fed oversized bodies.
- **Evidence:** `backend/src/http/auth.ts` `publicMutationGuard`/body handling checks the header (Phase 3 evidence); `backend/src/routes/admin.ts:195-198` calls `c.req.json()` without a body limit; no Worker `request.body` size policy exists.
- **Status:** **VERIFIED.**
- **Impact / severity:** **MEDIUM.** Memory/CPU abuse and oversized payload handling, especially on Workers with request limits. It is not a data-integrity bug by itself.
- **Environment blocker:** Local: no. Staging: **partial**. Production: **yes**.
- **Dependencies:** P3-04, P3-01, P3-18.
- **Recommended fix:** Enforce a bounded body read at the app boundary for all JSON routes, independent of `Content-Length`; reject with a stable 413 error; apply route-specific limits (public inquiry stricter than admin settings); ensure the edge/WAF also enforces a limit. Do not rely on Hono’s parser alone.
- **Acceptance test:** Chunked/unknown-length oversized requests are rejected with 413; admin endpoints enforce the configured limit; normal payloads pass; no unbounded buffering; limits are covered by tests.
- **Change classes:** **code**, **configuration**, **API error contract**; no schema.
- **Owner decision:** **Yes for A1**; limits are a technical decision within the approved hardening scope, not a new data policy.

#### P3-22 — Fixed scrypt format, unused secret, bootstrap response inconsistency

- **Issue:** Password hashes have no version/parameter record, so future upgrades cannot rehash transparently; `SESSION_SECRET` is unused; bootstrap rate limiting returns 429 in some paths while the bootstrap token failure returns a generic 403, making diagnostics inconsistent. These are low-severity polish issues but affect future migration and operations.
- **Evidence:** `backend/src/auth/passwords.ts:8-21` uses a fixed `scrypt$salt$hash` shape with no parameters; `backend/src/config.ts` loads `sessionSecret` but no code uses it; `backend/src/routes/admin.ts:131-165` applies the bootstrap limiter before/around token checks (Phase 3 evidence).
- **Status:** **VERIFIED.**
- **Impact / severity:** **LOW.** No immediate exploit; future hash upgrades and operational clarity are harder.
- **Environment blocker:** Local: no. Staging: no. Production: no (polish).
- **Dependencies:** P3-05, P3-11, P3-16; TBD-14.
- **Recommended fix:** Version the hash format and record parameters; add verification-time rehash on successful login; define or remove `SESSION_SECRET`; make bootstrap responses/rate-limit behavior consistent and documented; add tests for retry/limit behavior.
- **Acceptance test:** A legacy hash verifies and is upgraded; a new hash records parameters; 429/403 behavior is deterministic; no unused security config remains without documentation.
- **Change classes:** **code**, **configuration**, **documentation**; no schema (hash remains TEXT).
- **Owner decision:** **No new policy**, but the change belongs to A3/TBD-14 implementation approval.

---

### 2.4 Workstream 3 — Data integrity, database, and privacy

#### P3-03 — No lead retention, purge, or privacy implementation

- **Issue:** Leads are only soft-deleted. There is no retention period, no scheduled hard purge, no privacy notice/consent enforcement beyond the checkbox, and no purge for sessions/audit/history. The data-handling policy remains open (TBD-09).
- **Evidence:** `backend/src/repo/leads.ts:39-46` only sets `deleted_at`; there is no purge job or retention column; `backend/src/routes/admin.ts:268-274` is delete-only; `docs/DATABASE.md:162` says “scheduled hard purge” in the design; no scheduler/cron exists; `docs/SECURITY.md` identifies leads as personal data.
- **Status:** **VERIFIED absence; policy UNDOCUMENTED/OPEN (TBD-09).**
- **Impact / severity:** **CRITICAL for production.** Personal data can persist indefinitely; a privacy request cannot be reliably satisfied; backup copies may retain data beyond the intended period.
- **Environment blocker:** Local: no (fake/dev data). Staging: no. Production: **yes**.
- **Dependencies:** TBD-09, TBD-14 (recovery/audit), P3-01 (scheduler), P3-02 (backup retention), P3-16 (audit), P3-18.
- **Recommended fix:** Owner decides retention periods, deletion basis, and whether backups are exempt/limited; implement a scheduled purge (Cloudflare Cron or approved scheduler), hard-delete or irreversibly anonymize expired leads, purge related audit/history per policy, document privacy copy/consent, and record purge runs. Do not silently choose a retention period.
- **Acceptance test:** A lead older than the approved period is purged; a legal/owner hold can prevent purge if approved; the purge is idempotent and audited (without retaining the deleted PII); backups follow the approved retention; a privacy-request runbook is executed on staging.
- **Change classes:** **code**, **operations**, **infrastructure (scheduler)**, **schema** if retention/hold/audit metadata is added; **data policy**.
- **Owner decision:** **Yes — TBD-09.** No retention period is selected by this report.

#### P3-08 — Stub-only D1 adapter and no-op `transaction()`

- **Issue:** The D1 adapter has never been exercised against real application D1. Its `transaction()` executes the callback directly, so any future multi-step caller receives no atomicity; no call site uses it today, so this is a latent hazard that becomes active with bootstrap/idempotency/multi-step writes. `execScript()` naively splits SQL, and the adapter’s structural D1 type is not validated against the real binding. The only test is a structural stub.
- **Evidence:** `backend/src/db/d1.ts:1-5` documents direct execution; `backend/src/db/d1.ts:31-38` implements `transaction()` as `fn()`; `backend/src/db/d1.ts` `execScript()` splits on semicolons (Phase 3 evidence); `backend/test/demo.test.ts:7-9` says the stub verifies call shape only; `backend/src/db/types.ts:12-15` states D1 direct execution; `DbPort` has no batch method.
- **Status:** **VERIFIED code; real D1 behavior UNVERIFIED.**
- **Impact / severity:** **HIGH.** Any multi-statement invariant (bootstrap, settings/history, audit, future idempotency) can partially commit. The adapter can pass unit tests while failing on real D1 semantics.
- **Environment blocker:** Local: no (uses SQLite). Staging: **yes for D1 integration**. Production: **yes**.
- **Dependencies:** P3-01, P3-12, P3-23, D1/D4; idempotency I2.
- **Recommended fix:** Make `transaction()` fail loudly on D1 instead of pretending. Add an explicit atomic batch capability to `DbPort` (for example an `atomic(statements)` contract implemented with D1 `batch()` and SQLite `BEGIN IMMEDIATE`), and prove all-or-none behavior on real D1. Remove or replace `execScript()` for D1; never parse multi-statement migrations ad hoc. Add a real-D1 adapter contract suite covering `first/all/run`, `meta.changes`, constraints, errors, batch rollback, and restart/persistence.
- **Acceptance test:** A deliberately failing second statement in a batch leaves zero changes on real D1; `transaction()` cannot silently run non-atomically; `meta.changes` is correct; constraint error shapes map to stable API errors; adapter tests run against isolated staging D1, not a stub.
- **Change classes:** **code**, **database abstraction**, **infrastructure/test**; no schema inherently, but idempotency/atomic batch may add schema later.
- **Owner decision:** **Yes.** The fail-loud/port change belongs to A1/A2; real-D1 proof requires D1; generic idempotency schema is an I2 decision.

#### P3-10 — Whitespace-only inquiry, unvalidated settings, arbitrary service slug, and `published_at` null on create-as-published

- **Issue:** Four integrity/validation defects:
  1. Public inquiry accepts whitespace-only name/message; the probe stored an empty name/message.
  2. Settings values are not parsed/validated per key; invalid JSON or a non-E.164 WhatsApp value can be stored and served.
  3. Service **slug** is not constrained to the seven commercial categories. The DB CHECK applies to `category`, not `slug`; an admin can create `{slug:"not-a-service", category:"erp", status:"published"}`, which returns 201 and is publicly readable, while the static frontend taxonomy cannot render it.
  4. Creating content with `status: "published"` leaves `published_at` null, breaking publication ordering/consistency.
- **Evidence:** `shared/src/index.ts:41-45` checks inquiry min lengths before the route trims (`backend/src/routes/public.ts:82-84`); settings write validation only checks key membership/length and `value_json` as a string (`backend/src/routes/admin.ts:79-87`), while `backend/src/repo/settings.ts:16` falls back to raw text on parse failure; `backend/db/migrations/0001_init.sql:6-10` checks `category`, not `slug`, and `backend/src/routes/admin.ts:40-45` accepts any `slugSchema` with a valid category; `backend/src/repo/content.ts:69-74` inserts fields as-is and only `:79` sets `published_at` on update.
- **Status:** **VERIFIED source and in-memory probes.**
- **Impact / severity:** **MEDIUM.** Public catalog integrity and lead quality can be corrupted; a published service slug outside the seven-category taxonomy is API-visible but unreachable/unknown to the frontend; malformed settings can break WhatsApp/SEO rendering; published-at metadata is unreliable for create-as-published rows.
- **Environment blocker:** Local: **partial**; Staging: **partial**; Production: **yes for data integrity**.
- **Dependencies:** P3-21, A1/A2; service taxonomy is also tied to D-04/D-06 historical constraints; settings public projection touches P3-19.
- **Recommended fix:** Trim before length checks; validate settings JSON and each key’s schema on write (and defensively on read); constrain the service slug/category taxonomy at the API boundary and, with approval, at the DB level via a forward migration; set `published_at` when a create/publish transition first publishes, and define whether unpublish clears it.
- **Acceptance test:** Whitespace-only name/message → 400; invalid settings JSON/non-E.164 WhatsApp → 400 and no stored value; creating `not-a-service` is rejected (or DB-rejected) and never publicly served; create-as-published has a non-null `published_at`; republishing does not silently rewrite ordering semantics.
- **Change classes:** **code**, **shared contract**, **API validation**, **schema** for a service-slug taxonomy/`published_at` invariant if the owner approves DB enforcement.
- **Owner decision:** **Yes.** Validation/settings/`published_at` can be A1; a DB taxonomy CHECK or trigger is A2 schema work and needs explicit approval.

#### P3-12 — Non-atomic local migration apply and no checksum/drift control

- **Issue:** The local runner executes each migration script and only then inserts the journal row, with no enclosing transaction and no checksum. A crash between script execution and journal insertion can leave an applied schema with no record; a modified historical migration is not detected.
- **Evidence:** `backend/src/db/migrate.ts:8-19` creates `schema_migrations`, reads applied names, calls `execScript(...)`, then inserts the name; no transaction, checksum, or lock; `backend/db/migrations/0001_init.sql` is applied by this path in dev/tests.
- **Status:** **VERIFIED source; failure behavior SUSPECTED** until fault injection is run.
- **Impact / severity:** **MEDIUM.** Local/test databases can drift from the journal; rerunning a partial migration can fail with duplicate tables; migration provenance is weak.
- **Environment blocker:** Local: **partial**. Staging: no (Wrangler path is separate). Production: no (Wrangler path is separate), but local evidence used in CI would be unreliable.
- **Dependencies:** P3-08, P3-01, A2.
- **Recommended fix:** Wrap each local migration + journal insert in an immediate transaction; add checksums and a lock; reject modified applied migrations; make the runner idempotent and fail clearly. Document that Wrangler maintains a separate production journal and that the two journals are not interchangeable.
- **Acceptance test:** Injected failure after DDL but before journal insertion rolls back the schema; modifying an applied migration is detected; concurrent migration attempts serialize or fail cleanly; a fresh local DB reaches the same schema as CI.
- **Change classes:** **code**, **schema for checksums/journal metadata**, **tooling**; no production D1 schema change.
- **Owner decision:** **Yes for A2 tooling/schema**; no new data policy.

#### P3-15 — Missing indexes, `SELECT *` public projections, and no public pagination

- **Issue:** The schema has no indexes beyond primary/unique keys, public list queries use `SELECT *` and no pagination, and admin list/count paths may scan. Admin dashboard fan-out magnifies the read volume. At small data volumes this is invisible; at scale it increases D1 rows read/latency/cost and leaks unnecessary columns.
- **Evidence:** `backend/db/migrations/0001_init.sql` has no secondary indexes for `status`, `slug` (unique exists), `deleted_at`, `created_at`, foreign references, or lead state; `backend/src/repo/content.ts` uses `SELECT *` (Phase 3 evidence); `backend/src/routes/public.ts` list routes return all published rows; `frontend/src/admin/cms.tsx:270-301` performs 24 list calls for the dashboard.
- **Status:** **VERIFIED schema/source; performance impact SUSPECTED** until staging volume/query plans exist.
- **Impact / severity:** **MEDIUM.** D1 cost/latency and over-fetching; public payload growth; dashboard fan-out can hit limits as content grows.
- **Environment blocker:** Local: no. Staging: **partial**. Production: **yes at scale**.
- **Dependencies:** P3-08, P3-01, P3-14, A2.
- **Recommended fix:** Add owner-approved indexes for the real query predicates (`status/deleted_at/published_at`, lead state, audit time, history key); select explicit public columns; add cursor/offset pagination with a maximum page size; consider a dashboard aggregate endpoint rather than 24 list calls. Validate query plans on real D1.
- **Acceptance test:** Public list queries use intended indexes; responses contain only public columns; pagination has stable ordering and bounded pages; dashboard requests fall within an approved count/latency budget on staging; D1 rows-read metrics improve or stay within budget.
- **Change classes:** **schema (indexes)**, **API contract (pagination/projection)**, **code**, **frontend**; no data migration required for indexes.
- **Owner decision:** **Yes for A2 schema and any public pagination contract**; dashboard aggregate is a D-44 follow-up decision.

#### P3-23 — Collision-prone IDs, English Zod messages, non-atomic multi-statement writes, repeated settings fetches

- **Issue:** Server IDs use `Date.now()` plus `Math.random()` rather than a collision-resistant UUID/ULID; shared Zod schemas default to English messages despite the Indonesian error contract; several operations perform multiple writes without a transaction on D1; repeated settings fetches are wasteful. These are low-severity polish/correctness issues.
- **Evidence:** `backend/src/routes/admin.ts:201` builds IDs with time/random; `backend/src/routes/public.ts:85` uses `uid` from `backend/src/db/types.ts` (Phase 3 evidence); `shared/src/index.ts` schemas have no custom Indonesian messages; `backend/src/routes/admin.ts` separates content write, history write, and audit; `frontend/src/components/Layout.tsx:17-26` fetches settings for every CTA instance.
- **Status:** **VERIFIED.**
- **Impact / severity:** **LOW.** Collision probability is small at MVP scale; English messages are a contract inconsistency; partial writes become more likely once D1 is used; repeated fetches add latency.
- **Environment blocker:** Local: no. Staging: no. Production: no (polish, but the transaction aspect rises with D1).
- **Dependencies:** P3-08, P3-13, P3-16, A1/A2.
- **Recommended fix:** Use `crypto.randomUUID()`/ULID generated app-side; localize Zod messages through a shared error map; group invariant writes into the atomic port; centralize/cache public settings per page load or supply them through a layout-level fetch.
- **Acceptance test:** Generated IDs satisfy the chosen format and collision test; validation errors return Indonesian messages; a forced failure mid-write leaves no partial invariant on D1; settings are fetched once per page session.
- **Change classes:** **code**, **shared contract**, **frontend**; no schema unless ID format constraints are added.
- **Owner decision:** **No new policy**, but implementation belongs to A1/A2/C1 approvals.

---

### 2.5 Workstream 4 — Frontend/API integration

#### P3-07 — Same-origin client assumption conflicts with the documented `api.` origin

- **Issue:** The frontend uses relative `/api` paths and `credentials: 'same-origin'`, while `docs/API.md` proposes `https://api.<domain>/api/v1`. If the deployed frontend and API use separate origins, cookies will not be sent by the current client and CORS/CSRF behavior is untested. The topology is unresolved (TBD-11).
- **Evidence:** `frontend/src/api.ts:1-10` uses `fetch(path, ...)` with `credentials: 'same-origin'`; `frontend/vite.config.ts:6-10` proxies `/api` to localhost in dev; `docs/API.md:9` documents `api.<domain>`; `backend/src/app.ts:21-26` enables credentialed CORS for a configured frontend origin but the client does not use `include`.
- **Status:** **VERIFIED code; deployment impact SUSPECTED** pending TBD-11.
- **Impact / severity:** **HIGH.** Admin login/mutations can fail entirely on a separate API origin; CSRF/cookie assumptions may be invalid; a last-minute workaround risks security regressions.
- **Environment blocker:** Local: no. Staging: **conditional on topology**. Production: **yes** if the documented separate API origin is used without client changes.
- **Dependencies:** TBD-11, P3-01, P3-06, P3-11, C2.
- **Recommended fix:** Decide TBD-11. For MVP, prefer a single public origin with `/api` routed to the Worker (or a controlled same-origin reverse proxy) to avoid cross-origin cookie complexity. If a separate `api.` origin is selected, add a configurable API base, `credentials: 'include'`, exact CORS origin, appropriate cookie `SameSite`/`Secure`/domain settings, preflight support for `Content-Type`, `X-CSRF-Token`, and `Idempotency-Key`, and staging tests for login/CSRF/session/cookies. Never use wildcard CORS with credentials.
- **Acceptance test:** In the chosen staging topology, login sets a cookie, the admin mutation succeeds with CSRF, logout clears it, preflight passes, a disallowed origin is rejected, and the browser network trace shows the expected origin/cookie behavior.
- **Change classes:** **frontend**, **API/CORS contract**, **configuration**, **infrastructure**; no schema.
- **Owner decision:** **Yes — TBD-11/C2.** This report does not select the origin/topology.

#### P3-13 — Public and admin error/loading states are not truthful

- **Issue:** The UI conflates loading, empty, and failure states. Product list shows “Katalog produk segera hadir.” while data is still loading; detail pages show “tidak ditemukan” for any error; WhatsApp settings failure becomes “segera hadir”; admin login maps every failure to bad credentials; list refresh maps 401 to a generic load failure; the API client discards the stable error code.
- **Evidence:**
  - `frontend/src/pages/public.tsx:8-16` returns `data=null` and `error=false` during loading.
  - `frontend/src/pages/public.tsx:330-332` renders the empty message for null/false; detail pages at `:354`, `:422`, `:513` treat any failure as not found.
  - `frontend/src/components/Layout.tsx:17-26` catches settings failure as `null`, then `:38-44` renders “segera hadir.”
  - `frontend/src/admin/cms.tsx:120-131` catches every login failure as “Email atau kata sandi salah.”
  - `frontend/src/admin/cms.tsx:644-655` maps list failure to a generic message; only some mutations map session expiry.
  - `frontend/src/api.ts:12-16` keeps only `message_id`, discarding `error.code` and status semantics beyond `status`.
- **Status:** **VERIFIED source.**
- **Impact / severity:** **MEDIUM.** Users and the owner are misled about outages, empty catalogs, and credential problems; operational diagnosis is harder; it violates D-36’s truthfulness intent.
- **Environment blocker:** Local: **partial**. Staging: **partial**. Production: **yes for UX honesty/operability**.
- **Dependencies:** P3-07, P3-14, P3-21, C1.
- **Recommended fix:** Model `loading | error | empty | data` explicitly; render distinct messages; map 401/403/429/5xx/network to accurate Indonesian messages; preserve `error.code` in the client error; make detail “not found” only for an actual 404; load settings once at layout level and show a non-deceptive unavailable/retry state; keep button-disabled guards but do not present them as backend idempotency.
- **Acceptance test:** Delayed API shows loading, not empty; 500 shows an error, not “not found”; 401 shows session expired; 429 shows rate-limit messaging; missing WhatsApp config shows an honest unavailable state; a 404 detail shows not found; tests intercept each status.
- **Change classes:** **frontend**, **API client error contract**; no schema or backend behavior change.
- **Owner decision:** **Yes for C1**; no new policy.

#### P3-14 — Pricing dead field, misleading restore copy, status notice, and dashboard fan-out

- **Issue:** Pricing description is not in the writable allowlist, so the admin form cannot persist it; delete copy promises recovery although no restore endpoint exists; the create success notice always says “draft” even when the selected status is published; the dashboard performs 24 list calls and creates race/partial-count behavior.
- **Evidence:** `frontend/src/admin/cms.tsx:713-715` sends `description_id`, but the pricing create schema (`backend/src/routes/admin.ts:68-75`) and writable allowlist (`backend/src/repo/content.ts:15`) omit it; delete copy says data “dapat dipulihkan” (`cms.tsx:773`) with no restore route; create success always says “draft” (`cms.tsx:742`) even when published; `frontend/src/admin/cms.tsx:270-302` fans out 24 list calls.
- **Status:** **VERIFIED source.**
- **Impact / severity:** **MEDIUM.** Admin edits can silently fail; operators may believe restore is available when it is not; success messaging can contradict the chosen status; dashboard counts can be inconsistent and slow.
- **Environment blocker:** Local: **partial**. Staging: **partial**. Production: **yes for admin correctness**.
- **Dependencies:** P3-13, P3-15, A2 (restore API), D-44 follow-up.
- **Recommended fix:** Decide whether pricing description is a supported field; if yes, add it to the schema/API allowlist and form, otherwise remove the dead field. Implement restore as an explicit owner-approved endpoint/action before showing restore copy. Make the success notice reflect the actual saved status. Replace dashboard fan-out with an aggregate endpoint or bounded parallel calls with cancellation and error aggregation.
- **Acceptance test:** Editing every visible field round-trips or the field is removed; restore is either functional and audited or absent from the UI; the success notice matches the actual status; dashboard counts are consistent and within the request budget.
- **Change classes:** **frontend**, **API contract**, **schema** if the pricing field is adopted; restore uses existing soft-delete state but needs API; no new dependency.
- **Owner decision:** **Yes** for A2 restore and the pricing-field contract; dashboard aggregate is a D-44 follow-up.

---

### 2.6 Workstream 5 — Dependencies and test coverage

#### P3-09 — Remaining advisories and no upgrade decision

- **Issue:** Advisories remain in the dependency tree: `tinypool@1.1.1` has 2 critical advisories; `vitest@3.2.7` and `@vitest/mocker@3.2.7` have 2 moderate advisories; `react-router@6.30.6` has 2 moderate advisories. No upgrade or dated deferral is recorded. `npm audit` timed out, so applicability was verified via OSV.
- **Evidence:** Phase 3 dependency evidence; `backend/package.json:22` uses Vitest `^3.1.1` (resolved 3.2.7); `frontend/package.json:14` uses `react-router-dom ^6.26.2` (resolved 6.30.6); no decision record upgrades or defers them.
- **Status:** **VERIFIED advisory applicability**; exact exploitability in this app is **not demonstrated**.
- **Impact / severity:** **HIGH** under the Phase 3 rating because vulnerable dev/test tooling and a routing dependency are part of the verified tree. The critical advisories are in a transitive test tool, not necessarily shipped to production, but that distinction must be deliberate.
- **Environment blocker:** Local: no. Staging: no direct. Production: **no direct** if the vulnerable packages are absent from the Worker bundle; this must be proven.
- **Dependencies:** B1/B2, P3-21, P3-01 (bundle inspection).
- **Recommended fix:** B1: upgrade Vitest to **4.1.12** (the smallest fix path identified in Phase 3; it removes `tinypool`) and rerun the 27 tests. B2: approve React Router **7.18.0** or record a dated deferral with compensating controls. Verify the production bundle does not contain dev-only vulnerable packages. Re-run an advisory check after the upgrade.
- **Acceptance test:** `npm audit`/OSV shows no unresolved critical/high advisories in the chosen scope; backend tests pass after B1; frontend build/routing tests pass after B2; a bundle inspection confirms dev-only packages are not deployed; a dated deferral exists if any advisory remains.
- **Change classes:** **dependency**, **lockfile**, **test/tooling**; no schema or application API.
- **Owner decision:** **Yes — B1 and B2.** If B2 is not approved, a dated deferral must be recorded; this report does not authorize the upgrade.

#### P3-21 — Test suite lacks D1, concurrency, backup/restore, retention, and failure coverage

- **Issue:** The 27 backend tests are meaningful but use in-memory SQLite only. They do not cover real D1, multi-isolate races, crash/partial-write behavior, backup/restore, retention/purge, CSP/headers at the host, frontend error states, or idempotency. Playwright is cited from R3 but not part of the backend suite and was not rerun in Phase 3A.
- **Evidence:** `backend/test/helpers.ts:17-27` creates an in-memory SQLite adapter; `backend/test/demo.test.ts` uses a structural D1 stub; test files cover auth, contracts, inquiry, repo, and a demo; no D1/staging/backup/retention tests; Phase 3 records the covered/uncovered matrix.
- **Status:** **VERIFIED counts and gaps.**
- **Impact / severity:** **MEDIUM.** Green local tests can coexist with a red deployment; regressions in the exact areas that gate production would not be caught.
- **Environment blocker:** Local: no. Staging: **yes for acceptance**. Production: **yes for release confidence**.
- **Dependencies:** all workstreams; B1; D4.
- **Recommended fix:** Add a real-D1 staging contract suite; concurrency/crash/idempotency tests; backup/restore and retention drills; header/CORS/cookie tests; frontend status-state tests; CI that runs the appropriate tiers. Keep unit tests fast and mark staging tests explicitly.
- **Acceptance test:** The idempotency matrix in §4 passes at the required environment tiers; a staged D1 failure/rollback test passes; backup/restore and retention drills have recorded evidence; CI blocks on the critical suites.
- **Change classes:** **tests**, **CI**, **infrastructure**; no product schema by itself.
- **Owner decision:** **Yes** as part of A1/A2/C1/D4 approvals; testing does not imply deployment approval.

---

### 2.7 Cross-finding observations

1. **A green local suite is not evidence of a deployable system.** The D1 adapter stub and the absent Worker entry are the main reasons.
2. **The most dangerous issue is not a single bug but the interaction of no-op transactions, multi-step writes, and future idempotency.** A generic idempotency table built on `transaction()` as it exists today would create false confidence.
3. **Security controls are local semantics.** Spoofable IPs and per-isolate buckets become more dangerous precisely when the app moves to Workers.
4. **Privacy and recovery are policy-dependent.** They cannot be closed by code alone; TBD-09/TBD-14 remain owner gates.
5. **The frontend is sufficiently complete for continued integration, but its truthfulness and origin assumptions must be fixed before a real deployment.** This aligns with the recorded owner view; it does not mark R3 accepted.

---

## 3. Idempotency design proposal (no implementation)

### 3.1 Definitions and limits

**HTTP request idempotency** means that repeating the *same logical request* with the same idempotency key and same business payload produces the same observable outcome and **at most one state change**, even if the first response was lost, the client retried, or two requests raced.

It is not the same as:

| Mechanism | What it actually guarantees | Why it is not enough |
|---|---|---|
| Disabled submit button / `saving` flag | Prevents a second click in one mounted component while the first request is in flight | Lost response, refresh, second tab, browser retry, direct HTTP client, or a crash bypasses it. |
| `UNIQUE` slug or one-active-admin index | Prevents a duplicate row for that natural key | It does not replay the original response; it often turns a retry into a 409; it does not cover operations without a natural key. |
| Rate limiting / CSRF / auth | Reduces abuse and enforces authorization | They do not deduplicate a legitimate retry. |
| HTTP `PUT`/`DELETE` semantics | Repeating the intended state is generally safe | The server may still return 404 on the second call, append duplicate audit/history rows, or rewrite timestamps. |
| “Best effort” duplicate search | Heuristically reduces near-duplicates | Not a contract; it can miss or falsely merge distinct requests. |

Phase 2D-R3’s Playwright evidence includes a forced second click on a delayed create and observes **exactly one create request**. That is good **client double-submit prevention**, not backend idempotency: a network retry, a second tab, a refreshed page, a different client, or a lost response can still deliver a second request.

**Exactly-once execution across a crash boundary is not promised.** The achievable target is:

1. **at-most-once state change** for the protected write; and
2. **replay of the original outcome** where a durable record or natural key permits it; and
3. **explicit “in doubt” behavior** where the process cannot know whether an external side effect committed.

For external side effects, the correct pattern is an **outbox/queue plus an idempotent consumer/provider key**, not a synchronous exactly-once claim.

### 3.2 What exists today: operation inventory

| Operation | Duplicate risk | Existing guard | Backend idempotency today | Required treatment |
|---|---|---|---|---|
| `POST /api/v1/inquiries` | Duplicate lead, duplicate follow-up, inflated metrics | 5/hour inquiry limiter; honeypot; validation; no request key; no unique business key | **None** | **Required**: client key stored atomically with the lead. |
| `POST /api/v1/admin/{services,products,portfolio,articles,pricing}` | Duplicate content; duplicate audit | Auth + CSRF; unique `slug`; server-generated id | **Partial natural-key only**; retry typically returns 409, not the original 201 | Duplicate effect is already prevented for the same slug. Exact replay/key semantics optional; add a generic key only if the owner requires retry-as-success. |
| `POST /api/v1/admin/auth/bootstrap` | Duplicate admin or partial admin/session/audit | Body token; one-active-admin partial unique index; bootstrap limiter | **No duplicate admin** under the unique index; retry after success returns 403 and token is not durably consumed | **Atomic one-time claim** and token-consumption design; a generic idempotency key is the wrong abstraction. |
| `POST /api/v1/admin/auth/login` | Multiple valid sessions; duplicate audit/last-login writes | Login limiter; password verification | **None** | Not a classic idempotent business operation; define session policy (revoke prior sessions or allow multiple) and audit semantics. |
| `POST /api/v1/admin/auth/logout` | No duplicate business effect | Session revocation | **Effect idempotent, response may be 401 on retry** | Make retry behavior consistent; no key. |
| `PATCH /api/v1/admin/{module}/:id` | Audit/history duplicates; `published_at` rewrite; lost update | Auth + CSRF; field allowlist | **State-style partial** | Conditional update/optimistic concurrency; no key by default. |
| `DELETE /api/v1/admin/{module}/:id` | No duplicate deletion; audit duplicates; second response 404 | Soft delete via `deleted_at` | **No duplicate effect** | Define repeat response; no key. |
| `PATCH /api/v1/admin/leads/:id` | Audit/handled-at duplicates; state is safe to repeat | Auth + CSRF | **State-style** | Idempotent state transition; no key. |
| `DELETE /api/v1/admin/leads/:id` | No duplicate deletion | Soft delete | **No duplicate effect** | Define repeat response; no key. |
| `PUT /api/v1/admin/settings` | Setting upsert is safe; history/audit duplicates | Auth + CSRF | **State-style** | Upsert + history/audit atomicity; optional key only if exactly-once history is required. |
| Future email/WhatsApp notification, webhook, payment, export, file upload | Duplicate external effect | None | **None** | **Required before enabling**: key/outbox + provider idempotency; never send inside an HTTP request without a durable record. |

### 3.3 Transport, key, scope, fingerprint, and retention

#### 3.3.1 Transport

Use an `Idempotency-Key` request header for protected writes. It is explicit, works for JSON APIs, is easy to test, and avoids mixing a control field into the business payload.

- Generate a high-entropy value client-side per logical operation, preferably `crypto.randomUUID()`.
- Accept 16–128 visible ASCII characters; hash the raw value with SHA-256 before storage.
- Never log the raw key; treat it as an operational identifier, not a secret.
- Do **not** accept the key in a query string (it leaks into logs/referrers).
- For the public inquiry, the browser can send the header; the API CORS allowlist must include `Idempotency-Key` **if** the deployed topology is cross-origin. Same-origin needs no CORS change.
- A request without a key is a legacy/non-idempotent request. The rollout policy must decide whether it is accepted temporarily or rejected; it must not be described as idempotent.

#### 3.3.2 Scope and authorization

| Caller | Scope key | Actor binding | Notes |
|---|---|---|---|
| Public inquiry | `public:inquiry` | `anonymous` | The key is not an authorization credential. Anyone can generate one; the payload fingerprint prevents replay of a different payload. Do not bind to IP (mobile networks change) or to a session that may not exist. |
| Admin | `admin` | `admin_users.id` (not session ID) | A retry after re-login may still replay for the same admin. If the admin is deactivated, authorization fails before replay. Do not scope by CSRF token, which rotates. |
| Future tenant/multi-user | `tenant:<id>:<operation>` | actor id + tenant id | Never share keys across tenants. The current single-admin MVP must not hard-code a global scope that blocks this extension. |

Authorization and CSRF are checked **before** the idempotency lookup. A replay must never bypass authentication, CSRF, account status, or authorization. A key held by one actor must not be able to read another actor’s response; the unique scope includes the actor, and the response body must contain only data that actor is allowed to see.

#### 3.3.3 Payload fingerprint

The fingerprint is a SHA-256 of a canonical representation of the validated business request.

- Canonicalize objects with sorted keys and stable JSON encoding; preserve array order (array order is semantic unless a field is explicitly normalized).
- Use the **validated/normalized** payload, not the raw bytes: trims, defaults, and coercion are applied first, otherwise semantically identical retries would conflict.
- Include: method, operation/path template, target resource id for updates/deletes, and all business fields that affect the result.
- Exclude: the `Idempotency-Key` itself, cookies, CSRF token, `Authorization`, request ID, timestamps, client IP, user agent, and volatile referrer/`source_page` values. If `source_page` is stored, retain the first value but do not make it a conflict condition.
- Store only the hash, not the request body. Inquiry bodies contain personal data; there is no reason to duplicate them in an idempotency record.
- Same key + same fingerprint = replay. Same key + different fingerprint = conflict, with no execution.

#### 3.3.4 Retention

Retention is a product/security decision, not a default to invent. Proposed starting points for owner review:

- Public inquiry: retain the request key as long as the lead is retained (if stored on the lead) or a separate 24-hour window (if using a key table). The lead-based approach is recommended because it keeps dedupe and the record lifecycle aligned.
- Admin creates: 24 hours is likely enough for browser retries, but the owner may choose 7 days.
- Future side effects: at least the provider’s retry window and the incident-investigation window; owner decision.

After the retention window, the guarantee ends. A key may be purged and later reused; that can create a new effect. The API must document this and clients must generate a new key per operation. For the recommended lead-column design, the key naturally disappears when the lead is hard-purged under TBD-09, which is acceptable **only if** the retention period is documented as the end of idempotency protection.

#### 3.3.5 Behavior matrix

| Existing key state | Fingerprint | Action | Response |
|---|---|---|---|
| Absent | — | Execute the operation; persist key/completed outcome atomically | Original success status |
| `completed` | Same | Do not execute; replay stored outcome/resource identity | Original status + `Idempotent-Replayed: true` |
| `completed` | Different | Do not execute | `409 IDEMPOTENCY_CONFLICT` |
| `in_progress` | Same | Do not execute; advise a bounded retry | `409 IDEMPOTENCY_IN_PROGRESS` + `Retry-After` |
| `in_progress` | Different | Do not execute | `409 IDEMPOTENCY_CONFLICT` |
| `failed` (known pre-commit failure) | Same | Allow a retry to execute | Normal result of the retry |
| `in_doubt` (crash/ambiguous commit) | Any | Do not blindly re-execute; reconcile by resource/natural key | `409 IDEMPOTENCY_IN_DOUBT` unless reconciliation proves the outcome |
| Expired but not purged | Any | Do not process as if new while the record is visible | `409 IDEMPOTENCY_EXPIRED`; client uses a new key |
| Purged | — | Treated as a new request | New effect possible; guarantee ended |

These error codes are **proposed API contract additions**; they do not exist in `shared/src/index.ts` today. Adding them is an API contract change, not a schema change.

### 3.4 Recommended design by operation

#### 3.4.1 Public inquiry — required, atomic single-row design

This is the strongest near-term design because it does not depend on interactive transactions or a generic reservation table.

Proposed future columns on `leads` (not created in this phase):

```sql
client_request_id_hash TEXT,   -- SHA-256 of the Idempotency-Key; NULL for legacy/admin-created rows
request_fingerprint    TEXT,   -- SHA-256 of the canonical validated inquiry payload
```

Plus a unique index on `client_request_id_hash` (a plain unique index is portable because SQLite permits multiple NULLs in a unique index).

Flow:

1. Authenticate nothing (public), apply origin/abuse checks, normalize/trim the raw inquiry fields, then parse/validate the normalized values (so whitespace-only input is rejected before storage).
2. Require or accept the `Idempotency-Key` according to the approved rollout policy; hash it and compute the fingerprint.
3. Attempt one `INSERT` into `leads` containing the lead fields, `client_request_id_hash`, and `request_fingerprint`.
4. If the insert succeeds, return `201` with the lead id and state. The insert is atomic on both SQLite and D1; there is no partial key/lead state.
5. If the insert fails with the unique-key constraint, select the row by hash:
   - same fingerprint → return the original success identity (`200` or the original `201` with a replay marker); no new lead;
   - different fingerprint → `409 IDEMPOTENCY_CONFLICT`; no new lead;
   - row soft-deleted → return a documented `409`/`410` (do not silently resurrect or claim a live success);
   - no row (race/inconsistent) → treat as in doubt and return `409 IDEMPOTENCY_IN_DOUBT`.
6. A lost response is recovered by the same insert/conflict/replay path. Concurrent duplicates race on one unique index; one wins.

Why this satisfies the requirements:

| Requirement | Behavior |
|---|---|
| Duplicate risk | At most one lead per key; no duplicate follow-up. |
| Key scope | Public operation; key hash globally unique for inquiry; fingerprint prevents payload substitution. |
| Storage | On the lead row; no separate PII body. |
| Retention | Same as the lead retention/purge policy (TBD-09); explicitly documented. |
| Same key/same payload | Replay the lead id/state. |
| Same key/different payload | 409, zero effect. |
| Concurrency | Unique index + one INSERT; one winner. |
| Crash/retry | Insert is atomic; retry either inserts or replays. |
| Authorization | Key is not auth; origin/rate limit/validation still apply; no PII returned beyond the created lead’s id/state. |
| Current abstraction | **Feasible** with schema + unique constraint; no `transaction()` needed. |

Caveat: if the owner insists on a separate idempotency table for all endpoints, the inquiry insert and key insert need a D1 atomic batch; that is a larger prerequisite. The lead-column design is deliberately narrower and safer.

#### 3.4.2 CMS creates — natural uniqueness is sufficient for duplicate-effect safety; exact replay is optional

`POST /admin/{module}` already has a unique `slug` (`backend/db/migrations/0001_init.sql`, `UNIQUE` on each editorial table). For the same payload/slug:

- first request: create row, return 201;
- retry after a lost response: unique conflict → `409 CONFLICT` (“slug already exists”);
- effect: **one row**; no duplicate content.

That is **duplicate-effect-safe for the same slug**, but it is not a replay of the original 201. Limitation: if the user changes the slug (or the client sends a different payload) after a lost response, the unique slug no longer identifies the same logical request and a second row can be created. A key would make that retry conflict rather than create; whether that UX is required is an owner decision. The owner has two valid choices:

1. **Recommended near-term:** Keep the unique slug as the duplicate guard, improve the UI to explain that a failed response may already have created the item and offer a safe edit/open action, and do not add a generic key solely for CMS create. This avoids a schema/port dependency and does not pretend retries are idempotent.
2. **Optional exact-replay tier:** Add `Idempotency-Key` support with a generic table and atomic batch (see §3.6). On same key/same payload, return the original resource id; on different payload, 409. Use this only if the product requires “retry returns 201” semantics or if the content is created by an integration rather than a human who can resolve a 409.

Neither choice permits duplicate content. The difference is response semantics and retry ergonomics.

#### 3.4.3 Bootstrap and recovery — one-time claim, not a generic key

Bootstrap has a different shape:

- Concurrent bootstrap is already narrowed by the one-active-admin partial unique index; two calls cannot both create an active admin.
- The bootstrap token is **not durably consumed**; if the active-admin count later returns to zero through an owner action, the same env token could bootstrap again.
- The admin insert, session insert, and audit insert are separate writes. On D1 today they can partially commit because `transaction()` is a no-op.
- A retry after a lost response normally gets `403` (an admin already exists), not the original session. That is acceptable for duplicate safety but poor for recovery UX.

Recommended design (policy-dependent, TBD-14):

- Treat bootstrap as a **single winner claim** in one atomic batch: create the admin, durably mark the token/claim as consumed, create the session, and write the audit record, or commit none.
- Do not return a replayable raw session token from a key store; never persist raw session tokens. If the response is lost, the operator should log in with the credentials they just set or use the approved recovery path.
- Use a durable `bootstrap_state`/claim record (or an owner-approved equivalent) so a consumed token cannot be reused. This is not the generic idempotency table; it is security state.
- Make the failure response explain “already bootstrapped” consistently, without revealing sensitive state.
- Recovery/password reset is a separate owner-approved flow (TBD-14), not an idempotency-key feature.

#### 3.4.4 Updates, deletes, settings, logout — make the state contract idempotent

These operations do not need a request key for duplicate-effect safety, but their response/audit behavior should be explicit:

- **PATCH content:** apply the requested state; do not rewrite `published_at` if the row is already published; use `updated_at` as an optional optimistic-concurrency precondition (owner/API decision) so a stale editor does not overwrite newer data. Repeated identical PATCH must leave the same business state; audit/history duplication is a separate policy.
- **DELETE content:** soft delete only if `deleted_at IS NULL`; repeated delete may return `404` or a documented `200 {deleted:true}`. Pick one contract and test it. Do not duplicate audit rows if exactly-once audit is required; otherwise document that audit is append-only.
- **PATCH lead state:** state transitions are safe to repeat; avoid changing `handled_at` on an identical state if the contract says it is the first handling time; otherwise document the update.
- **PUT settings:** upsert the key; repeated identical payload leaves the same settings state. If history/audit must be exactly once, use the generic key/atomic batch; otherwise document duplicate history rows.
- **Logout:** revocation is idempotent in effect; a second request may return 401 because the session is gone. Either accept that as the contract or make logout unauthenticated-but-safe and return 204; do not create a new session.

#### 3.4.5 Future side-effecting operations — required before enablement

Do not send email, WhatsApp messages, webhooks, payments, uploads, or exports directly from a request handler without a durable record. The future design should be:

1. In one atomic DB batch, write the business change, an **outbox row**, and the idempotency record (or rely on a natural key).
2. A background/scheduled worker claims the outbox row with a lease.
3. The provider call uses an idempotency key or provider-supported dedupe token.
4. On success, mark the outbox row delivered; on ambiguous failure, retry with the same provider key.
5. Expose an operator-visible dead-letter/in-doubt state.

This gives at-least-once delivery with an idempotent consumer and avoids pretending that an HTTP request can guarantee exactly-once external effects.

### 3.5 Proposed schema changes — future approval only (NOT CREATED)

No schema change is made by Phase 3A. The following are proposals for separate owner approval.

#### Option A (recommended near-term): inquiry key columns on `leads`

```sql
ALTER TABLE leads ADD COLUMN client_request_id_hash TEXT;
ALTER TABLE leads ADD COLUMN request_fingerprint TEXT;
CREATE UNIQUE INDEX idx_leads_client_request
  ON leads(client_request_id_hash);
```

- The unique index permits multiple NULLs, preserving legacy/admin-created leads.
- No request body or raw key is stored.
- The key lifetime follows the lead retention lifecycle (TBD-09).
- No generic idempotency table and no interactive transaction are required for this operation.

#### Option B (generic, for admin exact replay and future side effects): `idempotency_keys`

```sql
CREATE TABLE idempotency_keys (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,               -- public | admin | tenant:<id>
  actor_id TEXT NOT NULL,            -- admin id or 'anonymous'
  key_hash TEXT NOT NULL,            -- SHA-256 of the raw key
  operation TEXT NOT NULL,           -- e.g. POST /api/v1/inquiries
  request_fingerprint TEXT NOT NULL, -- SHA-256 of canonical validated payload
  state TEXT NOT NULL CHECK (state IN ('in_progress','completed','failed','in_doubt')),
  response_status INTEGER,
  response_json TEXT,                -- minimal; never PII/secrets if avoidable
  resource_id TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  expires_at TEXT NOT NULL,
  UNIQUE (scope, actor_id, key_hash)
);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
CREATE INDEX idx_idempotency_state ON idempotency_keys(state, expires_at);
```

This table is **not** sufficient by itself. It requires an atomic batch that writes the key record and the protected effect together. With the current `DbPort` it cannot provide the advertised guarantee on D1.

#### Option C (future): outbox

```sql
CREATE TABLE outbox (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending','processing','delivered','dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL,
  lease_until TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (operation, idempotency_key)
);
```

This is for future external side effects, not current Phase 3 scope.

Other schema candidates that are **not** idempotency tables but affect the same workflows:

- `sessions.last_used_at` (idle timeout/GC) — P3-11.
- audit metadata/request ID/indexes — P3-16.
- `published_at` invariants/taxonomy CHECK — P3-10.
- secondary query indexes — P3-15.
- durable bootstrap claim — P3-05/TBD-14.

### 3.6 What the current database abstraction can and cannot guarantee

| Guarantee | Local SQLite today | D1 today | Required work |
|---|---|---|---|
| At-most-once effect via a natural/unique key | **Yes** | **Likely**, but the app schema/constraints are not tested on real D1 | Validate constraints on isolated D1; for inquiry add the key column/index. |
| One-statement atomic insert + key | **Yes** | **Yes** for a single statement; verify | Lead-column design. |
| Replay a stored key outcome | Not implemented | Not implemented | Schema + repository + response contract. |
| Atomic key reservation + effect | **Yes** via `transaction()` | **No**: `transaction()` is a direct no-op; no `DbPort` batch | Add `atomic`/batch port; prove D1 `batch()` all-or-none; real-D1 tests. |
| Concurrency single-winner across isolates | Local process only | Unique constraints must be proven under real concurrency | D1 staging stress tests. |
| Exactly-once external side effect | **No** | **No** | Outbox + provider idempotency; at-least-once delivery. |
| Key survives process restart | SQLite file yes; in-memory tests no | D1 yes if committed | Persistence test. |
| Retention cleanup | Not implemented | Not implemented | Scheduler/job + index; policy TBD-09. |

**Conclusion:** the current abstraction supports the **inquiry single-row design** after a schema change, and supports natural-key duplicate prevention for CMS creates. It does **not** support a generic reservation-table idempotency guarantee on D1 until the port exposes an atomic batch and that batch is proven on real D1.

### 3.7 Required API/contract additions (proposals, not applied)

- `Idempotency-Key` header in `API.md`, with scope/retention/error semantics.
- New stable error codes: `IDEMPOTENCY_CONFLICT`, `IDEMPOTENCY_IN_PROGRESS`, `IDEMPOTENCY_IN_DOUBT`, `IDEMPOTENCY_EXPIRED` (names may be adjusted by the owner).
- `Idempotent-Replayed: true` response header on a replay.
- CORS `allowHeaders` addition if cross-origin: `Idempotency-Key`.
- Clear contract for missing/invalid key, same-key/different-payload, soft-deleted resource, and retention expiry.
- Frontend behavior: generate one key per logical submission, keep it across retries of that submission, generate a new key only after success or an explicit user restart; show conflict/in-progress/in-doubt messages truthfully. This is a client aid, not the backend guarantee.

### 3.8 Anti-patterns explicitly rejected

- Calling a disabled button “backend idempotency.”
- Using a unique slug as a general request key without defining replay/response semantics.
- Storing raw idempotency keys or request bodies containing lead PII.
- Making an in-memory key cache in a Worker isolate.
- Relying on `D1Adapter.transaction()` as it exists today.
- Returning 200 for a different payload that happened to reuse a key.
- Retrying an ambiguous external side effect blindly.
- Promising exactly-once email/WhatsApp/payment delivery.
- Adding a table and calling the feature “done” without concurrency/crash tests on real D1.

---

## 4. Idempotency acceptance matrix

**Status:** proposed test matrix only. Nothing in this matrix has been implemented or run against real D1.

### 4.1 Environment legend

| Marker | Meaning |
|---|---|
| **L** | Required in local SQLite (unit/integration, in-memory or isolated file). |
| **D** | Required against a **real isolated D1 staging database** (not `piple-spike-d1`, not local D1 simulation). |
| **D (parity)** | D1 must demonstrate the same observable contract as local SQLite. |
| **D (only)** | Local SQLite can provide a useful smoke test, but only real D1 can prove the guarantee (multi-isolate concurrency, batch atomicity, network loss). |
| **—** | Not applicable at that tier. |

Local D1 simulation may be used for fast development feedback, but **never counts as D1 proof**.

### 4.2 Matrix

| ID | Scenario | Expected result | Local SQLite | Real D1 staging |
|---|---|---|---|---|
| **I-T01** | Sequential duplicate inquiry: same key, same payload, twice | Exactly one lead; second response replays the original lead id/status; no second audit/notification | **L** | **D (parity)** |
| **I-T02** | Sequential duplicate CMS create: same key, same payload | One row and one audit; second response is a replay **if the exact-replay tier is implemented**; otherwise a documented 409 with no second row | **L** | **D (parity)** |
| **I-T03** | Same key, different payload (inquiry or admin) | `409 IDEMPOTENCY_CONFLICT`; zero new effects; no PII/response data leak; key is not “upgraded” to the new payload | **L** | **D (parity)** |
| **I-T04** | Two concurrent requests, same key + same payload | Exactly one effect; one request succeeds; the loser gets a replay, or `409 IDEMPOTENCY_IN_PROGRESS` and then replays after completion; never two effects | **L** (thread/process where possible) | **D (only)** |
| **I-T05** | Ten concurrent requests, same key + same payload | Exactly one effect; at most one success response with the resource id; all others are replay/in-progress/conflict deterministically; no orphan key state | **L** (best effort) | **D (only)** |
| **I-T06** | Concurrent requests, same key, two different payloads | One payload wins at most once; all conflicting requests get 409; the key never executes twice | **L** | **D (only)** |
| **I-T07** | Lost response after commit (client times out, server committed) | Retry with the same key returns the original outcome; no second effect | **L** (fault-injected client) | **D (only)** |
| **I-T08** | Failure before commit (validation/DB error before the effect) | No effect; retry with the same key may execute successfully; no “completed” record is fabricated | **L** | **D (parity)** |
| **I-T09** | Crash/exception after the effect but before a response or key completion | Design must guarantee no partial state: for single-statement inquiry, retry replays; for batch operations, the batch is all-or-none; otherwise `409 IDEMPOTENCY_IN_DOUBT` and no blind retry | **L** (simulated) | **D (only)** |
| **I-T10** | Expired key while the record is still visible | `409 IDEMPOTENCY_EXPIRED`; client must use a new key; no silent duplicate | **L** | **D (parity)** |
| **I-T11** | Retention/purge removes the key but leaves the business record | A later reuse of the old key is a new request and may create a new effect; this limitation is documented; purge is idempotent and audited without retaining deleted PII | **L** | **D (parity)** |
| **I-T12** | Missing/invalid session or CSRF on an admin request with a key | `401`/`403` before any key lookup or replay; zero effects; no key record created; no cross-actor disclosure | **L** | **D (parity)** |
| **I-T13** | Same key used by two actors/tenants (future multi-admin/tenant) | Separate scopes; no collision or cross-tenant replay; if global scope is chosen, the second actor gets a conflict, never another actor’s response | **L** | **D (parity)** |
| **I-T14** | Replay after the admin is deactivated/session revoked | Authorization fails; no replay data is returned; no state change | **L** | **D (parity)** |
| **I-T15** | Public key is not an authorization credential | A different payload with the same key is 409; the response reveals no other lead’s PII; a valid key cannot list/read leads | **L** | **D (parity)** |
| **I-T16** | Normal-flow regression: create, edit, publish, unpublish, soft delete, restore (if approved), leads state, settings | Existing behavior remains correct; no new required key on unrelated endpoints; status codes/messages match the approved contract | **L** | **D (parity)** |
| **I-T17** | Unique slug conflict without an idempotency key | `409 CONFLICT`; one row; no idempotency record; UI can safely resolve; retry with a new key still cannot duplicate the slug | **L** | **D (parity)** |
| **I-T18** | Settings PUT retry: same key/payload | Same settings state; if history/audit is in the atomic batch, exactly one history/audit row; if not, duplicate append-only history is explicitly documented | **L** | **D (parity)** |
| **I-T19** | Lead state PATCH retry: same key/payload | Same state; no duplicate state transition; audit/handled-at semantics match the chosen contract | **L** | **D (parity)** |
| **I-T20** | Process restart / Worker cold start between attempts | A committed key/effect survives; replay works after restart; an in-memory cache would fail this test | **L** (file DB) | **D (only)** |
| **I-T21** | D1 batch partial failure | A deliberately failing second statement leaves zero changes (or the documented all-or-none behavior); no key row without effect, no effect without key row | **—** | **D (only)** |
| **I-T22** | Rate-limit interaction | Limiters still apply; a replay cannot be used to bypass abuse limits; a rate-limited retry returns a truthful 429, not a fake success | **L** | **D (parity)** |
| **I-T23** | Missing or malformed `Idempotency-Key` | Contract is explicit: transitional optional mode processes without guarantee; required mode returns a stable 400; malformed/oversized key is rejected | **L** | **D (parity)** |
| **I-T24** | Soft-delete/hard-purge interaction | Replay of a soft-deleted resource does not resurrect it or claim a live success; after hard purge, the key is gone and the documented limitation applies | **L** | **D (parity)** |
| **I-T25** | Duplicate notification/outbox delivery (future) | Provider idempotency/outbox prevents a second externally visible message; an ambiguous provider failure is retried with the same provider key and ends in a dead-letter state if unresolved | **—** | **D (only)** |
| **I-T26** | Bootstrap concurrent/replay: two requests race with the token; a retry follows a lost response | Exactly one active admin; the token is durably consumed; admin/session/audit either all commit or none; a replay cannot create a second admin or return a raw session token | **L** | **D (only)** |
| **I-T27** | Recovery/reset token replay (future TBD-14) | The recovery token is single-use; old sessions are revoked per policy; replay does not reset the password twice or create a second session; every step is audited without credentials | **L** | **D (only)** |

### 4.3 Required real-D1 cases (minimum gate)

Before any staging approval that includes idempotency, the following **must** be run against a dedicated isolated staging D1 (never `piple-spike-d1`):

1. **I-T04/I-T05/I-T06** — true concurrent requests from independent Worker isolates.
2. **I-T07/I-T09/I-T21** — lost response, crash window, and batch rollback.
3. **I-T26/I-T27** — bootstrap/recovery token replay and atomicity (I-T27 only once TBD-14 recovery is in scope).
4. **I-T20** — persistence across restart/cold start.
5. **I-T25** — only if external side effects are enabled; otherwise record as deferred.

### 4.4 Test instrumentation requirements

- Unique test keys per case; never reuse a key across test cases except where the case is explicitly about reuse.
- Seed a known lead/content row and assert both row count and audit/history count.
- Inject response loss and DB failure at named points, not by sleeping.
- Assert no raw key, request body, password, session token, or PII appears in logs/idempotency rows.
- Capture the real D1 request/response metadata (`meta.changes`, error shape) for the adapter contract tests.
- Run D1 tests against a disposable staging database; do not point tests at production or the historical spike.

---

## 5. SQLite / Cloudflare Workers + D1 architecture assessment

### 5.1 Separate the four questions

The phrase “SQLite + Cloudflare” hides four different claims. They must not be treated as one approval.

| Layer | Current status | Evidence | Verdict |
|---|---|---|---|
| **A. SQLite as the data model/engine direction** | Consistent with approved design direction (D-08/D-17/D-18/D-23) | `ARCHITECTURE.md` §1, `DATABASE.md` §1, `PERSISTENCE-DECISION.md` | Direction consistent; **not** new approval for implementation or schema changes. |
| **B. Local SQLite implementation** | Implemented and locally tested | `backend/src/db/sqlite.ts`, `dev.ts`, `migrate.ts`, 27 tests | Green for local development, with Node-version and migration caveats. |
| **C. Application D1 adapter and session storage** | Stub/partial; no real application D1 evidence | `backend/src/db/d1.ts`, `backend/test/demo.test.ts`, D-18 design only | **Not ready** for staging. |
| **D. Workers topology/deployment** | Absent | No Worker entry/application Wrangler config | **Not ready**; production blocked. |

The owner preference for SQLite and eventual Cloudflare deployment is compatible with this separation, but it does **not** authorize changing the persistence implementation, creating resources, or skipping the D1 proof.

### 5.2 What “SQLite” means here

- Local development uses **`node:sqlite`**, a synchronous Node embedded database opened on a file or `:memory:`. See `backend/src/db/sqlite.ts:1-2`.
- D1 is a **managed, SQLite-compatible database** accessed asynchronously through a Workers binding (`env.DB`). It is not the local database file, not a Node driver, and not accessible from a Worker through `node:sqlite`.
- The same SQL dialect does not imply the same runtime behavior: transactions, errors, limits, replication, migrations, and concurrency differ.
- Tests must not touch D1; the design says ephemeral SQLite for unit tests and a separate real-D1 staging suite for integration.

**Test SQLite isolation today:**

- Backend Vitest creates a fresh `:memory:` database and applies migrations for each test app (`backend/test/helpers.ts:17-27`). This isolates unit tests from `dev.db` and from each other.
- Playwright uses a fresh, gitignored `backend/e2e.db` with a separate backend process and `--workers=1`; it was **not** rerun in Phase 3A because it writes that file.
- There is no isolated multi-process/file-backed test tier for migration crash/concurrency behavior. In-memory tests cannot prove cross-process locking, WAL behavior, or restart persistence; those need a disposable file-backed SQLite suite and, for D1 parity, real staging D1.

### 5.3 Adapter readiness

| Adapter concern | Local SQLite | D1 | Assessment |
|---|---|---|---|
| Query API | `all/get/run/execScript/transaction` implemented | `all/get/run/execScript/transaction` implemented against a structural binding | Partial; D1 path structurally plausible but not application-proven. |
| Driver | `node:sqlite` `DatabaseSync` | `D1Database` binding | Different runtime; no shared driver. |
| `transaction()` | `BEGIN IMMEDIATE`/commit/rollback | **Directly executes `fn()`; no transaction** | **Unsafe for multi-step invariants on D1.** `backend/src/db/d1.ts:31-38`. |
| Batch | Not exposed | D1 supports `batch()` per Cloudflare docs; the adapter uses it only inside `execScript()`, and `DbPort` has no batch method | Missing abstraction; repositories cannot request an atomic multi-statement write. |
| `execScript()` | Works for local migration/test setup | Splits SQL on semicolons; not a migration parser; can break comments/strings | Should not be used by a Worker for migrations. |
| Constraints/error shape | SQLite errors mapped through `mapDbError` | D1 error wrapper shape is not proven; `meta.changes` handling is untested on real D1 | Must be validated on isolated D1. |
| Types | `DatabaseSync` types | Structural `D1Database/D1Prepared` in `backend/src/db/types.ts`, no `@cloudflare/workers-types` | Compile-time safety is limited; a real binding test is required. |
| Sessions/reads | Local table | Same SQL shape; no adapter-specific session/replication handling | Design only; D-18 implementation pending. |
| Migrations | Custom `schema_migrations` runner | Wrangler journal; no app runner | Two journals; must not be conflated. |
| Persistence | File database | D1 managed storage | Different backup/restore and lifecycle. |

The adapter comment itself says “D1 has no interactive transactions over the binding — executes directly.” That comment is honest, but `transaction()` silently returning the callback result can mislead callers into believing the write is atomic. It should fail loudly until an atomic primitive exists.

### 5.4 Transactions and multi-step invariants

Current multi-step write patterns include:

- bootstrap: admin insert + session insert + audit;
- content create/update: row write + history/audit;
- settings update: setting write + history/audit;
- leads state/delete: row update + audit;
- future idempotency: key record + effect.

On local SQLite, `transaction()` could provide atomicity, but the current sequences do not use it; on D1, each `run()` is a separate statement/round trip and `transaction()` is a no-op. None of the current multi-step sequences calls `transaction()` on either adapter, so the partial-commit risk would be real on D1 and remains possible locally. A failure between statements can leave partial state.

**D1 atomicity options (must be verified, not assumed):**

1. **D1 `batch()`** — documented by Cloudflare as atomic for the batch; use it for a fixed set of statements. It cannot interleave reads with JavaScript between statements.
2. **Single-statement invariants** — for inquiry, put the request key on the lead and use one `INSERT` with a unique index. This is the safest near-term path.
3. **D1 Procedures / newer `db.transaction()` capability** — Cloudflare documentation/search results in 2026 indicate newer procedure-based transaction capabilities may exist in some configurations. This repository does not configure them, and they must be separately verified against the chosen plan/runtime; do not assume they are available.

**Architectural requirement:** extend `DbPort` with an explicit `atomic`/batch contract only if it can be implemented honestly on both adapters. SQLite can use `BEGIN IMMEDIATE`; D1 must use `batch()` and prove all-or-none. Until then, `D1Adapter.transaction()` must throw or be removed, and repositories must use single-statement or explicitly documented non-atomic behavior.

### 5.5 Migrations and schema portability

- `backend/db/migrations/0001_init.sql` uses portable SQLite/D1 constructs: `TEXT` primary keys, `CHECK` constraints, partial unique indexes, and `TEXT` timestamps. The Phase 3 spike proved a smaller three-table schema; it did **not** apply this full application schema to D1.
- Local `migrate()` reads files from disk, executes them, then writes `schema_migrations` (`backend/src/db/migrate.ts:8-19`). It is not atomic and has no checksum (P3-12).
- Production D1 uses Wrangler’s migration journal (`wrangler d1 migrations apply` per the design); the local `schema_migrations` table is a separate journal. A migration applied locally is not proof that it was applied remotely.
- There is no application Wrangler migration directory/config and no evidence of applying `0001_init.sql` to an isolated staging D1 for this app.
- The app schema uses constraints/indexes not covered by the spike: `one_active_admin` partial unique index, content checks, `leads`, sessions, audit, settings history. These need real-D1 validation.
- Migration changes must be forward-only and paired with a compensating plan. No production migration is authorized.

### 5.6 Concurrency and consistency

- **Local SQLite:** `BEGIN IMMEDIATE` serializes writers in one process; tests can exercise races with multiple connections/processes but the local semantics differ from D1.
- **D1:** writes are managed by the platform; unique constraints can provide single-winner effects, but the application has no retry/backoff policy for `SQLITE_BUSY`/overloaded/transient errors. The D1 adapter does not classify retryable errors.
- **Bootstrap:** relies on the one-active-admin index, which is good; but the admin/session/audit writes are not atomic, and the token is not durably consumed.
- **CMS create:** unique slug provides duplicate-effect safety; it does not handle a lost response as a success.
- **Dashboard:** 24 parallel list requests can create inconsistent snapshots; D1 read-after-write/session consistency is not tested.
- **Sessions:** no `last_used_at`, GC, or cross-isolate invalidation beyond the shared table (when D1 is used).
- **Future idempotency:** requires the atomic batch/reservation design; unique constraints alone are not a generic request-replay mechanism.

### 5.7 Sessions, cookies, and frontend reachability

- Local sessions are rows in SQLite with an opaque token; only the SHA-256 hash is stored (`backend/src/http/auth.ts:1-2`, `backend/src/repo/admin.ts`). That design is portable.
- Production session storage on D1 is **design only** (D-18); no application D1 session test exists.
- Cookies: `HttpOnly`, `SameSite` behavior, `Secure`, and CSRF are tested locally; the production topology and HTTPS domain are not decided. `COOKIE_SECURE` defaults false (P3-11).
- Frontend dev uses a Vite proxy (`frontend/vite.config.ts:6-10`). Production uses relative paths with `credentials: 'same-origin'` (`frontend/src/api.ts:1-10`).
- If API and frontend are separate origins, the client must use `credentials: 'include'`, an explicit API base, exact CORS origin, and cookie settings appropriate to the site boundary. The current code does not do this.
- If same-origin routing/reverse proxy is chosen, the current relative-path approach is the simplest and avoids cross-origin cookie/CSRF failure modes, but the actual Cloudflare routing must be configured and tested.
- `docs/API.md` currently proposes `api.<domain>`; `docs/ARCHITECTURE.md` leaves final topology to TBD-11. The implementation is therefore aligned with neither a finalized topology nor the documented example.
- CORS `allowHeaders` currently lists `Content-Type` and `X-CSRF-Token` (`backend/src/app.ts:24`); adding `Idempotency-Key` is required if the chosen topology is cross-origin.

### 5.8 Environment configuration

- Local configuration uses `backend/.env` through `backend/src/config.ts`, reading `node:fs`; `.env` was not read and must remain uncommitted.
- A Worker cannot use that filesystem loader; it must receive secrets via Wrangler/Cloudflare secret bindings and non-secret configuration via vars/environment.
- The application factory already accepts dependencies explicitly (`backend/src/app.ts:10-26`), which is a good seam for a Worker entry; the Node config/dev/migrate modules must stay out of the Worker bundle.
- Required production configuration includes the D1 binding, session/cookie settings, frontend/API origin, bootstrap/recovery controls, and any rate-limit/edge settings. None is provisioned.
- No secret values may be printed, committed, or included in this report.

### 5.9 SQL, type, and runtime differences that matter

| Area | SQLite local | D1 / Workers | Implication |
|---|---|---|---|
| Process | Embedded Node process | V8 isolate + managed DB | No `node:sqlite`, `node:fs`, or local filesystem assumptions. |
| Crypto | `node:crypto` scrypt + timingSafeEqual | Web Crypto or `nodejs_compat`; exact scrypt support unverified | Auth path must be proven or adapted; never assume Node parity. |
| Transactions | Interactive `BEGIN IMMEDIATE` | Standard binding: no interactive transaction; `batch()` atomic; newer procedures unverified | Multi-step writes need a new atomic port or single-statement design. |
| Async | Synchronous driver wrapped in async methods | Fully asynchronous | Error/stack/ordering behavior differs; tests required. |
| Types | `@types/node` / `DatabaseSync` | Structural binding, no generated Worker types | Runtime mismatch can hide until deploy. |
| Constraints | SQLite enforcement, `PRAGMA foreign_keys=ON` locally | D1 FK enforcement/default behavior must be verified for the selected runtime; the app schema currently has no FKs | Future FK behavior must be tested rather than assumed. |
| `PRAGMA` | Full local pragmas | D1 supports a limited set; not a general maintenance path | Do not rely on local pragmas in app SQL. |
| Limits | Local memory/disk | D1 query/batch/bound-parameter/row-size limits; Workers CPU/request limits | Large migrations, dashboards, or payloads need staging measurement. |
| Backups | File copy (not yet automated) | D1 Time Travel/export; no app evidence | RPO/RTO remains unproven. |
| Read replication | None | D1 sessions/read replication may be opt-in; adapter does not use it | Read-after-write and session consistency need explicit testing if replication is enabled. |
| Error shape | Local SQLite error strings | D1 error wrapper/meta changes | `mapDbError` must be validated; avoid leaking provider internals. |

### 5.10 Documentation alignment

| Document | Current claim | Reality | Required alignment |
|---|---|---|---|
| `ARCHITECTURE.md` | “PROPOSED, not implemented”; stack direction | Local backend exists; Worker/D1 do not | Update status only when owner approves documentation changes; preserve historical framing. |
| `DATABASE.md` | Proposal; leads “not created” | `0001_init.sql` creates leads and other CMS tables | Reconcile schema/status; distinguish design vs local implementation. |
| `API.md` | Proposed contracts; `api.<domain>` base | Local endpoints exist; frontend uses same-origin relative paths | Reconcile origin with TBD-11; document implemented contracts. |
| `SECURITY.md` | Requirements/lifecycle plan only | Auth/session/CSRF implemented locally; recovery/retention/headers absent | Mark each requirement implemented/partial/absent. |
| `TESTING.md` | Strategy only | 27 backend tests and R3 Playwright exist; D1/backup/retention absent | Add actual coverage/status and environment tiers. |
| `DEPLOYMENT.md` | Options + operational plan; nothing deployed | Correct: nothing deployed; no Worker config | Keep gates; update after topology decisions. |
| `PERSISTENCE-DECISION.md` | Spike evidence; approved design; implementation pending | Correct direction; TBD-12 remains open | Link to app-level D1 proof; do not treat spike as production. |
| `DECISIONS.md` | D-17/D-18/D-23 design approvals; TBDs open | Design approved; implementation unvalidated | Do not mark implementation complete or resolve TBDs. |

### 5.11 `piple-spike-d1` — historical evidence only

- The spike proved a small SQLite/D1 SQL parity exercise: three tables and a limited seed/CRUD/constraint flow. The Phase 3 audit records the remote spike results, including 11 seed rows.
- It did **not** use the application schema, the application Worker, real sessions, the full constraint set, the auth flow, retention, backups, or concurrency.
- D-23 says separate D1 resources for development, staging, and production; `piple-spike-d1` is spike-only and must never become any of them.
- Phase 3A did not access or query it. No staging/production database exists according to the repository evidence.
- A new isolated staging D1 must be created only with explicit owner approval and must be populated with fake data; it must not reuse the spike.

### 5.12 What must be proven before staging is called ready

Minimum evidence set (D1/D2/D4 as applicable):

1. Worker entry + application Wrangler config + isolated staging D1 binding; no `piple-spike-d1`.
2. Full `0001_init.sql` (and approved follow-ups) applied through Wrangler; migration journal recorded; no local runner in the Worker.
3. Adapter contract suite on real D1: `all/get/run`, `meta.changes`, constraints/errors, batch all-or-none, restart persistence.
4. Session storage on D1: login, CSRF, expiry/GC, revoke-all, cookie behavior, no-store.
5. Atomicity for bootstrap and any multi-step write; `transaction()` no longer silently no-ops.
6. Concurrency: duplicate requests, unique races, overload/transient errors, retry/backoff.
7. Chosen frontend/API topology: same-origin or separate-origin cookies/CORS/CSRF; preflight.
8. Trusted client IP and shared/edge rate limits; body-size limits; no spoofable headers.
9. Security headers on the real host; HSTS only on the HTTPS domain; admin responses not cached.
10. Observability: request IDs, structured logs, health/readiness, metrics/alerts, CI.
11. Backup/restore drill with measured RPO/RTO and integrity checks.
12. Retention/purge policy approved; purge rehearsal on fake staging data where in scope; privacy copy/consent review.
13. Idempotency matrix for the enabled operations, including real-D1 concurrency/crash cases.
14. Rollback/compensating-migration runbook and measured rollback.
15. Bundle inspection: no Node filesystem/sqlite, no secrets, dev-only vulnerable packages not shipped.

### 5.13 External references used for platform claims

These were consulted read-only on 2026-10-22 to avoid relying on memory for platform behavior; they are not repository evidence and do not replace staging tests:

- Cloudflare D1 Database binding: `https://developers.cloudflare.com/d1/worker-api/d1-database/`
- Cloudflare D1 SQL statements/limits: `https://developers.cloudflare.com/d1/sql-api/sql-statements/`
- Cloudflare D1 platform/update material: `https://blog.cloudflare.com/whats-new-with-d1`

The repository-specific claims in this report remain grounded in the cited code and Phase 3 evidence. Any newer D1 transaction/procedure capability must be verified against the selected plan/runtime before it is used.

---

## 6. Revised, dependency-aware implementation sequence

**No step below is authorized by this report.** The sequence preserves the Phase 3 A/B/C/D framing and adds idempotency as a named workstream (I) so it is not lost inside “backend hardening” or “D1 readiness.”

### 6.1 Workstreams

| Workstream | Scope | Schema change? | Owner gate |
|---|---|---|---|
| **A1** | Local backend/security hardening: trusted-IP seam, body limits, validation trim/taxonomy, `published_at`, query-param validation, settings validation, failed-login audit, session GC/config fail-closed, D1 transaction fail-loud, error mapping, low-risk polish | **No** (unless the owner combines A2) | A1 authorization |
| **A2** | Data integrity/tooling: indexes, DB taxonomy CHECK, local migration transaction/checksum, restore/unpublish semantics, public projections/pagination, audit read path, pricing field decision | **Yes** (migration, additive indexes/constraints) | A2 schema approval |
| **A3** | Policy-dependent identity/privacy: TBD-14 recovery/rotation/deactivation/bootstrap consumption, TBD-09 retention/purge, idle sessions/session policy, audit retention, hash versioning | **Likely** (bootstrap claim, session last-used, retention metadata) | TBD-09/TBD-14 + A3 authorization |
| **B1** | Dependency compatibility: Vitest 4.1.12 upgrade, test rerun, advisory recheck, bundle inspection | No | B1 |
| **B2** | React Router 7.18.0 adoption **or** dated deferral with compensating controls | No | B2 / dated deferral |
| **C1** | Frontend truthfulness/error handling: loading/error/empty, status mapping, login/list messages, settings fetch, notices, dashboard states | No | C1 |
| **C2** | Topology/transport: TBD-11, same-origin vs `api.` origin, CORS/cookies/CSRF, security headers at host, env/API base | No | TBD-11/C2 |
| **C3** | Documentation reconciliation: status, implemented vs design, API/security/deployment, TBD preservation | No | C3 |
| **C4** | End-to-end regression on the chosen topology (Playwright + backend), without changing production | No | C4 |
| **I0** | Idempotency decision record: operations, transport, scope, retention, error codes, required/optional, schema optics | No | I0 |
| **I1** | No-schema semantics: make PATCH/DELETE/settings/logout repeat behavior explicit; stop timestamp/audit surprises; document bootstrap token state | No | A1/I1 |
| **I2** | Idempotency schema + atomic port: lead key columns (recommended first), optional generic table, `DbPort.atomic`/batch, migration, tests | **Yes** | I2 schema/port approval |
| **I3** | Local implementation: inquiry key flow, optional admin exact replay, outbox design only if needed; test matrix L-tier | No further schema if I2 approved | I3 |
| **I4** | Real-D1 idempotency proof: concurrency/crash/lost-response/retention/restart tests; D4 evidence | No new schema beyond I2 | D1/D4 |

**D1–D5 scope retained from Phase 3:**

- **D1** — Worker entry, application Wrangler config, isolated staging D1, bindings/secrets, full schema/migration apply, app-level adapter/session smoke.
- **D2** — Edge security/observability: trusted IP, shared/edge rate limits, headers/CSP/HSTS/no-store, structured logs/metrics/alerts, health/readiness, CI.
- **D3** — Backup/restore/rollback program: scheduled copies, restore rehearsal, measured RPO/RTO, integrity checks.
- **D4** — Concurrency, adapter, and idempotency proof on real D1: duplicate races, crash/lost response, batch rollback, restart, retention behavior.
- **D5** — Production readiness/deployment: final gates, domain/DNS/secrets, smoke/rollback decision. Separately authorized.

### 6.2 Dependency order

```text
A1  (local hardening; no schema)
 │
 ├── B1 (dependency upgrade; can run in parallel, before final verification)
 ├── C1 (frontend truthfulness; can run in parallel after contract freeze)
 ├── I0 (idempotency decisions; can start immediately, no code)
 │      └── I1 (repeat semantics; no schema)
 │
 └── A2 (schema/tooling; after A1 and a clean local baseline)
        ├── I2 (idempotency schema/atomic port; after A2 + owner approval)
        │      └── I3 (local implementation/tests)
        └── A3 (policy-dependent; TBD-09/TBD-14)
B1 ──► B2 (React Router or dated deferral)
C1 ──► C2 (topology; TBD-11) ──► C3 (docs) ──► C4 (E2E)
A/B/C/I accepted ──► D1 (Worker + isolated staging D1)
D1 ──► D2 (edge/observability/headers)
D1 ──► D3 (backup/restore/RPO-RTO)
D1 + I3 ──► D4 (concurrency + idempotency + adapter proof)
D1–D4 + C4 + A3 ──► D5 (production readiness/deployment, separately approved)
```

**Critical path:** A1 → A2 → I2 → I3 → D1 → D4 → D5. C1/C2 and B1/B2 can run in parallel where file ownership allows, but no deployment starts before the dependency evidence is accepted.

### 6.3 Recommended order and rationale

1. **A1 first** — reduce local security/validation/config risk without schema churn; make D1’s no-op transaction fail loudly; establish a trustworthy local baseline.
2. **B1 in parallel** — the advisory fix is small and reduces the risk of building on an outdated test tool; rerun the 27 tests before claiming A1 verification.
3. **C1 in parallel or immediately after A1** — truthful loading/error states and correct login/list messages; this is presentation/client behavior and does not require schema.
4. **I0 immediately** — the owner decisions must be recorded before schema work; no code.
5. **A2 after A1** — additive indexes/constraints, migration runner integrity, restore/pagination contracts. Schema changes require separate approval.
6. **I1 with A1, I2 after A2, I3 after I2** — do not create an idempotency table before the atomicity contract is resolved. Lead-column inquiry design can proceed once schema approval exists; generic admin replay waits for the atomic batch.
7. **B2 after B1** — choose React Router 7.18.0 or record a dated deferral; do not leave the decision implicit.
8. **C2 after TBD-11** — choose the origin/topology before building deployment configuration; test cookies/CORS/CSRF in staging.
9. **C3 after contracts stabilize** — docs must describe the chosen topology, implemented features, and pending decisions; do not resolve TBDs.
10. **C4 after C1–C3** — regression on the chosen local/staging topology; do not use it as production proof.
11. **D1–D5 only after A/B/C/I acceptance and explicit resource approval** — Worker, isolated staging D1, edge/security/observability, backup, concurrency/idempotency, and production deployment.

### 6.4 What can be done without schema changes

| Work | Why no schema |
|---|---|
| A1 validation/trim/taxonomy/`published_at` application logic | Uses existing columns and shared schemas; DB CHECK for taxonomy is A2. |
| Body limits, trusted-IP resolver seam, session GC, no-store, failed-login audit, error mapping | Existing tables/routes; indexes for audit are A2. |
| `D1Adapter.transaction()` fail-loud behavior | Internal contract; no schema. |
| I1 repeat-semantics and timestamp/audit policy | Existing state/columns; no key table. |
| B1/B2 dependency upgrades | Manifests/lockfile only. |
| C1/C2/C3/C4 frontend/topology/docs/regression | No schema (C2 infrastructure config). |

### 6.5 What requires a separate schema decision

| Change | Finding/need | Why separate |
|---|---|---|
| Secondary indexes | P3-15/P3-16 | Affects query plans, D1 cost, and migration timing. |
| Taxonomy `CHECK` on `services.slug` (and slug/category consistency) | P3-10 | Could reject existing/probe data; needs migration validation. |
| Lead idempotency columns (`client_request_id_hash`, `request_fingerprint`) + unique index | §3.4.1 | New persisted security/retention surface. |
| Generic `idempotency_keys` table | §3.5 Option B | Requires atomic batch; retention/PII decisions. |
| `outbox` table | Future side effects | New operational state machine. |
| Bootstrap claim/consumption state | P3-05/TBD-14 | Security lifecycle decision. |
| Session `last_used_at`/GC indexes | P3-11/TBD-14 | Policy and session semantics. |
| Audit metadata/indexes/retention | P3-16/TBD-09 | Privacy/retention and query design. |
| Pricing description field | P3-14 | Product contract decision; may be removed instead. |

### 6.6 Idempotency prerequisites by tier

- **I0:** owner approves the operations, header, key format, scope, retention, error codes, required/optional rollout, and whether CMS exact replay is needed. No code.
- **I2:** A2 migration framework/integrity is in place; owner approves the lead-column design; if a generic table is chosen, `DbPort.atomic`/batch exists and real D1 `batch()` semantics are proven.
- **I3:** local tests cover sequential/conflict/lost response/auth/regression; no claim of D1 concurrency.
- **I4:** isolated D1 staging proves the D (only) cases in §4; no `piple-spike-d1`; no production traffic.

### 6.7 Explicitly not authorized

A1/A2/A3, B1/B2, C1/C2/C3/C4, I0–I4, D1–D5, schema/migrations, dependency changes, Worker creation, D1 creation, backups, DNS, secrets, deployment, and any production data operation each require explicit owner authorization. A recommendation in this report is not a decision.

---

## 7. Decisions requiring explicit owner approval

### 7.1 Phase-level gates

| Gate | What the owner would authorize | Prerequisites | What it does **not** authorize |
|---|---|---|---|
| **Phase 3A acceptance** | Accept this review as the current detailed reference (or request changes) | Owner reading; correction of any evidence gaps | Any code, schema, dependency, infrastructure, or deployment change |
| **A1** | Local backend hardening (no schema) | Phase 3A acceptance | A2 schema, Cloudflare resources, deployment |
| **B1** | Vitest 4.1.12 upgrade, test rerun, advisory recheck | A1 or independent approval; lockfile review | React Router upgrade; any production deployment |
| **B2** | React Router 7.18.0 upgrade **or** dated deferral with compensating controls | B1; frontend regression plan | Dependencies beyond the approved package |
| **C1** | Frontend truthfulness/error-state fixes | Contract for error codes; no schema | Backend behavior changes or idempotency claims |
| **A2** | Indexes, DB taxonomy CHECK, migration integrity, restore/pagination contracts | A1; migration review; owner schema approval | D1 resource creation or production migration |
| **A3** | Recovery/rotation/deactivation, bootstrap consumption, retention/purge, idle sessions, audit retention, hash versioning | TBD-14 and TBD-09 policy decisions; A2 as needed | Any policy default chosen on the owner’s behalf |
| **I0** | Record the idempotency contract below | Owner decisions on key/retention/error behavior | Code or schema |
| **I2** | Lead-column schema (recommended) and/or generic table + atomic port | A2, I0, real-D1 batch plan, schema approval | Production migration |
| **I3** | Local idempotency implementation/tests | I2, A1, C1 client behavior | Real-D1 proof or deployment |
| **C2** | Topology/transport (TBD-11), CORS/cookies/headers, env/API base | TBD-11; A1/A2 contract freeze | DNS change or secret provisioning unless separately approved |
| **C3** | Documentation reconciliation | A1/A2/C2 decisions; preserve TBDs | Rewriting historical reports or resolving TBDs |
| **C4** | Local/staging regression | C1–C3; approved test environment | Production traffic |
| **D1** | Worker entry + application Wrangler config + isolated staging D1 + bindings/secrets + migrations | A1/A2/B1/C1; explicit Cloudflare resource approval | Production deployment, DNS, production data |
| **D2** | Edge security/observability/headers, trusted IP, shared limits, health/readiness, CI | D1; C2 | Production cutover |
| **D3** | Backup/restore/rollback/rehearsal, measured RPO/RTO | D1; owner restore policy | Untested restore on production |
| **D4** | Concurrency + adapter + idempotency real-D1 proof | D1; I3; D3 as applicable | Production traffic or claims beyond the tested cases |
| **D5** | Production readiness/deployment | A/B/C/I and D1–D4 accepted; all blockers closed | Anything not explicitly listed in the deployment approval |

### 7.2 Idempotency-specific owner decisions

| # | Decision | Recommended starting point (not approved) | Why owner input is required |
|---|---|---|---|
| I-D1 | Is backend idempotency **required** for public inquiry? | **Yes**, before any production launch | It changes the data model, API contract, and retention surface. |
| I-D2 | Is a key required for inquiry, or optional during a transition? | Require after the frontend release; accept legacy briefly with a metric, never call it idempotent | Client compatibility and launch sequencing. |
| I-D3 | Transport: `Idempotency-Key` header vs body field | Header | API contract/tooling; CORS if cross-origin. |
| I-D4 | Key format/length and storage hash | UUID/short opaque string, SHA-256, 16–128 chars | Interoperability and abuse policy. |
| I-D5 | Key scope | Public inquiry by hash; admin by actor + operation; future tenant included | Authorization boundary/multi-user future. |
| I-D6 | Retention/expiry | Lead lifecycle for inquiry; 24h for admin; longer for external effects if enabled | TBD-09 privacy and operational needs. |
| I-D7 | Same-key/different-payload behavior | `409 IDEMPOTENCY_CONFLICT`, no effect | Contract semantics and client UX. |
| I-D8 | Same-key/same-payload replayed response | Original status/resource identity; `Idempotent-Replayed: true` | Client behavior and cache/proxy implications. |
| I-D9 | In-progress behavior | `409 IDEMPOTENCY_IN_PROGRESS` + `Retry-After`; bounded polling/retry | Distributed behavior; no status endpoint exists. |
| I-D10 | Crash/in-doubt behavior | Reconcile if a natural key exists; otherwise `409 IDEMPOTENCY_IN_DOUBT`, no blind retry | Risk appetite and support process. |
| I-D11 | Does CMS create need exact 201 replay, or is unique-slug 409 sufficient? | **Unique-slug sufficient near term**; exact replay optional | Complexity vs. UX; avoids an unnecessary table/port dependency. |
| I-D12 | Generic idempotency table vs lead columns | **Lead columns for inquiry**; generic table only when atomic batch is proven and a second use case exists | Schema surface, D1 atomicity, maintenance. |
| I-D13 | Future outbox/provider idempotency | Required before email/WhatsApp/webhook/payment enablement | External side effects and provider contracts. |
| I-D14 | Error-code names/status codes | `IDEMPOTENCY_CONFLICT`, `IDEMPOTENCY_IN_PROGRESS`, `IDEMPOTENCY_IN_DOUBT`, `IDEMPOTENCY_EXPIRED`; 409 | Public API stability. |
| I-D15 | Rate-limit ordering for keyed retries | Apply abuse controls, but ensure a legitimate replay is not silently charged as a new effect; define 429 behavior | Security vs. retry correctness. |
| I-D16 | Raw key in logs? | Never; log only a non-reversible short hash/correlation id | Security/observability. |

### 7.3 SQLite/Cloudflare owner decisions

| Decision | Why it is not implied by “use SQLite/Cloudflare” |
|---|---|
| **TBD-11 topology** — same origin vs separate `api.` origin, static hosting/route strategy | Determines cookie/CORS/CSRF behavior and deployment structure; current client assumes same-origin. |
| **Worker entry strategy** — thin Worker around Hono vs a larger platform structure | Affects bundle, config, and migration path; must prove Node-only imports are excluded. |
| **Auth crypto strategy** — Web Crypto vs `nodejs_compat` for scrypt/timing-safe operations | Cloudflare support for the current Node crypto path is unverified; security-critical. |
| **D1 staging resource creation** | D-23 approves the design of separate resources, not creation; D1 is a billable external resource. |
| **D1 migration ownership** | Wrangler journal vs local journal; no production migration is authorized. |
| **Session storage on D1** | D-18 is design only; no real-D1 session test exists. |
| **Secrets/config ownership** | No secret values are selected/provisioned; `.env` must not be committed. |
| **Backup/RPO/RTO and restore authorization** | D-19/D-20 are targets/design; evidence and restore policy are still required. |
| **Retention/purge policy** | TBD-09 remains open; privacy obligations are not a technical default. |
| **Recovery/deactivation policy** | TBD-14 remains open; out-of-band recovery must be owner-controlled. |
| **Production deployment/domain/DNS** | D-24 direction only; exact domain open, no DNS changes authorized. |

### 7.4 TBD register preservation

This report does **not** resolve, reinterpret, or close any TBD. In particular:

- **TBD-01** individual product readiness remains open.
- **TBD-02** pricing package names, values, features, and limits remain open.
- **TBD-03** official WhatsApp number and prefilled message remain open.
- **TBD-04** actual brand logo/colors/typography/asset locations remain open.
- **TBD-05** approved portfolio projects, screenshots, consent, and descriptions remain open.
- **TBD-06** exact production domain/ownership/DNS remains open; D-24 is direction only.
- **TBD-07** official business email/address/company profile/vision/mission remains open.
- **TBD-08** wedding-planning scope/commercial offering remains open.
- **TBD-09** inquiry/Leads inclusion is partially decided (D-27), but consent wording and privacy/retention/data-handling documentation remain open; the remaining items gate P3-03 and public launch.
- **TBD-10** approved homepage copy/tagline/positioning remains open.
- **TBD-11** final frontend/backend deployment topology remains open and gates P3-07/C2.
- **TBD-12** verified adapter/migration strategy remains open pending final sign-off; D-17 is a design approval, not proof of implementation.
- **TBD-13** image/media storage/R2 approach remains open.
- **TBD-14** admin authentication/session/cookie/CSRF/rate-limit/bootstrap/recovery implementation remains open and gates P3-05/P3-11/P3-22.
- **TBD-15** SEO/sitemap/analytics requirements remain open.
- **TBD-16** production backup/recovery/rollback procedures remain open; D-19/D-20/D-21 are approvals/targets, not implemented evidence.

D-43/D-44 and all historical decisions remain in force. Phase 2D-R3 remains owner-review pending. The owner’s statement that the frontend is sufficiently complete for now is not recorded here as acceptance of R3.

---

## 8. Unverified assumptions, blockers, and no-change attestation

### 8.1 Unverified assumptions

The following are explicitly **not established** by this review:

1. **D1 batch atomicity for this workload.** Cloudflare documents `batch()` as transactional, but the application has not run a failing-batch/rollback test on an isolated staging D1.
2. **D1 error and metadata shape.** `meta.changes`, constraint error text, overload/transient errors, and adapter mapping are not proven on real D1.
3. **Workers crypto compatibility.** `node:crypto` scrypt/timing-safe behavior under `nodejs_compat` is unknown; a Web Crypto alternative may be required.
4. **Workers bundle cleanliness.** No current build proves that `node:sqlite`, `node:fs`, `.env` loading, or other Node-only modules are excluded.
5. **D1 sessions/read-after-write.** Session storage is designed (D-18), not application-tested; read replication/session consistency is not configured.
6. **Concurrent behavior.** Multi-isolate rate limiting, unique-race behavior, lost responses, and idempotency under real concurrency are unverified.
7. **Migration parity.** The full application schema has not been applied to D1; only a smaller spike schema was proven.
8. **Backup/restore and Time Travel.** No export, restore, integrity check, or measured RPO/RTO exists; Time Travel eligibility/retention is unverified.
9. **Retention/purge.** No scheduler or purge has run; TBD-09 policy is open.
10. **Recovery/deactivation.** TBD-14 choices and the out-of-band procedure are not implemented or rehearsed.
11. **Trusted client IP and edge rate limits.** Cloudflare account/plan/edge configuration was not inspected; the exact trusted header/mechanism is unverified.
12. **Frontend topology.** TBD-11 is open; same-origin vs `api.` origin is undecided; cross-origin cookies/CORS/CSRF are untested.
13. **Frontend E2E current state.** R3 reported 19/19, but Phase 3A did not rerun Playwright because it writes `backend/e2e.db`.
14. **Dependency applicability.** The Phase 3 advisories are time-sensitive and were verified via OSV; `npm audit` timed out. Exploitability in this app is not demonstrated.
15. **Production load/cost.** No load test, D1 rows-read/cost measurement, or dashboard request-budget test exists.
16. **Domain/DNS/Cloudflare resources.** No account inspection, domain selection, DNS change, or resource creation was performed.
17. **`piple-spike-d1` as production evidence.** It is historical only; no application schema, sessions, auth, concurrency, or backup proof.
18. **Data volumes.** Public catalog/lead/audit growth is unknown; index/page-size decisions need staging data.

### 8.2 Environment blocker matrix

| Area | Local development | Staging | Production |
|---|---|---|---|
| Worker entry/runtime | Not required for local | **Required** | **Required** |
| Application D1 binding/schema | Not used | **Required** | **Required** |
| D1 real adapter/session proof | Not used | **Required** | **Required** |
| Backup/restore/RPO/RTO | Not implemented | **Required for BK-01 acceptance** | **Required** |
| Retention/purge/privacy | Dev data only | Policy validation | **Required** |
| Trusted IP/shared rate limits | Local limiter acceptable | **Required for edge realism** | **Required** |
| Security headers/no-store | Local checks useful | **Required** | **Required** |
| Recovery/rotation/deactivation | Not implemented | **Required** | **Required** |
| Observability/CI | Partial/absent | **Required** | **Required** |
| Frontend topology/CORS/cookies | Dev proxy works | **Required** | **Required** |
| Idempotency | No general guarantee | Must match enabled operations | Must match enabled operations |
| Node engine contract | **Partial** (Node version) | CI alignment | CI alignment |
| Dependencies | Advisories present | Recheck | Recheck/bundle scan |

### 8.3 Pre-staging gate (must be true before staging is called ready)

- A1/A2 (and I3 if idempotency is in scope) accepted; B1 completed; C1 accepted.
- Worker entry and application Wrangler config reviewed; Node-only imports excluded or proven compatible.
- Dedicated isolated staging D1 created with explicit approval; full schema applied through Wrangler; no `piple-spike-d1`.
- Real-D1 adapter contract tests pass; `transaction()` no longer silently no-ops.
- Sessions/CSRF/cookies tested on the chosen topology.
- Trusted IP/shared limits/body limits tested at the edge.
- Headers/no-store tested on the real host.
- Observability/health/CI and a rollback runbook exist.
- Backup/restore drill recorded with measured times.
- Retention/purge policy approved; purge rehearsal on fake staging data if in scope (P3-03 is not a staging blocker, but it must be production-ready).
- Idempotency matrix D-tier cases pass for enabled operations.
- All staging data is fake; no production secrets/data.

### 8.4 Pre-production gate (must be true before launch)

- Staging gate accepted and D5 explicitly authorized.
- All critical/high findings have either verified remediation or a signed, dated risk acceptance.
- All launch-blocking TBDs (at minimum TBD-06, TBD-09, TBD-11, TBD-12, TBD-14, TBD-16, plus applicable content TBDs) resolved or explicitly accepted for the launch scope.
- Backup, restore, rollback, monitoring, alerting, and ownership proven.
- Production secrets/DNS/domain/Cloudflare resources approved and configured out of band.
- No unresolved critical/high dependency advisory in the deployed scope.
- Privacy/consent/retention and legal copy approved.
- No `piple-spike-d1` dependency; no test data in production.
- A post-deploy smoke/rollback decision point is scheduled.

### 8.5 Production blockers (summary)

**Definite production blockers:** P3-01, P3-02, P3-03, P3-04, P3-05, P3-06, P3-08, P3-11, P3-16, P3-18, P3-20; plus TBD-06, TBD-09, TBD-11, TBD-12, TBD-14, TBD-16, and applicable launch-content TBDs, and D1–D5. P3-10 and P3-15 are production integrity/scale blockers as scoped above; P3-07 is conditional on topology; P3-09 requires a decision; P3-21 is a staging/readiness blocker. P3-12/P3-17/P3-22/P3-23 are local/tooling/polish and do not independently block production, but should be closed or accepted.

### 8.6 No-change attestation

- Phase 3A created only this document and a documentation-only changelog entry.
- No application code, tests, shared contracts, dependencies, lockfiles, schemas, migrations, seeds, databases, environment files, Cloudflare resources, DNS, secrets, or deployment configuration were changed.
- No commit, push, deploy, restore, purge, or resource creation was performed.
- `piple-spike-d1` was not accessed or queried.
- `.env` was not read; `dev.db`, `e2e.db`, and WAL sidecars were not modified.
- Backend tests (27/27) and backend typecheck were run read-only; no frontend E2E or real-D1 tests were run.
- Prior reports were not rewritten; Phase 3A is additive.
- TBD-01–TBD-16 and all historical decisions remain in force; Phase 2D-R3 remains owner-review pending.

### 8.7 Recommended immediate next step

**Stop here for owner review.** The owner should:

1. accept, reject, or amend Phase 3A;
2. decide whether to authorize A1 and/or B1/C1 first;
3. record the idempotency decisions in §7.2 before any I2 schema work;
4. decide TBD-11/TBD-09/TBD-14 before C2/A3/D1; and
5. keep D1–D5 and all Cloudflare resources explicitly gated.

No implementation should begin from this document alone.


