<!-- @component The /faq page, styled after `src/pages/faq.astro` (oxygenna-themes/foxi-astro-theme,
     MIT): a page header, a sidebar-and-accordion band for pricing questions, a text-and-image
     band on pricing value, a second sidebar-and-accordion band for integration questions, closed
     by a CTA. Expressed with the chassis's `.cairn-sidebar-layout` recipe for the lead-in/accordion
     pairing. -->
<script lang="ts">
  import FaqAccordion from '$theme/components/FaqAccordion.svelte';
  import TextImageRow from '$theme/components/TextImageRow.svelte';
  import CTABanner from '$theme/components/CTABanner.svelte';
  import { pricingFaq, integrationsFaq } from '$theme/data/faq.js';

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

<div class="cairn-section py-2xl">
  <div class="site-wide">
    <!-- .cairn-sidebar-layout assumes main-then-aside (wide-first, narrow-second); this band
         wants the reverse (narrow lead-in, then the wide accordion), which the primitive's
         fixed column order does not express, so this uses a plain Tailwind grid instead. -->
    <div class="grid grid-cols-1 gap-l md:grid-cols-3">
      <div>
        <h2 class="mb-2xs text-step-2 font-bold text-base-content">{bands[0].heading}</h2>
        <p class="m-0 text-step--1 text-muted">{bands[0].text}</p>
      </div>
      <div class="md:col-span-2">
        <FaqAccordion items={bands[0].items} />
      </div>
    </div>
  </div>
</div>

<div class="bg-base-200 py-2xl">
  <div class="site-wide">
    <TextImageRow
      title="Why Foxi's Pricing Plans Offer Great Value"
      highlight="Great Value"
      text="At Foxi, we believe in providing exceptional value at every price point. Our pricing plans are designed to cater to a variety of needs, from individuals and small teams to large enterprises. Each plan includes access to our powerful features, seamless integrations, and top-notch customer support."
      imagePosition="right"
      image="kanban"
    />
  </div>
</div>

<div class="cairn-section py-2xl">
  <div class="site-wide">
    <div class="grid grid-cols-1 gap-l md:grid-cols-3">
      <div>
        <h2 class="mb-2xs text-step-2 font-bold text-base-content">{bands[1].heading}</h2>
        <p class="m-0 text-step--1 text-muted">{bands[1].text}</p>
      </div>
      <div class="md:col-span-2">
        <FaqAccordion items={bands[1].items} />
      </div>
    </div>
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
