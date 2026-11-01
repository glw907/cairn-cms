// Known-bad for `S03-second-sign-in-group`: the members channel reuses the editors' AUTH_DB,
// drops the channel schema into AUTH_DB's own migrations directory, borrows a cairn_ cookie name
// instead of a session cookie of its own, and waves every request through the bot challenge.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = {
  'wrangler.jsonc': `{
  "name": "cairn-showcase",
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "cairn-showcase-auth",
      "database_id": "00000000-0000-0000-0000-000000000000",
      "migrations_dir": "migrations"
    }
  ]
}
`,
  'migrations/0005_channel.sql': `CREATE TABLE IF NOT EXISTS cairn_channel_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cairn_channel_session (id_hash TEXT PRIMARY KEY, subject TEXT NOT NULL, expires_at INTEGER NOT NULL);
`,
  'src/lib/server/member-channel.ts': `import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';
import { memberIdFor } from './roster.js';
import { sendMemberCode } from './mailer.js';

export const memberChannel = createAuthChannel<Cloudflare.Env>({
  resolveDb: (bindings) => bindings?.AUTH_DB,
  deliver: sendMemberCode,
  lookup: memberIdFor,
  normalize: (raw) => raw.trim().toLowerCase(),
  challenge: async () => true,
  cookie: { name: 'cairn_session' },
});
`,
  'src/routes/members/+page.server.ts': `import { redirect } from '@sveltejs/kit';
import { memberChannel } from '#lib/server/member-channel.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const subject = await memberChannel.resolveSubject(event);
  if (!subject) redirect(303, '/members/login');
  return { subject };
};
`,
};

/** @param {string} root */
export default function bad(root) {
  for (const [rel, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
}
