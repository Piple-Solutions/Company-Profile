// Leads repository — Super Admin only, never public (D-27, TBD-09).
// Operational lifecycle new → in_progress → closed (+ purge), not draft/published.
import type { DbPort } from '../db/types.ts';
import { nowIso } from '../db/types.ts';

export async function createLead(db: DbPort, row: {
  id: string; name: string; contact: string; company?: string | null;
  need_category: string; message: string; source_page?: string | null; consent_at: string;
}): Promise<void> {
  const now = nowIso();
  await db.run(
    `INSERT INTO leads (id,name,contact,company,need_category,message,source_page,consent_at,state,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?, 'new',?,?)`,
    [row.id, row.name, row.contact, row.company ?? null, row.need_category, row.message, row.source_page ?? null, row.consent_at, now, now],
  );
}

export async function listLeads(db: DbPort, opts: { state?: string; page?: number; perPage?: number }): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(100, Math.max(1, opts.perPage ?? 20));
  const where = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  if (opts.state) { where.push('state = ?'); params.push(opts.state); }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const totalRow = await db.get<{ c: number }>(`SELECT COUNT(*) AS c FROM leads ${whereSql}`, params);
  const items = await db.all(`SELECT * FROM leads ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, perPage, (page - 1) * perPage]);
  return { items, total: totalRow?.c ?? 0 };
}

export async function getLead(db: DbPort, id: string): Promise<Record<string, unknown> | null> {
  return db.get('SELECT * FROM leads WHERE id = ? AND deleted_at IS NULL', [id]);
}

export async function setLeadState(db: DbPort, id: string, state: string, handledBy: string): Promise<boolean> {
  const now = nowIso();
  const res = await db.run(
    'UPDATE leads SET state = ?, handled_by = ?, handled_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    [state, handledBy, now, now, id],
  );
  return res.changes > 0;
}

export async function softDeleteLead(db: DbPort, id: string): Promise<boolean> {
  const res = await db.run('UPDATE leads SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL', [nowIso(), nowIso(), id]);
  return res.changes > 0;
}
