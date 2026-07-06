<!-- @component The /faq page, styled after `src/pages/faq.astro` (oxygenna-themes/foxi-astro-theme,
     MIT): a page header, then three sidebar-and-accordion bands (pricing, integrations,
     features), each pairing a short lead-in with its own FAQ list, closed by a CTA. Expressed
     with the chassis's `.cairn-sidebar-layout` recipe for the lead-in/accordion pairing. -->
<script lang="ts">
  import FaqAccordion from '$theme/components/FaqAccordion.svelte';
  import CTABanner from '$theme/components/CTABanner.svelte';
  import { pricingFaq, integrationsFaq, featuresFaq } from '$theme/data/faq.js';

  const bands = [
    {
      heading: 'Understanding Our Pricing Plans',
      text: "Get all the details on Foxi's pricing plans. Learn about the costs, discounts, and subscription options to find the best plan that fits your needs and budget.",
      items: pricingFaq,
    },
    {
      heading: 'Integrations Made Easy',
      text: 'Discover how Foxi seamlessly integrates with your favorite tools and platforms.',
      items: integrationsFaq,
    },
    {
      heading: 'Explore Our Features',
      text: 'Everything Foxi can do for your team, answered.',
      items: featuresFaq,
    },
  ];
</script>

<svelte:head>
  <title>FAQ | Foxi</title>
</svelte:head>

<div class="cairn-band">
  <div class="site-wide cairn-hero mx-auto max-w-measure text-center">
    <h1 class="cairn-hero-title">
      Get Answers to Your <strong class="text-primary">Foxi</strong> Questions.
    </h1>
    <p class="cairn-hero-lead mx-auto">Find answers to common questions about Foxi.</p>
  </div>
</div>

<div class="site-wide py-2xl">
  <div class="cairn-section flex flex-col gap-2xl">
    {#each bands as band (band.heading)}
      <!-- .cairn-sidebar-layout assumes main-then-aside (wide-first, narrow-second); this band
           wants the reverse (narrow lead-in, then the wide accordion), which the primitive's
           fixed column order does not express, so this uses a plain Tailwind grid instead. -->
      <div class="grid grid-cols-1 gap-l md:grid-cols-3">
        <div>
          <h2 class="mb-2xs text-step-2 font-bold text-base-content">{band.heading}</h2>
          <p class="m-0 text-step--1 text-muted">{band.text}</p>
        </div>
        <div class="md:col-span-2">
          <FaqAccordion items={band.items} />
        </div>
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
