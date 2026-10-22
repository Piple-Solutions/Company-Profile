import { describe, expect, it } from 'vitest';
import { bootstrapAdmin, testApp } from './helpers.ts';

const INQUIRY = {
  name: 'Budi Santoso',
  contact: 'budi@example.id',
  company: 'PT Contoh',
  need_category: 'website-company-profile',
  message: 'Kami membutuhkan website company profile untuk perusahaan kami.',
  consent: true,
};

describe('inquiry + leads inbox (D-27 scope)', () => {
  it('stores valid inquiries and returns 201 only after storage', async () => {
    const { app, db } = await testApp();
    const res = await app.request('/api/v1/inquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(INQUIRY),
    } as RequestInit);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; state: string } };
    expect(body.data.state).toBe('new');
    const row = await db.get<{ name: string; contact: string }>('SELECT name, contact FROM leads WHERE id = ?', [body.data.id]);
    expect(row).toMatchObject({ name: 'Budi Santoso', contact: 'budi@example.id' });
  });

  it('rejects invalid input with Indonesian field errors, stores nothing', async () => {
    const { app, db } = await testApp();
    const res = await app.request('/api/v1/inquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...INQUIRY, contact: 'bukan-email', message: 'x' }),
    } as RequestInit);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; fields: Record<string, string> } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields['contact']).toMatch(/Email/);
    expect(await db.get('SELECT id FROM leads LIMIT 1')).toBeNull();
  });

  it('honeypot submissions pretend success without storing (no oracle)', async () => {
    const { app, db } = await testApp();
    const res = await app.request('/api/v1/inquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...INQUIRY, website: 'http://spam.example' }),
    } as RequestInit);
    expect(res.status).toBe(201);
    expect(await db.get('SELECT id FROM leads LIMIT 1')).toBeNull();
  });

  it('rate-limits repeated submissions from one IP', async () => {
    const { app } = await testApp();
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await app.request('/api/v1/inquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.8.8.8' },
        body: JSON.stringify(INQUIRY),
      } as RequestInit);
      statuses.push(r.status);
    }
    expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  it('leads inbox is admin-only; supports list/detail/status; 404 on unknown', async () => {
    const { app } = await testApp();
    await app.request('/api/v1/inquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(INQUIRY),
    } as RequestInit);
    expect((await app.request('/api/v1/admin/leads')).status).toBe(401);
    const { sid, csrf } = await bootstrapAdmin(app);
    const auth = { Cookie: `piple_sid=${sid}` };
    const list = (await (await app.request('/api/v1/admin/leads', { headers: auth } as RequestInit)).json()) as { data: { id: string }[] };
    expect(list.data).toHaveLength(1);
    const id = list.data[0].id;
    const patch = await app.request(`/api/v1/admin/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...auth },
      body: JSON.stringify({ state: 'in_progress' }),
    } as RequestInit);
    expect(patch.status).toBe(200);
    const detail = (await (await app.request(`/api/v1/admin/leads/${id}`, { headers: auth } as RequestInit)).json()) as { data: { state: string; handled_by: string } };
    expect(detail.data.state).toBe('in_progress');
    expect(detail.data.handled_by).toBe('admin@t.local');
    expect((await app.request('/api/v1/admin/leads/lead_tidak_ada', { headers: auth } as RequestInit)).status).toBe(404);
    const badState = await app.request(`/api/v1/admin/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...auth },
      body: JSON.stringify({ state: 'bogus' }),
    } as RequestInit);
    expect(badState.status).toBe(400);
  });
});
