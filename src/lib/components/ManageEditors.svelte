<!--
@component
The owner-gated editor management surface: a table of editors with role-flip and remove actions,
and an add-editor form. The acting owner's own row disables its destructive controls; the
last-owner anti-lockout rule itself is enforced server-side (editors-routes). Actions post to the
named `?/setRole`, `?/remove`, and `?/add` actions.
-->
<script lang="ts">
  import CsrfField from './CsrfField.svelte';
  import type { Editor } from '../auth/types.js';

  interface Props {
    /** The editors load's data: the allowlist and the acting owner's email. */
    data: { editors: Editor[]; self: string };
    /** The last action's result (an error message when it failed). */
    form: { error?: string; ok?: boolean } | null;
  }

  let { data, form }: Props = $props();

  // Eyebrow styling for the table column headers, matching the concept list.
  const col = 'text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]';
</script>

<header class="mb-6">
  <h1 class="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">Editors</h1>
</header>

{#if form?.error}
  <div role="alert" class="alert alert-error mb-4 text-sm">{form.error}</div>
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
            <span class="badge {editor.role === 'owner' ? 'badge-primary' : 'badge-ghost'}">{editor.role}</span>
          </td>
          <td class="flex justify-end gap-2">
            <form method="POST" action="?/setRole">
              <CsrfField />
              <input type="hidden" name="email" value={editor.email} />
              <input type="hidden" name="role" value={editor.role === 'owner' ? 'editor' : 'owner'} />
              <button type="submit" class="btn btn-ghost btn-xs" disabled={isSelf} aria-label={`Toggle role for ${editor.displayName}`}>
                {editor.role === 'owner' ? 'Make editor' : 'Make owner'}
              </button>
            </form>
            <form method="POST" action="?/remove">
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

<form method="POST" action="?/add" class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 grid gap-3 p-4 shadow-[var(--cairn-shadow)] sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
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
      <option value="editor">editor</option>
      <option value="owner">owner</option>
    </select>
  </label>
  <button type="submit" class="btn btn-primary">Add editor</button>
</form>
