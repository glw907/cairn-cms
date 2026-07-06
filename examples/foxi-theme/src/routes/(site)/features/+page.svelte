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

<div class="site-wide py-2xl">
  <div class="cairn-section flex flex-col gap-2xl">
    {#each featureGroups as group (group.heading)}
      <div class="grid grid-cols-1 gap-l lg:grid-cols-[16rem_1fr]">
        <h2 class="m-0 text-step-3 font-bold text-base-content">{group.heading}</h2>
        <FeatureGrid features={group.features} columns="sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    {/each}
  </div>
</div>

<div class="site-wide pb-2xl">
  <CTABanner
    title="Join Over 30,000 Satisfied Users!"
    text="Discover why thousands of professionals trust our platform to streamline their workflow and enhance productivity."
    buttonLabel="Get started now!"
    buttonHref="/pricing"
  />
</div>
