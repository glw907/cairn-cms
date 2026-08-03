<!--
@component
One labeled select in the admin idiom (DaisyUI v5's default-bordered `select`, no `-bordered`
modifier). One of the toolkit's field primitives (merged from the retired `admin-fields` subpath,
C2 breaking-window pass, R3): the smallest coherent set a custom `/admin/` screen composes today (a
select, a text input, and the shared label wrapper), proven by the aksailingclub-org club-admin
scaffold. Named `SelectInput`, not `SelectField`, because the root barrel's field *descriptor* arm
already owns that name (`fields.select`'s return shape); this component wraps a real `<select>`
element, so `Input` is the honest noun for the rendered control. The set is expected to grow, a date
field and an image-picker are the likely next additions, the same way the engine's own field
vocabulary grows one real consumer at a time. `FieldLabel`'s header comment documents the `register`
this component passes straight through.
-->
<script lang="ts">
  import FieldLabel from './FieldLabel.svelte';

  /** One selectable option: the submitted value and its visible text. */
  export interface SelectInputOption {
    value: string;
    label: string;
  }

  interface Props {
    /** The visible label, read to the left of (inline) or above (stacked) the control. */
    label: string;
    /** The native `name`, so the field posts inside an ordinary form submit. */
    name: string;
    /** The picked value, bindable. */
    value: string;
    /** The option list, in display order. */
    options: SelectInputOption[];
    /** The label register, forwarded to `FieldLabel`, whose own default prop owns the value. */
    register?: 'inline' | 'stacked';
  }

  let { label, name, value = $bindable(), options, register }: Props = $props();
</script>

<FieldLabel {label} {register}>
  <select class="select select-sm" {name} bind:value>
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</FieldLabel>
