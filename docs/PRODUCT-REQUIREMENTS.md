# Product Requirements — PipleSolution Company Profile (Phase 00 Discovery v3)

> Status: DISCOVERY ONLY — v3 revision. No frontend, backend, CMS, production database, or deployment has been implemented. No technical spike executed.
> Public website language: **Bahasa Indonesia**.
> Last updated: 2026-10-09 — Phase 00 Revision v3 (doc revision only; supersedes v2 taxonomy where noted).

## 0. Document baseline note

- Mandatory first steps performed 2026-10-09: inspected `D:\project\PipleSolutions`, ran `git status` (result: **not a git repository**), listed workspace contents (result: **empty directory, 0 entries**).
- No prior Phase 00 documents were found in the repository. There was therefore nothing to preserve, merge, or contradict at file level.
- This file is created as the **baseline** directly from the Phase 00 Update v2 business decisions. If earlier decisions existed outside this repo, any contradiction must be recorded in `docs/DECISIONS.md` once supplied.
- All unconfirmed facts remain marked **TBD**. Nothing in this document invents package names, prices, capabilities, guarantees, product readiness, or copy.

## 1. Brand & business

| Item | Confirmed decision |
|------|--------------------|
| Brand | **PipleSolution** (exact spelling to be used consistently; do not use variants without owner approval) |
| Business type | Software house and digital product provider |
| Target market | Mixed market, depending on business opportunities (no single vertical locked for MVP) |
| Public language | Bahasa Indonesia (all public UI, navigation, CTAs, and content) |
| Visual direction | Light clean corporate, modern, professional, responsive, readable, accessible |
| Domain | Not yet decided — see TBD-06 |
| Brand assets | Owner states logo, colors, and brand assets are **available**, but actual files/specs have **not** been inspected — see TBD-04 |

## 2. Primary website goals

1. Establish company credibility.
2. Generate customer leads.
3. Showcase services.
4. Market digital products.

Non-goals for MVP (unless owner approves otherwise): e-commerce checkout, online payment, multi-language support, client portal, job board.

## 3. Confirmed commercial services (7 categories — owner decision v3)

Portfolio and case studies are **NOT** commercial service categories (owner decision v3, [APPROVED] A). Document exactly the 7 categories below. Do not invent packages, prices, capabilities, or guarantees.

1. **Website company profile** — corporate/marketing sites for clients.
2. **Website development** — general web application development.
3. **Mobile development** — must accommodate **both native and cross-platform** client requirements. Do not lock to a single framework in public copy until TBD resolved.
4. **Custom systems** — bespoke business systems/applications.
5. **POS systems** — point-of-sale solutions.
6. **ERP** — enterprise resource planning solutions.
7. **Wedding planning service** — a **service** offering (hospitality/event planning), **not automatically a digital product**. Detailed scope and commercial offering remain TBD-08. Do not describe it as software.

Portfolio and case studies live exclusively in the **Portfolio** section/resource (listing + detail pages), never as a service category, service route, service API resource, or service database category. See §7.

Pricing principle: service packages and prices **should be displayed publicly**, but actual package names, features, limits, and monetary values remain **TBD-02** until supplied or approved by the owner. The UI must support a pricing section with placeholder/TBD states, not invented prices.

## 4. Confirmed digital products (3 items)

Catalog (names verbatim, Indonesian):

1. POS Kasir Otomatis
2. POS Pemesanan Penginapan
3. ERP Laundry

Rules:

- Owner confirms **mixed readiness**: some products are live, others still under development.
- **Individual readiness status of each product remains TBD (TBD-01).** Do not label any individual product as available until the owner confirms it.
- Public website must support explicit product statuses. The following are **proposed status options, not assigned statuses**:
  - `Available`
  - `In development`
  - `Coming soon`
