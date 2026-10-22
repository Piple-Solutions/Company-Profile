# Phase 2A Final Asset Integration — ERP Laundry Screenshots (frontend-only)

> Authorization: Phase 2A Final Asset Integration prompt (ERP screenshot
> integration only; owner-reviewed public design preserved, no redesign).
> Backend, Admin CMS, shared contracts, database, migrations, seeds,
> Cloudflare resources, DNS, secrets, deployment configuration: OUT OF SCOPE,
> unchanged. No deploy. Stop after this task; Phase 2B does NOT start
> automatically.

## 1. Preflight (completed before implementation)

Read: `docs/PRODUCT-REQUIREMENTS.md` (full — 3-product catalog §4, demo
deferral D-28, draft-by-default, ID language), `docs/ARCHITECTURE.md` (full
§§1–6 — frontend/backend separation, allowlist settings, no embedded product
source per §4/PRODUCT-REQUIREMENTS §4), `docs/DESIGN-SYSTEM.md` (full — light
clean corporate, ID copy, product badges, no-horizontal-scroll),
`docs/phases/PHASE-02A-FOLLOWUP-VISUAL-POLISH.md` (baseline + established
`ProductVisual.tsx` architecture/conventions), latest changelog
(`phase2a-followup`). Current implementation inspected:
`frontend/src/components/ProductVisual.tsx` (registry has kasir 4 +
penginapan 3; `erp-laundry` intentionally absent → `ShotPlaceholder`
fallback), `frontend/src/pages/public.tsx` (hero note
`Visual ERP Laundry menyusul`, ERP thumbs/placeholders data-driven),
`tests/e2e/visual-followup.spec.ts` (asserts ERP placeholder presence —
must be updated). No material conflict with the scope found.

## 2. Discovered assets (actual directory — not assumed)

Source: `assets-reference/products/erp-laundry/` — 4 PNG files (previously
empty; names are already descriptive, no timestamps):

| # | File (original, preserved) | Dim / ratio / size | Visible content → identification |
|---|---|---|---|
| E1 | `Dashboard.png` | 1920×1080 / 1.78 / 81.894 B | "Laundry ERP" admin dashboard: Pendapatan/Pesanan Hari Ini, Diproses 199, Siap Diambil 0, Pendapatan 7 Hari chart, Layanan Terlaris, Antrean Tahap, Perhatian → **primary overview** |
| E2 | `Pesanan.png` | 1920×1080 / 1.78 / 154.777 B | Order table ORD-1543…1553 (nomor/pelanggan/total/status/bayar) + search + status filter + "Buat Pesanan" → **order-management view** |
| E3 | `Inventaris.png` | 1920×1080 / 1.78 / 137.869 B | Stock table (barang/stok/status/aksi: Riwayat, Masuk, Pakai, Sesuaikan) → **inventory view** |
| E4 | `Report.png` | 1920×1080 / 1.78 / 90.487 B | Date-filtered report (Pendapatan/Pesanan/Pengeluaran/Estimasi Bersih, Tren Harian, per-metode) + Export CSV → **reporting view** |

Uniform 16:9 — fits the established 16/10 `contain` frame with minimal
letterboxing. UI text crisp at desktop widths; verified readable at 1280 px
and legible (framed, scrollable page) at 360 px via the existing responsive
rules — no new CSS expected.

## 3. Sensitivity review (all 4 images inspected pixel-visible)

- No emails, phone numbers, addresses, ID numbers, credentials, tokens, or
  API keys visible in any shot.
- `Pesanan.png` customer column shows obvious QA dummy handles (`gio`,
  `Matrix`, `Method Diff`, `Author Cust`, `Svc Keep`, `Keep Me`,
  `Scope Test`, `SLA Test`, `Tamper`) with small IDR totals — test data, not
  real personal data. Alt/captions describe the screen type and never repeat
  these handles as claims.
