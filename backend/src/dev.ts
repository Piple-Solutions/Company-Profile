// Local development server (Node). Production Workers entry is documented
// in ARCHITECTURE.md and NOT deployed in Phase 01.
import { serve } from '@hono/node-server';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.ts';
import { createApp } from './app.ts';
import { SqliteAdapter } from './db/sqlite.ts';
import { migrate } from './db/migrate.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '..');

const config = loadConfig(backendDir);
const db = new SqliteAdapter(path.resolve(backendDir, config.databaseFile));

// Apply checked-in migrations on dev start (local only; prod uses wrangler).
await migrate(db, path.join(backendDir, 'db', 'migrations'));

const app = createApp({
  db,
  bootstrapToken: config.bootstrapToken,
  sessionTtlHours: config.sessionTtlHours,
  cookieSecure: config.cookieSecure,
  frontendOrigin: config.frontendOrigin,
});

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[backend] listening on http://localhost:${info.port} (db: ${config.databaseFile})`);
});
