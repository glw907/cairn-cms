<script lang="ts">
  // The /admin content list: every collection's files, linking into the editor. Data comes
  // from `adminListLoad` (collections) merged with `adminLayoutLoad` (siteName). The shell
  // (AdminLayout) owns the chrome — site title, signed-in identity, nav, sign out — so this
  // page renders only the content body.
  import type { AdminCollectionList } from '../sveltekit';

  interface Props {
    data: { collections: AdminCollectionList[] };
  }
  let { data }: Props = $props();
</script>

<h1 class="text-2xl font-bold">Content</h1>

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
