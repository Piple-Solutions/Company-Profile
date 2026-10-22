# Phase 2A Hero Banner — Owner-Supplied Company-Profile Banner (frontend hero-only)

> Authorization: owner hero-banner prompt (public homepage hero right-area
> replacement only). Left-side heading/description/CTAs, navigation,
> surrounding sections, product screenshots/galleries/detail pages/registry,
> other public layouts, approved product content: PRESERVED. Admin CMS,
> backend, shared contracts, database, migrations, seeds, product projects,
> Cloudflare resources, DNS, secrets, deployment configuration: OUT OF SCOPE,
> unchanged. No new claims/links/prices/statuses. No deploy. Stop after
> verification; wait for owner review.

## 1. Preflight inspection (completed before implementation)

Read before writing this report:

- `docs/phases/PHASE-02A-FOLLOWUP-VISUAL-POLISH.md` (full §§1–7 — hero
  two-column mockup composition, `ProductVisual.tsx` conventions,
  `contain`-fit + CLS dims, responsive rules, 14/14 headed baseline).
- `docs/phases/PHASE-02A-ERP-ASSET-INTEGRATION.md` (full §§1–7 — ERP 4-view
  registry, data-driven rendering, placeholder-absence, 14/14 headed).
- Latest changelog entries (`phase2a-followup`, `phase2a-erp`, `phase2b`).
- Current implementation: `frontend/src/components/ProductVisual.tsx`
  (`HeroVisual` = main browser mockup penginapan dashboard + overlapping
  kasir-ordering float card + `Tangkapan layar produk asli.` note),
  `frontend/src/pages/public.tsx` (`Home` hero-grid: copy + `<HeroVisual/>`,
  product strip via `ProductThumb`, detail via `ProductGallery`),
  `frontend/src/styles.css` (hero-grid/browser/hero-float/gallery rules),
  `tests/e2e/visual-followup.spec.ts` (asserts hero note, image
  completeness, `contain` fit, gallery counts 4/3/4, 4-width overflow).

No material conflict found. Hero copy/nav/CTA hooks and product
galleries are data-driven and stay intact under this change.

## 2. Owner-supplied banner verification (file as found, not guessed)

Path (exact, per prompt): `frontend/public/brand/hero-banner.png` — EXISTS.

- Size: 72,943 bytes (Node `fs.statSync`).
- Magic bytes: `ffd8ff` = JPEG content under a `.png` filename (extension
  retained as supplied; browsers sniff `<img>` content so it renders;
  no rename/copy — avoids duplicate assets).
- Decoded dimensions (JPEG SOF marker parse, Node): **720 × 900**
  (portrait, ratio 0.8000 = 4:5).
- Visual inspection (image read): matches owner description exactly —
  headline "Your Ideas, Our Digital Solutions.", supporting copy "We build
  websites and applications that help businesses grow.", service labels
  "Website" (Professional & Responsive) and "Apps" (Functional &
  Interactive) with globe/phone icons, team photo (two people with laptop,
  decorative purple/yellow shapes, shelf background). No redaction,
  redrawing, or text extraction performed.

Disposition: usable as-is. No cropping, recompression, or format
conversion (legibility + aspect preservation argue against it; same
rationale as the prior optimization decision).

## 3. Duplicate-asset check (SHA-256 over all repo images)

- `hero-banner.png` SHA-256:
  `a1ab7e9b1d506c937947fba916ed0e2d9d5e3c05842cc83496bbeb0fd81189f1`.
- Full-repo image walk (excluding `node_modules`/`dist`/`.git`): no other
  file shares this hash. The only match is the file itself.
- Public `produk/` set (11 shots) + brand logo + `assets-reference/`
  originals (12) + `tests/screenshots/` evidence: all distinct sizes/hashes.

Conclusion: **no equivalent source asset exists; no duplicate created.**
The banner is used in place at its supplied path.

## 4. Planned changes (hero presentation only; recorded BEFORE implementation)

