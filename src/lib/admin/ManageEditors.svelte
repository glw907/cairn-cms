<!--
@component
The owner-gated editor management surface, built on the admin toolkit: a table of editors with
role-flip and remove actions, and an add-editor form. The acting owner's row disables its
destructive controls; the last-owner anti-lockout rule itself is enforced server-side
(editors-routes). Actions post to the named `?/editorSetRole`, `?/editorRemove`, and `?/editorAdd`
actions, the names the single-mount dispatcher defines. `?/editorSetRole` rejects a posted role
outside the declared vocabulary as a form validation error ("Choose a valid role"), and with the
default owner/editor pair the role control is a toggle, with any other vocabulary a labeled select.

The header band is `PageHeader`, mounted
with no action slot: the add-editor form stays its row below the table, the screen's one
form-semantic primary action. The role badge stays a plain daisy `badge` (by design): it names an identity, not a stateful standing, so `StatusChip` does not apply.
@beta
-->
<script lang="ts">
  import { enhance } from '$app/forms';
  import CsrfField from './CsrfField.svelte';
  import type { Editor } from '../auth/types.js';
  import type { Capability } from '../auth/roles.js';
  import { PageHeader, AdminTable } from '../admin-toolkit/index.js';
  import { FAILURE_NOTICE, focusOnMount, refusalSubmit, type SettledResult } from './refusal.js';

  interface Props {
    /** The editors load's data: the allowlist, the acting owner's email, and the site's declared
     *  role vocabulary (each name paired with its resolved capability, in declaration order). */
    data: {
      editors: Editor[];
      self: string;
      vocabulary: { role: string; capability: Capability }[];
    };
    /** The last action's result (an error message when it failed). */
    form: { error?: string; ok?: boolean } | null;
  }

  let { data, form }: Props = $props();

  // Eyebrow styling for the table column headers, matching the concept list.
  const col = 'type-label font-semibold uppercase tracking-[0.08em] text-muted';

  // The default two-name vocabulary keeps today's bare toggle button; any larger or
  // differently-shaped vocabulary needs a labeled select naming every declared role. The
  // default pair is exactly the two reserved names, nothing more, nothing fewer.
  const isDefaultVocabulary = $derived(
    data.vocabulary.length === 2 &&
      data.vocabulary.some((entry) => entry.role === 'owner') &&
      data.vocabulary.some((entry) => entry.role === 'editor'),
  );

  /** The capability a role name resolves to under the declared vocabulary; 'none' when absent
   *  (mirrors the engine's fail-closed resolution, so a stale row never mislabels as owner). */
  function capabilityFor(role: string): Capability {
    return data.vocabulary.find((entry) => entry.role === role)?.capability ?? 'none';
  }

  /** The role badge's register: the owner capability reads primary, every other role quiet. */
  function roleBadge(role: string): string {
    return capabilityFor(role) === 'owner' ? 'badge-primary' : 'cairn-chip-quiet';
  }

  /** A role option's label: the bare name, or the name with its capability alongside when the
   *  two differ (the default pair's capability already equals its name, so it stays unlabeled). */
  function roleOptionLabel(entry: { role: string; capability: Capability }): string {
    return entry.role === entry.capability ? entry.role : `${entry.role} (${entry.capability})`;
  }

  // Raised from any form's submit until its result lands, so one in-flight request disables every
  // control on the screen and a second click cannot send a second request.
  let busy = $state(false);
  // The notice for a request that failed outright (no refusal came back to show). A fresh object
  // per failure keys the alert below, so a repeat failure takes focus again.
  let notice = $state<{ text: string } | null>(null);
  // A refusal the server sent back, or the notice for a request that failed outright.
  const lifecycleError = $derived(notice?.text ?? form?.error ?? '');
  // Every action answers `{ ok: true }` and none redirects, so a success refreshes in place.
  const updated = $derived(form?.ok && !lifecycleError ? 'The editor list is updated.' : '');

  function settle(result: SettledResult) {
    notice = result.type === 'error' ? { text: FAILURE_NOTICE } : null;
  }
  const base = {
    isPending: () => busy,
    setPending: (pending: boolean) => (busy = pending),
    onResult: settle,
    // This screen decides who can sign in, so a refusal rereads the list rather than trusting the
    // copy on screen, which another owner may have changed.
    refreshAllOnFailure: true,
  };
  const submitAdd = refusalSubmit(base);
  const submitRemove = refusalSubmit(base);
  // A refused role change returns a custom vocabulary's select to the row's role. The data does not
  // change, so the refresh leaves the select where the editor moved it, and Kit resets a form on
  // success only.
  const submitRole = refusalSubmit({
    ...base,
    onResult: (result, formElement) => {
      settle(result);
      if (result.type === 'failure') formElement.reset();
    },
  });
</script>

<!-- The office natural-measure rule (design arc 2026-07-15, propagated from ConceptList): this
     document list composes at 3xl within the shell's 5xl ceiling. -->
