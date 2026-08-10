// One-off, dev-only: migrate a site's legacy AUTH_KV editor allowlist into its better-auth D1
// `user` table. Each KV `editor:<email>` → `value` becomes a user row (the user table IS the
// allowlist under disableSignUp). Idempotent: INSERT OR IGNORE keys on the unique email, so
// re-running is safe and skips already-migrated editors.
//
//   node scripts/migrate-allowlist.mjs <kv-namespace-id> <d1-db-name> [--local|--remote]
//
// Defaults to --local. Pass --remote for the production cutover (Phase 6). KV values are either
// the current JSON shape ({"name","role"}) or a legacy bare display-name string (⇒ role editor).
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const [, , kvId, d1Name, ...flags] = process.argv;
if (!kvId || !d1Name) {
  console.error('usage: migrate-allowlist.mjs <kv-namespace-id> <d1-db-name> [--local|--remote]');
  process.exit(1);
}
const scope = flags.includes('--remote') ? '--remote' : '--local';

const wrangler = (args) => execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8' });

// `wrangler kv key list` emits a JSON array (after any banner line); parse leniently.
const listRaw = wrangler(['kv', 'key', 'list', '--namespace-id', kvId, scope]);
const keys = JSON.parse(listRaw.slice(listRaw.indexOf('[')));
const editors = keys.map((k) => k.name).filter((n) => n.startsWith('editor:'));

console.log(`${editors.length} editor entr${editors.length === 1 ? 'y' : 'ies'} in KV (${scope})`);

for (const key of editors) {
  const email = key.slice('editor:'.length).toLowerCase();
  const raw = wrangler(['kv', 'key', 'get', key, '--namespace-id', kvId, scope]).trim();
  let name = raw;
  let role = 'editor';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.name === 'string') {
      name = parsed.name;
      role = parsed.role === 'owner' ? 'owner' : 'editor';
    }
  } catch {
    // legacy bare display-name string ⇒ editor (already the defaults)
  }
  const sql =
    `INSERT OR IGNORE INTO user (id,name,email,email_verified,created_at,updated_at,role) ` +
    `VALUES ('${randomUUID()}','${name.replace(/'/g, "''")}','${email}',1,` +
    `unixepoch()*1000,unixepoch()*1000,'${role}')`;
  wrangler(['d1', 'execute', d1Name, scope, '--command', sql]);
  console.log(`  ✓ ${email} (${role})`);
}
console.log('done.');
