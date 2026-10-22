# Phase 2A Follow-up — Public Visual Polish (frontend-only; admin/backend untouched)

> Authorization: Phase 2A follow-up prompt (public visual polish only, using
> existing supplied screenshots). Admin CMS, backend, shared contracts,
> database, product projects, deployment/DNS/secrets/Cloudflare: OUT OF
> SCOPE and unchanged. Patra Developer remains an IA/business-presentation
> reference only — nothing copied. ERP Laundry screenshots NOT yet supplied;
> its placeholder stays honest (not a blocker).

## 1. Inspection baseline (2026-10-11, code + assets as found)

- Prior report: `docs/phases/PHASE-02A-PUBLIC-REFINEMENT.md` (M1–M6 DONE,
  2026-10-09). Premium light-corporate tokens, sticky header, footer
  sitemap, WhatsApp FAB (placeholder-aware), shared components, 13 public
  routes intact. No material conflict with the follow-up scope.
- Public image handling as found: **no `<img>` usage on any public page**.
  Homepage hero, product strip, `/produk` cards, `/produk/:slug` detail are
  text-only. There is no established image component or public screenshot
  directory — this follow-up establishes the convention (see §4).
- Hero copy as found contains a development-only label:
  `public.tsx` Home lede ends with `[Tagline TBD]`. Footer/`[Profil singkat
  TBD]`-style markers elsewhere are legitimate honest states and stay.
- Brand asset as found: `frontend/public/brand/Asset 1LogoPiple.png`
  (1081×1080, ~1:1, 22.791 bytes) — square mark on a **black background**,
  stylized "P" (blue → beige gradient), no wordmark in the square. Used
  nowhere in code yet (header uses text `PipleSolution`). Direction: use the
  file as-is where appropriate; no recreation/recolor.
- Reference source root: `assets-reference/products/` with three product
  folders (`pos-kasir/`, `pos-penginapan/`, `erp-laundry/`). This folder is
  a source/reference location and **must not become publicly accessible**;
  only renamed copies for public use go into `frontend/public/produk/`.

## 2. Asset inventory (all files inspected visually + dimensionally)

Dimensions via System.Drawing; content descriptions from what is actually
visible. Filenames alone are NOT treated as screen identification — folder
placement + visible content jointly support the attribution below.

### 2.1 POS Kasir Otomatis — `assets-reference/products/pos-kasir/` (4 PNG)

| # | File (original, preserved) | Dim / ratio / size | Visible content → working identification |
|---|---|---|---|
| K1 | `Screenshot 2026-10-11 202702.png` | 1870×899 / 2.08 / 39.522 B | Storefront hero "Belanja jadi lebih mudah." + "Cara Belanja" 4-step card; top nav "CV Berkah Nusa Sejati" → **storefront landing view** |
| K2 | `Screenshot 2026-10-11 202853.png` | 1891×900 / 2.10 / 55.553 B | "Nama Warung / Toko" input + "Daftar Produk" list (Sarimi/Teh Botol/Telur) + cart bar "Rp 290.000 Checkout" → **storefront ordering view** |
| K3 | `Screenshot 2026-10-11 203039.png` | 1883×894 / 2.11 / 204.103 B | "Dashboard / Ringkasan toko dan aktivitas", stats (145/146/1/Rp 290 rb), "Aksi Cepat", product/order tables, "ADMIN PANEL" sidebar → **admin dashboard view** |
| K4 | `Screenshot 2026-10-11 203107.png` | 1914×902 / 2.12 / 170.934 B | "Detail Pesanan ORD-000043 / warung tes", item table, "Ringkasan Rp 290.000", admin sidebar → **admin order-detail view** |

Notes: all four are very wide (~2.1:1) full-viewport captures. Filenames
are timestamps only — product attribution rests on folder + content (store
name "CV Berkah Nusa Sejati", admin panel chrome). No claim is made about
which deployment/customer this is, nor about demo URLs or readiness — those
stay governed by existing CMS rules.

### 2.2 POS Pemesanan Penginapan — `assets-reference/products/pos-penginapan/` (4 JPG)

