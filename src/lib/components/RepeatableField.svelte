<!--
@component
The repeatable-row editor, the arm for a non-reference `array` container. It renders a list of rows,
each row either a single leaf (`array(text)`, `array(image)`) or a flat object group
(`array(object({...}))`), with keyboard-operable add, remove, and reorder. Each row collapses to its
`itemLabel` summary and expands to edit, the same buries-fewer-fields move the Details panel makes.

Rows are wrapped in a `{ id, value }` envelope so node identity follows a row through a reorder or a
remove and an in-progress edit (or the keyboard focus) never jumps to the wrong row. The id is a
seed-time counter, not a random uuid, so the server and client agree at hydration. The envelope is
UI-only; the form names derive from each row's CURRENT position (`${name}.${i}`), so the Task 3
decoder reads a compact, ordered set. The component seeds once from `rows`; the `{#key entryKey}`
wrapper in EditPage remounts it on an entry change, so it adds no re-seed effect.

A structural mutation (add, remove, reorder) marks the form dirty, because those do not fire the
form's `oninput`; a leaf edit inside a row does not, because the row inputs sit inside the edit form
whose `oninput` bubbles. An always-mounted polite live region announces add and remove.
-->
<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { sortItems } from '@rodrigodagostino/svelte-sortable-list';
  import FieldInput from './FieldInput.svelte';
  import ObjectGroupField from './ObjectGroupField.svelte';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import type { NamedField } from '../content/types.js';
  import type { ArrayField, ObjectField } from '../content/fields.js';
  import type { LinkTarget } from '../content/manifest.js';
  import type { MediaEntry } from '../media/manifest.js';
  import type { MediaLibraryEntry } from '../media/library-entry.js';
  import type MediaHeroField from './MediaHeroField.svelte';

  interface Props {
    /** The array descriptor to render; its `item` is the per-row leaf or flat object. */
    field: NamedField & ArrayField;
    /** The form name prefix for this list; each row renders at `${name}.${i}`. */
    name: string;
    /** The seed rows: a list of leaf values, or a list of object slices for an object item. */
    rows: unknown[];
    /** The site link targets the reference arm offers (threaded through to each row). */
    targets: LinkTarget[];
    /** Mark the edit form dirty; called on add, remove, and reorder (these skip the form's oninput). */
    markFieldsDirty: () => void;
    /** The merged committed-plus-uploaded media library, keyed by content hash. */
    mediaLibrary: Record<string, MediaLibraryEntry>;
    /** The concept the entry belongs to (the upload action's route param). */
    conceptId: string;
    /** The entry id (the upload action's route param). */
    id: string;
    /** The host's hero-field refs, keyed by the prefixed `name` so two rows do not collide. */
    heroFieldRefs: Record<string, MediaHeroField>;
    /** Called with the server-owned record on a successful upload, so the host merges it. */
    onuploaded: (record: MediaEntry) => void;
    /** Called when a hero's needs-alt status changes, keyed by the prefixed `name`. */
    onheroneedsalt: (name: string, needsAlt: boolean) => void;
  }

  let {
    field,
    name,
    rows: seedRows,
    targets,
    markFieldsDirty,
    mediaLibrary,
    conceptId,
    id,
    heroFieldRefs,
    onuploaded,
    onheroneedsalt,
  }: Props = $props();

  /** One row of editable state: a stable id for keyed identity, and the row's current value. */
  interface Row {
    id: number;
    value: unknown;
  }

  // The id of the next appended row. Seeded past the initial rows so a freshly added row never
  // collides with a seeded one; a plain counter (not randomUUID) so SSR and the client agree.
  let nextId = untrack(() => seedRows.length);

  // The rows, seeded once from the prop and owned thereafter (untrack marks the read a deliberate
  // one-time seed). No re-seed effect: EditPage's {#key entryKey} wrapper remounts on entry change.
  let rows = $state<Row[]>(untrack(() => seedRows.map((value, i) => ({ id: i, value }))));

  // Which rows are expanded for editing, keyed by row id; a collapsed row shows its summary only.
  let expanded = $state<Record<number, boolean>>({});

  // The polite announcement, mounted empty and filled on a structural mutation.
  let announcement = $state('');

  // The Add button, the last link in the remove focus chain (when no row remains to focus).
  let addButton = $state<HTMLButtonElement | null>(null);

  const isObjectItem = $derived(field.item.type === 'object');
  const rowLabel = $derived(field.label ?? field.name);

  // The collapsed summary for a row: its itemLabel sub-field value for an object row, or the leaf
  // value itself, falling back to a positional placeholder when empty.
  function summaryFor(value: unknown, index: number): string {
    let text = '';
    if (isObjectItem && field.itemLabel != null && value !== null && typeof value === 'object') {
      text = String((value as Record<string, unknown>)[field.itemLabel] ?? '').trim();
    } else if (!isObjectItem && value != null && typeof value !== 'object') {
      text = String(value).trim();
    }
    return text !== '' ? text : `${rowLabel} ${index + 1}`;
  }

  // An empty value for a freshly added row: an empty object for an object item, an empty string for
  // a leaf. The decoder prunes an all-default row, so an untouched added row never reaches the form.
  function emptyValue(): unknown {
    return isObjectItem ? {} : '';
  }

  function toggle(rowId: number) {
    expanded = { ...expanded, [rowId]: !expanded[rowId] };
  }

  async function add() {
    const row: Row = { id: nextId++, value: emptyValue() };
    rows = [...rows, row];
    expanded = { ...expanded, [row.id]: true };
    markFieldsDirty();
    announcement = 'Row added';
    await tick();
    const firstInput = document.querySelector<HTMLElement>(
      `[data-cairn-row="${row.id}"] input, [data-cairn-row="${row.id}"] textarea, [data-cairn-row="${row.id}"] select`,
    );
    firstInput?.focus();
  }

  async function remove(index: number) {
    rows = rows.filter((_, i) => i !== index);
    markFieldsDirty();
    announcement = 'Row removed';
    await tick();
    // Focus chain: the next row's remove control, else the previous row's, else the Add button.
    const removeButtons = document.querySelectorAll<HTMLElement>('[data-cairn-row-remove]');
    if (removeButtons[index]) removeButtons[index].focus();
    else if (removeButtons[index - 1]) removeButtons[index - 1].focus();
    else addButton?.focus();
  }

  function move(index: number, dir: 1 | -1) {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    rows = sortItems(rows, index, target);
    markFieldsDirty();
  }
