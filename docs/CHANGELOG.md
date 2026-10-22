# Changelog — PipleSolution

Phase 00 entries are documentation-only. Phase 01 entries record local implementation + verification (no production deployment).

## [phase3a-review — 2026-10-22] Phase 3A: detailed audit review, idempotency design, SQLite/Cloudflare assessment (read-only)
### Added
- New report `docs/phases/PHASE-3A-DETAILED-AUDIT-AND-ARCHITECTURE-REVIEW.md`: all 23 Phase 3 findings reviewed by workstream without renumbering or omission; evidence/status/severity/blocker/dependency/remediation/acceptance/change-class/owner-gate recorded per finding.
- Idempotency design and acceptance matrix: backend requirement separated from disabled-button/UI controls and ordinary DB constraints; covers inquiry creation, CMS creates, bootstrap/recovery, updates/deletes/settings, and future side effects; defines same-key/same-payload, different-payload, concurrency, crash/lost-response, retention/expiry, and authorization-scope behavior; proposed schema changes are marked future-approval-only and not applied.
- SQLite/Cloudflare architecture assessment: local SQLite vs Workers + D1 adapter readiness, transactions, migrations, concurrency, sessions, SQL/runtime differences, frontend API reachability, environment configuration, docs alignment, and historical-only status of `piple-spike-d1`; real-D1 staging proof list recorded.
- Revised dependency-aware sequence: A1, B1, C1, I0/I1, A2, I2/I3, B2, C2/C3, C4, D1–D5, with A3 required before D5; owner decision gates and unverified assumptions/production blockers listed.

### Verification
- Backend Vitest re-run: **27/27 passing** (5 files); backend `tsc --noEmit` passes. No frontend E2E, real-D1, `npm audit`, deployment, or Cloudflare resource operation was performed.

### Not changed
- No application code, tests, dependencies, lockfiles, schemas, migrations, seeds, databases, environment files, secrets, DNS, or infrastructure changed; no commit, push, deploy, or resource creation. TBD-01–TBD-16 and all historical decisions remain in force; Phase 2D-R3 remains owner-review pending.

## [phase3-audit — 2026-10-22] Phase 3: read-only backend & integration readiness audit (no code/infra changes)
### Added
- New report `docs/phases/PHASE-3-BACKEND-READINESS-AUDIT.md`: evidence-based audit of frontend/API integration, auth/bootstrap/recovery/sessions/CSRF/authorization, validation/rate limiting/proxy trust/abuse prevention, repository/SQLite/D1/migration/transaction/concurrency behavior, DB integrity/soft deletion/retention/publication consistency, backup/restore vs RPO/RTO targets, test coverage, dependency advisories, Cloudflare/D1 readiness, and docs-vs-implementation drift. 23 findings recorded: **3 critical, 6 high, 12 medium, 2 low**, each with severity/status/evidence, blocker level, remediation, and test approach.
- Prioritized A/B/C/D proposal: A) HA-01 local backend hardening, B) HA-02 dependency compatibility/upgrade decision, C) frontend/API integration + regression verification, D) separately gated Cloudflare/D1 production readiness (CF-01/BK-01/CN-01/DP-01). Owner-approval flags and smallest safe batches are explicit.
### Verified
- Backend Vitest **27/27 PASS** and `tsc --noEmit` PASS re-run (in-memory SQLite only). Prior R3 Playwright 19/19 cited, not re-run. OSV advisory lookup by exact installed version (npm audit timed out; no installs). Working tree clean at `89ce5db`.
- No application/test/dependency/lockfile/schema/migration/seed/DB/env/infrastructure change; `dev.db`, `e2e.db`, and `piple-spike-d1` untouched; `.env` not read; no deploy/push/Cloudflare/DNS operation.
### Not changed / next
- No remediation, upgrade, or staging/production action. Stopped for owner review and explicit approval of A1/B1 (and subsequent C/D gates). Phase 2D-R3 remains owner-review-pending; TBD-01…TBD-16 preserved.

