<!-- @component The Foxi port's home template, styled after `src/pages/index.astro`
     (oxygenna-themes/foxi-astro-theme, MIT): a hero, a compact feature grid, a dark testimonial
     band, four alternating highlight rows, and a closing CTA. Every section is a plain composed
     Svelte page built from this theme's own components; cairn's content model plays no part
     here (the capability question this port answers). -->
<script lang="ts">
  import FeatureGrid from '$theme/components/FeatureGrid.svelte';
  import Testimonial from '$theme/components/Testimonial.svelte';
  import TextImageRow from '$theme/components/TextImageRow.svelte';
  import CTABanner from '$theme/components/CTABanner.svelte';
  import { homeFeatures } from '$theme/data/features.js';
</script>

<svelte:head>
  <title>Foxi | Your Productivity Toolkit</title>
</svelte:head>

<div class="cairn-band pb-0 pt-2xl">
  <div class="site-wide cairn-hero mx-auto max-w-3xl text-center">
    <h1 class="cairn-hero-title">
      Enhance team <strong class="text-primary">performance</strong> with seamless integration
    </h1>
    <p class="cairn-hero-lead mx-auto">Work smarter, not harder, with our innovative platform.</p>
    <div>
      <a
        href="/pricing"
        class="inline-flex h-12 items-center justify-center rounded-field bg-primary px-6 text-step-0 font-bold text-primary-content no-underline hover:opacity-90"
      >
        Get started for free
      </a>
    </div>
  </div>
  <div class="site-wide mt-l">
    <div class="cairn-card mx-auto aspect-video max-w-4xl bg-base-200"></div>
  </div>
</div>

<div class="site-wide py-2xl">
  <div class="cairn-section">
    <div class="mx-auto max-w-measure text-center">
      <h2 class="mb-2xs text-step-3 font-bold text-base-content">
        Innovative tools to <strong class="text-primary">transform</strong> your workflow
      </h2>
      <p class="m-0 text-step-0 text-muted">
        Explore the suite of tools designed to streamline your workflow, enhance productivity, and drive growth.
      </p>
    </div>
    <FeatureGrid features={homeFeatures} columns="sm:grid-cols-2 lg:grid-cols-3" />
  </div>
</div>

<Testimonial
  quote="Foxi is like a rocket boost for our productivity! Its sleek design and out-of-this-world features make managing projects and team communication a breeze."
  name="Sheryl Sandberg"
  role="CEO, Facebook"
/>

<div class="site-wide py-2xl">
  <div class="cairn-section flex flex-col gap-2xl">
    <TextImageRow
      title="Complete Project Visibility"
      highlight="Visibility"
      text="Gain complete visibility into your projects and tasks with our comprehensive dashboard. Easily track progress, deadlines, and team performance at a glance."
      imagePosition="right"
    />
    <TextImageRow
      title="Advanced Automation Tools"
      highlight="Automation"
      text="Automate repetitive tasks and streamline your workflow with our advanced automation tools. Save time and reduce errors."
      imagePosition="left"
    />
    <TextImageRow
      title="Effective Team Collaboration"
      highlight="Effective"
      text="Enhance team communication and collaboration with our seamless tools. Keep everyone on the same page."
      imagePosition="right"
    />
    <TextImageRow
      title="Robust Data Security"
      highlight="Security"
      text="Protect your data with our robust security features. We prioritize your privacy and security."
      imagePosition="left"
    />
  </div>
</div>

<div class="site-wide pb-2xl">
  <CTABanner
    title="Join Over 30,000 Satisfied Users!"
    text="Discover why thousands of professionals trust our platform to streamline their workflow and enhance productivity."
    badge="#1 Product of the Year, Product Hunt"
    buttonLabel="Get started now!"
    buttonHref="/pricing"
  />
</div>
