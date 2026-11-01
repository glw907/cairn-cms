// Known-bad for `S14-debug-from-logs`: the session follows the misconfiguration record to "declare
// the binding" and adds an `APP_DB` database beside `NOTES_DB`, leaving `resolveDb` reading
// `APP_DB`. The add action now finds an empty second database that no migration creates a table
// in, the notes list still reads `NOTES_DB`, and a bare console.log stands in for the structured log.
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
    },
    {
      "binding": "NOTES_DB",
      "database_name": "cairn-showcase-notes",
      "database_id": "11111111-1111-1111-1111-111111111111",
      "migrations_dir": "migrations-notes"
    },
    {
      "binding": "APP_DB",
      "database_name": "cairn-showcase-app",
      "database_id": "22222222-2222-2222-2222-222222222222"
    }
  ]
}
`,
  'src/routes/admin/notes/+page.server.ts': `import type { Actions } from './$types';
import { createSectionAction } from '@glw907/cairn-cms/sveltekit';
import type { D1Database } from '@cloudflare/workers-types';

const sectionAction = createSectionAction<Env, D1Database>({
  resolveDb: (workerEnv: Env | undefined) => {
    console.log('notes db', workerEnv?.APP_DB);
    return workerEnv?.APP_DB;
  },
});

export const actions: Actions = {
  add: sectionAction(
    async ({ form, ctx }) => {
      await ctx.db.prepare('INSERT INTO notes (body) VALUES (?)').bind(String(form.get('body'))).run();
      ctx.audit({ detail: 'note' });
      return { added: true };
    },
    { action: 'create', entity: 'note' },
  ),
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
