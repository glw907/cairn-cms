<!-- @component The custom Signups admin screen: a developer's own route rendered in CairnAdminShell.
     The header and the table adopt the packaged admin toolkit through its public subpath
     (`@glw907/cairn-cms/admin-toolkit`), the in-repo consumer proof that a site's own custom
     screen reaches for the toolkit the same way cairn's own admin does. -->
<script lang="ts">
  import { tick } from 'svelte';
  import { enhance } from '$app/forms';
  import { CsrfField } from '@glw907/cairn-cms/components';
  import { PageHeader, AdminTable } from '@glw907/cairn-cms/admin-toolkit';
  import type { PageData, ActionData } from './$types';
  import type { SubmitFunction } from '@sveltejs/kit';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // The server's error tokens stay terse (other tests and the exemplar's docs name them), so the
  // sentence a sighted user reads is built here, with the raw token as a fallback for any token
  // this map does not yet cover.
  const errorMessages: Record<string, string> = {
    missing: 'Name and email are both required.',
  };

  // State for the one shared confirm dialog, whose markup and recipe sit below the table: the
  // pending row's id and name are set by the trigger that opened it, so the same dialog and the
  // same posted form serve every row without duplicating a dialog per row.
  let deleteDialog = $state<HTMLDialogElement | null>(null);
  let pendingDeleteId = $state<number | null>(null);
  let pendingDeleteName = $state('');
  let nameInput = $state<HTMLInputElement | null>(null);

  function confirmDelete(id: number, name: string) {
    pendingDeleteId = id;
    pendingDeleteName = name;
    // showModal only after Svelte flushes the new pendingDeleteName, or the dialog's
    // aria-labelledby heading still names the previously opened row (or nothing, on the first
    // open): $state writes batch into a microtask, so a synchronous showModal races it.
    void tick().then(() => deleteDialog?.showModal());
  }

  function cancelDelete() {
    deleteDialog?.close();
  }

  // use:enhance is what keeps the outcome region's content change inside the live document: a
  // native full-page POST would replace the whole document with the region's outcome already
  // present at load, which a screen reader never announces as a status change (WCAG 4.1.3).
  const onCreate: SubmitFunction = () => {
    return async ({ result, update }) => {
      await update();
      if (result.type === 'failure') nameInput?.focus();
    };
  };

  const onRemove: SubmitFunction = () => {
    return async ({ result, update }) => {
      if (result.type === 'success') deleteDialog?.close();
      await update();
    };
  };
</script>

<PageHeader title="Signups" />

<form method="POST" action="?/create" class="my-4 flex items-end gap-2" use:enhance={onCreate}>
  <CsrfField />
  <label class="flex flex-col gap-label signup-create-label">
    <span class="type-body font-medium">Name</span>
    <input
      name="name"
      class="input signup-create-field"
      bind:this={nameInput}
      aria-describedby="signup-outcome"
      aria-invalid={form?.error ? 'true' : undefined}
    />
  </label>
  <label class="flex flex-col gap-label signup-create-label">
    <span class="type-body font-medium">Email</span>
    <input
      name="email"
      class="input signup-create-field"
      aria-describedby="signup-outcome"
      aria-invalid={form?.error ? 'true' : undefined}
    />
  </label>
  <button class="btn btn-primary signup-create-submit">Add</button>
</form>

<!-- Always mounted and content-gated (the admin's ruled busy/live-region idiom), so it reads any
     outcome either action produces without re-mounting mid-interaction (WCAG 4.1.3, 3.3.1): both
     forms' use:enhance keeps the outcome a DOM mutation into this already-mounted region rather
     than a full-page reload. form.error is read generically: createSectionAction's own denial and
     misconfigured branches carry the same field the create action's validation failure does. -->
<p role="status" aria-live="polite" class="type-body mt-2 pt-14" id="signup-outcome">
  {#if form?.error}
    {errorMessages[form.error] ?? form.error}
  {:else if form?.created}
    Signup added.
  {:else if form?.removed}
    Signup removed.
  {/if}
</p>

<AdminTable density="sm" rowCount={data.signups.length}>
  {#snippet header()}
    <th scope="col">Name</th>
    <th scope="col">Email</th>
    <th scope="col"><span class="sr-only">Actions</span></th>
  {/snippet}
  {#snippet children()}
    {#each data.signups as s (s.id)}
      <tr>
        <td>{s.name}</td>
        <td>{s.email}</td>
        <td>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            aria-label={`Delete ${s.name}`}
            aria-haspopup="dialog"
            onclick={() => confirmDelete(s.id, s.name)}
          >
            Delete
          </button>
        </td>
      </tr>
    {/each}
  {/snippet}
</AdminTable>

<!-- One shared confirm for every row's destructive action, following the design system's
     safe-delete recipe: a native dialog opened with showModal (native focus trap and Escape),
     role="alertdialog", and no method="dialog" backdrop, so a stray click cannot dismiss it. -->
<dialog
  class="modal"
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="signup-delete-title"
  bind:this={deleteDialog}
>
  <div class="modal-box">
    <h2 id="signup-delete-title" class="type-heading font-bold">
      Delete {pendingDeleteName}?
    </h2>
    <p class="mb-3 type-body">This cannot be undone.</p>
    <form method="POST" action="?/remove" class="flex justify-end gap-2" use:enhance={onRemove}>
      <CsrfField />
      <input type="hidden" name="id" value={pendingDeleteId} />
      <button type="button" class="btn btn-sm" onclick={cancelDelete}>Cancel</button>
      <button type="submit" class="btn btn-sm btn-error">Delete</button>
    </form>
  </div>
</dialog>

<style>
  /* A site's own admin route rides cairn's shipped, precompiled cairn-admin.css: a Tailwind
     utility written only here (never scanned into that sheet) never resolves, so the field width
     the stacked labels need is a plain scoped rule instead of a Tailwind class.

     The label, not the input, carries the sizing: as a flex item with a definite flex-basis it
     grows to 20rem when the row has room and shrinks below that (down to 3rem) when it does not,
     so the create row never overflows or wraps at narrow viewports. The input then fills its
     label at 100%, which resolves cleanly here because the label (unlike `.input`'s own auto-sized
     flex-col containing block) now has a definite computed width from the flex algorithm. */
  .signup-create-label {
    flex: 1 1 0;
    min-width: 3rem;
    max-width: 20rem;
  }

  .signup-create-field {
    width: 100%;
  }

  .signup-create-submit {
    flex-shrink: 0;
  }
</style>
