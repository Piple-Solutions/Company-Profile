# Phase 2D-R2 — Admin UI Redesign: Modern Light SaaS Workspace (frontend only)

Status: **IMPLEMENTATION PENDING OWNER REVIEW**

Owner verdict on Phase 2D-R1: *"Tampilan UI admin masih terlalu polos dan tidak profesional, terasa seperti website kuno dari awal tahun 2000-an."* Direction confirmed by the owner: predominantly **white, bright, clean, professional**; no dark styling; changes must go beyond colors/radii/shadows/gradients — composition, hierarchy, spacing, typography, navigation, tables, forms, and component consistency.

## 1. Pre-implementation analysis: why R1 still reads as dated

Evidence base: `tests/screenshots/r1-admin-*.png` (12 captures), current `cms.tsx` + admin CSS. Specific findings:

- **F-R2-01 · No working-surface concept.** Every page is a stack of independently floating boxes (head → alert → form box → toolbar chip → table box → empty box) separated by dead space. Reads as a printed 2000s form, not an application workspace.
- **F-R2-02 · Sidebar is a label list.** Ten same-styled text links, no iconography, no grouping, no app identity; account/logout floats mid-panel. The layout has no "sidebar" proportion distinct from the page.
- **F-R2-03 · Dashboard has no hierarchy.** Stat strips ("Total: 2 · Draft: 0") are one small bold line among four muted paragraphs per card; totals/leads/settings get identical visual weight; nothing scans first.
- **F-R2-04 · Tables are default HTML.** Uniform text-link actions squeeze left; destructive action identical to neutral; status pills inconsistent (some tinted, `draft`/`archived` plain gray); no column hierarchy (name vs. attributes).
- **F-R2-05 · Toolbar is detached.** The filter row floats as its own chip between form and table instead of integrating with the list it controls; controls sit on ragged baselines.
- **F-R2-06 · Forms are uniform white fields.** Legends, labels, hints, and inputs share the same optical weight; no clear primary/secondary action tier.
- **F-R2-07 · Buttons have no system.** Everything is the default pill; primary/secondary/destructive tiers are indistinguishable.
- **F-R2-08 · Login is a floating strip.** Small type, no composition; plus a bare "Memuat…" flash before auth resolves.
- **F-R2-09 · Flat typographic scale.** h1 barely exceeds body text; no size/weight steps to organize information.

## 2. Art direction (proposal written before implementation)

**"Modern Light SaaS Workspace" — one white application canvas, real component system.**

1. **Workspace canvas.** The admin viewport becomes an app surface: a very light cool neutral page background (`#f7f9fc`, admin-scoped only) with pure white content panels. The public site stays white; this is the deliberate "workspace vs. document" split.
2. **App sidebar.** Fixed 16.5rem white column, full height, hairline border, sticky: brand lockup (real logo + wordmark + `CMS` chip), grouped navigation — **Dasbor**, then groups *[Kelola konten]* (Layanan, Produk, Portofolio, Artikel, Harga) and *[Operasional]* (Leads, Pengaturan) with 18px inline-SVG line icons, quiet hover, active = accent-tinted pill; account block pinned at the bottom (email, Keluar, back link). ≤940px it becomes a compact top band with wrapping chip nav.
3. **One panel per concern.** Content pages become a deliberate split layout (≥1080px): the **form as a sticky left column panel**, the **list as the working panel right** — integrated as one surface. The list panel carries its filter bar in a panel header (integrated toolbar, affiliated controls), the table, and the empty state all inside. Settings mirrors this (table panel left/grown, edit form panel right/fixed). Leads is a single full-width panel. Leads detail becomes one record panel. No more floating chip/bare-table remnants.
4. **Real dashboard hierarchy.** A stat band of three tiles derived **only** from live API sums (Total konten = Σ module totals, Konsep = Σ drafts, Leads baru) — big 1.9rem numbers, uppercase micro-labels, icon chips (blue/amber/cyan tints). Below: *Kelola modul* grid — refreshed compact cards with icon chips (content blue, leads cyan, settings violet — brand-accent moments, sparing), metric line preserved ("Total: n · Draft: n", "Baru: n"), description, "Kelola →". Deriving sums of already-fetched real counts adds no invented data; explicit error/loading states unchanged.
5. **Table system.** Uppercase micro-header row on `#f8fafc`; generous 0.8rem row rhythm; hairline dividers; first column semibold ink (name), second column muted (attribute), status pill column with a **status dot** (published/available green, draft/in-progress amber, archived/closed neutral, new blue); **Aksi column right-aligned** with a compact action system: ghost (Ubah/Lihat/Arsip/Unpublish), accent-outline (Publish/Proses), **danger-outline (Hapus)**. Table scrolls inside its panel — never the page.
6. **Form system.** White panel; 0.74rem uppercase legends; 0.88rem/600 labels; compact 8px-radius controls with visible focus ring; muted inline hints; primary/secondary button tiering (`Tambah`/`Simpan` solid primary, `Batal` ghost). Field DOM order and every label string unchanged.
7. **Page headers.** h1 1.45rem/700 tight tracking + muted description left; the `Total: n` counter becomes a quiet white meta pill on the right (same visible text, still `role="status"`).
8. **Buttons.** `btn-primary` (solid accent) / ghost (hairline border) / `btn-accent-outline` (R1, kept) / `btn-danger-outline` — new admin-scoped variants only; public `.btn` untouched.
9. **Login.** Centered 26rem brand card on the same neutral canvas: logo chip + wordmark, "Masuk Admin", note, stacked fields, full-width primary Masuk, back link; boot state rendered as a centered full-height "Memuat…" on the same canvas (no white flash). No auth-logic change.
10. **Type scale & rhythm.** h1 1.45rem → section h2 1.05rem → body .92rem → micro-labels .72rem uppercase; consistent 1.25–1.5rem grid gaps; consistent 12px panel radius + restrained `0 1px 2px`/`0 4px 12px` shadows.

