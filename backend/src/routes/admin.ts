// Admin API (Super Admin session only). No public registration exists.
// Bootstrap: single-use, body-only token, atomic single-winner via the
// one_active_admin partial unique index (portable SQLite/D1).
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import {
  loginInput, bootstrapInput, slug as slugSchema, publishStatus, readiness,
  serviceSlug, leadState, demoUrl, settingValueSchemas,
  SETTING_KEYS, PUBLIC_SETTINGS_KEYS,
  type KnownSettingKey,
} from '../../../shared/src/index.ts';
import { nowIso, uid } from '../db/types.ts';
import { hashPassword, verifyPassword, newToken, sha256Hex, safeEqualHex } from '../auth/passwords.ts';
import { loginLimiter, bootstrapLimiter, requireAdmin, requireCsrf, setSessionCookie, clearSessionCookie, sessionOf, SID_COOKIE } from '../http/auth.ts';
import { getCookie } from 'hono/cookie';
import type { RequestDeps } from '../http/auth.ts';
import { ok, fail, zodFail, mapDbError } from '../http/errors.ts';
import { findAdminByEmail, createSession, findSession, revokeSession, touchLogin, audit, cleanupSessions } from '../repo/admin.ts';
import { adminList, createRow, updateRow, softDeleteRow, getById, pickAllowed } from '../repo/content.ts';
import type { EditorialTable } from '../repo/content.ts';
import { listLeads, getLead, setLeadState, softDeleteLead } from '../repo/leads.ts';
import { getAllSettings, putSetting } from '../repo/settings.ts';

export interface AdminDeps extends RequestDeps {
  bootstrapToken: string;
  sessionTtlHours: number;
}

const BOOTSTRAP_DISABLED = 'Bootstrap tidak tersedia.';
const INVALID_CREDENTIALS = 'Email atau kata sandi salah.';

const MODULES: Record<string, EditorialTable> = {
  services: 'services',
  products: 'products',
  portfolio: 'portfolio_items',
  articles: 'articles',
  pricing: 'pricing_packages',
};

const createSchemas: Record<EditorialTable, z.AnyZodObject> = {
  services: z.object({
    slug: serviceSlug, title_id: z.string().trim().min(2).max(160), category: serviceSlug,
    summary_id: z.string().trim().max(500).nullish(), body_id: z.string().trim().max(20000).nullish(),
    icon_key: z.string().trim().max(120).nullish(), sort_order: z.number().int().default(0),
    status: publishStatus.default('draft'),
  }),
  products: z.object({
    slug: slugSchema, name_id: z.string().trim().min(2).max(160),
    tagline_id: z.string().trim().max(200).nullish(), description_id: z.string().trim().max(20000).nullish(),
    features_id: z.string().trim().max(20000).nullish(), image_url: z.string().trim().max(500).nullish(),
    image_key: z.string().trim().max(500).nullish(), cta_label_id: z.string().trim().max(120).nullish(),
    cta_destination: z.string().trim().max(500).nullish(), demo_url: demoUrl,
    readiness: readiness.default('in_development'), status: publishStatus.default('draft'),
  }),
  portfolio_items: z.object({
    slug: slugSchema, title_id: z.string().trim().min(2).max(160),
    client_name: z.string().trim().max(160).nullish(), summary_id: z.string().trim().max(500).nullish(),
    body_id: z.string().trim().max(20000).nullish(), cover_image_url: z.string().trim().max(500).nullish(),
    cover_image_key: z.string().trim().max(500).nullish(), gallery_json: z.string().trim().max(20000).nullish(),
    service_ref: z.string().trim().max(120).nullish(), completed_on: z.string().trim().max(30).nullish(),
    sort_order: z.number().int().default(0), status: publishStatus.default('draft'),
  }),
  articles: z.object({
    slug: slugSchema, title_id: z.string().trim().min(2).max(200),
    excerpt_id: z.string().trim().max(500).nullish(), body_id: z.string().trim().max(50000).nullish(),
    cover_image_url: z.string().trim().max(500).nullish(), cover_image_key: z.string().trim().max(500).nullish(),
    status: publishStatus.default('draft'),
  }),
  pricing_packages: z.object({
    slug: slugSchema, service_ref: z.string().trim().max(120).nullish(),
    name_id: z.string().trim().min(2).max(160), price_amount: z.number().int().nonnegative().nullish(),
    price_currency: z.string().trim().max(10).default('IDR'), is_custom_quote: z.number().int().default(0),
    features_id: z.string().trim().max(20000).nullish(), limits_id: z.string().trim().max(20000).nullish(),
    cta_destination: z.string().trim().max(500).nullish(), is_highlighted: z.number().int().default(0),
    sort_order: z.number().int().default(0), status: publishStatus.default('draft'),
  }),
};

