<!--
@component
Test harness (design ratchet Task 3, finding 3): a two-column admin form grid, `ClassForm`'s own
`grid gap-x-6 gap-y-4 sm:grid-cols-2` shape, holding one column with two stacked-register
`FieldLabel`-plus-input pairs (the composition the retired `TextInput` wrapped, the retires pass
batch 1a) of very different label lengths. Proves the stacked register's control edges align down
the column regardless of label length, and that its control fills the grid cell rather than
clamping to daisyUI's fixed 20rem default.
-->
<script lang="ts">
  import FieldLabel from '../../lib/admin-toolkit/FieldLabel.svelte';

  let first = $state('');
  let reminder = $state('');
</script>

<div class="grid gap-x-6 gap-y-4 grid-cols-2" style="width: 900px;">
  <div class="flex flex-col gap-group">
    <FieldLabel label="First name" register="stacked">
      <input class="input input-sm" name="first" bind:value={first} />
    </FieldLabel>
    <FieldLabel label="Reminder note override" register="stacked">
      <input class="input input-sm" name="reminder" bind:value={reminder} />
    </FieldLabel>
  </div>
  <div></div>
</div>
