import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';
import { pages } from '$chassis/content.js';
import { allPages, toAlbumCard, capitalizeTag } from '$theme/albums.js';

export const prerender = true;

export const entries: EntryGenerator = () => pages.allTags().map(({ tag }) => ({ tag }));

/** A category cross-index: every leaf album carrying this tag, the same card grid the home page
 *  and a gallery-listing page's children use. Reads `pages.byTag`, the plain taxonomy mechanism
 *  (see $theme/albums.js's own note): this is the one piece of the tree that maps cleanly onto
 *  an existing engine mechanism, with zero theme-side tree-walking needed. */
export const load: PageServerLoad = ({ params }) => {
  const summaries = pages.byTag(params.tag);
  if (summaries.length === 0) error(404, 'Not found');
  const all = allPages();
  const cards = summaries
    .map((summary) => all.find((entry) => entry.id === summary.id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .map((entry) => toAlbumCard(entry, all));
  return { tag: capitalizeTag(params.tag), cards };
};