</script>

<fieldset class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
  <legend class="text-sm font-medium">{rowLabel}</legend>

  {#if rows.length}
    <ul class="flex flex-col gap-2">
      {#each rows as row, i (row.id)}
        <li class="rounded-[var(--radius-field)] border border-[var(--color-base-300)]" data-cairn-row={row.id}>
          <div class="flex items-center gap-1 p-1">
            <button
              type="button"
              class="btn btn-ghost btn-sm flex-1 justify-start gap-2 font-normal"
              data-cairn-row-toggle
              aria-expanded={expanded[row.id] ? 'true' : 'false'}
              onclick={() => toggle(row.id)}
            >
              {#if expanded[row.id]}
                <ChevronDownIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
              {:else}
                <ChevronRightIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
              {/if}
              <span class="truncate">{summaryFor(row.value, i)}</span>
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              data-cairn-row-up
              aria-label={`Move ${summaryFor(row.value, i)} up`}
              disabled={i === 0}
              onclick={() => move(i, -1)}
            >
              <ArrowUpIcon class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              data-cairn-row-down
              aria-label={`Move ${summaryFor(row.value, i)} down`}
              disabled={i === rows.length - 1}
              onclick={() => move(i, 1)}
            >
              <ArrowDownIcon class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              data-cairn-row-remove
              aria-label={`Remove ${summaryFor(row.value, i)}`}
              onclick={() => remove(i)}
            >
              <Trash2Icon class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {#if expanded[row.id]}
            <div class="flex flex-col gap-3 border-t border-[var(--color-base-300)] p-3">
              {#if field.item.type === 'object'}
                <ObjectGroupField
                  field={{ ...(field.item as ObjectField), name: field.name }}
                  name={`${name}.${i}`}
                  frontmatter={(row.value !== null && typeof row.value === 'object' ? row.value : {}) as Record<string, unknown>}
                  {targets}
                  {markFieldsDirty}
                  {mediaLibrary}
                  {conceptId}
                  {id}
                  {heroFieldRefs}
                  {onuploaded}
                  {onheroneedsalt}
                />
              {:else}
                <FieldInput
                  field={{ ...field.item, name: '_value' }}
                  name={`${name}.${i}`}
                  frontmatter={{ _value: row.value }}
                  {targets}
                  {markFieldsDirty}
                  {mediaLibrary}
                  {conceptId}
                  {id}
                  {heroFieldRefs}
                  {onuploaded}
                  {onheroneedsalt}
                />
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <div>
    <button type="button" class="btn btn-sm btn-ghost gap-1" bind:this={addButton} onclick={add}>
      <PlusIcon class="h-4 w-4" aria-hidden="true" />
      Add {rowLabel}
    </button>
  </div>

  <!-- Always mounted so add/remove announce consistently; a {#if}-gated region announces unevenly. -->
  <div role="status" aria-live="polite" class="sr-only">{announcement}</div>
</fieldset>
