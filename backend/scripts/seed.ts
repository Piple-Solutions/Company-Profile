// npm run seed — draft-only development seeds. Fake [SEED] data, NOTHING
// published (seed-guard): public site shows empty states until the Super
// Admin publishes. No real contact data. Rerunnable (INSERT OR IGNORE).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.ts';
import { SqliteAdapter } from '../src/db/sqlite.ts';
import { migrate } from '../src/db/migrate.ts';
import { nowIso } from '../src/db/types.ts';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = loadConfig(backendDir);
const db = new SqliteAdapter(path.resolve(backendDir, config.databaseFile));
await migrate(db, path.join(backendDir, 'db', 'migrations'));

const T0 = nowIso();
const SLUGS = ['website-company-profile', 'website-development', 'mobile-development', 'custom-systems', 'pos-systems', 'erp', 'wedding-planning'];
for (let i = 0; i < SLUGS.length; i++) {
  await db.run(
    `INSERT OR IGNORE INTO services (id,slug,title_id,category,summary_id,status,created_at,updated_at)
     VALUES (?,?,?,?,?,'draft',?,?)`,
    [`seed-svc-${i + 1}`, SLUGS[i], `Layanan contoh ${i + 1} [SEED]`, SLUGS[i], `Ringkasan contoh [SEED]`, T0, T0],
  );
}
const PRODUCTS: Array<[string, string, string]> = [
  ['seed-prd-1', 'pos-kasir-otomatis', 'POS Kasir Otomatis'],
  ['seed-prd-2', 'pos-pemesanan-penginapan', 'POS Pemesanan Penginapan'],
  ['seed-prd-3', 'erp-laundry', 'ERP Laundry'],
];
for (const [id, slug, name] of PRODUCTS) {
  await db.run(
    `INSERT OR IGNORE INTO products (id,slug,name_id,tagline_id,status,readiness,created_at,updated_at)
     VALUES (?,?,?,'Contoh tagline [SEED]','draft','in_development',?,?)`,
    [id, slug, `${name} [SEED]`, T0, T0],
  );
}
await db.run(
  `INSERT OR IGNORE INTO settings (key,value_json,is_public,updated_at,updated_by)
   VALUES ('site_name','"PipleSolution [SEED]"',1,?, 'seed'),('seo_defaults','{"title_suffix":"[SEED]","description":"Contoh deskripsi [SEED]"}',1,?, 'seed')`,
  [T0, T0],
);
const counts = await db.get<{ s: number; p: number }>(
  'SELECT (SELECT COUNT(*) FROM services) AS s, (SELECT COUNT(*) FROM products) AS p',
);
console.log(`[seed] draft-only seeds ok (services=${counts?.s ?? 0}, products=${counts?.p ?? 0}); nothing published.`);
db.close();
