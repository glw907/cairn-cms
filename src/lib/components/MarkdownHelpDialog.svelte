<!--
@component
The Markdown cheat sheet, opened from the edit page's editor footer. A one-screen table pairs
each piece of syntax with what it makes, and a closing note explains the ::: layout blocks.
Built on a native <dialog>, the DeleteDialog recipe; the host drives it through the exported
open(), so the component renders no trigger of its own.
-->
<script lang="ts">
  import { editorShortcuts } from './editor-shortcuts.js';

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
        <tr><td><code>## Heading</code></td><td>A heading</td></tr>
        <tr><td><code>### Heading</code></td><td>A smaller heading</td></tr>
        <tr><td><code>#### Heading</code></td><td>A fourth-level heading</td></tr>
        <tr><td><code>**bold**</code></td><td>Bold text</td></tr>
        <tr><td><code>*italic*</code></td><td>Italic text</td></tr>
        <tr><td><code>~~text~~</code></td><td>Crossed-out text</td></tr>
        <tr><td><code>[text](url)</code></td><td>A link</td></tr>
        <tr><td><code>[[page-name]]</code></td><td>A link to one of your pages</td></tr>
        <tr><td><code>- item</code></td><td>A bulleted list</td></tr>
        <tr><td><code>1. item</code></td><td>A numbered list</td></tr>
        <tr><td><code>- [ ] item</code></td><td>A checklist</td></tr>
        <tr><td><code>&gt; quote</code></td><td>A quote</td></tr>
        <tr><td><code>`code`</code></td><td>Code</td></tr>
        <tr><td>Table</td><td>The Table button in the toolbar inserts one</td></tr>
        <tr><td><code>---</code></td><td>A horizontal rule</td></tr>
      </tbody>
    </table>
    <h3 class="mt-4 mb-2 text-sm font-semibold">Keyboard shortcuts</h3>
    <div class="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
      {#each editorShortcuts as row (row.label)}
        <div class="flex items-baseline justify-between gap-4">
          <span>{row.label}</span>
          <span class="font-mono text-[0.75rem] text-[var(--color-muted)]">{row.keys}</span>
        </div>
      {/each}
    </div>
    <p class="mt-3 text-sm">
      Lines starting with <code>:::</code> are layout blocks. Edit the text inside them and leave
      the <code>:::</code> lines alone.
    </p>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>
