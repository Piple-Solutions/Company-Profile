# Database Proposal — PipleSolution (Phase 00 Discovery v3)

> Status: PROPOSAL ONLY. No database created (local or production). No migrations written or applied. No spike executed.
> Last updated: 2026-10-09 — v3 revision (service taxonomy fix; spike prerequisite; allowlist; draft-by-default).

## 1. Engine strategy

- **Local development:** SQLite file (e.g. `./dev.db`, gitignored). Zero-ops, file-backed.
- **Production:** Cloudflare D1 (SQLite-compatible). Accessed exclusively via Workers binding `env.DB`.
- **Tests:** Ephemeral SQLite (per-test file or `:memory:`). Never touch D1 from unit tests.
- Portability rule: use only SQL features common to SQLite and D1. No extensions, no stored procedures, no Node-driver-specific pragmas in app code.
- Access pattern per `ARCHITECTURE.md` §3: repository interface + `SqliteLocalAdapter` / `D1Adapter`. Migration tooling pending TBD-12.

## 2. Conventions (proposed)

- Tables `snake_case` plural; PK `id TEXT PRIMARY KEY` (UUIDv7/ULID, generated app-side for D1 portability; avoid `INTEGER AUTOINCREMENT` reliance).
- Timestamps `created_at`, `updated_at` as ISO-8601 TEXT (UTC). Soft-delete `deleted_at TEXT NULL`.
- Publication: `status TEXT NOT NULL DEFAULT 'draft'` with `CHECK (status IN ('draft','published','archived'))` where applicable; `published_at TEXT NULL`.
- Slugs `slug TEXT NOT NULL UNIQUE` for public-routable entities; Bahasa Indonesia slugs.
- All user content tables carry `deleted_at`; queries filter `deleted_at IS NULL` by default (repository-level).
- Money: `price_amount INTEGER NULL` (minor units, IDR) + `price_currency TEXT DEFAULT 'IDR'`; never floats. Nullable to support TBD-02 placeholders. `is_custom_quote INTEGER NOT NULL DEFAULT 0`.

## 3. Entities (proposal, matches 7 CMS modules)

### 3.1 services
Stores the 7 confirmed commercial service categories + detail content (owner decision v3 A). Portfolio/case studies are NOT a service category and must never use this table — portfolio items live exclusively in `portfolio_items`.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | ULID/UUID |
| slug | TEXT UNIQUE | One of the 7 commercial slugs (CHECK): `website-company-profile`, `website-development`, `mobile-development`, `custom-systems`, `pos-systems`, `erp`, `wedding-planning` |
| title_id | TEXT | Bahasa Indonesia title |
| category | TEXT | Same 7-valued CHECK as slug (CHECK constraint over the 7 commercial categories) |
| summary_id | TEXT NULL | Short ID summary |
| body_id | TEXT NULL | Full ID content (markdown) |
| icon_key | TEXT NULL | Icon/media ref (storage TBD-13) |
| sort_order | INTEGER DEFAULT 0 | |
| status | TEXT NOT NULL DEFAULT 'draft' | draft/published/archived CHECK; default `draft` (draft-by-default, owner decision v3 F) |
| published_at | TEXT NULL | Set only via explicit review/publishing gate; never by default or seed |
| deleted_at | TEXT NULL | soft-delete: **recommended** |
| created_at / updated_at | TEXT | |

Seed: 7 rows in `draft` with TBD copy; wedding-planning row flagged `category='wedding-planning'`, no software claims. No seed may mark a row `published`.

### 3.2 products
The 3 confirmed catalog items. Readiness per-row remains TBD-01.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| slug | TEXT UNIQUE | `pos-kasir-otomatis`, `pos-pemesanan-penginapan`, `erp-laundry` |
| name_id | TEXT | Verbatim product names |
| tagline_id | TEXT NULL | TBD-10 |
| description_id | TEXT NULL | |
| features_id | TEXT NULL | JSON array of ID strings (or separate table in Phase 01 if relational querying needed) |
| image_url | TEXT NULL | Storage TBD-13 |
| image_key | TEXT NULL | Object-store key if R2 adopted |
| cta_label_id | TEXT NULL | e.g. "Chat WhatsApp" |
| cta_destination | TEXT NULL | WhatsApp deep link template ref / URL; resolved via Settings TBD-03 |
| demo_url | TEXT NULL | Configurable EXTERNAL demo URL or NULL (D-28); never a fabricated link; website never embeds product source; demo states `Coming Soon` / `Live Demo` / `Request Demo` rendered from `readiness` + URL presence |
| readiness | TEXT | Proposed vocab: `available` / `in_development` / `coming_soon`; **no default assignment for any row in this doc**; DB default proposed `in_development` for staging seeds only |
| status | TEXT | draft/published/archived (editorial visibility, orthogonal to readiness) |
| published_at / deleted_at | TEXT NULL | soft-delete: **recommended** |
| created_at / updated_at | TEXT | |