| # | File (original, preserved) | Dim / ratio / size | Visible content → working identification |
|---|---|---|---|
| P1 | `Dashboardjpg.jpg` | 1908×1463 / 1.30 / 332.594 B | "Homestay Joglo Seruni Syariah" dashboard: Reservasi/Invoice/Kamar actions, stats, Pendapatan chart, Komposisi Reservasi, Okupansi, Invoice, Reservasi Terakhir → **property operations dashboard** |
| P2 | `RoomList.jpg` | 1908×973 / 1.96 / 209.723 B | "Rooms" floor-map plan + room table (01–10, Standard/Family/Twin) → **room-management view** |
| P3 | `KeuanganSales.jpg` | 1908×1615 / 1.18 / 356.772 B | "Sales & Revenue": period filter, totals, Revenue by Source, Sales vs Expenses, Riwayat Transaksi → **finance sales view (tall)** |
| P4 | `KeuanganInvoicePrint.jpg` | 1897×962 / 1.97 / 176.426 B | Invoice document preview (INV-2026-009, "LUNAS" stamp) **with a browser "Print → Microsoft Print to PDF" dialog overlaying the right side** → **invoice print preview incl. browser chrome** |

Caution recorded: P4 is NOT a pure application screenshot — roughly the
right third is OS/browser print UI. It is inventoried but **excluded from
hero and primary placements** so the site never presents browser chrome as
product UI. If ever used later, its caption/alt must say so explicitly.

### 2.3 ERP Laundry — `assets-reference/products/erp-laundry/` (EMPTY)

No files supplied. Recorded as missing input, not a blocker. ERP keeps an
honest designed placeholder (`Visual produk segera hadir`) with no broken
`<img>`, and the same asset/component naming convention so later screenshots
drop in without restructuring.

### 2.4 Brand — `frontend/public/brand/Asset 1LogoPiple.png`

1081×1080 (~1:1), 22.791 bytes. Black square, gradient "P". Because the
backdrop is black, header/footer usage is contained (fixed 32 px box,
rounded, no stretch/recolor) alongside the existing text wordmark.

## 3. Optimization decision (documented, no new dependency)

Total source payload ≈ 1,5 MB across 8 files; individual files 39–357 KB —
already web-reasonable. UI-text legibility in screenshots argues against
aggressive recompression, and the repo has no image pipeline (adding
sharp/imagemagick would be a new dependency for marginal gain).
**Decision: copy originals as-is under clean slug-based public names**
(PNG stays PNG, JPG stays JPG); no format conversion, no overwrite of
sources. Revisit only if build/page-weight evidence demands it. Filenames
with spaces/timestamps are NOT web-suitable, hence the rename — content
bytes are untouched.

Public copies (only these 7 are public; P4 stays source-only for now):

- `frontend/public/produk/pos-kasir-beranda.png` ← K1 (1870×899)
- `frontend/public/produk/pos-kasir-belanja.png` ← K2 (1891×900)
- `frontend/public/produk/pos-kasir-dashboard.png` ← K3 (1883×894)
- `frontend/public/produk/pos-kasir-detail-pesanan.png` ← K4 (1914×902)
- `frontend/public/produk/pos-penginapan-dashboard.jpg` ← P1 (1908×1463)
- `frontend/public/produk/pos-penginapan-kamar.jpg` ← P2 (1908×973)
- `frontend/public/produk/pos-penginapan-keuangan.jpg` ← P3 (1908×1615)

## 4. Placement + handling plan (establishes the convention)

- **Sizing:** each `<img>` carries native `width`/`height` (CLS hint) +
  CSS `max-width:100%; height:auto`. Frames use `object-fit: contain`
  (never `cover`, never stretch) on a neutral surface so the four ~2.1:1
  kasir shots and the mixed-ratio penginapan shots (1.30 / 1.96 / 1.18)
  align without cropping any UI text, prices, tables, or nav.
- **Hero (`/`):** two-column composition — copy (unchanged hierarchy + CTA)
  beside a main browser mockup (penginapan dashboard, most premium) with a
  smaller overlapping card (kasir belanja, shows the second product). No ERP
  visual fabricated. Copy keeps its message; `[Tagline TBD]` removed from
  the rendered lede (TBD stays recorded here, not invented over).
- **Cards (home strip + `/produk`):** consistent 16/10 frame; kasir →
  belanja shot; penginapan → dashboard shot; ERP → honest placeholder block
  (no `<img>`, no broken icon). No viewport repeats the same shot without
  purpose: hero reuses the two primaries at most once more as card thumbs
  at different sizes — accepted as intentional product recognition, gallery
  pages use the remaining views.
