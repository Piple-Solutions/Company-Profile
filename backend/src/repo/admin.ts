// Admin users, sessions, audit log (single Super Admin, D-13/D-18).
import type { DbPort } from '../db/types.ts';
import { nowIso, uid } from '../db/types.ts';

export interface AdminRow {
  id: string; email: string; password_hash: string; role: string;
  is_active: number; last_login_at: string | null;
}

export async function countActiveAdmins(db: DbPort): Promise<number> {
  const row = await db.get<{ c: number }>("SELECT COUNT(*) AS c FROM admin_users WHERE is_active = 1 AND role = 'super_admin'");
  return row?.c ?? 0;
}

export async function findAdminByEmail(db: DbPort, email: string): Promise<AdminRow | null> {
  return db.get<AdminRow>('SELECT * FROM admin_users WHERE email = ? AND is_active = 1', [email]);
}

export async function createAdmin(db: DbPort, email: string, passwordHash: string): Promise<string> {
  const id = uid('adm');
  const now = nowIso();
  await db.run(
    'INSERT INTO admin_users (id,email,password_hash,role,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
    [id, email, passwordHash, 'super_admin', 1, now, now],
  );
  return id;
}

export interface SessionRow {
  id: string; admin_id: string; token_hash: string; csrf_token: string;
  expires_at: string; revoked_at: string | null;
}

export async function createSession(db: DbPort, adminId: string, tokenHash: string, csrfToken: string, expiresAt: string): Promise<string> {
  const id = uid('ses');
  await db.run(
    'INSERT INTO sessions (id,admin_id,token_hash,csrf_token,expires_at,created_at) VALUES (?,?,?,?,?,?)',
    [id, adminId, tokenHash, csrfToken, expiresAt, nowIso()],
  );
  return id;
}

export async function findSession(db: DbPort, tokenHash: string): Promise<(SessionRow & { email: string }) | null> {
  return db.get(
    `SELECT s.*, a.email FROM sessions s JOIN admin_users a ON a.id = s.admin_id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND a.is_active = 1`,
    [tokenHash],
  );
}

export async function revokeSession(db: DbPort, tokenHash: string): Promise<void> {
  await db.run('UPDATE sessions SET revoked_at = ? WHERE token_hash = ?', [nowIso(), tokenHash]);
}

export async function revokeAllSessions(db: DbPort, adminId: string): Promise<void> {
  await db.run('UPDATE sessions SET revoked_at = ? WHERE admin_id = ? AND revoked_at IS NULL', [nowIso(), adminId]);
}

/** Opportunistic GC using existing columns (no idle-timeout/schema change).
 *  Deletes expired rows and rows already revoked. */
export async function cleanupSessions(db: DbPort, now = nowIso()): Promise<number> {
  const res = await db.run('DELETE FROM sessions WHERE expires_at <= ? OR revoked_at IS NOT NULL', [now]);
  return res.changes;
}

export async function touchLogin(db: DbPort, adminId: string): Promise<void> {
  const now = nowIso();
  await db.run('UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE id = ?', [now, now, adminId]);
}

export async function audit(db: DbPort, actor: string, action: string, target?: string): Promise<void> {
  await db.run('INSERT INTO audit_log (id,actor,action,target,created_at) VALUES (?,?,?,?,?)',
    [uid('aud'), actor, action, target ?? null, nowIso()]);
}
