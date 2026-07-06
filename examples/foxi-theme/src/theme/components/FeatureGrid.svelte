<!-- @component
A borderless, icon-led grid of feature items, styled after `src/components/ui/Feature.astro`
(oxygenna-themes/foxi-astro-theme, MIT): a plain pink line icon over a title and a short
description, with no card, border, or tinted icon tile. Used by the `/features` listing and the
pricing page's "included on every plan" band; no chassis primitive was needed for a device this
plain.
-->
<script lang="ts">
  import type { Feature } from '$theme/types.js';
  import Icon from '$theme/components/Icon.svelte';

  interface Props {
    features: Feature[];
    /** Tailwind column-count classes for the responsive grid. */
    columns?: string;
  }
  let { features, columns = 'sm:grid-cols-2 lg:grid-cols-3' }: Props = $props();
</script>

<div class="grid grid-cols-1 gap-l {columns}">
  {#each features as feature (feature.title)}
    <div>
      <Icon name={feature.icon} class="mb-2xs h-6 w-6 text-primary" />
      <h3 class="mb-2xs text-step-0 font-semibold text-base-content">{feature.title}</h3>
      <p class="m-0 text-step--1 text-muted">{feature.description}</p>
    </div>
  {/each}
</div>