- Status vocabulary must be consistent across PRD, UI copy (Bahasa Indonesia equivalents to be approved in TBD-10), database (`DATABASE.md`), API (`API.md`), and CMS.
- Eventual CMS must allow Super Admin to manage per product: descriptions, features, imagery, CTA destinations, demo URL configuration, and publication/readiness status. See §6.
- Product demo integration is DEFERRED until demo URLs are supplied (D-28): each product is deployed and maintained separately — the website must never copy or embed product source code. Product cards support a configurable external demo URL with states such as `Coming Soon`, `Live Demo`, `Request Demo`; no `Live Demo` label until URL + access verified; missing URLs never replaced with fabricated links. Local development/review may proceed without URLs. Demo security, dummy data, access restrictions, and production-data isolation assessed per product before public demo access.

Do not invent product features, screenshots, pricing, or integrations.

## 5. Conversion & lead handling — WhatsApp primary; inquiry scope APPROVED for Phase 01 (D-27, implementation gated by D-25)

- **WhatsApp is the primary CTA / primary lead channel** across public pages (hero, services, products, pricing, contact). This is confirmed regardless of the inquiry-form decision.
- Official WhatsApp business number and preferred prefilled message are **TBD-03**. All CTA buttons must be built to accept a centrally configured number + message template (see `Settings` in §6) so no hard-coded number ships.
- **WhatsApp button clicks alone do not provide message content or visitor identity** and therefore cannot populate a CMS lead inbox by themselves.
- The **website inquiry form** + **functional Leads inbox** are **INCLUDED in the proposed Phase 01 scope (D-27)** — this supersedes the earlier pending/excluded posture (v3 D-14; history preserved). Owner-approved minimum fields: name, email, optional company, service of interest, project description — stored in DB, manageable through the CMS Leads inbox. Explicit exclusions for Phase 01: no automated email or WhatsApp integration; no public inbox access. Privacy, retention, and data-handling requirements must be documented before public launch. Anything not explicitly decided (consent wording, pre-launch privacy/retention docs) remains TBD-09, which stays OPEN. Nothing here is implemented (D-25 still closed).
- Earlier v2 wording that read as a "WhatsApp-only MVP default" was a planning placeholder, **not** an owner decision, and remains withdrawn.
- No document may claim the inquiry form is implemented or launched, nor that WhatsApp clicks auto-create lead records. Scope approval (D-27) is distinct from implementation authorization (D-25, still closed). See `WORKFLOW.md` and `SECURITY.md`.

## 6. Confirmed CMS scope (7 modules, single role)

Owner-confirmed CMS modules:

1. **Services** — CRUD for the 7 commercial service categories only (§3). Portfolio content is managed exclusively via the Portfolio resource, never via Services.
2. **Products** — CRUD catalog incl. descriptions, features, imagery, CTA destinations, publication status and readiness status (kept distinct; readiness TBD-01).
3. **Portfolio** — CRUD case studies as a standalone section (only TBD-05-approved items may be published).
4. **Articles** — news/blog/content marketing.
5. **Leads** — functional inbox in proposed Phase 01 scope (D-27; implementation gated by D-25): Super Admin-only triage of inquiry submissions with status updates, spam + repeated-submission protection, no public access. Privacy, retention, and data-handling docs required before public launch. Previously a data-model placeholder (v3 D-14) — history preserved.
6. **Pricing** — service packages and prices (values TBD-02).
7. **Settings** — site-wide config: WhatsApp number/template (TBD-03), SEO defaults, homepage copy refs (TBD-10), product status vocabulary, general contact info (TBD-07). Public reads expose **only an explicit allowlist** of public fields; internal configuration, secrets, credentials, session/security settings, and private CMS configuration are never exposed publicly (owner decision v3, [APPROVED] C; see `API.md`, `SECURITY.md`).

Permission model:

- **One Super Admin role only** for initial scope. No Editor or multi-role permission system for MVP.
- All 7 modules are administered by Super Admin. No per-module roles, approvals chain, or audit-actor distinction is required for MVP.

Content lifecycle (recommendation, not implementation). Unverified-content rule (owner decision v3, [APPROVED] F): no unverified business information (product readiness/availability, prices/packages, portfolio/screenshots/client claims, address/contact/profile claims, testimonials/metrics/outcomes) may be published as factual content. Such content stays in **Draft or another non-public state**; public APIs return only eligible published content; editorial publication `status` and product `readiness` are distinct — a row must not become public merely because a database default or seed script marks it published:

- `Services`, `Products`, `Portfolio`, `Articles`, `Pricing`: recommended lifecycle **Draft → Published** (+ `Archived` as terminal hidden state), all defaulting to `draft` (DB default `draft`; seeds `draft`). See `WORKFLOW.md` / `DATABASE.md` for rationale and the review/publishing gate.
- `Leads` (approved Phase 01 scope D-27; built only after D-25 authorization): lifecycle is operational, not editorial — e.g. `New → In progress → Closed` + retention/deletion policy, not draft/published.
- `Settings`: no draft/published; versioned singleton with change history (proposed).

Soft deletion (recommendation, not implementation):

- Recommend soft-delete (`deleted_at`) for: Services, Products, Portfolio, Articles, Pricing, Leads — to preserve referential integrity, allow recovery from admin error, and support audit/retention.
- Do not recommend soft-delete for Settings (singleton config; use versioning instead).
- Final per-entity decision documented in `DATABASE.md`. Nothing is implemented in Phase 00.

## 7. Sitemap (proposed, consistent with confirmed categories)

All public routes serve Bahasa Indonesia content. This sitemap is **proposed** (Phase 00); no routes are implemented.

```
/ (Beranda)
├─ /tentang (Tentang PipleSolution — profile, vision/mission TBD-07, credibility)
├─ /layanan (Layanan overview — 7 commercial categories, §3)
│  ├─ /layanan/website-company-profile
│  ├─ /layanan/website-development
│  ├─ /layanan/mobile-development (native + cross-platform)
│  ├─ /layanan/custom-systems
│  ├─ /layanan/pos-systems
│  ├─ /layanan/erp
│  └─ /layanan/wedding-planning (service; scope TBD-08)
├─ /produk (Produk digital — 3 items, statuses TBD-01)
│  ├─ /produk/pos-kasir-otomatis
│  ├─ /produk/pos-pemesanan-penginapan
│  └─ /produk/erp-laundry
├─ /portofolio (Portofolio standalone — items TBD-05; NOT a service)
│  └─ /portofolio/:slug
├─ /harga (Harga — packages publicly visible; values TBD-02)
├─ /artikel (Articles index)
│  └─ /artikel/:slug
├─ /kontak (Kontak — WhatsApp primary CTA TBD-03; inquiry form per approved D-27 fields, built only after D-25 authorization)
└─ /admin/* (Super Admin CMS — single role; 7 modules §6; bootstrap/recovery + auth TBD-14)
```

Notes:

- Portfolio/case studies are NOT a commercial service: the incorrect `/layanan/portfolio-case-studies` route is removed. Portfolio uses only `/portofolio` + `/portofolio/:slug`.
- Wedding planning appears under services, never under `/produk`.
- All three product names are retained as owner-provided names; none is assigned a readiness status in this doc (readiness TBD-01; editorial `status` vs `readiness` are distinct).
- Pricing page exists structurally but shows TBD/placeholder until TBD-02 resolved; no unverified price, package, testimonial, metric, or company-profile claim is published (draft-by-default).
- Inquiry form on `/kontak` (fields per D-27) + functional Leads inbox are in proposed Phase 01 scope (implementation gated by D-25); privacy/retention/data-handling docs required before public launch. WhatsApp remains primary regardless.

## 8. MVP scope (proposed Phase 01 scope per D-27; implementation NOT authorized — D-25 closed)

In scope (structure/content-model only, no build in Phase 00):

