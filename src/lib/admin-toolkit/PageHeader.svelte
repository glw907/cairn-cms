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
header instead.

Props stay data-plus-slots throughout: `eyebrow`/`title`/`meta` are plain strings and `action` is
a snippet the caller fully authors, so this component carries no domain knowledge of what an
eyebrow names or what an action does.

Typography and layout classes only, no daisyUI component class. Because `src/lib/admin-toolkit`
sits outside `scripts/admin-css.input.css`'s own `@source` scan, every utility class here is one
already compiled from the identical literal token in a scanned `src/lib/components/*.svelte`
file (the eyebrow and page-heading recipes documented in `docs/internal/admin-design-system.md`,
already carried by `OfficeList.svelte`'s header and `ConceptList.svelte`'s own `mb-10` rhythm
value); this component introduces no new utility token of its own.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The small uppercase label above the title (e.g. a custom nav section's name). Omitted
     *  entirely when a screen has no grouping worth naming. */
    eyebrow?: string;
    /** The screen's display-face heading, the page's one visible `h1`. */
    title: string;
    /** The muted meta line under the heading: a scope note, or the page's own collection count
     *  when no toolbar renders one (see the count-convergence note above). Omitted for a header
     *  with nothing to add. */
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
      <span class="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">{eyebrow}</span>
    {/if}
    <h1 class="text-2xl font-bold font-[family-name:var(--font-display)]">{title}</h1>
    {#if meta}<p class="text-sm text-muted">{meta}</p>{/if}
  </div>
  {#if action}{@render action()}{/if}
</header>
