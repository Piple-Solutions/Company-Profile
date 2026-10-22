# Security — PipleSolution (Phase 00 Discovery v3)

> Status: REQUIREMENTS + LIFECYCLE PLAN ONLY. No auth implemented, no credentials created, no spike executed. Choices depending on unverified platform capabilities are marked pending verification.
> Last updated: 2026-10-09 — v3 revision (allowlist C; bootstrap/recovery D; inquiry pending E; draft-by-default F).

## 1. Scope

- Single Super Admin role for all 7 CMS modules (Services = 7 commercial only; Portfolio separate resource). Public site is read-only (plus an inquiry POST in approved Phase 01 scope D-27 — designed only, not implemented, D-25 closed).
- Lead/inquiry data (if ever enabled) is personal data and the highest-sensitivity store alongside admin credentials.

## 2. Super Admin bootstrap & recovery lifecycle (owner decision v3, [APPROVED] D; DOCUMENTED ONLY — not implemented)

No credentials, passwords, API keys, session secrets, or other secrets appear in this documentation; examples use clearly marked placeholders such as `[PROVISIONED OUT OF BAND]`. If a choice below depends on an unverified platform capability, it is marked pending verification rather than claimed as validated.

1. **Initial account creation/bootstrap:** proposed single-use bootstrap (e.g. `POST /api/v1/admin/auth/bootstrap`) that succeeds only when zero active admins exist; creates exactly one `super_admin` row. Production bootstrap requires a high-entropy, securely provisioned, out-of-band bootstrap token (or an equally strong owner-authorized mechanism) — planned and unverified until implemented and tested. The bootstrap secret is transmitted in the request body only and must never appear in URLs, frontend bundles, public configuration, or logs (see also `API.md` §4). Local-dev may use a documented CLI/env-seeded bootstrap; production bootstrap requires owner authorization (TBD-14).
2. **Configuration + secret handling:** secrets (bootstrap token, session secret, DB/admin credentials) supplied exclusively via server-side env bindings or the ops runbook — never in docs, frontend bundles, public env vars, or the settings table's public surface.
3. **Password storage + verification:** server-side hashing with a memory-hard function (argon2 proposed, bcrypt alternative — pending final verification); constant-time verification; minimum-length + strength policy documented in the ops runbook.
4. **Login + bootstrap protection:** per-IP and per-account rate limiting + lockout with `429` backoff on `/login`, on the bootstrap endpoint, and (if ever enabled) on `POST /inquiries`; no user-enumeration oracle (uniform responses/timing where feasible). Bootstrap failures return safe, non-enumerating errors (same response whether disabled, rate-limited, or token-invalid). Single-use is enforced atomically server-side so concurrent bootstrap requests cannot create more than one admin (planned; concurrency behavior unverified until implemented and tested).
5. **Session + cookie security:** opaque server-side sessions proposed (pending verification against Workers/D1 session-store behavior in the spike); cookies `HttpOnly; Secure; SameSite=Lax`; short idle + absolute timeouts; CSRF tokens + strict origin checks on all state-changing routes. Session store: **D1 APPROVED (D-18)** — design only; session behavior under load, expiry/GC semantics, and integration remain unvalidated until implemented and tested.
6. **Password/administrator recovery procedure (distinct from bootstrap-token loss):** owner-authorized out-of-band recovery when an admin exists but access is lost (documented runbook: verify requester identity → rotate via secure channel → force session invalidation + password change on next login). No self-service public reset in MVP. **Bootstrap-token loss** is handled separately: a lost/unused bootstrap token is revoked and re-issued only through owner authorization (old token invalidated, single-use preserved); token re-issuance is possible only while zero active admins exist and is itself rate-limited and audited. Both procedures are planned and unverified until implemented and tested.
7. **Recovery authorization + auditability:** every bootstrap/recovery event requires recorded owner authorization and writes an append-only admin audit entry (who authorized, when, which account); audit log readable only by Super Admin session.
8. **No public admin registration:** no self-registration endpoint exists by design; any registration-shaped request returns `403` without revealing whether an admin exists.
9. **Empty vs already-bootstrapped behavior:** zero admins → single-use bootstrap available (rate-limited, single-use token where applicable); ≥1 admin → bootstrap path disabled (`403`, no enumeration detail); deactivated (`is_active=0`) rather than deleted accounts.
10. **Operational documentation:** local-dev bootstrap (disposable credentials, documented reset) vs production recovery (owner-authorized, audited) runbooks; both are planning artifacts here — see `DEPLOYMENT.md` for environment handling. Nothing in this section is implemented or tested.

