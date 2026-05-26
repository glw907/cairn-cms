<script lang="ts">
  // Neutral admin chrome — robots noindex + a centered container, scoped to /admin. Shared
  // across sites so the admin tool looks identical everywhere (only siteName, supplied by
  // pages, varies). Each site's `admin/+layout.svelte` is a one-line shim around this.
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-screen bg-base-200" data-pagefind-ignore>
  <div class="mx-auto max-w-3xl px-4 py-8">
    {@render children()}
  </div>
</div>