**Deliberately NOT done:** dark styling, heavy gradients/neon, decorative fake metrics/charts/activity, icon-per-milestone clutter, removing fields or data states.

## 3. Preserved test contract (verified against `tests/e2e/admin.spec.ts`, `app.spec.ts`)

- Positional form inputs (`Formulir konten` input[0]=slug, input[1]=title; pricing: slug→title→price-number→quote-checkbox→serviceRef) — **DOM order untouched**.
- All visible names/labels verbatim: nav labels + `aside nav a.active`, h1 set (`Dasbor`, `Kelola {module}`, `Leads`, `Detail Lead`, `Pengaturan`, `Masuk Admin`), buttons (`Masuk`, `Tambah`, `Simpan`, `Batal`, `Ubah`, `Publish`, `Unpublish`, `Arsip`, `Hapus`, `Proses`, `Tutup`, `Cari`, `Reset`, `Keluar`), links (`Detail`, `Kelola →`, back links, `Lihat publik`), labels (`Email`, `Kata sandi`, `Tagline`, `Kesiapan`, `URL demo`, `Fitur`, `Ringkasan`, `Nama klien`, `Harga khusus`, `Status`, `Kunci`, `Nilai`, `Tampilkan ke publik (allowlist)`), texts (`Hanya konten…`, `Total:`, notices tersimpan/dipublikasikan/diarsipkan/dihapus/diproses/dikembalikan ke draft, login `salah`, 401 session message, `form-hint`s, settings allowlist copy, `Empty` texts, `coming_soon` badge text).
- `.admin-card` (first visible), `.admin-shell`, `.table-wrap`→ replaced by panel-hosted table? **No: kept** — table remains `<table className="data">`; the panel scroll wrapper is a new div class; existing `table-wrap` class retained on the scroll wrapper for continuity.
- Roles/landmarks kept (`role="status"`, `role="alert"`, `filter`/`contentinfo` nav aria-labels, `dl.facts`); `Memuat…`/loading/empty/error states retained; skip-link/reduced-motion inherited from globals.
- 360px overflow assertions on `/admin`, `/admin/products`, `/admin/leads`, `/admin/settings` keep passing (panel scroll containers only).

## 4. Test strategy (accounts for the 10/h per-process login limiter)

1. **Process A** (fresh process, throwaway `e2e.db`): permanent Playwright suite, headed, `--workers=1` → 19 tests, ≈9 logins.
2. **Process B** (fresh process, same remaining `e2e.db` content kept — reset limiter): one temp spec, `--workers=1`, headed → **R2 evidence screenshots** (login ×2 widths, dashboard ×2, products/pricing ×1, services mobile form+table, leads ×2, lead detail, settings ×2, mobile-navigation captures at 360/390) then **overflow matrix** 7 admin routes × 360/390/768/1024/1280 (≤1px, 35 checks; 2 logins in B). Temp spec deleted after the run.
3. `tsc`+`vite build`, backend Vitest, and diffusion review before/after; `dev.db` never used for testing (unchanged entirely — no review-credential login needed this time).

