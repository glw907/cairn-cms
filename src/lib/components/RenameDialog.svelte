<!--
@component
The Change URL control and its modal. The author edits the URL slug; on submit the ?/rename action
moves the entry and rewrites every inbound cairn link in one commit, so no internal link breaks. A
dated post keeps its date; only the slug changes. Built on a native <dialog>, following the
DeleteDialog a11y conventions.
-->
<script lang="ts">
  import CsrfField from './CsrfField.svelte';

  interface Props {
    /** The concept this entry belongs to, e.g. "posts". Posted with the confirm. */
    conceptId: string;
    /** The entry id within its concept. Posted with the confirm. */
    id: string;
    /** A human label for the concept, e.g. "Post", used in the prompts. */
    label: string;
    /** The current slug, prefilled into the input. */
    slug: string;
    /** Render the built-in Change URL trigger. False mounts only the dialog, for a host that
     *  supplies its own trigger and opens the dialog through the exported open(). */
    trigger?: boolean;
    /** Called when the rename form submits, before the document navigates. The edit page uses it
     *  to stand down its leave guard while the POST is in flight. */
    onsubmitting?: () => void;
  }

  let { conceptId, id, label, slug, trigger = true, onsubmitting }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  let slugInput = $state<HTMLInputElement | null>(null);
  // Seeded on open() rather than from the prop at declaration, so the input prefills with the
  // current slug each time the dialog opens without capturing only the initial prop value.
  let nextSlug = $state('');

  /** Open the dialog with a fresh prefill. Exported so a trigger={false} host can drive it. */
  export function open() {
    nextSlug = slug;
    dialog?.showModal();
    // showModal() lands focus on the first focusable element (the header Close button), so move
    // it to the slug input the dialog exists for, and select the prefill so the author can replace
    // it in one keystroke (WCAG 2.4.3). A microtask defers past the dialog's own focus handling.
    queueMicrotask(() => {
      slugInput?.focus();
      slugInput?.select();
    });
  }
  function close() {
    dialog?.close();
  }
</script>

{#if trigger}
  <button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" onclick={open}>Change URL</button>
{/if}

<dialog class="modal" aria-labelledby="cairn-rename-dialog-title" bind:this={dialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-rename-dialog-title" class="text-base font-semibold">Change this {label.toLowerCase()} URL</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
    </div>
    <form method="POST" action="?/rename" class="flex flex-col gap-3" onsubmit={() => onsubmitting?.()}>
      <CsrfField />
      <input type="hidden" name="concept" value={conceptId} />
      <input type="hidden" name="id" value={id} />
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">URL slug</span>
        <input class="input" name="slug" bind:value={nextSlug} bind:this={slugInput} autocomplete="off" />
      </label>
      <p class="text-xs text-muted">
        Links from other pages update automatically, so nothing breaks. The new URL slug will be
        <code class="text-xs">{nextSlug}</code>.
      </p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-sm" onclick={close}>Cancel</button>
        <button type="submit" class="btn btn-sm btn-primary">Change URL</button>
      </div>
    </form>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>