- **Detail (`/produk/:slug`):** spec/demo logic untouched (D-28 rules:
  Live Demo link only with verified URL; no fake URLs). Adds a "Tampilan
  produk" gallery: kasir 4 views, penginapan 3 views (dashboard/kamar/
  keuangan), ERP placeholder note. Captions describe the visible screen;
  alt text never invents functionality.
- **Brand:** header + footer show the real PNG at 32 px (rounded, contained)
  next to the text wordmark; `alt="Logo PipleSolution"`.
- **Responsive:** ≥1024 px two-column hero with overlap; 768 px stacks, cards
  stay contained; 360 px single column, overlap removed, no horizontal
  overflow. `loading="lazy"` + `decoding="async"` below the fold; hero main
  image `fetchpriority="high"`.
- **A11y:** meaningful alt per actual screen; placeholder uses text (not an
  empty img); focus/keyboard, reduced-motion, and existing test hooks (h1
  texts, nav names, alert/status roles, placeholder titles, `wa.me` absence
  rule, Live Demo attrs) preserved.

## 5. Planned tests (results recorded in §7 after execution)

`tsc` (frontend) · `vite build` · backend Vitest regression (untouched
code) · Playwright **headed** Chromium full suite (fresh-e2e.db,
single-worker discipline) · image checks (all public shots return 200, no
broken paths, no distortion/crop, CLS hints present) · responsive
360/768/1024/1280 + overflow + console-error pass · nav/product/inquiry
regression intact. Only executed results are reported.

## 6. Scope guardrail

Allowed: public UI/styles, mockup components, the 7 public image copies,
frontend tests, this report + changelog. NOT allowed (untouched): admin CMS,
backend/routes/auth/sessions, DB/migrations/adapters, shared API contracts,
the three product projects, deploy/DNS/secrets/Cloudflare, fabricated
content/links/metrics. Any backend need found mid-work is documented here
with owner authorization requested — none is anticipated.

## 7. Results (filled after implementation + verification)

### Files created

- `frontend/src/components/ProductVisual.tsx` — shot registry (`PRODUCT_SHOTS`
  keyed by product slug), `ProductShot` (native width/height + lazy/async),
  `ProductThumb`, `ProductGallery`, `ShotPlaceholder`, `HeroVisual`.
- `frontend/public/produk/` (7 byte-identical copies, SHA-256 verified,
  originals untouched in `assets-reference/`):
  `pos-kasir-beranda.png` (1870×899), `pos-kasir-belanja.png` (1891×900),
  `pos-kasir-dashboard.png` (1883×894), `pos-kasir-detail-pesanan.png`
  (1914×902), `pos-penginapan-dashboard.jpg` (1908×1463),
  `pos-penginapan-kamar.jpg` (1908×973), `pos-penginapan-keuangan.jpg`
  (1908×1615).
- `tests/e2e/visual-followup.spec.ts` — permanent regression for the new
  public imagery (image completeness, `contain` fit, placeholders, gallery
  counts, 4-width overflow). Single-worker ordering dependency documented in
  the file header (runs after `app.spec.ts`; fixtures best-effort).
- `tests/screenshots/followup-home-1280.png`,
  `followup-home-360.png`, `followup-produk-kasir-1280.png` (evidence,
  visually inspected below).

### Files modified

- `frontend/src/styles.css` — appended visual system only (brand mark, shot
  frames, hero composition, gallery, placeholder, responsive rules). No
  existing rule altered.
- `frontend/src/components/Layout.tsx` — real logo
  (`/brand/Asset%201LogoPiple.png`, 32 px contained, `alt="Logo PipleSolution"`)
  in header + footer; all nav/CTA/placeholder behavior unchanged.
- `frontend/src/pages/public.tsx` — hero two-column composition; product
  thumbs on home strip + `/produk`; `Tampilan produk` gallery on
  `/produk/:slug`; rendered `[Tagline TBD]` removed from the hero lede
  (TBD stays recorded in §1/this report — no replacement claim invented).
  Demo/readiness logic (`DemoSlot`, badges, D-28 rules) byte-untouched.

### Visual changes

- Homepage hero: copy hierarchy + primary CTA preserved; main browser mockup
  (penginapan dashboard) with overlapping kasir-ordering card; captions +
  honest `Visual ERP Laundry menyusul` note. Review of the first screenshot
  caught the float card covering caption text — fixed by anchoring the float
  inside the image area only (`.browser-shot` wrapper); re-screenshotted
  clean (captions + note fully readable, overlap on image only).
