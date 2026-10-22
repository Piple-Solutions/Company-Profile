import { describe, expect, it } from 'vitest';
import { migratedMemoryDb } from './helpers.ts';
import { listPublic, getPublicBySlug, createRow, updateRow, softDeleteRow, pickAllowed } from '../src/repo/content.ts';
import { getPublicSettings, putSetting } from '../src/repo/settings.ts';
import { nowIso } from '../src/db/types.ts';

describe('repository: migrations, CRUD, publication gate, allowlist', () => {
  it('migrates fresh and exposes zero public rows (seed-guard)', async () => {
    const db = await migratedMemoryDb();
    for (const t of ['services', 'products', 'portfolio_items', 'articles', 'pricing_packages'] as const) {
      expect(await listPublic(db, t)).toEqual([]);
    }
    db.close();
  });

  it('draft hidden, published visible, soft-deleted hidden again', async () => {
    const db = await migratedMemoryDb();
    await createRow(db, 'services', 'svc-1', { slug: 'erp', title_id: 'ERP', category: 'erp', status: 'draft' });
    expect(await getPublicBySlug(db, 'services', 'erp')).toBeNull();
    expect(await updateRow(db, 'services', 'svc-1', { status: 'published' })).toBe(true);
    const pub = await getPublicBySlug(db, 'services', 'erp');
    expect(pub?.['slug']).toBe('erp');
    expect(pub?.['published_at']).toBeTruthy();
    expect(await softDeleteRow(db, 'services', 'svc-1')).toBe(true);
    expect(await getPublicBySlug(db, 'services', 'erp')).toBeNull();
    db.close();
  });

  it('update on missing id returns false; mass-assignment fields stripped', async () => {
    const db = await migratedMemoryDb();
    expect(await updateRow(db, 'services', 'nope', { status: 'published' })).toBe(false);
    expect(pickAllowed('services', { slug: 'x', id: 'INJECT', deleted_at: 'INJECT', status: 'draft' })).toEqual({ slug: 'x', status: 'draft' });
    db.close();
  });

  it('constraint violations are catchable and mappable', async () => {
    const db = await migratedMemoryDb();
    await createRow(db, 'services', 'svc-1', { slug: 'erp', title_id: 'ERP', category: 'erp' });
    await expect(createRow(db, 'services', 'svc-2', { slug: 'erp', title_id: 'Dup', category: 'erp' })).rejects.toThrow(/UNIQUE/i);
    await expect(
      db.run("INSERT INTO services (id,slug,title_id,category,created_at,updated_at) VALUES ('x','x-bad','X','portfolio',?,?)", [nowIso(), nowIso()]),
    ).rejects.toThrow(/CHECK/i);
    await expect(
      db.run("INSERT INTO products (id,slug,name_id,readiness,created_at,updated_at) VALUES ('p','x-bad','X','shipped',?,?)", [nowIso(), nowIso()]),
    ).rejects.toThrow(/CHECK/i);
    db.close();
  });

  it('settings: public projection exposes allowlist only and omits invalid values', async () => {
    const db = await migratedMemoryDb();
    await putSetting(db, 'site_name', '"Situs"', true, 'test');
    await putSetting(db, 'session_secret', '"shh"', false, 'test');
    await putSetting(db, 'whatsapp_number', '"+6200000000000"', true, 'test');
    await putSetting(db, 'whatsapp_number', '"not-e164"', true, 'test');
    await putSetting(db, 'seo_defaults', '{"title_suffix":"SEO"}', true, 'test');
    const pub = await getPublicSettings(db);
    expect(Object.keys(pub).sort()).toEqual(['seo_defaults', 'site_name']);
    expect(JSON.stringify(pub)).not.toContain('shh');
    expect(JSON.stringify(pub)).not.toContain('not-e164');
    db.close();
  });
});
