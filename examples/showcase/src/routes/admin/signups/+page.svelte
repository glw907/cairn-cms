<!-- @component The custom Signups admin screen: a developer's own route rendered in CairnAdminShell. -->
<script lang="ts">
  import { CsrfField } from '@glw907/cairn-cms/components';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<h1 class="text-2xl font-semibold">Signups</h1>
<form method="POST" action="?/create" class="my-4 flex gap-2">
  <CsrfField />
  <input name="name" placeholder="Name" class="input input-bordered" />
  <input name="email" placeholder="Email" class="input input-bordered" />
  <button class="btn btn-primary">Add</button>
</form>
<table class="table">
  <tbody>
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
  </tbody>
</table>
