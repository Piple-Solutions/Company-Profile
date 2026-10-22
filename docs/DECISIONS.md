# Decision Log — PipleSolution (Phase 00 Discovery v3)

> Last updated: 2026-10-09 — v3 revision + spike/finalization addenda + owner approval record (D-17–D-25) + latest owner decisions (D-26–D-32). Proposed defaults are never decisions. D-17–D-32 below are separately approved owner decisions recorded in scope; spike and finalization entries are evidence records and PROPOSALS unless marked [APPROVED] below.

## D-01 — Brand & business (CONFIRMED)
PipleSolution; software house + digital product provider; mixed market. Source: owner v2 brief.

## D-02 — Website goals (CONFIRMED)
Credibility, leads, services showcase, product marketing. Source: owner v2 brief.

## D-03 — Language & conversion (CONFIRMED)
Public language Bahasa Indonesia; WhatsApp primary CTA. Inquiry form + Leads inbox PENDING explicit owner approval with no default chosen — see TBD-09 (corrected in v3 D-14; Phase 01 scope since INCLUDED per D-27, remainder OPEN). WhatsApp number/message-template configuration — see TBD-03 (deferred per D-30). Source: owner v2 brief + v3 review + latest decisions.

## D-04 — Services catalog [HISTORICAL wording — SUPERSEDED by D-10; do not use]
The "8 categories" wording below is retained for history only and is superseded by D-10. Active taxonomy: 7 commercial categories (D-10).
Historical text: 8 categories incl. mobile (native + cross-platform) and wedding planning as a service (not a digital product). No packages/prices invented. Source: owner v2 brief. v3 correction: portfolio/case studies removed from this taxonomy — see D-10 (7 commercial categories + standalone Portfolio).

## D-05 — Product catalog (CONFIRMED with TBD statuses)
3 products named; mixed readiness confirmed; per-product status TBD-01; status vocab proposed only. Source: owner v2 brief.

## D-06 — Pricing visibility (CONFIRMED principle, TBD values)
Public display confirmed; values TBD-02. No invented prices. Source: owner v2 brief.

## D-07 — CMS scope & roles (CONFIRMED; CLARIFIED by D-14 in v3)
7 modules (Services, Products, Portfolio, Articles, Leads, Pricing, Settings); single Super Admin; draft/published + soft-delete are recommendations. Source: owner v2 brief. v3 clarification: Services manages only the 7 commercial categories (D-10); Leads inbox since INCLUDED in proposed Phase 01 scope (D-27, supersedes the D-14 pending posture — history preserved).

## D-08 — Visual & stack direction (CONFIRMED direction, TBD details)
Light clean corporate; React+TS+Vite / Hono+TS / Zod / SQLite-local / D1-prod / Workers / Vitest+Playwright. Adapter, topology, media, auth, SEO, backup pending TBD-11–16. Source: owner v2 brief + Agent 1 validation.

## D-09 — Brand assets & domain (CONFIRMED status: outstanding)
Assets stated available but uninspected (TBD-04); domain undecided (TBD-06). Source: owner v2 brief.

## Contradictions register
- 2026-10-09: No prior repo documents found (empty dir, not a git repo), so no contradictions resolvable at file level. If external earlier docs conflict (service counts, assigned statuses, multi-role CMS, English site, invented prices), append here with source + resolution before Phase 01.

## v3 owner review decisions (2026-10-09 — the only new authorized decisions)

### D-10 — [APPROVED] A. Commercial service taxonomy corrected
Portfolio and case studies are NOT commercial service categories. The 7 commercial categories are: website company profile; website development; mobile development (native + cross-platform); custom systems; POS systems; ERP; wedding planning service. Portfolio is a standalone public section (listing + detail) using the separate Portfolio resource. Incorrect `/layanan/portfolio-case-studies` route removed; sitemap, service counts, API resources/validation, DB category constraints, CMS service management, and tests synchronized. Status: APPROVED and applied across docs.

