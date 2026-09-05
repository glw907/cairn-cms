<!--
@component
The navigation tree editor. It edits a flat working copy of the menu (each row carries an
explicit depth) and posts the whole tree as JSON to the save action. Vertical order comes from
svelte-sortable-list (mouse, and keyboard with Space to lift, arrows to move, Space to drop);
depth comes from the Indent and Outdent buttons, capped at the menu's maxDepth. The engine
validates on save.

The header band is `PageHeader`, its
title the menu's own declared label; the sortable-list card below stays untouched.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import CsrfField from './CsrfField.svelte';
  import { SortableList, sortItems } from '@rodrigodagostino/svelte-sortable-list';
  import type { SortableList as SortableListNS } from '@rodrigodagostino/svelte-sortable-list';
  import '@rodrigodagostino/svelte-sortable-list/styles.css';
  import type { NavLoadData } from '../sveltekit/nav-routes.js';
  import type { NavNode } from '../nav/site-config.js';
  import type { ContentFormFailure } from '../sveltekit/content-routes.js';
  import { PageHeader } from '../admin-toolkit/index.js';

  interface Props {
    /** The nav load's data: the menu meta, the current tree, page options, and flags. */
    data: NavLoadData;
    /** The last save's result: a refused `fail()` envelope carrying the reload-and-reapply
     *  message or a rejected tree. */
    form?: ContentFormFailure | null;
  }

  let { data, form = null }: Props = $props();

  // A flat, ordered working model is simpler to reorder than a recursive one: each row carries an
  // explicit depth, and the nested tree is rebuilt from order plus depth only at submit time.
  interface Row {
    id: string;
    depth: number;
    label: string;
    url: string;
  }

  let nextId = 1;
  function flatten(nodes: NavNode[], depth: number, out: Row[]): Row[] {
    for (const n of nodes) {
      out.push({ id: `row-${nextId++}`, depth, label: n.label, url: n.url ?? '' });
      if (n.children?.length) flatten(n.children, depth + 1, out);
    }
    return out;
  }

  // untrack here is not for runtime behavior -- $state runs its initializer once regardless.
  // It suppresses the Svelte compiler warning that `data` (a prop) is referenced outside a
  // reactive context. This form posts full-page (no use:enhance), so both a successful save and
  // a refused one produce a fresh document: `rows` always reseeds from `data.tree`, the
  // last-loaded tree, not the working (drag-reordered, edited) one. A refusal's `form.error`
  // renders below, but the working tree itself does not survive it.
  let rows = $state<Row[]>(untrack(() => flatten(data.tree, 0, [])));
  // depth is 0-based internally; maxDepth in the config is 1-based (1 = flat, 2 = one nesting level)
  const maxDepthIndex = $derived(data.menu.maxDepth - 1);

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
    rows = [...rows, { id: `row-${nextId++}`, depth: 0, label: 'New item', url: '' }];
  }
  function removeRow(id: string) {
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

  function handleDragEnd(e: SortableListNS.RootEvents['ondragend']) {
    const { draggedItemIndex, targetItemIndex, isCanceled } = e;
    if (!isCanceled && typeof targetItemIndex === 'number' && draggedItemIndex !== targetItemIndex) {
      rows = sortItems(rows, draggedItemIndex, targetItemIndex);
    }
  }

  // The one lifecycle error to announce: a rejected save's fail(). Every nav-save refusal now
  // answers in place, so this load carries no `?error=` bounce.
  const lifecycleError = $derived(form?.error ?? '');

  // The polite live region's text re-announces only when it changes, so a repeated identical error
  // (a second save failing the same way) would otherwise go silent. An invisible nonce flips on
  // every fresh error so the region text always mutates and the screen reader speaks again; this is
  // one of six admin screens that hand-roll the identical idiom rather than share it (ConceptList's
  // own comment names the full set). The nonce is a zero-width space, never voiced, so the heard
  // sentence is unchanged; the visible alert below keeps its own styling and drops the `role` (a
  // fresh-inserted role element announces inconsistently and would clobber a repeat).
  let announceNonce = $state(0);
  function nonce(): string {
    return announceNonce % 2 === 0 ? '' : '​';
  }
  // Each submit hands a fresh `form` (or `data` on a load) object, so the nonce bumps once per
  // submit or load, keyed to that identity rather than to a string change the live region would
  // swallow.
  let lastSubmit: unknown;
  $effect(() => {
    const submit = form ?? data;
    if (submit !== lastSubmit) {
      lastSubmit = submit;
      if (lifecycleError) announceNonce++;
    }
  });
  const liveError = $derived(lifecycleError ? `${lifecycleError}${nonce()}` : '');
</script>

<PageHeader eyebrow="Settings" title={data.menu.label} />

<div class="sr-only" aria-live="polite">{liveError}</div>
{#if data.saved}
  <div role="status" class="alert alert-success mb-4 type-body">Navigation saved.</div>
{/if}
{#if lifecycleError}
  <div class="alert alert-error mb-4 type-body">{lifecycleError}</div>
{/if}

<form method="POST" action="?/save">
  <CsrfField />
  <input type="hidden" name="tree" value={treeJson} />

  <div class="mb-2">
    <button type="button" class="btn btn-sm" onclick={addRow}>Add item</button>
  </div>

  <div class="card-shell p-2 card-shadow" style="min-height:2.5rem">
    <SortableList.Root ondragend={handleDragEnd} aria-label="Navigation items">
      {#each rows as row, index (row.id)}
        <SortableList.Item id={row.id} {index} aria-label={`${row.label || 'Untitled'}, level ${row.depth + 1}`}>
          <div class="flex items-center gap-2 p-2" style={`margin-left:${row.depth * 1.5}rem`}>
            <input class="input input-sm flex-1" placeholder="Label" aria-label="Label" bind:value={row.label} />
            <input
              class="input input-sm flex-1"
              placeholder="/path or https://example.com"
              list="cairn-nav-pages"
              aria-label="URL"
              bind:value={row.url}
            />
            <button type="button" class="btn btn-xs btn-ghost" onclick={() => outdent(index)} aria-label="Outdent">&larr;</button>
            <button type="button" class="btn btn-xs btn-ghost" onclick={() => indent(index)} aria-label="Indent">&rarr;</button>
            <button type="button" class="btn btn-xs btn-ghost text-error" onclick={() => removeRow(row.id)} aria-label={`Remove ${row.label}`}>&times;</button>
          </div>
        </SortableList.Item>
      {/each}
    </SortableList.Root>
  </div>

  <datalist id="cairn-nav-pages">
    {#each data.pages as p (p.url)}
      <option value={p.url}>{p.label}</option>
    {/each}
  </datalist>

  <div class="mt-4">
    <button type="submit" class="btn btn-primary btn-sm">Save navigation</button>
  </div>
</form>