- Public marketing site per sitemap §7 with ID copy (copy itself TBD-10), light clean corporate design, responsive + accessible.
- WhatsApp primary CTAs wired to centrally configured number (TBD-03).
- Pricing section structure with TBD placeholders (no invented prices).
- Product catalog structure supporting 3 statuses (no per-product status assigned); configurable external demo URLs per D-28 (deferred integration, no source copying, no fabricated links).
- Inquiry form (name, email, optional company, service of interest, project description) + Super Admin Leads inbox with status updates, validation, safe errors, spam + repeated-submission protection (D-27); no automated email/WhatsApp integration; no public inbox access; privacy/retention docs pre-launch.
- Local development on localhost/dev placeholders (domain D-29/TBD-06, WhatsApp D-30/TBD-03 deferred); product demo URLs not required for local review.
- CMS content model + API contracts for 7 modules with single Super Admin (design only). Services model covers the 7 commercial categories; Portfolio is a separate resource. Public Settings reads use an explicit allowlist only (no whole-record exposure).
- Database technical spike (SQLite ↔ D1) was a **mandatory prerequisite** (owner decision v3, [APPROVED] B; acceptance criteria in `ARCHITECTURE.md`, TBD-12) and has been EXECUTED with all legs PASS (`spike/d1-sqlite/RESULTS.md`). Full Phase 01 implementation must not begin until required planning approval (D-25 still closed).

Conditional / included in proposed Phase 01 scope (D-27; implementation gated by D-25):

- Inquiry form + functional Leads inbox per the approved minimum (fields, validation, repository storage, Super Admin triage, spam protection; exclusions as above). Consent wording + pre-launch privacy/retention/data-handling docs remain TBD-09 (OPEN).

Out of scope for MVP:

- Multi-role permissions, e-commerce, payments, multi-language, client portal.
- Production database creation, deployment, real media pipeline (pending TBD-11/12/13).

## 9. Acceptance criteria (Phase 00 documentation — v3)

- [ ] Exactly the 7 commercial service categories documented without invented details; wedding planning as service; portfolio/case studies NOT described as a service anywhere.
- [ ] Sitemap has no `/layanan/portfolio-case-studies`; portfolio uses only `/portofolio` + `/portofolio/:slug`; service detail routes, API resources, and DB category constraints agree on the same 7.
- [ ] All 3 product names retained without assigned readiness; editorial `status` distinguished from `readiness`; status vocabulary defined as proposed.
- [ ] Pricing documented as publicly visible with values TBD; no unverified price/package/testimonial/metric/profile claim published (draft-by-default; seeds `draft`).
- [ ] WhatsApp documented as primary CTA with number TBD (deferred D-30); inquiry form + Leads inbox in approved Phase 01 scope (D-27, supersedes v3 PENDING posture — history in §11); consent/privacy/retention docs still TBD-09 OPEN.
- [ ] CMS lists exactly the 7 confirmed modules with single Super Admin; Services manages only the 7 commercial categories.
- [ ] Public Settings allowlist specified (explicit allowlist, no whole-record exposure; admin endpoints auth-gated).
- [ ] Super Admin bootstrap/recovery lifecycle documented (not implemented; no hardcoded secrets).
- [ ] Database technical spike documented as mandatory prerequisite with acceptance criteria; spike NOT executed; no unverified adapter choice presented as proven.
- [ ] Sitemap reflects §§3–6.
- [ ] TBD register below is complete (16 entries, original IDs preserved) with required fields.
- [ ] Proposed vs approved vs pending vs implemented clearly distinguished; no doc claims implementation, passing tests, or deployment.
- [ ] Frontend/backend documented as separate applications; SQLite-local / D1-production constraint noted (see `ARCHITECTURE.md`).

## 10. TBD REGISTER (authoritative for v2)

> Rule: a proposed default is **never** an approved decision. Phase-blocking notes indicate which later phase cannot be **finalized** (not necessarily started) without resolution.

### Business and content

#### TBD-01: Individual readiness status of each digital product
- **Question:** What is the readiness/publication status of each of the 3 products (POS Kasir Otomatis, POS Pemesanan Penginapan, ERP Laundry) — which is Available vs In development vs Coming soon, and what evidence (live URL/demo) supports it?
- **Why it matters:** Public catalog must not mislead; status drives badges, CTAs, and whether a product page is published. Mixed readiness is confirmed but per-product mapping is unknown.
- **Current status:** Unresolved. Only the mixed-readiness fact and the proposed status vocabulary are confirmed. Demo integration DEFERRED per D-28: demo URLs not yet supplied; configurable external URLs with `Coming Soon` / `Live Demo` / `Request Demo` states planned; no `Live Demo` label until URL + access verified; per-product demo security assessment required before public demo access. Content supplied incrementally per D-31.
- **Proposed default:** Default all three to `In development` (hidden/draft) in any staging seed until owner assigns; never default to `Available`. No fabricated demo links, ever.
- **Who must approve/provide:** Product owner.
- **Blocked phase:** Phase 01 public catalog content + Phase 02 CMS seed/publication logic cannot be finalized.