### D-11 — [APPROVED] B. SQLite ↔ D1 technical spike (mandatory prerequisite; EXECUTED — see addendum)
A runnable-code spike proving the DB abstraction + migration strategy on both SQLite-local and Workers-compatible D1 is mandatory before backend persistence is finalized (coverage: init+migrations, CRUD, schema/types, constraints/errors, reproducible verification, difference record; criteria in `ARCHITECTURE.md` §3.4, TBD-12). All adapter/migration choices stay proposed/pending until proven. Phase 00 stays docs/planning; full Phase 01 must not begin until planning approval + technical prerequisites are satisfied. Status: APPROVED as a prerequisite; spike designed only, NOT executed — no code, deps, migrations, or Cloudflare resources created in this revision.
Addendum 2026-10-09 (evidence, not a new approval): spike EXECUTED after v3 — `spike/d1-sqlite/` harness + remote `piple-spike-d1` (APAC); all six §3.4 criteria PASS on SQLite-local, local-D1 sim, and real remote D1 (`spike/d1-sqlite/RESULTS.md`). Prerequisite satisfied; persistence finalization (D-16) still pending owner + Agent 2 approval; TBD-12 stays OPEN until that sign-off.

### D-12 — [APPROVED] C. Settings API public allowlist
Public settings responses expose only an explicit allowlist via a strict schema (never whole records/generic JSON); internal config, secrets, credentials, session/security settings, and private CMS config are never publicly exposed; admin settings endpoints require Super Admin auth; validation + safe defaults + leak-proving tests required; no secrets in frontend bundles/public env. Synchronized across `API.md`, `DATABASE.md`, `SECURITY.md`, `ARCHITECTURE.md`. No business settings/credentials invented. Status: APPROVED as a requirement; contract documented, NOT implemented.

