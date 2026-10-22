# Phase 3B — A1/B1/C1 Implementation Report

**Status:** IMPLEMENTED AND LOCALLY VERIFIED — **not committed, pushed, deployed, or staging/production verified**.
**Date:** 2026-10-22
**Baseline:** `89ce5db` (Phase 2D-R3), with the owner's pre-existing Phase 3A documentation changes in the working tree.
**Authorization:** A1 (local backend hardening, no schema), B1 (Vitest 4.1.12), and C1 (frontend truthfulness/error handling) only.

> This report does not claim full Phase 3 readiness. Staging and production remain unapproved and unverified. TBD-09 and TBD-14 remain open; no policy decision was invented.

---

## 1. Executive result

| Workstream | Result |
|---|---|
| **A1** | Implemented within the no-schema boundary: trim-before-validation, streamed body caps, explicit list-query validation, per-key settings JSON/schema validation, create-publish `published_at`, opportunistic session GC, production fail-closed config, failed-login audit, safe DB error mapping, D1 `transaction()` fail-loud, trusted-client-IP resolver seam, admin no-store, bounded in-memory limiter, app-level service taxonomy checks, UUID IDs. |
| **B1** | Vitest upgraded from declared `^3.1.1` / installed `3.2.7` to **4.1.12**. `tinypool` and the vulnerable Vitest/mocker versions are gone. Backend tests, frontend tests, typechecks, and builds pass. Two moderate React Router advisories remain; B2 was not approved. |
| **C1** | Public and admin surfaces now distinguish loading, successful-empty, successful data, and error states; retries target read operations only; API status/code/fields are preserved; login/list/settings/detail/mutation messages are truthful; the unsupported pricing description field and false restore promise were removed; one settings fetch is shared by every WhatsApp CTA. |
| **Verification** | Backend: **46/46 tests in 6 files**; frontend unit: **8/8 tests in 2 files**; C1 browser suite: **9/9 mocked-API tests**; backend/frontend/shared builds and typechecks pass. |

---

## 2. A1 — Local backend hardening

### 2.1 Changes by finding

| Phase 3A finding | Result in this phase | Implementation |
|---|---|---|
| **P3-10** — whitespace inquiry, unvalidated settings, arbitrary service slug, null `published_at` | **Addressed at the application/API layer** | `shared/src/index.ts` trims inquiry/login/bootstrap/content strings before length checks. Settings are parsed as JSON and validated against per-key strict schemas; malformed legacy public values are omitted on read. Service creates use the seven-value `serviceSlug` enum and require `slug === category`; PATCH enforces the same invariant against the stored row. `createRow` sets `published_at` when inserted as published; updates preserve the first-publish timestamp. DB `CHECK` for service slug remains A2/schema work. |
| **P3-20** — bypassable/absent body limits | **Addressed** | New `backend/src/http/body-limit.ts` reads and counts actual bytes regardless of `Content-Length`; malformed/oversized lengths fail early. Applies a **256 KiB** global API cap, **128 KiB** admin cap, and **64 KiB** inquiry cap. Tests include a streamed oversized inquiry body with no usable length and an oversized admin login body. |
| **P3-04** — spoofable IP and unbounded local buckets | **Partially addressed within local scope** | New `backend/src/http/client-ip.ts` defaults to the transport peer address and ignores `X-Forwarded-For`/`X-Real-IP` unless a trusted proxy policy is explicitly injected. For trusted XFF, the resolver takes the configured hop from the right, never the attacker-controlled leftmost value. `RateLimiter` now bounds bucket count with stale eviction. **No distributed/edge limiter, Cloudflare edge limit, or account lockout was implemented or claimed.** |
| **P3-11** — session GC/config gaps | **Partially addressed; policy items remain A3/TBD-14** | Expired/revoked sessions are deleted opportunistically on successful login/bootstrap using existing columns (`cleanupSessions`). Production configuration now fails closed when `COOKIE_SECURE` is not true or `FRONTEND_ORIGIN` is not HTTPS/non-localhost; numeric/boolean env values are validated. No idle timeout, last-used column, revoke-all lifecycle, or use/removal of `SESSION_SECRET` was added. |
| **P3-16** — failed logins not audited | **Partially addressed** | Failed password checks now write `audit_log` action `login.failed` with the attempted normalized email as actor, using the existing schema and no password/token material. No audit read path, extra metadata, or retention policy was added. |
| **P3-08** — silent non-atomic D1 `transaction()` | **Addressed at the adapter contract**; real D1 remains unverified | `D1Adapter.transaction()` now throws before invoking the callback. Comments/`DbPort` documentation state that D1 has no interactive transactions and that an approved atomic-batch port is required before multi-step invariants. No real-D1 run or batch port was created. |
| **P3-13 / error mapping** | Backend portion addressed; frontend portion in C1 | `mapDbError` reads provider `code`/constraint families and returns only stable safe messages. `INTERNAL_ERROR`/`SQLITE_BUSY` map to safe 500/503 responses; internal SQL/provider text is never returned. Admin DB routes use the mapper. |
| **P3-14 / pricing dead field** | Frontend portion addressed; restore/dashboard remain A2/D-44 | Removed the unsupported pricing `description_id` submission and hid the pricing body field; delete copy no longer promises restore; create notice reflects actual status. Dashboard fan-out and restore API were not implemented. |
| **P3-06 / admin caching** | **Minor local portion addressed** | Admin API responses now send `Cache-Control: no-store`. CSP, HSTS, frame policy, CORS/origin topology, and static-host headers remain C2/D2. |
| **P3-23 / IDs and settings fetch** | **Partially addressed** | `uid()` now uses `crypto.randomUUID()`; content/admin/session/audit/history IDs use it. Frontend settings are fetched once per page via a shared provider/cache. English Zod messages and multi-statement transaction grouping were not changed. |
| **P3-17, P3-18, P3-19, P3-12, P3-15** | **Not implemented** | Outside the approved A1/batch files or requiring separate schema/CI/documentation authorization. See blocked items in §7. |

