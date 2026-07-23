<!--
@component
The admin toolkit's list-header band, graduated from aksailingclub-org's
`src/admin-club/toolkit/ListToolbar.svelte`. General contract: search, any number of promoted
filters, an overflow disclosure for filters a screen chooses not to promote (present in the
contract even when a consumer promotes every filter and never renders it), exactly one
right-aligned primary action, and a count line that always states its own filter scope.

Every prop is a controlled value plus a change callback, the same fully-controlled convention
`Pagination` already establishes: a search box's own text, a filter's own selected value, and
which filters are promoted are all state the caller owns, never this component. `onChange`/
`onClick` carry no domain knowledge of what a filter means or what an action does; a filter's own
vocabulary is entirely the consumer's own filter definitions passed in, never hardcoded here.

The controls cluster is a single flex row (`flex-wrap: wrap`), not a grid: search grows and
shrinks (`flex: 1 1 240px`, `min-width: 140px`) while every filter control keeps its own
intrinsic width, and every control across the row (search, select, segmented, menu) shares one
forced 30px height rather than trusting `input-sm`/`btn-sm` to already agree (they render
slightly different heights in practice). `computeAppliedFilters` and `computeCountLine`
(re-exported below from the sibling `list-toolbar.ts` module, the same split `Pagination` uses
for its own windowing math) are the count line's scope-label source; there is no longer a
separate applied-pills row (Members-refinement-round-1 retired it: an applied filter now renders
its value in-control instead, on the `'menu'` display below).

Graduation extensions over the ASC-born contract (both additive, ASC's own existing usage stays
valid): a filter's `display` chooses `'select'` (the original contract, unchanged, restyled to
the shared 30px height and 13px text), `'segmented'`, a group of toggle buttons for a filter
whose vocabulary reads better as always-visible tabs than a dropdown (a publish-state filter, a
triage radiogroup), with each option's own optional `count` rendered beside its label, or
`'menu'` (Members-refinement-round-1: the ratified filter grammar), a quiet bordered button
showing the filter's own name at rest (`"Standing"`) and its applied value in-control
(`"Standing: Overdue"`) with a separate inline clear affordance (its own sibling element, never a
button nested inside the trigger button) once a value departs the filter's default. An applied
`'menu'` facet carries its own treatment (`border-color`/`background` mixed from `--color-primary`
against `--cairn-card-border`) and caps its in-control value at `max-width: 14rem` with an
ellipsis, so a long applied value never pushes the row wide. A segmented filter's overflow form
(when `promoted` is `false`) still renders as a `<select>`, since a button group behind a
disclosure menu loses the always-visible scan-ability segmented display exists for; a `'menu'`
facet's overflow form renders as a `<select>` for the same reason. The optional `trailing`
snippet renders after the toolbar band, for a screen-specific view control this component has no
vocabulary for (a grid/list density toggle).

A segmented filter is a real ARIA radiogroup, not a bare button group (the admin-toolkit
organization pass's T6 absorption: ConceptList's and MediaLibrary's own pre-toolbar segmented
controls each independently carried this pattern, and MediaLibrary's carried the fuller
implementation, so it is the one graduated here rather than forked twice more). The wrapping `join`
is `role="radiogroup"` and each option is `role="radio"` with `aria-checked`, never `aria-pressed`;
only the checked option is a tab stop (`tabindex="0"`), every other option is `tabindex="-1"`, and
ArrowRight/ArrowDown, ArrowLeft/ArrowUp, Home, and End move both the selection and the focus
together, mirroring the native radio-button keyboard model. The checked option also carries a small
check glyph (`aria-hidden`) beside its label, the non-color selected cue (WCAG 1.4.1) both source
screens already carried. The search box carries a leading search icon inside a `label.input`
wrapper, the same daisyUI labeled-input convention both source screens already used ahead of this
graduation.

