<!--
@component
The office-list primitive (Part C item 2 of the phase-2 design suite): the header-plus-card shell
every triage-table screen composes, lifted out of `ConceptList` and kept to exactly its header and
card frame, so a site's own custom `/admin/` screen gets the same office rhythm without hand-rolling
it. The header band composes `PageHeader`, this component's own later generalization, so the
eyebrow-plus-display heading, an optional live meta line, and an optional header-right action sit
above a bordered, theme-adaptive card shell the caller's own content (typically a `<table>`) renders
inside. Moved here from `/components` in the C2 breaking-window pass (R3): `PageHeader` already
lived on the toolkit, and a header-plus-card screen scaffold belongs beside it, not on the admin's
own view barrel. `PageHeader` and this component both stay; they cover different shapes (a header
primitive versus a full list-screen scaffold), never a duplicate.

The 4b conformance pass's Task 9 collapsed this component's own header markup onto `PageHeader`
(engine-rulings.md, `audit-admin-officelist`): the two implementations had drifted (`mb-6` versus
`PageHeader`'s `mb-10`, `gap-0` versus `gap-0.5`, `type-body` versus `type-meta`, and this
component's own `subtitle` prop against `PageHeader`'s `meta`), so `subtitle` RENAMED to `meta`
(no forwarding alias; the rename is paid once inside this pass's already-breaking window) and the
merged header band adopts `PageHeader`'s rhythm as the toolkit's one office-header rhythm, per the
design system's F3 proximity-grouping scale: the header stands apart as the page's one loose
element, and this component's card keeps its own tighter proximity by sitting directly under
`PageHeader`'s own `mb-10` offset rather than adding a second margin of its own.
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