#### TBD-02: Pricing package names, prices, included features, and limits
- **Question:** What are the public service package names, monetary values (IDR), included features, limits, and terms for each service category?
- **Why it matters:** Pricing must be publicly displayed per owner decision; invented prices would create commercial liability.
- **Current status:** Unresolved. Principle (public) confirmed; values entirely missing.
- **Proposed default:** Ship pricing section with explicit "Segera diumumkan / Hubungi via WhatsApp" placeholders; schema supports nullable price + `is_custom_quote` flag.
- **Who must approve/provide:** Product owner.
- **Blocked phase:** Pricing page content + `Pricing` CMS seed cannot be finalized; structure work may proceed.

#### TBD-03: Official WhatsApp business number and preferred prefilled message
- **Question:** What is the official WhatsApp business number (international format) and the preferred prefilled message template(s) per context (general, service, product)?
- **Why it matters:** Primary CTA on every page; wrong number breaks the sole conversion channel.
- **Current status:** Unresolved; deferred until supplied (D-30). Website prepares a configurable contact component + development-only placeholder state.
- **Proposed default:** Centralize in `Settings` (`whatsapp_number`, `whatsapp_templates`); staging uses clearly fake `+62-000-0000-0000` placeholder that is blocked from production build by a config check (proposed). Never invent a number or publish a fake production contact.
- **Who must approve/provide:** Product owner.
- **Blocked phase:** Contact/CTA wiring and production launch; development may use placeholder.

#### TBD-04: Actual brand logo files, brand color values, typography, and asset locations
- **Question:** Where are the actual logo files (SVG/PNG), brand color values, typography, and usage rules, and under what license may they be used?
- **Why it matters:** "Light clean corporate" cannot be implemented without real tokens; placeholder branding risks rework.
- **Current status:** Unresolved. Owner states assets are available but no files/specs have been inspected in this repo.
- **Proposed default:** Use neutral placeholder tokens documented in `DESIGN-SYSTEM.md`, clearly marked non-final; swap on receipt.
- **Who must approve/provide:** Product owner (supply files + spec).
- **Blocked phase:** Final visual implementation (Phase 01+); wireframe/token-architecture work may proceed.

#### TBD-05: Portfolio projects approved for publication, including real screenshots and descriptions
- **Question:** Which portfolio/case-study projects are approved for publication, with real screenshots, client consent, descriptions, and outcomes?
- **Why it matters:** Credibility goal depends on it; publishing unapproved work is a legal/reputational risk.
- **Current status:** Unresolved; zero items approved.
- **Proposed default:** Portfolio pages + CMS seed with empty state ("Portofolio segera hadir"); no stock-fake case studies presented as real.
- **Who must approve/provide:** Product owner (+ client consent where applicable).
- **Blocked phase:** Portfolio content and launch-readiness; structure may proceed.

#### TBD-06: Domain name and ownership/DNS status
- **Question:** What is the production domain, who owns/controls it, and where is DNS managed (incl. Cloudflare zone status)?
- **Why it matters:** Determines deployment topology, TLS, and SEO/analytics setup.
- **Current status:** Direction APPROVED (D-24; reaffirmed D-29): use a domain already owned by the business. Exact domain pending identification — do not infer it; no DNS changes authorized. Local development uses localhost/dev placeholders. TBD-06 stays OPEN.
- **Proposed default:** None. Use local/staging hostnames only; do not purchase or configure production DNS in Phase 00.
- **Who must approve/provide:** Product owner.
- **Blocked phase:** Production deployment + SEO/analytics finalization (TBD-11/15).

