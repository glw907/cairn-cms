<!-- @component The custom Signups admin screen: a developer's own route rendered in CairnAdminShell. -->
<script lang="ts">
  import { CsrfField } from '@glw907/cairn-cms/components';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<h1 class="text-2xl font-semibold">Signups</h1>
<form method="POST" action="?/create" class="my-4 flex gap-2">
  <CsrfField />
  <label class="sr-only" for="signup-name">Name</label>
  <input id="signup-name" name="name" placeholder="Name" class="input input-bordered" />
  <label class="sr-only" for="signup-email">Email</label>
  <input id="signup-email" name="email" placeholder="Email" class="input input-bordered" />
  <button class="btn btn-primary">Add</button>
</form>
<table class="table">
  <thead>
    <tr><th>Name</th><th>Email</th><th><span class="sr-only">Actions</span></th></tr>
  </thead>
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
