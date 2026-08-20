<!--
@component
The Change URL control and its modal. The author edits the URL slug; on submit the ?/rename action
moves the entry and rewrites every inbound cairn link in one commit, so no internal link breaks. A
dated post keeps its date; only the slug changes. A non-routable concept (routable={false}) renames
a name rather than a URL, and its inbound edges are includes rather than links. Built on a native
<dialog>, following the DeleteDialog a11y conventions.
-->
<script lang="ts">
  import CsrfField from './CsrfField.svelte';

  interface Props {
    /** The concept this entry belongs to, e.g. "posts". Posted with the confirm. */
    conceptId: string;
    /** The entry id within its concept. Posted with the confirm. */
    id: string;
    /**
     * The singular noun for the entry being renamed, e.g. "Post", used in the title and the
     *  "Entries that include this X" copy; mirrors DeleteDialog's own doc voice.
     */
    singular: string;
    /** The current slug, prefilled into the input. */
    slug: string;
    /**
     * Whether the entry has a public URL. True (the default) keeps today's URL copy on every
     *  existing call site. False selects the name copy: a non-routable entry has no address to
     *  change, and what repoints on rename is the includes that consume it, not links.
     */
    routable?: boolean;
    /** Render the built-in Change URL trigger. False mounts only the dialog, for a host that
     *  supplies its own trigger and opens the dialog through the exported open(). */
    trigger?: boolean;
    /** Called when the rename form submits, before the document navigates. The edit page uses it
     *  to stand down its leave guard while the POST is in flight. */
    onsubmitting?: () => void;
  }

  let { conceptId, id, singular, slug, routable = true, trigger = true, onsubmitting }: Props = $props();

  // The entry's own noun, for the title and the non-routable "Entries that include this X" copy.
  const noun = $derived(singular.toLowerCase());

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
  <button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" onclick={open}>
    {routable ? 'Change URL' : 'Rename'}
  </button>
{/if}

<dialog class="modal" aria-labelledby="cairn-rename-dialog-title" bind:this={dialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-rename-dialog-title" class="type-heading font-bold font-[family-name:var(--font-display)]">
        {routable ? `Change this ${noun} URL` : `Rename this ${noun}`}
      </h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
    </div>
    <form method="POST" action="?/rename" class="flex flex-col gap-3" onsubmit={() => onsubmitting?.()}>
      <CsrfField />
      <input type="hidden" name="concept" value={conceptId} />
      <input type="hidden" name="id" value={id} />
      <label class="flex flex-col gap-label">
        <span class="type-body font-medium">{routable ? 'Address' : 'Name'}</span>
        <input class="input" name="slug" bind:value={nextSlug} bind:this={slugInput} autocomplete="off" />
      </label>
      <p class="type-meta text-muted">
        {#if routable}
          Links from other pages update automatically, so nothing breaks. The new address will be
          <code class="type-meta">{nextSlug}</code>.
        {:else}
          Entries that include this {noun} update automatically, so nothing breaks. The
          new name will be <code class="type-meta">{nextSlug}</code>.
        {/if}
      </p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-sm" onclick={close}>Cancel</button>
        <button type="submit" class="btn btn-sm btn-primary">{routable ? 'Change URL' : 'Rename'}</button>
      </div>
    </form>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>