<div class="mx-auto w-full max-w-3xl">
<PageHeader eyebrow="Settings" title="Editors" />

<!-- A refusal answers in place, so it takes focus on mount; the key remounts it for each fresh
     result. -->
{#key notice ?? form}
  {#if lifecycleError}
    <div class="alert alert-error mb-4 type-body" tabindex="-1" use:focusOnMount>{lifecycleError}</div>
  {/if}
{/key}
<div role="status">
  {#if updated}<p class="mb-4 type-meta text-muted">{updated}</p>{/if}
</div>

<div class="mb-4 overflow-hidden card-shell card-shadow">
  <AdminTable density="sm" rowCount={data.editors.length}>
    {#snippet header()}
      <th scope="col" class="{col} pl-6">Name</th>
      <th scope="col" class="{col} hidden sm:table-cell">Email</th>
      <th scope="col" class="{col} hidden sm:table-cell">Role</th>
      <th scope="col"><span class="sr-only">Actions</span></th>
    {/snippet}
    {#snippet children()}
      {#each data.editors as editor (editor.email)}
        {@const isSelf = editor.email === data.self}
        <tr>
          <!-- Title rank (design arc 2026-07-15, propagated from ConceptList): Name is the row's
               primary identifying cell, so it alone carries type-subtitle at font-medium; the
               other cells stay at the table's type. -->
          <td class="pl-6 py-2 type-subtitle font-medium">
            {editor.displayName}
            <!-- Below sm the Email and Role columns hide, so both stack under the name instead of
                 dropping off the row (ConceptList's date column does the same). -->
            <span class="block break-all type-meta font-normal text-muted sm:hidden">{editor.email}</span>
            <span class="badge mt-1 sm:hidden {roleBadge(editor.role)}">{editor.role}</span>
          </td>
          <td class="hidden sm:table-cell">{editor.email}</td>
          <td class="hidden sm:table-cell">
            <span class="badge {roleBadge(editor.role)}">{editor.role}</span>
          </td>
          <td>
           <div class="flex flex-wrap justify-end gap-2">
            {#if isDefaultVocabulary}
              <form method="POST" action="?/editorSetRole" use:enhance={submitRole}>
                <CsrfField />
                <input type="hidden" name="email" value={editor.email} />
                <input type="hidden" name="role" value={editor.role === 'owner' ? 'editor' : 'owner'} />
                <button type="submit" class="btn btn-ghost btn-xs" disabled={isSelf || busy} aria-busy={busy} aria-label={`Toggle role for ${editor.displayName}`}>
                  {editor.role === 'owner' ? 'Make editor' : 'Make owner'}
                </button>
              </form>
            {:else}
              <form method="POST" action="?/editorSetRole" class="flex items-center gap-1" use:enhance={submitRole}>
                <CsrfField />
                <input type="hidden" name="email" value={editor.email} />
                <select
                  class="select select-xs"
                  name="role"
                  disabled={isSelf}
                  aria-label={`Change role for ${editor.displayName}`}
                >
                  {#each data.vocabulary as entry (entry.role)}
                    <option value={entry.role} selected={entry.role === editor.role}>{roleOptionLabel(entry)}</option>
                  {/each}
                </select>
                <button type="submit" class="btn btn-ghost btn-xs" disabled={isSelf || busy} aria-busy={busy}>Change</button>
              </form>
            {/if}
            <form method="POST" action="?/editorRemove" use:enhance={submitRemove}>
              <CsrfField />
              <input type="hidden" name="email" value={editor.email} />
              <button type="submit" class="btn btn-ghost btn-xs text-error" disabled={isSelf || busy} aria-busy={busy} aria-label={`Remove ${editor.displayName}`}>
                Remove
              </button>
            </form>
           </div>
          </td>
        </tr>
      {/each}
    {/snippet}
  </AdminTable>
</div>

<form method="POST" action="?/editorAdd" use:enhance={submitAdd} class="card-shell grid gap-3 p-4 card-shadow sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
  <CsrfField />
  <label class="flex flex-col gap-label">
    <span class="type-body font-medium">Name</span>
    <input class="input" name="name" aria-label="Name" autocomplete="off" required />
  </label>
  <label class="flex flex-col gap-label">
    <span class="type-body font-medium">Email</span>
    <input class="input" type="email" name="email" aria-label="Email" autocomplete="off" required />
  </label>
  <label class="flex flex-col gap-label">
    <span class="type-body font-medium">Role</span>
    <select class="select" name="role" aria-label="Role">
      {#each data.vocabulary as entry (entry.role)}
        <option value={entry.role} selected={entry.role === 'editor'}>{roleOptionLabel(entry)}</option>
      {/each}
    </select>
  </label>
  <button type="submit" class="btn btn-primary" disabled={busy} aria-busy={busy}>Add editor</button>
</form>
</div>
