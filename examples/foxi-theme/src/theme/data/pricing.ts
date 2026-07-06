// This port's pricing data, values ported from `src/data/json-files/pricingTablesdata.json`
// (oxygenna-themes/foxi-astro-theme, MIT). Static theme data, not cairn content: cairn manages
// markdown documents, not page-builder data like a pricing matrix.
import type { PricingPlan } from '$theme/types.js';

export const pricingPlans: PricingPlan[] = [
  {
    title: 'Basic',
    subtitle: 'Ideal for individual developers',
    priceAnnual: '19',
    priceMonthly: '25',
    features: [
      'Join forces with fellow architects',
      'Present your projects with flair and captivate your audience',
      'Immerse yourself in the dynamic realm of architecture',
    ],
  },
  {
    title: 'Team',
    subtitle: 'Ideal for small teams',
    priceAnnual: '29',
    priceMonthly: '35',
    features: [
      'Join forces with fellow architects',
      'Present your projects with flair and captivate your audience',
      'Immerse yourself in the dynamic realm of architecture',
      'Unlock endless inspiration',
    ],
    featured: true,
  },
  {
    title: 'Enterprise',
    subtitle: 'Ideal for companies',
    priceAnnual: '49',
    priceMonthly: '65',
    features: [
      'Join forces with fellow architects',
      'Present your projects with flair and captivate your audience',
      'Immerse yourself in the dynamic realm of architecture',
    ],
  },
];
