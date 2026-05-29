<script lang="ts">
  // The navigation tree editor (Pass L). Edits a local copy of the menu tree and posts the whole
  // tree as JSON to the `save` action. DaisyUI primitives under the Warm Stone admin theme. Drag a
  // row up or down to reorder within its level; use Indent/Outdent to nest under the previous
  // sibling or promote a level (capped at the menu's maxDepth). The engine validates on save.
  import { untrack } from 'svelte';
  import type { NavLoadData } from '../sveltekit';
  import type { NavNode } from '../nav';

  let { data }: { data: NavLoadData } = $props();

  // A flat, ordered working model is far simpler to drag-edit than a recursive one: each row
  // carries an explicit depth, and the tree is rebuilt from (order + depth) only at submit time.
  interface Row {
    id: number;
    depth: number;
    label: string;
    url: string;
  }

  let nextId = 1;
  function flatten(nodes: NavNode[], depth: number, out: Row[]): Row[] {
    for (const n of nodes) {
      out.push({ id: nextId++, depth, label: n.label, url: n.url ?? '' });
      if (n.children?.length) flatten(n.children, depth + 1, out);
    }
    return out;
  }

  let rows = $state<Row[]>(untrack(() => flatten(data.tree, 0, [])));
  const maxDepthIndex = $derived(data.menu.maxDepth - 1); // depth is 0-based here

  // Rebuild the nested tree from the flat rows by depth, then serialize for the hidden field.
  function toTree(list: Row[]): NavNode[] {
    const root: NavNode[] = [];
    const stack: { depth: number; node: NavNode }[] = [];
    for (const r of list) {
      const node: NavNode = { label: r.label.trim() };
      if (r.url.trim()) node.url = r.url.trim();
      while (stack.length && stack[stack.length - 1].depth >= r.depth) stack.pop();
      if (stack.length) (stack[stack.length - 1].node.children ??= []).push(node);
      else root.push(node);
      stack.push({ depth: r.depth, node });
    }
    return root;
  }

  const treeJson = $derived(JSON.stringify(toTree(rows)));

  function addRow() {
    rows = [...rows, { id: nextId++, depth: 0, label: 'New item', url: '' }];
  }
  function removeRow(id: number) {
    rows = rows.filter((r) => r.id !== id);
  }
  function indent(i: number) {
    // A row may nest at most one level deeper than the row above it, and never past the cap.
    if (i === 0) return;
    const ceiling = Math.min(rows[i - 1].depth + 1, maxDepthIndex);
    if (rows[i].depth < ceiling) rows[i].depth += 1;
  }
  function outdent(i: number) {
    if (rows[i].depth > 0) rows[i].depth -= 1;
  }

  let dragFrom = $state<number | null>(null);
  function onDrop(to: number) {
    if (dragFrom === null || dragFrom === to) return;
    const next = [...rows];
    const [moved] = next.splice(dragFrom, 1);
    next.splice(to, 0, moved);
    rows = next;
    dragFrom = null;
  }
</script>

<div class="cairn-admin">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-semibold">{data.menu.label}</h1>
    <button type="button" class="btn btn-sm" onclick={addRow}>Add item</button>
  </div>

  {#if data.saved}
    <div class="alert alert-success mt-3">Navigation saved.</div>
  {/if}
  {#if data.error}
    <div class="alert alert-error mt-3">{data.error}</div>
  {/if}

  <form method="POST" action="?/save" class="mt-4">
    <input type="hidden" name="tree" value={treeJson} />
    <ul class="menu w-full gap-1">
      {#each rows as row, i (row.id)}
        <li
          draggable="true"
          ondragstart={() => (dragFrom = i)}
          ondragover={(e) => e.preventDefault()}
          ondrop={() => onDrop(i)}
          style={`margin-left:${row.depth * 1.5}rem`}
        >
          <div class="flex items-center gap-2 p-2">
            <span class="cursor-grab opacity-40" aria-hidden="true">&#x283F;</span>
            <input class="input input-sm input-bordered flex-1" placeholder="Label" bind:value={row.label} />
            <input
              class="input input-sm input-bordered flex-1"
              placeholder="/path or https://…"
              list="cairn-nav-pages"
              bind:value={row.url}
            />
            <button type="button" class="btn btn-xs btn-ghost" onclick={() => outdent(i)} aria-label="Outdent">&larr;</button>
            <button type="button" class="btn btn-xs btn-ghost" onclick={() => indent(i)} aria-label="Indent">&rarr;</button>
            <button type="button" class="btn btn-xs btn-ghost text-error" onclick={() => removeRow(row.id)} aria-label="Remove">&times;</button>
          </div>
        </li>
      {/each}
    </ul>

    <datalist id="cairn-nav-pages">
      {#each data.pages as p (p.url)}
        <option value={p.url}>{p.label}</option>
      {/each}
    </datalist>

    <div class="mt-4">
      <button type="submit" class="btn btn-primary btn-sm">Save navigation</button>
    </div>
  </form>
</div>
