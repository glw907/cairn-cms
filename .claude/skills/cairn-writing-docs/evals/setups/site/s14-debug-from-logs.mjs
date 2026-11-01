// Setup for `S14-debug-from-logs`: a Notes admin screen whose add action cannot find its database,
// and a day of Worker logs that record it. The screen was copied from an example that reads an
// `APP_DB` binding; this site binds its notes database as `NOTES_DB`, and a stale `APP_DB` line in
// the generated Worker types is why the copy type-checks. Every add logs
// `admin.action.misconfigured` with `reason: db_not_bound`. The log also holds a stale-edit
// `commit.failed` (`reason: conflict`) on a post, which is the engine working and not the fault.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Replace one exact piece of a file, failing loudly when the fixture's text has moved.
 * @param {string} file
 * @param {string} from
 * @param {string} to
 */
function swap(file, from, to) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes(from)) throw new Error(`setup anchor missing in ${file}: ${from}`);
  writeFileSync(file, text.replace(from, to));
}

const MIGRATION = `-- The notes the admin Notes screen lists.
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const LOAD = `import type { PageServerLoad, Actions } from './$types';
import { env } from 'cloudflare:workers';
import { createSectionAction, requireAccess } from '@glw907/cairn-cms/sveltekit';
import { fail } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';

export const load: PageServerLoad = async (event) => {
  requireAccess(event);
  const db: D1Database | undefined = env.NOTES_DB;
  if (!db) return { notes: [] as { id: number; body: string }[] };
  const { results } = await db
    .prepare('SELECT id, body FROM notes ORDER BY id DESC')
    .all<{ id: number; body: string }>();
  return { notes: results };
};

const sectionAction = createSectionAction<Env, D1Database>({
  resolveDb: (workerEnv: Env | undefined) => workerEnv?.APP_DB,
});

export const actions: Actions = {
  add: sectionAction(
    async ({ form, ctx }) => {
      const body = String(form.get('body') ?? '').trim();
      if (!body) return fail(400, { error: 'missing' });
      await ctx.db.prepare('INSERT INTO notes (body) VALUES (?)').bind(body).run();
      ctx.audit({ detail: body.slice(0, 40) });
      return { added: true };
    },
    { action: 'create', entity: 'note' },
  ),
};
`;

const PAGE = `<!-- @component The Notes admin screen: a form that adds a note and the list of notes. -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { CsrfField } from '@glw907/cairn-cms/admin';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<h1 class="type-title">Notes</h1>

<form method="POST" action="?/add" class="my-4 flex items-end gap-2" use:enhance>
  <CsrfField />
  <label class="flex flex-col gap-label">
    <span class="type-body font-medium">Note</span>
    <input name="body" class="input" />
  </label>
  <button class="btn btn-primary">Add</button>
</form>

<p role="status" aria-live="polite" class="type-body">
  {#if form?.error}{form.error}{:else if form?.added}Note added.{/if}
</p>

<ul role="list" class="flex flex-col gap-2">
  {#each data.notes as note (note.id)}
    <li role="listitem">{note.body}</li>
  {/each}
</ul>
`;

/** One structured record in the engine's envelope. */
const rec = (level, event, timestamp, fields) => JSON.stringify({ level, event, timestamp, ...fields });

const LOGS = [
  rec('info', 'auth.session.created', '2026-10-30T14:02:11.402Z', { email: 'dana@example.com' }),
  rec('info', 'commit.succeeded', '2026-10-30T14:04:37.118Z', { concept: 'posts', id: 'ridge-route', editor: 'dana@example.com', branch: 'cairn/posts/ridge-route' }),
  rec('warn', 'commit.failed', '2026-10-30T14:19:52.760Z', { concept: 'posts', id: 'spring-thaw', editor: 'sam@example.com', reason: 'conflict', branch: 'cairn/posts/spring-thaw' }),
  rec('info', 'commit.succeeded', '2026-10-30T14:21:09.331Z', { concept: 'posts', id: 'spring-thaw', editor: 'sam@example.com', branch: 'cairn/posts/spring-thaw' }),
  rec('error', 'admin.action.misconfigured', '2026-10-30T15:44:03.906Z', { path: '/admin/notes', reason: 'db_not_bound' }),
  rec('info', 'auth.session.created', '2026-10-30T16:10:48.077Z', { email: 'sam@example.com' }),
  rec('error', 'admin.action.misconfigured', '2026-10-30T16:12:21.514Z', { path: '/admin/notes', reason: 'db_not_bound' }),
  rec('info', 'commit.succeeded', '2026-10-30T16:30:55.640Z', { concept: 'pages', id: 'about', editor: 'dana@example.com', branch: 'cairn/pages/about' }),
  rec('error', 'admin.action.misconfigured', '2026-10-30T17:01:19.282Z', { path: '/admin/notes', reason: 'db_not_bound' }),
  '',
].join('\n');

/** @param {string} root */
export default function setup(root) {
  swap(
    join(root, 'wrangler.jsonc'),
    '      "migrations_dir": "migrations"\n    }\n  ],',
    '      "migrations_dir": "migrations"\n    },\n    {\n      "binding": "NOTES_DB",\n      "database_name": "cairn-showcase-notes",\n      "database_id": "11111111-1111-1111-1111-111111111111",\n      "migrations_dir": "migrations-notes"\n    }\n  ],',
  );
  // The generated Worker types: NOTES_DB is current, and the APP_DB line is a leftover that
  // `wrangler types` would drop, which is why a read of APP_DB still type-checks.
  swap(join(root, 'worker-configuration.d.ts'), '\tAUTH_DB: D1Database;\n', '\tAUTH_DB: D1Database;\n\tNOTES_DB: D1Database;\n\tAPP_DB: D1Database;\n');
  const config = join(root, 'src/theme/cairn.config.ts');
  swap(config, '  type AssetConfig,\n} from', '  type AssetConfig,\n  defineAccess,\n} from');
  swap(config, '  media,\n', "  media,\n  access: defineAccess(undefined, { '/admin/notes': ['owner', 'editor'] }),\n");

  mkdirSync(join(root, 'migrations-notes'), { recursive: true });
  writeFileSync(join(root, 'migrations-notes/0000_notes.sql'), MIGRATION);
  const dir = join(root, 'src/routes/admin/notes');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '+page.server.ts'), LOAD);
  writeFileSync(join(dir, '+page.svelte'), PAGE);
  mkdirSync(join(root, 'logs'), { recursive: true });
  writeFileSync(join(root, 'logs/worker-logs.jsonl'), LOGS);
}
