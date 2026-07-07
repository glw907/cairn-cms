<!--
@component
One labeled select in the admin idiom (DaisyUI v5's default-bordered `select`, no `-bordered`
modifier). The first of the `admin-fields` primitives (Part C item 1 of the phase-2 design suite):
the smallest coherent set a custom `/admin/` screen composes today (a select, a text input, and the
shared label wrapper), proven by the aksailingclub-org club-admin scaffold. The set is expected to
grow, a date field and an image-picker are the likely next additions, the same way the engine's own
field vocabulary grows one real consumer at a time.
-->
<script lang="ts">
  import FieldLabel from './FieldLabel.svelte';

  /** One selectable option: the submitted value and its visible text. */
  export interface SelectFieldOption {
    value: string;
    label: string;
  }

  interface Props {
    /** The visible label, read to the left of the control. */
    label: string;
    /** The native `name`, so the field posts inside an ordinary form submit. */
    name: string;
    /** The picked value, bindable. */
    value: string;
    /** The option list, in display order. */
    options: SelectFieldOption[];
  }

  let { label, name, value = $bindable(), options }: Props = $props();
</script>

<FieldLabel {label}>
  <select class="select select-sm" {name} bind:value>
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</FieldLabel>
