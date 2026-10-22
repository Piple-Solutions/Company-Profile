# Project Progress Audit & Next-Step Roadmap — Read-Only (2026-10-22)

> Audit date: **2026-10-22**. Scope: whole-repository, evidence-based progress
> audit — implementation status, test coverage and what it proves, unverified
> areas, security/content/deployment readiness, and a prioritized roadmap.
>
> Method (read-only): file and directory inspection (workspaces, source,
> migrations, docs `docs/*.md`, all `docs/phases/*.md`, `spike/d1-sqlite/RESULTS.md`,
> test specs/config, package manifests, asset inventory); `node --version` /
> `npm --version`; dependency advisory lookup via `npm audit --workspaces`
> (registry read; no files modified). **Not re-run** in this audit: Vitest,
> Playwright, `vite build`, migrations/seeds (they write DB files or `dist/`);
> prior executed results are cited **with their recorded dates**, not claimed
> as re-executed. No database file was opened or modified; no service was
> started or stopped; no deploy/DNS/Cloudflare/secret operation occurred.
> `piple-spike-d1` was not listed, queried, or touched (protected resource).
> Files created for this audit: **this report only**.
>
> Changelog: **no entry added** — consistent with the audit-report convention
> precedent (`PHASE-01-POST-IMPLEMENTATION-AUDIT.md` has no `CHANGELOG.md`
> entry). All TBD-01–16 IDs and titles preserved; nothing renumbered,
> resolved, or silently reinterpreted. Decision history D-01–D-33 used as
> recorded; no approval is invented in this document.

## 1. Executive summary

**Current state (plain language).** The local build is complete and verified:
public website (Bahasa Indonesia, 13 routes + detail pages), single-Super-Admin
CMS (7 modules), inquiry form + Leads inbox, allowlisted public settings, and
the persistence layer (thin `DbPort` with `SqliteAdapter`/`D1Adapter`,
forward-only migrations, draft-only seeds). Since Phase 01, four refinement
rounds shipped: public visual polish (2A), admin CMS refinement (2B), ERP
asset integration, hero banner, and hero content balance (2026-10-22). Latest
executed verification (recorded in CHANGELOG/phase reports, most recently
**2026-10-22**): backend Vitest **27/27**, Playwright headed Chromium
**19/19** (fresh `e2e.db` discipline), frontend `tsc`+`vite build` PASS,
console/overflow responsive passes at 360/768/1024/1280, dist secret-value
scan clean.

**What is not true yet.** Nothing exists behind the local dev loop: no
Cloudflare Workers entry point or wrangler config for the app (only the
preserved Phase 00 spike worker), no dev/staging/production D1 resources
(D-23 designs only), no backups or restore rehearsal (D-19/D-20 are targets),
no rollback drill (D-21 design), no D1-level concurrency suite (D-22 approved,
not written), no domain/DNS (D-24/D-29), no monitoring/ops plan, and most
owner content inputs (TBD-01/02/03/04/05/07/08, TBD-09 remainder, TBD-10
beyond the new hero copy). Therefore **production readiness is not
established**, and local test evidence — however thorough — does not prove
D1/Workers behavior beyond the Phase 00 spike's SQL-parity scope.

**New audit finding (dependency advisories, 2026-10-22).** `npm audit
--workspaces` reports **5 vulnerabilities: 2 critical + 3 moderate**. Two
**critical** advisories are on `tinypool ≤2.1.1` (prototype-pollution → RCE
gadget, GHSA-5gmw-xhrv-c9v3 / GHSA-85c8-ppgw-ccpr) via `vitest@3.1.1`
(backend devDependency), plus 2 moderate via `@vitest/mocker`. The
react-router findings (2 moderate, GHSA-wrjc-x8rr-h8h6 / GHSA-337j-9hxr-rhxg)
are unchanged from the Phase 01 audit posture. All of these are
dev-tooling/frontend-runtime packages: none is shipped to production in an
exploitable server role (tsc/SPA), but the critical-severity advisories
warrant an explicit, recorded remediation decision (vitest 5.x major = breaking;
react-router 7.x major = breaking) — see §7 and roadmap HA-02.

**Strongest milestone evidence.** Executed-and-dated test logs in phase
reports; reproducible commands in `PHASE-01-POST-IMPLEMENTATION-AUDIT.md`;
source verified file-by-file in this audit (routes, auth/CSRF/rate limits,
migrations 0001 with 12 tables + `one_active_admin`, allowlist projections,
seed guard).

**Recommended immediate next step.** An **owner acceptance review** of the
finished local UI (§10 OA-01): it is the smallest safe step, it removes the
gate that currently blocks both the content-input phase and any deployment
prep (two consecutive phases stopped awaiting this review), and it requires
zero code or infra change.

## 2. Repository and environment baseline (inspected 2026-10-22)

- **Root:** `D:\project\PipleSolutions` — npm workspaces (root scripts: dev,
  build, test, test:e2e, migrate, seed). Workspaces: `frontend/`,
  `backend/`, `shared/`, `tests/`.
