<!--
@component
The admin toolkit's canonical page-header recipe: an optional eyebrow, the page's one
display-face `h1`, an optional muted meta line, and an optional single action snippet top-right.
This is the toolkit's one page-header idiom, so every top-level screen mounts the same component
whether or not it has a standing action to put in the slot; `OfficeList` composes this component
for its own header band rather than carrying a duplicate implementation.

The meta line is the toolkit's one home for a page-level count outside a toolbar: `ListToolbar`'s
own `computeCountLine` covers a screen with a search/filter toolbar row, and this component's
`meta` line covers a screen with none (a stats-prose summary, a scope note). Search never lives in
this band; a screen that needs search mounts `ListToolbar` below this header instead. The line
renders at `type-meta` (13px), the size its own prop name already promises, so a screen's own
toolbar count line matches it when both appear on one screen.

The default `<h1>`/`<p>` margins do not collapse inside this flex column, so both elements zero
their own margin and the meta line restores a deliberate 4px with its own `mt-1`. The action slot
carries `self-start`, since the flex row's default stretch would otherwise pull a header action
full-width below `sm`.

Props stay data-plus-slots throughout: `eyebrow`/`title`/`meta` are plain strings and `action` is
a snippet the caller fully authors, so this component carries no domain knowledge of what an
eyebrow names or what an action does.

Typography and layout classes only, no daisyUI component class. The classes here come from the
eyebrow and page-heading recipes in `docs/internal/admin-design-system.md`. `src/lib/admin-toolkit`
is inside `scripts/build/admin-css.input.css`'s `@source` roots, so a utility class used only here
still compiles into the shipped sheet. The `h1`'s even-line-rag balancing is a `text-wrap: balance`
rule in the scoped `<style>` below, so a long title's line rags evenly rather than leaving a lone
last word; it stays scoped CSS rather than a utility class, which ships the same way regardless.
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
  {#if action}
    <!-- The flex row default (stretch) pulls the action full-width below `sm`; pin it to its
         intrinsic content width instead (ported from OfficeList, Task 9 of the 2026-09-01
         conformance pass, so a naive OfficeList-onto-PageHeader collapse would not regress it). -->
    <div class="self-start">{@render action()}</div>
  {/if}
</header>

<style>
  /* The even-line-rag balance for a wrapped title, absorbed from HelpHome's own masthead rule.
     Scoped CSS ships regardless of the Tailwind @source scan, unlike the `text-balance` utility
     this component lives outside the reach of (see the header comment above). */
  .page-h1 {
    text-wrap: balance;
  }
</style>
