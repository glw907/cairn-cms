<!--
@component
The Markdown cheat sheet, opened from the edit page's editor footer. A one-screen table pairs
each piece of syntax with what it makes, and a closing note explains the ::: layout blocks.
Built on a native <dialog>, the DeleteDialog recipe; the host drives it through the exported
open(), so the component renders no trigger of its own.
-->
<script lang="ts">
  import ShortcutsGrid from './ShortcutsGrid.svelte';
  import { markdownReference } from './markdown-reference.js';

  let dialog = $state<HTMLDialogElement | null>(null);

  /** Open the cheat sheet. The trigger lives in the host (the edit page's editor footer). */
  export function open() {
    dialog?.showModal();
  }
  function close() {
    dialog?.close();
  }
</script>

<dialog class="modal" aria-labelledby="cairn-markdown-help-title" bind:this={dialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-markdown-help-title" class="text-base font-semibold">Markdown help</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
    </div>
    <table class="table table-sm">
      <thead>
        <tr>
          <th class="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">Type this</th>
          <th class="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">What it makes</th>
        </tr>
      </thead>
      <tbody>
        {#each markdownReference as row}
          <tr><td><code>{row.syntax}</code></td><td>{row.makes}</td></tr>
        {/each}
      </tbody>
    </table>
    <h3 class="mt-4 mb-2 text-sm font-semibold">Keyboard shortcuts</h3>
    <ShortcutsGrid />
    <p class="mt-3 text-sm">
      Lines starting with <code>:::</code> are layout blocks. Edit the text inside them and leave
      the <code>:::</code> lines alone.
    </p>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>