- Product cards + detail galleries use a uniform 16/10 `contain` frame; no
  stretch, no crop; tall finance/dashboard shots letterbox on neutral white.
- ERP Laundry: dashed `Visual produk segera hadir` placeholder everywhere an
  image would go (home, `/produk`, detail) — no broken `<img>`.

### Dimension handling

- All 7 public shots carry native `width`/`height` (CLS hints) +
  `max-width:100%; height:auto`; frames enforce aspect-ratio so mixed native
  ratios (2.1:1 kasir set; 1.30/1.96/1.18 penginapan set) align without
  touching UI content. Hero main image `fetchpriority="high"`; everything
  below the fold `loading="lazy"` + `decoding="async"`.

### Responsive + accessibility checks

- Automated (headed Chromium, in `visual-followup.spec.ts`): 360 / 768 /
  1024 / 1280 px, pages `/`, `/produk`, `/produk/pos-kasir-otomatis` —
  `scrollWidth - clientWidth ≤ 1` everywhere. ≤640 px the float card becomes
  a static full-width block (no overflow, verified at 360 px).
- `prefers-reduced-motion`, skip-link, focus styles, and all pre-existing
  test hooks (h1 texts, nav names, alert/status roles, placeholder titles,
  `wa.me` absence rule, Live Demo `target`/`rel`/`https` attrs) preserved —
  full existing suite still passes unmodified.
- Alt text per §4 (visible screen only); placeholder is text with `role="img"`
  + label (never an empty/broken image).
- Visual inspection of the three evidence screenshots: no distortion, no
  unintended crop, readable UI text at 1280 and 360, logo crisp in header.

### Test commands + results (all actually executed 2026-10-11)

- `npm run build --workspace=frontend` (repo root) → `tsc --noEmit` PASS +
  `vite build` PASS — `index.html` 0.50 kB, CSS 11.00 kB, JS 263.57 kB.
- `npm run test --workspace=backend` → Vitest **27/27 PASS** (backend
  untouched; regression only).
- Playwright headed Chromium, fresh `e2e.db`, `--workers=1`,
  `E2E_NO_SERVER=1` with `node ./src/dev.ts` (`DATABASE_FILE=./e2e.db`) +
  `node ..\node_modules\vite\bin\vite.js --port 5173`:
  `npx playwright test --headed --workers=1` (from `tests/`) →
  **14/14 PASS** — 10 app + 2 tablet/no-errors (pre-existing, unmodified) +
  2 new follow-up specs (image completeness/`contain`/placeholders/gallery
  counts 4+3/no-TBD-tagline; 4-width overflow + screenshots).
- `dist/` secret scan (JS/CSS/HTML): single match is the pre-existing `wa.me/`
  URL-prefix template string with no number — same disposition as the Phase
  01/2A baseline (clean; no tokens, numbers, or secret values).
- Verified in `dist/`: all 7 `produk/` shots + brand logo copied; source-only
  `KeuanganInvoicePrint.jpg` correctly absent from public output.

### Known limitations (not blockers)

- ERP Laundry screenshots still unsupplied — honest placeholder retained;
  same `PRODUCT_SHOTS[slug]` convention makes later addition a data-only
  change (`pos-penginapan` pattern).
- `KeuanganInvoicePrint.jpg` stays source-only: it embeds a browser print
  dialog overlay and must never be presented as pure product UI.
- Mid-verification transient failures (renderer `ERR_INSUFFICIENT_RESOURCES`,
  cascading timeouts) were traced to orphaned headed-Chrome processes
  exhausting the small test box — not to app code. After clearing strays,
  the full 14/14 headed run passed cleanly twice in a row. Backend never
  crashed (empty stderr, port-holder check); no backend change needed, none
  made. Environment note only.
- `visual-followup.spec.ts` publishes `pos-pemesanan-penginapan` best-effort;
  keep fresh-DB + single-worker discipline so `app.spec.ts` draft-hiding
  assertions always run first against a clean DB.

### Untouched confirmation

- Backend (`backend/src`, routes, auth, sessions, rate limits), admin CMS
  (`frontend/src/admin`), `shared/` contracts, DB schemas/migrations/seeds
  (`seed.ts` unmodified; `dev.db` mtime 10/10 preserved — only throwaway
  `e2e.db`, gitignored via `*.db`, was recreated), the three product
  projects, and production infra (deploy/DNS/secrets/Cloudflare): all
  unchanged. `dist/` rebuilt as gitignored build output only.
