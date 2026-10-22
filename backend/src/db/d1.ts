// D1Adapter — Cloudflare Workers production path (thin env.DB wrapper).
// Proven SQL parity via spike; prod load/behavior validated pre-prod only.
// transaction(): D1 has no interactive transactions over the binding. This
// adapter fails loudly rather than pretending a callback is atomic. Multi-step
// invariants MUST use UNIQUE guards (e.g. one_active_admin) until an explicit
// atomic-batch contract is approved and proven on real D1.
import type { D1Database, DbPort, RunResult } from './types.ts';

export class D1Adapter implements DbPort {
  constructor(private d1: D1Database) {}

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.d1.prepare(sql).bind(...params).all<T>();
    return res.results ?? [];
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const row = await this.d1.prepare(sql).bind(...params).first<T>();
    return row ?? null;
  }

  async run(sql: string, params: unknown[] = []): Promise<RunResult> {
    const res = await this.d1.prepare(sql).bind(...params).run();
    const changes = res && typeof res === 'object' && 'meta' in res
      ? Number((res.meta as { changes?: number } | undefined)?.changes ?? 0)
      : 0;
    return { changes };
  }

  async execScript(sql: string): Promise<void> {
    // D1 has no multi-statement exec; split on ';' like wrangler migrations.
    const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
    await this.d1.batch(statements.map((s) => this.d1.prepare(s)));
  }

  async transaction<T>(_fn: () => Promise<T>): Promise<T> {
    throw new Error('D1Adapter.transaction() is unsupported: D1 has no interactive transactions. Use a single atomic statement or an approved batch/UNIQUE invariant.');
  }
}
