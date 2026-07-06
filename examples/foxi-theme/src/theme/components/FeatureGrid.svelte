<!-- @component
A grid of icon-led feature cards, styled after `src/components/blocks/features/FeatureCards.astro`
and `FeatureList.astro` (oxygenna-themes/foxi-astro-theme, MIT). Expressed with the chassis's own
`.cairn-card` recipe (padding, radius, border, background all read from tokens) plus a plain
Tailwind grid: no new chassis primitive was needed for this device.
-->
<script lang="ts">
  import type { Feature } from '$theme/types.js';

  interface Props {
    features: Feature[];
    /** Tailwind column-count classes for the responsive grid (the home page's compact 3-up grid
     *  versus the /features page's denser listing use different counts). */
    columns?: string;
  }
  let { features, columns = 'sm:grid-cols-2 lg:grid-cols-3' }: Props = $props();
</script>

<div class="grid grid-cols-1 gap-m {columns}">
  {#each features as feature (feature.title)}
    <div class="cairn-card">
      <span class="mb-2xs inline-flex h-10 w-10 items-center justify-center rounded-field bg-secondary text-primary">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8Z" stroke-linejoin="round" />
        </svg>
      </span>
      <h3 class="mb-2xs text-step-1 font-semibold text-base-content">{feature.title}</h3>
      <p class="m-0 text-step--1 text-muted">{feature.description}</p>
    </div>
  {/each}
</div>
