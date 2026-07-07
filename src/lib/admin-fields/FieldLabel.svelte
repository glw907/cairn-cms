<!--
@component
The label wrapper every admin field composes: a small single-line label beside its control, in the
same shape `ConceptList`'s own filters use (`flex items-center gap-1.5 text-sm`). Part of the
`admin-fields` subpath (Part C item 1 of the phase-2 design suite); compose it directly around a
bare custom control when a site's own field needs the admin's label rhythm with no bundled primitive
to match. `SelectField` and `TextField` both wrap it internally.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The visible label, read to the left of the control. */
    label: string;
    /** The control this label wraps. */
    children: Snippet;
  }

  let { label, children }: Props = $props();
</script>

<label class="flex items-center gap-1.5 text-sm">
  <span class="text-muted">{label}</span>
  {@render children()}
</label>
