// Idempotent local migration runner (dev + tests). Tracks applied files in
// schema_migrations. Production D1 uses `wrangler d1 migrations apply`
// (own journal); same SQL files, forward-only, never auto-migrate on requests.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { DbPort } from './types.ts';

export async function migrate(db: DbPort, migrationsDir: string): Promise<string[]> {
  await db.execScript('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);');
  const applied = new Set((await db.all<{ name: string }>('SELECT name FROM schema_migrations')).map((r) => r.name));
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const done: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    await db.execScript(readFileSync(path.join(migrationsDir, file), 'utf8'));
    await db.run('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)', [file, new Date().toISOString()]);
    done.push(file);
  }
  return done;
}
