import type { PageServerLoad } from './$types';
import { extractVocabulary } from '@glw907/cairn-cms';
import { posts } from '$chassis/content';
import { siteConfig } from '$theme/cairn.config';
import { sortNewestFirst, paginateArchive } from '$chassis/archive';

export const prerender = true;

// The home is always archive page one: the newest entry gets its own featured lead, and the
// paginated, year-grouped index starts from the entry after it. Deeper pages live at /archive/[page]
// (paginateArchive is the one shared shape both routes build from), keeping this URL exactly "/".
export const load: PageServerLoad = () => {
  const entries = sortNewestFirst(posts.all());
  const featured = entries[0];
  const archive = paginateArchive(entries.slice(1), 1);
  // The home reads its tag-filter options from the site's own committed vocabulary (the {value,label}
  // list), so the control labels the slugs editors curate rather than the raw frontmatter tokens.
  return { featured, archive, vocabulary: extractVocabulary(siteConfig) };
};
