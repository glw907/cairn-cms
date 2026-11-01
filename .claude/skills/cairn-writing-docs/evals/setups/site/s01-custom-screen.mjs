// Setup for `S01-custom-screen`: give the emitted site the developer database the screen reads.
// It adds an `items` table in its own `migrations-app/` directory, binds the database as `APP_DB`
// in `wrangler.jsonc` with that directory, and adds `APP_DB` to the generated Worker `Env`, the
// three pieces the example site's signups screen has and the template excludes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATION = `-- The site's own table, outside cairn's auth store. Its own migrations directory, since
-- \`wrangler d1 migrations apply\` walks one directory per database.
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const BINDING = `"migrations_dir": "migrations"
    },
    {
      // The site's own database, holding the items table. Its own migrations_dir, never
      // "migrations", so neither database receives the other's schema.
      "binding": "APP_DB",
      "database_name": "cairn-showcase-app",
      "database_id": "00000000-0000-0000-0000-000000000001",
      "migrations_dir": "migrations-app"
    }
  ],`;

/** @param {string} root */
export default function setup(root) {
  mkdirSync(join(root, 'migrations-app'), { recursive: true });
  writeFileSync(join(root, 'migrations-app/0000_items.sql'), MIGRATION);

  const wranglerPath = join(root, 'wrangler.jsonc');
  const wrangler = readFileSync(wranglerPath, 'utf8');
  const authEnd = /"migrations_dir": "migrations"\s*\}\s*\],/;
  if (!authEnd.test(wrangler)) throw new Error('wrangler.jsonc: the AUTH_DB entry did not match');
  writeFileSync(wranglerPath, wrangler.replace(authEnd, BINDING));

  const typesPath = join(root, 'worker-configuration.d.ts');
  const types = readFileSync(typesPath, 'utf8');
  if (!types.includes('\tAUTH_DB: D1Database;\n')) throw new Error('worker-configuration.d.ts: no AUTH_DB member');
  writeFileSync(typesPath, types.replace('\tAUTH_DB: D1Database;\n', '\tAUTH_DB: D1Database;\n\tAPP_DB: D1Database;\n'));
}
