<!--
@component
The Insert control and its modal. The picker lists each actionable component with its description and
intended use. A component with a schema opens the guided ComponentForm; a template-only component
inserts directly; a component with neither is not listed. Built on a native <dialog> for focus
trapping and Escape, following the dropdown's a11y conventions used elsewhere in the admin.
-->
<script module lang="ts">
  import type { ComponentRegistry, ComponentDef } from '../render/registry.js';

  /** Past this many actionable components, the catalog grows a search input. Below it search is
   *  noise over a list short enough to scan. */
  const SEARCH_THRESHOLD = 8;

  function hasSchema(def: ComponentDef): boolean {
    return (def.attributes?.length ?? 0) > 0 || (def.slots?.length ?? 0) > 0;
  }
  /** The registry's pickable components. A def is actionable when a schema opens the guided form or
   *  a template inserts directly; a def with neither is not listed. A `hidden` def is then dropped,
   *  so the hidden filter applies after the actionable one. Exported so a host rendering its own
   *  trigger (the edit page's toolbar) can hide it under the same condition the dialog uses. */
  export function insertableDefs(registry?: ComponentRegistry): ComponentDef[] {
    return (registry?.defs ?? []).filter(
      (def) => (hasSchema(def) || Boolean(def.insertTemplate)) && !def.hidden,
    );
  }

  /** A heading-bearing group of rows. A group with an empty heading renders without an eyebrow.
   *  Groups appear in first-declared order, and rows keep declaration order within each group. */
  interface CatalogGroup {
    heading: string;
    defs: ComponentDef[];
  }

  /** Partition the defs into groups by `def.group`, preserving declaration order of both the
   *  groups (first time a group name is seen) and the rows within a group. A def with no `group`
   *  collects into one leading default group with no heading. */
  function groupDefs(defs: ComponentDef[]): CatalogGroup[] {
    const order: string[] = [];
    const byHeading = new Map<string, ComponentDef[]>();
    for (const def of defs) {
      const heading = def.group ?? '';
      if (!byHeading.has(heading)) {
        byHeading.set(heading, []);
        order.push(heading);
      }
      byHeading.get(heading)!.push(def);
    }
    return order.map((heading) => ({ heading, defs: byHeading.get(heading)! }));
  }
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import type { IconSet } from '../render/glyph.js';
  import ComponentForm from './ComponentForm.svelte';

  interface Props {
    /** The site's component registry. */
    registry?: ComponentRegistry;
    /** Insert markdown at the editor cursor. */
    insert: (text: string) => void;
    /** The site's icon set, for icon fields. */
    icons?: IconSet;
    /** Disable the trigger; the host sets it while Preview shows. */
    disabled?: boolean;
    /** Render the built-in Insert block trigger. False mounts only the dialog, for a host that
     *  supplies its own trigger and opens the dialog through the exported open(). */
    trigger?: boolean;
  }

  let { registry, insert, icons, disabled = false, trigger = true }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  let picked = $state<ComponentDef | null>(null);
  let query = $state('');
  let searchInput = $state<HTMLInputElement | null>(null);

  const defs = $derived(insertableDefs(registry));
  /** The catalog grows a search input only once the actionable count crosses the threshold. */
  const showSearch = $derived(defs.length > SEARCH_THRESHOLD);
  /** The defs matching the live query, by label or description (case-insensitive). With no query
   *  the whole catalog shows. */
  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return defs;
    return defs.filter(
      (def) =>
        def.label.toLowerCase().includes(q) || (def.description ?? '').toLowerCase().includes(q),
    );
  });
  const groups = $derived(groupDefs(filtered));

  /** Open the picker. Exported so a trigger={false} host can drive the dialog itself. */
  export function open() {
    picked = null;
    query = '';
    dialog?.showModal();
    // Focus the search box on open when it shows, so an editor with a large catalog types straight
    // into the filter. The dialog's own focus trap already lands focus on the first row otherwise.
    if (showSearch) {
      void tick().then(() => searchInput?.focus());
    }
  }
  function close() {
    picked = null;
    dialog?.close();
  }
  function choose(def: ComponentDef) {
    if (hasSchema(def)) {
      picked = def;
    } else {
      insert(def.insertTemplate ?? '');
      close();
    }
  }
  function onInsert(markdown: string) {
    insert(markdown);
    close();
  }

  // Arrow keys roam the rows: each row is a real <button>, so Enter chooses for free and Escape
  // closes through the native <dialog>. Up/Down (and Left/Right) move focus between the row buttons
  // in DOM order across every group, wrapping at the ends, the list-navigation model an editor
  // expects. The handler sits on each row button (an interactive element), and finds its siblings
  // through the shared scroll region so navigation crosses group boundaries.
  function onRowKeydown(e: KeyboardEvent) {
    const isNext = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    const isPrev = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
    if (!isNext && !isPrev) return;
    const region = (e.currentTarget as HTMLElement).closest('[data-cairn-pk-list]');
    if (!region) return;
    const rows = [...region.querySelectorAll<HTMLButtonElement>('[data-testid="cairn-pk-row"]')];
    const from = rows.indexOf(e.currentTarget as HTMLButtonElement);
    if (from < 0) return;
    e.preventDefault();
    const next = (from + (isNext ? 1 : -1) + rows.length) % rows.length;
    rows[next].focus();
  }
