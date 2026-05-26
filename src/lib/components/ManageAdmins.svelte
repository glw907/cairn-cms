<script lang="ts">
  // Owner-gated editor management: list the allowlist, change roles, remove editors, add new
  // ones. Reuses the same neutral DaisyUI chrome as the rest of the admin (panels, alerts,
  // table, buttons). Data comes from `adminsLoad` merged with `adminLayoutLoad` (siteName);
  // mutations post to the page's named form actions (`?/add`, `?/remove`, `?/setRole`).
  import type { AdminsData } from '../sveltekit';

  interface Props {
    data: AdminsData & { siteName: string };
  }
  let { data }: Props = $props();
</script>

<svelte:head>
  <title>Editors · {data.siteName} CMS</title>
</svelte:head>

<div>
  <h1 class="text-2xl font-bold">Editors</h1>
  <p class="text-sm opacity-60">Who can sign in to {data.siteName} CMS.</p>
</div>

{#if data.saved}
  <div class="alert alert-success mt-6"><span>Allowlist updated.</span></div>
{:else if data.error}
  <div class="alert alert-error mt-6"><span>{data.error}</span></div>
{/if}

<div class="mt-6 overflow-x-auto rounded-box border border-base-300 bg-base-100">
  <table class="table">
    <thead>
      <tr><th>Name</th><th>Email</th><th>Role</th><th class="text-right">Actions</th></tr>
    </thead>
    <tbody>
      {#each data.admins as admin (admin.email)}
        {@const isSelf = admin.email === data.self}
        <tr>
          <td class="font-medium">{admin.name}</td>
          <td class="opacity-70">{admin.email}{#if isSelf}<span class="ml-1 opacity-50">(you)</span>{/if}</td>
          <td>
            <span class="badge {admin.role === 'owner' ? 'badge-primary' : 'badge-ghost'}">{admin.role}</span>
          </td>
          <td>
            <div class="flex justify-end gap-2">
              <!-- Flip role. Disabled for yourself so you can't demote the last owner out. -->
              <form method="POST" action="?/setRole">
                <input type="hidden" name="email" value={admin.email} />
                <input type="hidden" name="role" value={admin.role === 'owner' ? 'editor' : 'owner'} />
                <button type="submit" class="btn btn-ghost btn-xs" disabled={isSelf}>
                  Make {admin.role === 'owner' ? 'editor' : 'owner'}
                </button>
              </form>
              <form method="POST" action="?/remove">
                <input type="hidden" name="email" value={admin.email} />
                <button type="submit" class="btn btn-ghost btn-xs text-error" disabled={isSelf}>Remove</button>
              </form>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<form method="POST" action="?/add"
  class="mt-8 grid gap-4 rounded-box border border-base-300 bg-base-100 p-6 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Email</span>
    <input type="email" name="email" required autocomplete="off" placeholder="you@example.com"
      class="input w-full" />
  </label>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Name</span>
    <input type="text" name="name" required placeholder="Display name" class="input w-full" />
  </label>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Role</span>
    <select name="role" class="select">
      <option value="editor">editor</option>
      <option value="owner">owner</option>
    </select>
  </label>
  <button type="submit" class="btn btn-primary">Add editor</button>
</form>
