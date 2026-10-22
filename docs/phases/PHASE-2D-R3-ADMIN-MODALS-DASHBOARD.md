# Phase 2D-R3 — Admin Create Modal & Dashboard Experience

Status: **IMPLEMENTED — owner review PENDING** (do not mark accepted).

Date: 2026-10-22. Art direction and this report were written **before** implementation.
Base: `eabe6fc` (Phase 2D-R2, accepted design D-42 shell retained; R3 layers on top of it).

## 0. Owner verdict entering this phase

The owner reviewed R2 and returned **"Revision required"** with two directives:

1. Create-data forms must no longer stay permanently visible beside/above the data
   list; a full-width **"+ Tambah Data"** action above the table/status area opens a
   **modal** where the admin fills and explicitly saves.
2. The dashboard must be **substantially improved** with polished analytics, charts,
   recent activity/reviews tables, and useful admin features — without inventing data.

This phase explicitly allows `frontend/` presentation, E2E test updates, and phase docs.
Backend, shared contracts, DB, dependencies, Cloudflare/DNS/deploy remain off-limits.

## 1. Goals

- **A. Modal create/edit** for Services, Products, Portfolio, Articles, Pricing;
  Settings gets the same modal for its **edit-only** operation (no create is invented);
  Leads gets **no modal** (no manual create exists — leads arrive only via the public
  contact form).
- **B. Dashboard redesign**: KPI band, content-status visualization, leads overview,
  recent-leads table with working detail links, quick actions. No fabricated metrics,
  no decorative charts, no new dependencies.
- **C. Data integrity**: every figure from an existing API response; zero vs
  unavailable must be distinguishable; failures degrade per-panel with retry.

## 2. Pre-implementation inspection findings (read-only)

Findings that constrain the design (all verified by reading code, not assumed):

1. **`adminList` (backend/src/repo/content.ts)**: unfiltered admin list returns ALL
   statuses (only `deleted_at IS NULL` filtered) — archived rows included.
   `ORDER BY updated_at DESC` for every module. Default `per_page=20`, hard cap 100.
2. **`listLeads` (backend/src/repo/leads.ts)**: `ORDER BY created_at DESC` — the first
   N rows of an unfiltered list are genuinely the newest leads. Status filter is an
   exact `state` match (new / in_progress / closed).
3. **Pagination proof**: `meta.total` is a real `COUNT(*)`; row arrays can truncate.
   ⇒ Per-status counts MUST be read from `meta.total` of `?status=…&per_page=1`
   requests, never by counting rows of a single unfiltered page.
4. **`audit_log` exists in the DB and is written on every mutation**
   (repo/admin.ts `audit()`), but **there is no API endpoint to read it**. ⇒ No
   trustworthy activity feed is available to the frontend ⇒ the owner's optional
   "recent-activity ticker" is **not implemented**; a static recent-leads table is
   used instead. Adding an audit endpoint would require backend changes → out of
   scope, recorded as follow-up.
