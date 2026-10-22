// Settings repository. Public reads project EXPLICITLY allowlisted keys only
// (D-12/C) — never whole records. Admin reads/writes are auth-gated at routes.
import {
  PUBLIC_SETTINGS_KEYS, settingValueSchemas,
  type PublicSettingKey,
} from '../../../shared/src/index.ts';
import type { DbPort } from '../db/types.ts';
import { nowIso, uid } from '../db/types.ts';

export async function getPublicSettings(db: DbPort): Promise<Record<string, unknown>> {
  const placeholders = PUBLIC_SETTINGS_KEYS.map(() => '?').join(', ');
  const rows = await db.all<{ key: string; value_json: string }>(
    `SELECT key, value_json FROM settings WHERE is_public = 1 AND key IN (${placeholders})`,
    [...PUBLIC_SETTINGS_KEYS],
  );
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    if (!(PUBLIC_SETTINGS_KEYS as readonly string[]).includes(row.key)) continue;
    const key = row.key as PublicSettingKey;
    let value: unknown;
    try { value = JSON.parse(row.value_json); } catch { continue; }
    const parsed = settingValueSchemas[key].safeParse(value);
    if (parsed.success) out[key] = parsed.data;
  }
  return out;
}

export async function getAllSettings(db: DbPort): Promise<Record<string, unknown>[]> {
  return db.all('SELECT key, value_json, is_public, updated_at, updated_by FROM settings ORDER BY key');
}

export async function putSetting(
  db: DbPort, key: string, valueJson: string, isPublic: boolean, updatedBy: string,
): Promise<void> {
  const now = nowIso();
  const existing = await db.get<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ?', [key]);
  await db.run(
    `INSERT INTO settings (key, value_json, is_public, updated_at, updated_by) VALUES (?,?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, is_public = excluded.is_public, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    [key, valueJson, isPublic ? 1 : 0, now, updatedBy],
  );
  if (existing) {
    await db.run('INSERT INTO settings_history (id, key, value_json, changed_at, changed_by) VALUES (?,?,?,?,?)',
      [uid('sh'), key, existing.value_json, now, updatedBy]);
  }
}
