<!--
@component
The label wrapper every admin field composes, in either of two registers (a third, the group
legend, is a `<legend>` rather than this component; `docs/internal/admin-design-system.md`'s
form-row/label register section has the full three). `stacked` (the default: label on its own
line above the control, `flex flex-col gap-label`, the individual-field-label recipe) is the
robust shape for any multi-column form grid, since a stacked label never competes with its own
control for a shared row's width (the finding-3 defect: an inline label's own text is the more
shrinkable of a flex row's two children, so a long label wraps once the row narrows). `inline`
(label beside its control on one line, `flex items-center gap-1.5 type-body`, muted) stays
available as the explicit, control-adjacent exception: a toolbar filter, a compact panel, a row
already scoped tightly enough by a group legend that a full stacked label would be excess. Part of
the `admin-fields` subpath (Part C item 1 of the phase-2 design suite); compose it directly around
a bare custom control when a site's own field needs the admin's label rhythm with no bundled
primitive to match. `SelectField` and `TextField` both wrap it internally.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The visible label, read to the left of (inline) or above (stacked) the control. */
    label: string;
    /** The control this label wraps. */
    children: Snippet;
    /**
     * The label register. `stacked` (the default) puts the label on its own line above the
     * control and fills the control to its container; `inline` puts it beside the control on one
     * line, for a genuinely control-adjacent composition.
     */
    register?: 'inline' | 'stacked';
  }

  let { label, children, register = 'stacked' }: Props = $props();
</script>

{#if register === 'inline'}
  <label class="flex items-center gap-1.5 type-body">
    <span class="text-muted">{label}</span>
    {@render children()}
  </label>
{:else}
  <label class="flex flex-col gap-label cairn-field-stacked">
    <span class="type-body font-medium">{label}</span>
    {@render children()}
  </label>
{/if}
