# Phase 2A Follow-up — Homepage Hero Content & Composition Polish (testimonial-free, hero-only)

> Authorization: owner follow-up prompt ("Homepage Hero Content & Composition
> Polish"). Scope: homepage hero + directly related styles/components +
> focused tests + this report. Everything else (admin CMS, backend, shared
> contracts, database/migrations/seeds, product detail pages, product
> screenshots/galleries/registry, auth, infra, DNS/deploy/secrets): OUT OF
> SCOPE, unchanged. No new claims/prices/statuses; no fabricated stats.
> No deploy. Stop after verification; wait for owner review.

## 1. Preflight inspection (completed before implementation)

Read and verified before editing:

- `docs/phases/PHASE-02A-FOLLOWUP-VISUAL-POLISH.md` (§§1–7 — hero
  two-column composition origin, contain-fit + CLS conventions,
  14/14 headed baseline) and `docs/phases/PHASE-02A-HERO-BANNER.md`
  (§§1–8 — owner-supplied 720×900 banner, `contain`, no crop, 18/18
  headed, `.jpg` rename fix). `docs/DESIGN-SYSTEM.md` (light corporate
  direction, TBD-04 placeholder tokens, a11y requirements).
- Latest changelog entries (phase2a-hero-banner-hygiene → phase01).
- Implementation as found:
  - `frontend/src/pages/public.tsx` — `Home()` hero: eyebrow
    `Software house & produk digital`, h1 `PipleSolution`, short lede,
    THREE CTAs where the FIRST was the disabled WhatsApp placeholder
    (when unconfigured) that wrapped to a second row, plus three
    card-style `.hero-points` boxes.
  - `frontend/src/styles.css` — `.hero-grid`
    `1.02fr 0.98fr` near-equal columns; `.hero-banner max-width: 30rem`
    (480 px → 600 px tall at 1280) — the oversized-banner cause;
    `.hero-points` card rules.
  - `frontend/src/components/ProductVisual.tsx` — `HeroVisual()` banner
    (720×900, contain, eager, CLS dims) — correct, reused as-is.
  - `frontend/src/components/Layout.tsx` — `WhatsAppCta` honest
    placeholder rule (D-30/TBD-03); FAB + `CtaBand` keep WhatsApp paths.
  - `tests/e2e/visual-followup.spec.ts`, `app.spec.ts`,
    `tablet.spec.ts` — hero/banner/CTA/h1 assertions (updated here).
  - Evidence screenshots (`followup-home-1280.png`, `-360.png`)
    visually confirmed the reported imbalance: tall mostly-empty left
    column vs 480-wide banner extending deeper than the copy.

No material conflict found with the requested direction.

## 2. Planned changes (recorded before implementation)

1. `frontend/src/pages/public.tsx` — `Home()` hero ONLY: owner-directed
   Indonesian promo copy (eyebrow / headline / supporting paragraph), two
   CTAs (primary `Diskusikan Proyek Lo` → `/kontak`, secondary
   `Jelajahi Layanan` → `/layanan`), and a compact `.hero-values` list of
   the three requested value propositions with small inline SVG icons
   (decorative, `aria-hidden`). Old card `.hero-points` removed
   (repeated info; replaced). No navigation/footer/global layout edits;
   `WhatsAppCta` remains everywhere else (FAB, CTA bands, contact,
   pricing, product/detail pages).
2. `frontend/src/styles.css` — hero only: `.hero-grid` → `1.12fr 0.88fr`
   with `gap: 2.5rem 3rem`; `.hero h1` + `text-wrap: balance`;
   `.hero-points` rules → `.hero-values` compact icon-row rules
   (`border-top` hairline, no cards, `max-width: 46rem`);
   `.hero-banner` max-width 30rem → **26rem (+−13 %)**; ≤1024 px block
   simplified (no per-breakpoint banner cap needed — base 26rem governs;
   dead `.hero-visual` line dropped from that block). Retired legacy
   `.browser`/`.hero-float`/`.hero-visual` base rules intentionally left
   untouched (harmless, unused, same disposition as the previous phase).
3. `tests/e2e/visual-followup.spec.ts` — headline + hero CTA assertions
   updated; new permanent test `followup: hero copy, value highlights,
   CTA hierarchy, banner scale` locking: copy, exactly 3 icon rows (no
   cards), 2-step CTA hierarchy over working routes, no disabled
   WhatsApp in hero, banner ≤26rem + undistorted 0.8 aspect + loaded.
4. `tests/e2e/app.spec.ts`, `tests/e2e/tablet.spec.ts` — homepage h1
   assertion updated to the new headline only (required by the copy
   change; no other test logic touched).
5. Docs: this report + `docs/CHANGELOG.md` entry. Evidence screenshots
   refreshed by the passing run.

Scope boundaries: allowed = files above + evidence. NOT allowed = admin
CMS, backend, DB/migrations/seeds, product visuals/registry, brand logo,
nav/footer, other routes, deploy/DNS/secrets/Cloudflare.

## 3. Copy decisions (owner copy as base, minor adjustments only)

Owner-directed copy used verbatim:

- Eyebrow: `Partner digital untuk bisnis yang terus bertumbuh`
  (rendered uppercase by the existing `.eyebrow` token).
- Headline (h1): `Ide Besar Bisnis Lo, Kami Wujudkan Jadi Solusi Digital.`
- Supporting paragraph: `Kami membantu bisnis berkembang melalui website
  profesional, aplikasi mobile, dan sistem bisnis yang dirancang sesuai
  kebutuhan. Dari ide awal hingga solusi siap digunakan, kami bangun
  bersama lo.` — verbatim; no invented claims added.
- Value highlights (exact titles + descriptions as requested):
  `Website & Aplikasi — Bangun kehadiran digital yang profesional.`,
  `Sistem Bisnis — Bantu operasional lebih terstruktur.`,
  `Produk Digital — Solusi siap pakai untuk kebutuhan tertentu.`

Brand continuity: the h1 is no longer the company name; brand identity
stays carried by the persistent locked-up logo + wordmark in the sticky
header and footer (unchanged), matching the owner's promotional-copy
direction. Line breaks are fluid (no hard breaks); `text-wrap: balance`
keeps the headline to two full lines desktop / three on mobile with no
orphan word lines.

CTA honesty (D-30): WhatsApp is still unconfigured (TBD-03), so the hero
no longer shows a disabled `Chat WhatsApp` action in the most prominent
slot — the primary action is the always-working `/kontak` route.
WhatsApp remains available through the FAB, `CtaBand`s, `/kontak`, and
`/harga` with the existing honest placeholder behavior.

## 4. Layout decisions (before → after)

| Aspect | Before | After | Why |
|---|---|---|---|
| Grid columns | `1.02fr 0.98fr` | `1.12fr 0.88fr` (+ gap `2.5rem 3rem`) | Copy column gains width; banner visually demoted |
| Banner cap | `max-width: 30rem` (480×600 @1280) | `max-width: 26rem` (416×520 @1280) | −13 % linear size (target 10–15 %); area −25 % |
| Banner fit | `aspect-ratio: 720/900` + `contain` | unchanged | Asset preserved, no crop/stretch (verified ratio) |
| Left copy | Brand name h1 + short lede | Promo eyebrow + headline + full supporting paragraph | Fills the previously empty column |
| Highlights | 3 white bordered cards (`.hero-points`) | 3 compact icon rows under a hairline (`.hero-values`) | Compact, no card grid; no repeated info |
| CTA order | Disabled WhatsApp → Lihat Layanan → Minta Konsultasi (wraps) | Primary `Diskusikan Proyek Lo` → `/kontak`; secondary `Jelajahi Layanan` → `/layanan` | Clear hierarchy; opening action always works |
| Column alignment | h1 capped 46rem only | `.hero-values` also capped 46rem | Headline/lede/divider/rows share one axis when stacked |

Resulting desktop heights: left copy ≈ banner height; banner no longer
drives hero height or overpowers the fold.

## 5. Verification plan (results in §6)

`npm run build --workspace=frontend` · `npm run test --workspace=backend`
(regression) · full Playwright headed Chromium suite, fresh backend +
fresh `e2e.db`, `--workers=1`, `E2E_NO_SERVER=1` · responsive 360/768/
1024/1280 banner bounds + overflow ≤ 1 (automated) + visual inspection
of screenshots at every width · console/pageerror rules (specs) ·
`dist/` secret scan. Only executed results reported.

## 6. Results (implementation + verification, 2026-10-22)

### Files modified

- `frontend/src/pages/public.tsx` — `Home()` hero only (copy, CTAs,
  `HeroValueIcon` + `HERO_VALUES`, `.hero-values` markup). All other
  exports/pages byte-unchanged.
- `frontend/src/styles.css` — hero block: grid ratios/gap, `h1`
  `text-wrap: balance`, `.hero-points` → `.hero-values`/`.hero-value-*`
  rules, `.hero-banner` 26rem, ≤1024 block simplified. Everything else
  untouched.
- `tests/e2e/visual-followup.spec.ts` — hero assertions retargeted; new
  permanent hero-composition test appended after the existing two
  (preserving the file's single-worker ordering discipline).
- `tests/e2e/app.spec.ts`, `tests/e2e/tablet.spec.ts` — homepage h1
  expectation updated to the new headline (one string each).
- Evidence refreshed: `tests/screenshots/hero-balance-1280.png`,
  `hero-balance-360.png`, `followup-home-1280.png`, `followup-home-360.png`
  (+ unchanged product/gallery/admin shots re-produced by the suite).

### Files created

- `docs/phases/PHASE-02A-HERO-CONTENT-BALANCE.md` (this report).
- No new code/asset files beyond it; hero icons are inline SVG (no
  dependency added).

### Copy + layout changes

- Left column now: eyebrow → two-line balanced headline → 3-line
  supporting paragraph → primary/secondary CTA pair → hairline → three
  compact icon rows (globe / layers / package, 18 px stroke icons in
  `--surface-2` tiles, `--accent-ink` color).
- Banner: 480×600 → 416×520 at 1280 (−13 %), `contain`, full 720×900
  asset visible (no crop, no distortion), still a large meaningful
  visual; column shift (1.12/0.88) narrows its zone to ~44 %.
- Stacked ≤1024 px order unchanged and correct: copy → CTAs → value
  rows → centered 26rem banner.

### Visual inspection of evidence (all four widths)

- `hero-balance-1280.png`: two balanced columns; headline 2 balanced
  lines, no orphan word; highlights compact; banner aligned with copy
  height; hero ends above the fold (~1 viewport).
- `hero-balance-360.png`: eyebrow wraps 2 lines, headline 3 balanced
  lines, paragraphs wrap naturally, CTAs stack, icon rows single-line
  labels + wrapped descriptions, no overflow, banner below (sensible
  stacking; not part of the top viewport).
- Ad-hoc (deleted after inspection): 768 px and 1024 px confirmed the
  stacked order, centered banner, and the 46rem alignment of the value
  rows with the copy axis.

### Test commands + execution results (all actually executed 2026-10-22)

- `npm run build --workspace=frontend` → PASS twice (final CSS state):
  `tsc --noEmit` + `vite build`; CSS 14.08→14.09 kB, JS 276.64 kB.
- `npm run test --workspace=backend` → Vitest **27/27 PASS** (backend
  untouched, regression only).
- Playwright headed Chromium, fresh backend + fresh `e2e.db`,
  `--workers=1`, `E2E_NO_SERVER=1`: run 1 (mid-change) **19/19 PASS**;
  after one final CSS refinement (46rem alignment), full suite re-run on
  a fresh backend + fresh `e2e.db` → **19/19 PASS** (58 s) — 4 admin +
  10 app + 2 tablet + 3 followup (incl. the new hero test).
- Responsive assertions in-suite: 360/768/1024/1280 overflow ≤ 1 on
  `/`, `/produk`, kasir/ERP details; banner visible, inside viewport,
  `contain`, loaded 720×900 at every width; nav + hero secondary CTA
  functional at every width.
- Console hygiene: specs assert zero `pageerror` + zero failed
  same-origin responses on the covered pages — passing in both runs.
- `dist/` secret scan: value-level scan of BOOTSTRAP_TOKEN/SESSION_SECRET
  over every `dist/` file → **0 hits**; `wa.me/<digits>` count 0 (only
  the pre-existing number-less template remains — same as baseline).
  `dist/` contains `brand/hero-banner.jpg` + all 11 `produk/` shots.

### Environment notes (documented, no scope items)

- Leftover project dev servers from an earlier session were found
  listening on :5173/:8787; they were stopped and restarted fresh for
  the e2e discipline, then restored (backend on default `dev.db`
  config, vite on :5173) after verification. One initial false start
  briefly launched the backend on `DATABASE_FILE=./dev.db` default —
  killed within seconds before any test ran; integrity was then proven:
  `dev.db` remained exactly 143,360 B, mtime 2026-10-10 02:20 (matches
  the documented baseline). Only the gitignored throwaway `e2e.db` was
  (re)created by the suite, per convention.
- Login rate-limit budget (in-memory, 10/h/IP) was consumed by the
  suite exactly at the documented cap; fresh-backend + fresh-DB +
  single-worker discipline used for both runs.
- `prefers-reduced-motion`, skip-link, focus-visible outlines, semantic
  h-order, accessible names (`aria-label` on nav/FAB/icons, meaningful
  alt) unchanged and exercised by the existing specs.

### Known limitations (not blockers)

- None outstanding within scope. Rationale notes recorded: (a) headline
  is no longer the brand name — brand identity relies on the persistent
  logo lockup (header/footer), as owner-directed; (b) WhatsApp stays
  out of the hero until TBD-03 configures a number — FAB + CTA bands
  cover it honestly; (c) `text-wrap: balance` is a progressive
  enhancement (ignored by unsupported engines; wrapping verified
  acceptable without it at 360/768/1024/1280); (d) retired legacy hero
  CSS classes (`.browser`, `.hero-float`, `.hero-visual`) remain in
  `styles.css`, unused and harmless, per prior-phase disposition.

### Untouched confirmation

Admin CMS (`frontend/src/admin`), `Layout.tsx`, `ProductVisual.tsx`,
`Kontak.tsx`, `data.ts`, `api.ts`, shared contracts, backend routes/auth/
sessions/limits, `dev.db` (integrity re-proven), DB migrations/seeds,
product projects, product screenshots/galleries/registry entries, brand
assets, DNS/secrets/Cloudflare/deployment: all unchanged. No deploy.
Stopped for owner review.
