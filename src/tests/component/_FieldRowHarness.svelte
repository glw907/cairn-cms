<!--
@component
Test harness for the bottom-aligned field row recipe: one stacked field beside one bare control,
the mixed-height row the retired `FieldRow` component (the retires pass batch 1a) used to ship.
Hand-rolls that component's own three layout declarations directly (`display: flex;
align-items: flex-end; gap: var(--cairn-gap-control, 0.5rem)`), so the recipe stays proven
independent of the component's lifetime. A raw snippet cannot stand in here, since
`createRawSnippet` renders a single top-level element and this row needs two children to have
anything to level.
-->
<script lang="ts">
  import FieldLabel from '../../lib/admin-toolkit/FieldLabel.svelte';
</script>

<div class="toolkit-field-row-harness">
  <FieldLabel label="Instructor">
    <input class="input input-sm" data-testid="field-control" />
  </FieldLabel>
  <button type="button" class="btn btn-sm" data-testid="bare-control">Add</button>
</div>

<style>
  .toolkit-field-row-harness {
    display: flex;
    align-items: flex-end;
    gap: var(--cairn-gap-control, 0.5rem);
  }
</style>