### D-13 — [APPROVED] D. Super Admin bootstrap & recovery lifecycle
Secure lifecycle documented (not implemented) covering: single-use bootstrap at zero admins; config/secret handling via server env/runbook; password hashing/verification; rate limiting/lockout; session/cookie + CSRF; owner-authorized recovery with audit; no public registration; empty-vs-bootstrapped safe behavior; local vs production ops docs. Placeholders only, no hardcoded secrets. Unverified platform capabilities marked pending. Synchronized across `SECURITY.md`, `API.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, `WORKFLOW.md`. Status: APPROVED as a plan; NOT implemented.

### D-14 — [NOT APPROVED] E. Inquiry form + functional Leads inbox remain PENDING
The owner has NOT approved the inquiry form, and has NOT approved launching the MVP without a form as a final decision. WhatsApp remains primary regardless. Inquiry form + functional Leads inbox stay PENDING explicit owner approval (TBD-09): no form/Leads-inbox/API/table implemented in this revision; Leads module is a data-model placeholder with no functionality; no assumed or default decision (v2 "WhatsApp-only default" phrasing withdrawn as a decision). Status: PENDING owner approval — not approved, not rejected, not out of scope.
Note 2026-10-09: scope for Phase 01 since decided by D-27 (INCLUDED with owner-specified fields/exclusions; history above preserved); remainder (consent wording, pre-launch privacy/retention docs) stays TBD-09 OPEN.

### D-15 — [APPROVED] F. Unverified content remains draft
No unverified business information (readiness/availability, prices/packages, portfolio/screenshots/client claims, address/contact/profile claims, testimonials/metrics/outcomes) may be published as factual content: stays Draft/non-public; public APIs return only eligible published content; nothing invented; TBDs explicit; editorial `status` vs product `readiness` distinct; no auto-publish via defaults/seeds; review/publishing gate + leak-proving tests required. Product names retained as owner-provided; readiness states unconfirmed. Status: APPROVED and applied (draft-by-default + seed-guard + gate).

### D-16 — [PROPOSED] Persistence architecture finalization (pending owner + Agent 2 approval)
Evidence-based proposal in `docs/PERSISTENCE-DECISION.md`: one shared SQL migration source (proven on 3 legs), async repository/port + env adapters (raw-SQL pattern proven; library choice still open), journal-tracked forward-only migrations, env-separated config (new dedicated prod D1 — never the spike DB), `[SEED]`-only draft isolation, and an adapter-boundary normalization layer for SQLite/D1 API + error differences. Explicit non-claims: production readiness, concurrency, backup/restore, sessions, ORM behavior. Remaining choices (§5 of the package: adapter library, session store, backup/RTO-RPO, rollback runbook, concurrency tests, prod boundaries) with blocking scopes; TBD-12 closes only at approval sign-off, not here. Status: PROPOSED — no approval invented.

## Owner-approved decisions (recorded 2026-10-09 — explicit owner approval of the decision summary)

### D-17 — [APPROVED] Adapter architecture (TBD-12): Option A, hand-rolled thin repository
Async repository/port interface with environment-specific adapters for local SQLite and Cloudflare D1; no ORM for MVP. Design approved; implementation and library-free operation remain to be built and validated. Status: APPROVED (design).

### D-18 — [APPROVED] Authentication session store (TBD-14): Option A, Cloudflare D1
Super Admin sessions stored in Cloudflare D1. Design approved; session behavior under load, expiry/GC semantics, and cookie/session integration remain unvalidated until implemented and tested. Status: APPROVED (design).

### D-19 — [APPROVED] Backup and recovery (TBD-16): Option B, scheduled backups + rehearsals
Scheduled backups, separate backup copies, documented restore procedures, and recovery rehearsals. Design approved; no backup exists, no restore has been rehearsed. Status: APPROVED (design).

### D-20 — [APPROVED] Recovery targets: RPO ≤ 24 hours, RTO ≤ 8 hours (TBD-16)
Owner-approved TARGETS, not achieved guarantees. No measurement, rehearsal, or production system exists to demonstrate them. Status: APPROVED (targets).

### D-21 — [APPROVED] Migration rollback (TBD-12/TBD-16): Option C, compensating migrations + backup restoration
Compensating migrations for appropriate schema corrections combined with backup restoration for incidents requiring data recovery. No down-migrations. Design approved; runbook untested. Status: APPROVED (design).

### D-22 — [APPROVED] Concurrency verification (TBD-12/TBD-14): Option B, expanded tests
Expanded tests covering bootstrap single-winner, concurrent publish, edit/delete conflicts, data integrity, and concurrent migration access where relevant. Scope approved; no such tests have been written or run. Status: APPROVED (scope).

### D-23 — [APPROVED] Environment boundaries (TBD-11/TBD-16): Option A, separate D1 resources
Separate D1 resources for development, staging, and production. `piple-spike-d1` is spike-only and must never become any of them. Design approved; no staging/production databases exist. Status: APPROVED (design).

### D-24 — [APPROVED] Domain direction: use a business-owned domain, exact domain pending
Production uses a domain already owned by the business. The exact domain remains unspecified — do not infer it. No DNS changes authorized. TBD-06 stays OPEN pending identification. Status: APPROVED (direction).

### D-25 — [APPROVED] Phase 01 authorization: Option C — NOT approved to start
Wait until all required technical and architectural decisions are finalized. Phase 01 implementation is NOT approved to start. Status: APPROVED (gate).

## Latest owner decisions (recorded 2026-10-09 — D-25 remains in force; no implementation authorized)

### D-26 — [APPROVED] Phase 01 gate reaffirmed — D-25 stays closed
Phase 01 remains on hold until the relevant technical decisions and prerequisites are finalized. This task records decisions and re-audits readiness only; it does not authorize implementation, lift D-25, or change D-25's status. A readiness report may recommend the gate for owner review. Status: APPROVED (gate reaffirmed).

### D-27 — [APPROVED] Inquiry form + Leads inbox INCLUDED in proposed Phase 01 scope (supersedes earlier exclusion posture)
Supersedes the earlier pending/excluded posture for Phase 01 (v3 D-14 pending; readiness report's conditional scope) — history preserved, not erased. Approved minimum: public inquiry form (name, email, optional company, service of interest, project description); server-side validation + safe errors; persistent storage via the approved repository/database architecture (D-17); authenticated Super Admin-only Leads inbox (view details, update status); basic spam + repeated-submission protection; NO automated email or WhatsApp integration in Phase 01; NO public access to the inbox or unauthorized lead records. Privacy, retention, and data-handling requirements must be documented before public launch. TBD-09 stays OPEN for the undecided remainder (consent wording, pre-launch privacy/retention docs). Status: APPROVED (Phase 01 scope).

### D-28 — [APPROVED] Product demo links deferred; external URLs only (TBD-01)
The three products integrate later, after demo URLs are supplied. The website must NOT copy or embed product source code. Approach: each product deployed and maintained separately; product cards support a configurable external demo URL with states such as `Coming Soon`, `Live Demo`, `Request Demo`; no `Live Demo` label until URL + access verified; missing URLs never replaced with fabricated links; local development/review may proceed without URLs. Demo security, dummy data, access restrictions, and production-data isolation assessed per product before public demo access. The three product projects were not inspected, imported, redeployed, or modified. Status: APPROVED (deferred integration).

### D-29 — [APPROVED] Domain deferred; localhost/dev placeholders (TBD-06)
Exact domain remains deferred (reaffirms D-24 direction: business-owned, unspecified). Local development uses localhost or clearly identified development placeholders. No DNS changes or domain purchases authorized. TBD-06 stays OPEN. Status: APPROVED (deferral).

### D-30 — [APPROVED] WhatsApp contact deferred; configurable component + dev placeholder (TBD-03)
Number and message template deferred until supplied. The website may prepare a configurable contact component and a development-only placeholder state. No invented numbers, no fake production contact, no production WhatsApp link without verified configuration. TBD-03 stays OPEN. Status: APPROVED (deferral).

### D-31 — [APPROVED] Content supplied incrementally; draft-by-default reaffirmed (TBD-01/02/04/05/07/08/10)
Owner provides/finalizes product info, assets, URLs, and business content later. Documentation accepts incremental supply. Nothing invented (pricing, capabilities, readiness, portfolio, testimonials, metrics, contact details). Unverified content stays draft/non-public until owner review + approval (reaffirms D-15). Status: APPROVED (content posture).

### D-32 — [RECORDED] Architecture verification outcome: decided vs still-pending-validation
Owner belief checked against the log: DECIDED as design — thin async repository + env adapters (D-17, pattern proven by spike), D1 sessions (D-18), separate dev/staging/prod D1s (D-23), backup Option B (D-19), RPO/RTO targets (D-20), rollback Option C (D-21), concurrency scope Option B (D-22), out-of-band high-entropy bootstrap (D-13 + v3 corrections). STILL PENDING VALIDATION (implementation-time or pre-prod, not approved as complete): repository/adapter build, session behavior, first backup + rehearsed restore, rollback drill, concurrency suite, env DB creation, restore authorization flow. `piple-spike-d1` retained as spike-only reference. Status: RECORDED (verification — creates no new approval).

### D-33 — [APPROVED] Phase 01 gate OPENED — implementation authorized per approved scope
The owner has explicitly approved opening gate D-25 and proceeding with Phase 01 per the readiness assessment (D-26 superseded as a hold; history preserved). Authorized scope: P1-A–P1-E as proposed (public site ID, persistence Option A, admin/auth/settings + Leads inbox per D-27 fields, external demo URLs per D-28, hardening/tests), honoring all prior decisions (D-01–D-32), TBD placeholders where inputs deferred, no invented content/numbers/links, `piple-spike-d1` untouched, no production deploy/DNS/billing without separate authorization. Status: APPROVED (authorization).

## Phase 2D frontend completion decisions (recorded 2026-10-22 — recorded under the owner's Phase 2D directive; all earlier decisions remain preserved and in force)

### D-34 — [RECORDED] Local Git baseline created before Phase 2D modifications
The repository had no version history. Per the Phase 2D directive ("safe local Git baseline procedure before substantial modifications"), the exact as-found working tree was committed as baseline `9a9eb41` before any edit. Local history only; no push, no rewrite of anything, no deployment semantics. Status: RECORDED (phase 2D execution).

### D-35 — [RECORDED] SQLite WAL sidecars untracked (`*.db-shm` / `*.db-wal`)
Baseline review found `dev.db-shm/-wal` and `e2e.db-shm/-wal` tracked (the `*.db` ignore rule does not match sidecars). Rule extended and the four files untracked via `git rm --cached` — files on disk untouched, no commit contains their future churn. Status: RECORDED (phase 2D execution).

### D-36 — [APPROVED] Public truthfulness: fetch failure must never read as "coming soon"
Portofolio, Harga, and Artikel lists gained distinct loading, error ("Gagal memuat …"), and empty (genuinely zero published rows) states, mirroring the existing Produk pattern. D-28/D-31 honesty posture applied to states, not just content. Status: APPROVED (Phase 2D scope).

### D-37 — [APPROVED] CMS content form grouped for comprehension without breaking the selection contract
Fieldset/legend grouping (Identitas / Isi / module-specific group / Publikasi) with `*`-marked required fields and one hint line; input DOM order and all asserted labels/names preserved (positional e2e selectors still hit slug as input[0] and title as input[1]); submit buttons enter an honest busy state ("Menyimpan…", disabled). Status: APPROVED (Phase 2D scope).

### D-38 — [RECORDED] Admin status/state keys stay raw English (e2e contract + triage unambiguity)
`draft/published/archived/new/in_progress/closed/readiness` badges keep their exact keys (asserted by permanent e2e). Translating them needs a coordinated UI+test change and an explicit owner decision; deferred deliberately. Status: RECORDED (deferral; revisit on owner request).

### D-39 — [APPROVED] Dashboard data semantics: real counts, visible failure, draft dimension
Dashboard shows live per-module `Total · Draft` (existing `?status=draft` API param) plus a dedicated new-leads card (existing `?state=new`); a failed summary load renders an explicit role="alert" error instead of ambiguous "—" placeholders. No invented or fake metrics. Status: APPROVED (Phase 2D scope).

### D-40 — [RECORDED] Published-row public review links + honest sessions/messaging in the admin client
Published CMS rows expose "Lihat publik" to their real public route (pricing → `/harga`, no per-item public URL); 401 responses across admin mutations render "Sesi berakhir. Muat ulang halaman lalu masuk kembali." instead of generic failures (client-side mapping only; no backend/auth-behavior change). Status: RECORDED (phase 2D execution).

### D-41 — [APPROVED] Admin workspace adopts the public design language (R1 presentation-only refinement)
Phase 2D-R1 (owner verdict "UI admin masih polos"): the admin CMS now mirrors the public system — real brand lockup in a sticky elevated sidebar panel, accent-keyed active nav pill (chip row ≤900px), rhythmic main grid with hairline page heads, stat typography, leads/settings card keys, chip toolbars, uppercase roomy table headers with hover and first-column emphasis, outline-accent Publish/Proses emphasis, and a centered brand login card on the surface band. Scoped to admin presentation classes (`.admin-*`, `.toolbar`, `.table-wrap`, admin-scoped `table.data`/`.badge` rules); public primitives (`.btn`, `.badge` base, hero/2A work) untouched; every e2e-asserted aria-label/name/text and input order preserved (permanent suite re-passed 19/19 unchanged). Login-page surface band paints only `/admin/login`. No backend, shared-contract, DB, dependency, or infra changes. Status: APPROVED (Phase 2D-R1 scope).

### D-42 — [APPROVED] Modern light SaaS workspace: R2 admin redesign (composition + system, frontend-only)
Phase 2D-R2 (owner verdict on R1: "terasa seperti website kuno dari awal tahun 2000-an"; direction: predominantly white/bright/professional, no dark mode, changes beyond colors/radii/shadows). The admin viewport becomes a bounded application workspace: an admin-scoped very light neutral canvas (`#f7f9fc`, public `--bg` white untouched) with a fixed 16.5rem white sidebar (brand lockup + CMS chip, grouped icon navigation — Dasbor / "Kelola konten" / "Operasional" — accent active pill, bottom account block; ≤940px chip band); one white panel per concern — content pages split into a sticky form column beside an integrated list panel (filter bar in the panel head, table, empty state), settings mirrors (table grows, edit form fixed right), leads/lead-detail are single record panels; dashboard gains a stat band (Total konten/Konsep/Leads baru — **sums derived arithmetically from the already-fetched real API counts, no invented data**) above the module card grid with brand-tinted icon chips; tables get uppercase micro-headers, dot status pills (green/amber/neutral/blue text-tone pairing), a bounded right-aligned AKSI column whose compact buttons flow into ≤3 groups (ghost neutral / accent-outline Publish+Proses / danger-outline Hapus); forms get uppercase legends, 0.88rem/600 labels, focus-ring inputs, primary/secondary action tiers; page heads carry the `Total:` counter as a quiet pill; boot/login resolve on a full-height neutral canvas (`Memuat…` no longer a bare flash). Raw status keys stay English per D-38; all e2e-asserted names/labels/text/input order preserved (permanent suite 19/19 on final code). Known tradeoff: on narrow desktop widths content-list tables scroll horizontally inside their panel (page-level overflow stays 0px at 360–1280). No backend, shared-contract, DB, dependency, infra, or public-page changes. Status: APPROVED (Phase 2D-R2 scope). (**Phase 2D-R3 supersession note**: the R3 owner revision replaces R2's permanently visible forms/module-card grid with modal create/edit and an operations dashboard; the R2 shell — sidebar, canvas, tables, pills, panels — is retained.)

