// Server configuration. Secrets come from real env vars or backend/.env
// (gitignored) — never from docs, bundles, or logs. Nothing secret is printed.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export interface AppConfig {
  port: number;
  databaseFile: string;
  bootstrapToken: string;
  sessionSecret: string;
  sessionTtlHours: number;
  cookieSecure: boolean;
  frontendOrigin: string;
  isProd: boolean;
}

function loadDotEnv(dir: string): void {
  const file = path.join(dir, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

function integerEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) throw new Error(`Invalid ${name}: expected an integer.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`Invalid ${name}: expected ${min}-${max}.`);
  }
  return value;
}

function booleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (raw !== 'true' && raw !== 'false') {
    throw new Error(`Invalid ${name}: expected "true" or "false".`);
  }
  return raw === 'true';
}

function productionOrigin(raw: string): string {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('Invalid FRONTEND_ORIGIN: expected a URL.'); }
  if (url.protocol !== 'https:') throw new Error('FRONTEND_ORIGIN must use HTTPS in production.');
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error('FRONTEND_ORIGIN must not point at localhost in production.');
  }
  return url.origin;
}

export function loadConfig(cwd = process.cwd()): AppConfig {
  loadDotEnv(cwd);
  const need = (name: string, fallback?: string): string => {
    const v = process.env[name] ?? fallback;
    if (!v || v.startsWith('[PASTE_')) {
      throw new Error(`Missing required configuration: ${name} (see backend/.env.example)`);
    }
    return v;
  };
  const isProd = process.env['NODE_ENV'] === 'production';
  const frontendOrigin = process.env['FRONTEND_ORIGIN'] ?? 'http://localhost:5173';
  const cookieSecure = booleanEnv('COOKIE_SECURE', false);
  if (isProd && !cookieSecure) {
    throw new Error('COOKIE_SECURE must be "true" in production.');
  }
  return {
    port: integerEnv('PORT', 8787, 1, 65535),
    databaseFile: process.env['DATABASE_FILE'] ?? './dev.db',
    bootstrapToken: need('BOOTSTRAP_TOKEN'),
    sessionSecret: need('SESSION_SECRET'),
    sessionTtlHours: integerEnv('SESSION_TTL_HOURS', 12, 1, 24 * 365),
    cookieSecure,
    frontendOrigin: isProd ? productionOrigin(frontendOrigin) : frontendOrigin,
    isProd,
  };
}
