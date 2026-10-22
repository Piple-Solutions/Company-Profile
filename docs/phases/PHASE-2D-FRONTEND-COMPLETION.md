# Phase 2D — Complete Frontend Experience (public site + Admin CMS)

**Date:** 2026-10-22 · **Executed:** local, read-only on infrastructure · **Deploy:** none
**Trigger:** owner directive to finish/polish the whole frontend before backend hardening, in an explicitly ordered workflow: audit → refine → verify → owner acceptance → only then hardening/deps/infra/deploy work.
**Status:** implementation + verification complete; **owner acceptance PENDING (not claimed on the owner's behalf)**.

---

## 0. Scope compliance

- **Touched:** `frontend/` source/styles, frontend e2e specs, this report, `docs/CHANGELOG.md`, `docs/DECISIONS.md` (appended rows only), repo git-index hygiene (see §5).
- **Untouched (verified):** `backend/` source, `shared/` contracts, database contents, migrations/seeds, dependency versions/lockfile, Cloudflare/DNS/secrets, `piple-spike-d1`, the three separate product projects. No deploy. `dev.db` kept intact (see §7).
- **Preserved:** TBD-01…TBD-16 register untouched; decisions D-17…D-25 and all earlier decision history preserved (appended only); D-28/D-30/D-31 honesty rules enforced in every change.

## 1. Initial repository and working-tree state

- The repository was **not** a git repo. Per the mandated safe-local-Git-baseline procedure, a baseline was created **before any modification**: `git init` + commit `9a9eb41` "Baseline: working tree as found before Phase 2D". `.gitignore` already excluded `.env`, `*.db`, `dist/`, `node_modules/`, spike artifacts; test evidence screenshots were tracked intentionally.
- Discovered during baseline review: `*.db-shm` / `*.db-wal` (SQLite WAL sidecars of `dev.db`) escaped the `*.db` rule and had been tracked; corrected this session (see §5, commit `7e87231`).
- Live environment at start: vite dev server `:5173` (owner review session) + backend `:8787` on `./dev.db` (admin review session with `admin@piple.local` deactivated and the new Super Admin active; 1 pre-existing published seed service `seed-svc-1`; WhatsApp placeholder per D-30).
- Working tree at start contained no leftover changes beyond the committed Phase 02A work and the Phase 2D session's own audit report.

## 2. Route and component inventory (from the actual router, not from docs)

**Public (13 + catch-all)** — `frontend/src/App.tsx`:
`/` · `/tentang` · `/layanan` · `/layanan/:slug` · `/produk` · `/produk/:slug` · `/portofolio` · `/portofolio/:slug` · `/harga` · `/artikel` · `/artikel/:slug` · `/kontak` · `/privasi` · `*` (404 page). The documented sitemap matches the code; no undocumented route exists.

**Admin (protected shell):**
`/admin/login` · `/admin` (Dashboard) · `/admin/leads/:id` (LeadDetail) · `/admin/:module` where module ∈ {services, products, portfolio, articles, pricing, leads, settings} — 7 modules, matching the 2B/audit route count.

**Components:** `Layout.tsx` (header/nav/brand, mobile toggle, FAB, footer, `Empty`, `FieldError`, `PageHeader`, `Breadcrumbs`, `CtaBand`, `WhatsAppCta`), `ProductVisual.tsx` (hero banner + product thumbs/galleries, honest `ShotPlaceholder` fallback), `pages/public.tsx` (12 page components), `pages/Kontak.tsx` (inquiry form), `admin/cms.tsx` (AdminProvider, Login, AdminLayout, Dashboard, ContentList, LeadsInbox, LeadDetail, SettingsPage, ModuleRoute), `api.ts` (same-origin `/api`, CSRF, typed error with `status`/`fields`), `styles.css` (documented design-token system).

## 3. Frontend audit findings (F-2D-xx) and their resolution

| ID | Finding (evidence) | Resolution |
|----|--------------------|------------|
| F-2D-01 | `Portofolio`, `Harga`, `Artikel` lists rendered the *"segera hadir / belum ada"* empty state **also when the fetch failed** — a request error read as "no published content": misleading (violation of the honesty posture of D-28/D-31). | **Fixed**: explicit `Gagal memuat ….` error state + `Memuat…` loading gate + empty state only for genuinely-loaded-but-zero datasets (mirrors the existing `Produk` precedent). |
| F-2D-02 | Long-form detail bodies (`Layanan`/`Portofolio`/`Artikel` detail) rendered one squeezed `<p>` — newlines lost. | **Fixed**: `Paragraphs` helper (plain-text, blank-line split into real `<p>`, no HTML injection) + `.prose` styles. |
| F-2D-03 | Public pricing table unwrapped at 360px (CTA pill in third column risks horizontal overflow). | **Fixed**: wrapped in `.table-wrap`; verified overflow ≤ 1 at all five widths + visually inspected (`phase2d-public-harga-360.png`). |
| F-2D-04 | `/tentang` page was a thin single block (honest TBD, but no structure/navigation affordance). | **Fixed**: two-column layout (≤900px stacks) — left: preserved honest TBD profile + the existing 3 "Yang kami tawarkan" bullets; right: links **only** to real routes (7 service detail pages + Produk/Portofolio/Harga/Artikel indexes). Zero new claims. |
| F-2D-05 | Content editor form: one flat field stack, required fields not visibly marked, no busy state on submit (double-click risk), no session-expiry recognition. | **Fixed**: `fieldset/legend` groups (Identitas / Isi / module-specific group / Publikasi), `*`-marked required fields + hint line, `Menyimpan…` + disabled submit during in-flight saves, 401 → "Sesi berakhir. …" messaging (`fail()` + status/action handlers + Leads + Settings). |
| F-2D-06 | Dashboard failure mode: `Promise.all` catch rendered indistinguishable "—" everywhere (no error signal); no content-status dimension. | **Fixed**: explicit `role="alert"` load-error state; per-module `Total / Draft` counts + dedicated `Leads (Baru)` card — all via the existing list API (`?status=draft`, `?state=new`); no invented data. |
| F-2D-07 | Published CMS rows had no direct review path to the public page. | **Fixed**: `Lihat publik …` link on published rows (services/products/portfolio/articles → detail route; pricing → `/harga`); e2e assertion added. |
| F-2D-08 | Leads inbox lacked timestamps and context-labeled row actions; articulation of who/when at a glance. | **Fixed**: `Tanggal` column (ISO date part of `created_at`); `Proses/Tutup` buttons get per-lead accessible names (`Proses {name}`); visible text unchanged (test contract preserved). |
| F-2D-09 | Settings value field took arbitrary JSON with no contract hints. | **Fixed**: per-key `form-hint` (string vs object, E.164 note reusing the `"+6200000000000"` placeholder convention from the allowlist spike; the D-30 behavior — unset number shows a non-clickable placeholder — is spelled out). |
| F-2D-10 | Login page had zero context (no brand statement, no way back). | **Fixed**: single-Super-Admin note + "← Kembali ke situs publik" link; labels untouched (test contract). |
| F-2D-11 | Mobile nav toggle label stayed "Buka menu" while open (`aria-expanded` correct but label misleading). | **Fixed**: dynamic `aria-label` ("Buka menu"/"Tutup menu"); mobile-nav e2e still passes (label asserted pre-click). |
| F-2D-12 | Repo index tracked live WAL sidecars (`dev.db-shm`/`-wal`, `e2e.db-shm`/`-wal`) — runtime files would have churned in every commit. | **Fixed**: `.gitignore` + `*.db-shm`/`*.db-wal`; index untrack (`git rm --cached`, disk files untouched) in commit `7e87231`. |
| F-2D-13 | Review need: previous overflow matrix covered 360/768/1024/1280 but **not 390**, and key content routes (`/tentang`, `/portofolio`, `/harga`) only partially. | **Fixed**: permanent regression now covers 360/**390**/768/1024/1280 × {home, produk, 2 product details, tentang, portofolio, harga}. |

**Deliberately not changed (documented):** raw English status/state keys (`draft`/`published`/`in_progress`/…) kept in admin badges; `Kelola {module}` h1 wording; submit-gated search; native `window.confirm` for destructive actions; no pagination; services list static-first design. Rationale each: e2e contract stability, data scale, simplicity — see §9.

## 4. Workstreams

- **A — Baseline & inventory: DONE** (§1–§2; baseline tests below).
- **B — Public consistency: DONE** (F-2D-01/02/03/04; all 13 public routes re-audited; hero/produk/kontak/privasi kept — already demonstrably good).
- **C — Admin dashboard & shared layout: DONE** (F-2D-06/10; sidebar/login untouched where good).
- **D — CMS lists/tables: DONE** (F-2D-07/08; actions all verified against real API).
- **E — Editor forms & feedback: DONE** (F-2D-05/09; per-module extras preserved verbatim incl. readiness/demo/quote/serviceRef/datalist).
- **F — Leads & Settings: DONE** (F-2D-08/09).
- **G — Responsive/a11y/interaction regression: DONE** (§8; 5-width matrix + admin 360 matrix + evidence screenshots).
- **Remaining in this phase:** none. **Remaining in roadmap (not this phase):** CT-01 content supply, HA-01 hardening, HA-02 dependency majors, CF-01 staging, BK-01 backup drill, CN-01 concurrency, SEO-01, DP-01 — all require owner authorization (unchanged from the audit roadmap).

## 5. Files changed (commit `23c2bd9` + doc commit; base `9a9eb41`, hygiene `7e87231`)

| File | Change |
|------|--------|
| `frontend/src/pages/public.tsx` | `Paragraphs` helper; loading/error/empty gating on Portofolio/Harga/Artikel; Tentang two-column; pricing table wrapped |
| `frontend/src/admin/cms.tsx` | form fieldsets + `*` + busy submits; 401 messaging (`SESSION_EXPIRED`); `Lihat` publik links; Dashboard draft counts + error state; Leads `Tanggal` + named actions; Settings hints; Login note/back-link |
| `frontend/src/components/Layout.tsx` | dynamic nav-toggle `aria-label` only |
| `frontend/src/styles.css` | `.prose`, `.tentang-grid` (+≤900px stack), `.admin-form fieldset/legend`, `.admin-login-note` (697 → 760 lines) |
| `tests/e2e/visual-followup.spec.ts` | overflow matrix extended: +390px, +`/tentang` +`/portofolio` +`/harga` |
| `tests/e2e/admin.spec.ts` | +`Lihat publik` assertion after publish |
| `tests/screenshots/*` | 3 refreshed regression shots + **29 new `phase2d-*.png` evidence** |
| `.gitignore` | +`*.db-shm`, `*.db-wal` (WAL sidecars; commit `7e87231` untracked existing ones — `git rm --cached`, disk untouched) |
| `docs/CHANGELOG.md` | `[phase2d — 2026-10-22]` entry |
| `docs/DECISIONS.md` | appended D-34…D-39 (this work's decisions; nothing rewritten) |
| `docs/phases/PHASE-2D-FRONTEND-COMPLETION.md` | this report |

**Not touched:** backend source/tests/DB/`dev.db` content, `shared/`, lockfile/deps, Cloudflare config, product asset registry (`ProductVisual`), hero (2A work preserved byte-level), `Kontak.tsx` (form labels/assertions preserved), `api.ts`.

## 6. Major visual & usability decisions

1. **Honesty over prettiness:** a failed request must never look like "content announces soon" — error vs empty vs loading are now three distinct states everywhere needed (public lists + dashboard).
2. **Form fieldset contract:** DOM input order preserved (slug = input[0], title = input[1]) because the e2e suite uses positional selectors; grouping is presentational only. Field legends uppercase, required marked with `*` + one-line hint ("Tanda * menandai kolom wajib…").
3. **Dashboard adds a draft dimension, not duplication:** `Total · Draft` per content module + `Baru` leads — same single API surface; failure is an explicit alert, never a silent zero.
4. **"Lihat publik" only for `published` rows** (drafts would land on the not-found state) and pricing links to the page, since pricing has no per-item URL.
5. **Admin keeps raw status keys** (`draft`/`published`/`in_progress`) — already asserted by permanent e2e, unambiguous for triage; translated labels would need coordinated UI+test change with owner sign-off.
6. **Tentang = links to real content only**; the profile TBD block stays literally unchanged (D-31).
7. **Settings hints document the existing JSON contract** (with the `.env`-style placeholder number `"+6200000000000"` — no real contact data invented, D-30).
8. **Busy-state naming:** in-flight submit buttons switch to `Menyimpan…` (brief; specs click before the switch and assert notices after).
9. **No redesign of demonstrably good parts:** hero (2A), product galleries/registry (2A): untouched; CMS layout skeleton (2B): preserved.

## 7. Tests actually executed (2026-10-22)

**Baseline (pre-edit):**
- `npm run build --workspace=frontend` → **PASS** (tsc + vite, 49 modules).
- `npm run test --workspace=backend` → **27/27 PASS** (1.84s).
- `npx playwright test --headed --workers=1` (fresh backend process + fresh gitignored `e2e.db`, `E2E_NO_SERVER=1`, token passed silently) → **19/19 PASS (44.5s)**.

**Post-edit (final):**
- `npm run build --workspace=frontend` → **PASS** (CSS 14.95 kB, JS 280.67 kB).
- `npm run test --workspace=backend` → **27/27 PASS** (2.70s) — backend regressed-clean, untouched.
- `npx playwright test --headed --workers=1` (fresh backend + fresh `e2e.db`) → **19/19 PASS (~1.1m)**, including the two spec updates and every preserved 2A/2B assertion.
- Temporary evidence spec → **1/1 PASS (13.1s)**, capturing 29 screenshots (deleted spec, kept PNGs). Execution note: in the first combined run the temp spec failed because it rode the main suite and hit the 10/hour admin login ceiling exactly; rerun against a fresh backend process (same `e2e.db` content) succeeded — documented here for transparency.
- `dev.db` integrity: e2e used **only** the gitignored `e2e.db` (deleted afterward); the dev backend was restored to `:8787` on `./dev.db` with health OK after every dance step; no DB content change from this phase.

## 8. Responsive & accessibility verification

- **Widths:** 360 / **390** / 768 / 1024 / 1280 — no horizontal overflow (≤1px tolerance) on `/`, `/produk`, both product detail fixtures, `/tentang`, `/portofolio`, `/harga` (permanent spec); admin `/admin`, `/admin/products`, `/admin/leads`, `/admin/settings` at 360 (permanent spec).
- **Headed-browser visual inspection** of 29 evidence screenshots (§10) — incl. mobile pricing table containment, Tentang stacking, dashboard draft counts, grouped CMS form, services table with `Lihat` actions.
- **Console/page errors:** existing no-error tests + `problems[]` assertions pass (also covering failed local requests).
- **Images:** all `img.complete && naturalWidth>0` on inspected paths; `.shot-frame`/banner `object-fit: contain` everywhere (asset spec untouched).
- **A11y:** visual focus styles pre-existing (global `focus-visible`); skip link intact; mobile toggle truthful expanded state + dynamic label; lead actions now carry per-lead accessible names; form required fields marked with `*` (label text) + hint; error/notice roles (`role="alert"` / `role="status"`) preserved and added where new states appeared; reduced-motion rule pre-existing and untouched.
- **Keyboard:** permanent focus-order spot-check passes; admin actions reachable in logical order.

## 9. Known limitations / deferred to backend hardening

1. **Dependency majors** (`vitest`→ newer, `react-router` upgrade): explicitly out of scope (HA-02; `npm audit` posture per 2026-10-22 audit; dev-only critical path via tinypool).
2. **Session/runtime auth UX:** 401 now explains "Sesi berakhir…" but there is no auto-refresh; deeper session semantics belong to HA-01.
3. **Rate-limit (429) messaging:** surfaced generically today; a specific friendly mapping is a backend/client contract change → HA-01.
4. **Admin status keys untranslated:** needs owner decision + coordinated UI/test change.
5. **Search is submit-gated** (no live-as-you-type): deliberate; a debounced live search is a small future frontend change, not needed at current data scale.
6. **No pagination** in CMS lists: justified by current data volumes + API shape (meta.total only feeds the count display); revisit when real content grows.
7. **Native `window.confirm`** for delete/archive-adjacent flows: could become a styled in-app dialog; kept native for reliability/simplicity.
8. **Services list static-first** (silent fallback to static content if CMS fetch fails): documented tradeoff, not an error state on purpose — content stays visible.
9. **Minor niceties parked:** login page doesn't redirect already-authenticated users to the dashboard; `AdminProvider` boot loader is plain text.

## 10. Evidence

- `tests/screenshots/phase2d-public-{home,produk,harga,tentang}-{360,390,768,1024,1280}.png` (20)
- `tests/screenshots/phase2d-public-kontak-{360,390,1280}.png` (3)
- `tests/screenshots/phase2d-admin-{dashboard-1280,dashboard-360,services-1280,services-360,leads-1280,settings-360}.png` (6)
- Refreshed regression shots: `admin-dashboard-1280.png`, `admin-products-1280.png`, `followup-produk-kasir-1280.png`
- Git: baseline `9a9eb41` → hygiene `7e87231` → implementation `23c2bd9` (history preserved; no forced rewrites).

### How to reproduce locally
```bash
# terminal 1 — backend (uses ./dev.db by default)
npm run dev --workspace=backend            # node --watch ./src/dev.ts on :8787
# terminal 2 — frontend
npm run dev --workspace=frontend           # vite on :5173 (proxy /api → :8787)
# tests (from tests/, with E2E_NO_SERVER=1 and E2E_BOOTSTRAP_TOKEN set;
# discipline: fresh backend process + deleted backend/e2e.db* + --workers=1)
npm run test --workspace=backend
npx playwright test --headed --workers=1
```

## 11. Owner review checklist (acceptance **PENDING**)

Log in at `http://localhost:5173/admin/login` with the Super Admin credentials delivered privately in chat on 2026-10-22 (never stored in docs/git; recovery path documented in the progress audit). Suggested pass:

**Public (each at 360/390/768/1024/1280):**
- [ ] Home hero + CTA hierarchy unchanged and intended; product strip intact
- [ ] Tentang: two-column layout honest & useful (profile TBD preserved)
- [ ] Layanan list & detail (paragraph rendering visible on published bodies)
- [ ] Produk index/detail (badges, galleries, honest demo slots)
- [ ] Portofolio / Harga / Artikel: loading → (content | honest empty) behaviors
- [ ] Harga table usable at 360px (contained scroll, no page overflow)
- [ ] Kontak form: labels, validation feedback, consent, success/error states
- [ ] Privasi + 404 page; nav/footer/FAB across widths (mobile menu opens/closes)

**Admin CMS:**
- [ ] Dashboard: total/draft counts + new-lead card look right; honest error state understood
- [ ] Login page context + back link
- [ ] Services/Products/Portfolio/Articles/Pricing: grouped form, required marks, field-level validation, Save/Publish/Unpublish/Archive/Delete, `Menyimpan…` busy state, `Lihat` on published rows
- [ ] Leads inbox: date column, named Proses/Tutup, detail facts + timestamps
- [ ] Settings: per-key hints; allowlist/public toggle semantics unchanged
- [ ] 360px admin: sidebar stacks, tables scroll in place

**Verdict options:** accept as-is, or supply a change list (becomes the next focused refinement). Per §9/§11 of the phase directive: **no backend hardening, dependency upgrades, Cloudflare/D1, or deployment work starts before explicit owner approval.**

---

## 12. Revision R1 (2026-10-22): Admin UI visual refinement — owner feedback "UI admin masih polos"

**Owner verdict on Phase 2D:** *"Ada revisi sebelum diterima."* — the admin CMS must feel like the same product as the public site. This is a focused presentation-layer revision; no Phase 2D work is reverted.

### R1 change plan (written before implementation)

Audit of the 2D evidence screenshots (`phase2d-admin-*.png`) showed the actual visual inconsistencies against the public design language:

1. **No brand presence:** the admin shell has no PipleSolution lockup; the aside is a bare text list on the page background (public site always carries the logo lockup + wordmark styling).
2. **No component depth:** admin cards/tables/forms are flat 1px-border boxes while the public system has a softer premium feel (shadowed hero/browser cards,contained tables). Admin cards need the same subtle elevation.
3. **No hierarchy signals:** table headers are ordinary text; required-field marks exist but legends don't group visibly; toolbars float loose; "Total" is plain text instead of a stat.
4. **Action semantics:** Publish/Proses (the "push forward" actions) look identical to destructive ones; nothing distinguishes them at a glance.
5. **Login:** plain page, no brand, no card.

**Planned smallest-change set (CSS-first, 4 JSX touchpoints):**
- `styles.css` only replaces the internal `admin` section (scoped to `.admin-*`, `.table-wrap`, `.toolbar`, admin-scoped `table.data th/td` and `.badge`) — public primitives (`.btn`, `.badge` base, `.empty`, `.prose`, hero/cards) stay byte-identical.
- Shell: aside becomes a sticky white panel with elevated card styling carrying the real brand lockup (`.brand-lockup`/`.brand-mark` reused), CMS/email note, pill-active nav; main becomes a rhythmic grid (hairline page heads, uniform card spacing).
- Dashboard: count typography (stat + muted sub-span — same visible text), leads card accent-keyed, settings card neutral-keyed.
- Tables: uppercase letter-spaced headers, roomier rows, hover tint, first-column emphasis — inside the existing `.table-wrap` card.
- Forms: h2 + hint rhythm, uppercase muted legends, cleaner fieldset spacing; Inline validation and field DOM order untouched (test contract).
- Toolbar → chip bar (pill container); Publish/Prose buttons get an outline-accent variant; login page becomes a centered brand card on the public surface band.
- Responsive: ≤900px sidebar becomes static chip-wrap row; ≤640px density tune; 360px overflow re-certified.

**Test contract preserved:** every aria-label, label text, visible name, input order, h1/button/cell string asserted by `admin.spec.ts` / `app.spec.ts` stays exact; the revision adds no and removes no asserted elements.

### R1 implementation & verification results

### R1 implementation & verification results (2026-10-22)

**Files changed (3, presentation only):**
- `frontend/src/styles.css` — admin workspace section rewritten (elevated branded sidebar panel, active nav pill, rhythmic main grid + hairline page heads, stat typography, accent/neutral card keys, chip toolbar, uppercase roomy table headers with hover + first-column emphasis inside card-styled `.table-wrap`, legend/fieldset rhythm, outline-accent `.btn-accent-outline`, centered brand login card on the surface band; ≤900px sidebar → wrapping chip row; ≤640px density tune). Public primitives and hero/2A work untouched; the 2D-era duplicate fieldset/legend rules at EOF were removed (consolidated into the workspace block).
- `frontend/src/admin/cms.tsx` — 9 additive touchpoints: login wrapped in `.admin-login`/`.admin-login-card` with brand lockup; sidebar brand lockup + `.admin-aside-note` + `.admin-aside-back`; dashboard cards keyed (`card-leads` accent, `card-settings` neutral) with counts split into `stat-main`/`stat-sub` spans (same visible text incl. separators); `Total: <strong>{total}</strong>` in ContentList + LeadsInbox (text unchanged); `btn-accent-outline` on Publish + both Proses actions. Every aria-label, label, input order, and asserted string preserved.
- `docs/phases/PHASE-2D-FRONTEND-COMPLETION.md` — this R1 section.

**Test contract:** `tests/e2e/*` spec files unchanged this revision (the suite re-verified the preserved selectors/strings unchanged).

**Executed checks and exact results:**
1. `tsc + vite build` (frontend workspace) — **PASS**, CSS 18.05 kB / JS 281.61 kB (gzip 4.34 / 83.13 kB).
2. Backend Vitest — **27/27 PASS**.
3. Playwright headed Chromium, fresh backend process + fresh gitignored `e2e.db` + `--workers=1` — permanent suite **19/19 PASS (55.3s)** with all R1 changes. The temp shots spec again exceeded the shared 10/h login budget inside the main run (expected pattern, documented in §10); it was re-run alone on a fresh backend process — **1/1 PASS**.
4. Admin overflow matrix (temp read-only spec, deleted after run; one login on the dev backend with review-admin credentials, navigation only — no content mutations): **25/25 route×width checks = 0px horizontal overflow** (`/admin`, `/admin/services`, `/admin/leads`, `/admin/settings`, `/admin/login` × 360/390/768/1024/1280; ≤1px tolerance).
5. Visual inspection of all **12 `tests/screenshots/r1-admin-*.png`** (login 1280/360, dashboard 1280/360, products/pricing/services/leads/settings 1280, services/settings 360, leads 390): brand lockup present, active nav pill styled, stat/total emphasis, fieldset legends, uppercase headers, badge pills; leads table scrolls inside its `.table-wrap` card at 390 (no page overflow). Permanent-suite evidence shots `admin-dashboard-1280.png` + `admin-products-1280.png` refreshed by the suite re-run.

**Boundary confirmation:** git diff covers only the 3 files above (+ refreshed/new evidence PNGs); no backend, shared-contract, DB schema/seed/migration/content, dependency/lockfile, Cloudflare/DNS, or deployment changes. `dev.db` content untouched apart from one session row created by the matrix login itself.

**R1 acceptance:** PENDING owner review.