Assembles from daisyUI 5 primitives already compiled into cairn's packaged `cairn-admin.css`:
`input`/`input-sm`, `select`/`select-sm`, `btn`/`btn-sm`/`btn-primary`/`btn-outline`/`btn-active`,
`join`/`join-item` (the segmented display, the same assembly `Pagination`'s own page nav uses),
and `dropdown`/`dropdown-content`/`dropdown-open`/`menu` (the overflow disclosure and, since the
recomposition, each `'menu'` facet's own option list too, every one driven by a real `$state`
toggle rather than the bare `:focus-within` daisyUI gives every `.dropdown` for free). The
controls row, the facet control's own quiet-button chrome and applied treatment, the segmented
group, and the count line's muted color live in this component's own scoped `<style>`, per the
compiled-CSS constraint documented on `StatusChip`/`Pagination`: an unverified Tailwind utility
string never reaches an `/admin/**` route.

The band is a single wrapped flex row, not a CSS grid: search, every promoted filter, the
overflow trigger (when present), and the primary action all share one `flex-wrap: wrap` line, so
they wrap together as one unit on a narrow viewport rather than the primary action landing on its
own line below an independently-wrapping controls cluster.

The overflow disclosure and each `'menu'` facet are full disclosure patterns, not just an
`aria-expanded` toggle: Escape (fired from the trigger or from a control inside the panel) closes
the open one and returns focus to its own trigger, and a pointerdown outside the open
disclosure's trigger+panel closes it without moving focus. Only one facet menu is open at a time
(a second facet's trigger closes the first, mirroring how a native `<select>` or the overflow
disclosure itself never shows two panels at once).

The count line and (on `Pagination`) the item-range line are `role="status"` live regions
(`aria-live="polite"`, `aria-atomic="true"`): a search or filter change updates the line's text with
no focus move, so an AT user only hears the new scope if it is announced as a status message. The
count line's own text carries `font-variant-numeric: tabular-nums`, so a changing count never
reflows its neighboring characters.
-->
<script module lang="ts">
  import {
    computeAppliedFilters,
    computeCountLine,
    computeFacetLabel,
    type AppliedFilterPill,
    type ListToolbarAction,
    type ListToolbarFilter,
    type ListToolbarFilterOption,
  } from './list-toolbar.js';
  import type { ItemLabel } from './format.js';

  export { computeAppliedFilters, computeCountLine, computeFacetLabel };
  export type { AppliedFilterPill, ListToolbarAction, ListToolbarFilter, ListToolbarFilterOption };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CheckIcon, SearchIcon } from '../components/admin-icons.js';

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
    /** The count line's noun (e.g. `'households'`). A plain string is invariant across every
     *  count, the original contract unchanged; an `{ one, many }` pair picks by grammatical
     *  number through `itemNoun`, so a count of exactly 1 reads its singular form. */
    itemLabel: string | ItemLabel;
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

  // The overflow disclosure's own open state: a real toggle rather than the bare `:focus-within`
  // daisyUI already gives `.dropdown` for free, so the trigger carries `aria-expanded`/
  // `aria-controls` that actually reflects whether the content is showing, and a click (not just
  // a focus move) opens and closes it.
  let overflowOpen = $state(false);
  const uid = $props.id();
  const overflowId = `${uid}-overflow`;

  // The disclosure's own trigger and container refs: the trigger is the Escape focus-return
  // target, and the container is the outside-click boundary (a pointerdown landing outside it
  // closes the disclosure without moving focus, the standard disclosure-pattern shape).
  let overflowTriggerEl = $state<HTMLButtonElement | null>(null);
  let overflowContainerEl = $state<HTMLElement | null>(null);

  function toggleOverflow() {
    overflowOpen = !overflowOpen;
  }
  function closeOverflow(returnFocus: boolean) {
    if (!overflowOpen) return;
    overflowOpen = false;
    if (returnFocus) overflowTriggerEl?.focus();
  }
  // Escape closes the disclosure and returns focus to the trigger, whether it fires from the
  // trigger button or from a control inside the panel (the keydown bubbles to this container).
  // Attached programmatically below rather than a declarative `onkeydown` on the container, since
  // the container carries no interactive role of its own (it is delegation, not an affordance);
  // the same pattern the toolbar/shortcut keydown delegation elsewhere in this codebase uses.
  function onOverflowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && overflowOpen) {
      event.preventDefault();
      closeOverflow(true);
    }
  }
  $effect(() => {
    const el = overflowContainerEl;
    if (!el) return;
    el.addEventListener('keydown', onOverflowKeydown);
    return () => el.removeEventListener('keydown', onOverflowKeydown);
  });
  // A pointerdown anywhere outside the trigger+panel closes the disclosure without moving focus
  // (the standard light-dismiss shape); a window listener rather than a document-level one keeps
  // this component's own event wiring self-contained, matching Svelte's `<svelte:window>` idiom.
  // Shared with the facet menus below, since both are light-dismiss disclosures.
  function onWindowPointerdown(event: PointerEvent) {
    if (overflowOpen && overflowContainerEl && !overflowContainerEl.contains(event.target as Node)) {
      closeOverflow(false);
    }
    if (openFacetId !== null) {
      const container = document.querySelector(`[data-facet-id="${openFacetId}"]`);
      if (container && !container.contains(event.target as Node)) closeFacet(false);
    }
  }

  // A `'menu'`-display facet's own disclosure state: only one facet menu is open at a time
  // (keyed by filter id, since any number of `'menu'` facets can render in one toolbar), the
  // same single-panel behavior a native `<select>` or the overflow disclosure itself already
  // gives for free. `data-facet-id` on each facet's own container is the outside-click and
  // focus-return lookup, rather than a per-filter ref array (the same reasoning
  // `onSegmentedKeydown` already uses for reading its siblings from the DOM).
  let openFacetId = $state<string | null>(null);

  function toggleFacet(id: string) {
    openFacetId = openFacetId === id ? null : id;
  }
  function closeFacet(returnFocus: boolean) {
    if (openFacetId === null) return;
    const id = openFacetId;
    openFacetId = null;
    if (returnFocus) {
      document.querySelector<HTMLButtonElement>(`[data-facet-id="${id}"] .toolkit-toolbar-facet-trigger`)?.focus();
    }
  }
  function selectFacetOption(filter: ListToolbarFilter, value: string) {
    filter.onChange(value);
    closeFacet(true);
  }
  function clearFacet(filter: ListToolbarFilter) {
    filter.onChange(filter.defaultValue ?? 'all');
  }
  // Escape closes whichever facet menu is open and returns focus to its own trigger. A window
  // listener (rather than a per-facet container listener, the pattern `onOverflowKeydown` uses)
  // since a facet's container is created and destroyed by the `{#each}` block itself, so there is
  // no stable single ref to attach to the way `overflowContainerEl` gives the overflow disclosure.
  function onFacetWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && openFacetId !== null) {
      event.preventDefault();
      closeFacet(true);
    }
  }

  // A segmented filter's roving-tabindex ARIA radio pattern (graduated from MediaLibrary's own
  // pre-toolbar triage radiogroup): the checked option is the only tab stop, and the arrow/Home/End
  // keys move the selection and the focus together, mirroring a native radio group. Reading the
  // sibling radios from the DOM at keydown time (rather than a bound ref array) keeps this correct
  // for any number of segmented filters without a per-filter ref collection.
  function onSegmentedKeydown(event: KeyboardEvent, filter: ListToolbarFilter) {
    const group = (event.currentTarget as HTMLElement).closest('[role="radiogroup"]');
    if (!group) return;
    const radios = Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const current = radios.indexOf(event.currentTarget as HTMLButtonElement);
    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % radios.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + radios.length) % radios.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = radios.length - 1;
    else return;
    event.preventDefault();
    filter.onChange(filter.options[next].value);
    radios[next]?.focus();
  }
