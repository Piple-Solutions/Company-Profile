// SqliteAdapter — local development + tests (node:sqlite). Zero npm deps.
import { DatabaseSync } from 'node:sqlite';
import type { DbPort, RunResult } from './types.ts';

export class SqliteAdapter implements DbPort {
  private db: DatabaseSync;
  private depth = 0;

  constructor(filename: string) {
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...(params as never[])) as T[];
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const row = this.db.prepare(sql).get(...(params as never[])) as T | undefined;
    return row ?? null;
  }

  async run(sql: string, params: unknown[] = []): Promise<RunResult> {
    const info = this.db.prepare(sql).run(...(params as never[]));
    return { changes: Number(info.changes ?? 0) };
  }

  async execScript(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.depth > 0) return fn();
    this.depth++;
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const out = await fn();
      this.db.exec('COMMIT;');
      this.depth--;
      return out;
    } catch (e) {
      try { this.db.exec('ROLLBACK;'); } catch { /* already rolled back */ }
      this.depth--;
      throw e;
    }
  }

  close(): void {
    this.db.close();
  }
}