## 3. Public vs internal settings separation (owner decision v3, [APPROVED] C; DOCUMENTED ONLY)

- Public responses are **constructed from an explicit allowlist (response projection)**: the server builds the public payload only from allowlisted fields (`API.md` §3.1; e.g. proposed `{ whatsapp_number?, site_name, seo_defaults }`, exact set pending owner confirmation). Stored internal keys are never included in the response — this is projection at response-build time, not filtering of a whole record. Whole-record or generic-JSON settings exposure is forbidden.
- Internal configuration, secrets, credentials, session settings, security controls, and private CMS configuration are **never** returned by public endpoints, embedded in frontend bundles, or stored in public environment variables. Admin settings reads/writes require authenticated Super Admin sessions.
- Input validation (distinct from projection): narrow per-key Zod schemas (`.strict()`), safe defaults for missing optional public fields; **unknown input keys are rejected** with a validation error. Planned tests prove (a) non-allowlisted stored fields never appear in any public response shape and (b) unknown input keys are rejected (see `TESTING.md`).

## 4. Inquiry data protection (Phase 01 scope APPROVED per D-27; pre-launch docs required; not implemented, D-25 closed)

- **Privacy:** ID-language notice + explicit consent checkbox (`consent_at` stored; wording TBD-09 OPEN); owner-specified minimal fields (name, email, optional company, service of interest, project description); admin-only reads; no trackers on form page until TBD-15 resolved; retention window + scheduled hard purge (period pending owner). Privacy, retention, and data-handling requirements documented before public launch.
- **Spam/abuse:** honeypot, rate limits, repeated-submission protection, length caps, no uploads in MVP; reject without oracle (uniform error timing where feasible). No automated email or WhatsApp integration in Phase 01.
- **Access control:** session-gated `/admin/leads` (view details, update status); no public IDs enumerable; no shareable links; no public inbox access.

## 5. Application hardening (Phase 01 requirements, not implemented)

- Zod at boundary + DB CHECKs (7-valued service category; `draft/published/archived`; `readiness` vocab); parameterized queries only (via adapter pending spike TBD-12); output escaping; security headers (CSP, `frame-ancestors`, `Referrer-Policy`, HSTS on prod domain once TBD-06 fixed).
- Secrets only in server env bindings; allowlisted public settings only (no session/security/internal keys in any public payload or bundle).
- Draft-by-default publishing (owner decision v3 F, reaffirmed D-31): public reads only eligible published rows; seed-guard + unpublished-leak tests planned (see `TESTING.md`).
- Product demo links (D-28): external URLs only, never embedded source; per-product demo security assessment (dummy data, access restrictions, production-data isolation) required before enabling public demo access; no `Live Demo` label until URL + access verified.
- Dependency hygiene (lockfile, audit) + Vitest/Playwright security smoke (auth gate, bootstrap single-use, allowlist, validation, rate-limit) — planned, none executed.

## 6. Operational security (TBD-16; design approved D-19/D-20, nothing implemented or rehearsed)

- Backup strategy APPROVED (D-19, Option B — design only): scheduled backups, separate backup copies, documented restore procedures, recovery rehearsals. RPO ≤ 24h / RTO ≤ 8h APPROVED as TARGETS (D-20 — not guarantees). No backup exists; no restore rehearsed; nothing validated.
- D1 backup/export before migrations; least-privilege Cloudflare tokens; audit of admin actions (proposed append-only log in Phase 01).

## 7. What Phase 00 (+ v3 revision) did NOT do

- No credentials created, no sessions/cookies issued, no bootstrap/recovery executed, no allowlist implemented, no penetration or config test executed, no spike run. All of §§2–6 is plan text awaiting approval and (for TBD-12/TBD-14 items) spike/verification evidence.
