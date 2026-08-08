<!--
@component
The admin toolkit's bottom-aligned field row: one flex row that levels its children on their
BOTTOM edges. A row mixing a stacked field (a label sitting above its control) with a bare
control (a button, a checkbox, a second control carrying no label of its own) is the composition
that reads wrong under any other alignment, because the labelled child is a whole label taller
than the bare one and only their controls are meant to line up. `items-end` levels those
controls. `items-start` leaves the bare control floating a label's height above its neighbour,
and `items-center` splits the difference, so neither edge lines up.

For children of equal height it changes nothing, so a caller composing a row does not have to
know which case it has.

THE ONE COMPOSITION IT GETS WRONG: a field that renders something BELOW its control, an error
line or a hint, stops having its control as its own bottom edge, and this row then levels that
trailing line against the bare control instead of the control the eye is reading. No field in
this subpath renders one (`TextInput` and `SelectInput` both end at their control), so the row is
correct for everything the toolkit ships; a site whose own field renders a trailing line composes
that row itself.

No measured defect drove this component. The 2026-08 vertical-alignment inventory measured the
admin's rendered rows and found no misaligned field row to fix; this ships as the named
composition for the shape, so a row that needs it stops being hand-rolled per screen.

The three layout declarations live in the scoped `<style>` below rather than in Tailwind classes,
per the admin-toolkit exception in cairn-admin.css's grammar-token header. This component ships on
a public subpath, so a consumer can mount it outside the admin theme root, and none of the three
classes survives out there: the compiled sheet scopes every rule under a theme root, and
`gap-control` is a cairn-only `@utility` a consumer's own Tailwind build never even defines.
Measured, the class-only form computed `display: block` outside the root, so the whole contract
this component exists for was gone with nothing to see in the markup.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The row's fields and controls, in reading order. */
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="toolkit-field-row">
  {@render children()}
</div>

<style>
  /* The gap carries the measured literal as a var() fallback, per the admin-toolkit exception in
     cairn-admin.css's grammar-token header: --cairn-gap-control is undefined outside the admin
     theme root, and 0.5rem is what it resolves to inside it. */
  .toolkit-field-row {
    display: flex;
    align-items: flex-end;
    gap: var(--cairn-gap-control, 0.5rem);
  }
</style>
