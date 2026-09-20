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
`AdminTable` renders the reserved header `<th>` and its own select-all checkbox (indeterminate
against `rowCount` on a partial `selection.ids`), while every row's own checkbox `<td>` stays the
caller's, written inside `children` and reading the same id set. This is the same split
`header`/`children` already draw for the rest of the row: this component owns the table's chrome, a
caller owns a row's own markup. `AdminTable` never sees the full set of selectable ids (rows are
caller-rendered), so the header checkbox can only clear a selection, never build one. That is why
it reads `aria-disabled` while rows exist and nothing is selected, and why its `aria-label` reads
"Clear selection" once something is: a control that cannot select all should not present itself as
one. `aria-disabled` rather than the native attribute, because this is the element `clear` returns
focus to, and a natively disabled input cannot hold focus. A
caller wanting a select-all affordance supplies it itself, for example from `batchBar`. Selection is
additive: a caller passing neither `selection` nor `batchBar` gets the same table as before.

The batch region renders above the table whenever `selection` is set, as a `role="group"` labelled
"Batch actions", carrying a `role="status"` element with the selected count. The region is present
before the count ever changes, which is what makes the announcement land: a live region mounted at
the same moment its text appears announces nothing. The optional `batchBar` snippet renders inside
that region while `ids` is non-empty, receiving the selected count and a `clear` callback that
empties the selection through `selection.onchange` and returns focus to the header checkbox, so a
caller's own batch-action buttons never reach into the id set directly.
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
    /** Reserves the leading selection column and renders its header checkbox. Omit to render no
     *  selection column at all; a caller renders each row's own checkbox `<td>` inside `children`,
     *  reading the same `ids` set. `onchange` receives a new set on every change: this component
     *  never mutates the one it is given, and a caller storing the new set in `$state` is what
     *  makes the table react. A `SvelteSet` from `svelte/reactivity` works too, for a caller that
     *  prefers a mutable reactive set of its own. `label` names the checkbox while nothing is
     *  selected; once something is, it reads "Clear selection", which is the only thing the
     *  checkbox can do. */
    selection?: {
      ids: ReadonlySet<string>;
      onchange: (ids: ReadonlySet<string>) => void;
      label: string;
    };
    /** The batch-action content shown inside the batch region while `selection` is set and its
     *  `ids` is non-empty. */
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
  const selectedCount = $derived(selection?.ids.size ?? 0);
  // The header checkbox can only empty a selection, so with nothing selected it has nothing to do.
  // Marked with `aria-disabled` rather than the native attribute, since a natively disabled input
  // cannot take focus and this is exactly the element `clear` returns focus to: the state it lands
  // in IS the empty one. The dimming and the not-allowed cursor are restated in this component's
  // own scoped CSS, which daisyUI supplies for `:disabled` alone.
  const headerInert = $derived(rowCount > 0 && selectedCount === 0);

  let headerCheckbox = $state<HTMLInputElement | null>(null);

  /** Empties the selection through `selection.onchange` and returns focus to the header checkbox,
   *  so a keyboard reader who cleared from a batch-action button that just unmounted lands on the
   *  selection column rather than at the top of the document. */
  function clear() {
    if (!selection) return;
    headerCheckbox?.focus();
    selection.onchange(new Set());
  }

  /** The header checkbox's own change handler. While nothing is selected the checkbox is inert, so
   *  the tick it just took is reverted rather than acted on: there is no id set here to select from.
   */
  function onHeaderChange(event: Event) {
    if (headerInert) {
      (event.currentTarget as HTMLInputElement).checked = false;
      return;
    }
    clear();
  }
</script>

{#if selection}
  <div class="toolkit-admin-table-batch-bar" role="group" aria-label="Batch actions">
    <!-- The count lives in its own status region, visually hidden, rather than in whatever text
         `batchBar` renders: the region has to be mounted before the count changes for the
         announcement to land, and a caller's own visible count stays the caller's to word. -->
    <p class="toolkit-admin-table-batch-status" role="status">{selectedCount} selected</p>
    {#if selectedCount > 0 && batchBar}
      {@render batchBar({ count: selectedCount, clear })}
    {/if}
  </div>
{/if}
<div class="toolkit-admin-table-wrap">
  <table class="table {densityClass} {zebra ? 'table-zebra' : ''}">
    <thead>
      <tr>
        {#if selection}
          <th>
            <!-- `indeterminate` is a DOM property with no HTML attribute; Svelte 5 sets it as a
                 property from this attribute position, so no imperative effect is needed. The
                 full-size `checkbox` (1.5rem), never `checkbox-sm`, keeps the target at the
                 engine's 24px floor. -->
            <input
              bind:this={headerCheckbox}
              type="checkbox"
              class="checkbox toolkit-admin-table-select-all"
              aria-label={selectedCount > 0 ? 'Clear selection' : selection.label}
              aria-disabled={headerInert ? 'true' : undefined}
              checked={rowCount > 0 && selectedCount === rowCount}
              indeterminate={selectedCount > 0 && selectedCount < rowCount}
              onchange={onHeaderChange}
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

  /* The inert header checkbox's own treatment, matching what daisyUI gives a natively disabled
     checkbox (`cursor: not-allowed`, `opacity: .2`). It is restated here because this control uses
     `aria-disabled`, so it stays focusable for the focus `clear` returns to it. */
  .toolkit-admin-table-select-all[aria-disabled='true'] {
    cursor: not-allowed;
    opacity: 0.2;
  }

  /* The bar reserves its own space whether or not anything is selected, so a table does not jump
     down the moment a first row is ticked. Its own status region is out of flow, so an unselected
     bar is this margin and nothing else. */
  .toolkit-admin-table-batch-bar {
    margin-bottom: 0.75rem;
  }

  /* The count's own status region is for assistive technology alone, so it is clipped rather than
     hidden: a `display: none` or `hidden` region is not announced at all. The rule is written here
     rather than borrowed from `sr-only`, since `admin-toolkit` promises no compiled admin sheet. */
  .toolkit-admin-table-batch-status {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
</style>