### 2.2 A1 behavior details

- **Trusted IP boundary:** `createApp` accepts an optional `clientIp` resolver. The default uses `c.env.incoming.socket.remoteAddress` when available and otherwise `unknown`. A future Worker/deployment must explicitly inject `createClientIpResolver({ trustedProxyHeader: 'cf-connecting-ip' })` or a documented XFF hop policy after D2 approval. No header is trusted by default.
- **Query validation:** admin content lists accept only `page`, `per_page`, `status`, and `q`; leads accept only `page`, `per_page`, and `state`. Unknown keys, invalid enums, and out-of-range pagination return `VALIDATION_ERROR`/400.
- **Settings validation:** JSON is parsed first; `site_name` is 2–80 trimmed characters; `whatsapp_number` must be E.164-like; `seo_defaults` is a strict object; `whatsapp_templates` is a string-to-string object. `is_public` cannot be true for a key outside the public allowlist. Stored values are normalized and re-serialized.
- **Public settings read:** malformed JSON or schema-invalid stored values are skipped, not returned as raw text.
- **Publication timestamp:** `status: "published"` on create writes `published_at`; subsequent edits to an already-published row do not rewrite it. Unpublish semantics remain unchanged (the timestamp is retained); that decision is still A2/owner work.
- **Session cleanup:** successful login/bootstrap deletes expired or revoked session rows. This is opportunistic, not a scheduler; no idle timeout/session-policy decision was made.
- **No-store:** `/api/v1/admin/*` responses set `Cache-Control: no-store`.
- **Rate limiter:** remains **per-process/in-memory**. It is bounded but is not a distributed or Cloudflare edge rate limiter.

### 2.3 A1 tests added/updated

New `backend/test/hardening.test.ts` covers:

- whitespace-only inquiry rejection and trimmed persistence;
- streamed 64 KiB inquiry cap and 128 KiB admin cap;
- admin query validation/allowed keys and invalid lead state;
- service taxonomy rejection and slug/category mismatch on create/PATCH;
- settings invalid JSON, invalid WhatsApp value, unknown key, private-key public rejection, strict SEO object, normalized storage, malformed legacy omission;
- create-as-published `published_at` and preservation on edit;
- failed-login audit row with no password material;
- session GC on login;
- admin `no-store`;
- trusted-IP resolver spoof resistance, trusted CF/XFF hop behavior;
- bounded limiter buckets;
- D1 transaction fail-loud/callback not executed;
- safe DB error mapping with no provider details;
- production config fail-closed and malformed numeric config.

Updated `backend/test/contracts.test.ts` for trim-before-min. Updated `backend/test/repo.test.ts` for defensive public settings projection.

---

## 3. B1 — Vitest remediation

### 3.1 Versions before and after

