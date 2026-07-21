<!--
@component
The admin toolkit's list-header band, graduated from aksailingclub-org's
`src/admin-club/toolkit/ListToolbar.svelte`. General contract: search, any number of promoted
filters, an overflow disclosure for filters a screen chooses not to promote (present in the
contract even when a consumer promotes every filter and never renders it), exactly one
right-aligned primary action, applied-filter pills with a remove control, and a count line that
always states its own filter scope.

Every prop is a controlled value plus a change callback, the same fully-controlled convention
`Pagination` already establishes: a search box's own text, a filter's own selected value, and
which filters are promoted are all state the caller owns, never this component. `onChange`/
`onClick` carry no domain knowledge of what a filter means or what an action does; a filter's own
vocabulary is entirely the consumer's own filter definitions passed in, never hardcoded here.

Applied-filter pills render in the toolkit's one neutral badge tone (`badge-neutral`), never an
alarm color: an applied filter is a normal state of the list, not a warning. `computeAppliedFilters`
and `computeCountLine` (re-exported below from the sibling `list-toolbar.ts` module, the same split
`Pagination` uses for its own windowing math) are the pill and count-line copy's one home; a
consumer never re-derives the join pattern itself.

Graduation extensions over the ASC-born contract (both additive, ASC's own existing usage stays
valid): a filter's `display` chooses `'select'` (the original contract, unchanged) or `'segmented'`,
a group of toggle buttons for a filter whose vocabulary reads better as always-visible tabs than a
dropdown (a publish-state filter, a triage radiogroup), with each option's own optional `count`
rendered beside its label; a segmented filter's overflow form (when `promoted` is `false`) still
renders as a `<select>`, since a button group behind a disclosure menu loses the always-visible
scan-ability segmented display exists for. The optional `trailing` snippet renders after the
toolbar band, for a screen-specific view control this component has no vocabulary for (a
grid/list density toggle).

Assembles from daisyUI 5 primitives already compiled into cairn's packaged `cairn-admin.css`:
`input`/`input-sm`, `select`/`select-sm`, `btn`/`btn-sm`/`btn-primary`/`btn-outline`/`btn-active`,
`join`/`join-item` (the segmented display, the same assembly `Pagination`'s own page nav uses),
`dropdown`/`dropdown-content`/`dropdown-open`/`menu` (the overflow disclosure, driven by a real
`$state` toggle rather than the bare `:focus-within` daisyUI gives every `.dropdown` for free),
and `badge`/`badge-neutral`/`badge-sm` for the pills. Pill layout, the controls grid, the segmented
group, and the count line's muted color live in this component's own scoped `<style>`, per the
compiled-CSS constraint documented on `StatusChip`/`Pagination`: an unverified Tailwind utility
string never reaches an `/admin/**` route.

The band's two children (the controls cluster and the primary action) share one flex line
whenever both fit; the controls cluster is a CSS grid, not a wrapped flex row, so a wide viewport
never wraps the band itself and a wrapped narrower one keeps every control's columns aligned
across lines.
-->
<script module lang="ts">
  import {
    computeAppliedFilters,
    computeCountLine,
    type AppliedFilterPill,
    type ListToolbarAction,
    type ListToolbarFilter,
    type ListToolbarFilterOption,
  } from './list-toolbar.js';

  export { computeAppliedFilters, computeCountLine };
  export type { AppliedFilterPill, ListToolbarAction, ListToolbarFilter, ListToolbarFilterOption };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The search box's current text. */
    search: string;
    /** Called with the new text on every input change. */
    onSearch: (value: string) => void;
    /** The search box's accessible name and placeholder. Defaults to `'Search'`. */
    searchLabel?: string;
    /** Whether the search box receives focus on mount. Defaults to `false`. */
    autofocus?: boolean;
    /** Every filter, promoted and overflow alike, in the order each group renders. */
    filters?: ListToolbarFilter[];
    /** The overflow disclosure's own trigger label. Defaults to `'More filters'`. Only rendered
     *  when at least one filter opts out of promotion. */
    overflowLabel?: string;
    /** The toolbar's one right-aligned action. Omit for a toolbar with no primary action. */
    primaryAction?: ListToolbarAction;
    /** The count line's own count (e.g. the number of entries the current filters match). */
    count: number;
    /** The count line's plural noun (e.g. `'households'`). */
    itemLabel: string;
    /** A screen-specific view control (a grid/list density toggle), rendered after the toolbar
     *  band. Omit for a toolbar with no trailing control. */
    trailing?: Snippet;
  }

  let {
    search,
    onSearch,
    searchLabel = 'Search',
    autofocus = false,
    filters = [],
    overflowLabel = 'More filters',
    primaryAction,
    count,
    itemLabel,
    trailing,
  }: Props = $props();

  const promotedFilters = $derived(filters.filter((filter) => filter.promoted !== false));
  const overflowFilters = $derived(filters.filter((filter) => filter.promoted === false));
  const appliedPills = $derived(computeAppliedFilters(filters));
  const countLine = $derived(
    computeCountLine(count, itemLabel, appliedPills.map((pill) => pill.label)),
  );

  function removeFilter(pillId: string) {
    const filter = filters.find((candidate) => candidate.id === pillId);
    filter?.onChange(filter.defaultValue ?? 'all');
  }

  // The overflow disclosure's own open state: a real toggle rather than the bare `:focus-within`
  // daisyUI already gives `.dropdown` for free, so the trigger carries `aria-expanded`/
  // `aria-controls` that actually reflects whether the content is showing, and a click (not just
  // a focus move) opens and closes it.
  let overflowOpen = $state(false);
  const uid = $props.id();
  const overflowId = `${uid}-overflow`;
