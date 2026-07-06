<!-- @component
A breadcrumb trail, styled after `src/components/ui/Breadcrumbs.astro`
(oxygenna-themes/foxi-astro-theme, MIT): a pill-shaped hairline strip with chevron separators,
the current page unlinked and muted.
-->
<script lang="ts">
  import type { Crumb } from '$theme/types.js';

  interface Props {
    crumbs: Crumb[];
  }
  let { crumbs }: Props = $props();
</script>

<nav aria-label="Breadcrumb" class="inline-flex items-center gap-2xs rounded-field border border-card-border bg-base-100 px-s py-2xs text-step--1">
  {#each crumbs as crumb, index (crumb.label)}
    {#if index > 0}
      <svg class="h-3 w-3 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    {/if}
    {#if crumb.href}
      <a href={crumb.href} class="text-base-content hover:text-primary">{crumb.label}</a>
    {:else}
      <span class="text-muted" aria-current="page">{crumb.label}</span>
    {/if}
  {/each}
</nav>
