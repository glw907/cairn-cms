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
  import type { IconSet } from '../render/glyph.js';
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
    /** The site's icon set, forwarded to each row's icon arm. */
    icons?: IconSet;
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
    icons,
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

  // This instance's outer fieldset. Every focus query scopes to it, so two RepeatableField lists on
  // one page (the showcase posts concept renders both an array(object) and an array(image)) never
  // move focus into the other list. A document-wide query would index across both row sets.
  let root = $state<HTMLFieldSetElement | null>(null);

  const isObjectItem = $derived(field.item.type === 'object');
  const rowLabel = $derived(field.label ?? field.name);

  // The live itemLabel text per row id, tracked so a collapsed row's summary follows the author's
  // edits. The row inputs stay uncontrolled (the keyed envelope owns the seed; writing row.value on
  // every keystroke risks edit loss), so this mirrors only the summary-label field, read on input.
  let summaries = $state<Record<number, string>>({});

  // The form name of a row's itemLabel field: the object sub-field path, or the leaf row path itself.
  function summaryNameFor(index: number): string {
    return isObjectItem && field.itemLabel != null
      ? `${name}.${index}.${field.itemLabel}`
      : `${name}.${index}`;
  }

  // Mirror a row's itemLabel value into the live summary map when its input fires. A non-summary
  // input in the row is ignored, so the collapsed label tracks only the label field.
  function onRowInput(row: Row, index: number, event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.name === summaryNameFor(index)) {
      summaries = { ...summaries, [row.id]: target.value };
    }
  }

  // The collapsed summary for a row: the live itemLabel text when the author has edited it, else its
  // seeded itemLabel value (object row) or the leaf value, falling back to a positional placeholder.
  function summaryFor(value: unknown, index: number, rowId: number): string {
    if (rowId in summaries) {
      const live = summaries[rowId].trim();
      if (live !== '') return live;
    }
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
    // Land focus on the first operable control in the new row's EDIT BODY (not the row header's
    // toggle/move/remove chrome). The selector spans an array(image) row too, whose MediaHeroField
    // empty state is a <button> dropzone with only hidden inputs.
    const firstInput = root?.querySelector<HTMLElement>(
      `[data-cairn-row="${row.id}"] [data-cairn-row-body] :is(input:not([type=hidden]),textarea,select,button)`,
    );
    firstInput?.focus();
  }

  async function remove(index: number) {
    rows = rows.filter((_, i) => i !== index);
    markFieldsDirty();
    announcement = 'Row removed';
    await tick();
    // Focus chain: the next row's remove control, else the previous row's, else the Add button.
    const removeButtons = root?.querySelectorAll<HTMLElement>('[data-cairn-row-remove]') ?? [];
    if (removeButtons[index]) removeButtons[index].focus();
    else if (removeButtons[index - 1]) removeButtons[index - 1].focus();
    else addButton?.focus();
  }

  async function move(index: number, dir: 1 | -1) {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    rows = sortItems(rows, index, target);
    markFieldsDirty();
    await tick();
    // Keep keyboard focus on the moved row after a reorder. The arrow that fired the move can become
    // disabled at the first or last boundary, so focus the opposite-direction arrow, falling back to
    // the row toggle. Both queries scope to this instance's fieldset.
    const movedRow = root?.querySelectorAll<HTMLElement>('[data-cairn-row]')[target];
    const opposite = dir === 1 ? '[data-cairn-row-up]' : '[data-cairn-row-down]';
    const focusTarget =
      movedRow?.querySelector<HTMLElement>(`${opposite}:not([disabled])`) ??
      movedRow?.querySelector<HTMLElement>('[data-cairn-row-toggle]');
    focusTarget?.focus();
  }
</script>

<fieldset bind:this={root} class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
  <legend class="text-sm font-medium">{rowLabel}</legend>

  {#if rows.length}
    <ul class="flex flex-col gap-2">
      {#each rows as row, i (row.id)}
        {@const rowSummary = summaryFor(row.value, i, row.id)}
        <li
          class="rounded-[var(--radius-field)] border border-[var(--color-base-300)]"
          data-cairn-row={row.id}
          oninput={(e) => onRowInput(row, i, e)}
        >
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
              <span class="truncate">{rowSummary}</span>
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              data-cairn-row-up
              aria-label={`Move ${rowSummary} up`}
              disabled={i === 0}
              onclick={() => move(i, -1)}
            >
              <ArrowUpIcon class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              data-cairn-row-down
              aria-label={`Move ${rowSummary} down`}
              disabled={i === rows.length - 1}
              onclick={() => move(i, 1)}
            >
              <ArrowDownIcon class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              data-cairn-row-remove
              aria-label={`Remove ${rowSummary}`}
              onclick={() => remove(i)}
            >
              <Trash2Icon class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {#if expanded[row.id]}
            <div data-cairn-row-body class="flex flex-col gap-3 border-t border-[var(--color-base-300)] p-3">
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
                  {icons}
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
                  {icons}
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
