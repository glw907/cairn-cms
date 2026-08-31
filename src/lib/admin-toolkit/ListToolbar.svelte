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
(imported from the sibling `list-toolbar.ts` module, the same split `Pagination` uses for its own
windowing math) are the count line's scope-label source; there is no longer a separate
applied-pills row (Members-refinement-round-1 retired it: an applied filter now renders its value
in-control instead, on the `'menu'` display below).

Graduation extensions over the ASC-born contract (both additive, ASC's own existing usage stays
valid): a filter's `display` chooses `'select'` (the original contract, unchanged, restyled to
the shared 30px height and 13px text and, since the C2 coherence-round fix, `width: auto` so it
sizes to its own content rather than daisyUI's fixed 320px clamp, `max-width: 100%` so it never
exceeds its container, and a border tinted to the same `--cairn-card-border` a `'menu'` facet
carries, so a select and a menu facet sitting side by side read as one control family), or
`'segmented'`, a group of toggle buttons for a filter
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
and `dropdown`/`dropdown-content`/`dropdown-open`/`menu` (the overflow disclosure and each
`'menu'` facet's own option list). Each `'menu'` facet's option list is a real ARIA menu of
`role="menuitemradio"` options (a single-select choice within the menu, not bare `"menuitem"`
buttons in a plain list), each carrying `aria-checked` so the applied value is exposed to
assistive tech the same way the segmented filter's own `role="radio"` options already are, not
just through the sighted-only check glyph (WCAG 1.3.1/4.1.2). The roving tabindex still applies:
only the focused option is a Tab stop, and ArrowUp/ArrowDown/Home/End move that focus, wrapping at
the ends. The controls row, the segmented group, and the count line's muted color live in this
component's own scoped `<style>`, per the compiled-CSS constraint documented on
`StatusChip`/`Pagination`: an unverified Tailwind utility string never reaches an `/admin/**`
route.

The overflow disclosure and each `'menu'` facet both fold onto `ToolbarDisclosure`
(`audit-admin-listtoolbar`'s reshape): the trigger `aria-expanded`/`aria-controls`, focus-into-
panel-on-open, Escape-plus-return-focus, outside-pointerdown, and focus-leaves-the-boundary
mechanics all live there now, driven from this component only by `open`/`onOpenChange` (the same
fully-controlled convention every other prop here carries). Single-open-at-a-time for the facets
stays here, in `openFacetId`, which no self-contained disclosure primitive could enforce on its
own: each facet's own `open` derives from `openFacetId === filter.id`, and setting a new id on
open closes whichever facet held it before, purely as a side effect of that derivation. The
ARIA-menu content layer above (`role="menu"`, `role="menuitemradio"`, arrow roving, reset-to-
first-on-open) stays entirely in this component's own panel snippet, never in the primitive: it is
facet behavior, not disclosure mechanics, and `ToolbarDisclosure` accepts only the trigger's own
`aria-haspopup` value as a prop, carrying no opinion about what the panel holds.

The band is a single wrapped flex row, not a CSS grid: search, every promoted filter, the
overflow trigger (when present), and the primary action all share one `flex-wrap: wrap` line, so
they wrap together as one unit on a narrow viewport rather than the primary action landing on its
own line below an independently-wrapping controls cluster.

Only one facet menu is open at a time (a second facet's trigger closes the first, mirroring how a
native `<select>` or the overflow disclosure itself never shows two panels at once); see
`ToolbarDisclosure`'s own header comment for the five dismissal mechanics themselves.

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
    type ListToolbarAction,
    type ListToolbarFilter,
    type ListToolbarFilterOption,
  } from './list-toolbar.js';
  import type { ItemLabel } from './format.js';

  export { computeFacetLabel };
  export type { ListToolbarAction, ListToolbarFilter, ListToolbarFilterOption };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CheckIcon, SearchIcon } from '../components/admin-icons.js';
  import ToolbarDisclosure from './ToolbarDisclosure.svelte';

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

  // The overflow disclosure's own open state, and single-open-at-a-time for the `'menu'` facets
  // (keyed by filter id, since any number can render in one toolbar): both are the ONE piece of
  // coordination `ToolbarDisclosure` itself cannot own, since it is a single self-contained
  // instance with no notion of its siblings. Every other disclosure mechanic (aria-expanded/
  // aria-controls, focus-into-panel, Escape, outside-pointerdown, focus-leaves-the-boundary) lives
  // in `ToolbarDisclosure`; see this component's own header comment.
  let overflowOpen = $state(false);
  let openFacetId = $state<string | null>(null);

  // A `'menu'` facet's option list is a real ARIA menu (role="menu"/"menuitemradio"), so it
  // carries the standard roving-tabindex keyboard model, not one tab stop per option: only the
  // currently-focused option is a Tab stop, keyed by filter id the same way `openFacetId` is (any
  // number of `'menu'` facets can render in one toolbar). Reopening a facet after a prior arrow-key
  // move resets this index to 0 (see the facet's own `onOpenChange` below): without that reset, a
  // stale non-zero index is itself the only tabbable option, so `ToolbarDisclosure`'s own
  // focus-into-panel mechanic would land back on the previously-arrowed option instead of the
  // first one, the APG menu-button behavior a real Tab keypress on a freshly-opened menu gives.
  let facetFocusIndex = $state<Record<string, number>>({});

  // Each facet's own trigger element, for `selectFacetOption`'s own focus-return: `ToolbarDisclosure`
  // never renders the trigger itself (it stays this component's own markup, per its controlled,
  // snippet-based contract), so it only knows to return focus to the trigger on ITS OWN Escape/
  // outside-pointerdown/focusout mechanics. Selecting an option closes the facet from here, a
  // parent-driven close the primitive cannot see as "its own" dismissal, so the focus-return is
  // this component's own responsibility too.
  let facetTriggerEls = $state<Record<string, HTMLButtonElement | null>>({});

  // Clamped, not read raw: if a menu's own options array shrinks while it is open (a live facet
  // vocabulary), a stale stored index could point past the end and leave every remaining option at
  // tabindex="-1" with no tab stop at all. Clamping in the accessor keeps the stored value itself
  // untouched (no extra effect to keep it in sync) while every render still resolves a real option.
  function facetOptionTabIndex(filter: ListToolbarFilter, index: number): number {
    const stored = facetFocusIndex[filter.id] ?? 0;
    const effective = Math.min(stored, filter.options.length - 1);
    return effective === index ? 0 : -1;
  }
  function onFacetOptionFocus(filter: ListToolbarFilter, index: number) {
    facetFocusIndex = { ...facetFocusIndex, [filter.id]: index };
  }
  // ArrowUp/ArrowDown move the roving focus, wrapping at the ends; Home/End jump to the first/
  // last option. Mirrors `onSegmentedKeydown`'s own DOM-read-siblings approach below, except a
  // menu's arrow keys move focus alone (Enter/click still does the selecting), where a radio
  // group's arrow keys move the selection itself.
  function onFacetMenuKeydown(event: KeyboardEvent) {
    const menu = (event.currentTarget as HTMLElement).closest('[role="menu"]');
    if (!menu) return;
    const options = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
    const current = options.indexOf(event.currentTarget as HTMLButtonElement);
    let next = current;
    if (event.key === 'ArrowDown') next = (current + 1) % options.length;
    else if (event.key === 'ArrowUp') next = (current - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else return;
    event.preventDefault();
    options[next]?.focus();
  }

  // Selecting an option is a parent-driven close (`ToolbarDisclosure` only owns the mechanics that
  // dismiss ITS OWN panel; a caller reacting to its own content's own onclick is a third kind of
  // close this component drives directly), so the focus-return to the trigger is this component's
  // own responsibility too, per `facetTriggerEls`'s own comment above.
  function selectFacetOption(filter: ListToolbarFilter, value: string) {
    filter.onChange(value);
    openFacetId = null;
    facetTriggerEls[filter.id]?.focus();
  }
  // Focus moves to the trigger BEFORE the state change: `applied` flipping false unmounts the
  // clear button this handler runs on, so focusing the trigger after `onChange` would already be
  // too late (the clear button, and any focus it held, is gone by then, dropping focus to body).
  function clearFacet(filter: ListToolbarFilter) {
    facetTriggerEls[filter.id]?.focus();
    filter.onChange(filter.defaultValue ?? 'all');
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
        <ToolbarDisclosure
          open={openFacetId === filter.id}
          onOpenChange={(next) => {
            openFacetId = next ? filter.id : null;
            if (next) facetFocusIndex = { ...facetFocusIndex, [filter.id]: 0 };
          }}
          ariaHaspopup="menu"
          containerClass="toolkit-toolbar-facet {applied ? 'toolkit-toolbar-facet-applied' : ''}"
        >
          {#snippet trigger(attrs)}
            <button
              type="button"
              class="toolkit-toolbar-facet-trigger"
              class:toolkit-toolbar-facet-trigger-applied={applied}
              bind:this={facetTriggerEls[filter.id]}
              {...attrs}
            >
              <span class="toolkit-toolbar-facet-value">{computeFacetLabel(filter)}</span>
              <span class="toolkit-toolbar-facet-caret" aria-hidden="true">&#9662;</span>
            </button>
          {/snippet}
          {#snippet extra()}
            {#if applied}
              <button
                type="button"
                class="toolkit-toolbar-facet-clear"
                aria-label={`Clear ${filter.label} filter`}
                onclick={() => clearFacet(filter)}
              >&times;</button>
            {/if}
          {/snippet}
          {#snippet panel(attrs)}
            <ul
              id={attrs.id}
              hidden={attrs.hidden}
              class="dropdown-content menu toolkit-toolbar-facet-menu"
              role="menu"
              aria-label={filter.label}
            >
              {#each filter.options as option, index (option.value)}
                <li role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={option.value === filter.value}
                    tabindex={facetOptionTabIndex(filter, index)}
                    onclick={() => selectFacetOption(filter, option.value)}
                    onfocus={() => onFacetOptionFocus(filter, index)}
                    onkeydown={onFacetMenuKeydown}
                  >
                    {#if option.value === filter.value}<CheckIcon class="h-3 w-3" aria-hidden="true" />{/if}
                    {option.label}
                  </button>
                </li>
              {/each}
            </ul>
          {/snippet}
        </ToolbarDisclosure>
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
      <ToolbarDisclosure
        open={overflowOpen}
        onOpenChange={(next) => { overflowOpen = next; }}
      >
        {#snippet trigger(attrs)}
          <button
            type="button"
            class="btn btn-sm btn-outline toolkit-toolbar-overflow-trigger"
            {...attrs}
          >{overflowLabel}</button>
        {/snippet}
        {#snippet panel(attrs)}
          <div id={attrs.id} hidden={attrs.hidden} class="dropdown-content menu toolkit-toolbar-overflow">
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
        {/snippet}
      </ToolbarDisclosure>
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
    gap: var(--cairn-gap-control, 0.5rem);
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
    font-size: var(--cairn-type-meta, 0.8125rem);
  }

  /* Measured root cause (the coherence-round finding): daisyUI's own `.select` sets
     `width: clamp(3rem, 20rem, 100%)`, and `20rem` is a fixed length rather than a
     container-relative one, so every select pins to exactly 320px regardless of its own options
     -- a lone season select on a sibling screen held a 4-character value at that width, and four
     of them together wrapped the whole toolbar off one line at a realistic container width.
     `width: auto` restores the native `<select>`'s own content-driven sizing (the browser sizes it
     to its own longest option); `max-width: 100%` is the hard floor that still keeps it inside a
     narrow container, since `flex: 0 0 auto` alone would let it overflow rather than shrink.
     `--input-color` is the same custom property the compiled `.select` rule reads for both its
     border and its inset box-shadow, so overriding it here (rather than `border-color` alone)
     pulls both onto the `'menu'` facet's own `--cairn-card-border` treatment in one step -- a
     select and a menu facet sitting side by side now read as the same control family instead of
     two different border vocabularies. */
  .toolkit-toolbar-select {
    flex: 0 0 auto;
    width: auto;
    max-width: 100%;
    height: 30px;
    min-height: 30px;
    font-size: var(--cairn-type-meta, 0.8125rem);
    --input-color: var(--cairn-card-border);
  }

  /* `flex: 0 1 auto` plus `min-width: 0` let the group shrink below its own preferred width
     (the flexbox default that overflowed the 320px composition floor: a three-option triage with
     count badges renders past 320px on its own, and the prior `flex: 0 0 auto` refused to yield
     that width back). The shrink half alone fixes the overflow; the group keeps its own no-grow
     basis rather than claiming free space from the row, so the toolbar stays flush right at
     desktop widths. `flex-wrap: wrap` then wraps the group's own buttons onto a second line
     inside whatever width it was given, rather than the whole row scrolling past the viewport. */
  .toolkit-toolbar-segmented {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
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

  /* The 'menu' facet's own box chrome: a quiet bordered pair (trigger plus optional clear),
     sharing the toolbar row's 30px height. `display: inline-flex; align-items: stretch` stretches
     both children to that height, since neither sets its own; `overflow` stays default (visible),
     since this element is also the panel's own `position: absolute` containing block (daisyUI's
     own `.dropdown`/`.dropdown-content` pair, via `ToolbarDisclosure`'s own always-applied
     `dropdown` class) and `hidden` would clip the panel away entirely rather than just tidy the
     trigger/clear corners. `:global()`, not a plain scoped selector: this class names the
     `containerClass` this component passes into `ToolbarDisclosure`, so the element it matches is
     rendered by that component, not this one, and Svelte's per-component style scoping would
     otherwise silently drop the rule (see `ToolbarDisclosure`'s own header comment on why
     `containerClass` exists and stays this component's own responsibility to style). Nested under
     `.toolkit-toolbar` (this component's own scoped root, always an ancestor of every facet it
     renders): the reach is unchanged, but the selector no longer matches a same-named class
     anywhere else in the document. */
  .toolkit-toolbar :global(.toolkit-toolbar-facet) {
    display: inline-flex;
    align-items: stretch;
    flex: 0 0 auto;
    height: 30px;
    border-radius: var(--radius-field);
    border: 1px solid var(--cairn-card-border);
    background: transparent;
  }

  /* The bordered-and-tinted applied treatment: border and fill mixed from --color-primary, added
     to the container alongside `.toolkit-toolbar-facet` (above) once a filter carries a value.
     `:global()` and the `.toolkit-toolbar` nesting for the same reason as `.toolkit-toolbar-facet`
     above. */
  .toolkit-toolbar :global(.toolkit-toolbar-facet-applied) {
    border-color: color-mix(in oklab, var(--color-primary) 45%, var(--cairn-card-border));
    background: color-mix(in oklab, var(--color-primary) 7%, transparent);
  }

  /* The 'menu' facet's own trigger: shares the row's 30px height inside `ToolbarDisclosure`'s own
     bordered box (`containerClass="toolkit-toolbar-facet ..."`, styled above). */
  .toolkit-toolbar-facet-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.3125rem;
    padding: 0 0.625rem;
    font-size: var(--cairn-type-meta, 0.8125rem);
    line-height: 1;
    white-space: nowrap;
    background: transparent;
    border: none;
    cursor: pointer;
    color: inherit;
    min-width: 0;
    /* Rounds the shared border's own left corner; the trigger is always the first child. */
    border-top-left-radius: var(--radius-field);
    border-bottom-left-radius: var(--radius-field);
  }

  /* The in-control value caps at 14rem with an ellipsis once a facet carries an applied value, so
     a long applied value (a class title, say) never pushes the row wide. Driven by the same
     `applied` boolean that names `.toolkit-toolbar-facet-applied` on the container above, applied
     directly to this element's own class instead, since this element is rendered directly by this
     component and needs no `:global()` to reach it. */
  .toolkit-toolbar-facet-trigger-applied {
    max-width: 14rem;
  }
  .toolkit-toolbar-facet-trigger-applied .toolkit-toolbar-facet-value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .toolkit-toolbar-facet-caret {
    opacity: 0.55;
    font-size: var(--cairn-type-chip, 0.625rem);
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
    font-size: var(--cairn-type-subtitle, 0.9375rem);
    line-height: 1;
    padding: 0;
    /* Rounds the shared border's own right corner, now that `.toolkit-toolbar-facet` no longer
       clips it there with `overflow: hidden`. */
    border-top-right-radius: var(--radius-field);
    border-bottom-right-radius: var(--radius-field);
  }
  /* :focus-visible pairs the same tint with a keyboard tab onto this button, so a keyboard user
     sees the same affordance a mouse hover gives (cairn-audit's focus-parity rule). */
  .toolkit-toolbar-facet-clear:hover,
  .toolkit-toolbar-facet-clear:focus-visible {
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
    gap: var(--cairn-gap-control, 0.5rem);
    padding: 0.75rem;
  }

  .toolkit-toolbar-overflow-field {
    display: flex;
    flex-direction: column;
    gap: var(--cairn-gap-label, 0.25rem);
    font-size: var(--cairn-type-meta, 0.8125rem);
  }

  .toolkit-toolbar-count {
    margin: 0;
    font-size: var(--cairn-type-meta, 0.8125rem);
    font-variant-numeric: tabular-nums;
    color: var(--color-muted);
  }

  .toolkit-toolbar-trailing {
    display: flex;
    align-items: center;
  }
</style>
