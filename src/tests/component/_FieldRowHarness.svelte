<!--
@component
Test harness for `FieldRow`: one stacked field beside one bare control, the mixed-height row the
component exists for. A raw snippet cannot stand in here, since `createRawSnippet` renders a single
top-level element and this row needs two children to have anything to level.
-->
<script lang="ts">
  import FieldRow from '../../lib/admin-toolkit/FieldRow.svelte';
  import FieldLabel from '../../lib/admin-toolkit/FieldLabel.svelte';
</script>

<FieldRow>
  <FieldLabel label="Instructor">
    <input class="input input-sm" data-testid="field-control" />
  </FieldLabel>
  <button type="button" class="btn btn-sm" data-testid="bare-control">Add</button>
</FieldRow>