- **Git:** **not initialized** (no `.git` directory; no commits). Source
  history/rollback therefore depends on local file state only — recorded as a
  standing limitation.
- **Runtimes:** Node v24.20.0 (README requires ≥20 ✓), npm 11.19.0.
- **backend/**: Hono + Zod dev server (`src/dev.ts`, `@hono/node-server`),
  app factory `src/app.ts` (shared by dev/tests/documented Workers entry),
  `auth/{passwords,ratelimit}.ts`, `http/{auth,errors}.ts`, `repo/{admin,
  content,leads,settings}.ts`, `db/{sqlite,d1,migrate,types}.ts`,
  `db/migrations/0001_init.sql` (12 tables + partial unique index
  `one_active_admin`), `scripts/{migrate,seed}.ts`, 5 Vitest files
  (`test/auth,contracts,demo,inquiry,repo.test.ts` + helpers) = **27 tests**
  (count verified 2026-10-22).
- **frontend/**: React 18.3 + TS 5.6 + Vite 6 + react-router-dom 6.26.x;
  `src/{api,App,data,main,styles}` + `components/{Layout,ProductVisual}.tsx` +
  `pages/{public,Kontak}.tsx` + `admin/cms.tsx`; routes per `src/App.tsx`
  (public `/*` + `/admin/*`); static assets: 11 product screenshots + logo +
  `brand/hero-banner.jpg` (owner-supplied, 720×900 per prior phase report).
- **shared/**: `src/index.ts` — Zod contracts (enums, slug/d demoUrl rules,
  `publicSettings` strict allowlist, inquiry input) mirrored by both sides.
- **tests/**: Playwright — `app.spec.ts` (10), `tablet.spec.ts` (2),
  `visual-followup.spec.ts` (3), `admin.spec.ts` (4) = **19 tests** (counted
  2026-10-22); `playwright.config.ts` (baseURL :5173, optional
  `E2E_NO_SERVER` mode, trace retain-on-failure).
- **Data files present (not opened):** `backend/dev.db` (+`-shm`/`-wal`,
  as-found dev artifact, mtime 2026-10-10 preserved across all recent
  phases), `backend/e2e.db` (+`-shm`/`-wal`, gitignored throwaway test DB).
  `backend/.env` **exists** (secrets; deliberately not read); `.env.example`
  placeholder-only; no `frontend/.env`. `.gitignore` covers
  `node_modules/ dist/ *.db .env .wrangler/` etc.
- **Build output:** `frontend/dist/` present (from the 2026-10-22 build).
- **spike/**: phase 00 evidence preserved (`RESULTS.md`, harness, spike
  worker with placeholder `database_id`); `piple-spike-d1` (APAC) retained
  remote; **no other Cloudflare resources exist for this project** (no
  `wrangler.toml/jsonc` under `frontend/` or `backend/`).
- **Services currently running (as found, restored by prior phase):** vite
  dev on :5173 and backend `node ./src/dev.ts` on :8787.
- **Docs inventory:** `docs/`: PRODUCT-REQUIREMENTS (incl. authoritative TBD-01–16
  register), DECISIONS (D-01–D-33), ARCHITECTURE, DATABASE, API, WORKFLOW,
  TESTING, DEPLOYMENT, SECURITY, PERSISTENCE-DECISION, PHASE-01-READINESS-
  ASSESSMENT, DESIGN-SYSTEM, README, CHANGELOG; `docs/phases/`: PHASE-00-
  PLANNING, PHASE-01-IMPLEMENTATION, PHASE-01-POST-IMPLEMENTATION-AUDIT,
  PHASE-02A-PUBLIC-REFINEMENT, PHASE-02A-FOLLOWUP-VISUAL-POLISH,
  PHASE-02A-ERP-ASSET-INTEGRATION, PHASE-02A-HERO-BANNER,
  PHASE-02A-HERO-CONTENT-BALANCE, PHASE-02B-ADMIN-CMS-REFINEMENT;
  `spike/d1-sqlite/RESULTS.md`. No separate smoke-test file exists; manual
  browser smoke checklist lives in `PHASE-01-POST-IMPLEMENTATION-AUDIT.md` §6.

## 3. Progress matrix (evidence-based)

Statuses: Complete / Partial / Not Started / Blocked / Unverified.
"Verification level" distinguishes: **source inspected** (2026-10-22),
**test executed** (dated runs, cited), **manual/visual confirmed** (dated),
**environment integration verified** (real external system), **production
verified** (none exists anywhere in this project).

| # | Area | Status | Evidence (paths) | Verification level | Remaining work | Risk / dependency |
|---|------|--------|------------------|--------------------|----------------|-------------------|
| 1 | Project foundation & architecture | Complete (local discipline) | Root/`backend/frontend/shared/tests` manifest scripts; `backend/src/db/{sqlite,d1}.ts` match approved D-17 (async port, env adapters, no ORM); `app.ts` factory reused by dev/tests; `README.md` toolchain | Source inspected; toolchain verified by prior builds (last 2026-10-22 recorded) | Relative `shared/src` imports in backend (boundary hygiene note, Phase 01 audit §5) | None material |
| 2 | Public routes & content | Complete (structure) | `frontend/src/App.tsx` (13 public routes per PRD §7); `pages/public.tsx` (ID copy, honest TBD states, draft-hiding via API); `data.ts` static 7-service taxonomy (no invented guarantees) | Source inspected; e2e 19/19 executed 2026-10-22 | Owner copy beyond hero (TBD-10 remainder), T07 profile | Content gating (D-31/D-15) |
| 3 | Homepage design & responsive | Complete (local) | `styles.css` hero grid/`.hero-values`/banner cap 26rem; `visual-followup.spec.ts` hero-composition test; screenshots `hero-balance-1280/360.png` | Test executed + visual confirmed 2026-10-22 | Owner sign-off of the new hero (this audit's OA-01) | TBD-04 brand tokens |
| 4 | Services & service detail | Complete (structure) | `/layanan` 7 categories + detail routing; CMS merge; e2e assertions | Source inspected; e2e executed | Owner content per category (TBD-08 wedding scope) | TBD-02 pricing notes |
| 5 | Products & product detail | Complete (structure) | `/produk` + detail; spec table from `features_id`; demo states derived server-side (`public.ts` `demoStateFor`, `shared` demoUrl zod http/https-only); 11 real screenshots wired (`ProductVisual.tsx`) | Source inspected; e2e executed (imagery specs 2026-10-11/12; regression 2026-10-22) | TBD-01 readiness/owner confirmation; demo URLs none exist → no `Live Demo` anywhere (correct) | Per-product demo security assessments before access |
| 6 | Portfolio & case studies | Partial (by design) | `/portofolio` + detail routes; empty state honest; zero published items | Source inspected | TBD-05 consents; zero approved items → publishes nothing | Owner/client consent |
| 7 | Pricing & articles | Partial (by design) | `/harga` TBD state + inquiry path; `pricing_packages` schema supports null price/custom quote; `/artikel` structure complete | Source inspected; e2e executed | TBD-02 values; owner article content | Publishing gate |
| 8 | Contact inquiry + Leads inbox | Complete (local) | `pages/Kontak.tsx`; `POST /api/v1/inquiries`: inquiryInput Zod, honeypot silent-accept, `inquiryLimiter` 5/h/IP, origin+64 KB guard (`public.ts`); `LeadsInbox`/`LeadDetail` triage | Source inspected; Vitest 27/27 + e2e 19/19 executed 2026-10-22 | TBD-09 remainder: consent wording, privacy/retention/data-handling docs **required pre-launch** | Privacy compliance gate |
| 9 | Admin auth & session management | Complete (local). Unverified: production runtime | `http/auth.ts` (opaque token, SHA-256 stored, HttpOnly/SameSite=Lax/Secure-flag, CSRF header gate, login limiter 10/h, bootstrap limiter 5/h), `repo/admin.ts` (scrypt implied by `passwords.ts`, sessions table, `audit_log`), bootstrap single-winner via partial unique index | Source inspected; Vitest executed (incl. concurrent single-winner, lockout, expiry, CSRF) | Sessions currently **SQLite** locally; D1-stored sessions unvalidated (D-18); expired rows rejected but **never purged** (see finding F-5) | D1/Workers runtime |
| 10 | Admin CMS modules & workflows | Complete (local) | `admin/cms.tsx` (8 module views incl. leads + settings; loading/success/error states, filters/search, archive, field mapping fixes — Phase 2B); e2e `admin.spec.ts` 4 specs | Source inspected; e2e executed 2026-10-22 | Owner content; publishing gate discipline upheld | — |
| 11 | API validation, authorization, data access | Complete (local) with one hardening gap | Zod at boundary (`shared`), safe error envelope + `mapDbError` (`http/errors.ts`), `requireAdmin`+`requireCsrf` on admin mutations, IDOR-negative e2e; settings: strict allowlist both directions (`repo/settings.ts`, `publicSettings` strictObject). **Gap:** editorial reads use `SELECT *` (`repo/content.ts`) | Source inspected; Vitest executed | Editorial column projection (F-4) — currently safe (no admin-only editorial columns) | FutureaddColumn leak risk |
| 12 | Database schema, migrations, adapters | Complete (SQLite). Unverified: D1-in-app | `0001_init.sql` (12 tables; CHECKs; UNIQUE slugs; `one_active_admin`); `db/migrate.ts` journal (`schema_migrations`); `seed.ts` draft-only + seed-guard tests; `D1Adapter` thin wrapper — SQL parity proven on 3 spike legs only | Source inspected; spike **environment integration verified** (remote D1, 2026-10-09, spike scope); **no app-context D1 run** | Real-D1 integration tests on a staging DB; no prod D1 exists | Wrangler setup missing (area 17) |
| 13 | Automated tests & manual verification | Complete (local suites) | Vitest 27/27 (last executed 2026-10-22, recorded); Playwright headed 19/19 (fresh `e2e.db`, `--workers=1`, `E2E_NO_SERVER=1`; last 2026-10-22); secret-scan dist each phase | Test executed (cited dates); NOT re-run in this audit (§12) | Tests assert local behavior only | None new |
| 14 | A11y, responsive, console hygiene | Complete (local) | Skip-link, focus-visible, reduced-motion, roles; overflow matrix 360/768/1024/1280; zero `pageerror`/failed-request assertions in specs; screenshots | Test executed + visual confirmed (dated) | Keeping discipline in future phases | — |
| 15 | Security & dependency advisories | Partial | App controls verified (§3 rows 8/9/11); `npm audit --workspaces` executed 2026-10-22: **5 findings (2 critical, 3 moderate)** — tinypool ≤2.1.1 2×critical + @vitest/mocker 2×moderate via vitest@3.1.1 (dev-only); react-router 6.x 2×moderate (SPA/no-SSR posture per Phase 01 audit §5) | Registry lookup executed 2026-10-22; applicability assessed from source | Remediation decision (HA-02); session GC (F-5); IP trust posture (F-6); CSP policy for static host (prod concern) | Breaking-major upgrades need owner ok |
| 16 | Environment config & secret handling | Complete (local discipline) | `.env` gitignored + `.env.example` placeholders; secrets only via env (`config.ts` refuses `[PASTE_`); per-phase dist secret scans (values: 0; `wa.me` prefix = code, no number) | Source inspected; per-phase scans documented | Production secret provisioning (TBD-14 ops) | Never in bundles/logs |
| 17 | Cloudflare Workers/D1 integration | **Not Started** (app runtime) | No `wrangler.{toml,jsonc}` or worker entry under `frontend/`/`backend/` (only `spike/d1-sqlite/spike-d1-worker/`); `SECURITY`/`DEPLOYMENT`/`ARCHITECTURE` document the intended path; D1Adapter written but never executed inside the app | Source inspected; documented only | Workers entry + wrangler config; staging D1; integration/perf tests; isolate-level limiter semantics (F-7) | All prior-point risks (§4 spike "unresolved") |
| 18 | Backup, restore, rollback, recovery | **Not Started** | No backup artifact, no schedule, no rehearsal anywhere; designs D-19/D-21 approved | Documented only | Full pre-prod program (BK-01) incl. measured RPO/RTO | Staging D1 must exist first |
| 19 | Concurrency & production data integrity | Partial | Bootstrap single-winner tested (Vitest, SQLite); invariants rely on portable UNIQUE guards; **D-22 expanded suite not written**: concurrent publish, edit/delete conflicts, migration access, D1-level atomicity | Test executed (subset, SQLite); design only for rest | D-22 full scope pre-prod (CN-01) | D1 environment |
| 20 | Deployment, monitoring, ops readiness, domain | **Not Started** | `DEPLOYMENT.md` options only; no domain (TBD-06 OPEN), no DNS (no changes authorized, D-29), no monitoring/observability plan exists in any doc | Documented only | Everything; gated on owner decisions | TBD-06/11/16 |
| 21 | Content approval & business decisions | Partial (discipline strong) | Draft-by-default + publishing gate enforced in code and tests; seed-guard; hero copy owner-supplied (2026-10-22); all other owner inputs pending (TBD register §8) | Source inspected; tests executed | Owner inputs per D-31 incremental supply | Business decisions gate launch |

## 4. Completed milestones (each backed by dated, executed evidence)

1. **Phase 00 discovery v3** — PRD/decisions/spec docs + persistence spike.
   Evidence: `PHASE-00-PLANNING.md`; `spike/d1-sqlite/RESULTS.md` (three legs
   PASS, remote D1 under explicit owner approval; 10 logged remote commands).
2. **Phase 01 (D-33)** — P1-A…P1-E, milestones M1–M10: workspace, migrations +
   adapters + draft seeds (M2), auth/bootstrap/sessions/CSRF + rate limits
   (M3), public API + allowlists (M4), public pages + responsive (M5), CMS
   modules + publishing (M6), inquiry + Leads (M7), demo-URL states (M8),
   hardening (M9, Vitest 27/27 + Playwright 10/10 headless+headed, secret
   scan), acceptance report (M10). Evidence: `PHASE-01-IMPLEMENTATION.md`.
3. **Phase 2A public refinement** — 13 routes, tokens, components, honest
   states; 14/14 headed; build 259.12 kB. Evidence: `PHASE-02A-PUBLIC-REFINEMENT.md`.
4. **2A follow-up visual polish** — real product screenshots (Kasir+Penginapan
   island), gallery counts 4/3(ERP pending), containment, no source-only leak
   (`KeuanganInvoicePrint.jpg` excluded); 14/14 + environment note (stray
   Chrome processes). Evidence: `…FOLLOWUP-VISUAL-POLISH.md`.
5. **2A ERP asset integration** — ERP Laundry 4 screenshots (sensitivity-
   reviewed), gallery 4/3/4, captions honest; 14/14. Evidence: `…ERP-ASSET-INTEGRATION.md`.
6. **2A hero banner** — owner banner `brand/hero-banner.jpg` (720×900,
   contain, CLS dims, eager); 30rem cap. Evidence: `…HERO-BANNER.md` +
   CHANGELOG. **Asset hygiene** rename `.jpg` (2026-10-13, byte-identical).
7. **Phase 2B admin CMS refinement** — sidebar/nav/main landmark, live-count
   dashboard, ContentList upgrades (states, field-error mapping, archive,
   filters, triage columns), Leads detail inline actions, Settings/Login
   states; admin.spec.ts added; 18/18. Evidence: `PHASE-02B-ADMIN-CMS-REFINEMENT.md`.
8. **2A hero content balance (2026-10-22)** — owner hero copy + 2-CTA
   hierarchy + compact 3-value group; banner 26rem (≈−13%); h1 balance;
   permanent hero-composition regression test; 19/19 headed, Vitest 27/27,
   build CSS 14.09 kB / JS 276.64 kB, `dev.db` integrity re-proven (143,360 B,
   mtime 10/10). Evidence: `PHASE-02A-HERO-CONTENT-BALANCE.md` + CHANGELOG top entry.
9. **Phase 01 post-implementation audit (2026-10-09)** — docs-vs-tree
   verification, reproducibility record, npm-audit applicability triage,
   browser smoke checklist. Evidence: `PHASE-01-POST-IMPLEMENTATION-AUDIT.md`.

## 5. Incomplete & unverified work

- **Cloudflare app runtime (area 17):** Workers entry, wrangler config,
  staging integration — not started. The D1Adapter is source-verified and
  spike-proven at SQL level but has never executed inside the app.
- **D1-backed sessions (D-18):** design approved; behavior/expiry/GC under
  D1 unvalidated. Locally, expired/revoked session rows are never purged.
- **Backups/recovery (D-19/D-20):** RPO ≤ 24 h / RTO ≤ 8 h are **targets**;
  zero backups exist; no restore rehearsal; no rollback drill (D-21).
- **Concurrency (D-22):** only the bootstrap single-winner subset is tested
  (SQLite). Concurrent publish, edit/delete conflicts, migration-access
  scenarios: not written.
- **Production configuration:** no dev/staging/prod D1 resources (D-23),
  no topology (TBD-11), no domain (TBD-06), no DNS (D-29), no
  monitoring/observability plan, no ops runbook (TBD-14).
- **Owner inputs (blockers, not defects):** TBD-01 readiness + demo URLs +
  per-product security assessments; TBD-02 pricing; TBD-03 WhatsApp number/
  template (correctly non-functional today per D-30); TBD-04 final brand
  files/specs; TBD-05 portfolio consents; TBD-07 contact/profile; TBD-08
  wedding scope; TBD-09 consent wording + privacy/retention docs;
  TBD-10 homepage copy beyond the supplied hero; TBD-15 SEO/analytics.
- **Documentation staleness (informational):** Phase-00-era headers in
  `API.md`/`SECURITY.md`/`WORKFLOW.md`/`TESTING.md`/`DEPLOYMENT.md` still
  say "not implemented" for capabilities Phase 01 subsequently built. The
  contradiction is resolved by the changelog/decision/addendum trail (rather
  than rewriting history), but a docs sweep should modernize status headers
  without erasing decision history — low priority.

## 6. What local verification does NOT prove (evidence gaps)

Explicit separation, per the audit ground rules — none of the following is
substantiated today:

1. **Workers/D1 runtime behavior of the actual app** — any claim of
   "production-ready" from Vitest-on-SQLite would be false. Spike evidence
   covers: SQL portability, constraint/error shape, migration apply, seed
   guard, settings projection — on disposable spike data only.
2. **Session semantics under D1/load** (expiry, GC, lock, cookie flags at
   HTTPS) — D-18 validation outstanding.
3. **Rate-limit integrity in production** — in-memory token buckets are
   per-isolate under Workers; budgets do not compose across isolates
   (self-documented in `ratelimit.ts`); also resets on every dev restart.
4. **RPO/RTO** — needs: written backup schedule; executed, timestamped export
   runs with copies stored separately from the source environment; a timed
   restore onto staging D1 with integrity checks; measured RPO/RTO values;
   an owner-authorized restore flow; a rehearsed compensating-migration
   drill. None of these artifacts exists.
5. **Abuse resistance** — inquiry/login limiters and honeypot are only
   locally exercised; spam-farming behavior in a public deployment is
   untested.
6. **Performance/latency and load** — never measured in any environment.

## 7. Findings and risks (classified; confirmed vs potential)

**Confirmed (verified in this audit)**

- **F-1 · Process · Medium — No version control.** No `.git`; the entire
  work product exists as unversioned local files. Any single-disk event is
  unrecoverable; changes have been tracked only by dated reports.
  Remediation is an owner decision (initialization + first commit).
- **F-2 · Dependencies · Medium (dev-only exposure) — tinypool ≤2.1.1, two
  CRITICAL advisories** (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr
  [prototype pollution → RCE gadget in worker/run options]) + `@vitest/mocker`
  ≤4.1.11 two moderates, via `vitest@3.1.1` (backend devDependency).
  Applicability: test tooling only — not shipped in `dist/`, not served;
  realistic exposure limited to running the test suite on trusted machines.
  Fix path: vitest 5.0.5 (breaking major). Confirmed advisory; exposure
  assessment verified.
- **F-3 · Dependencies · Moderate** — react-router 6.x two moderates
  (GHSA-wrjc-x8rr-h8h6 open redirect; GHSA-337j-9hxr-rhxg SSR hydration).
  Not exploitable as built (SPA, no SSR/hydration; all `to` targets static
  literals or server-validated slugs; external links are plain `<a>`) —
  Phase 01 audit §5 posture stands unchanged in 2026-10-22 source. Fix: v7
  major, schedule alongside frontend work.
- **F-4 · Data-access hardening · Low (potential).** Editorial public reads
  use `SELECT *` (`repo/content.ts`). Today every editorial column is
  public-safe and settings already project an explicit allowlist, so no
  leak exists; the risk is future admin-only columns leaking by default.
- **F-5 · Session lifecycle · Low (potential).** `getSession` rejects expired
  rows (`expires_at <= now`) but nothing purges expired/revoked session rows
  (no GC in `repo/admin.ts`); on D1 this both accumulates rows and leaves the
  D-18 GC story unvalidated.
- **F-6 · IP attribution · Low (potential).** `clientIp` trusts
  `x-forwarded-for` (with `x-real-ip`, else `unknown`), which is
  spoofable where a trusted proxy does not sanitize it. In a Workers
  deployment, `CF-Connecting-IP` should be the source; limiter keys inherit
  this weakness until configured per environment.

**Potential risks requiring later verification (unverified, by design):**
D1-stored session behavior; per-isolate limiter composition in Workers (F-7);
no CSP/security-header policy for the static host; response-header suite on
the API currently limited to `X-Content-Type-Options`,
`Referrer-Policy`, `X-Frame-Options: SAMEORIGIN` (verified `app.ts`);
fake-load/perf behavior of D1; abuse resistance at public scale.

**Protected-resource check:** `piple-spike-d1` untouched by this audit (no
Cloudflare command run). Retained spike content (11 `[SEED]` rows) still
awaits its separately-approved cleanup decision.

**No confirmation of any high-severity application defect** in the local
implementation was found in this audit; the strong local test discipline
(27 Vitest + 19 headed e2e, fresh-DB isolation, single-winner atomicity) is
consistent with source inspection.

## 8. Outstanding owner decisions & preserved TBD register

All TBD IDs and original titles are preserved unchanged. Status reflects
2026-10-22 evidence; "owner input required" marks what remains OPEN.

| ID | Title (short) | Status 2026-10-22 | Owner input required? |
|----|---------------|-------------------|-----------------------|
| TBD-01 | Product readiness + demo URLs | OPEN — no readiness change shipped; demo URL absent (no `Live Demo` shown — correct per D-28) | **Yes** (readiness + URLs + access; per-product security gates) |
| TBD-02 | Pricing values | OPEN — null-price/custom-quote UI honest | Yes |
| TBD-03 | WhatsApp number/template | OPEN — placeholder state per D-30; hero uses working `/kontak` instead | Yes (pre-launch) |
| TBD-04 | Brand assets | OPEN — placeholder tokens; owner logo + hero banner in use | Yes (final brand files) |
| TBD-05 | Portfolio approvals | OPEN — zero published items | Yes (consents) |
| TBD-06 | Domain identification | OPEN — localhost only, no DNS (D-24/D-29) | Yes |
| TBD-07 | Contact/profile details | OPEN — TBD-marked copy | Yes |
| TBD-08 | Wedding scope | OPEN — service card + contact CTA only | Yes |
| TBD-09 | Inquiry form + Leads inbox | Scope DECIDED (D-27); **remainder OPEN**: consent wording + pre-launch privacy/retention/data-handling docs | Yes (remainder) |
| TBD-10 | Homepage copy/tagline | Hero copy supplied by owner (2026-10-22); page-level copy approval still OPEN (not silently resolved) | Yes (rest) |
| TBD-11 | Topology + env boundaries | OPEN (host choice; D-23 boundaries design-only) | Yes (pre-prod) |
| TBD-12 | Adapter + migrations | Option A approved + implemented locally (D-17); **D1-in-app validation remains** | No (technical; needs staging env) |
| TBD-13 | Media storage | OPEN (deferred; repo-bundled static) | Owner if uploads/volumes arise |
| TBD-14 | Auth/session/bootstrap | Implemented locally + tested; **runbook + D1 session validation remain OPEN** | Ops provisioning |
| TBD-15 | SEO/analytics | OPEN — no trackers; static meta/sitemap scaffolding only (if at all) | Yes (pre-launch) |
| TBD-16 | Backup/rollback/RPO-RTO | OPEN — targets approved (D-19/D-20/D-21), nothing implemented/rehearsed | Owner-authorized restore flow |

**New owner questions raised by this audit** (not TBD renumbering):

1. **Source control (F-1):** authorize `git init` + first commit of the
   current tree? (No deploy/infra side effects; but it changes the repo's
   baseline, so owner approval is required.)
2. **Dependency remediation (F-2/F-3):** schedule vitest→5 (breaking,
   test-only) and react-router→7 (breaking, frontend internals) or record an
   explicit owner-accepted deferral with rationale.
3. **Acceptance of the finished local UI** (OA-01 decision output) — required
   to unblock the content phase and any deployment prep.

## 9. Readiness assessments (separate, per area)

- **Public website UI — Complete locally / Ready for owner acceptance
  review.** Thirteen routes per sitemap, owner hero copy, honest placeholders
  (no invented prices/testimonials/numbers), responsive + a11y verified.
  Not a production claim: brand tokens, portfolio, pricing, articles remain
  placeholder by design.
- **Admin CMS usability — Complete locally / solid.** Seven modules +
  dashboard, publishing gate, archive, filters, field-error mapping; admin
  specs cover lifecycles. Caveat: settings key set is intentionally frozen
  (KNOWN_SETTINGS); operations under D1 unvalidated.
- **Functional application behavior — Green locally.** 27/27 Vitest,
  19/19 headed e2e (2026-10-22, fresh-DB discipline). These suites exercise
  real frontend+backend+SQLite; they do not exercise D1/Workers.
- **Backend/API security — Strong locally; production-runtime gaps.** Zod
  boundary, safe errors, session+CSRF, limiters, origin/size guards,
  single-winner bootstrap, allowlists, no secrets in bundles. Gaps: F-4/F-5/F-6,
  per-isolate limiter semantics, header/CSP policy for hosting, ops runbook.
- **Database & persistence — Complete for SQLite; Unverified for D1-in-app.**
  Forward-only journal migrations, draft-only seeds, portable SQL. Spike
  proves SQL parity only (explicitly excludes prod load/concurrency).
- **Cloudflare runtime integration — Not started.** No entry point, no
  wrangler config, no env DBs.
- **Recovery & operational resilience — Not started.** No backups, no
  rehearsal, no drill, no monitoring. D-19/D-20 are targets, not guarantees.
- **Production deployment readiness — Not started.** Everything above gates
  it; plus domain (TBD-06), DNS authorization, monitoring, content inputs,
  privacy docs (TBD-09 remainder), WhatsApp config (TBD-03), and per-product
  demo security assessments.

Milestone-based verdict: **Milestone "local product" reached (Phases
00→2B + hero follow-ups). Milestone "production-ready" not entered yet.**
No single percentage is offered (no defensible scoring method exists).

## 10. Prioritized next-step roadmap

Priorities: P0 = do first, removes the key blocker; P1 = required for
production; P2 = launch-quality; P3 = post-launch resilience/ops.

| ID | Pr. | Phase / scope | Task & deliverable | Why prioritized | Dependencies | Acceptance criteria | Required verification | Owner approval | Scope boundaries / side effects |
|----|-----|---------------|--------------------|-----------------|--------------|---------------------|----------------------|----------------|--------------------------------|
| **OA-01** | **P0** | Owner acceptance review (no code) | Owner walks the local site + CMS (checklist basis: `PHASE-01-POST-IMPLEMENTATION-AUDIT.md` §6 + recent screenshots) and gives a recorded decision: accept public+admin UI, or a written refinement list | Two consecutive phases stopped awaiting this; gates content phase (CT-01) and all deploy prep; zero risk | None (servers available :5173/:8787) | A recorded accept/verify decision exists | Owner manual review | **Yes (this is the decision)** | None; do not start other phases until recorded |
| HA-01 | P1 (small) | Phase 2C-1 backend hardening (local) | Code changes: session GC purge (expired/revoked), env-aware client-IP (`CF-Connecting-IP` when configured), editorial column projection (close F-4), limiter note/config for multi-isolate; optional docs status-header sweep | Closes cheapest confirmed/potential findings before staging; no owner inputs needed | OA-01 recommended (question-avoidance) | Vitest 27/27+ (GC/projection tests) + Playwright 19/19 green; no frontend visual change | Full local suites + backend review | Yes (phase kickoff per project precedent) | Backend+tests only; no admin UI/CMS behavior change |
| HA-02 | P1 | Dependency remediation decision (owner) | Execute owner's choice from §8.2: vitest→5.x and/or react-router→7.x majors, or recorded deferral; `npm audit` re-run for the record | Critical-severity advisories on an installed dev tool must not sit unrecorded | OA-01 (decision) | Updated lockfile or a dated deferral record; suites green after any upgrade | Full suites + re-run `npm audit` | **Yes (breaking majors)** | package-lock churn; possible spec adjustments on vitest 5 API |
| CF-01 | P1 | Phase 3 pre-prod Cloudflare/D1 staging integration | Build Workers entry (`createApp` reuse) + wrangler config; **create staging D1** (D-23); apply migrations; run integration/contract tests against staging D1; validate D1Adapter in-app (closes TBD-12 remainder); document env wiring | Largest technical blocker to production; validates every "SQLite-only" assumption | OA-01 + HA-01; owner authorizes staging DB creation | App serves public+admin from staging D1; suites/module tests pass on D1 | Integration tests against staging D1 (not local sim) | **Yes (Cloudflare resource creation)** | Never touches `piple-spike-d1`; no DNS/domain; staging only |
| BK-01 | P1 | Phase 3 backup/restore/rollback program | First scheduled backup + timestamped exports, restore rehearsal on staging with timing, compensating-migration drill, measured RPO/RTO recorded, owner-authorized restore flow | Gates any production migration; substantiates D-19/D-20 targets | CF-01 | Rehearsal log with measured RPO/RTO + restore evidence + runbook doc | Executed drill on staging | Owner-authorized restore flow; kickoff approval | Staging resources; never prod |
| CN-01 | P2 | Phase 3 concurrency suite (D-22 full) | Write+run D-22 expanded tests at staging level: concurrent publish, edit/delete conflicts, migration access, bootstrap race re-verified on D1 | Required before multi-actor data risk exists in prod | CF-01 (ideally after BK-01) | Suite green on staging D1 with evidence log | Executed on staging D1 | Kickoff approval | Backend+tests; staging only |
| CT-01 | P2 | Phase 4 content & integration phase | Owner inputs land per D-31: TBD-01 readiness/URLs (+per-product security assessment), TBD-02 pricing, TBD-03 WhatsApp + verify by test message, TBD-04 final brand tokens, TBD-05 portfolio consents, TBD-07 profile, TBD-08 wedding scope, TBD-10 remaining copy, TBD-09 consent/privacy/retention docs; publishing-gate review before anything goes public | Launch blocker; D-31 incremental supply | OA-01 accept + H* / owner inputs | Draft→publish transitions pass gate; privacy docs exist; zero unverified claims public | Headed e2e + content-integrity pass | Owner supplies all inputs; gate sign-off | CMS content + `data.ts` minor; no API change |
| SEO-01 | P2 | TBD-15 decision + impl-lite | Owner decides SEO/analytics; implement static meta/sitemap accordingly (no trackers without approval) | Pre-launch polish | CT-01 | e.g. prerender/meta tags + sitemap.xml; no analytics without consent decision | Build + manual check | Yes (analytics choice) | Frontend only |
| DP-01 | P3 | Phase 5 deployment gate review → production | Readiness review against DP checklist (topology TBD-11, prod D1 + bindings, monitoring/ops plan, domain TBD-06 + explicit DNS authorization, WhatsApp test-message verify, launch content) then deploy, then post-deploy smoke | Only after all gates | CF-01+BK-01+CN-01+CT-01+SEO-01 | Checklist all-green; live smoke passes | Production verification (post-deploy) | **Yes, per item (DNS/billing/secrets/domain)** | First production resource creation happens here |

**Recommended immediate next step: OA-01 (owner acceptance review).**
Rationale: it is the smallest safe step, requires no code/data change, and
unblocks the two work streams that currently have no other path (owner
content CT-01; any deployment prep). Financial/security work (HA-01,
HA-02, CF-01) is technically independent but should follow the owner's UI
decision so any required UI rework can be planned against a fixed baseline.

## 11. Recommended immediate next action (detail)

Ask the owner to record an acceptance decision on the finished local build:

- **Public:** `/`, `/tentang`, `/layanan`(+ 7 details), `/produk`(+3),
  `/portofolio` (empty-state), `/harga`, `/artikel`, `/kontak`, `/privasi`
  at 360/768/1280 widths; check the new hero copy/CTA rendering.
- **Admin:** `/admin/login`; dashboard counts; one create→publish→unpublish→
  archive→delete lifecycle per representative module; Leads triage; Settings.
- **Decision outputs:** (a) accepted → authorize CT-01 content phase;
  (b) refinement list → schedule a focused follow-up phase (items become the
  spec); (c) answers to §8.1–8.2 (git init; dependency majors).
- During review, WhatsApp remains placeholder (correct per D-30); leads go
  only to the local Leads inbox; nothing is deployed by pressing anything.

## 12. Verification limitations & evidence gaps (this audit)

1. **Tests re-run: no.** Vitest/Playwright/build were not re-executed (they
   write DB files / dist / need running servers — excluded by read-only
   rules). All suite results are cited from dated phase reports (most recent
   2026-10-22 for the 19/19 headed run and 27/27 Vitest) and from counted
   test files verified today; the same-day date keeps the evidence gap
   backend/e2e evidence (same working day).
2. **`.env` deliberately not read** (secret values never exposed).
3. **Databases not opened**; `dev.db`/`e2e.db` states inferred from file
   listing + prior phase integrity proofs.
4. **Cloudflare resources not inspected** — protected by design; D1
   posture is documented-spike-only.
5. **Not a git repo** — no history comparison possible; audit observed only
   current file state.
6. **npm registry reachability** assumed for the advisory lookup; results
   reflect the registry as of 2026-10-22.
7. **Manual visual review**: recent screenshots were inspected in prior
   phases by their responsible agents; this audit verified file existence
   and regression-test coverage, not pixels.
8. **No claim of production verification exists anywhere in the project** —
   none should be inferred from this report.
