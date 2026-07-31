<!--
@component
Test harness (design ratchet Task 3, finding 3): a two-column admin form grid, `ClassForm`'s own
`grid gap-x-6 gap-y-4 sm:grid-cols-2` shape, holding one column with two stacked-register
`TextField` instances of very different label lengths. Proves the stacked register's control edges
align down the column regardless of label length, and that its control fills the grid cell rather
than clamping to daisyUI's fixed 20rem default.
-->
<script lang="ts">
  import TextField from '../../lib/admin-fields/TextField.svelte';

  let first = $state('');
  let reminder = $state('');
</script>

<div class="grid gap-x-6 gap-y-4 grid-cols-2" style="width: 900px;">
  <div class="flex flex-col gap-group">
    <TextField label="First name" name="first" bind:value={first} register="stacked" />
    <TextField label="Reminder note override" name="reminder" bind:value={reminder} register="stacked" />
  </div>
  <div></div>
</div>