</script>

<div class="toolkit-toolbar">
  <div class="toolkit-toolbar-band">
    <div class="toolkit-toolbar-controls">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="search"
        class="input input-sm toolkit-toolbar-search"
        aria-label={searchLabel}
        placeholder={searchLabel}
        value={search}
        {autofocus}
        oninput={(event) => onSearch((event.currentTarget as HTMLInputElement).value)}
      />
      {#each promotedFilters as filter (filter.id)}
        {#if filter.display === 'segmented'}
          <div class="join toolkit-toolbar-segmented" role="group" aria-label={filter.label}>
            {#each filter.options as option (option.value)}
              <button
                type="button"
                class="join-item btn btn-sm {option.value === filter.value ? 'btn-active' : ''}"
                aria-pressed={option.value === filter.value}
                onclick={() => filter.onChange(option.value)}
              >{option.label}{#if option.count != null} ({option.count}){/if}</button>
            {/each}
          </div>
        {:else}
          <select
            class="select select-sm toolkit-toolbar-select"
            aria-label={filter.label}
            value={filter.value}
            onchange={(event) => filter.onChange((event.currentTarget as HTMLSelectElement).value)}
          >
            {#each filter.options as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        {/if}
      {/each}
      {#if overflowFilters.length > 0}
        <div class="dropdown" class:dropdown-open={overflowOpen}>
          <button
            type="button"
            class="btn btn-sm btn-outline"
            aria-expanded={overflowOpen}
            aria-controls={overflowId}
            onclick={() => (overflowOpen = !overflowOpen)}
          >{overflowLabel}</button>
          <div id={overflowId} class="dropdown-content menu toolkit-toolbar-overflow">
            {#each overflowFilters as filter (filter.id)}
              <label class="toolkit-toolbar-overflow-field">
                <span>{filter.label}</span>
                <select
                  class="select select-sm"
                  aria-label={filter.label}
                  value={filter.value}
                  onchange={(event) => filter.onChange((event.currentTarget as HTMLSelectElement).value)}
                >
                  {#each filter.options as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </label>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    {#if primaryAction}
      <button
        type="button"
        class="btn btn-primary btn-sm toolkit-toolbar-primary"
        onclick={primaryAction.onClick}
      >
        {primaryAction.label}
      </button>
    {/if}
  </div>
  {#if appliedPills.length > 0}
    <div class="toolkit-toolbar-pills">
      {#each appliedPills as pill (pill.id)}
        <span class="badge badge-neutral badge-sm toolkit-toolbar-pill">
          {pill.label}
          <button
            type="button"
            class="toolkit-toolbar-pill-remove"
            aria-label={`Remove ${pill.label} filter`}
            onclick={() => removeFilter(pill.id)}
          >
            &times;
          </button>
        </span>
      {/each}
    </div>
  {/if}
  <p class="toolkit-toolbar-count">{countLine}</p>
  {#if trailing}
    <div class="toolkit-toolbar-trailing">{@render trailing()}</div>
  {/if}
</div>

<style>
  /* Layout only: shape and color come from the daisyUI classes above, except the pills' neutral
     badge tone (already carried by `badge-neutral` itself) and the muted count line, matching
     `Pagination`'s own range-line color. Values stay literal where there's no shared token that
     survives an `/admin/**` route, per the compiled-CSS constraint the header comment documents. */
  .toolkit-toolbar {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .toolkit-toolbar-band {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.75rem;
  }

  /* A grid, not a wrapped flex row: every promoted control shares one repeating column track, so
     a second wrapped line's controls land under the same column boundaries the first line
     established instead of an organically-sized, misaligned row. `auto-fill` keeps the track
     count viewport-driven (fewer, wider columns on a narrow screen; more on a wide one) without
     any media query of this component's own. */
  .toolkit-toolbar-controls {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    flex: 1 1 auto;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  /* Two columns wide: long enough to show a longer placeholder without clipping, while still
     landing on the same column grid every other control uses. */
  .toolkit-toolbar-search {
    grid-column: span 2;
    width: 100%;
    /* Strips the browser's own `type="search"` chrome (a clear button, and on some engines a
       second, separately-drawn focus ring that layers on top of `.input`'s own themed one,
       reading as a doubled outline): `.input:focus`'s outline below then becomes the only ring a
       reader sees. */
    appearance: none;
  }

  .toolkit-toolbar-select {
    width: 100%;
  }

  .toolkit-toolbar-segmented {
    flex-wrap: wrap;
  }

  .toolkit-toolbar-primary {
    flex-shrink: 0;
    margin-left: auto;
  }

  .toolkit-toolbar-overflow {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .toolkit-toolbar-overflow-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8125rem;
  }

  .toolkit-toolbar-pills {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
  }

  .toolkit-toolbar-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .toolkit-toolbar-pill-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 0.9375rem;
  }

  .toolkit-toolbar-count {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--color-muted);
  }

  .toolkit-toolbar-trailing {
    display: flex;
    align-items: center;
  }
</style>
