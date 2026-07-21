<!-- @component The custom Signups admin screen: a developer's own route rendered in CairnAdminShell.
     The header and the table adopt the packaged admin toolkit through its public subpath
     (`@glw907/cairn-cms/admin-toolkit`), the in-repo consumer proof that a site's own custom
     screen reaches for the toolkit the same way cairn's own admin does. -->
<script lang="ts">
  import { CsrfField } from '@glw907/cairn-cms/components';
  import { PageHeader, AdminTable } from '@glw907/cairn-cms/admin-toolkit';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<PageHeader title="Signups" />

<form method="POST" action="?/create" class="my-4 flex gap-2">
  <CsrfField />
  <label class="sr-only" for="signup-name">Name</label>
  <input id="signup-name" name="name" placeholder="Name" class="input" />
  <label class="sr-only" for="signup-email">Email</label>
  <input id="signup-email" name="email" placeholder="Email" class="input" />
  <button class="btn btn-primary">Add</button>
</form>

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
