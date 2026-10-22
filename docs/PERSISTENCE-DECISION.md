# Persistence Architecture Finalization — Decision Package (PROPOSED)

> Status: PROPOSED by Agent 1, 2026-10-09; owner decisions D-17–D-25 RECORDED 2026-10-09 (explicit approval — see `docs/DECISIONS.md`). Approved = design only; implementation and technical validation remain pending/unverified until evidence exists. TBD IDs preserved; TBD-12 stays OPEN pending implementation/validation. Phase 01 is NOT approved to start (D-25).
> Evidence: `spike/d1-sqlite/RESULTS.md` (all three legs), verified file by
> file for this package; discrepancies found are listed in §2.

## 1. Spike acceptance status (evidence-based)

All six `ARCHITECTURE.md` §3.4 criteria are PASS on all three legs:

| # | Criterion | SQLite-local | Local-D1 sim | Remote D1 (`piple-spike-d1`) |
|---|-----------|--------------|--------------|-------------------------------|
| 1 | Init + migrations | PASS (fresh file, 3 tables) | PASS (`apply --local` ✅, 4 cmds) | PASS (`apply --remote` ✅, 4 cmds) |
| 2 | CRUD | PASS (17/17 harness) | PASS (binding API) | PASS (seed/update/soft-delete/restore/publish) |
| 3 | Schema/types | PASS (TEXT PKs, ISO TEXT, CHECKs, nullable price) | PASS (same SQL) | PASS (identical round-trips) |
| 4 | Constraints/errors | PASS (UNIQUE×2, CHECK×3, NOT NULL) | PASS (message-only errors) | PASS (UNIQUE + CHECK rejected, code 7500, atomic, exit 1) |
| 5 | Reproducibility | PASS (runnable script, exit 0) | PASS (re-runnable commands) | PASS (10 logged commands) |
| 6 | Difference record | PASS | PASS | PASS (`RESULTS.md` §C + deltas) |

Commands run remotely: 1 create + 1 migrate + 8 `d1 execute` probes, all on
`piple-spike-d1` only, `[SEED]`-marked disposable data. No Worker/website
deploy; no DNS/billing/secret/production change; spike DB retained (cleanup
needs separate approval). One self-inflicted artifact recorded: PowerShell
quoting stored literal backslashes in 2 remote `value_json` values — key
filtering unaffected.

## 2. Discrepancies found during verification (all documentation-only, fixed by addenda)

The spike was designed in v3 (written as "NOT executed") and executed later,
so several statements are now stale. None affect evidence; each is corrected
by a dated addendum, history preserved:

1. `ARCHITECTURE.md` §3.2 ("spike documented only and NOT executed; no spike
   code/deps/migrations/Cloudflare resources created") — superseded:
   `spike/` harness + `piple-spike-d1` exist; see addendum.
2. `DATABASE.md` §6 ("Spike status: designed only, NOT executed") —
   superseded by remote `apply --remote ✅`; migration path proven, library
   choice still pending.
3. `TESTING.md` §4(v3) ("spike … NOT executed") — historical audit record
   kept; new spike-executed bullet added.
4. `DEPLOYMENT.md` header/§1/§5 ("No spike executed", "no D1 created", "No
   Cloudflare resources … created in Phase 00") — rescoped to PRODUCTION
   (still true); spike DB documented as the single exception.
5. `DECISIONS.md` D-11 ("NOT executed — no code, deps, migrations, or
   Cloudflare resources created in this revision") — addendum with execution
   evidence; prerequisite satisfied, finalization still pending approval.
6. `RESULTS.md` pre-remote qualifiers ("TBD-12 OPEN", "remote … unverified",
   "partial") — updated to reflect §C; TBD-12 itself stays open pending
   approval (see §6).

## 3. Proposed final persistence architecture (minimal, evidence-backed)

1. **One SQL migration source** (`db/migrations/`, forward-only
   `NNNN_name.sql`, same file applied to SQLite and D1). Proven: identical
   `0001_init.sql` applied cleanly on all three legs. Portable subset only:
   `CREATE TABLE` + `CHECK`/`UNIQUE`/`NOT NULL`/`DEFAULT`; TEXT PKs
   (app-generated ULID/UUID); ISO-8601 TEXT timestamps; no extensions,
   procedures, or driver pragmas.
2. **Repository/port interface with environment adapters, async throughout.**
   Proven pattern: raw prepared statements behind a port (`DbPort`-style);
   `node:sqlite`-equivalent locally, thin `env.DB` wrapper
   (`prepare/bind/all/run/first`, `batch`) on Workers. Evidence forces
   async-only data access (D1 binding has no sync API; sync SQLite code does
   NOT transfer). Business logic depends on the port; adapter chosen by
   environment injection, never by in-handler conditionals.
3. **Forward-only migrations with journal tracking.** Proven runner:
   `wrangler d1 migrations apply` (journal-tracked, `--local` and `--remote`
   both ✅). Local dev/test harness applies the same set on start; production
   applies explicitly with backup first; never auto-migrate on the request
   path. No down-migrations (see §5 rollback).
4. **Environment configuration.** Local: gitignored SQLite file, no cloud
   credentials. Preview/staging/production: separate D1 databases with
   per-environment `database_id` bound via `env.DB`. Production D1 is a NEW
   dedicated database — never `piple-spike-d1`, never any existing DB.
5. **Seed/test isolation.** `[SEED]`-marked fake data only; seeds insert
   `draft`/`in_development` exclusively (seed-guard proven: fresh seed exposes
   0 public rows on all legs); per-env seed scripts; unit tests use ephemeral
   SQLite and never touch D1; production is never seeded from dev scripts.
6. **Difference handling without pretending parity.** Normalization layer at
   the adapter boundary: (a) async everywhere; (b) constraint failures mapped
   by message core (`UNIQUE … SQLITE_CONSTRAINT_UNIQUE`,
   `CHECK … SQLITE_CONSTRAINT_CHECK`) to API 4xx — wrappers differ by env
   (thrown `code` locally, `D1_ERROR` message on binding, `APIError` 7500
   over REST) and must all be covered by contract tests; (c) message-only
   error propagation (no stack leaks — proven by worker returning
   message-only JSON); (d) TEXT-only portable types; NULL semantics verified
   identical for the spike shape.

Why this fits: it is the smallest surface the evidence actually proves —
raw SQL + thin adapters, no ORM magic to diverge between runtimes — and it
directly enforces the project's hard rules (draft-by-default, allowlist
projection, single Super Admin, WhatsApp-primary CTAs unaffected by storage).

## 4. Explicit non-claims (not proven by the spike)

- Production readiness, load/throughput, or latency behavior.
- Concurrency safety (concurrent writes, bootstrap single-use atomicity).
- Backup/restore, export/time-travel, rollback execution.
- Session storage on D1 (auth/session behavior).
- Any ORM/library behavior (Drizzle/Kysely were evaluated on paper only).
- FK enforcement posture beyond the spike shape; cross-region read-your-writes.

## 5. Remaining decisions (each: status/ref → recommendation → alternatives → blocking scope → owner input)

1. **Adapter/library choice** (TBD-12). Status: pattern proven with raw SQL;
   library unproven. Recommended: hand-rolled thin repository (zero-dep,
   smallest divergence surface; matches spike evidence). Alternatives:
   Drizzle (migrations + types, heavier, needs its own D1 spike) / Kysely
   (query builder, same caveat). Blocks: Phase 01 persistence
    implementation (planning may proceed). Owner choice needed: YES —
    lock before backend persistence code lands (or delegate explicitly to
    Agent 2 technical sign-off).
    Owner decision RECORDED 2026-10-09: **Option A APPROVED (D-17)** —
    hand-rolled thin repository, no ORM for MVP. Implementation +
    library-free operation still to be built and validated.
2. **Session storage implications** (TBD-14). Status: lifecycle documented,
   storage backend undecided. Recommended: decide during auth design; D1
   sessions table is compatible with the proven TEXT-PK pattern but unverified
   under load — do not assume. Alternative: KV with TTL. Blocks: production
    readiness (not Phase 01 planning). Owner input: credential provisioning
    ops only.
    Owner decision RECORDED 2026-10-09: **Option A (D1) APPROVED (D-18)** —
    design only; session behavior, expiry/GC semantics, and integration
    remain unvalidated until implemented and tested.
3. **Backup/recovery strategy** (TBD-16). Status: undefined. Recommended:
   pre-migration D1 export + documented RTO/RPO + restore rehearsal on
   staging. Alternative: time-travel only (weaker audit trail). Blocks:
    production readiness + any production migration. Owner input: YES
    (RTO/RPO + who authorizes restore).
    Owner decision RECORDED 2026-10-09: **Option B APPROVED (D-19)** with
    **RPO ≤ 24h / RTO ≤ 8h targets APPROVED (D-20, targets — not guarantees)**.
    No backup exists; no restore rehearsed; nothing validated.
4. **Migration rollback/recovery** (TBD-16/TBD-12). Status: forward-only
   agreed in principle, recovery untested. Recommended: compensating
    migrations only (no down-migrations); staging rehearsal before prod;
    failed-migration runbook. Alternative: down-migration scripts (rejected:
    unproven on D1, risky). Blocks: production migrations. Owner input: no
    (technical; Agent 2).
    Owner decision RECORDED 2026-10-09: **Option C APPROVED (D-21)** —
    design only; runbook untested.
5. **Concurrent-write behavior + tests** (TBD-12/TBD-14). Status: unverified.
   Recommended: contract tests for concurrent bootstrap (single admin wins),
    double-publish idempotency, and write-conflict mapping before production.
    Blocks: production readiness. Owner input: no (technical).
    Owner decision RECORDED 2026-10-09: **Option B scope APPROVED (D-22)** —
    no such tests written or run.
6. **Production config/boundaries** (TBD-11/TBD-16). Status: topology
   undecided; spike DB must never become prod. Recommended: new dedicated
   prod D1 + staging D1, per-env IDs, least-privilege tokens, no prod writes
    from dev/preview. Blocks: production deployment. Owner input: YES
    (account/plan/domain decisions).
    Owner decision RECORDED 2026-10-09: **Option A APPROVED (D-23)** —
    separate D1 for dev/staging/prod; no such databases exist. Domain
    direction APPROVED separately (D-24): business-owned domain, exact
    domain pending identification — no DNS changes authorized.

## 6. Recommendation on Phase 01 approval — SUPERSEDED by owner decision D-25

The conditional-approval recommendation below is retained for history; the
owner has decided otherwise (Option C).
Historical text: Phase 01 may be separately approved for planning and for
non-persistence tracks. Persistence implementation must additionally wait
for sign-off + library lock. Production stays blocked as listed. No approval
was invented in this package.
Owner decision RECORDED 2026-10-09: **Option C APPROVED (D-25) — Phase 01
implementation is NOT approved to start.** Wait until all required technical
and architectural decisions are finalized.

## 7. Traceability

- Criteria: `ARCHITECTURE.md` §3.4. Evidence: `spike/d1-sqlite/RESULTS.md`.
- Registers: TBD-12 (technical content proposed-final here, still OPEN),
  TBD-14 (sessions), TBD-16 (backup/rollback), TBD-11 (topology),
  TBD-03 (public settings data), TBD-09 (leads — untouched by spike).
- No TBD renumbered, replaced, or silently resolved.