const settingsPutSchema = z.object({
  key: z.string().trim().min(2).max(80),
  value_json: z.string().trim().min(1).max(20000),
  is_public: z.boolean().default(false),
}).superRefine((v, ctx) => {
  if (!(SETTING_KEYS as readonly string[]).includes(v.key)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Kunci pengaturan tidak dikenal.', path: ['key'] });
  }
});

const contentListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  status: publishStatus.optional(),
  q: z.string().trim().min(1).max(200).optional(),
}).strict();

const leadsListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  state: leadState.optional(),
}).strict();

function queryValues(c: Context): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(c.req.query())) {
    if (value !== '') out[key] = value;
  }
  return out;
}

function failDb(c: Context, error: unknown) {
  const [code, messageId, status] = mapDbError(error);
  return fail(c, code, messageId, status);
}

function sessionCookieMaxAge(deps: AdminDeps): number {
  return deps.sessionTtlHours * 3600;
}

export function adminRoutes(deps: AdminDeps) {
  const app = new Hono();

  // ---- auth (rate-limited; login/bootstrap have their own limiters) ----
  app.post('/auth/login', async (c) => {
    if (!loginLimiter.take(`login:${deps.clientIp(c)}`)) {
      return fail(c, 'RATE_LIMITED', 'Terlalu banyak percobaan. Coba lagi nanti.', 429);
    }
    let body: unknown;
    try { body = await c.req.json(); } catch { return fail(c, 'VALIDATION_ERROR', 'Data tidak valid.', 400); }
    const parsed = loginInput.safeParse(body);
    if (!parsed.success) return zodFail(c, parsed.error);
    const email = parsed.data.email.toLowerCase();
    try {
      const admin = await findAdminByEmail(deps.db, email);
      if (!admin || !(await verifyPassword(parsed.data.password, admin.password_hash))) {
        // Existing audit schema/conventions; never include the password.
        await audit(deps.db, email, 'login.failed', undefined);
        return fail(c, 'UNAUTHENTICATED', INVALID_CREDENTIALS, 401);
      }
      const raw = newToken();
      const expires = new Date(Date.now() + sessionCookieMaxAge(deps) * 1000).toISOString();
      await cleanupSessions(deps.db);
      await createSession(deps.db, admin.id, sha256Hex(raw), newToken(16), expires);
      await touchLogin(deps.db, admin.id);
      await audit(deps.db, admin.email, 'login', undefined);
      setSessionCookie(c, deps, raw, sessionCookieMaxAge(deps));
      const session = await findSession(deps.db, sha256Hex(raw));
      return ok(c, { email: admin.email, role: 'super_admin', csrf_token: session?.csrf_token ?? '' });
    } catch (e) {
      return failDb(c, e);
    }
  });

  app.post('/auth/logout', requireAdmin(deps), requireCsrf, async (c) => {
    const raw = getCookie(c, SID_COOKIE);
    if (raw) await revokeSession(deps.db, sha256Hex(raw));
    clearSessionCookie(c, deps);
    return ok(c, { logged_out: true });
  });

  app.get('/auth/me', requireAdmin(deps), async (c) => {
    const s = sessionOf(c) as { email: string; csrfToken: string };
    return ok(c, { email: s.email, role: 'super_admin', csrf_token: s.csrfToken });
  });

  app.post('/auth/bootstrap', async (c) => {
    if (!bootstrapLimiter.take(`bootstrap:${deps.clientIp(c)}`)) {
      return fail(c, 'RATE_LIMITED', 'Terlalu banyak percobaan. Coba lagi nanti.', 429);
    }
    let body: unknown;
    try { body = await c.req.json(); } catch { return fail(c, 'FORBIDDEN', BOOTSTRAP_DISABLED, 403); }
    const parsed = bootstrapInput.safeParse(body);
    if (!parsed.success) return fail(c, 'FORBIDDEN', BOOTSTRAP_DISABLED, 403);
    // Token check first (timing-safe); identical 403 whether wrong or consumed.
    const expected = sha256Hex(deps.bootstrapToken);
    const provided = sha256Hex(parsed.data.bootstrap_token);
    if (!safeEqualHex(expected, provided)) return fail(c, 'FORBIDDEN', BOOTSTRAP_DISABLED, 403);
    try {
      const now = nowIso();
      const adminId = uid('adm');
      const email = parsed.data.email.toLowerCase();
      const hash = await hashPassword(parsed.data.password);
      // Atomic single-winner: one_active_admin partial unique index rejects
      // concurrent second inserts on BOTH SQLite and D1.
      await deps.db.run(
        'INSERT INTO admin_users (id,email,password_hash,role,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
        [adminId, email, hash, 'super_admin', 1, now, now],
      );
      const raw = newToken();
      const expires = new Date(Date.now() + sessionCookieMaxAge(deps) * 1000).toISOString();
      await cleanupSessions(deps.db);
      await createSession(deps.db, adminId, sha256Hex(raw), newToken(16), expires);
      await audit(deps.db, email, 'bootstrap', adminId);
      setSessionCookie(c, deps, raw, sessionCookieMaxAge(deps));
      const session = await findSession(deps.db, sha256Hex(raw));
      return ok(c, { email, role: 'super_admin', csrf_token: session?.csrf_token ?? '' });
    } catch (e) {
      const [code] = mapDbError(e);
      if (code === 'CONFLICT') return fail(c, 'FORBIDDEN', BOOTSTRAP_DISABLED, 403);
      return failDb(c, e);
    }
  });

  // ---- protected admin surface ----
  // Session gate for everything below; CSRF gate for every state-changing
  // request (login + bootstrap carry their own rate limits instead).
  app.use('/*', requireAdmin(deps));
  app.use('/*', async (c, next) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(c.req.method)) {
      return requireCsrf(c, next);
    }
    await next();
  });

  for (const [resource, table] of Object.entries(MODULES)) {
    app.get(`/${resource}`, async (c) => {
      const query = contentListQuery.safeParse(queryValues(c));
      if (!query.success) return zodFail(c, query.error);
      try {
        const { items, total } = await adminList(deps.db, table, {
          page: query.data.page, perPage: query.data.per_page, status: query.data.status, q: query.data.q,
        });
        return ok(c, items, { total, page: query.data.page });
      } catch (e) {
        return failDb(c, e);
      }
    });
    app.post(`/${resource}`, async (c) => {
      let body: unknown;
      try { body = await c.req.json(); } catch { return fail(c, 'VALIDATION_ERROR', 'Data tidak valid.', 400); }
      const parsed = createSchemas[table].safeParse(body);
      if (!parsed.success) return zodFail(c, parsed.error);
      if (table === 'services' && parsed.data['slug'] !== parsed.data['category']) {
        return fail(c, 'VALIDATION_ERROR', 'Data tidak valid.', 400, {
          slug: 'Slug layanan harus sama dengan kategori.',
          category: 'Kategori layanan harus sama dengan slug.',
        });
      }
      try {
        const id = uid(table.slice(0, 3));
        const fields = pickAllowed(table, parsed.data as Record<string, unknown>);
        await createRow(deps.db, table, id, fields);
        const row = await getById(deps.db, table, id);
        const s = sessionOf(c) as { email: string };
        await audit(deps.db, s.email, `${resource}.create`, id);
        return ok(c, row, undefined, 201);
      } catch (e) {
        return failDb(c, e);
      }
    });
    app.get(`/${resource}/:id`, async (c) => {
      try {
        const row = await getById(deps.db, table, c.req.param('id'));
        if (!row) return fail(c, 'NOT_FOUND', 'Data tidak ditemukan.', 404);
        return ok(c, row);
      } catch (e) {
        return failDb(c, e);
      }
    });
    app.patch(`/${resource}/:id`, async (c) => {
      let body: unknown;
      try { body = await c.req.json(); } catch { return fail(c, 'VALIDATION_ERROR', 'Data tidak valid.', 400); }
      const parsed = createSchemas[table].partial().safeParse(body);
      if (!parsed.success) return zodFail(c, parsed.error);
      try {
        const fields = pickAllowed(table, parsed.data as Record<string, unknown>);
        delete (fields as Record<string, unknown>)['id'];
        if (table === 'services' && (fields['slug'] !== undefined || fields['category'] !== undefined)) {
          const current = await getById(deps.db, table, c.req.param('id'));
          if (!current) return fail(c, 'NOT_FOUND', 'Data tidak ditemukan.', 404);
          const nextSlug = fields['slug'] ?? current['slug'];
          const nextCategory = fields['category'] ?? current['category'];
          if (nextSlug !== nextCategory) {
            return fail(c, 'VALIDATION_ERROR', 'Data tidak valid.', 400, {
              slug: 'Slug layanan harus sama dengan kategori.',
              category: 'Kategori layanan harus sama dengan slug.',
            });
          }
        }
        const updated = await updateRow(deps.db, table, c.req.param('id'), fields);
        if (!updated) return fail(c, 'NOT_FOUND', 'Data tidak ditemukan.', 404);
        const s = sessionOf(c) as { email: string };
        await audit(deps.db, s.email, `${resource}.update`, c.req.param('id'));
        return ok(c, await getById(deps.db, table, c.req.param('id')));
      } catch (e) {
        return failDb(c, e);
      }
    });
    app.delete(`/${resource}/:id`, async (c) => {
      try {
        const deleted = await softDeleteRow(deps.db, table, c.req.param('id'));
        if (!deleted) return fail(c, 'NOT_FOUND', 'Data tidak ditemukan.', 404);
        const s = sessionOf(c) as { email: string };
        await audit(deps.db, s.email, `${resource}.delete`, c.req.param('id'));
        return ok(c, { deleted: true });
      } catch (e) {
        return failDb(c, e);
      }
    });
  }

  // ---- leads ----
  app.get('/leads', async (c) => {
    const query = leadsListQuery.safeParse(queryValues(c));
    if (!query.success) return zodFail(c, query.error);
    try {
      const { items, total } = await listLeads(deps.db, {
        state: query.data.state, page: query.data.page, perPage: query.data.per_page,
      });
      return ok(c, items, { total, page: query.data.page });
    } catch (e) {
      return failDb(c, e);
    }
  });
  app.get('/leads/:id', async (c) => {
    try {
      const row = await getLead(deps.db, c.req.param('id'));
      if (!row) return fail(c, 'NOT_FOUND', 'Data tidak ditemukan.', 404);
      return ok(c, row);
    } catch (e) {
      return failDb(c, e);
    }
  });
  app.patch('/leads/:id', async (c) => {
    let body: unknown;
    try { body = await c.req.json(); } catch { return fail(c, 'VALIDATION_ERROR', 'Data tidak valid.', 400); }
    const parsed = z.object({ state: leadState }).safeParse(body);
    if (!parsed.success) return zodFail(c, parsed.error);
    const s = sessionOf(c) as { email: string };
    try {
      const updated = await setLeadState(deps.db, c.req.param('id'), parsed.data.state, s.email);
      if (!updated) return fail(c, 'NOT_FOUND', 'Data tidak ditemukan.', 404);
      await audit(deps.db, s.email, 'leads.update', c.req.param('id'));
      return ok(c, await getLead(deps.db, c.req.param('id')));
    } catch (e) {
      return failDb(c, e);
    }
  });
  app.delete('/leads/:id', async (c) => {
    const s = sessionOf(c) as { email: string };
    try {
      const deleted = await softDeleteLead(deps.db, c.req.param('id'));
      if (!deleted) return fail(c, 'NOT_FOUND', 'Data tidak ditemukan.', 404);
      await audit(deps.db, s.email, 'leads.delete', c.req.param('id'));
      return ok(c, { deleted: true });
    } catch (e) {
      return failDb(c, e);
    }
  });

  // ---- settings ----
  app.get('/settings', async (c) => {
    try {
      return ok(c, await getAllSettings(deps.db));
    } catch (e) {
      return failDb(c, e);
    }
  });
  app.put('/settings', async (c) => {
    let body: unknown;
    try { body = await c.req.json(); } catch { return fail(c, 'VALIDATION_ERROR', 'Data tidak valid.', 400); }
    const parsed = settingsPutSchema.safeParse(body);
    if (!parsed.success) return zodFail(c, parsed.error);

    const key = parsed.data.key as KnownSettingKey;
    if (parsed.data.is_public && !(PUBLIC_SETTINGS_KEYS as readonly string[]).includes(key)) {
      return fail(c, 'VALIDATION_ERROR', 'Data tidak valid.', 400, {
        is_public: 'Kunci ini tidak termasuk allowlist publik.',
      });
    }
    let value: unknown;
    try { value = JSON.parse(parsed.data.value_json); } catch {
      return fail(c, 'VALIDATION_ERROR', 'Data tidak valid.', 400, {
        value_json: 'Nilai harus berupa JSON yang valid.',
      });
    }
    const parsedValue = settingValueSchemas[key].safeParse(value);
    if (!parsedValue.success) {
      const first = parsedValue.error.issues[0];
      return fail(c, 'VALIDATION_ERROR', 'Data tidak valid.', 400, {
        value_json: first?.message ?? 'Nilai pengaturan tidak valid.',
      });
    }

    const s = sessionOf(c) as { email: string };
    try {
      const normalized = JSON.stringify(parsedValue.data);
      await putSetting(deps.db, key, normalized, parsed.data.is_public, s.email);
      await audit(deps.db, s.email, 'settings.put', key);
      return ok(c, { key });
    } catch (e) {
      return failDb(c, e);
    }
  });

  return app;
}