1. `frontend/src/components/ProductVisual.tsx` — `HeroVisual()` ONLY:
   replace the overlapping POS composition (`.hero-visual` browser mockup
   + `.hero-float` card + product-screenshot note) with a single coherent
   `<img src="/brand/hero-banner.png" width={720} height={900}>` inside a
   responsive contain-frame. No visible text recreation/translation/overlay;
   alt conveys the banner without rebuilding its layout. `PRODUCT_SHOTS`
   registry, `ProductShot`/`ProductThumb`/`ProductGallery`/
   `ShotPlaceholder`: byte-untouched (galleries/detail pages intact).
2. `frontend/src/styles.css` — APPEND hero-banner rules only (responsive
   container, `aspect-ratio: 720 / 900`, `object-fit: contain`,
   `max-width: 100%`, intrinsic-dims CLS hint via width/height attrs):
   desktop two-column grid preserved; ≤1024 px stacks banner below copy;
   360 px no overflow. Existing `.browser`/`.hero-float`/gallery rules
   untouched (unused hero rules remain harmless; galleries unaffected).
3. `tests/e2e/visual-followup.spec.ts` — hero assertions updated to the
   new presentation (banner src/visibility/dims/`contain`/no-crop/full
   visibility; old `.browser`/`.hero-float` absence on `/`; hero product
   note retired); product completeness/`contain`/placeholder-absence/
   gallery counts 4/3/4 + responsive overflow matrix (360/768/1024/1280)
   retained and extended to the banner. No other spec touched.
4. `frontend/src/pages/public.tsx` — NO structural change needed
   (`<HeroVisual/>` slot reused; copy/CTA/nav/sections byte-untouched).
   Any edit, if needed, is limited to comments. Left-side hero copy is
   the source of truth; banner text is never copied into markup.
5. Docs: this report (§7 after verification) + `docs/CHANGELOG.md` entry.
   Evidence screenshots refreshed under `tests/screenshots/`.

## 5. Scope boundaries

Allowed: homepage hero right-area presentation, banner asset placement at
its supplied path, `visual-followup.spec.ts`, this report + changelog (+
evidence screenshots). NOT allowed (untouched): Admin CMS
(`frontend/src/admin`), backend, shared contracts, database/migrations/
seeds, product projects, Cloudflare/DNS/secrets/deploy, other public page
layouts, product screenshots/galleries/registry, any new claims/links/
prices/statuses. No production action.

## 6. Verification plan (results in §7)

`tsc` + `vite build` (frontend) · backend Vitest 27/27 regression
(untouched) · Playwright **headed** Chromium full suite (`--workers=1`,
fresh `e2e.db`, stray-Chrome cleared first) · banner loads
(`naturalWidth>0`, 720×900), `contain`, fully visible, no distortion/crop
at 360/768/1024/1280 · overflow ≤ 1 at all widths · CTA/nav functional ·
galleries/detail pages still show original 4/3/4 shots · zero pageerror /
failed same-origin requests · `dist/` secret scan · nav/demo/inquiry
regression intact (existing specs unmodified except the hero spec above).

## 7. Results (implementation + verification, 2026-10-13)

### Files created

- `docs/phases/PHASE-02A-HERO-BANNER.md` (this report — §§1–6 written
  BEFORE implementation per the mandatory preflight; this section after).
- No new asset copied: the banner is used in place at its supplied path
  `frontend/public/brand/hero-banner.png` (720×900 JPEG bytes, 72,943 B,
  SHA-256 `a1ab7e9b…81189f1`, unique repo-wide — §3).

### Files modified (minimal, as planned)

- `frontend/src/components/ProductVisual.tsx` — `HeroVisual()` ONLY:
  overlapping POS composition (`.hero-visual` browser mockup + `.hero-float`
  card + `Tangkapan layar produk asli.` note) replaced with a single
  coherent `<img src="/brand/hero-banner.png" width={720} height={900}>`
  (`loading="eager"`, `fetchPriority="high"`, `decoding="async"`). No
  visible text recreated/translated/overlaid; alt conveys the banner
  without rebuilding its layout. `PRODUCT_SHOTS` registry,
  `ProductShot`/`ProductThumb`/`ProductGallery`/`ShotPlaceholder`:
  byte-untouched.
