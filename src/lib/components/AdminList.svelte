<script lang="ts">
  // The /admin content list: every collection's files, linking into the editor. Data comes
  // from `adminListLoad` (collections) merged with `adminLayoutLoad` (editor, siteName).
  import type { Editor } from '../auth';
  import type { AdminCollectionList } from '../sveltekit';

  interface Props {
    data: { siteName: string; editor: Editor | null; collections: AdminCollectionList[] };
  }
  let { data }: Props = $props();
</script>

<div class="flex items-center justify-between">
  <h1 class="text-2xl font-bold">{data.siteName} CMS</h1>
  <form method="POST" action="/admin/auth/logout">
    <button type="submit" class="btn btn-ghost btn-sm">Sign out</button>
  </form>
</div>

<p class="mt-2 text-sm opacity-70">
  Signed in as {data.editor?.name} ({data.editor?.email})
</p>

{#each data.collections as collection (collection.type)}
  <section class="mt-8">
    <h2 class="mb-3 text-lg font-semibold">{collection.label}</h2>
    {#if collection.error}
      <div class="alert alert-warning">Couldn't load {collection.label.toLowerCase()}: {collection.error}</div>
    {:else if collection.files.length === 0}
      <p class="opacity-60">No content yet.</p>
    {:else}
      <ul class="menu rounded-box border border-base-300 bg-base-100 p-2">
        {#each collection.files as file (file.path)}
          <li>
            <a href="/admin/edit/{collection.type}/{file.id}">{file.id}</a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/each}
