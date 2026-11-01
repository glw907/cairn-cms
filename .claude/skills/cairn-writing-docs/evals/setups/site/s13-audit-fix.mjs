// Setup for `S13-audit-fix`: a small custom admin screen, Notes, that a teammate added without
// running the design audit. The screen's list suppresses its markers with flex items and no list
// roles, and it marks archived notes with the stock ghost badge, so `npm run check:cairn` exits 1
// with two error-tier findings (`list-role`, `stock-default-hazards`). The fixture's own tree
// audits clean, so the two findings are the whole of the failure.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LOAD = `import type { PageServerLoad } from './$types';

/** The notes the screen lists. A real site reads its own store; this one is a fixed list. */
export const load: PageServerLoad = async () => ({
  notes: [
    { id: 'n1', title: 'Gate code changed', archived: false },
    { id: 'n2', title: 'Spring crew schedule', archived: true },
  ],
});
`;

const PAGE = `<!-- @component The Notes screen: one row per note, with archived notes marked. -->
<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<h1 class="type-title">Notes</h1>
<ul class="flex flex-col gap-2">
  {#each data.notes as note (note.id)}
    <li class="flex items-center gap-2">
      <span>{note.title}</span>
      {#if note.archived}<span class="badge badge-ghost">Archived</span>{/if}
    </li>
  {/each}
</ul>
`;

/** @param {string} root */
export default function setup(root) {
  const dir = join(root, 'src/routes/admin/notes');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '+page.server.ts'), LOAD);
  writeFileSync(join(dir, '+page.svelte'), PAGE);
}
