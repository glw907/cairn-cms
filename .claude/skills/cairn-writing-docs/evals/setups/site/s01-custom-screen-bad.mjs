// Known-bad for `S01-custom-screen`: the screen reads and deletes through APP_DB with plain
// SvelteKit load and action functions. No requireAccess, no createSectionAction, no CSRF field,
// no audit record, and no access-map rule, so any signed-in session can delete a row.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = {
  'src/routes/admin/items/+page.server.ts': `import type { Actions, PageServerLoad } from './$types';
import { env } from 'cloudflare:workers';

interface ItemRow {
  id: number;
  name: string;
}

export const load: PageServerLoad = async () => {
  const { results } = await env.APP_DB.prepare('SELECT id, name FROM items ORDER BY id DESC').all<ItemRow>();
  return { items: results };
};

export const actions: Actions = {
  delete: async ({ request, locals }) => {
    if (!locals.cairnEditor) return { ok: false };
    const form = await request.formData();
    await env.APP_DB.prepare('DELETE FROM items WHERE id = ?').bind(Number(form.get('id'))).run();
    return { ok: true };
  },
};
`,
  'src/routes/admin/items/+page.svelte': `<script lang="ts">
  let { data }: { data: { items: { id: number; name: string }[] } } = $props();
</script>

<h1 class="text-2xl">Items</h1>
<table class="table">
  <tbody>
    {#each data.items as item (item.id)}
      <tr>
        <td>{item.name}</td>
        <td>
          <form method="POST" action="?/delete">
            <input type="hidden" name="id" value={item.id} />
            <button class="btn btn-error btn-sm">Delete</button>
          </form>
        </td>
      </tr>
    {/each}
  </tbody>
</table>
`,
};

/** @param {string} root */
export default function bad(root) {
  for (const [rel, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
}
