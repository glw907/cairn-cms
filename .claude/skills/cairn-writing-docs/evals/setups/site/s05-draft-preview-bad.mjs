// Known-bad for `S05-draft-preview`: the review screen builds its share link from the entry's
// concept and id and the request's host. The link is guessable, never expires, is never stored,
// and the built-in Share preview links keep their default lifetime.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = {
  'src/routes/admin/review/+page.server.ts': `import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  share: async ({ request, url }) => {
    const form = await request.formData();
    const id = String(form.get('entryId') ?? '');
    if (!id) return fail(400, { error: 'missing' });
    const token = btoa(\`posts:\${id}\`);
    return { link: \`\${url.origin}/preview/\${token}\` };
  },
};
`,
  'src/routes/admin/review/+page.svelte': `<script lang="ts">
  let { form }: { form: { link?: string } | null } = $props();
</script>

<form method="POST" action="?/share">
  <input name="entryId" class="input" />
  <button class="btn">Get link</button>
</form>
{#if form?.link}<p>{form.link}</p>{/if}
`,
};

/** @param {string} root */
export default function bad(root) {
  for (const [rel, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
}
