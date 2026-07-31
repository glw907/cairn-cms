<!--
@component
One labeled single-line text input in the admin idiom (DaisyUI v5's default-bordered `input`, no
`-bordered` modifier). `SelectField`'s sibling on the `admin-fields` subpath; see that component's
header comment for the seam both fill. `FieldLabel`'s header comment documents the `register`
this component passes straight through.
-->
<script lang="ts">
  import FieldLabel from './FieldLabel.svelte';

  interface Props {
    /** The visible label, read to the left of (inline) or above (stacked) the control. */
    label: string;
    /** The native `name`, so the field posts inside an ordinary form submit. */
    name: string;
    /** The entered value, bindable. */
    value: string;
    /** The native input type; defaults to a plain text input. */
    type?: 'text' | 'search' | 'email' | 'url';
    /** A placeholder shown while the field is empty. */
    placeholder?: string;
    /** The label register; see `FieldLabel`. Defaults to `stacked`. */
    register?: 'inline' | 'stacked';
  }

  let { label, name, value = $bindable(), type = 'text', placeholder, register }: Props = $props();
</script>

<FieldLabel {label} {register}>
  <input class="input input-sm" {type} {name} bind:value {placeholder} />
</FieldLabel>
