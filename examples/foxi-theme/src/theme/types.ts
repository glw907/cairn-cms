// This theme's shared composed-page data shapes: the list-item types every static data module
// (src/theme/data/*.ts) and its matching component share. Kept in one plain module (rather than
// exported from each .svelte component) so a .ts data file never needs to import a type from a
// .svelte file.

/** One feature card: a title and a short description (`FeatureGrid.svelte`). */
export interface Feature {
  title: string;
  description: string;
}

/** One pricing tier: its two price points and its feature list (`PricingTable.svelte`). */
export interface PricingPlan {
  title: string;
  subtitle: string;
  priceAnnual: string;
  priceMonthly: string;
  features: string[];
  featured?: boolean;
}

/** One FAQ question/answer pair (`FaqAccordion.svelte`). */
export interface FaqItem {
  question: string;
  reply: string;
}

/** One "reason to contact us" card (`ContactCards.svelte`). */
export interface ContactReason {
  title: string;
  text: string;
}

/** One changelog entry (`ChangelogTimeline.svelte`). */
export interface ChangelogEntry {
  date: string;
  title: string;
  text: string;
  items?: string[];
}

/** One breadcrumb entry: a label, and a link unless it is the current page (`Breadcrumbs.svelte`). */
export interface Crumb {
  label: string;
  href?: string;
}