</script>

{#if trigger && defs.length > 0}
  <button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" aria-label="Insert block" {disabled} onclick={open}>Insert block</button>
{/if}

{#if defs.length > 0}
  <dialog class="modal" aria-labelledby="cairn-insert-dialog-title" bind:this={dialog} onclose={() => (picked = null)}>
    <div class="modal-box">
      <div class="mb-3 flex items-center justify-between">
        <h2 id="cairn-insert-dialog-title" class="text-base font-semibold">Insert component</h2>
        <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
      </div>

      {#if picked}
        {#key picked}
          <ComponentForm def={picked} {icons} {onInsert} onBack={() => (picked = null)} />
        {/key}
      {:else}
        {#if showSearch}
          <div class="mb-3 flex items-center gap-2 rounded-field border border-[var(--cairn-card-border)] bg-base-100 px-3 py-2">
            <svg class="ec-glyph h-4 w-4 text-[var(--color-muted)]" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M229.7 218.3 179.6 168.2A92.2 92.2 0 1 0 168.2 179.6l50.1 50.1a8 8 0 0 0 11.4-11.4ZM40 112a72 72 0 1 1 72 72 72.1 72.1 0 0 1-72-72Z" /></svg>
            <input
              type="search"
              class="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[var(--color-muted)] focus:outline-none"
              placeholder="Search components"
              aria-label="Search components"
              bind:value={query}
              bind:this={searchInput}
            />
          </div>
          <p class="sr-only" role="status" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'component' : 'components'} match
          </p>
        {/if}

        {#if filtered.length === 0}
          <!-- The query matched nothing. The components exist; none match. Offer the way back. -->
          <div class="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p class="text-sm text-[var(--color-muted)]">No components match <span class="font-medium text-base-content">"{query.trim()}"</span>.</p>
            <button type="button" class="text-[0.8125rem] font-medium text-primary underline [text-underline-offset:2px]" onclick={() => (query = '')}>Clear search</button>
          </div>
        {:else}
          <!-- One scroll region holds every group, so the arrow keys roam the whole catalog. -->
          <div data-cairn-pk-list>
            {#each groups as group (group.heading)}
              <div class="mt-3 first:mt-0">
                {#if group.heading}
                  <div data-testid="cairn-pk-group-heading" class="px-2 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">{group.heading}</div>
                {/if}
                <ul class="menu w-full p-0">
                  {#each group.defs as def (def.name)}
                    <li>
                      <button type="button" data-testid="cairn-pk-row" class="flex items-start gap-3 py-2" onclick={() => choose(def)} onkeydown={onRowKeydown}>
                        {#if def.icon}
                          <span class="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-base-200 text-base-content">
                            <svg class="ec-glyph h-4 w-4" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d={icons?.[def.icon] ?? ''} /></svg>
                          </span>
                        {/if}
                        <span class="flex flex-col items-start gap-0.5">
                          <span data-testid="cairn-pk-row-label" class="text-sm font-medium">{def.label}</span>
                          {#if def.description}<span class="text-xs text-[var(--color-muted)]">{def.description}</span>{/if}
                          {#if def.use}<span class="text-xs text-[var(--color-subtle)]">{def.use}</span>{/if}
                        </span>
                      </button>
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
    <form method="dialog" class="modal-backdrop">
      <button tabindex="-1" aria-label="Close">close</button>
    </form>
  </dialog>
{/if}
