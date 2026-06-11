<!--
@component
The Web link control and its modal: the way to link out to an ordinary web address, beside the
Link to page picker that handles internal targets. Two fields, the address and an optional display
text; when the editor holds a selection it arrives as the default text, and the insert seam wraps
that selection either way. Built on a native <dialog>, following the LinkPicker a11y conventions,
and opened by the host's Ctrl/Cmd+K shortcut through the exported open().
-->
<script lang="ts">
  interface Props {
    /** Insert an inline link at the editor cursor; the editor's registerInsertLink seam. */
    insert: (href: string, title: string) => void;
    /** Read the editor's current selection, for the Text field's default. */
    selection?: () => string;
    /** Disable the trigger; the host sets it while Preview shows. */
    disabled?: boolean;
    /** Render the built-in Web link trigger. False mounts only the dialog, for a host that
     *  supplies its own trigger and opens the dialog through the exported open(). */
    trigger?: boolean;
  }

  let { insert, selection, disabled = false, trigger = true }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  let hrefInput = $state<HTMLInputElement | null>(null);
  let href = $state('');
  let text = $state('');

  /** Open the dialog with fresh fields; the edit page's Ctrl/Cmd+K shortcut calls it too. */
  export function open() {
    href = '';
    text = selection?.() ?? '';
    dialog?.showModal();
    // showModal() lands focus on the first focusable element (the header Close button), so move
    // it to the address input the dialog exists for (WCAG 2.4.3). A microtask defers past the
    // dialog's own focus handling, the RenameDialog recipe.
    queueMicrotask(() => hrefInput?.focus());
  }
  function close() {
    dialog?.close();
  }
  function submit(e: SubmitEvent) {
    e.preventDefault();
    // With no text and no selection the address itself becomes the display text, so the link
    // never renders as an invisible pair of brackets.
    insert(href, text.trim() || href);
    close();
  }
</script>

{#if trigger}
  <button
    type="button"
    class="btn btn-sm btn-ghost"
    aria-haspopup="dialog"
    aria-label="Web link (Ctrl+K)"
    title="Web link (Ctrl+K)"
    {disabled}
    onclick={open}
  >
    Web link
  </button>
{/if}

<dialog class="modal" aria-labelledby="cairn-web-link-dialog-title" bind:this={dialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-web-link-dialog-title" class="text-base font-semibold">Add a web link</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
    </div>
    <form onsubmit={submit} class="flex flex-col gap-3">
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Web address</span>
        <input class="input w-full" type="url" required placeholder="https://…" bind:value={href} bind:this={hrefInput} />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Text</span>
        <input class="input w-full" placeholder="What the link says" bind:value={text} />
      </label>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-sm" onclick={close}>Cancel</button>
        <button type="submit" class="btn btn-sm btn-primary">Add link</button>
      </div>
    </form>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>
