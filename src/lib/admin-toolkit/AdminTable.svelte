<!--
@component
The admin toolkit's table shell, graduated from aksailingclub-org's
`src/admin-club/toolkit/AdminTable.svelte`. General contract: named density tiers (`table-xs`/
`table-sm`), an optional zebra stripe, and an empty-state slot, so the table shell owns the
first-run/filtered-to-zero recipe rather than each screen re-deriving its own.

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

Headroom for a future selection column is a reserved convention, not a built feature: because
`header` and `children` are snippets rather than a column schema, adding a leading checkbox column
later is a caller-side edit to those two snippets, never a structural change to this component or
a breaking prop-shape change.
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
     *  `colspan` clamps down to the table's real column count. */
    emptyColspan?: number;
  }

  let { density = 'sm', zebra = false, header, children, rowCount, empty, emptyColspan = 100 }: Props = $props();

  const densityClass = $derived(density === 'xs' ? 'table-xs' : 'table-sm');
</script>

<div class="toolkit-admin-table-wrap">
  <table class="table {densityClass} {zebra ? 'table-zebra' : ''}">
    <thead>
      <tr>{@render header()}</tr>
    </thead>
    <tbody>
      {#if rowCount === 0 && empty}
        <tr class="toolkit-admin-table-empty-row">
          <td colspan={emptyColspan}>{@render empty()}</td>
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
</style>
