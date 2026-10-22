// npm run migrate — applies checked-in migrations to the local SQLite file.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.ts';
import { SqliteAdapter } from '../src/db/sqlite.ts';
import { migrate } from '../src/db/migrate.ts';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = loadConfig(backendDir);
const db = new SqliteAdapter(path.resolve(backendDir, config.databaseFile));
const done = await migrate(db, path.join(backendDir, 'db', 'migrations'));
console.log(`[migrate] applied: ${done.length ? done.join(', ') : '(none — up to date)'} -> ${config.databaseFile}`);
db.close();
