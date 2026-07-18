<!-- @component The root layout, shared by every route (both the (site) group and /admin). Its only
     job is mounting content islands after navigation; the (site) group's own layout carries the
     public chrome, and the admin mount carries CairnAdminShell. -->
<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  // Mount content islands after every navigation (first load and SPA navigations both fire
  // afterNavigate). The sibling +layout.server.ts computes hasIslands from the theme's island
  // registry on the server, so a site with no registered islands never even requests the
  // hydration runtime or the registry module. Both dynamic imports name only the lean registry
  // module (`$theme/islands/registry.js`, a directive-name-to-component map with no other
  // dependency), never the full site adapter (`$theme/cairn.config.js`), which also carries the
  // engine renderer, the icon set, and the committed media manifest: importing that client-side
  // is what used to ship the whole adapter to every public page.
  afterNavigate(async () => {
    if (!data.hasIslands) return;
    const [{ hydrateIslands }, { siteIslands }] = await Promise.all([
      import('@glw907/cairn-cms/islands'),
      import('$theme/islands/registry.js'),
    ]);
    hydrateIslands(siteIslands);
  });
</script>

{@render children()}
