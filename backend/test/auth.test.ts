import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../src/auth/passwords.ts';
import { createSession } from '../src/repo/admin.ts';
import { TEST_BOOTSTRAP_TOKEN, bootstrapAdmin, sidOf, testApp } from './helpers.ts';

const BOOT = (email: string, token = TEST_BOOTSTRAP_TOKEN, password = 'KataSandiKuat123!') => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, bootstrap_token: token }),
});

describe('auth: bootstrap single-winner, login, sessions, CSRF', () => {
  it('first bootstrap succeeds; second returns identical 403 (no oracle)', async () => {
    const { app } = await testApp();
    const first = await app.request('/api/v1/admin/auth/bootstrap', BOOT('a@t.local') as RequestInit);
    expect(first.status).toBe(200);
    const second = await app.request('/api/v1/admin/auth/bootstrap', BOOT('b@t.local') as RequestInit);
    expect(second.status).toBe(403);
    expect(await second.json()).toEqual(await (await app.request('/api/v1/admin/auth/bootstrap', BOOT('x@t.local', 'wrong-token-0000000000000000000000') as RequestInit)).json());
  });

  it('concurrent bootstraps elect exactly one winner', async () => {
    const { app } = await testApp();
    const results = await Promise.all(
      ['a@t.local', 'b@t.local', 'c@t.local', 'd@t.local', 'e@t.local'].map(async (email): Promise<number> => {
        const r = await app.request('/api/v1/admin/auth/bootstrap', BOOT(email) as RequestInit);
        return r.status;
      }),
    );
    expect(results.filter((s) => s === 200)).toHaveLength(1);
    expect(results.filter((s) => s === 403)).toHaveLength(4);
  });

  it('login rejects wrong password without enumeration; session gates admin', async () => {
    const { app } = await testApp();
    await bootstrapAdmin(app);
    const bad = await app.request('/api/v1/admin/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@t.local', password: 'salah' }),
    } as RequestInit);
    expect(bad.status).toBe(401);
    expect(((await bad.json()) as { error: { code: string } }).error.code).toBe('UNAUTHENTICATED');
    const anon = await app.request('/api/v1/admin/services');
    expect(anon.status).toBe(401);
  });

  it('mutations require CSRF; logout revokes the session', async () => {
    const { app } = await testApp();
    const { sid, csrf } = await bootstrapAdmin(app);
    const noCsrf = await app.request('/api/v1/admin/services', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: `piple_sid=${sid}` },
      body: JSON.stringify({ slug: 'erp', title_id: 'ERP', category: 'erp' }),
    } as RequestInit);
    expect(noCsrf.status).toBe(403);
    const out = await app.request('/api/v1/admin/auth/logout', {
      method: 'POST', headers: { 'X-CSRF-Token': csrf, Cookie: `piple_sid=${sid}` },
    } as RequestInit);
    expect(out.status).toBe(200);
    const me = await app.request('/api/v1/admin/auth/me', { headers: { Cookie: `piple_sid=${sid}` } } as RequestInit);
    expect(me.status).toBe(401);
  });

  it('expired sessions are rejected', async () => {
    const { app, db } = await testApp();
    const { sid } = await bootstrapAdmin(app);
    void sid;
    const { newToken } = await import('../src/auth/passwords.ts');
    const raw = newToken();
    const admin = await db.get<{ id: string }>('SELECT id FROM admin_users LIMIT 1');
    await createSession(db, admin!.id, sha256Hex(raw), 'csrf-old', new Date(Date.now() - 1000).toISOString());
    const me = await app.request('/api/v1/admin/auth/me', { headers: { Cookie: `piple_sid=${raw}` } } as RequestInit);
    expect(me.status).toBe(401);
  });

  it('login rate limiting trips after abuse', async () => {
    const { app } = await testApp();
    await bootstrapAdmin(app);
    let last = 0;
    for (let i = 0; i < 12; i++) {
      const r = await app.request('/api/v1/admin/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@t.local', password: 'salah' }),
      } as RequestInit);
      last = r.status;
    }
    expect(last).toBe(429);
  });

  it('no public registration surface exists', async () => {
    const { app } = await testApp();
    for (const path of ['/api/v1/admin/auth/register', '/api/v1/admin/auth/signup']) {
      const r = await app.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' } as RequestInit);
      expect([401, 403, 404]).toContain(r.status);
    }
  });
});
