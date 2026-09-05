<!--
@component
The owner-gated editor management surface, built on the admin toolkit: a table of editors with
role-flip and remove actions, and an add-editor form. The acting owner's own row disables its
destructive controls; the last-owner anti-lockout rule itself is enforced server-side
(editors-routes). Actions post to the named `?/editorSetRole`, `?/editorRemove`, and `?/editorAdd`
actions, the names the single-mount dispatcher defines.

The header band is `PageHeader`, mounted
with no action slot: the add-editor form stays its own row below the table, the screen's one
form-semantic primary action. The role badge stays a plain daisy `badge` (ruling 7 of the pass's
adoption map): it names an identity, not a stateful standing, so `StatusChip` does not apply.
-->
<script lang="ts">
  import CsrfField from './CsrfField.svelte';
  import type { Editor } from '../auth/types.js';
  import type { Capability } from '../auth/roles.js';
  import { PageHeader, AdminTable } from '../admin-toolkit/index.js';

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

  /** A role option's label: the bare name, or the name with its capability alongside when the
   *  two differ (the default pair's capability already equals its name, so it stays unlabeled). */
  function roleOptionLabel(entry: { role: string; capability: Capability }): string {
    return entry.role === entry.capability ? entry.role : `${entry.role} (${entry.capability})`;
  }

  // The one lifecycle error to announce: a rejected editorAdd/editorRemove/editorSetRole `fail()`.
  // Every editor-management refusal now answers in place, so this load carries no `?error=` bounce.
  const lifecycleError = $derived(form?.error ?? '');

  // The polite live region's text re-announces only when it changes, so a repeated identical error
  // (a second submit failing the same way) would otherwise go silent. An invisible nonce flips on
  // every fresh error so the region text always mutates and the screen reader speaks again; this is
  // one of six admin screens that hand-roll the identical idiom rather than share it (ConceptList's
  // own comment names the full set). The nonce is a zero-width space, never voiced, so the heard
  // sentence is unchanged; the visible alert below keeps its own styling and drops the `role` (a
  // fresh-inserted role element announces inconsistently and would clobber a repeat).
  let announceNonce = $state(0);
  function nonce(): string {
    return announceNonce % 2 === 0 ? '' : '​';
  }
  // Each submit hands a fresh `form` (or `data` on a load) object, so the nonce bumps once per
  // submit or load, keyed to that identity rather than to a string change the live region would
  // swallow.
  let lastSubmit: unknown;
  $effect(() => {
    const submit = form ?? data;
    if (submit !== lastSubmit) {
      lastSubmit = submit;
      if (lifecycleError) announceNonce++;
    }
  });
  const liveError = $derived(lifecycleError ? `${lifecycleError}${nonce()}` : '');
</script>

<!-- The office natural-measure rule (design arc 2026-07-15, propagated from ConceptList): this
     document list composes at 3xl within the shell's 5xl ceiling. -->
<div class="mx-auto w-full max-w-3xl">
<PageHeader eyebrow="Settings" title="Editors" />

<div class="sr-only" aria-live="polite">{liveError}</div>
{#if lifecycleError}
  <div class="alert alert-error mb-4 type-body">{lifecycleError}</div>
{/if}

<div class="mb-4 overflow-hidden card-shell card-shadow">
  <AdminTable density="sm" rowCount={data.editors.length}>
    {#snippet header()}
      <th scope="col" class="{col} pl-6">Name</th>
      <th scope="col" class={col}>Email</th>
      <th scope="col" class={col}>Role</th>
      <th scope="col"><span class="sr-only">Actions</span></th>
    {/snippet}
    {#snippet children()}
      {#each data.editors as editor (editor.email)}
        {@const isSelf = editor.email === data.self}
        <tr>
          <!-- Title rank (design arc 2026-07-15, propagated from ConceptList): Name is the row's
               primary identifying cell, so it alone carries type-subtitle at font-medium; the
               other cells stay at the table's own type. -->
          <td class="pl-6 py-2 type-subtitle font-medium">{editor.displayName}</td>
          <td>{editor.email}</td>
          <td>
            <span class="badge {capabilityFor(editor.role) === 'owner' ? 'badge-primary' : 'cairn-chip-outline'}">{editor.role}</span>
          </td>
          <td class="flex justify-end gap-2">
            {#if isDefaultVocabulary}
              <form method="POST" action="?/editorSetRole">
                <CsrfField />
                <input type="hidden" name="email" value={editor.email} />
                <input type="hidden" name="role" value={editor.role === 'owner' ? 'editor' : 'owner'} />
                <button type="submit" class="btn btn-ghost btn-xs" disabled={isSelf} aria-label={`Toggle role for ${editor.displayName}`}>
                  {editor.role === 'owner' ? 'Make editor' : 'Make owner'}
                </button>
              </form>
            {:else}
              <form method="POST" action="?/editorSetRole" class="flex items-center gap-1">
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
                <button type="submit" class="btn btn-ghost btn-xs" disabled={isSelf}>Change</button>
              </form>
            {/if}
            <form method="POST" action="?/editorRemove">
              <CsrfField />
              <input type="hidden" name="email" value={editor.email} />
              <button type="submit" class="btn btn-ghost btn-xs text-error" disabled={isSelf} aria-label={`Remove ${editor.displayName}`}>
                Remove
              </button>
            </form>
          </td>
        </tr>
      {/each}
    {/snippet}
  </AdminTable>
</div>

<form method="POST" action="?/editorAdd" class="card-shell grid gap-3 p-4 card-shadow sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
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
  <button type="submit" class="btn btn-primary">Add editor</button>
</form>
</div>
