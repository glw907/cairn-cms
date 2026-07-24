<!-- @component
The admin toolkit's expand-in-place table row, graduated from aksailingclub-org's
`src/admin-club/toolkit/ExpandableRow.svelte` (its Classes pass landed the component's second real
consumer, the graduation trigger the admin-toolkit organization pass deferred it on). General
contract: a summary `<tr>` plus a conditional panel `<tr>` whose single spanning cell receives the
row's own datum, so the panel snippet never needs a closure over the row it belongs to.

Fully controlled, matching this toolkit's own `Pagination` convention (`page`/`onPageChange`)
rather than owning internal expand state: `expanded` and `onToggle` are props, not `$state`. The
"one row expanded at a time" contract lives in the *caller* holding a single expanded-row id and
deriving `expanded={expandedId === row.id}` for every instance -- the same pattern a radio group's
"one selected at a time" contract rides on `checked`, never on the radio input's own state. A
controlled row also composes cleanly with `AdminTable`'s `rowCount`/empty-state props without this
component needing to know about its siblings.

Keyboard operability rides the native `<button>` element's own Enter/Space activation -- no bespoke
`onkeydown` handler reinvents what the browser already does correctly for a real button. The whole
summary `<tr>` also carries a mouse-only `onclick` convenience (the design spec's "clicking a row
expands it in place"); the explicit trailing button is the one control carrying `aria-expanded` and
the accessible name, which is why summary cells should stay non-interactive (plain text, a
`StatusChip`, and similar) -- an interactive control nested inside the row would double-handle the
click. Per-row actions belong in the panel, never inline in a summary cell, for the same reason.

**The trigger cell is `position: sticky; right: 0`** (the Members pass coherence round).
`AdminTable`'s own horizontal-scroll fallback means a summary row wider than its viewport scrolls
rather than wraps (that component's own contract); without this, a narrow viewport strands the
trigger off-screen with no visible cue that a row even expands. Sticky keeps the trigger inside the
visible viewport at every scroll position, including the unscrolled one, with no JS of its own --
the caller never opts into this, it is unconditional. The sticky cell carries its own opaque
background rather than an inherited one, the standard frozen-column pattern (a pinned column
showing a small, constant seam against the scrolling content underneath it is that pattern's own
contract, not a bug) -- but that background now follows zebra parity (below) instead of a fixed
base-100, and the row-hover wash (also below) still reaches it.

The panel cell stays a genuine `<td colspan>` -- deliberately, not `display: block` -- because a
spanning cell removed from table layout still resolves its width against an anonymous fixup row
the browser generates for a block-display child of a `<tbody>`, and that anonymous row's own width
is *still* driven by the table's real column widths (verified empirically: `width: 100%` on the
un-tabled cell kept measuring the summary rows' own narrower first-two-column width, not the table
wrap's full width, at every viewport). A caller that wants the panel's own internal grid to collapse
at a narrow width needs the table itself to never need horizontal scroll in the first place -- see
Members' own `+page.svelte` for the pattern (hiding lower-priority summary columns under a
breakpoint so the whole row, panel included, fits the viewport with nothing to scroll).

**Three visual fixes carried at graduation (the Members-refinement round-1 audit, adversarially
verified against zebra stripes in both themes):**

1. Row hover feedback: the whole summary row washes on hover. The caller's own summary cells get
   a `color-mix(in oklab, var(--color-base-content) 5%, transparent)` tint; the sticky trigger cell
   gets a dedicated, opaque hover color instead (a transparent-based mix would let content
   scrolling underneath show through a pinned column, and a review pass also found the shared
   rule's specificity lost outright to the zebra-parity rule below on an even row -- see the
   trigger cell's own dedicated hover rules for both). Two other candidates were refuted first for
   the base wash -- the engine's own `base-200/60` row-hover wash is invisible on a zebra-striped
   row (it IS the stripe color), and a primary-tint wash read off-idiom for a plain row hover, not
   an applied-state affordance.
2. The sticky trigger cell follows zebra parity instead of a fixed `base-100`: on a `table-zebra`
   ancestor its background matches the same `tr:nth-child(2n)` rule daisyUI's own zebra striping
   uses, so the pinned column no longer seams against a striped row underneath it.
3. The panel `<td>` carries a depth story instead of sitting flush with the card surface it shares:
   `background: var(--color-base-300)` plus `box-shadow: inset 0 1px 0 var(--cairn-card-border)`.
   `base-200` was tried and refuted first -- it is the zebra stripe's own color, so the drawer
   visually merged with a striped row instead of reading as recessed.
-->
<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Whether this row is currently expanded. Controlled by the caller; see this component's own
     *  header comment for the one-row-at-a-time contract. */
    expanded: boolean;
    /** Called when the trigger control, or the summary row itself, is activated. The caller flips
     *  its own expanded-id state in response; this component holds no state of its own. */
    onToggle: () => void;
    /** The row's own datum, forwarded into `panel` so it doesn't need a closure over the row. */
    datum: T;
    /** How many columns the panel's single spanning cell should cover -- the summary row's own
     *  `<td>` count, including the trailing trigger cell this component renders. */
    colspan: number;
    /** The summary row's `<td>` cells (this component supplies the wrapping `<tr>` and the
     *  trailing trigger cell; the row stays single-line per `AdminTable`'s own contract). */
    summary: Snippet;
    /** The panel's content, rendered inside one spanning cell while `expanded` is `true`. Receives
     *  `datum`. */
    panel: Snippet<[T]>;
    /** An accessible name for the trigger control (e.g. `"Expand the Alvarez household"`), since a
     *  chevron glyph alone carries no text for assistive tech. */
    triggerLabel: string;
  }

  let { expanded, onToggle, datum, colspan, summary, panel, triggerLabel }: Props = $props();
</script>

<tr class="toolkit-expandable-row-summary" onclick={onToggle}>
  {@render summary()}
  <td class="toolkit-expandable-row-trigger-cell">
    <button
      type="button"
      class="btn btn-ghost btn-xs toolkit-expandable-row-trigger"
      aria-expanded={expanded}
      aria-label={triggerLabel}
      onclick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <span aria-hidden="true" class="toolkit-expandable-row-chevron">{expanded ? '▾' : '▸'}</span>
    </button>
  </td>
</tr>
{#if expanded}
  <tr class="toolkit-expandable-row-panel">
    <td {colspan}>
      {@render panel(datum)}
    </td>
  </tr>
{/if}

<style>
  .toolkit-expandable-row-summary {
    cursor: pointer;
  }

  /* Row hover feedback (fix 1 above), for the CALLER's own summary cells. `:global(td)` on the
     child side: those cells are the caller's snippet markup (opaque to this component's compiler,
     the same reason AdminTable's own single-line enforcement rule needs :global() on `td`/`th`),
     so the scope attribute Svelte would otherwise require never lands on them. This rule also
     happens to match the trigger cell (this component's own `<td>`, a direct child of the same
     `<tr>`), but its transparent-based mix is wrong for a `position: sticky` cell -- it would let
     content scrolling underneath show through -- so the trigger cell gets its own higher-specificity,
     opaque rules below, which win over this one. */
  .toolkit-expandable-row-summary:hover > :global(td) {
    background-color: color-mix(in oklab, var(--color-base-content) 5%, transparent);
  }

  .toolkit-expandable-row-trigger-cell {
    width: 1px;
    white-space: nowrap;
    text-align: right;
    /* Always reachable, even when the row is wider than the viewport: see this component's own
       header comment above. */
    position: sticky;
    right: 0;
    background-color: var(--color-base-100);
  }

  /* Zebra parity (fix 2 above): `.table-zebra`/`tbody` are `AdminTable`'s own ancestor markup, not
     this component's, hence :global() on that portion of the selector. Mirroring daisyUI's own
     `tr:nth-child(2n)` zebra selector, rather than reading some zebra-aware prop, keeps this
     component ignorant of whether it sits inside a striped table -- it just always agrees with
     whatever daisyUI itself decided that row's background is. */
  :global(.table-zebra tbody) tr.toolkit-expandable-row-summary:nth-child(2n) .toolkit-expandable-row-trigger-cell {
    background-color: var(--color-base-200);
  }

  /* Trigger cell hover (fix 1's own dedicated half): opaque, since a `position: sticky` cell must
     stay opaque against whatever scrolls underneath it -- a transparent-based mix (the wash the
     rule above gives every other cell) would let that content bleed through. Two rules, one per
     zebra state, each mixed toward that state's own resting color (base-100 / base-200) so hover
     reads as a tint of whatever the cell already was, not a color swap.

     Specificity, not source order, is what makes hover win here: this first rule (0,3,0: two
     classes plus `:hover`) already outranks both the plain resting rule above (0,1,0) and the
     shared `:hover > :global(td)` rule (0,2,1) for this cell specifically. The second rule adds
     the zebra ancestor and `:nth-child(2n)` (0,5,2), which is the only combination in this file
     that outranks the zebra-parity rule immediately above (0,4,2) -- without it, hovering an even
     row left the pinned trigger cell showing its plain zebra color while every other cell in the
     row washed, the seam a review pass caught. */
  .toolkit-expandable-row-summary:hover .toolkit-expandable-row-trigger-cell {
    background-color: color-mix(in oklab, var(--color-base-content) 5%, var(--color-base-100));
  }
  :global(.table-zebra tbody)
    tr.toolkit-expandable-row-summary:hover:nth-child(2n)
    .toolkit-expandable-row-trigger-cell {
    background-color: color-mix(in oklab, var(--color-base-content) 5%, var(--color-base-200));
  }

  .toolkit-expandable-row-chevron {
    display: inline-block;
    font-size: 0.75rem;
  }

  .toolkit-expandable-row-panel td {
    white-space: normal;
    padding: 1rem;
    /* Depth story (fix 3 above). */
    background: var(--color-base-300);
    box-shadow: inset 0 1px 0 var(--cairn-card-border);
  }
</style>
