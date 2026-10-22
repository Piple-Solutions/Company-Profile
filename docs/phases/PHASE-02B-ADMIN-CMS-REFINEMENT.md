# Phase 2B — Admin CMS Refinement (frontend admin UI only)

> Authorization: Phase 2B prompt (refinement of the existing Super Admin CMS,
> not a rewrite). Owner has accepted the public website — its design and
> behavior are preserved untouched. Backend, shared contracts, database,
> migrations, seeds, infrastructure, Cloudflare, DNS, secrets, deployment:
> OUT OF SCOPE and unchanged. No deploy. Stop after Phase 2B for owner
> review; no backend hardening or infra work starts here.

## 1. Preflight (completed before any code edit)

Read in full: `PRODUCT-REQUIREMENTS.md`, `ARCHITECTURE.md`, `DATABASE.md`,
`API.md`, `WORKFLOW.md`, `DESIGN-SYSTEM.md`, `TESTING.md`, `SECURITY.md`,
`DEPLOYMENT.md`, `DECISIONS.md` (D-01–D-33; all TBD-01–TBD-16 IDs/titles
preserved — this phase resolves or renumbers none), `PHASE-01-IMPLEMENTATION.md`,
`PHASE-01-POST-IMPLEMENTATION-AUDIT.md`, `PHASE-02A-PUBLIC-REFINEMENT.md`,
`PHASE-02A-FOLLOWUP-VISUAL-POLISH.md`, `PHASE-02A-ERP-ASSET-INTEGRATION.md`,
latest changelog. Inspected: `frontend/src/admin/cms.tsx` (entire 405-line
CMS), `frontend/src/api.ts` (admin client), `frontend/src/App.tsx` (admin
routes), `backend/src/routes/admin.ts` + `backend/src/repo/content.ts` +
`shared/src/index.ts` + `backend/src/auth/ratelimit.ts` (**read-only** —
to learn exactly which fields/params the existing API already accepts).
No material conflict with the approved scope. No backend defect found that
blocks the acceptance criteria below (no fix approval needed).

## 2. Findings — actual workflows and limitations (from code, not assumed)

- Auth/session/CSRF/logout, `RequireAuth` redirect, generic login error
  (`role=alert`) all exist and stay as-is (mechanism + copy).
- `AdminLayout` sidebar is a plain link list (no active state, no headings
  hierarchy); `.admin-shell` stacks only ≤640 px; admin `<table>`s use no
  responsive class → wide tables can overflow the page on mobile/tablet.
- `Dashboard` is static (heading + paragraph + link list): no live counts,
  no inbox signal, no hierarchy.
- `ContentList` (all 5 modules, one generic component):
  - No loading state (empty table + `Belum ada data.` flashes on every load);
    no success feedback; save errors show only `err.message`, dropping the
    server's field-level `fields` map.
  - Field-mapping gaps: "Ringkasan" input is silently dropped for articles
    (no `summary_id` column — the real field is `excerpt_id`) and for
    products/pricing (real field: `tagline_id` for products; none for
    pricing). Uneditable via UI despite existing API support: products
    `readiness`/`demo_url`/`tagline_id`/`features_id`, pricing
    `price_amount`/`is_custom_quote`/`service_ref`/`features_id`/`limits_id`,
    portfolio `client_name` (PATCH accepts all of these — verified in
    `createSchemas[table].partial()` + `WRITABLE`; UI-only gap).
  - Row actions are Publish/Unpublish toggle + delete (`window.confirm`
    kept); `archived` reachable only via the edit-form select — no row-level
    Archive action per the WORKFLOW draft→published→archived lifecycle.
  - No status filter / search although `GET /admin/{module}` already accepts
    `?status=` + `?q=` (verified in `parsePaging` + `adminList`); no result
    count beyond `Total`.
  - Tables show slug/title + status only (no readiness badge, price, or
    client columns that would aid triage).
- `LeadsInbox`: state filter exists; refresh/setState have no try/catch
  (rejections surface only as console errors); no loading/error/count states;
  contact column is admin-only triage data (kept — necessary, not
  unnecessary, per scope; Super Admin session only).
- `LeadDetail`: no loading-vs-not-found distinction; no inline status
  actions (round-trip to inbox required for every state change).
- `SettingsPage`: key select already matches backend `KNOWN_SETTINGS`
  (do not extend); no loading/success states; 80-char truncation kept.