- `frontend/src/styles.css` — APPENDED hero-banner rules only
  (`.hero-banner` max 30rem centered, `.hero-banner-frame`
  `aspect-ratio: 720 / 900`, `object-fit: contain`, `max-width: 100%`;
  ≤1024 px cap 28rem so the stacked banner stays proportioned). All
  existing rules (incl. unused `.browser`/`.hero-float`, gallery, nav)
  untouched.
- `tests/e2e/visual-followup.spec.ts` — hero assertions rewritten to the
  new presentation (banner src/visibility/720×900/`contain`/in-viewport
  bounds; old `.hero-visual`/`.browser`/`.hero-float`/`.browser-shot` and
  hero product-note absence on `/`; hero-scoped CTA checks; homepage
  product-strip thumb count ≥ 3) + responsive matrix extended (banner
  load/`contain`/bounds + CTA/nav checks at each of 360/768/1024/1280).
  Gallery counts 4/3/4, placeholder-absence, image-completeness, overflow
  ≤ 1, console-error rules retained. No other spec touched.
- `tests/screenshots/followup-home-1280.png`,
  `followup-home-360.png`, `followup-produk-kasir-1280.png`,
  `followup-produk-erp-1280.png` (evidence, refreshed by the passing run
  and visually inspected below).
- `frontend/src/pages/public.tsx` — unchanged (no edit needed; the
  `<HeroVisual/>` slot, hero copy, CTAs, nav, sections are byte-identical).

### Test commands + results (all actually executed 2026-10-13)

- `npm run build --workspace=frontend` (repo root) → `tsc --noEmit` PASS +
  `vite build` PASS — `index.html` 0.50 kB, CSS 13.71 kB (was 11.00;
  +banner rules), JS 275.49 kB.
- `npm run test --workspace=backend` → Vitest **27/27 PASS** (regression,
  backend untouched).
- Playwright headed Chromium, fresh `e2e.db`, `--workers=1`,
  `E2E_NO_SERVER=1` (`node ./src/dev.ts` with `DATABASE_FILE=./e2e.db` +
  `vite --port 5173`, stray Chromes cleared first):
  `npx playwright test --headed --workers=1` (from `tests/`) →
  **18/18 PASS** — 4 admin + 10 app + 2 tablet (pre-existing, unmodified)
  + 2 updated hero/imagery specs (banner src/720×900/`contain`/bounds,
  old-composition absence, hero CTA/nav, strip thumbs ≥ 3, gallery counts
  4/3/4, placeholder absence, 4-width overflow + per-width banner/CTA/nav
  checks, zero pageerror/failed same-origin requests).
- Responsive (automated + inspected): 360/768/1024/1280 on `/`, `/produk`,
  `/produk/pos-kasir-otomatis`, `/produk/erp-laundry` — overflow ≤ 1
  everywhere; banner rect inside viewport at all widths; 1280 px banner
  fully visible beside hero copy (headline, supporting copy, Website/Apps
  labels, team photo — no crop, no distortion); 360 px banner stacked
  below copy/CTAs, no horizontal overflow.
- Galleries/detail intact: `/produk/pos-kasir-otomatis` (4),
  `/produk/pos-pemesanan-penginapan` (3), `/produk/erp-laundry` (4) —
  original shots, captions, badges verified in-run + kasir evidence
  screenshot inspected.
- `dist/` secret scan: only the pre-existing `wa.me/` template prefix with
  no number — same clean disposition as baseline. `dist/` contains the
  banner (`brand/hero-banner.png`) + all 11 `produk/` shots + logo.
- Existing navigation, demo-state, WhatsApp-placeholder, inquiry, and
  keyboard/focus specs all pass unmodified.

### Mid-verification findings (fixed, documented)

- Strict-mode selector: `Minta Konsultasi` resolves to 2 links on `/`
  (hero CTA + bottom CTA band). Fixed by scoping hero CTA assertions to
  `.hero` (test-only change; app markup untouched and correct).