| Item | Before | After |
|---|---|---|
| Backend declared Vitest | `^3.1.1` | **`4.1.12` (exact)** |
| Installed Vitest | `3.2.7` | **`4.1.12`** |
| `@vitest/mocker` | `3.2.7` | **`4.1.12`** |
| `tinypool` | `1.1.1` | **Absent** |
| `vite-node` | `3.2.4` (Vitest 3 path) | **Absent** |
| Vite | `6.4.4` | `6.4.4` (unchanged) |
| React Router / React Router DOM | `6.30.6` | `6.30.6` (**not upgraded**) |
| Node / npm | `24.20.0` / `11.19.0` | unchanged |
| Frontend Vitest | none | **`4.1.12` (test tooling for C1)** |

Vitest 4 required replacing the removed `test.poolOptions` with top-level `maxWorkers: 1` and `fileParallelism: false` in `backend/vitest.config.ts`.

### 3.2 Advisory result

`npm audit --json` before:

- **5 vulnerabilities:** 2 critical, 3 moderate:
  - `tinypool` critical (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr)
  - `vitest` critical/moderate (including GHSA-82fw-gwwq-j7x9)
  - `@vitest/mocker` moderate (GHSA-qxg6-89mg-rqv8)
  - `react-router` / `react-router-dom` moderate (GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg)

`npm audit --json` after:

- **2 vulnerabilities:** 0 critical, 0 high, 2 moderate — both the unchanged React Router 6.30.6 advisories. `npm audit --omit=dev --json` reports the same two moderate advisories.
- The Vitest/tinypool/mocker advisories are no longer present in the installed tree.
- React Router remediation was **not** attempted because B2 was not approved. Installation success is not treated as proof that the remaining advisories are resolved.

`npm ls tinypool @vitest/mocker vitest --all` confirms Vitest 4.1.12 and `@vitest/mocker` 4.1.12 with no `tinypool` node. A production build scan of `frontend/dist/assets/*.js` found no `tinypool`, `vitest`, or `@vitest` markers. This is a bundle-marker check, not a proof of production exploitability.

---

## 4. C1 — Frontend truthful states and API errors

### 4.1 API client

- Added `ApiRequestError` carrying `status`, stable `code`, `message_id`, and `fields`.
- Network failures become `NETWORK_ERROR`/status `0` instead of being conflated with HTTP errors.
- `messageForApiError` maps 401, 403, 404, 413, 429, 5xx, validation, conflict, and network cases to Indonesian messages.
- `loginErrorMessage` distinguishes bad credentials from rate limits, outages, and network failures.
- `isSessionExpired` and `isNotFound` preserve the useful distinctions for admin/list/detail callers.

### 4.2 Public pages

- `usePublic` now models `loading | error | success` and resets state on dependency/retry changes.
- `Produk`, `Portofolio`, `Harga`, `Artikel`, and service pages no longer render “empty” or “not found” before the request resolves.
- Detail pages show “not found” only for an actual 404; other failures show a retryable error.
- Failed lists do not render the empty-state copy.
- `Layanan` keeps its static taxonomy but reports when server summaries could not be loaded; it does not claim the static fallback is live API success.
- The unsupported/missing-data cases remain honest: product catalog empty state, portfolio empty state, pricing empty state, and article empty state are only shown after a successful response.

### 4.3 WhatsApp settings

- A single layout-level provider fetches public settings once per page (deduped even under React StrictMode) and shares the result with every CTA/FAB.
- Loading, missing configuration, fetch failure, and retry are distinct:
  - loading: “Memuat kontak WhatsApp…”
  - missing configuration: disabled “Chat WhatsApp (belum tersedia)” with the existing configuration title;
  - failure: “Kontak WhatsApp tidak tersedia”, a page-level retry banner, and no false “coming soon” claim.
- Retry re-fetches settings only; it does not replay a mutation.

### 4.4 Admin CMS

- `AdminProvider` distinguishes a normal 401 (login page) from an outage/500/network failure (retryable “Admin tidak dapat dimuat” state).
- Login maps 401, 429, 403, 5xx, and network failures separately.
- Content lists, leads, settings, lead detail, and dashboard errors show accurate messages with session-expiry detection and retry controls.
- List failures clear stale rows and suppress empty-state tables; they are not shown as successful empty data.
- Settings failures suppress the “all keys unconfigured” table; a settings save validation error from `value_json`, `key`, or `is_public` is surfaced.
- Create notices reflect the actual chosen status; status-change notices remain accurate.
- Delete confirmation no longer promises a restore path that does not exist.
- The pricing body/description field was removed from the form and request because the current schema/API cannot persist it.
- No mutation retry was added. Save buttons remain disabled while busy; this is a UI guard, **not backend idempotency**.

