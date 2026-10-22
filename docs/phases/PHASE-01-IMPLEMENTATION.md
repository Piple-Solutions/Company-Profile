# Phase 01 Implementation — Plan, Milestones & Progress (D-33 authorized)

> Authorization: D-33 (gate D-25 OPENED; D-26 hold superseded, history
> preserved). Scope: readiness assessment P1-A–P1-E + D-27/D-28 fields and
> exclusions. No production deploy, DNS, billing, or `piple-spike-d1` changes
> authorized. Public language: Bahasa Indonesia. Placeholders stay TBD-labeled;
> nothing invented.

## Approved scope and exclusions

In scope: public site (Beranda, Tentang, Layanan + detail 7 kategori,
Produk + detail 3 produk, Portofolio + detail, Harga, Artikel + detail,
Kontak + formulir inquiry, Kebijakan Privasi); CMS Super Admin tunggal
(Services, Products, Portfolio, Articles, Pricing, Settings, Leads) dengan
CRUD + draft/publish/archive + soft-delete sesuai docs; inquiry
(name/email/company/service/description/consent/honeypot) + inbox Leads
(list/detail/status); demo URL eksternal konfigurabel + states; bootstrap
sekali pakai + sesi D1; allowlist Settings; pengujian Vitest + Playwright.
Out of scope: multi-role, e-commerce/pembayaran, multi-bahasa, portal klien,
email/WhatsApp otomatis, upload file, deploy produksi, DNS, billing,
peredaran produk demo, data produksi.

## Architecture & technology (verified from docs; no invention)

- `frontend/` React 18 + TypeScript + Vite + react-router-dom, CSS tokens
  (`DESIGN-SYSTEM.md` light corporate); `backend/` Hono + TypeScript +
  Zod, `shared/` Zod schemas + types (workspace npm); `tests/` Playwright.
- Persistence: thin async repository/port + `SqliteAdapter` (node:sqlite,
  lokal/tes) + `D1Adapter` (thin `env.DB` wrapper, prod Workers) — D-17;
  forward-only migrations `backend/db/migrations/` via `wrangler d1
  migrations apply` semantics; single SQL source (spike-proven).
- Local runtime: Hono `@hono/node-server` (dev-only); prod Workers entry
  documented, NOT deployed. Sessions: DB table, opaque token, cookies
  `HttpOnly; SameSite=Lax` (+`Secure` prod), CSRF per mutasi admin,
  scrypt hashing (node:crypto), rate-limit + lockout, bootstrap token
  out-of-band via env (body-only, atomic single-use).
- No ORM (D-17). No product source imports (D-28).

## Milestones (small, testable; status updated per milestone)

- [ ] M1 setup + baseline (workspace, scaffold, scripts, .env.example) — tests: toolchain versions.
- [ ] M2 migrations + adapters (+ seed draft-only) — tests: migrate fresh, repo conformance SQLite, D1Adapter shape + local-D1 parity note.
- [ ] M3 auth/bootstrap/sessions — tests: hashing, login lockout, bootstrap single-use incl. concurrent, session expiry, CSRF, no-registration.
- [ ] M4 public API + allowlists — tests: published-only reads, allowlist projection, strict rejection, error shape (no leaks).
- [ ] M5 public pages + responsive design — tests: Playwright nav/layout/ID copy/placeholders.
- [ ] M6 CMS modules + publishing — tests: CRUD/publish/unpublish per modul, authz setiap endpoint, IDOR negatif.
- [ ] M7 inquiry + Leads — tests: validasi, spam/rate-limit, persistensi, inbox akses kontrol + status.
- [ ] M8 demo URL states — tests: validasi skema http/https, missing-URL placeholder, no-Live-Demo-tanpa-verifikasi.
- [ ] M9 hardening + integrasi — tests: headers, secret-scan dist, full suites.
- [ ] M10 build checks + acceptance report — tests: `npm run build/test` semua paket + headed Playwright.

## Security requirements (from `SECURITY.md` + D-13/D-18)

Single Super Admin; no pendaftaran publik; bootstrap body-only + atomic;
scrypt; sesi opaque + CSRF; cookie aman; rate-limit login/bootstrap/inquiry;
Zod di boundary + CHECK DB; error aman (tanpa stack/SQL/secret); allowlist
output publik; secret hanya env (`BOOTSTRAP_TOKEN`, `SESSION_SECRET`);
`.env.example` placeholder; pindai secret di dist + file ter-commit.

## Acceptance criteria & test strategy

