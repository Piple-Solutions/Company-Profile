// Public API (unauthenticated). Published + non-deleted rows only.
// Inquiry POST: validated, rate-limited, honeypot-aware, safe errors.
import { Hono } from 'hono';
import { inquiryInput, demoStateFor, readiness } from '../../../shared/src/index.ts';
import type { DbPort } from '../db/types.ts';
import { nowIso, uid } from '../db/types.ts';
import { listPublic, getPublicBySlug } from '../repo/content.ts';
import type { EditorialTable } from '../repo/content.ts';
import { createLead } from '../repo/leads.ts';
import { getPublicSettings } from '../repo/settings.ts';
import { ok, fail, zodFail } from '../http/errors.ts';
import { inquiryLimiter, publicMutationGuard } from '../http/auth.ts';
import { requestBodyLimit } from '../http/body-limit.ts';
import type { ClientIpResolver } from '../http/client-ip.ts';

export interface PublicDeps {
  db: DbPort;
  frontendOrigin: string;
  clientIp: ClientIpResolver;
}

const PUBLIC_TABLES: Record<string, EditorialTable> = {
  services: 'services',
  products: 'products',
  portfolio: 'portfolio_items',
  articles: 'articles',
  pricing: 'pricing_packages',
};

export function publicRoutes(deps: PublicDeps) {
  const app = new Hono();

  for (const [resource, table] of Object.entries(PUBLIC_TABLES)) {
    app.get(`/${resource}`, async (c) => {
      const items = await listPublic(deps.db, table);
      if (resource === 'products') {
        return ok(c, items.map((p) => ({
          ...p,
          demo_state: demoStateFor(
            readiness.parse(p['readiness'] ?? 'in_development'),
            typeof p['demo_url'] === 'string' ? (p['demo_url'] as string) : null,
          ),
        })));
      }
      return ok(c, items);
    });
    app.get(`/${resource}/:slug`, async (c) => {
      const item = await getPublicBySlug(deps.db, table, c.req.param('slug'));
      if (!item) return fail(c, 'NOT_FOUND', 'Data tidak ditemukan.', 404);
      if (resource === 'products') {
        return ok(c, {
          ...item,
          demo_state: demoStateFor(
            readiness.parse(item['readiness'] ?? 'in_development'),
            typeof item['demo_url'] === 'string' ? (item['demo_url'] as string) : null,
          ),
        });
      }
      return ok(c, item);
    });
  }

  app.get('/settings/public', async (c) => ok(c, await getPublicSettings(deps.db)));

  app.post(
    '/inquiries',
    requestBodyLimit(64 * 1024),
    publicMutationGuard([deps.frontendOrigin]),
    async (c) => {
      if (!inquiryLimiter.take(`inquiry:${deps.clientIp(c)}`)) {
        return fail(c, 'RATE_LIMITED', 'Terlalu banyak pengiriman. Coba lagi nanti.', 429);
      }
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return fail(c, 'VALIDATION_ERROR', 'Data tidak valid.', 400);
      }
      const parsed = inquiryInput.safeParse(body);
      if (!parsed.success) return zodFail(c, parsed.error);
      const input = parsed.data;
      // Honeypot: pretend success without storing (no oracle for bots).
      if (input.website && input.website.length > 0) {
        return ok(c, { id: `lead_${'0'.repeat(20)}`, state: 'new' }, undefined, 201);
      }
      const name = input.name.trim().replace(/\s+/g, ' ');
      const contact = input.contact.trim().toLowerCase();
      const message = input.message.trim().replace(/\s+/g, ' ');
      const id = uid('lead');
      await createLead(deps.db, {
        id,
        name,
        contact,
        company: input.company?.trim() || null,
        need_category: input.need_category,
        message,
        source_page: c.req.header('referer')?.slice(0, 300) ?? null,
        consent_at: nowIso(),
      });
      return ok(c, { id, state: 'new' }, undefined, 201);
    },
  );

  return app;
}

