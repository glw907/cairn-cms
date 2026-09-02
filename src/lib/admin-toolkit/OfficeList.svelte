<!--
@component
The office-list primitive: the header-plus-card shell every triage-table screen composes, kept to
exactly its header and card frame, so a site's own custom `/admin/` screen gets the same office
rhythm without hand-rolling it. The header band composes `PageHeader`, so the eyebrow-plus-display
heading, an optional live meta line, and an optional header-right action sit above a bordered,
theme-adaptive card shell the caller's own content (typically a `<table>`) renders inside.
`PageHeader` and this component cover different shapes, a header primitive versus a full
list-screen scaffold, and both stay: never a duplicate.

The header band renders through `PageHeader` directly rather than its own markup, so the two never
drift apart; `meta` (not `subtitle`) matches `PageHeader`'s own prop name for the same field. The
card sits directly under `PageHeader`'s own bottom margin rather than adding a second margin of its
own, per the design system's proximity-grouping scale: the header stands apart as the page's one
loose element, and this component's card keeps its own tighter proximity to it.

`gap-0` compiles into the shipped admin sheet with no current component reference: this file's own
former header stack was its last user before that markup moved onto `PageHeader`. Named here to
keep it compiling, since the shipped sheet's class inventory is a de facto public API and a class
leaving it is a deliberate, CHANGELOG-carried act, never a side effect of an unrelated doc edit
(`admin-sheet-inventory.test.ts` is the standing proof).
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import PageHeader from './PageHeader.svelte';

  interface Props {
    /** The small uppercase label above the title, such as a custom nav section's name. Omitted
     *  entirely when a screen has no grouping worth naming. */
    eyebrow?: string;
    /** The screen's display-face heading. */
    title: string;
    /** The muted one-line meta note under the heading: a live count, or a scope note. */
    meta?: string;
    /** An optional header-right control (a filter, a primary action button). */
    action?: Snippet;
    /** The screen's own content (typically a `<table>`), rendered inside the shared card shell. */
    children: Snippet;
  }

  let { eyebrow, title, meta, action, children }: Props = $props();
</script>

<PageHeader {eyebrow} {title} {meta} {action} />

<div class="card-shell overflow-x-auto card-shadow">
  {@render children()}
</div>
