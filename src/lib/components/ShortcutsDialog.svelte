<!--
@component
The keyboard shortcuts sheet, the third discoverability surface (the toolbar tooltips and the
Markdown help dialog are the other two). A two-column grid pairs each label with its chord, with a
closing line that the keys are always conveniences. Built on a native <dialog>, the
MarkdownHelpDialog recipe; the host (the edit page) drives it through the exported open() and opens
it on Ctrl+/, so the component renders no trigger of its own. Esc dismisses through the dialog's
native behavior.
-->
<script lang="ts">
  import { shortcutsClosingLine } from './editor-shortcuts.js';
  import ShortcutsGrid from './ShortcutsGrid.svelte';

  let dialog = $state<HTMLDialogElement | null>(null);

  /** Open the shortcuts sheet. The trigger lives in the host (the edit page's Ctrl+/ handler). */
  export function open() {
    dialog?.showModal();
  }
  function close() {
    dialog?.close();
  }
</script>

<dialog class="modal" aria-labelledby="cairn-shortcuts-title" bind:this={dialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-shortcuts-title" class="text-base font-semibold">Keyboard shortcuts</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
    </div>
    <ShortcutsGrid />
    <p class="mt-3 text-xs text-muted">{shortcutsClosingLine}</p>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>
