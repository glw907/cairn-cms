<!-- @component
A three-tier pricing table with a monthly/annual billing toggle, styled after
`src/components/ui/pricing-tables/PricingTable.astro` (oxygenna-themes/foxi-astro-theme, MIT):
the middle "featured" tier reads DaisyUI's `primary` role as a filled card and sits visually
raised over its two `basic` siblings. Expressed with the chassis's `.cairn-card` recipe for the
two plain tiers; the featured tier overrides `--cairn-card-bg`/`--cairn-card-border` to the
primary role, one of `.cairn-card`'s documented per-instance override seams, rather than a new
chassis "featured card" primitive.
-->
<script lang="ts">
  import type { PricingPlan } from '$theme/types.js';

  interface Props {
    plans: PricingPlan[];
  }
  let { plans }: Props = $props();

  let billing = $state<'monthly' | 'annual'>('annual');
</script>

<div class="flex flex-col items-center">
  <div class="mb-l inline-flex items-center gap-s rounded-field border border-card-border bg-base-100 p-1">
    <button
      type="button"
      class="rounded-field px-4 py-2 text-step--1 font-medium {billing === 'monthly' ? 'bg-primary text-primary-content' : 'text-muted'}"
      onclick={() => (billing = 'monthly')}
      aria-pressed={billing === 'monthly'}
    >
      Bill monthly
    </button>
    <button
      type="button"
      class="rounded-field px-4 py-2 text-step--1 font-medium {billing === 'annual' ? 'bg-primary text-primary-content' : 'text-muted'}"
      onclick={() => (billing = 'annual')}
      aria-pressed={billing === 'annual'}
    >
      Bill annually
    </button>
  </div>

  <div class="grid w-full grid-cols-1 items-start gap-m lg:grid-cols-3">
    {#each plans as plan (plan.title)}
      <div
        class="cairn-card flex flex-col gap-s {plan.featured ? 'lg:-my-m lg:py-l' : ''}"
        style={plan.featured
          ? '--cairn-card-bg: var(--color-primary); --cairn-card-border: none; color: var(--color-primary-content);'
          : ''}
      >
        <div>
          <h3 class="mb-0 text-step-1 font-bold">{plan.title}</h3>
          <p class="m-0 text-step--1 {plan.featured ? 'opacity-80' : 'text-muted'}">{plan.subtitle}</p>
        </div>
        <p class="m-0 text-step-4 font-bold tracking-tight">
          ${billing === 'annual' ? plan.priceAnnual : plan.priceMonthly}
          <span class="text-step--1 font-normal {plan.featured ? 'opacity-80' : 'text-muted'}">/month</span>
        </p>
        <a
          href="/pricing"
          class="inline-flex h-11 items-center justify-center rounded-field text-step--1 font-bold no-underline {plan.featured
            ? 'bg-base-100 text-primary'
            : 'bg-primary text-primary-content'}"
        >
          Try for free
        </a>
        <ul class="m-0 flex flex-col gap-2xs p-0 text-step--1">
          {#each plan.features as feature (feature)}
            <li class="flex items-start gap-2">
              <svg class="mt-1 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
                <path d="M5 12l4 4 10-10" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {feature}
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</div>
