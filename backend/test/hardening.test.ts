import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.ts';
import { createSession, revokeSession } from '../src/repo/admin.ts';
import { bootstrapAdmin, migratedMemoryDb, testApp } from './helpers.ts';
import { resolveClientIp } from '../src/http/client-ip.ts';
import { RateLimiter } from '../src/auth/ratelimit.ts';
import { D1Adapter } from '../src/db/d1.ts';
import type { D1Database } from '../src/db/types.ts';
import { mapDbError } from '../src/http/errors.ts';
import { nowIso } from '../src/db/types.ts';

const INQUIRY = {
  name: 'Budi Santoso',
  contact: 'budi@example.id',
  company: 'PT Contoh',
  need_category: 'website-company-profile',
  message: 'Kami membutuhkan website company profile untuk perusahaan kami.',
  consent: true,
};

const authHeaders = (sid: string, csrf: string) => ({
  Cookie: `piple_sid=${sid}`,
  'X-CSRF-Token': csrf,
  'Content-Type': 'application/json',
});

function streamBody(bytes: number): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= bytes) { controller.close(); return; }
      const size = Math.min(8192, bytes - sent);
      sent += size;
      controller.enqueue(new Uint8Array(size).fill(65));
    },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('A1 validation hardening', () => {
  it('rejects whitespace-only inquiry fields before storage', async () => {
    const { app, db } = await testApp();
    const res = await app.request('/api/v1/inquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...INQUIRY, name: '   ', message: '          ' }),
    } as RequestInit);
    expect(res.status).toBe(400);
    expect(await db.get('SELECT id FROM leads LIMIT 1')).toBeNull();
  });

  it('trims accepted inquiry values before persistence', async () => {
    const { app, db } = await testApp();
    const res = await app.request('/api/v1/inquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...INQUIRY, name: '  Budi  Santoso  ', message: '  Kebutuhan website perusahaan.  ' }),
    } as RequestInit);
    expect(res.status).toBe(201);
    const row = await db.get<{ name: string; message: string }>('SELECT name, message FROM leads LIMIT 1');
    expect(row).toMatchObject({ name: 'Budi Santoso', message: 'Kebutuhan website perusahaan.' });
  });

  it('enforces streamed inquiry and admin body limits with 413', async () => {
    const { app } = await testApp();
    const inquiry = await app.request('/api/v1/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: streamBody(70 * 1024),
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    expect(inquiry.status).toBe(413);

    const admin = await app.request('/api/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'x'.repeat(140 * 1024),
    } as RequestInit);
    expect(admin.status).toBe(413);
    expect(((await admin.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });

  it('validates admin list query parameters and allowed keys', async () => {
    const { app } = await testApp();
    const { sid, csrf } = await bootstrapAdmin(app);
    const auth = authHeaders(sid, csrf);
    for (const query of ['?page=0', '?per_page=101', '?status=live', '?unknown=1']) {
      const res = await app.request(`/api/v1/admin/services${query}`, { headers: auth } as RequestInit);
      expect(res.status, query).toBe(400);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
    }
    const ok = await app.request('/api/v1/admin/services?page=1&per_page=100', { headers: auth } as RequestInit);
    expect(ok.status).toBe(200);
    const badLeads = await app.request('/api/v1/admin/leads?state=bogus', { headers: auth } as RequestInit);
    expect(badLeads.status).toBe(400);
  });

  it('rejects service slugs outside the taxonomy and slug/category mismatches', async () => {
    const { app } = await testApp();
    const { sid, csrf } = await bootstrapAdmin(app);
    const auth = authHeaders(sid, csrf);
    const outside = await app.request('/api/v1/admin/services', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ slug: 'not-a-service', title_id: 'Not a service', category: 'erp' }),
    } as RequestInit);
    expect(outside.status).toBe(400);

    const mismatch = await app.request('/api/v1/admin/services', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ slug: 'erp', title_id: 'ERP', category: 'custom-systems' }),
    } as RequestInit);
    expect(mismatch.status).toBe(400);

    const valid = await app.request('/api/v1/admin/services', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ slug: 'erp', title_id: 'ERP', category: 'erp' }),
    } as RequestInit);
    expect(valid.status).toBe(201);
    const id = ((await valid.json()) as { data: { id: string } }).data.id;
    const patch = await app.request(`/api/v1/admin/services/${id}`, {
      method: 'PATCH', headers: auth, body: JSON.stringify({ category: 'custom-systems' }),
    } as RequestInit);
    expect(patch.status).toBe(400);
  });
});

