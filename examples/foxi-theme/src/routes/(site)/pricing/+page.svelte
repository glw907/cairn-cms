<!-- @component The /pricing page, styled after `src/pages/pricing.astro`
     (oxygenna-themes/foxi-astro-theme, MIT): a page header, the billing-toggle pricing table, a
     trust logo row, an "included on all plans" feature grid, a testimonial, a pricing FAQ, and a
     closing CTA. This is the port's own capability-test centerpiece: a pricing table, a logo
     cloud, and an accordion, composed with zero chassis edits. -->
<script lang="ts">
  import PricingTable from '$theme/components/PricingTable.svelte';
  import LogoCloud from '$theme/components/LogoCloud.svelte';
  import FeatureGrid from '$theme/components/FeatureGrid.svelte';
  import Testimonial from '$theme/components/Testimonial.svelte';
  import FaqAccordion from '$theme/components/FaqAccordion.svelte';
  import CTABanner from '$theme/components/CTABanner.svelte';
  import { pricingPlans } from '$theme/data/pricing.js';
  import { pricingFaq } from '$theme/data/faq.js';
  import { homeFeatures } from '$theme/data/features.js';
</script>

<svelte:head>
  <title>Pricing | Foxi</title>
</svelte:head>

<div class="cairn-band">
  <div class="site-wide cairn-hero mx-auto max-w-measure text-center">
    <h1 class="cairn-hero-title">
      Choose the plan that works for <strong class="text-primary">your</strong> needs
    </h1>
    <p class="cairn-hero-lead mx-auto">All plans come with a 30-day money-back guarantee.</p>
  </div>
</div>

<div class="site-wide py-2xl">
  <div class="cairn-section flex flex-col gap-2xl">
    <PricingTable plans={pricingPlans} />

    <LogoCloud count="50,000+" logos={['Airtable', 'Asana', 'Basecamp', 'Evernote', 'Notion', 'Slack']} />

    <div>
      <div class="mx-auto mb-l max-w-measure text-center">
        <h2 class="mb-2xs text-step-3 font-bold text-base-content">
          Whats included on <strong class="text-primary">all</strong> foxi plans
        </h2>
        <p class="m-0 text-step-0 text-muted">
          Explore the suite of tools designed to streamline your workflow, enhance productivity, and drive growth.
        </p>
      </div>
      <FeatureGrid features={homeFeatures} columns="sm:grid-cols-2 lg:grid-cols-4" />
    </div>
  </div>
</div>

<Testimonial
  quote="Foxi isn't just an app, it's like having a mischievous yet brilliant sidekick for your business. It streamlines tasks and also cracks jokes to keep spirits high."
  name="Max Widgetson"
  role="CEO, Widgetfly Ltd"
/>

<div class="site-wide py-2xl">
  <div class="cairn-section">
    <div class="mx-auto mb-l max-w-measure text-center">
      <h2 class="mb-2xs text-step-3 font-bold text-base-content">
        Demystifying <strong class="text-primary">pricing</strong>, common queries resolved
      </h2>
      <p class="m-0 text-step-0 text-muted">Curious about our pricing plans? We're here to help.</p>
    </div>
    <div class="mx-auto max-w-measure">
      <FaqAccordion items={pricingFaq} />
    </div>
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
