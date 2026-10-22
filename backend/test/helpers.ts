// Shared test harness: ephemeral in-memory SQLite + migrated schema.
// Nothing touches dev.db, D1, or the network.
import { beforeEach } from 'vitest';
import { createApp } from '../src/app.ts';
import { SqliteAdapter } from '../src/db/sqlite.ts';
import { migrate } from '../src/db/migrate.ts';
import { bootstrapLimiter, inquiryLimiter, loginLimiter } from '../src/http/auth.ts';

export const TEST_BOOTSTRAP_TOKEN = 'test-bootstrap-token-0123456789abcdef';
export const TEST_SESSION_SECRET = 'test-session-secret-0123456789abcdef';

function resolveMigrationsDir(): string {
  const urlPath = new URL('../db/migrations', import.meta.url).pathname;
  return process.platform === 'win32' && urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
}

export async function testApp() {
  const db = new SqliteAdapter(':memory:');
  await migrate(db, resolveMigrationsDir());
  const app = createApp({
    db,
    bootstrapToken: TEST_BOOTSTRAP_TOKEN,
    sessionTtlHours: 12,
    cookieSecure: false,
    frontendOrigin: 'http://localhost:5173',
  });
  return { app, db };
}

beforeEach(() => {
  bootstrapLimiter.resetForTests();
  inquiryLimiter.resetForTests();
  loginLimiter.resetForTests();
});

export async function migratedMemoryDb() {
  const db = new SqliteAdapter(':memory:');
  await migrate(db, resolveMigrationsDir());
  return db;
}

/** Extract sid cookie value from a login/bootstrap response. */
export function sidOf(res: Response): string {
  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/piple_sid=([0-9a-f]{64})/);
  if (!match) throw new Error('no session cookie set');
  return match[1];
}

export async function bootstrapAdmin(app: ReturnType<typeof createApp>, email = 'admin@t.local') {
  const res = await app.request('/api/v1/admin/auth/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'KataSandiKuat123!', bootstrap_token: TEST_BOOTSTRAP_TOKEN }),
  });
  if (res.status !== 200) throw new Error(`bootstrap failed: ${res.status}`);
  const body = (await res.json()) as { data: { csrf_token: string } };
  return { sid: sidOf(res), csrf: body.data.csrf_token, email };
}
