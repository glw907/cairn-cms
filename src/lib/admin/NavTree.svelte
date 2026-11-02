<!--
@component
The navigation tree editor. It edits a flat working copy of the menu (each row carries an
explicit depth) and posts the whole tree as JSON to the save action. Vertical order comes from
svelte-sortable-list (mouse, and keyboard with Space to lift, arrows to move, Space to drop);
depth comes from the Indent and Outdent buttons, capped at the menu's maxDepth. The engine
validates on save.

The header band is `PageHeader`, its
title the menu's declared label; the sortable-list card below stays untouched.
@beta
-->
<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import CsrfField from './CsrfField.svelte';
  import { SortableList, sortItems } from '@rodrigodagostino/svelte-sortable-list';
  import type { SortableList as SortableListNS } from '@rodrigodagostino/svelte-sortable-list';
  import '@rodrigodagostino/svelte-sortable-list/styles.css';
  import type { NavData } from '../sveltekit/nav-routes.js';
  import type { NavNode } from '../nav/site-config.js';
  import type { ContentFormFailure } from '../sveltekit/content-routes.js';
  import { PageHeader, EmptyState } from '../admin-toolkit/index.js';
  import { FAILURE_NOTICE, focusOnMount, refusalSubmit } from './refusal.js';

  interface Props {
    /** The nav load's data: the menu meta, the current tree, page options, and flags. */
    data: NavData;
    /** The last save's result: a refused `fail()` envelope carrying the reload-and-reapply
     *  message or a rejected tree. */
    form?: ContentFormFailure | null;
  }

  let { data, form = null }: Props = $props();

  // The saved message for the sr-only status region. A save redirects into a full document load, so
  // the visible alert is present at parse and not announced; the region fills only after mount, a
  // mutation an assistive technology voices.
  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });
  const savedAnnouncement = $derived(mounted && data.saved ? 'Navigation saved.' : '');

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
  // reactive context. The form submits through `use:enhance`, so a refused save answers in place
  // and `rows` keeps the working (drag-reordered, edited) tree. Only a save that goes through
  // loads a fresh document, and `rows` then reseeds from `data.tree`.
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

  let formEl: HTMLFormElement | undefined = $state();

  async function addRow() {
    const first = rows.length === 0;
    rows = [...rows, { id: `row-${nextId++}`, depth: 0, label: 'New item', url: '' }];
    // The empty state's action unmounts with the click, taking focus with it, so the first row's
    // label input receives it.
    if (first) {
      await tick();
      formEl?.querySelector<HTMLInputElement>('input[aria-label="Label"]')?.focus();
    }
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

  // Raised from submit until the result lands, so a second click cannot send a second save.
  let saving = $state(false);
  // The notice for a request that failed outright (no refusal came back to show). A fresh object
  // per failure keys the alert below, so a repeat failure takes focus again.
  let notice = $state<{ text: string } | null>(null);
  const submitSave = refusalSubmit({
    isPending: () => saving,
    setPending: (pending) => (saving = pending),
    onResult: (result) => {
      notice = result.type === 'error' ? { text: FAILURE_NOTICE } : null;
    },
  });
  // A refusal the server sent back, or the notice for a request that failed outright.
  const lifecycleError = $derived(notice?.text ?? form?.error ?? '');
</script>

<PageHeader eyebrow="Settings" title={data.menu.label} />

<!-- The status region is mounted unconditionally and empty until hydration (WCAG 4.1.3): a region
     conditionally mounted with its first content is not reliably observed by assistive tech. The
     visible alert carries no role, so it is not announced a second time. A refusal answers in
     place, so it takes focus on mount; the key remounts it for each fresh result. -->
<div role="status" class="sr-only">{savedAnnouncement}</div>
{#if data.saved}
  <div class="alert alert-success mb-4 type-body">Navigation saved.</div>
{/if}
{#key notice ?? form}
  {#if lifecycleError}
    <div class="alert alert-error mb-4 type-body" tabindex="-1" use:focusOnMount>{lifecycleError}</div>
  {/if}
{/key}

{#snippet emptyAction()}
  <button type="button" class="btn btn-primary btn-sm" onclick={addRow}>Add item</button>
{/snippet}

<form method="POST" action="?/save" bind:this={formEl} use:enhance={submitSave}>
  <CsrfField />
  <input type="hidden" name="tree" value={treeJson} />

  {#if rows.length === 0}
    <EmptyState
      heading="No menu items yet"
      message="Add your first item and it will show up in your site’s menu."
      action={emptyAction}
    />
  {:else}
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

  {/if}

  <datalist id="cairn-nav-pages">
    {#each data.pages as p (p.url)}
      <option value={p.url}>{p.label}</option>
    {/each}
  </datalist>

  {#if rows.length > 0 || data.tree.length > 0}
    <div class="mt-4">
      <button type="submit" class="btn btn-primary btn-sm" disabled={saving} aria-busy={saving}>Save navigation</button>
    </div>
  {/if}
</form>
