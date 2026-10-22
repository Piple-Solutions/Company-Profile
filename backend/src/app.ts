// Hono application factory (shared by dev server, tests, and Workers entry).
// Public reads: published-only. Admin: session + CSRF. Safe error envelope.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { DbPort } from './db/types.ts';
import { publicRoutes } from './routes/public.ts';
import { adminRoutes } from './routes/admin.ts';
import { fail } from './http/errors.ts';
import { requestBodyLimit } from './http/body-limit.ts';
import { createClientIpResolver, type ClientIpResolver } from './http/client-ip.ts';

export interface AppOptions {
  db: DbPort;
  bootstrapToken: string;
  sessionTtlHours: number;
  cookieSecure: boolean;
  frontendOrigin: string;
  /** Explicit trusted-proxy policy. Defaults to the transport peer address. */
  clientIp?: ClientIpResolver;
}

export function createApp(opts: AppOptions) {
  const app = new Hono();
  const clientIp = opts.clientIp ?? createClientIpResolver();

  app.use('*', cors({
    origin: (origin) => (origin === opts.frontendOrigin ? origin : null),
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-CSRF-Token'],
    credentials: true,
  }));
  // Global ceiling; narrower route-specific limits are applied below.
  app.use('/api/*', requestBodyLimit(256 * 1024));
  app.use('/api/v1/admin/*', requestBodyLimit(128 * 1024),
    async (c, next) => {
      await next();
      c.header('Cache-Control', 'no-store');
    });
  app.use('/api/v1/inquiries', requestBodyLimit(64 * 1024));
  app.use('/api/*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('X-Frame-Options', 'SAMEORIGIN');
  });

  app.get('/api/v1/health', (c) => c.json({ data: { ok: true } }));

  app.route(
    '/api/v1',
    publicRoutes({ db: opts.db, frontendOrigin: opts.frontendOrigin, clientIp }),
  );
  app.route(
    '/api/v1/admin',
    adminRoutes({
      db: opts.db,
      bootstrapToken: opts.bootstrapToken,
      sessionTtlHours: opts.sessionTtlHours,
      cookieSecure: opts.cookieSecure,
      clientIp,
    }),
  );

  app.notFound((c) => fail(c, 'NOT_FOUND', 'Data tidak ditemukan.', 404));
  app.onError((e, c) => {
    console.error('[app] unhandled:', e instanceof Error ? e.name : typeof e);
    return fail(c, 'INTERNAL_ERROR', 'Terjadi kesalahan server.', 500);
  });

  return app;
}
