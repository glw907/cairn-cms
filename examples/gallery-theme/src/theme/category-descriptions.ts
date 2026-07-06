// The upstream's own hugo-theme-gallery lets a category carry a custom title and description via
// a Hugo `_index.md` file (`content/categories/<tag>/_index.md`); its own live demo uses that
// device on exactly one category (Animals) to demonstrate it, with an inline-code span naming the
// file the text itself lives in. This port has no per-category content file (categories are a
// plain taxonomy derived from each album's `categories` field, not their own content entries; see
// `$chassis/content.js`'s own note on `pages.byTag`), so it carries the same device as a small,
// hardcoded record here instead, matching the precedent `SiteHeader.svelte`'s own hardcoded `nav`
// array already sets for this theme's small, fixed content tree. The description is markdown (fed
// through the site's own `render`), so it can carry inline code the same way the upstream's own
// device does.

/** One category's optional custom title and description, in place of the plain capitalized tag. */
export interface CategoryDescription {
  /** Overrides the page's `<h1>`; omitted falls back to the capitalized tag. */
  title?: string;
  /** Markdown, rendered through the site's own `render` so inline code (and any other inline
   *  markdown) matches the rest of the site's typography. */
  description: string;
}

/** Keyed by the lowercase taxonomy value (the same string `pages.byTag` takes). */
export const categoryDescriptions: Partial<Record<string, CategoryDescription>> = {
  animals: {
    description:
      'Categories can also have custom titles and descriptions. The description of the Animals ' +
      'category lives in `src/theme/category-descriptions.ts`.',
  },
};