### D-43 — [RECORDED] Admin modal convention: native <dialog> create/edit + settings allowlist-union edit modal (R3)
Owner revision demanded that create forms no longer live beside/above lists. Convention (frontend-only): each content list leads with a full-width `+ Tambah Data` band that opens ONE reusable native `<dialog>` per page (`showModal()` = real focus trap, Escape, inert background), carrying the already-grouped form (labels, DOM order, validation, endpoints untouched). Create vs edit are distinguishable by dialog title (`Tambah data` vs `Ubah: {slug}`) AND primary action (`Tambah` vs `Simpan`); `Batal`, close-×, and Escape all abort without persisting. Busy contract: while a save is in flight the submit shows `Menyimpan…` DISABLED, an early-return guards duplicate submits, and Escape/×/Batal are disabled or preventDefault'd — the modal cannot be dismissed mid-save (e2e proves a route-delayed POST raced twice by a forced second click resolves exactly 1 create request). Save errors render INSIDE the dialog (the page is inert/AX-hidden while it is open); success closes it, keeps the page-level notices, and preserves active filters. Settings is edit-only (the allowlist has no create): its table renders the **allowlist union** — the 4 contract keys the form select already exposed — where stored rows show value/public flags and unstored keys show an explicit `—` (zero vs not-stored stays distinguishable); every row opens the same modal prefilled from the row, PUT remains an upsert. Leads deliberately has no modal (no manual create exists; records arrive only via the public contact form). No backend, contract, or DB changes. Status: RECORDED (Phase 2D-R3; pending owner review).

