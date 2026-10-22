# Design System — PipleSolution (Phase 00 Discovery v3)

> Status: DIRECTION ONLY. No tokens finalized, no components built. Real brand specs pending TBD-04.
> Public language: Bahasa Indonesia. Last updated: 2026-10-09 — v3 revision (7 services; portfolio standalone).

## 1. Confirmed visual direction

**Light clean corporate, modern, professional, responsive, readable, accessible.**

Interpretation (proposed, pending brand specs):

- Light backgrounds (white / very light neutrals), restrained accent color (to be replaced by real brand color TBD-04), generous whitespace, clear hierarchy.
- Corporate trust signals: client logos (only if approved), service grid (7 commercial categories — portfolio is a separate section, never a service card), product cards with status badges, pricing tables, testimonials (only real/approved per draft-by-default rule), WhatsApp CTA persistence.
- No dark-mode default, no playful/illustration-heavy style for MVP.

## 2. Placeholder tokens (explicitly NON-FINAL)

Until TBD-04 is resolved, any mockup uses neutral placeholders. Do not present these as brand decisions.

- Colors (placeholder): `--bg: #FFFFFF; --surface: #F7F8FA; --ink: #16213A; --muted: #5B6B85; --accent: #1B6CE5 (placeholder); --success/--warn/--danger` standard accessible ramps.
- Typography (placeholder): system stack or Inter-equivalent; real typeface per TBD-04. Base 16px, line-height ≥1.6 for ID body text, fluid scale for headings.
- Spacing/radius: 4pt scale; radius 8–12px cards, 999px pills for CTAs.

## 3. Information architecture & components (proposed)

- Global: header (logo placeholder, nav: Beranda/Tentang/Layanan/Produk/Portofolio/Harga/Artikel/Kontak — Layanan covers the 7 commercial categories; Portofolio is standalone), sticky WhatsApp CTA button, footer (sitemap, contact placeholders, copyright).
- Cards: service (7), product (with `Tersedia / Dalam pengembangan / Segera hadir` badge mapping — ID wording pending TBD-10; readiness shown only for owner-confirmed published products), portfolio (standalone), article, pricing (with TBD/“Hubungi via WhatsApp” state; no invented values).
- Forms: inquiry form UI exists only as an approved-scope design (D-27; not built, D-25 closed): labeled ID fields (name/email/company/service/description), consent checkbox (wording TBD-09 OPEN), inline Zod error messages, honeypot hidden.

## 4. Accessibility & readability (requirements for Phase 01)

- Contrast ≥ WCAG 2.2 AA (4.5:1 body), visible focus rings, keyboard-navigable nav/menus/dialogs, semantic landmarks, skip link.
- Touch targets ≥ 44px; responsive breakpoints (mobile-first; test 360px → desktop); no horizontal scroll.
- Bahasa Indonesia plain-language copy; abbreviations explained; numbers/dates in ID format; `lang="id"`.

## 5. Responsive behavior

- Mobile: stacked cards, collapsible nav, persistent WhatsApp FAB. Tablet/desktop: multi-column grids for services/products/pricing. Images optimized/responsive (storage TBD-13).

## 6. What is blocked

- Final palette, typeface, logo usage, and component library lock-in all await TBD-04 (assets) and TBD-10 (copy). Wireframes may proceed on placeholders.
