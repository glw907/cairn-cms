<!--
@component
The Delete control and its modal. With no inbound links it is a plain confirm that posts to the
?/delete action. With inbound links it blocks: it names how many entries link to (or include) this
one and lists them, each linking to its edit page, so the author clears those references first.
Built on a native <dialog>, following the LinkPicker a11y conventions.
@beta
-->
<script lang="ts">
  import CsrfField from './CsrfField.svelte';
  import { refocusDialogOrigin, resolveDialogOrigin } from './dialog-origin.js';
  import type { EntryRef } from '../content/manifest.js';

  interface Props {
    /** The concept this entry belongs to, e.g. "posts". Posted with the confirm. */
    conceptId: string;
    /** The entry id within its concept. Posted with the confirm. */
    id: string;
    /**
     * The singular noun for the entry being deleted, e.g. "Post", used in "Delete this X?" and
     *  the confirm prompts; mirrors ListData.singular's doc voice.
     */
    singular: string;
    /** The entries that link to (or include) this one; non-empty blocks the delete. */
    inboundLinks: EntryRef[];
    /** Which copy family the blocked view renders: "link" for an entry other entries link to,
     *  "include" for a fragment the listed entries include. */
    inboundKind?: 'link' | 'include';
    /** The entry's title, named in the confirm ("“Title” will be deleted."). Omitted, the confirm
     *  does not name the entry. */
    entryTitle?: string;
    /** True when the entry has unpublished edits, which the delete discards along with it. */
    pending?: boolean;
    /** Render the built-in Delete trigger. False mounts only the dialog, for a host that supplies
     *  its trigger and opens the dialog through the exported open(). */
    trigger?: boolean;
    /** Called when the delete confirm submits, before the document navigates. The edit page uses
     *  it to stand down its leave guard while the POST is in flight. */
    onsubmitting?: () => void;
  }

  let { conceptId, id, singular, inboundLinks, inboundKind = 'link', entryTitle, pending = false, trigger = true, onsubmitting }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  const blocked = $derived(inboundLinks.length > 0);
  // The deleted entry's noun, for "Delete this X?" and the confirm prompts only.
  const noun = $derived(singular.toLowerCase());
  // One inbound link reads "1 entry links here ... repoint it"; many reads "2 entries link
  // here ... repoint them". The subject-verb agreement inverts the usual plural-s, so derive each
  // form once.
  const single = $derived(inboundLinks.length === 1);
  const verb = $derived(single ? 'links' : 'link');
  const pronoun = $derived(single ? 'it' : 'them');
  // Both the link count and the inclusion count name an anonymous "entry"/"entries" noun rather
  // than the deleted entry's singular: a linker or includer can belong to a wholly different
  // concept than the one being deleted (a page linking to a post, several concepts including one
  // fragment), so "entry"/"entries" is the only noun that stays accurate regardless of what
  // points here.
  const entryNoun = $derived(single ? 'entry' : 'entries');

  let deleteOrigin: HTMLElement | null = null;
  // Set when the confirm submits so a double click sends one POST. open() and a bfcache restore
  // (pageshow) clear it, so a back navigation does not leave the button dead.
  let deleting = $state(false);

  /**
   * Open the confirm. Exported so a `trigger={false}` host can drive the dialog itself. Pass the
   * element that opened it so focus returns there on close (Safari does not focus a button on
   * click, so the active element alone is not enough); omitted, the active element is used.
   */
  export function open(origin?: HTMLElement | null) {
    deleteOrigin = resolveDialogOrigin(origin);
    deleting = false;
    dialog?.showModal();
  }
  function close() {
    dialog?.close();
  }
</script>

<svelte:window onpageshow={() => (deleting = false)} />

{#if trigger}
  <button type="button" class="btn btn-sm btn-ghost text-error" aria-haspopup="dialog" onclick={(e) => open(e.currentTarget)}>
    Delete
  </button>
{/if}

<!-- No backdrop form: a destructive alertdialog does not light-dismiss, so a stray click outside
     cannot close it. Escape, the X, and Cancel still do. -->
<dialog
  class="modal"
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="cairn-delete-dialog-title"
  aria-describedby="cairn-delete-dialog-desc"
  bind:this={dialog}
  onclose={() => (deleteOrigin = refocusDialogOrigin(deleteOrigin))}
>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-delete-dialog-title" class="type-heading font-bold font-[family-name:var(--font-display)]">Delete this {noun}?</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
    </div>

    {#if blocked}
      <p id="cairn-delete-dialog-desc" class="mb-2 type-body">
        {#if inboundKind === 'include'}
          This {noun} is included by {inboundLinks.length} {entryNoun}. Remove the include first, then delete
          again.
        {:else}
          {inboundLinks.length} {entryNoun} {verb} here. Remove or repoint {pronoun} before deleting, so no link is left
          broken.
        {/if}
      </p>
      <!-- role="list"/"listitem": daisyUI's .menu :where(li) renders every item at
           display: flex, which strips the implicit list role in WebKit/VoiceOver. -->
      <ul class="menu w-full" role="list">
        {#each inboundLinks as link (link.concept + '/' + link.id)}
          <li role="listitem">
            <a href={`/admin/${link.concept}/${link.id}`}>{link.title}</a>
          </li>
        {/each}
      </ul>
      <div class="mt-3 flex justify-end">
        <button type="button" class="btn btn-sm" onclick={close}>Close</button>
      </div>
    {:else}
      <p id="cairn-delete-dialog-desc" class="mb-3 type-body">{#if entryTitle}“{entryTitle}” will be deleted.{' '}{/if}This cannot be undone.{#if pending}{' '}Unpublished edits to this entry are discarded too.{/if}</p>
      <form method="POST" action="?/delete" class="flex justify-end gap-2" onsubmit={() => {
        deleting = true;
        onsubmitting?.();
      }}>
        <CsrfField />
        <input type="hidden" name="concept" value={conceptId} />
        <input type="hidden" name="id" value={id} />
        <button type="button" class="btn btn-sm" onclick={close}>Cancel</button>
        <button type="submit" class="btn btn-sm btn-error" disabled={deleting}>
          {#if deleting}<span class="loading loading-spinner loading-xs" aria-hidden="true"></span> Deleting…{:else}Delete this {noun}{/if}
        </button>
      </form>
    {/if}
  </div>
</dialog>