5. **Settings PUT schema** (routes/admin.ts): allowlist keys
   (`site_name`, `seo_defaults`, `whatsapp_number`, `whatsapp_templates`), `value_json`
   string, `is_public` boolean. No key creation exists → edit-title modal ("Ubah
   pengaturan"), opened per row.
6. **Current admin spec contract** (tests/e2e/admin.spec.ts, 163 lines, 19 tests in
   the suite): 4 UI logins here + 3 in app.spec.ts + bootstrap in beforeAll. Form
   queries are form-scoped (`getByRole('form', { name: 'Formulir konten' })` then
   input/button lookups inside), so moving the form into a dialog **keeps the locators
   valid**; only an explicit open-click must be inserted before interacting. Playwright
   `getByRole` name matching is substring-based; a closed native `<dialog>` is
   `display:none`, so its buttons never collide with page-level buttons.
7. **Login limiter** 10/h per backend process: new assertions must be added **inside
   existing tests** (no new `test()` blocks) to keep the suite within budget.

## 3. Art direction (pre-implementation)

Continuation of the D-42 white workspace: neutral `#f7f9fc` canvas, white panels,
1px `--line` borders, 14px radius, cyan/violet accents used sparingly, uppercase
micro-headers. R3 adds two layers to that system:

### 3.1 Modal system

- Native HTML `<dialog>` with `showModal()` — real focus trap, Escape, backdrop,
  inert background (background content leaves the accessibility tree, avoiding any
  name collisions between the page "+ Tambah Data" button and the modal submit).
- Card: white, 14px radius, 1px border, soft shadow; centered via UA `dialog`
  defaults; `::backdrop` = `rgba(15, 23, 42, .42)`, no blur tricks.
- Anatomy: modal head (title + close ×), scrollable body (max-height within
  `min(88dvh, …)`), pinned footer (ghost **Batal** + primary **Tambah/Simpan**).
  Header and footer stay usable on long forms — only the body scrolls.
- Create vs edit distinguished by **title** (`Tambah data` vs `Ubah: {slug}`) and
  **primary action label** (`Tambah` vs `Simpan`) — both preserved strings.
- Busy behavior: while saving, the submit shows `Menyimpan…`, Batal/×/Escape are all
  prevented (submit disabled + early-return in `save()` + `onCancel` preventDefault).
  Closing during save is impossible. Escaping outside a save closes without persisting.
- Success feedback: the modal closes, a page-level `role="status"` notice shows the
  existing strings (`Data baru tersimpan sebagai draft.` / `Perubahan tersimpan.` /
  `Pengaturan tersimpan.`), the list refreshes and preserves the active status filter /
  search. Errors stay **inside** the modal (page-level alert works only while the
  element is in the a11y tree — a closed modal must not be an error sink).
- ≤640px: the dialog becomes a near-full-width sheet (`calc(100vw - 1rem)`) capped
  `calc(100dvh - 1rem)` — fits the viewport, no page overflow, body scroll intact.

### 3.2 List pages

- The per-module split layout (form column + list) is removed. One full-width panel
  per page: a bordered **full-width "+ Tambah Data"** band at the very top of the
  panel (above the filter toolbar and table), then the existing toolbar (filter +
  search), then the unchanged table with its existing pills/actions.
- Leads inbox: no add band (no create support) — the panel keeps its toolbar + table.

### 3.3 Dashboard

- Keeps the R2 head (title + the exact sentence containing "Hanya konten") and the
  KPI band pattern, now as **four** tiles in the order the owner listed:
  Total konten · Published · Konsep · Leads baru — with reconciliation subtitles
  ("dari N total konten" / "dari N total leads").
- Below KPIs, a two-column band (stacks ≤1080px):
  - **Status konten modul** panel: one rows-loop over the 5 content modules, each
    row showing module label, per-status counts, and a native CSS stacked bar
    (published / draft / archived segments in tone colors with an aria-label naming
    all counts). Zero-content modules show an empty track and em-dashes — never fake
    zeros.
  - **Leads** panel: status distribution (new / in_progress / closed) as horizontal
    labeled bars with counts, plus a 7-day mini bar chart of real `created_at` data,
    only rendered when the fetched lead set is **complete** (`data.length ===
    meta.total`); otherwise the chart is replaced by an explicit note.
- **Leads terbaru** panel: the 5 newest real leads (Nama, Kebutuhan, Tanggal, Status
  pill, **Detail** link → existing `/admin/leads/:id`). Loading line, empty state
  ("Belum ada leads."), error line + **Coba lagi** retry button per panel.
- **Tindakan cepat**: a chip-link row (services/products/portfolio/articles/pricing/
  leads/settings) replacing the R2 module-card grid — navigation without duplicating
  the sidebar, and without a wall of stat-free cards.
- No activity ticker (finding 2.4), no neon, no decorative charts, no icons-only
  meaning; the KELOLA MODUL grid is retired.

## 4. UI architecture (planned)

- **`AdminModal`** (in cms.tsx, no new file/API): props `open, title, busy, onClose`;
  renders `<dialog aria-labelledby="admin-modal-title">` + a head with close ×.
  The receiving component supplies `<form aria-label="Formulir konten|Formulir
  pengaturan" className="admin-modal-form">` as the sole child (body + footer inside
  the form, so form-scoped tests keep working). Effect drives `showModal()`/`close()`
  from the `open` state; `onCancel` always preventDefaults and routes through
  `onClose` unless `busy` — Escape-while-saving keeps the dialog open.
- **`ContentList`**: opens the create modal with `EMPTY_FORM` (`+ Tambah Data`
  band → `openCreate()`); `Ubah {slug}` opens the same dialog prefilled
  (`startEdit` + open). Save success → close + notice + `refresh()` (filters kept).
  Save/validation failures → error + field errors inside the modal. New `saveError`
  state is separate from the page-level `error` (used by refresh/status/remove
  failures while the modal is closed). `Batal` always rendered inside the modal.
- **`SettingsPage`**: table gains an **Aksi** column with ghost `Ubah {key}` buttons
  opening the edit modal (key selected, full untruncated `value_json` prefilled,
  `is_public` from the row). The Kunci select, hints, checkbox, and save endpoint
  are unchanged. No add band.
- **`Dashboard`**: reads per-module totals + per-status totals and lead aggregates
  from meta.total values (see §5); granular per-panel error/loading states with
  retry; derived 7-day trend guarded by completeness. Sidebar, login, lead detail
  untouched; `api.ts` untouched (all reads are existing endpoints/params:
  `?status=…`, `?state=…`, `per_page`).

## 5. Data-integrity map (dashboard)

| Figure shown | Source (existing API) | Note |
|---|---|---|
| Total konten | `Σ meta.total` of 5× `admin.list(module)` | API COUNT(*) |
| Published total | `Σ meta.total` of 5× `?status=published&per_page=1` | exact, not derived |
| Konsep (draft) | `Σ meta.total` of 5× `?status=draft&per_page=1` | exact |
| Archived segments in stacks | `?status=archived&per_page=1` per module | exact |
| Per-module row counts | the four calls above, per module | sum = module total (fields labeled) |
| Leads baru | `?state=new&per_page=1` meta.total | exact |
| Distribution new/in_progress/closed | `?state=…&per_page=1` meta.total | exact |
| Leads total + 7-day trend | `?per_page=100` unfiltered list; trend only if `data.length === meta.total` | completeness-guarded; otherwise explicit note |
| Leads terbaru (5) | rows of that unfiltered list (server-ordered `created_at DESC`) | real records, real detail links |

Rules: a failed fetch group shows `—` (unavailable) plus per-panel retry — never a
faked zero; no invented totals, no double counting (statues: statuses are disjoint
DB enums, and stacked segment widths sum to the module total they came from).

## 6. Test strategy

1. **Permanent suite updates** (allowed this phase; matrix; no new test blocks):
   - `admin.spec.ts` 'admin modules render…': `.admin-card` → `.admin-stat`; keep
     "Hanya konten" text + all module headings.
   - 'products lifecycle…': insert `+ Tambah Data` clicks before the two create
     fills; after the first failed submit the SAME modal stays open with the alert;
     add focus-in-dialog assertion and an Escape-close step on the edit modal before
     Hapus; keep all existing field/button strings.
   - 'pricing quote…': insert open-modal clicks (pricing, portfolio, articles);
     add a duplicate-submit check in the pricing create: `page.route` delays the
     POST ~350ms; click Tambah, assert submit `toBeDisabled` + a forced second click,
     expect exactly **1** POST and one row; settings: click row `Ubah …` first;
     assert edit-modal title + `Batal`/Escape closing without creating anything.
   - Overflow test (360px, 4 routes) unchanged; dialogs closed → no layout impact.
   - `app.spec.ts` 'CMS create/publish/unpublish workflow (services)': insert the
     open-modal click before filling.
2. **Run discipline**: fresh backend process; throwaway `e2e.db` deleted fresh for
   bootstrap-needing runs; `--workers=1`; `E2E_NO_SERVER=1` with vite :5173 up;
   dev.db untouched; `backend/.env` token parsed silently.
3. **TypeScript + Vite build + backend Vitest (27/27 sanity)** before Playwright.
4. **Visual evidence**: headed screenshots — dashboard at 1280/360, products create
   modal and pricing edit modal open, settings modal, mobile 390 sidebar, plus
   public-page regression shots. Console/failed-request audit over admin + public
   pages at several widths via a temp spec, deleted afterwards (same as R2).
5. Public pages regression via the unchanged visual-followup suite (5 widths).

## 7. Risks / tradeoffs

- **25 small GETs per dashboard load** (20 content + 4 leads + 1 recent list): honest
  and pagination-proof at this scale; noted as a future `summary` endpoint follow-up.
- **Trend chart** only for ≤100 leads (completeness guard); more → explicit note.
- **No activity ticker** without an audit-read API; deferred with evidence.
- **Native `<dialog>`** relies on Chromium behavior used by Playwright (inert
  background removes page content from the a11y tree while open) — verified by the
  updated specs.
- Per-status `per_page=1` request fan-out is visible in devtools; acceptable, same
  pattern as R2's dashboard.

## 8. Results (post-implementation)

All planned work shipped; verification green end-to-end. Deviations from the pre-written plan are listed last.

**Build & unit**
- `tsc --noEmit` PASS; `vite build` PASS (CSS 29.34 kB → gzip 6.36 kB, JS 294.12 kB → gzip 85.93 kB).
- Backend Vitest 27/27 PASS (backend untouched this phase).

**Permanent Playwright suite — 19/19 PASS** (fresh `e2e.db`, fresh backend process, `--workers=1`, `--headed`, `E2E_NO_SERVER=1`, vite :5173):
- `admin.spec.ts`: dashboard test re-targeted to the R3 elements (`.admin-stat` + "Hanya konten"); products lifecycle now opens the create modal, proves focus lands inside the dialog, proves create-cancel discards (`cancel-me-no-save` never created), passes through validation alerts inside the modal, walks publish/edit/archive and asserts the dialog closes on success; pricing test intercepts `POST /api/v1/admin/pricing` with a 350ms delay, proves the submit is disabled while saving, forces a second click at the disabled button, and asserts **exactly 1 create POST**; portfolio/articles keep their create + edit (prefilled summary round-trip), `Batal` and newly `Escape`-close are asserted without persisting; settings opens the row `Ubah site_name` modal, saves, and asserts tersimpan + closed; 360px overflow matrix unchanged and green.
- `app.spec.ts`: services create/publish/unpublish flow opens the modal before filling (form-scoped submit click).
- Public regression specs (`app`, `tablet`, `visual-followup`: responsive 360–1280, images, no-TBD, no-failed-request) all green.

**Temp evidence spec (deleted after capture)**:
- Console/failed-request audit across the dashboard, content pages, and 8 public routes: **only** the two documented anonymous `/admin/auth/me` 401 probes (pre-login) — no other console errors, no other 4xx/5xx, no failed requests.
- Admin overflow matrix at 360px: `document.documentElement.scrollWidth ≤ 360` on /admin, /admin/products, /admin/leads, /admin/settings.
- Screenshots visually inspected: `r3-dashboard-1280.png` (four KPI tiles on one row, stacked bars, leads bars, 7-day chart, recent-leads table, quick chips), `r3-dashboard-390.png` (loaded state, clean stack, in-panel table scroll), `r3-modal-create-products-1280/390.png`, `r3-modal-create-pricing-1280.png`, `r3-modal-edit-settings-1280.png` (rows with Ubah, modal prefilled `site_name` `"Piple 2B"`, mobile sheet fits).

**Deviations found during implementation (recorded for honesty):**
1. **Admin module route paths** are `/api/v1/admin/<module>` (no `/content/` segment) — the planned route matcher used a `/content/` path and never fired; fixed to a function matcher on the real path (verified via DEBUG trace + full-URL logging during diagnosis; instrumentation removed afterwards).
2. **Settings allowlist union** — `getAllSettings` returns only stored rows, so on a fresh DB the table is empty and per-row-only Ubah would offer nothing; the table now renders the union of the table + the 4 contract keys (the ones the form's select already listed), `—` for not-stored, keeping PUT-as-upsert honest and the edit entry point always available. Documented in D-43.
3. **Public `fetchPriority` React warning** — a pre-existing public-image prop spelling caused a dev-mode console error (`React does not recognize fetchPriority`); fixed to the rendered lowercase `fetchpriority` attribute (no visual/behavior change) so the console audit is clean.
4. **Desktop KPI wrap** — the auto-fit stat grid wrapped 3+1 tiles at 1280px; a ≥1080px 4-column rule was added (verified visually in the recaptured screenshot).

**Process notes:** login limiter observed live — the first evidence attempt was rejected by the in-memory 10/h limiter after 9 audit-logged logins; resolved by restarting the backend process (limiter is per-process) while keeping the e2e DB. `dev.db` never touched (all testing on gitignored `e2e.db`); restricted paths (backend/, shared/, DB files, configs) verified untouched via `git status`; temp specs and probes deleted.

---
