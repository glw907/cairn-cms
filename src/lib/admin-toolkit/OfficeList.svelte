<!--
@component
The office-list primitive (Part C item 2 of the phase-2 design suite): the header-plus-card shell
every triage-table screen composes, lifted out of `ConceptList` and kept to exactly its header and
card frame, so a site's own custom `/admin/` screen gets the same office rhythm without hand-rolling
it. The eyebrow-plus-display heading, an optional live subtitle, and an optional header-right action
(a filter control, a primary button) sit above a bordered, theme-adaptive card shell; the caller
supplies its own `<table>` (or any content) inside. Moved here from `/components` in the C2
breaking-window pass (R3): `PageHeader`, this component's own later generalization, already lived on
the toolkit, and a header-plus-card screen scaffold belongs beside it, not on the admin's own view
barrel. `PageHeader` and this component both stay; they cover different shapes (a header primitive
versus a full list-screen scaffold), never a duplicate.
-->
<!-- WATCH: the ROADMAP spacing-convergence entry between this component and PageHeader stays filed
     and untouched here; it needs the visual gate, not a naming or subpath pass. -->

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The small uppercase label above the title, such as a custom nav section's name. Omitted
     *  entirely when a screen has no grouping worth naming. */
    eyebrow?: string;
    /** The screen's display-face heading. */
    title: string;
    /** The muted one-line subtitle under the heading: a live count, or a scope note. */
    subtitle?: string;
    /** An optional header-right control (a filter, a primary action button). */
    action?: Snippet;
    /** The screen's own content (typically a `<table>`), rendered inside the shared card shell. */
    children: Snippet;
  }

  let { eyebrow, title, subtitle, action, children }: Props = $props();
</script>

<header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div class="flex flex-col gap-0">
    {#if eyebrow}
      <span class="type-label font-semibold uppercase tracking-[0.08em] text-muted">{eyebrow}</span>
    {/if}
    <!-- The UA default h1/p margins do not collapse inside a flex column, so they leaked past
         this stack's own gap-0.5 intent into a ~32px rendered gap. Zeroed here and replaced
         with an explicit mt-1 (4px) on the subtitle only, so the eyebrow sits flush above the
         title and the subtitle sits a deliberate 4px below it. -->
    <h1 class="m-0 type-title font-bold font-[family-name:var(--font-display)]">{title}</h1>
    {#if subtitle}<p class="m-0 mt-1 type-body text-muted">{subtitle}</p>{/if}
  </div>
  {#if action}
    <!-- The flex row default (stretch) pulls the action full-width below `sm`; pin it to its
         intrinsic content width instead. -->
    <div class="self-start">{@render action()}</div>
  {/if}
</header>

<div class="card-shell overflow-x-auto card-shadow">
  {@render children()}
</div>
