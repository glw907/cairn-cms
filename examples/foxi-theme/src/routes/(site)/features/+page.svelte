<!-- @component The /features page, styled after `src/pages/features.astro`
     (oxygenna-themes/foxi-astro-theme, MIT): a page header, then five category-grouped feature
     grids, each with its own lead-in heading and short blurb. -->
<script lang="ts">
  import FeatureGrid from '$theme/components/FeatureGrid.svelte';
  import CTABanner from '$theme/components/CTABanner.svelte';
  import { featureGroups } from '$theme/data/features.js';
</script>

<svelte:head>
  <title>Features | Foxi</title>
</svelte:head>

<div class="cairn-band">
  <div class="site-wide cairn-hero mx-auto max-w-measure text-center">
    <h1 class="cairn-hero-title">
      Why you and your team will <strong class="text-primary">love foxi</strong>.
    </h1>
    <p class="cairn-hero-lead mx-auto">Streamline your tasks, protect your data, and enjoy working with our tools!</p>
  </div>
</div>

{#each featureGroups as group, index (group.heading)}
  <div class="{index % 2 === 1 ? 'bg-base-200' : ''} py-2xl">
    <div class="site-wide">
      <div class="grid grid-cols-1 gap-l lg:grid-cols-[16rem_1fr]">
        <div>
          <h2 class="m-0 mb-2xs text-step-3 font-bold text-base-content">{group.heading}</h2>
          <p class="m-0 text-step--1 text-muted">{group.text}</p>
        </div>
        <FeatureGrid features={group.features} columns="sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    </div>
  </div>
{/each}

<div class="site-wide pb-2xl">
  <CTABanner
    title="Join Over 30,000 Satisfied Users!"
    text="Discover why thousands of professionals trust our platform to streamline their workflow and enhance productivity."
    badge="#1 Product of the Year, Product Hunt"
    buttonLabel="Get started now!"
    buttonHref="/pricing"
  />
</div>