#### TBD-07: Official business email, public address if applicable, company profile, vision, and mission
- **Question:** What are the official contact email(s), public address (if any), company profile text, vision, and mission for the About/Contact pages and footer?
- **Why it matters:** Credibility + contact completeness; About page cannot be written without it.
- **Current status:** Unresolved.
- **Proposed default:** About/Contact sections with labeled placeholders; footer shows only WhatsApp CTA until email/address confirmed.
- **Who must approve/provide:** Product owner.
- **Blocked phase:** About/Contact content finalization (TBD-10 copy also affected).

#### TBD-08: Detailed scope and commercial offering for the wedding planning service
- **Question:** What exactly does the wedding planning service include, how is it priced/packaged, what is its geographic coverage, and how should it be positioned alongside software services?
- **Why it matters:** Only non-software service; unclear scope risks confusing positioning and incorrect sitemap/copy.
- **Current status:** Unresolved beyond "wedding planning service" label.
- **Proposed default:** Present as a distinct service card/section linking to WhatsApp consultation; no packages or guarantees stated.
- **Who must approve/provide:** Product owner.
- **Blocked phase:** Wedding-planning page content; IA work may proceed with placeholder.

#### TBD-09: Whether the website inquiry form + functional Leads inbox are approved for MVP
- **Question:** Is the inquiry form (stored in DB + CMS Leads inbox) approved for MVP, and if so with which fields and consent wording — or is the MVP WhatsApp-first with no functional inbox?
- **Why it matters:** Determines whether the Leads module is functional vs data-model-only, plus privacy/spam/retention obligations; also determines `/kontak` scope and Leads API/DB work.
- **Current status:** Partially decided (D-27, supersedes v3 D-14 pending posture — history preserved): basic inquiry + Leads inbox INCLUDED in proposed Phase 01 scope with owner-specified fields (name, email, optional company, service of interest, project description); explicit Phase 01 exclusions (no automated email/WhatsApp, no public inbox access). Remaining OPEN: consent wording + privacy/retention/data-handling documentation before public launch. Nothing implemented (D-25 closed).
- **Proposed default:** None needed for the inclusion question (decided); no default for the remaining consent/privacy items.
- **Who must approve/provide:** Product owner (consent wording, pre-launch privacy/retention docs).
- **Blocked phase:** Leads/API/DB implementation blocked on D-25 lift (not on scope ambiguity anymore); public launch blocked on pre-launch privacy/retention docs; planning/design may proceed without implementation.

#### TBD-10: Approved homepage copy, company tagline, and final positioning
- **Question:** What is the approved homepage copy (hero, value props, CTAs in Bahasa Indonesia), tagline, and positioning statement balancing software-house + digital products + wedding service?
- **Why it matters:** All public pages need consistent ID copy; without it, design uses lorem/placeholder.
- **Current status:** Unresolved.
- **Proposed default:** Wireframes with explicit `[COPY TBD]` markers; no invented tagline presented as final.
- **Who must approve/provide:** Product owner.
- **Blocked phase:** Content-complete UI; IA/visual exploration may proceed.

### Technical and operational

#### TBD-11: Final frontend and backend deployment topology
- **Question:** What is the final deployment topology (frontend asset host + Workers backend + custom domain wiring) for production and preview environments?
- **Why it matters:** Affects build outputs, routing, CORS, env management, and cost.
- **Current status:** Partially decided: environment boundaries APPROVED (D-23) — separate D1 resources for dev/staging/prod (none exist yet). Frontend host + domain wiring still undecided; exact domain pending identification (D-24/TBD-06).
- **Proposed default:** Frontend static assets on Cloudflare (Pages/Workers Static Assets) + Hono API on Workers, split origins; see `DEPLOYMENT.md` options. Not a decision.
- **Who must approve/provide:** Product owner + Agent 2 review (technical).
- **Blocked phase:** Production release; local/dev work unaffected.

