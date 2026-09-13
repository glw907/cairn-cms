<!-- @component The custom Signups admin screen: a developer's own route rendered in CairnAdminShell.
     The header and the table adopt the packaged admin toolkit through its public subpath
     (`@glw907/cairn-cms/admin-toolkit`), the in-repo consumer proof that a site's own custom
     screen reaches for the toolkit the same way cairn's own admin does. -->
<script lang="ts">
  import { CsrfField } from '@glw907/cairn-cms/components';
  import { PageHeader, AdminTable } from '@glw907/cairn-cms/admin-toolkit';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // The server's error tokens stay terse (other tests and the exemplar's docs name them), so the
  // sentence a sighted user reads is built here, with the raw token as a fallback for any token
  // this map does not yet cover.
  const errorMessages: Record<string, string> = {
    missing: 'Name and email are both required.',
  };
</script>

<PageHeader title="Signups" />

<form method="POST" action="?/create" class="my-4 flex gap-2">
  <CsrfField />
  <label class="flex flex-col gap-label">
    <span class="type-body font-medium">Name</span>
    <input name="name" class="input" />
  </label>
  <label class="flex flex-col gap-label">
    <span class="type-body font-medium">Email</span>
    <input name="email" class="input" />
  </label>
  <button class="btn btn-primary">Add</button>
</form>

<!-- Always mounted and content-gated (the admin's ruled busy/live-region idiom), so it reads any
     outcome either action produces without re-mounting mid-interaction (WCAG 4.1.3, 3.3.1).
     form.error is read generically: createSectionAction's own denial and misconfigured branches
     carry the same field the create action's validation failure does. -->
<p role="status" aria-live="polite" class="type-body mt-2">
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
          <form method="POST" action="?/remove">
            <CsrfField />
            <input type="hidden" name="id" value={s.id} />
            <button class="btn btn-ghost btn-xs">Delete</button>
          </form>
        </td>
      </tr>
    {/each}
  {/snippet}
</AdminTable>
