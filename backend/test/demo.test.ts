import { describe, expect, it } from 'vitest';
import { bootstrapAdmin, testApp } from './helpers.ts';
import { D1Adapter } from '../src/db/d1.ts';
import type { D1Database, D1Prepared } from '../src/db/types.ts';
import { createRow } from '../src/repo/content.ts';

// Minimal in-memory stand-in for the D1 binding surface — verifies the
// ADAPTER's call shape only (prepare/bind/all/run/first), NOT D1 engine
// behavior. Engine parity was proven separately (spike, real D1).
function stubD1(): D1Database & { rows: Map<string, Record<string, unknown>[] | undefined> } {
  const tables = new Map<string, Record<string, unknown>[]>();
  const mk = (sql: string): D1Prepared => {
    let params: unknown[] = [];
    const self: D1Prepared = {
      bind: (...p: unknown[]) => { params = p; return self; },
      first: async <T,>() => {
        if (/COUNT\(\*\)/i.test(sql)) {
          const m = sql.match(/FROM\s+(\w+)/i);
          return { c: (tables.get(m?.[1] ?? '') ?? []).length } as T;
        }
        const m = sql.match(/FROM\s+(\w+).*WHERE\s+(\w+)\s*=\s*\?/i);
        const rows = tables.get(m?.[1] ?? '') ?? [];
        return (rows.find((r) => String(r[m?.[2] ?? '']) === String(params[0])) ?? null) as T | null;
      },
      all: async <T,>() => {
        const m = sql.match(/FROM\s+(\w+)/i);
        return { results: ((tables.get(m?.[1] ?? '') ?? []) as T[]) };
      },
      run: async () => {
        const ins = sql.match(/INSERT INTO\s+(\w+)/i);
        if (ins) {
          const cols = sql.match(/\(([^)]+)\)/)?.[1].split(',').map((s) => s.trim()) ?? [];
          const row: Record<string, unknown> = {};
          cols.forEach((c, i) => { row[c] = params[i]; });
          const arr = tables.get(ins[1]) ?? [];
          if (arr.some((r) => r['slug'] && r['slug'] === row['slug'])) {
            throw Object.assign(new Error('UNIQUE constraint failed'), { code: 'SQLITE_CONSTRAINT_UNIQUE' });
          }
          arr.push(row);
          tables.set(ins[1], arr);
          return { success: true, meta: { changes: 1 } };
        }
        return { success: true, meta: { changes: 0 } };
      },
    };
    return self;
  };
  return {
    rows: tables as Map<string, Record<string, unknown>[] | undefined>,
    prepare: (sql: string) => mk(sql),
    batch: async (stmts: D1Prepared[]) => {
      const out: unknown[] = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
  };
}

describe('products demo states + D1 adapter call shape', () => {
  it('publishes products with demo states; unsafe URLs rejected on write', async () => {
    const { app } = await testApp();
    const { sid, csrf } = await bootstrapAdmin(app);
    const auth = { Cookie: `piple_sid=${sid}`, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' };
    const mk = async (slug: string, body: Record<string, unknown>) => {
      const r = await app.request('/api/v1/admin/products', { method: 'POST', headers: auth, body: JSON.stringify({ slug, name_id: slug, ...body }) } as RequestInit);
      expect(r.status).toBe(201);
    };
    await mk('pos-kasir-otomatis', { status: 'published', readiness: 'available', demo_url: 'https://demo.example.id/kasir' });
    await mk('pos-pemesanan-penginapan', { status: 'published', readiness: 'in_development', demo_url: null });
    const evil = await app.request('/api/v1/admin/products', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ slug: 'erp-laundry', name_id: 'ERP Laundry', demo_url: 'javascript:alert(1)' }),
    } as RequestInit);
    expect(evil.status).toBe(400);
    const list = (await (await app.request('/api/v1/products')).json()) as { data: { slug: string; demo_state: string; demo_url: unknown }[] };
    expect(list.data).toHaveLength(2);
    expect(list.data.find((p) => p.slug === 'pos-kasir-otomatis')).toMatchObject({ demo_state: 'live_demo', demo_url: 'https://demo.example.id/kasir' });
    expect(list.data.find((p) => p.slug === 'pos-pemesanan-penginapan')).toMatchObject({ demo_state: 'coming_soon', demo_url: null });
  });

  it('D1Adapter drives the binding surface (shape test, stub — see header)', async () => {
    const stub = stubD1();
    const adapter = new D1Adapter(stub);
    await createRow(adapter, 'services', 'svc-1', { slug: 'erp', title_id: 'ERP', category: 'erp' });
    const rows = await adapter.all('SELECT * FROM services');
    expect(rows).toHaveLength(1);
    await expect(
      createRow(adapter, 'services', 'svc-2', { slug: 'erp', title_id: 'Dup', category: 'erp' }),
    ).rejects.toThrow(/UNIQUE/i);
  });
});