### D-44 — [RECORDED] Operations-dashboard data semantics: meta.total fan-out, completeness-guarded trend, no ticker (R3)
Dashboard figures derive ONLY from existing endpoints (no `summary` API exists; backend contract frozen this phase): per-module totals from `admin.list(module)` `meta.total`; per-status counts from `?status=published|draft|archived&per_page=1` `meta.total` (row arrays paginate at per_page 20..100 — they are NEVER counted client-side); leads: `?state=new|in_progress|closed&per_page=1` for the distribution, plus one `?per_page=100` unfiltered call serving (a) the leads total, (b) the 5 newest leads (server-ordered `created_at DESC`) with real `/admin/leads/:id` detail links, and (c) a 7-day bar chart built from real `created_at` dates — rendered ONLY when `rows.length === meta.total` (provably complete); if truncated, the chart is replaced by an explicit explanatory note, never an undercounted chart. Zero figures delivered by a loaded API (e.g. Konsep = 0) are truthful zeros; failed fetch groups render per-panel error states with `Coba lagi` retry and `—`/… placeholders — the dashboard never fabricates and never silently presents unavailable data as zero. No activity ticker exists because audit_log is written on every mutation but has no read endpoint (a read endpoint is the honest backend follow-up, not a client-side fabrication). Status: RECORDED (Phase 2D-R3; pending owner review; a future `summary` endpoint can collapse the ~24 tiny GETs).