describe('A1 settings, publication, audit, and sessions', () => {
  it('validates setting JSON and per-key schemas; normalizes stored values', async () => {
    const { app, db } = await testApp();
    const { sid, csrf } = await bootstrapAdmin(app);
    const auth = authHeaders(sid, csrf);
    const put = (body: unknown) => app.request('/api/v1/admin/settings', {
      method: 'PUT', headers: auth, body: JSON.stringify(body),
    } as RequestInit);

    expect((await put({ key: 'site_name', value_json: '{', is_public: true })).status).toBe(400);
    expect((await put({ key: 'whatsapp_number', value_json: '"123"', is_public: true })).status).toBe(400);
    expect((await put({ key: 'unknown_key', value_json: '"x"', is_public: false })).status).toBe(400);
    expect((await put({ key: 'whatsapp_templates', value_json: '{}', is_public: true })).status).toBe(400);
    expect((await put({ key: 'seo_defaults', value_json: '{"evil":"x"}', is_public: true })).status).toBe(400);

    const site = await put({ key: 'site_name', value_json: '"  Piple  "', is_public: true });
    expect(site.status).toBe(200);
    const stored = await db.get<{ value_json: string }>("SELECT value_json FROM settings WHERE key = 'site_name'");
    expect(stored?.value_json).toBe('"Piple"');

    const wa = await put({ key: 'whatsapp_number', value_json: '"+6281234567890"', is_public: true });
    expect(wa.status).toBe(200);
    const publicRes = await app.request('/api/v1/settings/public');
    const publicBody = (await publicRes.json()) as { data: Record<string, unknown> };
    expect(publicBody.data['whatsapp_number']).toBe('+6281234567890');
    expect(publicBody.data['site_name']).toBe('Piple');
  });

  it('omits malformed legacy public settings rather than serving raw text', async () => {
    const { app, db } = await testApp();
    await db.run(
      "INSERT INTO settings (key,value_json,is_public,updated_at,updated_by) VALUES ('site_name','{bad json',1,?,'legacy')",
      [nowIso()],
    );
    const res = await app.request('/api/v1/settings/public');
    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data['site_name']).toBeUndefined();
  });

  it('sets published_at on create and preserves it on later edits', async () => {
    const { app, db } = await testApp();
    const { sid, csrf } = await bootstrapAdmin(app);
    const auth = authHeaders(sid, csrf);
    const created = await app.request('/api/v1/admin/services', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ slug: 'erp', title_id: 'ERP', category: 'erp', status: 'published' }),
    } as RequestInit);
    expect(created.status).toBe(201);
    const row = ((await created.json()) as { data: { id: string; published_at: string | null } }).data;
    expect(row.published_at).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 10));
    const patched = await app.request(`/api/v1/admin/services/${row.id}`, {
      method: 'PATCH', headers: auth, body: JSON.stringify({ title_id: 'ERP Updated' }),
    } as RequestInit);
    expect(patched.status).toBe(200);
    const after = await db.get<{ published_at: string }>('SELECT published_at FROM services WHERE id = ?', [row.id]);
    expect(after?.published_at).toBe(row.published_at);
  });

  it('audits failed logins with existing schema and no password material', async () => {
    const { app, db } = await testApp();
    await bootstrapAdmin(app);
    const failed = await app.request('/api/v1/admin/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@t.local', password: 'wrong-password' }),
    } as RequestInit);
    expect(failed.status).toBe(401);
    const audit = await db.get<{ actor: string; action: string; target: string | null }>(
      "SELECT actor, action, target FROM audit_log WHERE action = 'login.failed'",
    );
    expect(audit).toMatchObject({ actor: 'admin@t.local', action: 'login.failed', target: null });
    const all = await db.all<Record<string, unknown>>('SELECT * FROM audit_log');
    expect(JSON.stringify(all)).not.toContain('wrong-password');
  });

  it('cleans expired and revoked sessions on successful login', async () => {
    const { app, db } = await testApp();
    await bootstrapAdmin(app);
    await db.run('DELETE FROM sessions');
    const admin = await db.get<{ id: string }>('SELECT id FROM admin_users LIMIT 1');
    await createSession(db, admin!.id, 'a'.repeat(64), 'csrf-expired', new Date(Date.now() - 1000).toISOString());
    await createSession(db, admin!.id, 'b'.repeat(64), 'csrf-revoked', new Date(Date.now() + 60_000).toISOString());
    await revokeSession(db, 'b'.repeat(64));

    const login = await app.request('/api/v1/admin/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@t.local', password: 'KataSandiKuat123!' }),
    } as RequestInit);
    expect(login.status).toBe(200);
    const count = await db.get<{ c: number }>('SELECT COUNT(*) AS c FROM sessions');
    expect(count?.c).toBe(1);
  });

  it('marks authenticated admin responses no-store', async () => {
    const { app } = await testApp();
    const { sid } = await bootstrapAdmin(app);
    const me = await app.request('/api/v1/admin/auth/me', { headers: { Cookie: `piple_sid=${sid}` } } as RequestInit);
    expect(me.headers.get('cache-control')).toBe('no-store');
  });
});