### 4.5 C1 tests added

- `frontend/test/api.test.ts`: preserved status/code/fields, network failure mapping, 429/5xx/404/session mapping, login-specific messages, successful empty array.
- `frontend/test/adminCopy.test.ts`: create/status notices reflect saved status; delete copy does not promise restore.
- `tests/e2e/truthfulness.spec.ts`: 9 mocked-API browser tests covering loading vs empty vs failure, 404 vs 500 detail, WhatsApp failure vs missing config and retry, one settings request, admin boot outage, login 429, list 401, and settings failure.
- The browser suite intercepts all API calls, so it is read-only and does not require the backend database.

---

## 5. Files changed and reason

### 5.1 Backend / shared / tooling

| File | Reason |
|---|---|
| `shared/src/index.ts` | Trim-before-length validation; per-key settings schemas; service taxonomy; settings key types. |
| `backend/src/http/body-limit.ts` | New streaming byte cap independent of `Content-Length`. |
| `backend/src/http/client-ip.ts` | New trusted-client-IP resolver boundary; default ignores forwarding headers. |
| `backend/src/app.ts` | Wires body caps, IP resolver, and admin `no-store`. |
| `backend/src/http/auth.ts` | Removes untrusted header lookup; injects resolver; origin-only public guard. |
| `backend/src/config.ts` | Validates integers/booleans; fail-closed production cookie/origin behavior. |
| `backend/src/http/errors.ts` | Safe code/constraint-based DB error mapping. |
| `backend/src/auth/ratelimit.ts` | Bounded bucket map with stale eviction. |
| `backend/src/db/d1.ts`, `db/types.ts` | D1 `transaction()` fail-loud; UUID IDs; corrected contract comments. |
| `backend/src/repo/admin.ts` | Session GC helper. |
| `backend/src/repo/content.ts` | Create-publish `published_at`; preserve first publish on updates. |
| `backend/src/repo/settings.ts` | Defensive JSON/schema validation; UUID history IDs. |
| `backend/src/routes/admin.ts` | Query schemas, settings validation, failed-login audit, service invariants, session GC, safe error mapping, UUID IDs, trimmed content fields. |
| `backend/src/routes/public.ts` | Streaming inquiry limit, resolver-based rate-limit key, origin guard. |
| `backend/test/hardening.test.ts` | New A1 coverage. |
| `backend/test/contracts.test.ts`, `test/repo.test.ts` | Updated contract/projection expectations. |
| `backend/vitest.config.ts` | Vitest 4 pool configuration migration. |
| `backend/package.json`, `package.json`, `package-lock.json` | Vitest B1 upgrade and root test script. |

### 5.2 Frontend

| File | Reason |
|---|---|
| `frontend/src/api.ts` | Structured API errors, stable code/status/fields, retry-safe message mapping. |
| `frontend/src/adminCopy.ts` | New tested copy helpers for create/status/delete behavior. |
| `frontend/src/pages/public.tsx` | Explicit loading/error/success and 404-vs-failure detail states; retries. |
| `frontend/src/pages/Kontak.tsx` | API error/code-aware inquiry failure messaging. |
| `frontend/src/components/Layout.tsx` | One shared settings fetch, WhatsApp loading/failure/configured states, retry banner, reusable loading/failure components. |
| `frontend/src/admin/cms.tsx` | Admin boot/login/list/settings/detail error states, session mapping, notices, remove pricing dead field, accurate delete copy. |
| `frontend/src/styles.css` | Minimal styling for the shared status/error rows. |
| `frontend/test/api.test.ts`, `test/adminCopy.test.ts` | New frontend unit tests. |
| `frontend/vitest.config.ts`, `frontend/tsconfig.json`, `frontend/package.json` | Frontend test runner setup; Vitest 4.1.12. |
| `tests/e2e/truthfulness.spec.ts` | New read-only mocked-API browser regression suite. |

### 5.3 Documentation

| File | Reason |
|---|---|
| `docs/phases/PHASE-3B-A1-B1-C1-IMPLEMENTATION-REPORT.md` | This additive report. |

**Preserved pre-existing changes:** `docs/CHANGELOG.md` was already modified and `docs/phases/PHASE-3-BACKEND-READINESS-AUDIT.md` / `docs/phases/PHASE-3A-DETAILED-AUDIT-AND-ARCHITECTURE-REVIEW.md` were already untracked. They were not rewritten as part of this phase.