## 5. Scope & boundaries

Permitted: `frontend/` presentation files + tests/docs/screenshots as necessary. Forbidden and untouched: backend source/behavior, shared contracts/schemas, DB schemas/migrations/seeds/content (`dev.db`, `piple-spike-d1`), auth/session logic, package manifests/lockfiles, Cloudflare/DNS/infrastructure/deploy, external product projects. TBD-01..16 untouched; decisions D-01..D-41 preserved (a new D-42 will be appended for this redesign).

## 6. Implementation results

**Status: IMPLEMENTATION COMPLETE — awaiting owner review. R1's admin presentation is superseded (D-41 semantics preserved via D-42).**

### 6.1 Diff summary

```
frontend/src/admin/cms.tsx   | 346 ++++++------     (structural JSX: icons, shell, split layouts, panels, stat band)
frontend/src/styles.css      | 579 +++++----        (admin section rewritten as the R2 workspace system)
frontend/index.html          | +1 line              (favicon link — kills the automatic /favicon.ico 404)
```
Plus evidence: 13 new `tests/screenshots/r2-admin-*.png`, suite-refreshed `admin-dashboard-1280.png` / `admin-products-1280.png`; docs (this report, CHANGELOG, DECISIONS D-42).

### 6.2 Problems → changes (R1 finding → R2 fix)

- F-R2-01 (floating boxes) → one panel per concern: content pages are a sticky form column + integrated list panel (filter in panel head); settings is table-headed split; leads/lead-detail single panels. ✔
- F-R2-02 (label-list sidebar) → app sidebar: brand lockup + CMS chip, grouped icon nav (Dasbor / Kelola konten / Operasional), accent active pill, bottom account block; ≤940px chip band. ✔
- F-R2-03 (no dashboard hierarchy) → stat band (Total konten 7 / Konsep / Leads baru) + KELOLA MODUL card grid with icon chips. All counts real API values; sums derived arithmetically from already-fetched counts (no invention). ✔
- F-R2-04 (default tables) → uppercase micro-headers, dot status pills with tone-paired text color, first-column emphasis, right-aligned bounded AKSI column with a 3-tier compact action system (ghost / accent-outline / danger-outline). ✔
- F-R2-05 (detached toolbar) → toolbar integrated as the list panel's head bar (`Status` select + labeled `Cari` + primary/ghost buttons on one hairline row). ✔
- F-R2-06 (uniform forms) → uppercase legends, 0.88rem/600 labels, focus-ring inputs, primary/secondary button tiering. ✔
- F-R2-07 (button-less system) → admin-scoped `btn-ghost` / `btn-danger-outline` / tightened `btn-small` on top of the existing `btn-primary`/`btn-accent-outline`. ✔
- F-R2-08 (login + flash) → centered brand card on the workspace canvas; `Memuat…` renders as a full-height canvas boot state (auth logic untouched). ✔
- F-R2-09 (flat type scale) → h1 1.45rem/700(-0.015em) → stat values 1.85rem/750 → section 0.84rem uppercase → micro .72rem; body .92rem. ✔
- Bonus: automatic `/favicon.ico` 404 eliminated via an icon link in `frontend/index.html` (frontend presentation file — permitted scope).

### 6.3 Exact verification results

| Check (exact command) | Result |
| --- | --- |
| `npm run build --workspace=frontend` (= `tsc --noEmit -p tsconfig.json && vite build`) | **PASS** ×3 (final: CSS 25.66 kB gzip 5.76, JS 287.28 kB gzip 84.38) |
| Backend Vitest `npm run test --workspace=backend` | **27/27 PASS** (printed counts definitive; the `-1` `$LASTEXITCODE` is a PowerShell pipe artifact) |
| Playwright permanent suite, headed `--workers=1`, fresh process + fresh `e2e.db` (`--grep-invert` on temp evidence) | run 1: 18/19 + evidence-budget failures → **real regression found** (below); run 2 (post-fix): **19/19 PASS** (51.2s); run 3 (final code): **19/19 PASS** (52.4s) |
| Temp evidence spec (fresh process, same `e2e.db` content): screenshots 13 + console/failed-request + matrix | **3/3 PASS** (35.8s): matrix **35/35 = 0px**; console **0 errors / 0 failed requests** (asserted `toEqual([])`) |
| Overflow matrix | 7 routes (`/admin`, `/admin/services`, `/admin/products`, `/admin/pricing`, `/admin/leads`, `/admin/settings`, `/admin/login`) × 5 widths (360/390/768/1024/1280) → all **0px** on the shipped code |