- First full headed run showed one transient 429 on the imagery spec's
  `beforeAll` API login (login limiter capacity 10/hr/IP shared by all
  specs; suite budget sits exactly at the cap). After fixing the selector
  above, restarting the backend (fresh in-memory limiter) + fresh `e2e.db`
  + clearing stray Chromes, the full 18/18 headed run passed cleanly.
  No backend change made or needed (limiter behavior is intentional).
  Discipline for future runs: fresh backend + fresh DB + single worker.

### Visual inspection of evidence screenshots

- `followup-home-1280.png`: left hero copy/CTA/points + nav unchanged;
  right banner complete and crisp — headline, supporting line, Website +
  Apps labels, full team photo with decorative shapes; rounded frame,
  no stretch, no cut-off text.
- `followup-home-360.png`: copy + CTAs stacked above; banner below the
  fold (correct mobile order); hamburger nav present; no overflow.
- `followup-produk-kasir-1280.png`: `Tampilan produk` gallery shows the
  original kasir screenshots with captions; badges/demo states unchanged.

### Known limitations (not blockers)

- `hero-banner.png` carries JPEG bytes under a `.png` filename (as
  supplied). Kept as-is per the no-guess rule; browsers sniff `<img>`
  content and the in-run `naturalWidth 720` assertion proves it renders.
  Renaming is deferred to the owner (would change the supplied path).
- Retired `.browser`/`.hero-float` CSS remains in `styles.css` (harmless,
  unused); galleries never used those selectors.
- Login rate-limit budget (10/hr/IP) is now fully consumed by the suite
  by design; always rerun headed e2e with a fresh backend + fresh DB.

### Untouched confirmation

Backend (`backend/src`, routes, auth, sessions, rate limits), Admin CMS
(`frontend/src/admin`), `shared/` contracts, DB schemas/migrations/seeds
(`dev.db` mtime 2026-10-10 + size 143,360 B preserved; only gitignored
throwaway `e2e.db` recreated), the three product projects, other public
page layouts, product screenshots/galleries/registry entries, brand logo,
Cloudflare/DNS/secrets/deployment: all unchanged. `dist/` rebuilt as
gitignored build output only. No deploy performed — stopped for owner
review.

## 8. Asset hygiene fix (2026-10-13; no redesign, no re-encode)

Follow-up cleanup: `frontend/public/brand/hero-banner.png` carried JPEG
bytes (`ffd8ff`, SOF 720×900) under a `.png` extension (recorded as a known
limitation in §7).

- Inspection: magic `ffd8ffe0`, 72,943 B, SHA-256
  `a1ab7e9b…81189f1` — identical to the §2 value (file unchanged since).
- Fix: byte-identical copy to `frontend/public/brand/hero-banner.jpg`
  (SHA-256 verified equal — no re-encode, quality untouched), then
  `ProductVisual.tsx` hero `src` → `/brand/hero-banner.jpg` and the
  `visual-followup.spec.ts` src assertion → `/hero-banner\.jpg/`.
  Grep confirmed zero remaining `hero-banner.png` references in
  `frontend/src` and `tests/e2e` before the old copy was deleted.
- Source preservation: no separate source exists elsewhere — the
  repo-wide image walk (§3) found no hero banner under
  `assets-reference/` (brand assets follow the logo precedent: public
  path only), so the identical bytes in the correctly named file ARE the
  preserved original. Nothing was lost.
- Verification: `tsc` + `vite build` PASS (CSS 13.71 kB, JS 275.49 kB;
  `dist/` contains `brand/hero-banner.jpg`, no stale `.png`, bundle
  references the `.jpg`); headed `visual-followup.spec.ts` **2/2 PASS**
  (fresh backend + fresh `e2e.db`, single worker — banner 720×900/
  `contain`/in-viewport at 360/768/1024/1280, galleries 4/3/4, console
  clean); refreshed `followup-home-1280.png` visually inspected (full
  banner intact). Backend/admin/DB/contracts untouched; no deploy.