#### TBD-12: Verified local SQLite and Cloudflare D1 adapter and migration strategy
- **Question:** Which DB access layer/migration tooling will run identically (or with a verified adapter) against local SQLite and production D1, and how are migrations applied per environment?
- **Why it matters:** Workers cannot run Node SQLite drivers; an unverified abstraction breaks prod. See `ARCHITECTURE.md` §3.
- **Current status:** OPEN — evidence complete, pending finalization approval. The mandatory spike (owner decision v3, [APPROVED] B) has been EXECUTED: all six `ARCHITECTURE.md` §3.4 criteria PASS on SQLite-local, local-D1 sim, and real remote D1 (`spike/d1-sqlite/RESULTS.md`). Proven: shared SQL source, journal-tracked `wrangler d1 migrations apply` (`--local` + `--remote`), raw-SQL repository pattern with async adapters. Still undecided: adapter-library choice (Drizzle/Kysely vs hand-rolled) and final sign-off — see PROPOSED `docs/PERSISTENCE-DECISION.md` (D-16). This TBD is NOT resolved here.
- **Proposed default:** Hand-rolled thin repository (zero-dep, matches spike evidence) as the leading option; Drizzle/`drizzle-kit` or Kysely remain alternatives requiring their own verification. No selection finalized; all stay **proposed/pending until owner + Agent 2 approve D-16**.
- **Who must approve/provide:** Agent 1 proposal (`docs/PERSISTENCE-DECISION.md`) → Agent 2/owner approval of D-16.
- **Blocked phase:** Backend persistence finalization and full Phase 01 implementation (must not begin until D-16 approval + adapter-library lock); schema design may proceed.

#### TBD-13: Image/media storage approach, including whether Cloudflare R2 is needed
- **Question:** Where are product/portfolio/article images stored (repo-bundled vs object storage), at what sizes/formats, and is Cloudflare R2 required for MVP?
- **Why it matters:** D1 is not a blob store; bundling large media bloats builds; R2 adds cost/ops.
- **Current status:** Unresolved.
- **Proposed default:** MVP uses repo-bundled optimized images + placeholder pipeline; adopt R2 only when media volume/owner uploads demand it. Not a decision.
- **Who must approve/provide:** Product owner + Agent 2 review.
- **Blocked phase:** Media pipeline implementation; schema reserves `image_url`/`image_key` fields regardless.

#### TBD-14: Admin authentication, session, cookie, CSRF, rate-limiting, bootstrap, and recovery implementation choices
- **Question:** How does the single Super Admin authenticate and recover access (credential store, password hashing/verification, session vs token, cookie flags, CSRF, rate limiting/lockout, initial bootstrap, secret handling, password/administrator recovery with authorization + audit, no-public-registration enforcement, empty-state vs already-bootstrapped behavior)?
- **Why it matters:** Only privileged surface; wrong choices = account takeover / lead-data exposure; unplanned bootstrap = lockout or open registration.
- **Current status:** Partially decided: session store **D1 APPROVED (D-18)** — design only; session behavior, expiry/GC semantics, and integration unvalidated. Remaining mechanism choices (hashing, cookies, CSRF, rate limits, bootstrap/recovery runbook) still pending verification; no implementation, no credentials created.
- **Proposed default:** Email+strong-password with argon2/bcrypt, D1-backed opaque server sessions, `HttpOnly; Secure; SameSite=Lax` cookies, CSRF tokens on mutations, per-IP + per-account rate limits; single-use bootstrap when zero admins exist (otherwise disabled), recovery via owner-authorized out-of-band procedure with audit log. Design direction per D-18; not validated.
- **Who must approve/provide:** Agent 2 review + owner (operational: credential provisioning and recovery authorization).
- **Blocked phase:** Admin auth/bootstrap/recovery implementation; threat-model and runbook planning may proceed.

#### TBD-15: SEO metadata, sitemap, and analytics requirements
- **Question:** What SEO metadata, sitemap/robots, Open Graph, and analytics (if any) are required, given ID language and credibility goals?
- **Why it matters:** Discoverability + lead attribution; analytics has privacy implications.
- **Current status:** Unresolved.
- **Proposed default:** Static meta + `/sitemap.xml` + `/robots.txt` scaffolding, no third-party trackers until owner approves; privacy-friendly option evaluated.
- **Who must approve/provide:** Product owner.
- **Blocked phase:** Pre-launch SEO/analytics; IA work unaffected.