- `Login`: no busy state (double-submit possible).
- E2E surface to preserve verbatim: `Formulir konten` label, `Tambah`,
  `Publish`, `Proses`, `in_progress` cell text, login labels, module link
  names, alert/status roles.
- Rate budget for tests: login 10/hour/IP, in-memory (fresh backend process
  = fresh budget); full suite ≈ 7 logins — plan ≤3 full headed runs/hour,
  targeted spec runs while iterating.

## 3. Scope (refinement only; every item uses existing API/CSS tokens)

1. Admin chrome: `NavLink` active states, labeled sidebar sections, `main`
   landmark, sidebar stacks ≤900 px; page-header hierarchy per view.
2. Dashboard: live per-module totals + new-lead count (existing list
   endpoints, `meta.total` — real data, nothing invented) as link cards with
   one-line honest descriptions; draft gate reminder kept.
3. `ContentList`: loading vs empty states; success note (`role=status`);
   server field errors mapped to inputs; fixed field mapping
   (articles→`excerpt_id`, products→`tagline_id`, pricing hides summary);
   module extras with honest helpers — products: `tagline_id`,
   `readiness` select ("sesuai konfirmasi pemilik"), `demo_url` ("URL
   eksternal terverifikasi; kosongkan bila belum ada"), `features_id` as
   one-per-line textarea (JSON-lines conversion, UI-only, raw fallback);
   pricing: `price_amount` + custom-quote checkbox (null + `is_custom_quote`),
   `service_ref` datalist of the 7 slugs, `features_id`/`limits_id` lines;
   portfolio: `client_name`; status filter + search (`?status=`, `?q=`) +
   count; row-level Archive; extra triage column per module (readiness /
   price-or-quote / client); `table.data` + scroll wrapper; slug-aware
   delete confirm; cancel/reset; slug-labeled action `aria-label`s.
4. Leads: loading/error/count states, labeled filter; detail gets
   loading-vs-not-found + inline Proses/Tutup (existing PATCH) with
   feedback. Contact display kept (admin-only triage necessity, documented).
5. Settings: loading + success states; truncation + key set unchanged.
6. Login: busy/disabled submit state.
7. CSS (append-only): admin header/cards/toolbar/table-wrap, lead-state +
   readiness badge variants, ≤900 px sidebar stacking. Public styles,
   tokens, and public pages byte-untouched.
8. Tests: new permanent `tests/e2e/admin.spec.ts` (single UI login; all 8
   module headings; products full lifecycle incl. readiness/demo fields +
   archive + delete with dialog handler; pricing quote lifecycle;
   portfolio/articles create+delete; settings save; lead-detail inline
   action). Throwaway `e2e.db` only — never owner data (`dev.db` untouched).
9. Explicitly NOT doing: new endpoints/params/columns, contract/schema
   changes, custom modal system (native confirm kept), uploads, roles,
   public UI changes, new dependencies.

## 4. Acceptance criteria

All admin modules render with hierarchy; create/edit/publish/unpublish/
archive/delete verified per module through the current API; validation,
loading/empty/error/success states present; tables scroll safely on mobile;
keyboard/focus/labels intact; existing 14 specs pass unmodified alongside
new admin specs; `tsc` + `vite build` + Vitest 27/27 pass; headed Playwright
full suite green; no backend/shared/DB/doc-TBD changes (file list recorded
in §6).

## 5. Risks

Login rate budget (mitigated per §2); e2e isolation discipline (fresh DB +
single worker, as established); no owner-data risk (tests use `e2e.db`;
`dev.db` never opened). No backend defect blocks acceptance — no fix
approval requested.

## 6. Results (filled after implementation + verification)

### Files created / modified

- Rewrote `frontend/src/admin/cms.tsx` (same file, same exports): refined
  Login (busy state), `NavLink` sidebar + `main` landmark, live-count
  Dashboard cards, upgraded `ContentList` (loading/empty/success states,
  server field-error mapping, corrected field mapping, per-module extras,
  status filter + search, Archive action, triage columns, responsive tables,
  slug-aware confirms/labels), `LeadsInbox` (loading/error/count/labeled
  filter), `LeadDetail` (loading-vs-not-found + inline Proses/Tutup),
  `SettingsPage` (loading/success). All pre-existing e2e hooks preserved
  verbatim (headings, link names, button names, form labels, alert/status
  roles, empty texts).
- `frontend/src/styles.css` (append-only): admin header/cards/toolbar/
  table-wrap/form layout (labels above inputs — fixed cramped inline layout
  found in screenshot review), lead-state + readiness badge variants,
  sidebar stacking ≤900 px. No public rule altered.
- `tests/e2e/admin.spec.ts` (new, permanent): 4 specs — module hierarchy +
  live counts, products full lifecycle (validation feedback, readiness/demo
  fields, publish/unpublish/archive/delete), pricing quote + portfolio +
  articles + settings + lead-detail action, 360 px overflow matrix.
- `tests/screenshots/admin-dashboard-1280.png`,
  `admin-products-1280.png` (evidence, visually inspected).
- This report (§§1–5 written before implementation) + changelog entry.

### Behavior changes per module

Dashboard: static link list → live totals per module + new-lead count
(existing endpoints, real data) as descriptive link cards. Services: filter/
search/archive/triage column (category). Products: tagline/readiness/demo/
features editing with honest helpers (owner-confirmation + verified-URL
wording, empty-URL→null so no Live Demo without URL), readiness column.
Portfolio: client-name field + column (approval-honest helper). Articles:
summary→`excerpt_id` mapping fix (was silently dropped) + excerpt column.
Pricing: price/quote/service-ref/features/limits editing (null = custom
quote renders Konsultasi), price column. Leads: error/loading/count states;
detail inline status actions with feedback. Settings: loading/success;
key set + truncation unchanged. Login: busy guard. Delete confirms now name
the slug. Contact display in inbox kept (Super Admin-only triage necessity).

### Test commands + results (all actually executed)

- `npm run build --workspace=frontend` (repo root) → `tsc --noEmit` PASS +
  `vite build` PASS — CSS 13.31 kB, JS 276.16 kB.
- `npm run test --workspace=backend` → Vitest **27/27 PASS** (regression).
- Playwright headed Chromium, fresh `e2e.db`, `--workers=1`,
  `E2E_NO_SERVER=1` (same established setup; stray Chromes cleared first):
  `npx playwright test --headed --workers=1` (from `tests/`) → **18/18
  PASS** — 14 pre-existing (app 10 + tablet 2 + follow-up 2, unmodified and
  green) + 4 new admin specs. Covers every module page, full
  create/edit/publish/unpublish/archive/delete lifecycles, validation
  feedback, filter/search, settings save, lead inbox + detail actions,
  authorization boundaries (login gate, wrong-credentials, admin-only
  leads), and intact public behavior (nav, drafts hidden, demo states,
  inquiry, keyboard roles).
- `dist/` secret scan: only the pre-existing `wa.me/` template prefix
  (no number) — same clean disposition as baseline.
- Iteration note: first admin-spec run caught 2 spec-side strictness issues
  (slug text now also in row action `aria-label`s; readiness badge vs hidden
  select option) — fixed in the spec, app code correct throughout. A
  screenshot review caught the cramped inline form-label layout — fixed in
  CSS, re-verified visually + by rerun.

### Responsive / a11y / console

- 360 px overflow matrix on `/admin`, `/admin/products`, `/admin/leads`,
  `/admin/settings` (plus existing public matrices) — overflow ≤ 1
  everywhere; tables scroll inside `.table-wrap`; sidebar stacks ≤900 px
  with wrapping module nav.
- Keyboard/focus: global focus-visible + skip-link untouched; implicit +
  explicit labels kept; new `aria-label`s name the affected slug; dialog
  confirms native; alert/status/live roles asserted in specs.
- Console: zero `pageerror`; zero failed same-origin requests on exercised
  admin + public pages.

### Known issues / deferred

- None blocking. `btn-small` (36 px) kept for table density vs the 44 px
  touch guidance — documented trade-off for a desktop-first workspace;
  focus visibility and label association verified instead.
- Native `window.confirm` kept for destructive actions (custom modal =
  rewrite scope); wording improved with slug + recoverability note.
- Login rate budget respected (fresh backend process per run resets the
  in-memory buckets; full suite ≈ 7 of 10 hourly logins).

### Untouched confirmation

Backend (`src/`, routes, validation, sessions, CSRF, rate limits),
`shared/` contracts, database files/migrations/seeds (`dev.db` mtime
preserved; only gitignored throwaway `e2e.db` recreated), public UI/styles/
pages, brand assets, product projects, `docs/DECISIONS.md` + all TBD-01–16
IDs/titles (no doc resolutions or renumbering), Cloudflare/DNS/secrets/
deployment: all unchanged. No backend defect blocked acceptance (no fix
approval needed). No deploy performed.
