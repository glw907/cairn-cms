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
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The row's fields and controls, in reading order. */
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="flex items-end gap-control">
  {@render children()}
</div>
