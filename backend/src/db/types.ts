// Database port (Option A, D-17): async interface, env-specific adapters.
// Raw prepared statements only — no ORM. Sync SQLite code must NOT leak here.
export interface RunResult {
  changes: number;
}

export interface DbPort {
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<RunResult>;
  execScript(sql: string): Promise<void>;
  /** SQLite: BEGIN IMMEDIATE transaction. D1: unsupported and MUST throw;
   *  multi-step invariants use conditional writes / UNIQUE guards (e.g.
   *  one_active_admin) until an explicit atomic-batch port is approved. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

// Minimal structural D1 binding surface (no @cloudflare/workers-types dep).
export interface D1Prepared {
  bind(...params: unknown[]): D1Prepared;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
}

export interface D1Database {
  prepare(sql: string): D1Prepared;
  batch(statements: D1Prepared[]): Promise<unknown[]>;
}

export function uid(prefix: string): string {
  return `${prefix}_${globalThis.crypto.randomUUID()}`;
}

export function nowIso(date = new Date()): string {
  return date.toISOString();
}