Rule: public catalog query = `status='published' AND deleted_at IS NULL`, rendering `readiness` badge. A product with `readiness='available'` must never be seeded without TBD-01 approval. No row may carry `readiness`/`Live Demo` presentation until its demo URL + access are verified (D-28); missing URLs stay NULL, never fabricated.

### 3.3 portfolio_items
Approved work only (TBD-05). Zero rows published until approval.

| Column | Type | Notes |
|--------|------|-------|
| id, slug, title_id, client_name NULL, summary_id NULL, body_id NULL, cover_image_url NULL, cover_image_key NULL, gallery_json NULL, service_ref NULL, completed_on NULL, sort_order, status, published_at, deleted_at (**recommended**), created_at/updated_at | | Client names/screenshots require consent; unpublished drafts allowed. |

### 3.4 articles
| Column | Type | Notes |
|--------|------|-------|
| id, slug UNIQUE, title_id, excerpt_id NULL, body_id NULL, cover_image_url/key NULL, status, published_at, deleted_at (**recommended**), created_at/updated_at | | ID language content. |

### 3.5 pricing_packages
Values entirely TBD-02. Structure only.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| slug | TEXT UNIQUE | |
| service_ref | TEXT NULL | FK → services.slug (logical; enforce app-side if D1 FK posture restricted) |
| name_id | TEXT | TBD |
| price_amount | INTEGER NULL | Minor units IDR; NULL = "hubungi kami" |
| price_currency | TEXT DEFAULT 'IDR' | |
| is_custom_quote | INTEGER DEFAULT 0 | |
| features_id | TEXT NULL | JSON array |
| limits_id | TEXT NULL | JSON or text |
| cta_destination | TEXT NULL | WhatsApp template ref |
| is_highlighted | INTEGER DEFAULT 0 | |
| sort_order | INTEGER DEFAULT 0 | |
| status | TEXT | draft/published/archived |
| published_at / deleted_at | TEXT NULL | soft-delete: **recommended** |
| created_at / updated_at | TEXT | |

### 3.6 leads (Phase 01 scope APPROVED per D-27 — table NOT created, no implementation, D-25 closed)

Proposed shape for the approved Phase 01 inquiry + inbox scope. This remains a design placeholder only: no `leads` table is created, no inquiry endpoint or inbox is implemented until Phase 01 is authorized. WhatsApp clicks never create rows here.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| name | TEXT | Submitter name (D-27) |
| contact | TEXT | Email supplied (D-27; validated as email in implementation) |
| company | TEXT NULL | Optional company (D-27) |
| need_category | TEXT | Service of interest (D-27) |
| message | TEXT | Project description (D-27) |
| source_page | TEXT NULL | Submitting URL |
| consent_at | TEXT | Timestamp of privacy-consent checkbox |
| state | TEXT DEFAULT 'new' | `new` / `in_progress` / `closed` (operational, not draft/published) |
| handled_by | TEXT NULL | Single Super Admin; no multi-user attribution needed for MVP |
| handled_at | TEXT NULL | |
| deleted_at | TEXT NULL | soft-delete: **recommended** (retention policy governs hard purge; see §5) |
| created_at / updated_at | TEXT | |

Privacy: minimal owner-specified fields; consent required (wording TBD-09 OPEN); retention + purge policy and pre-launch privacy/data-handling docs pending (see §5, `SECURITY.md`, `WORKFLOW.md`).

### 3.7 settings
Singleton site config. No soft-delete; versioning proposed. Strict public/internal separation (owner decision v3, [APPROVED] C):

| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PK | e.g. `whatsapp_number`, `whatsapp_templates`, `site_name`, `seo_defaults` (exact public set pending owner confirmation; no invented business settings or credentials) |
| value_json | TEXT | JSON-encoded value |
| is_public | INTEGER NOT NULL DEFAULT 0 | Proposed classification flag: `1` = eligible for public allowlist projection; `0` = admin/internal only. Allowlist membership is additionally enforced app-side by an explicit schema (never trust this flag alone) |
| updated_at | TEXT | |
| updated_by | TEXT NULL | `super_admin` constant for MVP |

