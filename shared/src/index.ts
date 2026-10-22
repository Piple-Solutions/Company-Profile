// Shared contracts (single source; backend validates, frontend mirrors).
// Mirrors docs/API.md §2/§5. Bahasa Indonesia messages; stable codes.
import { z } from 'zod';

export const serviceSlug = z.enum([
  'website-company-profile',
  'website-development',
  'mobile-development',
  'custom-systems',
  'pos-systems',
  'erp',
  'wedding-planning',
]);
export type ServiceSlug = z.infer<typeof serviceSlug>;

export const publishStatus = z.enum(['draft', 'published', 'archived']);
export type PublishStatus = z.infer<typeof publishStatus>;

export const readiness = z.enum(['available', 'in_development', 'coming_soon']);
export type Readiness = z.infer<typeof readiness>;

export const leadState = z.enum(['new', 'in_progress', 'closed']);
export type LeadState = z.infer<typeof leadState>;

export const slug = z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/);

// Per-key settings schemas. Validation happens on write AND defensively on
// public read so malformed legacy values are omitted rather than served.
export const settingValueSchemas = {
  whatsapp_number: z.string().trim().regex(
    /^\+[1-9][0-9]{7,17}$/,
    'Nomor WhatsApp harus format E.164, mis. +6281234567890.',
  ),
  site_name: z.string().trim().min(2, 'Nama situs minimal 2 karakter.').max(80, 'Nama situs maksimal 80 karakter.'),
  seo_defaults: z.object({
    title_suffix: z.string().trim().max(80, 'Akhiran judul maksimal 80 karakter.').optional(),
    description: z.string().trim().max(200, 'Deskripsi SEO maksimal 200 karakter.').optional(),
  }).strict(),
  whatsapp_templates: z.record(
    z.string().trim().min(1).max(80),
    z.string().max(2000, 'Template WhatsApp maksimal 2000 karakter.'),
  ),
} as const;
export type SettingKey = keyof typeof settingValueSchemas;

// Explicit public-settings allowlist — strict: unknown keys REJECTED (D-12/C).
export const publicSettings = z.strictObject({
  whatsapp_number: settingValueSchemas.whatsapp_number.optional(),
  site_name: settingValueSchemas.site_name,
  seo_defaults: settingValueSchemas.seo_defaults.optional(),
});
export type PublicSettings = z.infer<typeof publicSettings>;
export const PUBLIC_SETTINGS_KEYS = ['whatsapp_number', 'site_name', 'seo_defaults'] as const;
export type PublicSettingKey = (typeof PUBLIC_SETTINGS_KEYS)[number];
export const SETTING_KEYS = ['whatsapp_number', 'site_name', 'seo_defaults', 'whatsapp_templates'] as const;
export type KnownSettingKey = (typeof SETTING_KEYS)[number];

// Inquiry — owner fields D-27. Strings are trimmed BEFORE length checks so
// whitespace-only input cannot satisfy minimums. contact carries the email.
export const inquiryInput = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100),
  contact: z.string().trim().email('Email tidak valid').max(160),
  company: z.string().trim().max(120).optional(),
  need_category: z.union([serviceSlug, z.enum(['pos-kasir-otomatis', 'pos-pemesanan-penginapan', 'erp-laundry'])]),
  message: z.string().trim().min(10, 'Deskripsi minimal 10 karakter').max(2000, 'Deskripsi maksimal 2000 karakter'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Persetujuan wajib dicentang' }) }),
  // Honeypot: any filled value is silently accepted WITHOUT storing (the
  // handler pretends success). Rejection here would give bots an oracle.
  website: z.string().trim().max(200).optional(),
});
export type InquiryInput = z.infer<typeof inquiryInput>;

export const loginInput = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(256),
});
export type LoginInput = z.infer<typeof loginInput>;

export const bootstrapInput = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(12).max(256),
  bootstrap_token: z.string().trim().min(16).max(256),
});
export type BootstrapInput = z.infer<typeof bootstrapInput>;

// Demo URL: valid http/https only; unsafe schemes rejected (D-28).
export const demoUrl = z
  .string()
  .trim()
  .url('URL demo tidak valid')
  .max(500)
  .refine((u) => u.startsWith('http://') || u.startsWith('https://'), 'Skema URL harus http/https')
  .nullable()
  .optional();

// Public product demo state (rendered, never stored as readiness override).
export type DemoState = 'coming_soon' | 'live_demo' | 'request_demo';
export function demoStateFor(readinessValue: Readiness, demoUrlValue: string | null | undefined): DemoState {
  if (readinessValue === 'available' && demoUrlValue) return 'live_demo';
  if (demoUrlValue) return 'request_demo';
  return 'coming_soon';
}

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