- Sidebar shows the owner's own admin display handle (`ADMIN ·
  HashifHibatullah`) — part of the supplied screenshot, no contact details;
  not named in any caption/alt. No redaction needed.
- `Report.png` figures are aggregates (no per-person data).
- **Conclusion: safe to publish as-is. No cropping/redaction required.**
  (Cropping is in any case forbidden from removing meaningful UI content.)

## 4. Planned changes (data-only + accuracy text; no redesign)

1. Copy the 4 originals byte-identical into `frontend/public/produk/` under
   stable convention names (PNG stays PNG; originals untouched):
   `erp-laundry-dashboard.png` ← E1, `erp-laundry-pesanan.png` ← E2,
   `erp-laundry-inventaris.png` ← E3, `erp-laundry-laporan.png` ← E4.
   No format conversion, no new dependency (payload ≈ 465 KB total,
   consistent with the prior optimization decision).
2. `ProductVisual.tsx`: add the `'erp-laundry'` registry entry (dashboard
   first = card thumb, following the dashboard-first convention of both
   existing products) with visible-content-only alt + captions and native
   1920×1080 dims. Placeholder component retained as fallback for unknown
   slugs; header comment updated (ERP integrated). POS Kasir/Penginapan
   entries byte-untouched.
3. No `public.tsx` gallery/card change needed (data-driven via
   `shotsFor(slug)` — ERP thumb + 4-view `Tampilan produk` gallery appear
   automatically). Single accuracy fix: hero note `Tangkapan layar produk
   asli. Visual ERP Laundry menyusul.` → `Tangkapan layar produk asli.`
   (the pending clause becomes false once ERP ships; hero 2-product
   composition itself is preserved as reviewed).
4. `tests/e2e/visual-followup.spec.ts`: hero-note assertion updated to the
   new text; ERP-placeholder assertions replaced with placeholder-absence
   (proves replacement complete on all 5 pages) + `erp-laundry` gallery
   count 4. Fixture setup already publishes all three products — unchanged.
5. No readiness/demo-URL/description/price changes (TBD-01/D-28 govern those;
   CMS-owned). No new features claimed: captions describe visible screens.

## 5. Scope boundaries

Allowed: `frontend/src/components/ProductVisual.tsx` (registry + hero note),
`tests/e2e/visual-followup.spec.ts`, 4 public image copies, this report +
changelog (+ evidence screenshots). NOT allowed (untouched): backend,
Admin CMS (`frontend/src/admin`), shared contracts, database/migrations/
seeds, `frontend/public/brand`, POS visuals except compatibility if forced
(none anticipated), Cloudflare/DNS/secrets/deploy, any production action.

## 6. Verification plan (results in §7)

`tsc` + `vite build` (frontend) · backend Vitest 27/27 regression
(untouched) · Playwright **headed** Chromium full suite (`--workers=1`,
fresh `e2e.db`, `E2E_NO_SERVER=1`, stray-Chrome cleared first per prior
environment note) · all-three-products image completeness + `contain` fit ·
placeholder absence · responsive 360/768/1024/1280 + overflow ≤ 1 ·
same-origin failed-request + pageerror clean · `dist/` secret scan ·
nav/demo/inquiry regression intact (existing 12 specs unmodified).

## 7. Results (filled after implementation + verification)

### Files created / copied

- `frontend/public/produk/erp-laundry-dashboard.png` (81.894 B),
  `erp-laundry-pesanan.png` (154.777 B), `erp-laundry-inventaris.png`
  (137.869 B), `erp-laundry-laporan.png` (90.487 B) — SHA-256 verified
  byte-identical to the `assets-reference/products/erp-laundry/` originals,
  which are untouched. Total new public payload ≈ 465 KB.
- `docs/phases/PHASE-02A-ERP-ASSET-INTEGRATION.md` (this report, written
  before implementation per the mandatory preflight).
- `tests/screenshots/followup-produk-erp-1280.png` (evidence, visually
  inspected — dashboard + pesanan fully rendered, no distortion).

### Files modified (minimal, as planned)

- `frontend/src/components/ProductVisual.tsx` — added the `'erp-laundry'`
  registry entry (4 shots, dashboard first, native 1920×1080 dims,
  visible-content-only alt/captions); hero note shortened to `Tangkapan
  layar produk asli.`; header + thumb comments updated. Kasir/penginapan
  entries and all components byte-untouched.
- `tests/e2e/visual-followup.spec.ts` — hero-note assertion updated;
  ERP-placeholder assertions replaced with placeholder-absence on all pages
  + `erp-laundry` gallery count 4; `/produk/erp-laundry` added to the
  4-width overflow matrix + evidence screenshot. Fixture setup unchanged.
- No `public.tsx`, CSS, layout, or other file needed changes (data-driven
  rendering worked as designed — ERP thumb + 4-view gallery appeared with
  zero layout edits).

### Test commands + results (all actually executed 2026-10-11/12)

- `npm run build --workspace=frontend` (repo root) → `tsc --noEmit` PASS +
  `vite build` PASS — CSS 11.00 kB, JS 264.54 kB.
- `npm run test --workspace=backend` → Vitest **27/27 PASS** (regression,
  backend untouched).
- Playwright headed Chromium, fresh `e2e.db`, `--workers=1`,
  `E2E_NO_SERVER=1` (`node ./src/dev.ts` with `DATABASE_FILE=./e2e.db` +
  `node ..\node_modules\vite\bin\vite.js --port 5173`, stray Chromes cleared
  first): `npx playwright test --headed --workers=1` (from `tests/`) →
  **14/14 PASS** — 10 app + 2 tablet (pre-existing, unmodified) + 2 imagery
  specs covering all three products (image completeness + `naturalWidth>0`,
  `contain` fit on every `.shot-frame img`, placeholder count 0 on all 5
  pages, gallery counts 4/3/4, no `[Tagline TBD]`, logo + hero note present).
- Responsive: 360/768/1024/1280 px on `/`, `/produk`,
  `/produk/pos-kasir-otomatis`, `/produk/erp-laundry` — overflow ≤ 1
  everywhere; 360 px ERP gallery stacks single-column (inspected).
- Console: zero `pageerror`; zero failed same-origin requests (304-tolerant,
  as before).
- `dist/` secret scan: single match is the pre-existing `wa.me/` template
  prefix with no number — same clean disposition as baseline. `dist/`
  contains all 11 public shots + logo; no source-only file leaked.
- Existing navigation, demo-state (`Live Demo` link attrs), WhatsApp
  placeholder, and inquiry specs all pass unmodified.

### Known limitations

- Readiness/demo-URL/descriptions/prices for ERP remain CMS-governed
  (TBD-01/D-28) — imagery integration claims nothing about availability.
- Captions/alt describe visible screens only; dummy QA handles visible in
  `Pesanan.png` are not repeated or presented as real customers.
- `ShotPlaceholder` retained as code fallback for unknown slugs; no public
  page renders it anymore (asserted count 0).
- No checks skipped. Environment note from the prior phase stands (clear
  stray headed-Chrome processes before runs on this small box); this
  integration's runs were clean throughout.

### Untouched confirmation

Backend, Admin CMS, shared contracts, database/migrations/seeds (`dev.db`
mtime 2026-10-10 preserved; only gitignored throwaway `e2e.db` recreated),
`frontend/public/brand`, POS Kasir/Penginapan visuals and registry entries,
Cloudflare/DNS/secrets/deployment: all unchanged. No deploy performed.