**The caught-and-fixed regression:** the first suite run failed the 360px admin overflow test. Cause: `.admin-split` (and `.admin-main`) used an implicit `auto` grid column below 1080px, which sizes to the nowrap-table max-content and defeats the internal scroll container; the stat tiles also had no wrapping at 360. Fix: explicit `grid-template-columns: minmax(0, 1fr)` on both, unconditional `flex-wrap` on `.admin-stat` — then 19/19 twice. Iteration note: a nowrap pass on row-actions (making single-line groups) was reverted via inspection — pricing/products rows clipped at the panel edge at rest; final allocation is a bounded 13rem AKSI column with ≤3 wrapped compact groups and no page overflow.

**Login-limiter accounting (per fresh backend process, limit 10/h):** run 1: suite ≈9 + rode-along evidence logins → evidence failed on budget as predicted; run 2: suite-only = 9/10; run 3: suite-only = 9/10; evidence process: 3/10 (shots 1 + console 1 + matrix 1). `dev.db` was **never** used for any test step this phase — no review-credential login needed; environment restored after every dance (health-checked).

### 6.4 Verification matrix (routes × widths)

- **Desktop 1280** — login, dashboard, products (form+list split), pricing (split), leads (panel), lead-detail (record panel), settings (split) — all inspected as `r2-admin-*` screenshots.
- **Mobile 390** — leads (sidebar chip band + in-panel table scroll), dashboard (nav-mobile capture).
- **Mobile/tablet 360** — login, dashboard, services (form+table), settings.
- **768 / 1024** — asserted in the 35-check matrix (≤1px); intermediate layout states verified by the suite's fallback assertions.
- Public pages: untouched public CSS/files (diff limited to admin + login + favicon link); permanent `app.spec`/`visual-followup.spec` passed in all suite runs; public evidence bytes restored after the suite's routine re-capture of `followup-produk-kasir-1280.png` (no public visual change).

### 6.5 Visual inspection notes (all 13 final-code captures reviewed by eye)

Login (1280/360): centered brand card, lockup, tidy fields, full-width primary. Dashboard (1280/360): stat band + module grid, real counts (7/0/0 from the e2e dataset), brand-tinted icon chips, active nav pills. Products/pricing (1280): split composition, integrated toolbars, dot badges, right-aligned action groups fully visible (Hapus in danger red). Leads (1280/390): single panel, single-line Detail/Proses/Tutup groups, in-panel scroll affordance visible at 390. Lead-detail: record panel with dt/dd grid. Settings (1280): table + right edit card, violet settings icon. Services (360): chip nav with icons, clean form, table scroll.

### 6.6 Remaining gaps / compromises

1. **In-panel horizontal table scroll** on content lists at narrow desktop widths with long slugs + full action sets (page overflow stays 0; standard SaaS pattern). Mobile keeps the same scrollable-table pattern rather than a card fallback — deliberate.
2. The admin still uses the global font stack (no webfonts introduced; the R2 system is pure CSS/markup).
3. Slug text wraps aggressively when the e2e data contains very long slugs (`pos-pesanan-penginapan — … [E2E]`) — data-driven, reads acceptably.
4. `.price` ("Konsultasi") renders from the pre-existing global `.price` public rule — carried over intentionally; not re-tuned this phase.
5. React dev StrictMode doubles the anonymous `/admin/auth/me` boot probe (two expected 401 console lines) — the console checkpoint records after the probes settle; production builds don't double-probe.

### 6.7 Scope-boundary confirmation

Changed only: `frontend/src/admin/cms.tsx`, `frontend/src/styles.css`, `frontend/index.html` (+1 favicon line), tests/screenshots evidence, and docs. **Never touched:** backend source/behavior, `shared/` contracts, DB schemas/migrations/seeds/data (`dev.db` untouched; `piple-spike-d1` never queried), auth/session logic, dependency versions/lockfiles, Cloudflare/DNS/infra/deploy, external product projects, TBD-01…16, decisions D-01…D-41. All paragraph text/labels/aria/input-order contracts from the e2e harness preserved verbatim.