Rules: the public API must project **only explicitly allowlisted keys** through a strict schema (see `API.md`); it must never return whole settings rows or generic `value_json`. Internal configuration, secrets, credentials, session/security settings, and private CMS configuration must never be readable via public access. No secrets in frontend bundles or public env vars (see `SECURITY.md`).

Optional `settings_history(key, value_json, changed_at)` append-only table (proposed).

### 3.8 admin_users (supporting, single-role MVP)
| Column | Type | Notes |
|--------|------|-------|
| id TEXT PK, email TEXT UNIQUE, password_hash TEXT, role TEXT DEFAULT 'super_admin' CHECK (role='super_admin'), is_active INTEGER DEFAULT 1, last_login_at NULL, created_at/updated_at | | Exactly one active row expected for MVP; enforcement app-side + documented ops runbook. Auth details TBD-14. |

## 4. Content lifecycle mapping

| Entity | Lifecycle | Public read predicate |
|--------|-----------|-----------------------|
| services, products, portfolio_items, articles, pricing_packages | draft → published (→ archived) | `status='published' AND deleted_at IS NULL` (+ products render `readiness` badge) |
| leads (approved Phase 01 scope D-27; table not created until authorized) | new → in_progress → closed (+ purge) | Never public; Super Admin only |
| settings | versioned singleton | Public reads project explicit allowlist only; never whole records |

Rationale: draft/published prevents unfinished/TBD content leaking; archived preserves history without hard delete. Leads use an operational state machine instead. **Seed-guard rule (owner decision v3 F):** every editorial table defaults to `status='draft'`; seed scripts insert `draft` only and must not flip rows to `published`. A content item becomes public only through the explicit review/publishing gate (owner-confirmed readiness/prices/consent/contact details, see `WORKFLOW.md` §4); public reads additionally filter `status='published' AND deleted_at IS NULL`. Editorial `status` and product `readiness` are orthogonal.

## 5. Soft-deletion recommendation (per entity)

| Entity | Recommend soft-delete? | Reason |
|--------|------------------------|--------|
| services | Yes (`deleted_at`) | Preserve links/order; recover from admin error |
| products | Yes | Same; readiness history |
| portfolio_items | Yes | Consent withdrawal → hide without data loss |
| articles | Yes | SEO/link preservation |
| pricing_packages | Yes | Quote traceability |
| leads | Yes + scheduled hard purge | Recovery window, then privacy retention purge (retention period TBD-09/TBD-16) |
| settings | No | Singleton; use history table |
| admin_users | Deactivate (`is_active=0`), not delete | Audit trail |

Nothing in this section is implemented. Recommendation to be ratified in Phase 01 schema review.

## 6. Migrations (runner proven by spike; Option A architecture approved — TBD-12 / D-16 / D-17)

- Migrations checked into repo (e.g. `db/migrations/0001_init.sql`), forward-only, reviewed. Proven path: `wrangler d1 migrations apply` (journal-tracked) applied the same SQL cleanly `--local` and `--remote` in the spike (`spike/d1-sqlite/RESULTS.md`); local harness applies the same set on start/test setup. Architecture: hand-rolled thin repository APPROVED (D-17, design — not yet built). Rollback posture: compensating migrations + backup restoration APPROVED (D-21, design — runbook untested).
- Local: apply on dev start / test setup. Prod D1: explicit `wrangler d1 migrations apply` with backup first (backup/rollback per TBD-16, untested).
- Seed data: clearly fake, ID placeholders, `status='draft'`, products `readiness='in_development'`, no real contact data. Seeds must never publish unverified content (seed-guard proven on all spike legs, owner decision v3 F).

## 7. Open questions → TBD links

- Adapter architecture → TBD-12: **Option A APPROVED (D-17)** — hand-rolled thin async repository + env adapters, no ORM for MVP (design; implementation pending). Rollback → compensating migrations + backup restoration APPROVED (D-21, design; runbook untested). Media fields depend on TBD-13. Leads table/retention → Phase 01 scope APPROVED (D-27; table not created until authorized; consent/privacy docs TBD-09 OPEN). Sessions store → D1 APPROVED (D-18, design; behavior unvalidated). Admin credential bootstrap/recovery → TBD-14 (documented in `SECURITY.md`, not implemented). Settings public allowlist → TBD-03 (public CTA data) + TBD-14; exact public field set pending owner confirmation. Backup/restore → Option B + RPO/RTO targets APPROVED (D-19/D-20, targets — not guarantees; nothing implemented or rehearsed). See `docs/PERSISTENCE-DECISION.md`.
