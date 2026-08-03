<!--
@component
Test harness (design ratchet fix A2, item 1): a stacked-register `FieldLabel` wrapping a
compact row, a flex wrapper holding two controls side by side, rather than one control that
composes the label directly. Proves the stacked register's width hook applies only to a control
that is a direct child of the label: a control nested one level deeper, inside a compact row,
keeps daisyUI's own default width instead of the hook stretching every descendant control to fill
the row. The 900px outer width is wide enough that daisyUI's own `.input` default (a 20rem
preferred width) fits both controls with room to spare, so the hook's `width: 100%` (which would
force the row's own combined space onto each control and trigger flex-shrink) is the only thing
that can pull the measured width away from that default.
-->
<script lang="ts">
  import FieldLabel from '../../lib/admin-toolkit/FieldLabel.svelte';
</script>

<div style="width: 900px;">
  <FieldLabel label="Dimensions">
    <div class="flex gap-2">
      <input class="input input-sm" name="width" />
      <input class="input input-sm" name="height" />
    </div>
  </FieldLabel>
</div>
