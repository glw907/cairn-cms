<!--
@component
The admin toolkit's page navigation, graduated from aksailingclub-org's
`src/admin-club/toolkit/Pagination.svelte`. `page` and `pageCount` drive the nav on their own;
`totalItems`/`pageSize` are optional and only add the "Showing X-Y of N <items>" range line, so a
consumer that already knows its own page count but not a raw item total (or vice versa) still
gets a working pager. `pageSizeOptions`/`onPageSizeChange` are an additive graduation extension
(ConceptList's rows-per-page select is the first engine consumer): omit both for the original
ASC contract unchanged, or pass both to add a page-size select beside the range line.

Every class below (`join`, `join-item`, `btn`, `btn-sm`, `btn-active`, `select`, `select-sm`) is
in cairn's admin CSS safelist or already compiles from cairn's own admin usage; the wrapper
layout and range-line color live in this component's own scoped `<style>`, since `/admin/**`
routes load only the precompiled bundle and an unverified Tailwind utility string never reaches
it there.

A page count beyond a handful windows down to first, last, and a run around the current page
(`computePageWindow`, exported from this file's module context, re-exporting the pure
`pagination-window.ts` module so the windowing logic is unit tested without mounting the
component); a single page renders no nav at all, only the range line (and the page-size select,
if given) if one applies.
-->
<script module lang="ts">
  import { computeItemRange, computePageWindow } from './pagination-window.js';
  import type { ItemRange, PageWindowItem } from './pagination-window.js';

  export { computeItemRange, computePageWindow };
  export type { ItemRange, PageWindowItem };
</script>

<script lang="ts">
  interface Props {
    /** The current page, 1-based. */
    page: number;
    /** The total number of pages. */
    pageCount: number;
    /** Called with the target page number when a page or Previous/Next control is activated. */
    onPageChange: (page: number) => void;
    /** The underlying list's total item count. Omit to skip the range line. */
    totalItems?: number;
    /** Items per page. Required alongside `totalItems` to compute the range line, and doubles as
     *  the page-size select's current value when `pageSizeOptions` is given. */
    pageSize?: number;
    /** The plural noun the range line names. Defaults to `'items'`. */
    itemLabel?: string;
    /** The selectable page sizes. Omit (with `onPageSizeChange`) to render no page-size select,
     *  the original contract unchanged. */
    pageSizeOptions?: number[];
    /** Called with the chosen page size when the page-size select changes. Required alongside
     *  `pageSizeOptions` to render the select. */
    onPageSizeChange?: (pageSize: number) => void;
  }

  let { page, pageCount, onPageChange, totalItems, pageSize, itemLabel = 'items', pageSizeOptions, onPageSizeChange }: Props =
    $props();

  const pageWindow = $derived(computePageWindow(page, pageCount));
  const range = $derived(
    totalItems != null && pageSize != null ? computeItemRange(page, pageSize, totalItems) : null,
  );
  const showPageSize = $derived((pageSizeOptions?.length ?? 0) > 0 && onPageSizeChange != null);
</script>

<div class="toolkit-pagination">
  {#if range || showPageSize}
    <div class="toolkit-pagination-leading">
      {#if range}
        <p class="toolkit-pagination-range">
          Showing {range.first}&ndash;{range.last} of {range.total} {itemLabel}
        </p>
      {/if}
      {#if showPageSize}
        <label class="toolkit-pagination-page-size">
          <span class="sr-only">Rows per page</span>
          <select
            class="select select-sm"
            aria-label="Rows per page"
            value={pageSize}
            onchange={(event) => onPageSizeChange?.(Number((event.currentTarget as HTMLSelectElement).value))}
          >
            {#each pageSizeOptions ?? [] as option (option)}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </label>
      {/if}
    </div>
  {/if}
  {#if pageCount > 1}
    <nav aria-label="Pagination" class="join">
      <button
        type="button"
        class="join-item btn btn-sm"
        disabled={page <= 1}
        aria-label="Previous page"
        onclick={() => onPageChange(page - 1)}
      >
        «
      </button>
      {#each pageWindow as item, i (i)}
        {#if item === 'ellipsis'}
          <span class="join-item btn btn-sm btn-disabled" aria-hidden="true">&hellip;</span>
        {:else}
          <button
            type="button"
            class="join-item btn btn-sm {item === page ? 'btn-active' : ''}"
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Page ${item}`}
            onclick={() => onPageChange(item)}
          >
            {item}
          </button>
        {/if}
      {/each}
      <button
        type="button"
        class="join-item btn btn-sm"
        disabled={page >= pageCount}
        aria-label="Next page"
        onclick={() => onPageChange(page + 1)}
      >
        »
      </button>
    </nav>
  {/if}
</div>

<style>
  .toolkit-pagination {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .toolkit-pagination-leading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .toolkit-pagination-range {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--color-muted);
  }
</style>
