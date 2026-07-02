<!--
@component
The Delete control and its modal. With no inbound links it is a plain confirm that posts to the
?/delete action. With inbound links it blocks: it names how many entries link here and lists them,
each linking to its edit page, so the author repoints or removes those links first. Built on a native
<dialog>, following the LinkPicker a11y conventions.
-->
<script lang="ts">
  import CsrfField from './CsrfField.svelte';
  import type { InboundLink } from '../content/manifest.js';

  interface Props {
    /** The concept this entry belongs to, e.g. "posts". Posted with the confirm. */
    conceptId: string;
    /** The entry id within its concept. Posted with the confirm. */
    id: string;
    /** A human label for the concept, e.g. "Post", used in the prompts. */
    label: string;
    /** The entries that link to this one; non-empty blocks the delete. */
    inboundLinks: InboundLink[];
    /** True when the entry has unpublished edits, which the delete discards along with it. */
    pending?: boolean;
    /** Render the built-in Delete trigger. False mounts only the dialog, for a host that supplies
     *  its own trigger and opens the dialog through the exported open(). */
    trigger?: boolean;
    /** Called when the delete confirm submits, before the document navigates. The edit page uses
     *  it to stand down its leave guard while the POST is in flight. */
    onsubmitting?: () => void;
  }

  let { conceptId, id, label, inboundLinks, pending = false, trigger = true, onsubmitting }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  const blocked = $derived(inboundLinks.length > 0);
  const noun = $derived(label.toLowerCase());
  // One inbound link reads "1 post links here ... repoint it"; many reads "2 posts link here ...
  // repoint them". The subject-verb agreement inverts the usual plural-s, so derive each form once.
  const single = $derived(inboundLinks.length === 1);
  const nouns = $derived(single ? noun : `${noun}s`);
  const verb = $derived(single ? 'links' : 'link');
  const pronoun = $derived(single ? 'it' : 'them');

  /** Open the confirm. Exported so a trigger={false} host can drive the dialog itself. */
  export function open() {
    dialog?.showModal();
  }
  function close() {
    dialog?.close();
  }
</script>

{#if trigger}
  <button type="button" class="btn btn-sm btn-ghost text-error" aria-haspopup="dialog" onclick={open}>
    Delete
  </button>
{/if}

<dialog class="modal" role="alertdialog" aria-modal="true" aria-labelledby="cairn-delete-dialog-title" bind:this={dialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-delete-dialog-title" class="text-base font-semibold">Delete this {label.toLowerCase()}?</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
    </div>

    {#if blocked}
      <p class="mb-2 text-sm">
        {inboundLinks.length} {nouns} {verb} here. Remove or repoint {pronoun} before deleting, so no link is left
        broken.
      </p>
      <ul class="menu w-full">
        {#each inboundLinks as link (link.concept + '/' + link.id)}
          <li>
            <a href={`/admin/${link.concept}/${link.id}`}>{link.title}</a>
          </li>
        {/each}
      </ul>
      <div class="mt-3 flex justify-end">
        <button type="button" class="btn btn-sm" onclick={close}>Close</button>
      </div>
    {:else}
      <p class="mb-3 text-sm">This cannot be undone.{#if pending} Unpublished edits to this entry are discarded too.{/if}</p>
      <form method="POST" action="?/delete" class="flex justify-end gap-2" onsubmit={() => onsubmitting?.()}>
        <CsrfField />
        <input type="hidden" name="concept" value={conceptId} />
        <input type="hidden" name="id" value={id} />
        <button type="button" class="btn btn-sm" onclick={close}>Cancel</button>
        <button type="submit" class="btn btn-sm btn-error">Delete this {label.toLowerCase()}</button>
      </form>
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>
