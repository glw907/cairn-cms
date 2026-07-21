<!--
@component
The admin toolkit's centered first-run empty state (ruling 2 of the 2026-07-20 admin-toolkit
organization pass's adoption map), graduated from the recipe the engine's own admin already
repeats three times (`ConceptList`, `CairnMediaLibrary`, `WelcomeView`): a centered fill on the
content area, the cairn mark (or a caller's own icon), a heading, muted copy, and an optional
action.

This is the whole-concept-empty state only (a fresh "no posts yet" screen), never the
filtered-to-zero state (a search or filter narrowed a non-empty list to nothing): that recipe
stays a smaller, in-card notice inside `AdminTable`'s own `empty` snippet (or a grid's own status
block), never a page-owning fill.

Props stay data-plus-slots: `heading`/`message` are plain strings, and `icon`/`action` are
snippets the caller fully authors, so this component carries no domain knowledge of what is empty
or what the action does.

Typography and layout classes only, no daisyUI component class, per the same `@source`-scan note
`PageHeader` documents: every utility token here is one already compiled from the identical
literal token in `ConceptList.svelte`'s and `WelcomeView.svelte`'s own empty-state markup.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import CairnLogo from '../components/CairnLogo.svelte';

  interface Props {
    /** A custom icon replacing the default cairn mark, for a site's own custom section. */
    icon?: Snippet;
    /** The empty state's heading (e.g. `'No posts yet'`). */
    heading: string;
    /** The muted explanatory copy beneath the heading. */
    message: string;
    /** An optional action (typically a create or upload button), rendered below the copy. */
    action?: Snippet;
  }

  let { icon, heading, message, action }: Props = $props();
</script>

<div class="flex min-h-[56vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
  {#if icon}
    {@render icon()}
  {:else}
    <CairnLogo class="h-12 w-12 text-primary opacity-30" />
  {/if}
  <div class="space-y-1">
    <p class="font-semibold text-base-content">{heading}</p>
    <p class="mx-auto max-w-[40ch] text-sm text-muted">{message}</p>
  </div>
  {#if action}{@render action()}{/if}
</div>
