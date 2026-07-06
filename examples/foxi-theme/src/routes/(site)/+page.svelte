<!-- @component The Foxi port's home template, styled after `src/pages/index.astro`
     (oxygenna-themes/foxi-astro-theme, MIT): a hero with a social-proof chip, an asymmetric bento
     feature grid, a dark testimonial band, four alternating highlight rows, and a closing CTA.
     Every section is a plain composed Svelte page built from this theme's own components; cairn's
     content model plays no part here (the capability question this port answers). -->
<script lang="ts">
  import AppMockup from '$theme/components/AppMockup.svelte';
  import Testimonial from '$theme/components/Testimonial.svelte';
  import TextImageRow from '$theme/components/TextImageRow.svelte';
  import CTABanner from '$theme/components/CTABanner.svelte';
  import { homeBentoFeatures } from '$theme/data/features.js';
</script>

<svelte:head>
  <title>Foxi | Your Productivity Toolkit</title>
</svelte:head>

<div class="cairn-band pb-0 pt-2xl">
  <div class="site-wide cairn-hero mx-auto max-w-3xl text-center">
    <div class="mb-s inline-flex w-fit shrink-0 items-center gap-2 self-center rounded-field border border-card-border bg-base-100 py-1 pl-1 pr-3 text-step--1">
      <span class="flex -space-x-2">
        {#each ['A', 'M', 'S'] as initial (initial)}
          <span class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-base-100 bg-primary text-[0.6rem] font-bold text-primary-content">{initial}</span>
        {/each}
      </span>
      <span class="text-muted"><strong class="text-base-content">30K+</strong> satisfied customers</span>
    </div>
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
    <AppMockup variant="chat" class="mx-auto aspect-video max-w-4xl rounded-box shadow-2xl" />
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
    <div class="mt-l grid grid-cols-1 gap-m md:grid-cols-3 md:[grid-template-rows:repeat(2,auto)]">
      {#each homeBentoFeatures as feature (feature.title)}
        <a
          href="/features"
          class="cairn-card flex flex-col justify-between gap-m no-underline hover:shadow-[var(--cairn-shadow)] {feature.tall ? 'md:row-span-2' : ''}"
        >
          <div>
            <h3 class="mb-2xs text-step-0 font-semibold text-base-content">{feature.title}</h3>
            <p class="m-0 text-step--1 text-muted">{feature.description}</p>
          </div>
          <AppMockup variant={feature.image} class="aspect-video rounded-box" />
        </a>
      {/each}
    </div>
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
      image="stats"
    />
    <TextImageRow
      title="Advanced Automation Tools"
      highlight="Automation"
      text="Automate repetitive tasks and streamline your workflow with our advanced automation tools. Save time and reduce errors."
      imagePosition="left"
      image="kanban"
    />
    <TextImageRow
      title="Effective Team Collaboration"
      highlight="Effective"
      text="Enhance team communication and collaboration with our seamless tools. Keep everyone on the same page."
      imagePosition="right"
      image="chat"
    />
    <TextImageRow
      title="Robust Data Security"
      highlight="Security"
      text="Protect your data with our robust security features. We prioritize your privacy and security."
      imagePosition="left"
      image="chart"
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
