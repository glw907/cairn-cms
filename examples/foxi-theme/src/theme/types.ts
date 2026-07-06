// This theme's shared composed-page data shapes: the list-item types every static data module
// (src/theme/data/*.ts) and its matching component share. Kept in one plain module (rather than
// exported from each .svelte component) so a .ts data file never needs to import a type from a
// .svelte file.

/** One feature list item: an icon name (`$theme/icons.js`), a title, and a short description
 *  (`FeatureGrid.svelte`). */
export interface Feature {
  icon: string;
  title: string;
  description: string;
}

/** One pricing tier: its two price points, its feature list, and its footer link
 *  (`PricingTable.svelte`). */
export interface PricingPlan {
  title: string;
  subtitle: string;
  priceAnnual: string;
  priceMonthly: string;
  features: string[];
  featured?: boolean;
  /** The footer link label, e.g. "See all features" (every upstream tier carries one). */
  footerLabel: string;
}

/** One FAQ question/answer pair (`FaqAccordion.svelte`). */
export interface FaqItem {
  question: string;
  reply: string;
}

/** One "reason to contact us" card (`ContactCards.svelte`). */
export interface ContactReason {
  icon: string;
  title: string;
  text: string;
}

/** One changelog entry (`ChangelogTimeline.svelte`). */
export interface ChangelogEntry {
  date: string;
  title: string;
  text: string;
  items?: string[];
  /** An `AppMockup` illustration variant, shown under the title for entries the upstream data
   *  itself pairs with a screenshot (not every entry carries one). */
  image?: 'calendar' | 'chat' | 'chart' | 'stats' | 'kanban';
}

/** One breadcrumb entry: a label, and a link unless it is the current page (`Breadcrumbs.svelte`). */
export interface Crumb {
  label: string;
  href?: string;
}
