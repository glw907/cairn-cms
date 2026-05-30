<!--
@component
The owner-gated editor management surface: a table of editors with role-flip and remove actions,
and an add-editor form. The acting owner's own row disables its destructive controls; the
last-owner anti-lockout rule itself is enforced server-side (editors-routes). Actions post to the
named `?/setRole`, `?/remove`, and `?/add` actions.
-->
<script lang="ts">
  import type { Editor } from '../auth/types.js';

  interface Props {
    /** The editors load's data, plus the site name. */
    data: { editors: Editor[]; self: string; siteName: string };
    /** The last action's result (an error message when it failed). */
    form: { error?: string; ok?: boolean } | null;
  }

  let { data, form }: Props = $props();
</script>

<header class="mb-4">
  <h1 class="text-xl font-semibold">Editors</h1>
</header>

{#if form?.error}
  <div role="alert" class="alert alert-error mb-4 text-sm">{form.error}</div>
{/if}

<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100 mb-6">
  <table class="table">
    <thead>
      <tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col"><span class="sr-only">Actions</span></th></tr>
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
              <input type="hidden" name="email" value={editor.email} />
              <input type="hidden" name="role" value={editor.role === 'owner' ? 'editor' : 'owner'} />
              <button type="submit" class="btn btn-ghost btn-xs" disabled={isSelf} aria-label={`Toggle role for ${editor.displayName}`}>
                {editor.role === 'owner' ? 'Make editor' : 'Make owner'}
              </button>
            </form>
            <form method="POST" action="?/remove">
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

<form method="POST" action="?/add" class="rounded-box border border-base-300 bg-base-100 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
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