---

## 6. Verification commands and results

| Command | Result |
|---|---|
| `npm run test --workspace=backend` (baseline, Vitest 3.2.7) | **PASS** — 5 files, 27/27 tests. |
| `npm run build --workspace=backend` (baseline) | **PASS** — `tsc --noEmit`. |
| `npm run build --workspace=frontend` (baseline) | **PASS** — tsc + Vite 6.4.4 build. |
| `npm install` | **PASS** — Vitest 4.1.12 installed; 2 moderate advisories reported. |
| `npm test` | **PASS** — backend 6 files/46 tests and frontend 2 files/8 tests. |
| `npm run test --workspace=backend` (Vitest 4.1.12) | **PASS** — 6 files, 46/46. |
| `npm run test --workspace=frontend` (Vitest 4.1.12) | **PASS** — 2 files, 8/8. |
| `npm run build --workspaces --if-present` | **PASS** — frontend build, backend `tsc`, shared `tsc`. |
| `npm audit --json` before | **EXPECTED FAIL (exit 1)** — 5 advisories: 2 critical, 3 moderate. |
| `npm audit --json` after | **EXPECTED FAIL (exit 1)** — 2 moderate React Router advisories; 0 critical/high. |
| `npm audit --omit=dev --json` | **EXPECTED FAIL (exit 1)** — same 2 moderate React Router advisories. |
| `npm ls tinypool @vitest/mocker vitest --all` | **PASS** — Vitest 4.1.12, `@vitest/mocker` 4.1.12, no tinypool. |
| `npm ls vite typescript @types/node react-router-dom hono zod --all` | **PASS** — Vite 6.4.4, TypeScript 5.6.3, React Router DOM 6.30.6 unchanged. |
| Frontend `dist` scan for `tinypool`/`vitest` markers | **PASS** — no markers found. |
| `npx playwright test --config=tests/playwright.config.ts tests/e2e/truthfulness.spec.ts --workers=1` with manual Vite and `E2E_NO_SERVER=1` | **PASS** — 9/9 mocked-API tests. |
| `git diff --check` | **PASS** — no whitespace errors. |

### 6.1 Browser-suite harness limitation

The configured Playwright `webServer` command is `npm run dev --workspace=frontend`. When Playwright is launched with `--config=tests/playwright.config.ts`, that command runs from the `tests` directory and npm reports “No workspaces found”. This is a pre-existing harness issue, not a product failure. The new truthfulness suite was therefore run with a manually started Vite server and `E2E_NO_SERVER=1`. The full DB-backed e2e suite was **not** run because it writes `backend/e2e.db`; database files were protected by this phase’s boundary.

---

## 7. Remaining advisories, limitations, and blocked findings

### 7.1 Remaining advisories

- `react-router@6.30.6` / `react-router-dom@6.30.6`: two moderate advisories (GHSA-wrjc-x8rr-h8h6 and GHSA-337j-9hxr-rhxg). Fix path is React Router 7.18.x, which is **B2 and not approved**. No dated deferral was invented.
- No critical/high advisories remain in the installed tree according to `npm audit`.
- `npm audit` is a tree/registry check; it is not proof that runtime deployment is vulnerability-free.

### 7.2 A1 limitations

- **P3-04:** Only a trusted-IP seam and bounded process-local limiter were added. There is no Cloudflare edge rate limit, distributed limiter, per-account lockout, or load/isolation proof. Do not describe the current limits as distributed or edge controls.
- **P3-08:** D1 `transaction()` now fails loudly, but no atomic batch port or real-D1 adapter contract was implemented/proven. D1 remaining work is D1/D4.
- **P3-10:** Service taxonomy is enforced in the API; the database still has a `category` CHECK, not a service-slug CHECK. That migration is A2. Unpublish does not clear `published_at`; semantics remain owner/A2 work.
- **P3-11:** Session GC is opportunistic. No idle timeout, last-used tracking, scheduled GC, password rotation/revocation lifecycle, or `SESSION_SECRET` decision was made. Those need TBD-14/A3 and, for idle state, schema approval.
- **P3-16:** Failed logins are audited, but audit read APIs, richer metadata, immutable storage, indexes, and retention remain A2/A3.
- **P3-06:** Only admin `no-store` was added. CSP, HSTS, `frame-ancestors`, static-host headers, and CORS/topology work remain C2/D2.
- **P3-12/P3-15/P3-17/P3-18/P3-19:** Local migration atomicity/checksums, indexes/projections/pagination, Node engine floor, observability/CI, and docs reconciliation were not implemented; they require A2/B1-adjacent/CI/docs authorization.
- **P3-05/P3-03/P3-22/TBD-09/TBD-14:** Recovery, password rotation, deactivation, bootstrap-token lifecycle, retention/purge, idle sessions, audit retention, and hash versioning were not implemented. These require separate policy approval and in several cases schema work.
- **P3-14:** Pricing description was removed rather than added, avoiding a schema/API contract change. Restore is still absent; dashboard fan-out remains a D-44/A2 follow-up.
- **P3-23:** UUID IDs and one settings fetch were addressed. English Zod messages and transactional grouping of multi-statement writes were not.

