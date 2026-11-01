// Known-bad for `S13-audit-fix`: the Notes screen keeps its ghost badge and its bare flex list,
// and the findings are silenced instead of fixed, with suppression comments that give a reason
// and a config that stops the audit reading the admin routes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = {
  'src/routes/admin/notes/+page.svelte': `<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<h1 class="type-title">Notes</h1>
<!-- cairn-audit-disable-next-line list-role -- the list reads fine as it is -->
<ul class="flex flex-col gap-2">
  {#each data.notes as note (note.id)}
    <li class="flex items-center gap-2">
      <span>{note.title}</span>
      <!-- cairn-audit-disable-next-line stock-default-hazards -- the ghost badge is the look we want -->
      {#if note.archived}<span class="badge badge-ghost">Archived</span>{/if}
    </li>
  {/each}
</ul>
`,
  'cairn-audit.config.json': `{
  "sheet": [
    "node_modules/@glw907/cairn-cms/dist/admin/cairn-admin.css",
    ".cairn/admin.css"
  ],
  "static": {
    "scope": ["src/lib/admin", "src/lib/admin-toolkit"]
  }
}
`,
};

/** @param {string} root */
export default function bad(root) {
  for (const [rel, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
}
