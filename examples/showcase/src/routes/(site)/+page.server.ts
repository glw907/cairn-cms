import type { PageServerLoad } from './$types';
import { readVocabulary } from '@glw907/cairn-cms';
import { posts } from '$chassis/content.js';
import { siteConfig } from '$theme/site-config.js';
import { paginateArchive } from '$chassis/archive.js';

export const prerender = true;

// The home is always archive page one: the newest entry gets its own featured lead, and the
// paginated, year-grouped index starts from the entry after it. Deeper pages live at /archive/[page]
// (paginateArchive is the one shared shape both routes build from), keeping this URL exactly "/".
//
// posts.all() is already newest-first (a dated concept's engine ordering contract, documented in
// docs/reference/delivery.md), so this route relies on that order rather than re-sorting it.
export const load: PageServerLoad = () => {
  const entries = posts.all();
  const featured = entries[0];
  const archive = paginateArchive(entries.slice(1), 1);
  // The home reads its tag-filter options from the site's own committed vocabulary (the {value,label}
  // list), so the control labels the slugs editors curate rather than the raw frontmatter tokens.
  return { featured, archive, vocabulary: readVocabulary(siteConfig) };
};