describe('A1 boundaries and fail-safe contracts', () => {
  it('default client-IP resolution ignores spoofed forwarding headers', () => {
    expect(resolveClientIp({ directIp: '203.0.113.9', forwardedFor: '1.2.3.4' })).toBe('203.0.113.9');
    expect(resolveClientIp({ directIp: '203.0.113.9', cfConnectingIp: '1.2.3.4' })).toBe('203.0.113.9');
  });

  it('trusted proxy mode selects the configured hop, never the leftmost value', () => {
    expect(resolveClientIp(
      { directIp: '10.0.0.2', forwardedFor: '198.51.100.7, 203.0.113.8' },
      { trustedProxyHeader: 'x-forwarded-for', trustedProxyHops: 1 },
    )).toBe('203.0.113.8');
    expect(resolveClientIp(
      { directIp: '10.0.0.2', cfConnectingIp: '203.0.113.8' },
      { trustedProxyHeader: 'cf-connecting-ip' },
    )).toBe('203.0.113.8');
  });

  it('bounds in-memory rate-limit buckets', () => {
    const limiter = new RateLimiter({ capacity: 1, refillPerSecond: 1, maxBuckets: 2 });
    expect(limiter.take('a', 0)).toBe(true);
    expect(limiter.take('b', 0)).toBe(true);
    expect(limiter.take('c', 0)).toBe(true);
    expect(limiter.take('a', 0)).toBe(true);
  });

  it('D1 transaction fails loudly without running the callback', async () => {
    const stub = { prepare: () => { throw new Error('not used'); }, batch: async () => [] } as unknown as D1Database;
    const adapter = new D1Adapter(stub);
    let called = false;
    await expect(adapter.transaction(async () => { called = true; return 1; })).rejects.toThrow(/unsupported/i);
    expect(called).toBe(false);
  });

  it('maps DB errors to safe messages without provider details', () => {
    const unique = Object.assign(new Error('D1_ERROR: UNIQUE constraint failed: services.slug'), { code: 'SQLITE_CONSTRAINT_UNIQUE' });
    expect(mapDbError(unique)).toEqual(['CONFLICT', 'Data sudah ada.', 409]);
    const busy = Object.assign(new Error('D1_ERROR: database is locked'), { code: 'SQLITE_BUSY' });
    const [busyCode, busyMessage, busyStatus] = mapDbError(busy);
    expect(busyCode).toBe('INTERNAL_ERROR');
    expect(busyStatus).toBe(503);
    expect(busyMessage).not.toContain('database');
    expect(busyMessage).not.toContain('D1');
  });

  it('fails closed for insecure production configuration', () => {
    const dir = mkdtempSync(join(tmpdir(), 'piple-config-'));
    try {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('BOOTSTRAP_TOKEN', 'bootstrap-token-value');
      vi.stubEnv('SESSION_SECRET', 'session-secret-value');
      vi.stubEnv('COOKIE_SECURE', 'false');
      vi.stubEnv('FRONTEND_ORIGIN', 'https://piple.example');
      expect(() => loadConfig(dir)).toThrow(/COOKIE_SECURE/);

      vi.stubEnv('COOKIE_SECURE', 'true');
      vi.stubEnv('FRONTEND_ORIGIN', 'http://localhost:5173');
      expect(() => loadConfig(dir)).toThrow(/FRONTEND_ORIGIN/);

      vi.stubEnv('FRONTEND_ORIGIN', 'https://piple.example');
      const config = loadConfig(dir);
      expect(config.isProd).toBe(true);
      expect(config.cookieSecure).toBe(true);
      expect(config.frontendOrigin).toBe('https://piple.example');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects malformed numeric configuration', () => {
    const dir = mkdtempSync(join(tmpdir(), 'piple-config-'));
    try {
      vi.stubEnv('NODE_ENV', 'test');
      vi.stubEnv('BOOTSTRAP_TOKEN', 'bootstrap-token-value');
      vi.stubEnv('SESSION_SECRET', 'session-secret-value');
      vi.stubEnv('COOKIE_SECURE', 'false');
      vi.stubEnv('FRONTEND_ORIGIN', 'http://localhost:5173');
      vi.stubEnv('PORT', 'not-a-number');
      expect(() => loadConfig(dir)).toThrow(/PORT/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
