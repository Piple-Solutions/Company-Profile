# Phase 2A — Public Website Refinement (frontend-only; admin/backend untouched)

> Authorization: Phase 2A prompt (public refinement only). D-25/D-33 history
> preserved; no new architecture decisions invented. Admin CMS, backend,
> shared contracts, database, Cloudflare, DNS, deploy: OUT OF SCOPE and
> unchanged. Reference: Patra Developer used for IA direction only (nav
> hierarchy, service→detail→contact flow); nothing copied, no affiliation
> implied (reference site not live-inspected; documented direction used).

## Scope

Refine `frontend/src` public surface only: tokens, navigation, footer,
shared components (PageHeader, Breadcrumbs, Card, Badge, EmptyState,
CtaBand, WhatsApp FAB), and public pages/routes (all existing routes kept;
no duplicates added, none removed): `/`, `/tentang`, `/layanan`,
`/layanan/:slug`, `/produk`, `/produk/:slug`, `/portofolio`,
`/portofolio/:slug`, `/harga`, `/artikel`, `/artikel/:slug`, `/kontak`,
`/privasi`. Nav labels aligned to agreed direction (Beranda, Layanan,
Produk, Portfolio, Paket & Harga, Wawasan, Tentang Kami, Kontak) with
routes unchanged. API contracts, inquiry behavior, validation, spam guards,
demo states, allowlists: UNCHANGED (regression-verified only).

## Baseline findings (M1 audit, code as found)

- Hero oversized/empty ("segera hadir di M5" leftover), thin Tentang page,
  flat card grids without hierarchy, no breadcrumbs, minimal footer without
  sitemap, no sticky WhatsApp FAB (inline CTAs only), plain empty states,
  basic contact form layout, no loading states on public lists, no section
  CTA bands, inconsistent page headers.
- Correct foundations kept: 7-category taxonomy, 3 products, standalone
  portfolio, draft-hiding, ID copy, TBD placeholders, focus styles,
  skip-link, reduced-motion rule, mobile nav toggle.
- No material conflict with approved requirements; no destructive or
  architectural change needed.

## Planned work (M2–M5)

- M2: refined tokens (type scale, container, section rhythm), sticky header,
  footer sitemap + contact placeholder, WhatsApp FAB (placeholder-aware),
  shared components.
- M3: homepage (concise hero, value props without invented metrics,
  services grid, product strip, CTA band), services index/detail
  (hierarchy, CMS merge, TBD package note), products index/detail
  (comparable spec layout from `features_id`, honest demo states).
- M4: portfolio, pricing (honest TBD state + inquiry path), articles,
  contact (layout/steps/loading/success/error), privacy (readability).
- M5: responsive 360/768/1280, keyboard/focus, reduced motion,
  content-integrity pass (zero fabricated claims; TBD markers explicit).
- Test hooks preserved: all h1 texts, nav/button names, alert/status
  roles, placeholder titles, `wa.me` absence rule, Live Demo link attrs.

## Acceptance criteria (must all hold)

Per prompt §9 (12 items): premium light-corporate consistency; coherent
nav/layout/type/spacing/responsive; correct 7-service/3-product
classification; zero fabricated claims/prices/testimonials/demo URLs;
drafts hidden; inquiry + protections intact; nav/API functional; a11y +
responsive tested; `vite build` succeeds; tests run incl. headed
Playwright; phase report complete; no admin/backend/DB/deploy/DNS/
Cloudflare changes.

## Tests to run (M6)

`tsc` frontend; `vite build`; backend Vitest (regression, untouched code);
Playwright headed Chromium full suite (fresh e2e.db discipline); secret
scan of `dist/`; responsive + keyboard/focus manual pass. Only executed
results reported.

## Progress log

- 2026-10-09: report created; baseline recorded. No conflicts found.
- M1 DONE: baseline audit recorded above; route inventory matches sitemap (13 public routes); no duplicates, none removed.
- M2 DONE: `styles.css` rewritten (tokens, type scale, container, section rhythm, sticky header, footer sitemap + contact placeholder, WhatsApp FAB placeholder-aware, shared components PageHeader/Breadcrumbs/Card/Badge/EmptyState/CtaBand); `Layout.tsx` rewritten (agreed nav labels, routes unchanged).
- M3 DONE: `public.tsx` homepage (concise hero, value props without invented metrics, services grid, product strip, CTA band), services index/detail (hierarchy, CMS merge, TBD package note, consultation steps), products index/detail (spec table from `features_id`, honest demo states).
- M4 DONE: portfolio/pricing (honest TBD + inquiry path, pricing table)/articles/contact (two-column, steps, loading/success/retry states)/privacy refinements; all new-copy TBD-marked, zero fabricated claims.
- M5 DONE: tablet 768px overflow fixed (hamburger ≤900px; skip-link/honeypot clip technique); 360/768/1280 verified; keyboard/focus/reduced-motion preserved; content-integrity pass clean.
- M6 DONE: `tsc` frontend PASS; `vite build` PASS (259.12 kB JS); Vitest 27/27 regression PASS (backend untouched); Playwright headed Chromium 12/12 PASS (10 app + 2 tablet/no-errors, `--workers=1`, fresh e2e.db discipline); dist secret-scan PASS (only `wa.me` URL prefix + Zod field *names* — no numbers, tokens, or secret values); screenshots `tests/screenshots/01-home-desktop.png`, `02-produk-desktop.png`, `03-kontak-mobile.png`.
- Test maintenance (documented): e2e responsive spec scoped to nav landmark (footer sitemap legitimately duplicates links); FAB placeholder title disambiguated; single-worker runs required (per-worker `beforeAll` bootstrap vs 5/hour rate limit).
- Changed files: `frontend/src/styles.css`, `frontend/src/components/Layout.tsx`, `frontend/src/pages/public.tsx`, `frontend/src/pages/Kontak.tsx`, `tests/e2e/app.spec.ts` (selectors), `tests/e2e/tablet.spec.ts` (new), `tests/screenshots/*` (new). Backend/admin/shared/contracts/DB/Cloudflare: untouched.
- Known limitations: placeholder brand tokens/typeface (TBD-04); all content TBDs still deferred with honest states; e2e needs fresh-DB discipline; `wa.me` template string in bundle is code, not a contact.
