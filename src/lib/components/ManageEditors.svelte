<!--
@component
The owner-gated editor management surface: a table of editors with role-flip and remove actions,
and an add-editor form. The acting owner's own row disables its destructive controls; the
last-owner anti-lockout rule itself is enforced server-side (editors-routes). Actions post to the
named `?/setRole`, `?/removeEditor`, and `?/addEditor` actions, the names the single-mount
dispatcher defines.
-->
<script lang="ts">
  import CsrfField from './CsrfField.svelte';
  import type { Editor } from '../auth/types.js';
  import type { Capability } from '../auth/roles.js';

  interface Props {
    /** The editors load's data: the allowlist, the acting owner's email, any `?error=` an
     *  unexpected action failure bounced back with, and the site's declared role vocabulary
     *  (each name paired with its resolved capability, in declaration order). */
    data: {
      editors: Editor[];
      self: string;
      error: string | null;
      vocabulary: { role: string; capability: Capability }[];
    };
    /** The last action's result (an error message when it failed). */
    form: { error?: string; ok?: boolean } | null;
  }

  let { data, form }: Props = $props();

  // Eyebrow styling for the table column headers, matching the concept list.
  const col = 'text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted';

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

  // The one lifecycle error to announce: a rejected addEditor/removeEditor/setRole `fail()` leads
  // (form?.error), else a redirected unexpected-failure bounce (data.error) from an action, like
  // publishAll, that carries no form of its own here.
  const lifecycleError = $derived(form?.error ?? data.error ?? '');

  // The polite live region's text re-announces only when it changes, so a repeated identical error
  // (a second submit failing the same way) would otherwise go silent. An invisible nonce flips on
  // every fresh error so the region text always mutates and the screen reader speaks again (the
  // ConceptList discipline). The nonce is a zero-width space, never voiced, so the heard sentence is
  // unchanged; the visible alert below keeps its own styling and drops the `role` (a fresh-inserted
  // role element announces inconsistently and would clobber a repeat).
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

<header class="mb-6">
  <h1 class="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">Editors</h1>
</header>

<div class="sr-only" aria-live="polite">{liveError}</div>
{#if lifecycleError}
  <div class="alert alert-error mb-4 text-sm">{lifecycleError}</div>
{/if}

<div class="overflow-x-auto rounded-box border border-[var(--cairn-card-border)] bg-base-100 mb-4 shadow-[var(--cairn-shadow)]">
  <table class="table">
    <thead>
      <tr><th scope="col" class={col}>Name</th><th scope="col" class={col}>Email</th><th scope="col" class={col}>Role</th><th scope="col"><span class="sr-only">Actions</span></th></tr>
    </thead>
    <tbody>
      {#each data.editors as editor (editor.email)}
        {@const isSelf = editor.email === data.self}
        <tr>
          <td>{editor.displayName}</td>
          <td>{editor.email}</td>
          <td>
            <span class="badge {capabilityFor(editor.role) === 'owner' ? 'badge-primary' : 'badge-ghost'}">{editor.role}</span>
          </td>
          <td class="flex justify-end gap-2">
            {#if isDefaultVocabulary}
              <form method="POST" action="?/setRole">
                <CsrfField />
                <input type="hidden" name="email" value={editor.email} />
                <input type="hidden" name="role" value={editor.role === 'owner' ? 'editor' : 'owner'} />
                <button type="submit" class="btn btn-ghost btn-xs" disabled={isSelf} aria-label={`Toggle role for ${editor.displayName}`}>
                  {editor.role === 'owner' ? 'Make editor' : 'Make owner'}
                </button>
              </form>
            {:else}
              <form method="POST" action="?/setRole" class="flex items-center gap-1">
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
            <form method="POST" action="?/removeEditor">
              <CsrfField />
              <input type="hidden" name="email" value={editor.email} />
              <button type="submit" class="btn btn-ghost btn-xs text-error" disabled={isSelf} aria-label={`Remove ${editor.displayName}`}>
                Remove
              </button>
            </form>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<form method="POST" action="?/addEditor" class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 grid gap-3 p-4 shadow-[var(--cairn-shadow)] sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
  <CsrfField />
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Name</span>
    <input class="input" name="name" aria-label="Name" required />
  </label>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Email</span>
    <input class="input" type="email" name="email" aria-label="Email" autocomplete="off" required />
  </label>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Role</span>
    <select class="select" name="role" aria-label="Role">
      {#each data.vocabulary as entry (entry.role)}
        <option value={entry.role} selected={entry.role === 'editor'}>{roleOptionLabel(entry)}</option>
      {/each}
    </select>
  </label>
  <button type="submit" class="btn btn-primary">Add editor</button>
</form>