</script>

<svelte:window onpointerdown={onWindowPointerdown} onkeydown={onFacetWindowKeydown} />

<div class="toolkit-toolbar">
  <div class="toolkit-toolbar-band">
    <label class="input input-sm toolkit-toolbar-search">
      <SearchIcon class="h-4 w-4 opacity-60" aria-hidden="true" />
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="search"
        aria-label={searchLabel}
        placeholder={searchLabel}
        value={search}
        {autofocus}
        oninput={(event) => onSearch((event.currentTarget as HTMLInputElement).value)}
      />
    </label>
    {#each promotedFilters as filter (filter.id)}
      {#if filter.display === 'segmented'}
        <div class="join toolkit-toolbar-segmented" role="radiogroup" aria-label={filter.label}>
          {#each filter.options as option (option.value)}
            <button
              type="button"
              role="radio"
              class="join-item btn btn-sm {option.value === filter.value ? 'btn-active' : ''}"
              aria-checked={option.value === filter.value}
              tabindex={option.value === filter.value ? 0 : -1}
              onclick={() => filter.onChange(option.value)}
              onkeydown={(event) => onSegmentedKeydown(event, filter)}
            >
              {#if option.value === filter.value}<CheckIcon class="h-3 w-3" aria-hidden="true" />{/if}
              {option.label}{#if option.count != null}<span class="toolkit-toolbar-segment-count">{option.count}</span>{/if}
            </button>
          {/each}
        </div>
      {:else if filter.display === 'menu'}
        {@const applied = filter.value !== (filter.defaultValue ?? 'all')}
        {@const menuId = `${uid}-facet-${filter.id}`}
        <div
          class="dropdown toolkit-toolbar-facet"
          class:toolkit-toolbar-facet-applied={applied}
          class:dropdown-open={openFacetId === filter.id}
          data-facet-id={filter.id}
        >
          <button
            type="button"
            class="toolkit-toolbar-facet-trigger"
            aria-expanded={openFacetId === filter.id}
            aria-controls={menuId}
            onclick={() => toggleFacet(filter.id)}
          >
            <span class="toolkit-toolbar-facet-value">{computeFacetLabel(filter)}</span>
            <span class="toolkit-toolbar-facet-caret" aria-hidden="true">&#9662;</span>
          </button>
          {#if applied}
            <button
              type="button"
              class="toolkit-toolbar-facet-clear"
              aria-label={`Clear ${filter.label} filter`}
              onclick={() => clearFacet(filter)}
            >&times;</button>
          {/if}
          <ul id={menuId} class="dropdown-content menu toolkit-toolbar-facet-menu" aria-label={filter.label}>
            {#each filter.options as option (option.value)}
              <li>
                <button type="button" onclick={() => selectFacetOption(filter, option.value)}>
                  {#if option.value === filter.value}<CheckIcon class="h-3 w-3" aria-hidden="true" />{/if}
                  {option.label}
                </button>
              </li>
            {/each}
          </ul>
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
      <div class="dropdown" class:dropdown-open={overflowOpen} bind:this={overflowContainerEl}>
        <button
          type="button"
          class="btn btn-sm btn-outline toolkit-toolbar-overflow-trigger"
          aria-expanded={overflowOpen}
          aria-controls={overflowId}
          bind:this={overflowTriggerEl}
          onclick={toggleOverflow}
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
  <p class="toolkit-toolbar-count" role="status" aria-live="polite" aria-atomic="true">{countLine}</p>
  {#if trailing}
    <div class="toolkit-toolbar-trailing">{@render trailing()}</div>
  {/if}
</div>

<style>
  /* Layout only: shape and color come from the daisyUI classes above, except the facet's own
     applied treatment (mixed from --color-primary, since no daisy utility carries that ratio),
     the shared control height, and the muted count line, matching `Pagination`'s own range-line
     color. Values stay literal where there's no shared token that survives an `/admin/**` route,
     per the compiled-CSS constraint the header comment documents. Recomposed for
     Members-refinement-round-1 (the refuter-verified recipe: flex row, forced 30px control
     height, the menu facet's applied treatment and 14rem ellipsis cap). */
  .toolkit-toolbar {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  /* The band is a single wrapped flex row: search, every promoted control, the overflow trigger,
     and the primary action all wrap together as one unit, rather than an inner controls cluster
     wrapping independently of an outer primary-action row (the prior grid-based composition). */
  .toolkit-toolbar-band {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    row-gap: 0.625rem;
  }

  .toolkit-toolbar-search {
    flex: 1 1 240px;
    min-width: 140px;
    height: 30px;
  }

  /* Strips the browser's own `type="search"` chrome (a clear button, and on some engines a
     second, separately-drawn focus ring that layers on top of `.input`'s own themed one, reading
     as a doubled outline): `.input:focus-within`'s outline on the wrapping label then becomes the
     only ring a reader sees. The forced height/font-size join every other control on the row's
     shared 30px/13px sizing (input-sm's own size math does not already agree with btn-sm's). */
  .toolkit-toolbar-search :global(input) {
    appearance: none;
    height: 30px;
    min-height: 30px;
    font-size: 0.8125rem;
  }

  .toolkit-toolbar-select {
    flex: 0 0 auto;
    height: 30px;
    min-height: 30px;
    font-size: 0.8125rem;
  }

  .toolkit-toolbar-segmented {
    flex: 0 0 auto;
    flex-wrap: wrap;
  }

  /* The segmented buttons join the row's shared 30px control height, the same reasoning the
     search box and the menu facet's own trigger already carry it. */
  .toolkit-toolbar-segmented :global(button) {
    height: 30px;
    min-height: 30px;
  }

  /* The per-option count: visually secondary to its own label, opacity-dimmed (not a separate
     muted color) so it reads correctly against both a plain and an active/tinted `.btn-active`
     segment, the same opacity-based dimming ConceptList's own draft-row treatment uses. */
  .toolkit-toolbar-segment-count {
    margin-left: 0.375rem;
    opacity: 0.65;
  }

  /* The 'menu' facet's own control: a quiet bordered button pair (trigger + optional clear),
     sharing the row's 30px height. `overflow: hidden` on the shared rounded border keeps the
     clear button's own left divider from poking past the rounded corner. */
  .toolkit-toolbar-facet {
    display: inline-flex;
    align-items: stretch;
    flex: 0 0 auto;
    height: 30px;
    border-radius: var(--radius-field);
    border: 1px solid var(--cairn-card-border);
    background: transparent;
    overflow: hidden;
  }

  .toolkit-toolbar-facet-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.3125rem;
    padding: 0 0.625rem;
    font-size: 0.8125rem;
    line-height: 1;
    white-space: nowrap;
    background: transparent;
    border: none;
    cursor: pointer;
    color: inherit;
    min-width: 0;
  }

  /* The applied treatment: a primary-tinted border and fill, refuter-verified against the
     alternative of leaving an applied facet visually identical to an unapplied one. The in-control
     value caps at 14rem with an ellipsis, so a long applied value (a class title, say) never
     pushes the row wide. */
  .toolkit-toolbar-facet-applied {
    border-color: color-mix(in oklab, var(--color-primary) 45%, var(--cairn-card-border));
    background: color-mix(in oklab, var(--color-primary) 7%, transparent);
  }
  .toolkit-toolbar-facet-applied .toolkit-toolbar-facet-trigger {
    max-width: 14rem;
  }
  .toolkit-toolbar-facet-applied .toolkit-toolbar-facet-value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .toolkit-toolbar-facet-caret {
    opacity: 0.55;
    font-size: 0.625rem;
    transform: translateY(1px);
    flex-shrink: 0;
  }

  /* The inline clear affordance: its own sibling element, never a button nested inside the
     trigger button (a nested interactive control is invalid markup and unreliable to activate).
     Its own left border reuses the applied border's tint, so the divider reads as part of the
     same applied treatment rather than a separate control. */
  .toolkit-toolbar-facet-clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    flex-shrink: 0;
    border: none;
    border-left: 1px solid color-mix(in oklab, var(--color-primary) 45%, var(--cairn-card-border));
    background: transparent;
    cursor: pointer;
    color: inherit;
    font-size: 0.9375rem;
    line-height: 1;
    padding: 0;
  }
  .toolkit-toolbar-facet-clear:hover {
    background: color-mix(in oklab, var(--color-primary) 12%, transparent);
  }

  .toolkit-toolbar-facet-menu {
    min-width: 10rem;
  }

  .toolkit-toolbar-overflow-trigger {
    height: 30px;
    min-height: 30px;
  }

  .toolkit-toolbar-primary {
    flex-shrink: 0;
    margin-left: auto;
    height: 30px;
    min-height: 30px;
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

  .toolkit-toolbar-count {
    margin: 0;
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
    color: var(--color-muted);
  }

  .toolkit-toolbar-trailing {
    display: flex;
    align-items: center;
  }
</style>
