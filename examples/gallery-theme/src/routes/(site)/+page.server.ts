import type { PageServerLoad } from './$types';
import { pages } from '$chassis/content.js';
import { allPages, featuredAlbum, homeGridAlbums } from '$theme/albums.js';

export const prerender = true;

/** The home page reads the whole album tree once: the one `featured` album for the hero card,
 *  the top-level albums for the grid, and every distinct category for the pill nav (the same
 *  taxonomy mechanism the Foxi port's post tags already proved). */
export const load: PageServerLoad = () => {
  const all = allPages();
  return {
    featured: featuredAlbum(all),
    grid: homeGridAlbums(all),
    tags: pages.allTags(),
  };
};
