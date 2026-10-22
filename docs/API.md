# API Contracts — PipleSolution (Phase 00 Discovery v3)

> Status: CONTRACT PROPOSAL ONLY. No endpoints implemented. No server running. Persistence spike executed separately (`spike/d1-sqlite/RESULTS.md`). Inquiry/Leads contracts are approved Phase 01 scope (D-27) and unimplemented (D-25 closed).
> Last updated: 2026-10-09 — v3 revision.

## 1. Principles

- Frontend and backend are **separate applications**; all data crosses this HTTP boundary.
- Base URL configurable: local `http://localhost:8787/api/v1`, prod `https://api.<domain>/api/v1` (domain TBD-06, topology TBD-11).
- Language: response payloads carry Bahasa Indonesia content fields (`*_id`); error messages localized ID with stable machine-readable `code`.
- Validation: **Zod** schemas at the boundary; DB constraints second. Validation failures → `400` with field-level details, never stack traces.
- Auth: public reads unauthenticated (published only); all `/admin/*` mutations require Super Admin session (TBD-14). Single `super_admin` role for MVP.
- Versioning: `/api/v1` prefix; breaking changes require new version + changelog.

## 2. Conventions (proposed)

- JSON; `Content-Type: application/json; charset=utf-8`.
- Envelope: `{ "data": ..., "meta": { "page":..., "per_page":... } }` for lists; `{ "data": ... }` for single; errors `{ "error": { "code": "SNAKE_CODE", "message_id": "...", "fields": {...} } }`.
- Pagination: `?page=1&per_page=20` (max 100). Ordering: `?sort=sort_order&order=asc`.
- Slugs identify public resources (`/services/:slug`, `/products/:slug`, etc.). Service slugs are constrained to the 7 commercial categories (owner decision v3 A); portfolio items use the separate `/portfolio` resource, never `/services`.
- Readiness vocab (products): `available | in_development | coming_soon` — proposed, never auto-assigned (TBD-01); editorial `status` and `readiness` are distinct fields.
- Publication statuses: `draft | published | archived` (leads use `new | in_progress | closed`).

## 3. Public endpoints (proposed)

All return only `published` + non-deleted rows. No auth.

```
GET  /api/v1/services                    → list published services (7 commercial categories max, owner decision v3 A)
GET  /api/v1/services/:slug              → service detail (slug must be one of the 7; portfolio slugs rejected here)
GET  /api/v1/products                    → list published products (?readiness= filter)
GET  /api/v1/products/:slug              → product detail incl. readiness + cta_destination + demo_url (configurable external URL or null; never a fabricated link; D-28)
GET  /api/v1/portfolio                   → list published portfolio, standalone section (empty until TBD-05)
GET  /api/v1/portfolio/:slug             → case-study detail
GET  /api/v1/articles                    → list published articles
GET  /api/v1/articles/:slug              → article detail
GET  /api/v1/pricing                     → list published pricing packages (?service= commercial slug); amounts may be null (TBD-02)
GET  /api/v1/settings/public             → EXPLICIT ALLOWLIST ONLY (owner decision v3 C; see §3.2) — never whole records, never secrets
```

Notes:

- `whatsapp_number` exposed here only because it is public CTA data (TBD-03). No secrets in this payload.
- Pricing `price_amount: null` + `is_custom_quote: true` renders "Hubungi via WhatsApp" (ID copy TBD-10).

### 3.1 Public settings allowlist (owner decision v3, [APPROVED] C; PROPOSED contract, not implemented)

- `GET /api/v1/settings/public` builds its response **from an explicit allowlist (response projection)** — the server constructs the payload only from allowlisted public fields, never from the entire settings record or generic settings JSON. Stored internal keys are never included in the response.
- Proposed allowlist (exact public field set pending owner confirmation; no invented business settings or credentials): `{ whatsapp_number?, site_name, seo_defaults }`, where `whatsapp_number` is included only because it is public CTA data (TBD-03).
- Internal configuration, secrets, credentials, session settings, security controls, and private CMS configuration must **never** be exposed by public endpoints, placed in frontend bundles, or read from public environment variables. Admin settings endpoints (§4) require authenticated Super Admin authorization.
- Input validation (distinct from response projection): narrow Zod schema per key (e.g. E.164-like `whatsapp_number`), `.strict()` — **unknown input keys are rejected** with a validation error; safe defaults for missing optional fields. Planned tests (see `TESTING.md`): (a) non-allowlisted stored fields (secret, session, internal keys) never appear in public responses under any query shape; (b) unknown input keys are rejected.

### 3.2 Inquiry submission — Phase 01 scope APPROVED (D-27; NOT implemented, D-25 closed)

```
POST /api/v1/inquiries                                          → PROPOSED Phase 01 scope; does not exist until implemented
Body (proposed Zod, §5): { name, email, company? (optional), service (enum: 7 commercial service slugs + 3 product slugs), description (10–2000 chars), consent, website? (honeypot) }
→ 201 { data: { id, state: "new" } }  |  400 validation  |  429 rate-limited
```

