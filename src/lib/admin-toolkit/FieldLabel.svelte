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
already scoped tightly enough by a group legend that a full stacked label would be excess. The
toolkit's one field primitive (merged from the retired `admin-fields` subpath); compose it
directly around a bare custom control when a site's own field needs the
admin's label rhythm.

WHAT `children` MAY HOLD: the control, and nothing that is not the control. This component renders
a real `<label>` wrapping its content, so every piece of text inside it joins the field's
accessible name. An action affordance therefore goes BESIDE the field, never in it: a button, a
link, a clear or reset control, a unit switcher. Put one inside and a screen reader announces the
field as "Instructor Add", and the affordance also inherits the label's own click-to-focus
behavior. A caller composing that pair hand-rolls a bottom-aligned row (`display: flex;
align-items: flex-end; gap: var(--cairn-gap-control, 0.5rem)`, the recipe the retired `FieldRow`
component shipped): the alignment the eye reads when the labelled child is a whole label taller
than the affordance beside it.

A hint or an error line is the same question with a different answer. It is content, not an
affordance, so it may sit inside the label, but the bottom-aligned row recipe above has one
caveat: a field that renders a trailing line stops having its control as its bottom edge, and a
row levelling on that edge then levels the wrong thing.
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

  let inline = $derived(register === 'inline');
  let labelClass = $derived(
    inline ? 'flex items-center gap-1.5 type-body' : 'flex flex-col gap-label cairn-field-stacked'
  );
  let textClass = $derived(inline ? 'text-muted' : 'type-body font-medium');
</script>

<!-- ONE label element, never a two-branch {#if} (fix A2, item 2): the two registers used
     to render as separate {#if}/{:else} branches, so a live register flip destroyed and recreated
     this label, including the composed control inside `children()`, dropping the control's focus
     and any in-progress IME composition. A single element with a conditional class list keeps the
     control's own DOM node stable across the flip. -->
<label class={labelClass}>
  <span class={textClass}>{label}</span>
  {@render children()}
</label>