## [phase2d-r3 — 2026-10-22] Phase 2D-R3: admin create/edit modals + operations dashboard (frontend presentation only)
### Changed (see `docs/phases/PHASE-2D-R3-ADMIN-MODALS-DASHBOARD.md` for the pre-written art direction + final results)
- **Modal create/edit (D-43)**: the permanently visible create forms are gone from Services/Products/Portfolio/Articles/Pricing; each list now leads with a full-width `+ Tambah Data` band that opens a native `<dialog>` (real focus trap, Escape, inert background) with scrollable body + pinned footer (`Batal` ghost / primary `Tambah`-vs-`Simpan`). Row `Ubah` reuses the same dialog prefilled (`Ubah: {slug}` title). Create vs edit are distinguished by title AND primary label. While saving, the dialog cannot be dismissed (`Menyimpan…` disabled state), failures render inside the modal, success closes it with the page-level notice and preserves filters. Settings gets the same edit-only modal (no invented create) opened per row — the table now renders the **allowlist union** (the 4 contract keys the form already exposed), showing `—` for keys not stored yet (D-43). Leads stays modal-free (no manual create exists).
- **Dashboard (D-44)**: four reconciled KPI tiles (Total konten / Published / Konsep / Leads baru with per-tile reconstitution subtitles), per-module status visualization (native CSS stacked bars published/draft/arsip + per-status counts, aria-labeled), leads distribution bars (new/in_progress/closed) + completeness-guarded 7-day bar chart built from real `created_at` data, full-width `Leads terbaru` table of the 5 newest real leads (with working `Detail` links), and a `Tindakan cepat` chip row replacing the R2 module-card grid. Every figure comes from existing endpoint `meta.total`/rows (per-status `?status=…&per_page=1` / `?state=…` fan-out); unavailable data renders as explicit per-panel error states with `Coba lagi`, never a fabricated zero. No activity ticker (audit_log has no read endpoint — documented as follow-up); `Hanya konten` desc and D-38/D-30 behavior unchanged.
- Public images: `fetchPriority` prop fixed to rendered `fetchpriority` (removes React's dev-only "does not recognize" console error; no visual/behavior change).
### Verified
- `tsc --noEmit` + `vite build` PASS (CSS 29.34 kB, JS 294.12 kB); backend Vitest 27/27 PASS; Playwright headed permanent suite **19/19 PASS** (fresh backend process + fresh `e2e.db`, `--workers=1`, `E2E_NO_SERVER=1`), including the extended admin contract: modal open/close, in-dialog focus, Escape-close without persisting, create-cancel discarding, in-modal validation alerts, a route-delayed POST raced twice by a forced second click resolving **exactly 1 create request**, and the settings modal flow. Temp evidence spec (deleted after): console/failed-request audit clean with both anonymous `/admin/auth/me` probes the only 4xx (documented class); admin overflow **0px at 360px** on /admin, /admin/products, /admin/leads, /admin/settings; screenshots `r3-dashboard-1280/390`, `r3-modal-create-products-1280/390`, `r3-modal-create-pricing-1280`, `r3-modal-edit-settings-1280` visually inspected (also caught + fixed: desktop KPI band wrapped 3+1 before a 4-column ≥1080px rule; mobile screenshot raced the loader before a loaded-state wait). `dev.db` untouched across the phase (all destructive testing on throwaway `e2e.db`, gitignored).
### Not changed
- Backend source/behavior, shared contracts, DB schemas/migrations/seeds/content, auth/session logic, dependency versions/lockfiles, public page behavior (image markup attribute-spelling fix only), product projects, Cloudflare/DNS/deployments: untouched. Stopped for owner review of the R3 revision (R2 presentation superseded in-admin only; D-42 shell retained).

## [phase2d-r2 — 2026-10-22] Phase 2D-R2: modern light admin UI redesign — SaaS workspace composition (frontend presentation only)
### Changed (see `docs/phases/PHASE-2D-R2-ADMIN-UI-REDESIGN.md` for the pre-written art direction + final results)
- Workspace shell: admin-only neutral canvas `#f7f9fc` under pure-white panels; fixed full-height sidebar with brand lockup + `CMS` chip, grouped icon navigation (Dasbor / Kelola konten / Operasional) using inline 18px line icons and accent active pills, bottom account block (email, Keluar, back link); ≤940px becomes a compact wrapping chip band. `Memuat…` boot screen renders as a full-height centered canvas state (no more bare flash).
- Dashboard: three-tile stat band (Total konten / Konsep / Leads baru) with big 1.85rem values, uppercase micro-labels, brand-tinted icon chips (blue/amber/cyan/violet used sparingly); KELOLA MODUL section over refreshed module cards (icon chips, `Total: n · Draft: n` metrics, desc, `Kelola →`). Sums are derived from the already-fetched real API counts — no invented data (D-42).
- Content pages: real split composition ≥1080px — sticky form column beside the list panel; the filter toolbar lives inside the panel head; tables get uppercase micro-headers, hairline rows, dot status pills with tone-paired text (published/available green, draft/in-progress/in-development/coming-soon amber, archived/closed neutral, new blue), first-column emphasis, and a bounded right-aligned AKSI column (≤3 compact button groups: ghost / accent-outline Publish+Proses / danger-outline Hapus). Settings mirrors the split (table left, edit form right); leads/lead-detail are single panels; loading/empty states live inside panels.
- Forms/login: uppercase legends + 0.88rem/600 labels + focus-ring inputs; primary `Tambah`/`Simpan`, ghost `Batal`; page heads carry the `Total:` counter as a white pill; login is a centered brand card on the neutral canvas; favicon link added to `index.html` (kills the browser's 404 fallback).
### Verified
- `tsc --noEmit` + `vite build` PASS (CSS 25.66 kB, JS 287.28 kB); backend Vitest 27/27 PASS (exit-code readout is a PowerShell piping artifact; counts definitive); Playwright headed permanent suite **19/19 PASS on the shipped code** (fresh backend process + fresh `e2e.db`, `--workers=1`; an earlier run caught one real regression — implicit auto grid track overflow at 360px — diagnosed and fixed, then re-passed twice); temp evidence spec on a fresh process: full screenshot set + clean console/failed-request check (**0 console/page errors, 0 failed/4xx/5xx requests** after settling expected anonymous `/admin/auth/me` probes) + overflow matrix **35/35 = 0px at 360/390/768/1024/1280 × 7 admin routes**; 13 `r2-admin-*` screenshots visually inspected; temp specs deleted; `dev.db` untouched across the whole phase (all testing on throwaway `e2e.db`); public evidence bytes restored after the suite's routine re-capture of `followup-produk-kasir-1280.png`.
### Not changed
- Backend source/behavior, shared contracts, DB schemas/migrations/seeds/content, auth/session logic, dependency versions/lockfiles, public pages/CSS (2D/2A work intact), product projects, Cloudflare/DNS/deployments: untouched. Stopped for owner review of the R2 revision (D-41 R1 superseded in admin presentation only).

## [phase2d-r1 — 2026-10-22] Phase 2D-R1: admin UI visual refinement — one product feel (frontend presentation only)
### Changed (see `docs/phases/PHASE-2D-FRONTEND-COMPLETION.md` §12 for the R1 plan + results)
- Admin shell: sidebar becomes a sticky white elevated panel carrying the real brand lockup (Piple logo + wordmark) with the CMS/email note, accent-keyed active nav pill (chip row ≤900px), full-width Keluar, public-site back link; the main area gains a rhythmic card grid, hairline page heads with stat-emphasized totals, and defined content width.
- Dashboard: stat typography (bold Total + muted sub-span draft suffix, identical visible text), leads card accent-keyed + settings card neutral-keyed, hover elevation. Counts stay real API values with the explicit error alert (D-39 semantics untouched).
- Content lists: uppercase letter-spaced headers, roomier rows, hover tint, first-column emphasis, card-styled `.table-wrap`; Status/search controls become a chip-style toolbar; admin-scoped badge tightening. "Total: n" numbers emboldened (markup `strong`, text identical). Publish/Proses actions get an outline-accent variant; destructive/neutral actions stay plain (raw status keys unchanged per D-38).
- Forms: h2 + hint rhythm, uppercase muted legends, cleaner fieldset spacing, honest busy/401 feedback preserved.
- Login: centered brand card ("Masuk Admin", single-Super-Admin note, back link) on the public surface band.
### Verified
- `tsc` + `vite build` PASS (CSS 18.05 kB, JS 281.61 kB); Vitest 27/27 PASS; Playwright headed Chromium permanent suite 19/19 PASS (fresh backend process + fresh gitignored `e2e.db` + `--workers=1`; temp evidence specs run separately and deleted after); admin overflow **0px at 360/390/768/1024/1280** across 5 admin routes (25 route×width checks); 12 `r1-admin-*` screenshots visually inspected; `dev.db` content untouched apart from one session row from the matrix login.
### Not changed
- Backend source/behavior, shared contracts, DB schemas/migrations/seeds, auth/session logic, dependency versions/lockfile, public pages (2D/2A preserved), product projects, Cloudflare/DNS/secrets/deployments: untouched. Stopped for owner review of the R1 revision.

## [phase2d — 2026-10-22] Phase 2D: complete frontend experience — public truthfulness + Admin CMS usability (frontend only)
### Changed (see `docs/phases/PHASE-2D-FRONTEND-COMPLETION.md` for inventory, findings F-2D-01…13, evidence)
- Public: Portofolio/Harga/Artikel lists get distinct loading, error ("Gagal memuat …"), and empty states — a failed fetch no longer reads as "segera hadir"; long-form detail bodies render real paragraphs (plain-text split, no injection) on Layanan/Portofolio/Artikel details; Tentang restructured into an honest two-column profile + real-route link lists (profile TBD text preserved); public pricing table wrapped for small screens (overflow-free at 360px).
- Admin CMS: content form grouped into fieldsets (Identitas / Isi / module-specific / Publikasi) with `*` required markers — input order and asserted names unchanged (e2e-safe); honest busy submits ("Menyimpan…", disabled in-flight); 401 → "Sesi berakhir. Muat ulang halaman lalu masuk kembali." across admin mutations; Dashboard shows live `Total · Draft` per content module + dedicated new-lead card + explicit load-error alert (existing API params only); published rows expose "Lihat publik" (pricing → `/harga`); Leads inbox adds a Tanggal column + per-lead accessible action names; Settings gains per-key JSON contract hints; Login gains a single-Super-Admin note + back link; mobile nav-toggle label truthful per state.
- Local Git baseline established this session (repo previously un-versioned): as-found commit `9a9eb41`; `.gitignore` + untracking of `*.db-shm`/`*.db-wal` WAL sidecars (`7e87231`, disk files untouched).
### Verified
- `tsc` + `vite build` PASS (CSS 14.95 kB, JS 280.67 kB); Vitest 27/27 PASS; Playwright headed Chromium 19/19 PASS (fresh backend + fresh gitignored `e2e.db` + `--workers=1`, baseline 19/19 also re-run pre-edit); overflow ≤ 1 verified at **360/390/768/1024/1280** including newly covered `/tentang`, `/portofolio`, `/harga`; console/page-error and image-load checks clean; 29 `phase2d-*` evidence screenshots visually inspected; `dev.db` untouched (only the throwaway e2e DB, deleted after; dev backend restored to `./dev.db` with health OK).
### Not changed
- Backend source/behavior, shared contracts, database contents/migrations/seeds, dependency versions/lockfile, hero (Phase 02A preserved), product visual registry, HTML/meta, Cloudflare/DNS/secrets/deployments: untouched. The three product projects and `piple-spike-d1`: untouched. No deploy; stopped for owner review.

## [phase2a-hero-content — 2026-10-22] Phase 2A follow-up: homepage hero content + left/right balance polish (homepage hero only)
### Changed (see `docs/phases/PHASE-02A-HERO-CONTENT-BALANCE.md` for preflight + evidence)
- Homepage hero left column filled with owner-directed Indonesian promo copy: eyebrow "Partner digital untuk bisnis yang terus bertumbuh", headline h1 "Ide Besar Bisnis Lo, Kami Wujudkan Jadi Solusi Digital.", full supporting paragraph; the (former brand-name-only) h1 change is carried by brand identity in the unchanged sticky logo lockup/nav/footer.
- Three requested value propositions as a compact icon-row group (`.hero-values`, hairline + small inline SVG icons, intentionally NOT cards) replacing the old card-style `.hero-points` (info repetition removed).
- Hero CTA hierarchy: primary "Diskusikan Proyek Lo" → `/kontak` + secondary "Jelajahi Layanan" → `/layanan`; the unconfigured (TBD-03) WhatsApp placeholder no longer opens the hero — WhatsApp stays honestly available via FAB/CTA bands/`/kontak`.
- Right banner reduced ~13%: `max-width` 30rem → 26rem (480×600 → 416×520 @1280), grid `1.02fr/0.98fr` → `1.12fr/0.88fr`; 720×900 owner asset untouched (contain, no crop/distortion, CLS dims, eager).
- `.hero h1 { text-wrap: balance }` (no orphan lines) + `.hero-values` 46rem alignment with the copy axis when stacked ≤1024px.
- Tests: `visual-followup.spec.ts` hero assertions retargeted + new permanent hero-composition regression (copy, 3 highlights, CTA routes, no disabled hero WhatsApp, banner ≤26rem/aspect); homepage h1 strings updated in `app.spec.ts`/`tablet.spec.ts` (unrelated specs untouched).
### Verified
- `tsc` + `vite build` PASS (CSS 14.09 kB, JS 276.64 kB); Vitest 27/27 PASS (backend untouched); Playwright headed Chromium 19/19 PASS on final code (fresh backend + fresh `e2e.db` + `--workers=1`); 360/768/1024/1280 overflow ≤ 1 with banner bounds/contain/load verified + all four widths visually inspected; console/pageerror clean; dist secret-value scan 0 hits (wa.me template number-less as baseline); `dev.db` integrity re-proven (143,360 B, mtime 10/10) — only gitignored `e2e.db` recreated per e2e discipline.
### Not changed
- Admin CMS, backend, shared contracts, database/migrations/seeds (`dev.db` preserved), other public routes, product detail pages/screenshots/galleries/registry, brand assets, logo lockup/nav/footer, Cloudflare/DNS/secrets/deployments: untouched. No deploy; stopped for owner review.

## [phase2a-hero-banner-hygiene — 2026-10-13] Asset hygiene: hero banner renamed to correctly-suffixed `.jpg` (byte-identical, no redesign)
### Changed (see `docs/phases/PHASE-02A-HERO-BANNER.md` §8)
- `frontend/public/brand/hero-banner.png` (JPEG bytes under a `.png` name) copied byte-identically (SHA-256 verified equal, no re-encode) to `frontend/public/brand/hero-banner.jpg`; hero `src` and the imagery spec assertion updated; misnamed `.png` removed after zero-reference verification. No separate source existed elsewhere (brand assets live at the public path only), so the identical bytes are the preserved original.
### Verified
- `tsc` + `vite build` PASS; headed `visual-followup.spec.ts` 2/2 PASS (fresh backend + fresh `e2e.db`); banner 720×900/`contain`/in-viewport at 360/768/1024/1280; galleries 4/3/4 intact; evidence screenshot inspected.
### Not changed
- Image bytes/quality, hero presentation, backend, admin CMS, shared contracts, database/migrations/seeds, other layouts, product visuals, Cloudflare/DNS/secrets/deployments: untouched. No deploy.

## [phase2a-hero-banner — 2026-10-13] Phase 2A hero banner: owner-supplied company-profile banner in homepage hero (frontend hero-only)
### Changed (see `docs/phases/PHASE-02A-HERO-BANNER.md` for preflight verification + evidence)
- Homepage hero right area now renders the owner-supplied banner in place at `frontend/public/brand/hero-banner.png` (verified 720×900, ~71 KB, unique SHA — no duplicate asset) as one coherent image: intrinsic 720×900 dims (CLS hint), `object-fit: contain`, full aspect preserved, no text recreation/translation/overlay. Overlapping POS Penginapan + POS Kasir mockup cards removed from the hero only.
- Left-side hero heading/description/CTA buttons, navigation, surrounding sections, product screenshots/galleries/detail pages/registry entries, and all other public layouts/content unchanged. New `hero-banner` CSS (responsive contain-frame; stacks below copy on mobile, no overflow).
- `visual-followup.spec.ts` updated to the new hero presentation (banner load/dims/contain/bounds, old-composition absence, hero CTA/nav, per-width 360/768/1024/1280 checks); all other specs unmodified. No new claims/links/prices/statuses.
### Verified
- `tsc` + `vite build` PASS (CSS 13.71 kB, JS 275.49 kB); Vitest 27/27 PASS; Playwright headed Chromium 18/18 PASS (fresh-DB + fresh-backend + single-worker); 360/768/1024/1280 overflow-free with banner fully visible undistorted; galleries 4/3/4 intact; console clean; dist secret-scan clean (only `wa.me` prefix template); evidence screenshots inspected.
### Not changed
- Backend, admin CMS, shared contracts, database/migrations/seeds (`dev.db` preserved), other public layouts, product visuals/registry, brand logo, product projects, Cloudflare/DNS/secrets/deployments: untouched. No deploy; stopped for owner review.

## [phase2b — 2026-10-11] Phase 2B admin CMS refinement (frontend admin UI only)
### Changed (see `docs/phases/PHASE-02B-ADMIN-CMS-REFINEMENT.md` for preflight + evidence)
- Admin chrome: active module nav, labeled sections, main landmark, sidebar stacks ≤900 px. Dashboard: live per-module totals + new-lead count as descriptive link cards (real endpoint data).
- `ContentList` (all 5 modules): loading/empty/success states; server field errors mapped to inputs; fixed silent-drop mappings (articles→`excerpt_id`, products→`tagline_id`); new honest extras — products tagline/readiness/demo/features, pricing amount/quote/service-ref/features/limits, portfolio client name; status filter + search via existing `?status=`/`?q=`; row-level Archive; triage columns; responsive wrapped tables; slug-aware confirms/labels. Leads: loading/error/count states; detail loading-vs-not-found + inline Proses/Tutup. Settings: loading/success (key set unchanged). Login: busy guard.
- New permanent `tests/e2e/admin.spec.ts` (4 specs) + 2 evidence screenshots. All 14 pre-existing specs pass unmodified.
### Verified
- `tsc` + `vite build` PASS (JS 276.16 kB); Vitest 27/27 PASS; Playwright headed Chromium 18/18 PASS (fresh-DB + single-worker); 360 px admin overflow-free; keyboard/focus/labels intact; console clean; dist secret-scan clean.
### Not changed
- Backend, shared contracts, database/migrations/seeds, public UI, brand, product projects, DECISIONS/TBDs, Cloudflare/DNS/secrets/deployments: untouched. No backend defect blocked acceptance. No deploy.

## [phase2a-erp — 2026-10-11] Phase 2A final asset integration: ERP Laundry screenshots (frontend-only)
### Changed (see `docs/phases/PHASE-02A-ERP-ASSET-INTEGRATION.md` for inventory + sensitivity review)
- Integrated 4 owner-supplied ERP screenshots (all 1920×1080 PNG, sensitivity-reviewed: QA dummy data only, no PII) as byte-identical copies in `frontend/public/produk/erp-laundry-{dashboard,pesanan,inventaris,laporan}.png`; registered in `ProductVisual.tsx` (dashboard-first, contain-fit, CLS dims, visible-content-only alt/captions). ERP placeholder fully replaced on home strip, `/produk`, and detail gallery (4 views) via existing data-driven rendering — no layout/CSS redesign; hero 2-product composition preserved with an accuracy-shortened note.
- `visual-followup.spec.ts` updated (placeholder-absence, ERP gallery count 4, ERP overflow + evidence screenshot). No readiness/demo/price/description changes; nothing fabricated.
### Verified
- `tsc` + `vite build` PASS (JS 264.54 kB); Vitest 27/27 PASS; Playwright headed Chromium 14/14 PASS (fresh-DB + single-worker); 360/768/1024/1280 overflow-free incl. ERP detail; all 11 public shots complete + `contain`; console clean; dist secret-scan clean; ERP evidence screenshot inspected.
### Not changed
- Backend, admin CMS, shared contracts, database/migrations/seeds (`dev.db` preserved), brand assets, POS visuals, Cloudflare/DNS/secrets/deployments: untouched. No deploy; Phase 2B not started.

## [phase2a-followup — 2026-10-11] Phase 2A follow-up: public visual polish with real screenshots (frontend-only)
### Changed (see `docs/phases/PHASE-02A-FOLLOWUP-VISUAL-POLISH.md` for inventory + evidence)
- Public screenshot system established: 7 byte-identical copies in `frontend/public/produk/` (4 POS Kasir PNG ~2.1:1, 3 POS Penginapan JPG mixed ratios); new `ProductVisual.tsx` (contain-fit frames, CLS hints, honest ERP placeholder, hero composition); hero two-column mockup + overlapping card; product thumbs + `Tampilan produk` galleries (kasir 4, penginapan 3); real logo in header/footer; rendered `[Tagline TBD]` removed (TBD preserved in docs).
- Excluded from public: `KeuanganInvoicePrint.jpg` (embeds browser print-dialog chrome) and all ERP visuals (unsupplied — placeholder, not a blocker). No demo/readiness/URL states changed; no content fabricated.
### Verified
- `tsc` + `vite build` PASS (JS 263.57 kB); Vitest 27/27 regression PASS; Playwright headed Chromium 14/14 PASS (12 pre-existing + 2 new imagery specs, fresh-DB + single-worker); 360/768/1024/1280 overflow-free; images complete + `contain`; console/pageerror clean; dist secret-scan clean (only `wa.me` prefix template, as baseline); 3 evidence screenshots in `tests/screenshots/`.
### Not changed
- Backend, admin CMS, shared contracts, database/migrations/seeds (`dev.db` mtime preserved), product projects, Cloudflare/DNS/secrets/deployments: untouched. Transient mid-run failures traced to orphaned Chrome processes on the test box (environment, not app code).

## [phase2a — 2026-10-09] Phase 2A public website refinement (frontend-only; D-33 scope)
### Changed (see `docs/phases/PHASE-02A-PUBLIC-REFINEMENT.md` for evidence)
- Refined tokens, sticky header, agreed IA nav labels (routes unchanged), footer sitemap, WhatsApp FAB (placeholder-aware), shared components.
- Homepage, services, products, portfolio, pricing, articles, contact, privacy pages restructured with honest TBD/empty states; zero fabricated claims.
- Fixed: tablet 768px overflow (hamburger ≤900px; clip-technique skip-link/honeypot).
### Verified
- `tsc` + `vite build` PASS; Vitest 27/27 regression PASS; Playwright headed Chromium 12/12 PASS (fresh-DB + single-worker discipline); dist secret-scan PASS; 3 screenshots in `tests/screenshots/`.
### Not changed
- Admin CMS, backend, shared contracts, database, migrations, Cloudflare/DNS/secrets, deployments: untouched. No new TBD resolutions.

## [phase01 — 2026-10-09] Phase 01 implementation (D-33 authorized; local only, no deploy)
### Implemented (see `docs/phases/PHASE-01-IMPLEMENTATION.md` for per-milestone evidence)
- Workspace `frontend/` + `backend/` + `shared/` + `tests/` (physically separated; independent builds; `/api` proxy in dev).
- Backend: Hono + Zod, thin async repository + `SqliteAdapter`/`D1Adapter`, `0001_init.sql` (12 tables), idempotent migrate, draft-only seed, scrypt auth, single-use atomic bootstrap, DB sessions + CSRF + rate limits, public/admin APIs per `API.md` (allowlist projection, strict rejection, safe errors), inquiry (D-27 fields, honeypot silent-accept, spam guards), demo_url http/https-only + derived demo states.
- Frontend (ID): 13 public routes, 7-category taxonomy, CMS (5 modules + Leads inbox/detail/status + Settings), inquiry form + privacy page, WA placeholder states, responsive/accessible light corporate UI.
### Verified
- `tsc` shared/backend/frontend PASS; `vite build` PASS; Vitest 27/27; Playwright 10/10 headless + headed Chromium; secret scan clean; `npm audit`: 2 moderate (react-router SSR GHSA, N/A for SSR-free SPA — upgrade deferred).
- Fixed on evidence: ORDER BY per-table columns; honeypot handling; Vitest 3 for `node:sqlite`; e2e DB isolation + login race.
### Not changed
- `piple-spike-d1` untouched; no production deploy/DNS/billing; TBD IDs preserved; RPO/RTO/sessions/backup/concurrency still unvalidated in production (pre-prod gates stand).

## [phase01-auth — 2026-10-09] D-25 OPENED; Phase 01 implementation authorized (D-33)
### Approved
- D-33: owner explicitly opened gate D-25 (supersedes D-26 hold; history preserved) and authorized Phase 01 per the readiness assessment scope.
### Changed
- Recorded in `docs/DECISIONS.md` (D-33); `docs/phases/PHASE-01-IMPLEMENTATION.md` created with plan + milestones; readiness assessment gate status updated.
### Not changed
- All prior decisions stand; TBD IDs preserved; `piple-spike-d1` untouched; no production deploy/DNS/billing authorized.

## [decisions-latest — 2026-10-09] Owner decisions D-26–D-32 (documentation-only record; D-25 remains in force)
### Approved (design/scope-level; implementation + validation pending; nothing built)
- D-26: Phase 01 gate reaffirmed — D-25 stays closed; readiness may be recommended for review, never self-authorized.
- D-27: inquiry + Leads inbox INCLUDED in proposed Phase 01 scope (fields, validation, repository storage, Super Admin triage, spam protection; exclusions: no auto email/WhatsApp, no public access; pre-launch privacy/retention docs required). Supersedes earlier pending/excluded posture — history preserved. TBD-09 stays OPEN for consent wording + pre-launch docs.
- D-28: product demo links deferred; external URLs only (`Coming Soon`/`Live Demo`/`Request Demo`); no source copying; no fabricated links; per-product demo security assessment pre-access (TBD-01).
- D-29: domain deferred, localhost/dev placeholders, no DNS/purchase (TBD-06 OPEN; D-24 direction stands).
- D-30: WhatsApp deferred, configurable component + dev placeholder, no invented numbers (TBD-03 OPEN).
- D-31: incremental content, draft-by-default reaffirmed, nothing invented (TBD-01/02/04/05/07/08/10).
- D-32: architecture verification recorded — decided (D-17–D-23, spike evidence) vs still-pending-validation; creates no new approval.
### Changed
- Reflected with history preserved in `DECISIONS.md` (D-26–D-32 + annotations on D-03/D-07/D-14), `PRODUCT-REQUIREMENTS.md` (§§4/5/6/8/9, sitemap, TBD-01/03/06/09/11, §11 log), `API.md` (§3 products demo_url, §3.2/§4/§5 inquiry fields), `DATABASE.md` (§3.2 demo_url + rule, §3.6 fields), `WORKFLOW.md` (§2–§3), `SECURITY.md` (§1 scope, §4, §5 demo note), `TESTING.md` (contracts/Leads/demo rows), `ARCHITECTURE.md` (topology, CMS modules, risk row), `DEPLOYMENT.md` (product separation), `README.md` (API index line), and `PHASE-01-READINESS-ASSESSMENT.md` (scope update + re-audit verdict). `RESULTS.md` preserved unchanged. All 16 TBD IDs + original titles preserved; no renumbering, no silent resolutions.
### Not changed
- No code, dependencies, migrations, seeds, deployments, or Cloudflare/DNS/secret changes; `piple-spike-d1` (+11 `[SEED]` rows) retained untouched; D-25 closed; no unexecuted tests claimed.

## [approvals — 2026-10-09] Owner-approved decisions D-17–D-25 (documentation-only record)
### Approved (design-level; implementation + validation pending)
- D-17 (TBD-12): adapter Option A — hand-rolled thin async repository + env adapters, no ORM for MVP.
- D-18 (TBD-14): session store D1 — behavior, expiry/GC, integration unvalidated.
- D-19 (TBD-16): backup Option B — scheduled backups, separate copies, documented restore, rehearsals; nothing implemented or rehearsed.
- D-20 (TBD-16): RPO ≤ 24h / RTO ≤ 8h as TARGETS, not guarantees; nothing measured.
- D-21 (TBD-12/16): rollback Option C — compensating migrations + backup restoration, no down-migrations; runbook untested.
- D-22 (TBD-12/14): concurrency scope Option B — bootstrap single-winner, concurrent publish, edit/delete conflicts, integrity, migration access; no tests written or run.
- D-23 (TBD-11/16): separate D1 resources for dev/staging/prod; none exist; spike DB excluded.
- D-24 (TBD-06): business-owned domain direction; exact domain pending identification (TBD-06 OPEN); no DNS changes authorized.
- D-25: Phase 01 Option C — implementation NOT approved to start.
### Changed
- Recorded in `DECISIONS.md` (D-17–D-25) and reflected in `PERSISTENCE-DECISION.md` (§5 approvals, §6 superseded), `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md` (§2 sessions, §6 ops), `TESTING.md` (concurrency row, entry criteria), `DEPLOYMENT.md` (§1/§3/§4), `PRODUCT-REQUIREMENTS.md` (TBD-06/11/12/14/16 statuses, §11 log). `RESULTS.md` preserved unchanged (historical evidence). All TBD IDs preserved; no renumbering, no silent resolutions.
### Not changed
- No code, dependencies, migrations, deployments, or Cloudflare resources created/modified/deleted; `piple-spike-d1` retained; no DNS/secrets/credentials touched; no unexecuted tests claimed.

## [v2 — 2026-10-09] Phase 00 Update (Agent 1)
### Added
- Baseline creation (no prior repo docs found): `PRODUCT-REQUIREMENTS.md` (with authoritative TBD-01–16 register), `ARCHITECTURE.md` (Workers/D1 validation + adapter requirement), `DATABASE.md` (7-module schema proposal + lifecycle + soft-delete recommendations), `API.md` (public/admin contract proposal), `WORKFLOW.md` (draft/published + WhatsApp vs conditional inquiry flows), `DESIGN-SYSTEM.md` (light clean corporate, ID language, placeholders), `TESTING.md`, `DEPLOYMENT.md`, `SECURITY.md`, `DECISIONS.md`, `phases/PHASE-00-PLANNING.md`, root `README.md`, `docs/README.md`.
- Incorporated v2 owner decisions: brand, 8 services (wedding planning as service), 3 products (mixed readiness, no assigned statuses), public pricing with TBD values, WhatsApp primary CTA, 7-module CMS with single Super Admin, ID language, light corporate direction, separate frontend/backend, SQLite-local/D1-prod constraint.
### Not changed
- No code, migrations, databases, or deployments created.
### Pending
- Owner/Agent 2 review of all v2 docs; resolution of TBD-01–16 per register.

## [v3 — 2026-10-09] Phase 00 targeted documentation revision (owner review)
### Changed
- Service taxonomy (D-10/A): portfolio/case studies removed from commercial services (7 categories now); `/layanan/portfolio-case-studies` route deleted; malformed sitemap line fixed; portfolio standalone (`/portofolio`, `/portofolio/:slug`); service counts, API resources/validation (`serviceSlug` 7-enum), DB CHECK constraints, CMS scoping, tests, and design docs synchronized. Files: `PRODUCT-REQUIREMENTS.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `WORKFLOW.md`, `DESIGN-SYSTEM.md`, `TESTING.md`, `DECISIONS.md`, READMEs.
- Spike prerequisite (D-11/B): mandatory SQLite ↔ D1 spike acceptance criteria (6 items) + planned verification procedure documented in `ARCHITECTURE.md` §3.4 and referenced from `DATABASE.md`, `TESTING.md`, `DEPLOYMENT.md`, `WORKFLOW.md`, TBD-12. Spike NOT executed — no code, deps, migrations, or Cloudflare resources created.
- Settings allowlist (D-12/C): explicit strict allowlist for `GET /api/v1/settings/public` (proposed `{ whatsapp_number?, site_name, seo_defaults }`, exact set pending owner confirmation), whole-record exposure forbidden, admin endpoints auth-gated, no secrets in bundles/env; synchronized across `API.md` (strict Zod sketch), `DATABASE.md` (`is_public` flag + projection rule), `SECURITY.md`, `ARCHITECTURE.md`.
- Bootstrap/recovery (D-13/D): 10-point Super Admin lifecycle documented (placeholders only) in `SECURITY.md`, referenced in `API.md` (single-use bootstrap proposal), `ARCHITECTURE.md`, `DEPLOYMENT.md` (runbook), `WORKFLOW.md`; TBD-14 extended. NOT implemented.
- Inquiry status correction (D-14/E): form + functional Leads inbox confirmed PENDING with no default chosen (v2 "WhatsApp-only default" withdrawn as a decision); `leads` table/API/inbox explicitly unimplemented; TBD-09 rewritten; `PRODUCT-REQUIREMENTS.md` §§5/8, `API.md` §3.2/§4, `DATABASE.md` §3.6, `WORKFLOW.md` §2, `SECURITY.md` §4 updated.
- Draft-by-default (D-15/F): unverified-content rule applied — DB `draft` defaults + seed-guard, `status`-vs-`readiness` distinction, review/publishing gate, leak-proving tests; product names retained, readiness unconfirmed.
- `DECISIONS.md`: D-10–D-15 added; D-04/D-07 annotated with v3 corrections. `phases/PHASE-00-PLANNING.md`: v3 report added.
### Not changed
- No application code, dependencies, migrations, databases, Cloudflare resources, or deployments created. All 16 TBD IDs preserved (no renumbering; no new TBD — spike/allowlist/bootstrap map to TBD-12/TBD-03/TBD-14).
### Pending
- Owner + Agent 2 review of this v3 revision; all TBD-01–16 still open; spike execution and Phase 01 gated on approval.

## [v3-corrections — 2026-10-09] Agent 2 review corrections (documentation only)
### Fixed
- Bootstrap security (`SECURITY.md` §2, `API.md` §4, `ARCHITECTURE.md` §4/§5): production bootstrap requires a high-entropy, securely provisioned, out-of-band bootstrap token (or equally strong owner-authorized mechanism); secret in request body only, never in URLs/bundles/public config/logs; rate limiting + safe non-enumerating errors + atomic single-use against concurrent requests; token loss vs account recovery handled as separate procedures. All mechanisms planned and unverified; no credentials created.
- Settings API behavior (`API.md` §3.1, `SECURITY.md` §3): response projection explicitly distinguished from input validation; public responses constructed from the allowlist (stored internal keys never included); unknown input keys rejected by strict validation. Removed contradictory wording that implied the same unknown key is both silently stripped and rejected. Exact public field set still pending owner confirmation.
- Decision-log references (`DECISIONS.md`): D-03 now points inquiry/Leads approval to TBD-09 and keeps WhatsApp configuration under TBD-03; D-04 eight-category wording labeled [HISTORICAL — SUPERSEDED by D-10], active taxonomy remains 7 commercial categories.
### Not changed
- TBD-09 remains PENDING explicit approval (no decision change). No code, deps, migrations, spike, auth, CMS, APIs, or deployment created. All TBD IDs preserved. Nothing marked implemented or verified.

## [finalization — 2026-10-09] Persistence architecture decision package (PROPOSED, evidence-based)
### Added
- `docs/PERSISTENCE-DECISION.md`: spike acceptance status (all legs PASS), 6 stale-statement discrepancies with dated addenda, minimal persistence architecture proposal (shared SQL source, async repository + env adapters, journal-tracked forward-only migrations, env-separated config, draft-only seeds, adapter-boundary normalization), explicit non-claims, 6 remaining decisions with blocking scopes, conditional Phase 01 recommendation. Proposed only — pending owner + Agent 2 approval (D-16).
### Changed
- Evidence-scoped addenda (history preserved): `DECISIONS.md` (D-11 execution addendum + new D-16 PROPOSED), `ARCHITECTURE.md` (§3.2, §6), `DATABASE.md` (§6), `TESTING.md` (§4), `DEPLOYMENT.md` (rescoped to production; spike DB documented as single exception), `PRODUCT-REQUIREMENTS.md` (TBD-12 status → evidence complete/pending approval, still OPEN; §11 note), `spike/d1-sqlite/RESULTS.md` (pre-remote qualifiers updated).
### Not changed
- No TBD renumbered/resolved; no approval invented; `piple-spike-d1` NOT deleted; no production resources touched; no Phase 01 started; no unexecuted tests claimed.

## [spike-complete — 2026-10-09] SQLite ↔ D1 technical spike, all three legs verified (evidence-based)
### Verified
- Remote D1 (`piple-spike-d1`, APAC; exactly one DB created under explicit approval; nothing else listed/touched): same `0001_init.sql` applied remotely (✅, 4 commands); init verified via `sqlite_master`; seed 7+1+3 `[SEED]` rows; public count 0 with `draft`/`in_development` defaults; update/soft-delete/restore/publish gates verified; duplicate-slug + bad-status inserts rejected remotely (`UNIQUE`/`CHECK … [code: 7500]`, exit 1, atomic — count stayed 7); allowlist projection returned only the 2 public keys (secret absent).
- Earlier local legs stand: SQLite 17/17 PASS; local-D1 sim PASS (binding API). Full commands + redacted outputs: `spike/d1-sqlite/RESULTS.md`.
- Self-noted artifact: remote seed carried PowerShell quoting backslashes in 2 public `value_json` values (key filtering unaffected).
### Not changed
- No Worker/website deployed; no DNS/billing/secret/production changes; spike DB NOT deleted (cleanup needs separate approval). TBD-12 proceeds to Agent 2/owner finalization review on this evidence (not silently resolved). No Phase 01 started.

## [v1 — prior] (no record in repo)
- No files found in `D:\project\PipleSolutions` at v2 start (empty directory, not a git repo). Earlier history, if any, lived outside this repo.
