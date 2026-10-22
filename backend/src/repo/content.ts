// Generic editorial repository (services/products/portfolio/articles/pricing).
// Public reads serve ONLY published + non-deleted rows (D-15 gate).
// Writes go through per-table field allowlists (no mass assignment).
import type { DbPort } from '../db/types.ts';
import { nowIso } from '../db/types.ts';

export const EDITORIAL_TABLES = ['services', 'products', 'portfolio_items', 'articles', 'pricing_packages'] as const;
export type EditorialTable = (typeof EDITORIAL_TABLES)[number];

const WRITABLE: Record<EditorialTable, string[]> = {
  services: ['slug', 'title_id', 'category', 'summary_id', 'body_id', 'icon_key', 'sort_order', 'status'],
  products: ['slug', 'name_id', 'tagline_id', 'description_id', 'features_id', 'image_url', 'image_key', 'cta_label_id', 'cta_destination', 'demo_url', 'readiness', 'status'],
  portfolio_items: ['slug', 'title_id', 'client_name', 'summary_id', 'body_id', 'cover_image_url', 'cover_image_key', 'gallery_json', 'service_ref', 'completed_on', 'sort_order', 'status'],
  articles: ['slug', 'title_id', 'excerpt_id', 'body_id', 'cover_image_url', 'cover_image_key', 'status'],
  pricing_packages: ['slug', 'service_ref', 'name_id', 'price_amount', 'price_currency', 'is_custom_quote', 'features_id', 'limits_id', 'cta_destination', 'is_highlighted', 'sort_order', 'status'],
};

export function pickAllowed(table: EditorialTable, input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of WRITABLE[table]) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out;
}

const ORDER_BY: Record<EditorialTable, string> = {
  services: 'sort_order, created_at',
  products: 'created_at',
  portfolio_items: 'sort_order, created_at',
  articles: 'created_at',
  pricing_packages: 'sort_order, created_at',
};

export async function listPublic(db: DbPort, table: EditorialTable): Promise<Record<string, unknown>[]> {
  return db.all(`SELECT * FROM ${table} WHERE status = 'published' AND deleted_at IS NULL ORDER BY ${ORDER_BY[table]}`);
}

export async function getPublicBySlug(db: DbPort, table: EditorialTable, slug: string): Promise<Record<string, unknown> | null> {
  return db.get(`SELECT * FROM ${table} WHERE slug = ? AND status = 'published' AND deleted_at IS NULL`, [slug]);
}

const SEARCHABLE: Record<EditorialTable, string[]> = {
  services: ['slug', 'title_id', 'category'],
  products: ['slug', 'name_id'],
  portfolio_items: ['slug', 'title_id', 'client_name'],
  articles: ['slug', 'title_id'],
  pricing_packages: ['slug', 'name_id'],
};

export async function adminList(
  db: DbPort, table: EditorialTable, opts: { status?: string; q?: string; page?: number; perPage?: number },
): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(100, Math.max(1, opts.perPage ?? 20));
  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  if (opts.status) { where.push('status = ?'); params.push(opts.status); }
  if (opts.q) {
    const cols = SEARCHABLE[table];
    where.push(`(${cols.map((c) => `${c} LIKE ?`).join(' OR ')})`);
    for (const _c of cols) params.push(`%${opts.q}%`);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const totalRow = await db.get<{ c: number }>(`SELECT COUNT(*) AS c FROM ${table} ${whereSql}`, params);
  const items = await db.all(`SELECT * FROM ${table} ${whereSql} ORDER BY updated_at DESC LIMIT ? OFFSET ?`, [...params, perPage, (page - 1) * perPage]);
  return { items, total: totalRow?.c ?? 0 };
}

export async function createRow(db: DbPort, table: EditorialTable, id: string, fields: Record<string, unknown>): Promise<void> {
  const now = nowIso();
  const values = { ...fields };
  // Create-as-published must carry publication metadata, matching PATCH.
  if (values['status'] === 'published' && values['published_at'] == null) values['published_at'] = now;
  const cols = ['id', ...Object.keys(values), 'created_at', 'updated_at'];
  const vals = [id, ...Object.values(values), now, now];
  await db.run(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals);
}

export async function updateRow(db: DbPort, table: EditorialTable, id: string, fields: Record<string, unknown>): Promise<boolean> {
  const now = nowIso();
  const patch: Record<string, unknown> = { ...fields, updated_at: now };
  if (fields['status'] === 'published') {
    const current = await db.get<{ status: string }>(
      `SELECT status FROM ${table} WHERE id = ? AND deleted_at IS NULL`, [id],
    );
    // Preserve the first-publication timestamp on subsequent edits.
    if (current && current.status !== 'published') patch['published_at'] = now;
  }
  const keys = Object.keys(patch);
  if (keys.length === 0) return false;
  const res = await db.run(`UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND deleted_at IS NULL`, [...keys.map((k) => patch[k]), id]);
  return res.changes > 0;
}

export async function softDeleteRow(db: DbPort, table: EditorialTable, id: string): Promise<boolean> {
  const res = await db.run(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`, [nowIso(), nowIso(), id]);
  return res.changes > 0;
}

export async function getById(db: DbPort, table: EditorialTable, id: string): Promise<Record<string, unknown> | null> {
  return db.get(`SELECT * FROM ${table} WHERE id = ? AND deleted_at IS NULL`, [id]);
}