Per prompt §12 (13 butir) + §11: Vitest unit/integrasi backend, Playwright
e2e (headless untuk repeatability + headed Chromium untuk verifikasi visual
wajib), build/typecheck, secret-scan. Perintah + exit code + jumlah tes
dicatat; klaim hanya untuk yang dieksekusi.

## Deferred inputs & placeholder behavior

Domain (localhost; D-29), WhatsApp (komponen konfigurabel + placeholder
dev non-klik; D-30), demo URL (null → placeholder non-klik; D-28), harga/
readiness/portfolio/kontak/copy (TBD placeholders, draft-only; D-31),
consent/retensi privasi (dokumen pra-peluncuran; TBD-09 OPEN).

## Risks & open questions

- D1Adapter prod-behavior validated via spike SQL parity, not prod load —
  staging rehearsal required pre-prod (D-23 envs belum ada).
- Sesi D1: expiry/GC + beban belum tervalidasi (D-18).
- Backup/restore/rollback/concurrency: desain disetujui, belum dieksekusi
  (D-19–D-22) — pre-prod gates.
- Consent wording + dokumen privasi/retensi pra-peluncuran (TBD-09 OPEN).

## Progress log (updated per milestone; evidence only)

- 2026-10-09: D-33 recorded; this plan created. Implementation begins M1.
- M1 DONE: npm workspace (frontend/backend/shared/tests), 122 packages, esbuild approved+rebuilt; backend `tsc --noEmit` PASS; `backend/.env` (gitignored, generated local secrets) + `.env.example` placeholders. Vitest 3.1 (Vite 6, supports `node:sqlite`).
- M2 DONE: `0001_init.sql` (12 tables incl. `one_active_admin` guard) applied via idempotent `migrate()`; draft-only `seed.ts` (7 services + 3 products, 0 published); `SqliteAdapter` + `D1Adapter` (async port) implemented.
- M3/M4 wiring VERIFIED live (dev server :8787): health ok; public services `[]` while drafts; inquiry 201 valid / 400 ID field errors; bootstrap 200 + session cookie + CSRF; second bootstrap 403 identical message; CSRF-gated publish → public visibility.
- M5 DONE: 13 public routes (ID), 7-category taxonomy, responsive + reduced-motion + skip-link + focus states, `[TBD]` placeholders, empty states.
- M6 DONE: CMS (5 content modules CRUD + publish/unpublish/soft-delete, Leads inbox + detail + status, Settings allowlist UI); server-side authz on every endpoint (IDOR 404/401/403 verified in tests).
- M7 DONE: inquiry form (D-27 fields, server validation, honeypot silent-accept, rate-limit 5/jam/IP, Origin + size guards) + Leads triage; privacy page (retention TBD noted, no compliance claim).
- M8 DONE: `demo_url` column + http/https-only validation; `demo_state` derived server-side; missing URL → non-clickable placeholder; unsafe schemes rejected 400.
- M9 DONE: Vitest 27/27 (contracts, repo/gate/allowlist, auth incl. concurrent single-winner + lockout + expiry + CSRF, inquiry incl. honeypot/rate-limit, leads authz, demo states, D1Adapter shape); Playwright 10/10 headless AND headed Chromium (real frontend + backend + SQLite, fresh e2e.db); secret scan clean (only `wa.me` URL prefix in bundle, no numbers/secrets); `npm audit`: 2 moderate (react-router SSR hydration GHSA-337j — not exploitable in this SSR-free SPA; upgrade to v7 deferred as breaking).
- M10 DONE: `tsc` shared/backend/frontend PASS; `vite build` PASS; dist secret-scan PASS. Bugs found by tests and fixed: ORDER BY on tables lacking `sort_order`; honeypot silent-accept vs Zod rejection; Vitest 2→3 for `node:sqlite`; concurrent-bootstrap typing; e2e isolation (fresh DB per run) + login race wait.

## Acceptance report (Phase 01, local)

Scope P1-A–P1-E implemented per D-27/D-28 fields and exclusions; draft/publish separation verified (published-only reads, seed-guard 0 public rows fresh); auth/bootstrap/sessions/CSRF/rate-limits verified incl. concurrent single-winner; inquiry stores valid + rejects invalid safely; inbox Super-Admin-only with status workflow; demo cards safe with/without URLs; domain/WhatsApp/content deferred with non-misleading placeholders; no secrets in repo or dist; `piple-spike-d1` untouched; no deploy/DNS/billing. Remaining risks: D1Adapter prod behavior (spike SQL parity only), session expiry/GC under load, backup/restore/rollback/concurrency suites (pre-prod per D-19–D-22), consent/retention docs + domain/WA/content inputs (TBD-09/03/06 + content TBDs). Deferred to later phases as documented.