### 7.3 Not verified / blocked environment work

- No real D1 adapter test, Cloudflare Worker entry, `wrangler` application config, D1 resource, edge IP/rate-limit proof, backup/restore, deployment, DNS, or production smoke test.
- No React Router upgrade or dated deferral.
- No full DB-backed Playwright regression run in this phase.
- `piple-spike-d1` was not accessed or modified.

---

## 8. Boundary attestation

Explicitly confirmed:

- **No** database schema, migration, seed, or database-file change. Tests use in-memory SQLite; the browser truthfulness suite uses request interception and no backend.
- **No** `.env`, secret, DNS, Cloudflare resource, Worker entry, Wrangler application config, D1 resource, or deployment change.
- **No** access to `piple-spike-d1`, `dev.db`, or `e2e.db` was used for this work.
- **No** commit, push, or deploy. No Git history was rewritten.
- **No** React Router or unrelated dependency upgrade. The only dependency upgrade is Vitest 4.1.12 (plus the frontend Vitest test runner declaration required for C1 tests).
- **No** idempotency implementation or idempotency schema; no claim that repeated mutations are safe.
- The pre-existing `docs/CHANGELOG.md` modification and the two untracked Phase 3A audit reports were preserved unchanged.

---

## 9. Final Git status and diff summary

At the time this report was prepared:

```text
## master
 M backend/package.json
 M backend/src/app.ts
 M backend/src/auth/ratelimit.ts
 M backend/src/config.ts
 M backend/src/db/d1.ts
 M backend/src/db/types.ts
 M backend/src/http/auth.ts
 M backend/src/http/errors.ts
 M backend/src/repo/admin.ts
 M backend/src/repo/content.ts
 M backend/src/repo/settings.ts
 M backend/src/routes/admin.ts
 M backend/src/routes/public.ts
 M backend/test/contracts.test.ts
 M backend/test/repo.test.ts
 M backend/vitest.config.ts
 M docs/CHANGELOG.md              # pre-existing owner change, untouched
 M frontend/package.json
 M frontend/src/admin/cms.tsx
 M frontend/src/api.ts
 M frontend/src/components/Layout.tsx
 M frontend/src/pages/Kontak.tsx
 M frontend/src/pages/public.tsx
 M frontend/src/styles.css
 M frontend/tsconfig.json
 M package-lock.json
 M package.json
 M shared/src/index.ts
?? backend/src/http/body-limit.ts
?? backend/src/http/client-ip.ts
?? backend/test/hardening.test.ts
?? docs/phases/PHASE-3-BACKEND-READINESS-AUDIT.md          # pre-existing
?? docs/phases/PHASE-3A-DETAILED-AUDIT-AND-ARCHITECTURE-REVIEW.md  # pre-existing
?? docs/phases/PHASE-3B-A1-B1-C1-IMPLEMENTATION-REPORT.md
?? frontend/src/adminCopy.ts
?? frontend/test/
?? frontend/vitest.config.ts
?? tests/e2e/truthfulness.spec.ts
```

**Tracked diff excluding the pre-existing `docs/CHANGELOG.md`:** 27 files, 1,001 insertions, 553 deletions. This includes the lockfile change and the Vitest migration. The new files above are additional to that tracked diff.

No staging, commit, or push was performed.

---

## 10. Readiness statement

A1, B1, and C1 are locally implemented and verified to the extent described above. This does **not** make Phase 3 complete, staging-ready, or production-ready. The approved scope did not include schema/A2 work, owner-policy TBD decisions, React Router B2, Cloudflare/D1 topology, edge controls, backups, observability, or deployment. Staging and production remain unapproved and unverified.
