<!--
@component
The admin toolkit's table shell, graduated from a consumer site's admin toolkit. General
contract: named density tiers (`table-xs`/`table-sm`), an optional zebra stripe, and an
empty-state slot, so the table shell owns the first-run/filtered-to-zero recipe rather than each
screen re-deriving its own.

Assembles from daisyUI 5's own `table` family, every class already compiled into cairn's packaged
`cairn-admin.css`: `table`, `table-xs`, `table-sm`, `table-zebra`. The header and body are
caller-authored snippets (a `<tr>` of `<th>` cells for `header`; an `{#each}` of plain `<tr>`
markup for `children`), so this component owns only the table's own chrome, never a row shape or a
data contract, the same reason it carries no `rows: T[]` prop.

Single-line enforcement is a contract, not a full mechanism: `white-space: nowrap` is enforced on
every cell via a `:global()` rule (a wrap can never happen even if a caller forgets), but full
ellipsis truncation of a specific long value is the calling cell's own responsibility, the same
scoped-truncation model `StatusChip`'s `.status-chip-label` already carries; this component cannot
see inside a snippet's own markup to add truncation there itself.

The optional `selection` prop is the one column this component owns outright: with it set,
`AdminTable` renders the reserved header `<th>` and its own select-all checkbox (`aria-label` from
`selection.label`, indeterminate against `rowCount` on a partial `selection.ids`), while every
row's own checkbox `<td>` stays the caller's, written inside `children` and bound to the same
`Set`. This is the same split `header`/`children` already draw for the rest of the row: this
component owns the table's chrome, a caller owns a row's own markup. `AdminTable` never sees the
full set of selectable ids (rows are caller-rendered), so the header checkbox can only clear a
selection, never build one; a caller wanting a select-all affordance supplies it itself, for
example from `batchBar`. Selection is additive: a caller passing neither `selection` nor `batchBar`
gets the same table as before.

The optional `batchBar` snippet renders above the table, inside a `role="toolbar"` region, only
while `selection` is set and its `ids` is non-empty. It receives the selected count and a `clear`
callback that empties the selection through `selection.onchange`, so a caller's own batch-action
buttons never reach into the `Set` directly.
-->
<script module lang="ts">
  /** The table's two named density tiers, matching `StatusChip`'s own `xs`/`sm` size vocabulary. */
  export type AdminTableDensity = 'xs' | 'sm';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Defaults to `'sm'`. */
    density?: AdminTableDensity;
    /** Whether alternating rows shade for scan-tracking. Defaults to `false`: a screen opts in
     *  deliberately rather than inheriting a house style. */
    zebra?: boolean;
    /** The `<thead>` row's own `<th>` cells (this component supplies the wrapping `<tr>`). */
    header: Snippet;
    /** The `<tbody>` row markup. Ignored while `rowCount` is `0`. */
    children: Snippet;
    /** The number of rows `children` renders, so the table can switch to the empty-state slot
     *  without re-deriving that count from opaque snippet content. */
    rowCount: number;
    /** The empty-state content, rendered inside one spanning cell when `rowCount` is `0`. Omit to
     *  render an empty `<tbody>` instead. */
    empty?: Snippet;
    /** How many columns the empty-state cell should span. Defaults to `100`, which HTML's own
     *  `colspan` clamps down to the table's real column count. This component adds one to it
     *  itself when `selection` is set, so a caller states its own column count without
     *  re-deriving the reserved selection column. */
    emptyColspan?: number;
    /** Reserves the leading selection column and renders its header select-all checkbox. Omit to
     *  render no selection column at all; a caller renders each row's own checkbox `<td>` inside
     *  `children`, bound to the same `ids` set. */
    selection?: { ids: Set<string>; onchange: (ids: Set<string>) => void; label: string };
    /** The batch-action bar shown above the table while `selection` is set and non-empty, inside a
     *  `role="toolbar"` region. */
    batchBar?: Snippet<[{ count: number; clear: () => void }]>;
  }

  let {
    density = 'sm',
    zebra = false,
    header,
    children,
    rowCount,
    empty,
    emptyColspan = 100,
    selection,
    batchBar,
  }: Props = $props();

  const densityClass = $derived(density === 'xs' ? 'table-xs' : 'table-sm');
  const effectiveEmptyColspan = $derived(selection ? emptyColspan + 1 : emptyColspan);

  let selectAllCheckbox = $state<HTMLInputElement | null>(null);

  // `indeterminate` is a DOM property, not an HTML attribute, so it is set imperatively here
  // rather than through a template binding, the same pattern MediaOrphanTools' own select-all
  // checkbox already carries.
  $effect(() => {
    if (!selectAllCheckbox || !selection) return;
    const selectedCount = selection.ids.size;
    selectAllCheckbox.checked = rowCount > 0 && selectedCount === rowCount;
    selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < rowCount;
  });

  /** Clears the selection through `selection.onchange`. This is the header checkbox's only
   *  interactive action: AdminTable never holds the full set of selectable row ids, so it cannot
   *  build a select-all selection from here, only empty one. Ticking it while the selection is
   *  already empty has no id set to select, so the click is reverted. */
  function onSelectAllChange(event: Event) {
    if (!selection) return;
    if (selection.ids.size > 0) {
      selection.onchange(new Set());
    } else {
      (event.currentTarget as HTMLInputElement).checked = false;
    }
  }
</script>

{#if selection && selection.ids.size > 0 && batchBar}
  <div class="toolkit-admin-table-batch-bar" role="toolbar" aria-label={selection.label}>
    {@render batchBar({ count: selection.ids.size, clear: () => selection.onchange(new Set()) })}
  </div>
{/if}
<div class="toolkit-admin-table-wrap">
  <table class="table {densityClass} {zebra ? 'table-zebra' : ''}">
    <thead>
      <tr>
        {#if selection}
          <th>
            <input
              bind:this={selectAllCheckbox}
              type="checkbox"
              class="checkbox checkbox-sm"
              aria-label={selection.label}
              onchange={onSelectAllChange}
            />
          </th>
        {/if}
        {@render header()}
      </tr>
    </thead>
    <tbody>
      {#if rowCount === 0 && empty}
        <tr class="toolkit-admin-table-empty-row">
          <td colspan={effectiveEmptyColspan}>{@render empty()}</td>
        </tr>
      {:else if rowCount !== 0}
        {@render children()}
      {/if}
    </tbody>
  </table>
</div>

<style>
  .toolkit-admin-table-wrap {
    overflow-x: auto;
  }

  /* The single-line enforcement floor: a cell can never wrap to a second line. Truncating a
     specific long value with an ellipsis is the calling cell's own scoped-CSS responsibility (see
     this component's header comment); :global() is required here because header/body cells belong
     to the caller's own snippet markup, not this component's scoped template. */
  .toolkit-admin-table-wrap :global(td),
  .toolkit-admin-table-wrap :global(th) {
    white-space: nowrap;
  }

  .toolkit-admin-table-empty-row td {
    padding: 2.5rem 1rem;
    text-align: center;
    color: var(--color-muted);
    white-space: normal;
  }

  .toolkit-admin-table-batch-bar {
    margin-bottom: 0.75rem;
  }
</style>