#### TBD-16: Production backup, recovery, and rollback procedures
- **Question:** What are the production backup (D1), media retention, recovery RTO/RPO, and frontend/backend rollback procedures?
- **Why it matters:** Lead + content data loss and bad deploys are the top operational risks.
- **Current status:** Partially decided, nothing implemented or validated: backup Option B APPROVED (D-19) — scheduled backups, separate copies, documented restore, rehearsals; RPO ≤ 24h / RTO ≤ 8h APPROVED as TARGETS (D-20 — not guarantees); rollback Option C APPROVED (D-21) — compensating migrations + backup restoration, no down-migrations. No backup exists; no restore rehearsed; runbook untested; no production system exists.
- **Proposed default:** Document-only in Phase 00 (see `DEPLOYMENT.md`); adopt D1 time-travel/export + redeploy-previous-build rollback once topology (TBD-11) is fixed. Design per D-19/D-20/D-21; not validated.
- **Who must approve/provide:** Product owner + Agent 2 review.
- **Blocked phase:** Production operations handover; development unaffected.

## 11. Contradictions & assumptions log (v3)

- v2 baseline (2026-10-09): No prior repo documents existed at v2 time, so no file-level contradictions were resolvable then.
- v3 corrections (2026-10-09, owner review): (1) Portfolio/case studies removed from the commercial services taxonomy (was item 7 of 8; now 7 commercial categories + standalone Portfolio) — all counts, routes, API resources, and DB constraints updated; the incorrect `/layanan/portfolio-case-studies` route and the malformed `/├─ /layanan` sitemap line were removed. (2) Inquiry-form "WhatsApp-only MVP default" phrasing withdrawn as an assumed decision; status corrected to PENDING with no default chosen. Details in `docs/DECISIONS.md` (D-10–D-15) and `docs/CHANGELOG.md` (v3).
- Standing assumptions (not decisions): brand spelling `PipleSolution`; status labels `Available / In development / Coming soon` map to ID equivalents later; any staging seeds use fake contact data and `draft` status only.
- Spike/finalization note (2026-10-09): the v3 spike prerequisite (D-11) has been EXECUTED with all legs PASS (`spike/d1-sqlite/RESULTS.md`); stale "NOT executed" phrasing in planning docs is superseded by dated addenda. Persistence finalization is PROPOSED in `docs/PERSISTENCE-DECISION.md` (D-16, pending approval); TBD-12 remains OPEN — nothing silently resolved.
- Owner approval record (2026-10-09): adapter Option A (D-17, TBD-12), D1 sessions (D-18, TBD-14), backup Option B (D-19) + RPO/RTO targets (D-20, TBD-16), rollback Option C (D-21, TBD-12/16), concurrency scope Option B (D-22, TBD-12/14), separate dev/staging/prod D1s (D-23, TBD-11/16), business-owned domain direction with exact domain pending (D-24, TBD-06 stays OPEN), Phase 01 NOT approved to start (D-25, Option C). All approvals are design-level; implementation and technical validation remain pending. Details in `docs/DECISIONS.md`.
- Latest owner decisions (2026-10-09; D-25 remains in force): gate reaffirmed (D-26); inquiry + Leads inbox INCLUDED in proposed Phase 01 scope with owner-specified fields and explicit exclusions, remainder OPEN (D-27, TBD-09); product demo links deferred with external URLs only (D-28, TBD-01); domain deferred with localhost placeholders (D-29, TBD-06); WhatsApp deferred with configurable component + dev placeholder (D-30, TBD-03); incremental content with draft-by-default reaffirmed (D-31); architecture verification recorded as decided-vs-pending-validation (D-32). Nothing implemented; no DNS/secret/production changes.
- If external earlier docs conflict (e.g. different service count, assigned product statuses, multi-role CMS, English-language site, invented prices), those conflicts must be appended here and in `DECISIONS.md` with source + resolution before Phase 01.

## 12. Traceability

- Services/products/CMS/modules in this file are the source of truth for: sitemap (`§7`), `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `WORKFLOW.md`, `DESIGN-SYSTEM.md`, `DEPLOYMENT.md`, `SECURITY.md`, `TESTING.md`, and `phases/PHASE-00-PLANNING.md`.
- Any change to §§3–6 requires a CHANGELOG entry and a DECISIONS entry.
