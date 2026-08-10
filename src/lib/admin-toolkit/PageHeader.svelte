<!--
@component
The admin toolkit's canonical page-header recipe (ruling 3 of the 2026-07-20 admin-toolkit
organization pass's adoption map): the `OfficeList` shape, generalized. An optional eyebrow, the
page's one display-face `h1`, an optional muted meta line, and an optional single action snippet
top-right. This is the toolkit's one page-header idiom, replacing the finding-11 spread (five ad
hoc header markups across the engine's admin screens) with one component every top-level screen
mounts, whether or not it has a standing action to put in the slot.

The meta line is the toolkit's one home for a page-level count outside a toolbar (ruling 4):
`ListToolbar`'s own `computeCountLine` covers a screen with a search/filter toolbar row, and this
component's `meta` line covers a screen with none (a stats-prose summary, a scope note). Search
never lives in this band (ruling 5); a screen that needs search mounts `ListToolbar` below this
header instead. The line renders at `type-meta` (13px), the size its own prop name already
promises; a screen's own toolbar count line sits at the same size, so the two never mismatch when
both appear on one screen.

Pass 2 Task 12 ported `OfficeList`'s own UA-margin fix here (this component's own doc calls itself
that component's shape, generalized, and had not yet received the fix its original carries): the
default `<h1>`/`<p>` margins do not collapse inside a flex column, so they leaked past this stack's
`gap-0.5` intent into a roughly 58px rendered title-to-meta gap. Both elements zero their margin and
the meta line restores a deliberate 4px with its own `mt-1`, matching `OfficeList` exactly.

Props stay data-plus-slots throughout: `eyebrow`/`title`/`meta` are plain strings and `action` is
a snippet the caller fully authors, so this component carries no domain knowledge of what an
eyebrow names or what an action does.

Typography and layout classes only, no daisyUI component class. The classes here come from the
eyebrow and page-heading recipes in `docs/internal/admin-design-system.md`, already carried by
`OfficeList.svelte`'s header and `ConceptList.svelte`'s own `mb-10` rhythm value.

A scan-scope note this comment used to state the other way round: `src/lib/admin-toolkit` is
INSIDE `scripts/build/admin-css.input.css`'s `@source` roots, so a utility class used only here does
compile into the shipped sheet. It was outside when this component was minted on 2026-07-20, and
joined the roots a day later in `c21ac3b8` once the gap was found. The h1's even-line-rag balancing
(absorbed from `HelpHome.svelte`'s own sentence-length masthead title, so a long title's line rags
evenly rather than leaving a lone last word) is a `text-wrap: balance` rule in the scoped `<style>`
below, written that way under the old constraint. It stays scoped because scoped CSS ships
regardless of the scan and the rule is settled, not because `text-balance` would fail to compile
today.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The small uppercase label above the title (e.g. a custom nav section's name). Omitted
     *  entirely when a screen has no grouping worth naming. */
    eyebrow?: string;
    /** The screen's display-face heading, the page's one visible `h1`. */
    title: string;
    /** The muted meta line under the heading, at the meta type role (13px): a scope note, or the
     *  page's own collection count when no toolbar renders one (see the count-convergence note
     *  above). Omitted for a header with nothing to add. */
    meta?: string;
    /** The header's one right-aligned action (a create button, an upload trigger). Omit for a
     *  header with no standing action; search never lives here (`ListToolbar` owns it). */
    action?: Snippet;
  }

  let { eyebrow, title, meta, action }: Props = $props();
</script>

<header class="mb-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div class="flex flex-col gap-0.5">
    {#if eyebrow}
      <span class="type-label font-semibold uppercase tracking-[0.08em] text-muted">{eyebrow}</span>
    {/if}
    <h1 class="page-h1 m-0 type-title font-bold font-[family-name:var(--font-display)]">{title}</h1>
    {#if meta}<p class="m-0 mt-1 type-meta text-muted">{meta}</p>{/if}
  </div>
  {#if action}{@render action()}{/if}
</header>

<style>
  /* The even-line-rag balance for a wrapped title, absorbed from HelpHome's own masthead rule.
     Scoped CSS ships regardless of the Tailwind @source scan, unlike the `text-balance` utility
     this component lives outside the reach of (see the header comment above). */
  .page-h1 {
    text-wrap: balance;
  }
</style>