- No `GET` for inquiries on the public namespace. No WhatsApp-click ingestion endpoint exists by design. No automated email or WhatsApp integration in Phase 01.
- Spam/privacy controls: rate limit, honeypot, consent timestamp, minimal retention — see `SECURITY.md` / `WORKFLOW.md`. Consent wording + pre-launch privacy/retention/data-handling docs remain TBD-09 (OPEN).

## 4. Admin endpoints (proposed, Super Admin only — NOT implemented)

There is NO public admin registration endpoint by design. Initial access uses a single-use bootstrap procedure that works only when zero active admins exist and is otherwise disabled (see `SECURITY.md` lifecycle; placeholders only, no hardcoded secrets; all mechanisms planned and unverified until implemented and tested).

```
POST /api/v1/admin/auth/login    { email, password } → session cookie (TBD-14; rate-limited + lockout)
POST /api/v1/admin/auth/logout   → clears session
GET  /api/v1/admin/auth/me       → { email, role: "super_admin" }
POST /api/v1/admin/auth/bootstrap { email, password, bootstrap_token: "[PROVISIONED OUT OF BAND]" } → PROPOSED single-use init; 200 on first use when no admin exists, 403 with safe non-enumerating error thereafter; rate-limited; single-use enforced atomically so concurrent requests cannot create a second admin. Bootstrap secret in request body only — never in URLs, frontend bundles, public configuration, or logs. Production requires a high-entropy, securely provisioned, out-of-band token (or equally strong owner-authorized mechanism). Token loss vs account recovery are separate procedures (see SECURITY.md).

CRUD (each of services, products, portfolio, articles, pricing):
GET    /api/v1/admin/{module}            (incl. drafts; ?status=&q=&page=)
POST   /api/v1/admin/{module}            (Zod create; starts as draft unless explicitly published)
GET    /api/v1/admin/{module}/:id
PATCH  /api/v1/admin/{module}/:id        (partial; publishing sets published_at)
DELETE /api/v1/admin/{module}/:id        → soft-delete (sets deleted_at), per DATABASE.md

Leads (Phase 01 scope APPROVED per D-27 — NOT implemented until authorized under D-25):
GET    /api/v1/admin/leads (?state=)
PATCH  /api/v1/admin/leads/:id   { state: in_progress|closed }
DELETE /api/v1/admin/leads/:id   → soft-delete; hard purge by retention job

Settings (Super Admin auth required; allowlist-enforced):
GET    /api/v1/admin/settings             → full config (auth-gated; never cached publicly)
PUT    /api/v1/admin/settings             { key, value_json } (versioned; narrow Zod per key, esp. whatsapp_number E.164-like; unknown keys rejected)
```

Auth/session/cookie/CSRF/rate-limit specifics are TBD-14; this doc fixes the route shape, not the mechanism.

## 5. Zod sketch (illustrative, not implemented)

```ts
// Proposed shared schemas (packages/shared or mirrored with contract tests)
const slug = z.string().min(2).max(120).regex(/^[a-z0-9-]+$/);
const serviceSlug = z.enum(["website-company-profile","website-development","mobile-development","custom-systems","pos-systems","erp","wedding-planning"]); // 7 commercial only, v3 A
const publishStatus = z.enum(["draft", "published", "archived"]);
const readiness = z.enum(["available", "in_development", "coming_soon"]);
// Explicit public-settings allowlist: strict — unknown keys rejected, never passthrough (v3 C)
const publicSettings = z.strictObject({
  whatsapp_number: z.string().regex(/^\+[1-9][0-9]{7,17}$/).optional(),
  site_name: z.string().min(2).max(80),
  seo_defaults: z.object({ title_suffix: z.string().max(80), description: z.string().max(200) }).partial().optional(),
});
const inquiry = z.object({ // PROPOSED Phase 01 scope D-27; not implemented
  name: z.string().min(2).max(100),
  contact: z.string().min(5).max(160), // email per D-27 (validated as email in implementation)
  need_category: z.string().min(2).max(80), // service of interest per D-27
  company: z.string().max(120).optional(), // optional company per D-27
  message: z.string().min(10).max(2000), // project description per D-27
  consent: z.literal(true), // wording TBD-09 OPEN
  website: z.string().max(0).optional(), // honeypot
});
```

## 6. Errors (proposed codes)

`VALIDATION_ERROR(400) | UNAUTHENTICATED(401) | FORBIDDEN(403) | NOT_FOUND(404) | CONFLICT(409) | RATE_LIMITED(429) | INTERNAL_ERROR(500)`.

## 7. Traceability

- Entities/fields mirror `DATABASE.md`; lifecycles mirror `WORKFLOW.md`; auth hardening in `SECURITY.md`; TBD-01/02/03/09 govern catalog/pricing/CTA/leads behavior.
- No mock server or implementation accompanies this proposal in Phase 00.
