<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { cairn } from '$lib/cairn.config';

  let { children } = $props();

  // Mount content islands after every navigation (first load and SPA navigations both fire afterNavigate).
  // The runtime is imported dynamically and only when the site registers at least one island, so a static
  // site never ships the island client code (zero cost when unused).
  afterNavigate(async () => {
    const islands = cairn.rendering.islands;
    if (!islands || Object.keys(islands).length === 0) return;
    const { hydrateIslands } = await import('@glw907/cairn-cms/islands');
    hydrateIslands(islands);
  });
</script>

{@render children()}
