# Testing Strategy — PipleSolution (Phase 00 Discovery v3)

> Status: STRATEGY ONLY. No test suites implemented or executed in Phase 00. All items below are planned.
> Last updated: 2026-10-09 — v3 revision.

## 1. Proposed stack

- **Vitest:** unit + API/handler integration (schemas, repository adapters, publication predicates, readiness mapping, pricing null-handling).
- **Playwright:** end-to-end for public journeys (ID navigation, WhatsApp CTA hrefs, pricing TBD states, product badges) + admin smoke (login gate) once built.

## 2. What will be tested (Phase 01+ targets)

| Area | Examples (all PLANNED, none executed) |
|------|----------|
| Service taxonomy (v3 A) | Exactly 7 commercial services; no `/layanan/portfolio-case-studies` route; portfolio slugs rejected by service validators/DB CHECK; service grid shows 7 |
| Contracts | Zod schemas enforce inquiry fields (D-27: name/email/company/service/description/consent/honeypot) + slug/status/readiness/service-category enums; unknown settings keys rejected |
| Publication gate (v3 F) | Drafts/archived/deleted never leak to public queries; fresh seed exposes zero public rows (seed-guard); readiness-unconfirmed products hidden; editorial `status` vs `readiness` independently asserted |
| Settings allowlist (v3 C) | Non-allowlisted/secret/internal keys in storage never appear in any public response shape; whole-record passthrough test fails closed; no secrets in bundles |
| Bootstrap/recovery (v3 D) | Single-use bootstrap succeeds only at zero admins, `403` thereafter; no public registration; rate-limit/lockout smoke; recovery writes audit entry (session store: D1 approved design D-18, behavior unvalidated) |
| Concurrency (D-22, scope APPROVED — none executed) | Bootstrap single-winner; concurrent publish; edit/delete conflicts; data integrity; concurrent migration access where relevant |
| Leads (Phase 01 scope APPROVED D-27 — none executed) | Honeypot/rate-limit/repeated-submission protection + consent enforced; admin-only reads; no public inbox access; pre-launch privacy/retention docs verified before launch |
| Product demo links (D-28 — none executed) | External URLs only, never embedded source; no fabricated links; no `Live Demo` label without verified URL + access; per-product demo security assessment before public demo access |
| Pricing display | `price_amount=null` renders "Hubungi via WhatsApp", never `$0` or invented value |
| WhatsApp wiring | All CTAs resolve from allowlisted Settings; placeholder number blocked from prod build |
| Accessibility | Keyboard nav, focus, contrast spot-checks; `lang="id"` |
| DB spike (v3 B / TBD-12) | Spike acceptance per `ARCHITECTURE.md` §3.4: migrations + CRUD + types + constraints in both envs, reproducible commands, difference record; same repository tests pass on SQLite-local adapter and D1-compatible execution |

## 3. Environments

- Unit/integration: ephemeral SQLite (per-test), no network, no D1. E2E: disposable staging build + seeded draft/fake data; production never used for tests.

## 4. Phase 00 checks actually performed (v2 + v3)

- v2: documentation consistency check (manual): sitemap vs services/products/CMS/roles/language/design/stack claims verified by reading all docs. No automated tests existed or were run, as no code exists.
- v3 (this revision, read-only): re-read all 14 docs; verified (a) no commercial-service mention of portfolio/case studies remains except historical correction notes, (b) 7-category consistency across PRD/ARCH/DATABASE/API/WORKFLOW/DESIGN/TESTING/DECISIONS, (c) sitemap has no `/layanan/portfolio-case-studies` and no malformed route lines, (d) spike documented as prerequisite with acceptance criteria and NOT executed, (e) allowlist + bootstrap/recovery documented but not claimed implemented, (f) inquiry/Leads pending with no default chosen, (g) draft-by-default + seed-guard stated, (h) all 16 TBD IDs preserved. No dependencies installed, no code written, no tests run, no migrations created, no Cloudflare resources touched — verification was document inspection only.
- Spike addendum 2026-10-09: the spike HAS since been executed under separate owner approval — SQLite harness 17/17 PASS, local-D1 sim PASS, remote `piple-spike-d1` PASS on all six §3.4 criteria (`spike/d1-sqlite/RESULTS.md`). Repository contract tests per the §2 rows above remain PLANNED (none executed beyond the spike harness).

## 5. Entry criteria for Phase 01 testing

- Adapter architecture chosen: Option A hand-rolled thin repository APPROVED (D-17, design — implementation pending); migration runner path proven by spike; seed strategy with fake-only data; Playwright base URL + admin test account provisioning (TBD-14) defined. Note: Phase 01 itself is NOT approved to start (D-25) — these criteria describe readiness, not authorization.
