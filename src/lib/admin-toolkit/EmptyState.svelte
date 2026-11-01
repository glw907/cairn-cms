<!--
@component
The admin toolkit's centered first-run empty state, graduated from the recipe the engine's
admin already repeats three times (`ConceptList`, `CairnMediaLibrary`, `WelcomeView`): a centered
fill on the content area, the cairn mark (or a caller's icon), a heading, muted copy, and an
optional action.

This is the whole-concept-empty state only (a fresh "no posts yet" screen), never the
filtered-to-zero state (a search or filter narrowed a non-empty list to nothing): that recipe
stays a smaller, in-card notice inside `AdminTable`'s `empty` snippet (or a grid's status
block), never a page-owning fill.

Props stay data-plus-slots: `heading`/`message` are plain strings, and `icon`/`action` are
snippets the caller fully authors, so this component carries no domain knowledge of what is empty
or what the action does.

`headingLevel` (additive, defaults `'p'`, the original contract unchanged) selects the heading's
element: a screen that sits under a `PageHeader` (whose `h1` already names the page) keeps
the default `<p>`, while a screen that renders this component as its ONLY content, with no
`PageHeader` of its own (`WelcomeView`, the none-capability landing, and the admin error page),
passes `'h1'` so the page still carries a real heading in its accessible tree. An `'h1'` heading
takes the page-heading recipe `PageHeader` uses (the display face at the title size), so the level
changes the semantics and never leaves the browser's default heading size; every other level keeps
its semibold heading as it was.

Typography and layout classes only, no daisyUI component class. The tokens here match
`ConceptList.svelte`'s and `WelcomeView.svelte`'s empty-state markup, which is where this
recipe was lifted from. See the scan-scope note on `PageHeader` for why an older version of this
comment framed that as a compile constraint: `src/lib/admin-toolkit` is inside the `@source` roots
now, so a class used only here compiles.
@public
-->
<script module lang="ts">
  /** The heading's element. Defaults to `'p'`, the original contract; pass `'h1'`/`'h2'`/`'h3'`
   *  when this component is a screen's only content and needs a real heading in the a11y tree.
   *  @public */
  export type EmptyStateHeadingLevel = 'p' | 'h1' | 'h2' | 'h3';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import CairnLogo from '../admin/CairnLogo.svelte';

  interface Props {
    /** A custom icon replacing the default cairn mark, for a site's custom section. */
    icon?: Snippet;
    /** The empty state's heading (e.g. `'No posts yet'`). */
    heading: string;
    /** The heading's element. Defaults to `'p'`: a screen already carrying its `h1` (a
     *  `PageHeader`) keeps the default, while a screen with no heading of its own passes `'h1'`. */
    headingLevel?: EmptyStateHeadingLevel;
    /** The muted explanatory copy beneath the heading. */
    message: string;
    /** An optional action (typically a create or upload button), rendered below the copy. */
    action?: Snippet;
  }

  let { icon, heading, headingLevel = 'p', message, action }: Props = $props();
</script>

<div class="flex min-h-[56vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
  {#if icon}
    {@render icon()}
  {:else}
    <CairnLogo class="h-12 w-12 text-primary opacity-30" />
  {/if}
  <div class="space-y-1">
    <svelte:element
      this={headingLevel}
      class={headingLevel === 'h1'
        ? 'mt-0 mb-1 type-title font-[550] font-[family-name:var(--font-display)] text-base-content'
        : 'font-semibold text-base-content'}>{heading}</svelte:element
    >
    <p class="mx-auto max-w-[40ch] type-body text-muted">{message}</p>
  </div>
  {#if action}{@render action()}{/if}
</div>
