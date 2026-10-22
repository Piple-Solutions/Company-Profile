// Auth/session middleware: cookie sessions, CSRF on mutations, rate limits.
// Session cookie holds the raw opaque token; only its SHA-256 is stored.
import type { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sha256Hex } from '../auth/passwords.ts';
import { RateLimiter } from '../auth/ratelimit.ts';
import { findSession } from '../repo/admin.ts';
import type { DbPort } from '../db/types.ts';
import { fail } from './errors.ts';
import type { ClientIpResolver } from './client-ip.ts';

export const SID_COOKIE = 'piple_sid';

export interface RequestDeps {
  db: DbPort;
  sessionTtlHours: number;
  cookieSecure: boolean;
  clientIp: ClientIpResolver;
}

export const loginLimiter = new RateLimiter({ capacity: 10, refillPerSecond: 10 / 3600 });
export const bootstrapLimiter = new RateLimiter({ capacity: 5, refillPerSecond: 5 / 3600 });
export const inquiryLimiter = new RateLimiter({ capacity: 5, refillPerSecond: 5 / 3600 });

export interface SessionInfo {
  adminId: string;
  email: string;
  csrfToken: string;
}

export function sessionOf(c: Context): SessionInfo | undefined {
  return c.get('session' as never) as SessionInfo | undefined;
}

function setSessionVar(c: Context, session: SessionInfo): void {
  c.set('session' as never, session as never);
}

export async function getSession(c: Context, deps: RequestDeps): Promise<SessionInfo | null> {
  const raw = getCookie(c, SID_COOKIE);
  if (!raw || !/^[0-9a-f]{64}$/.test(raw)) return null;
  const row = await findSession(deps.db, sha256Hex(raw));
  if (!row) return null;
  if (row.expires_at <= new Date().toISOString()) return null;
  return { adminId: row.admin_id, email: row.email, csrfToken: row.csrf_token };
}

export function setSessionCookie(c: Context, deps: RequestDeps, rawToken: string, maxAgeSeconds: number): void {
  setCookie(c, SID_COOKIE, rawToken, {
    httpOnly: true,
    secure: deps.cookieSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(c: Context, deps: RequestDeps): void {
  deleteCookie(c, SID_COOKIE, { path: '/', secure: deps.cookieSecure, sameSite: 'Lax' });
}

export function requireAdmin(deps: RequestDeps) {
  return async (c: Context, next: Next) => {
    const session = await getSession(c, deps);
    if (!session) return fail(c, 'UNAUTHENTICATED', 'Sesi tidak valid. Silakan masuk.', 401);
    setSessionVar(c, session);
    await next();
  };
}

/** CSRF: state-changing admin requests must echo the session CSRF token. */
export async function requireCsrf(c: Context, next: Next) {
  const session = sessionOf(c);
  const sent = c.req.header('x-csrf-token');
  if (!session || !sent || sent !== session.csrfToken) {
    return fail(c, 'FORBIDDEN', 'Token keamanan tidak valid.', 403);
  }
  await next();
}

/** Public mutation guard: same-origin/allowlisted origin only. Body size is
 *  enforced by the streaming requestBodyLimit middleware, not Content-Length. */
export function publicMutationGuard(allowedOrigins: string[]) {
  return async (c: Context, next: Next) => {
    const origin = c.req.header('origin');
    if (origin && !allowedOrigins.includes(origin)) {
      return fail(c, 'FORBIDDEN', 'Asal permintaan tidak diizinkan.', 403);
    }
    await next();
  };
}
