# Workflow — PipleSolution (Phase 00 Discovery v3)

> Status: PROPOSED workflows. Nothing here is implemented; diagrams distinguish proposed from implemented behavior. Inquiry/Leads flows are approved Phase 01 scope (D-27) and unimplemented (D-25 closed).
> Last updated: 2026-10-09 — v3 revision.

Legend: `[PROPOSED]` = designed, not built. `[IMPLEMENTED]` = built (nothing in Phase 00 carries this tag).

## 1. Content lifecycle (all editorial modules) [PROPOSED]

Modules: Services (7 commercial categories only — portfolio excluded, owner decision v3 A), Products, Portfolio (standalone section/resource), Articles, Pricing. Single actor: Super Admin (no Editor role for MVP).

```
[DRAFT] ──(publish)──▶ [PUBLISHED] ──(archive)──▶ [ARCHIVED]
  ▲                       │                          │
  └──(unpublish/revert)───┘                          └──(re-publish)──▶ [PUBLISHED]
Any state ──(soft delete)──▶ [DELETED (deleted_at set, hidden everywhere)]
```

Rules (proposed):

- New/edited content starts as `draft` (DB default `draft`; seeds `draft` only). Publishing sets `published_at` and only via the explicit review/publishing gate (§4).
- Public API/site reads **only** eligible `published` + `deleted_at IS NULL` rows. Seeds or defaults never publish content by themselves.
- Products have an orthogonal `readiness` badge (`available / in_development / coming_soon`, TBD-01) that does not override editorial `status`: a product is publicly visible only when `status='published'` AND its readiness has been owner-confirmed; unconfirmed readiness stays non-public even if `status` were flipped.
- `archived` hides from public but keeps admin history. Soft-delete is recoverable; hard purge only by explicit retention ops.

## 2. Lead handling — inquiry scope APPROVED for Phase 01 (D-27; implementation gated by D-25)

The form + inbox below are approved scope, not built artifacts. WhatsApp remains primary regardless.

### 2a. WhatsApp CTA path [PROPOSED] — PRIMARY under either option, no inbox side effects

```
Visitor clicks WhatsApp CTA (any page)
  → wa.me link built from Settings.whatsapp_number + template (TBD-03)
  → opens WhatsApp client (external)
  → conversation lives in WhatsApp Business; NOTHING is written to CMS
```

Explicit non-behavior: button clicks do **not** create lead records, do not reveal visitor identity to the CMS, and must not be described as doing so.

### 2b. Website inquiry form path [Phase 01 scope APPROVED per D-27; NOT implemented, D-25 closed]

```
Visitor submits inquiry form (/kontak) [APPROVED scope — built only after D-25 authorization]
  → Zod validation (name, email, optional company, service of interest, project description) + honeypot + rate limit + consent checkbox (ID wording TBD-09)
  → POST /api/v1/inquiries → DB.leads (state=new, consent_at set)
  → Super Admin triages in CMS: new → in_progress → closed (view details, update status)
  → Follow-up happens OUT OF BAND via WhatsApp/email (no automated email/WhatsApp integration in Phase 01)
  → Retention purge per policy (schedule TBD)
```

- Scope decided (D-27, supersedes the earlier undecided posture — history preserved): form + inbox + Leads API/table plus all controls below. No public inbox access, no unauthorized lead reads.
- Required controls if approved (see also `SECURITY.md`):
  - **Privacy:** minimal fields, ID privacy notice + explicit consent, admin-only access, no public listing, retention window + purge.
  - **Spam:** honeypot, per-IP rate limit, message length caps, no file uploads in MVP.
  - **Retention:** soft-delete on handle + scheduled hard purge (period pending owner decision).
  - **Access control:** Super Admin session only; no shareable lead links.

## 3. Admin operations [PROPOSED]

- Login → manage 7 modules (Services = 7 commercial only; Portfolio separate) → publish/unpublish via gate (§4) → manage settings through allowlisted public projection + auth-gated admin reads (no whole-record public exposure) → triage leads in the approved Phase 01 inbox scope (D-27; built only after D-25 authorization).
- One Super Admin; no delegation/approval chain. Super Admin lifecycle (owner decision v3 D; details in `SECURITY.md`, documented only): single-use bootstrap when zero active admins exist (disabled thereafter; no public registration) → credential provisioning + secret handling via out-of-band ops runbook → login with rate limiting/lockout → session/cookie + CSRF protections → owner-authorized password/administrator recovery with audit log. Safe empty-state behavior (bootstrap available) vs already-bootstrapped behavior (bootstrap endpoint returns 403, no enumeration detail). Local-dev and production recovery procedures are documented ops runbook items (TBD-14), not implemented here.

## 4. Review/publishing gate (proposed checklist before any publish; owner decision v3 F)

No unverified business information becomes public without passing this gate, regardless of database defaults or seed content:

- Copy approved (TBD-10), portfolio consent verified — real screenshots/client names only (TBD-05), product readiness individually confirmed with evidence (TBD-01; editorial `status` vs `readiness` both green), prices/packages confirmed (TBD-02), WhatsApp number verified by test message (TBD-03), business contact/profile claims confirmed (TBD-07), no invented testimonials/metrics/outcomes, settings changes within allowlist (public) or auth-gated (admin).
- Planned tests (see `TESTING.md`): drafts/archived/soft-deleted never leak publicly; seed-guard (fresh seed exposes zero public rows); readiness-unconfirmed products hidden; non-allowlisted settings never leak.

## 5. Phase gating

- Phase 00 = documentation and planning only. A dedicated database technical spike (acceptance criteria in `ARCHITECTURE.md` §3.4, TBD-12) is the prerequisite for finalizing backend persistence decisions. Full Phase 01 implementation must not begin until required planning approval and technical prerequisites are satisfied.

## 6. What is NOT implemented

- No CMS UI, no form, no inbox, no automation, no notifications exist. All flows above are design targets for Phase 01+.
