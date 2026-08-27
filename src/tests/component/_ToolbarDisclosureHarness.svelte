<!--
@component
Test harness for `ToolbarDisclosure`. Owns the controlled `open` state itself (echoing every
`onOpenChange` call straight back), the shape any real caller takes, so the component's own five
dismissal mechanics can be exercised end to end: a trigger button, two focusable panel options, and
an outside control to prove the outside-pointerdown/focusout mechanics against.
-->
<script lang="ts">
  import ToolbarDisclosure, {
    type ToolbarDisclosureAriaHaspopup,
  } from '../../lib/admin-toolkit/ToolbarDisclosure.svelte';

  interface Props {
    ariaHaspopup?: ToolbarDisclosureAriaHaspopup;
    /** When true, `onOpenChange` is recorded but never echoed back into `open`: proves the
     *  controlled contract holds (this component never opens itself). */
    uncontrolled?: boolean;
    /** When true, `option-1` renders `tabindex="-1"` (a roving-tabindex option that is not the
     *  current tab stop), proving the focus-into-panel query skips it for `option-2`. */
    firstOptionNotTabbable?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
  let {
    ariaHaspopup,
    uncontrolled = false,
    firstOptionNotTabbable = false,
    onOpenChange,
  }: Props = $props();

  let open = $state(false);

  function handleOpenChange(next: boolean) {
    onOpenChange?.(next);
    if (!uncontrolled) open = next;
  }

  /** Drives `open` directly, never through the trigger's own click: proves focus-return still
   *  works when a parent opens the disclosure some other way (a hotkey, another control). */
  function openProgrammatically() {
    open = true;
  }
</script>

<ToolbarDisclosure {open} onOpenChange={handleOpenChange} {ariaHaspopup}>
  {#snippet trigger(attrs)}
    <button type="button" data-testid="trigger" {...attrs}>Trigger</button>
  {/snippet}
  {#snippet extra()}
    <button type="button" data-testid="extra">Extra</button>
  {/snippet}
  {#snippet panel(attrs)}
    <div class="dropdown-content" data-testid="panel" {...attrs}>
      <button type="button" data-testid="option-1" tabindex={firstOptionNotTabbable ? -1 : 0}>
        Option 1
      </button>
      <button type="button" data-testid="option-2">Option 2</button>
    </div>
  {/snippet}
</ToolbarDisclosure>
<button type="button" data-testid="outside">Outside</button>
<button type="button" data-testid="open-programmatically" onclick={openProgrammatically}>
  Open programmatically
</button>
