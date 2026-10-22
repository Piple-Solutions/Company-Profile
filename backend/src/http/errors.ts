// Safe error envelope. NEVER leaks stack traces, SQL, or secrets.
// Maps constraint violations to stable codes (spike-proven message cores).
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import type { ErrorCode } from '../../../shared/src/index.ts';

export function ok(c: Context, data: unknown, meta?: Record<string, unknown>, status: ContentfulStatusCode = 200) {
  return c.json(meta ? { data, meta } : { data }, status);
}

export function fail(c: Context, code: ErrorCode, messageId: string, status: ContentfulStatusCode, fields?: Record<string, string>) {
  return c.json({ error: { code, message_id: messageId, ...(fields ? { fields } : {}) } }, status);
}

export function zodFail(c: Context, err: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || 'value';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fail(c, 'VALIDATION_ERROR', 'Data tidak valid.', 400, fields);
}

/** Map unknown DB/runtime errors to safe codes. Returns [code, messageId,
 *  status]. Reads provider `code` fields and falls back to constraint message
 *  families, but never returns or logs the internal/provider message. */
export function mapDbError(e: unknown): [ErrorCode, string, ContentfulStatusCode] {
  const record = (e ?? {}) as { code?: unknown; message?: unknown; cause?: unknown };
  const code = typeof record.code === 'string' ? record.code : '';
  const cause = (record.cause ?? {}) as { code?: unknown; message?: unknown };
  const causeCode = typeof cause.code === 'string' ? cause.code : '';
  const msg = typeof record.message === 'string'
    ? record.message
    : typeof cause.message === 'string' ? cause.message : '';
  const signature = `${code} ${causeCode} ${msg}`;

  if (/SQLITE_CONSTRAINT_UNIQUE|SQLITE_CONSTRAINT_PRIMARYKEY|UNIQUE|PRIMARY KEY/i.test(signature)) {
    return ['CONFLICT', 'Data sudah ada.', 409];
  }
  if (/SQLITE_CONSTRAINT_FOREIGNKEY|SQLITE_CONSTRAINT_CHECK|SQLITE_CONSTRAINT_NOTNULL|CHECK constraint|NOT NULL|malformed|datatype/i.test(signature)) {
    return ['VALIDATION_ERROR', 'Data tidak valid.', 400];
  }
  if (/SQLITE_BUSY|SQLITE_LOCKED|database is locked|resource temporarily unavailable/i.test(signature)) {
    return ['INTERNAL_ERROR', 'Layanan sedang sibuk. Coba lagi beberapa saat.', 503];
  }
  return ['INTERNAL_ERROR', 'Terjadi kesalahan server.', 500];
}
