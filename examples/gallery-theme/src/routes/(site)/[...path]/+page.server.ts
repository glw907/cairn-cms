import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$chassis/content';
import { cairn, siteConfig } from '$theme/cairn.config';
import { pages } from '$chassis/content.js';
import { allPages, childrenOf, isLeafAlbum, isInteriorAlbum, photosOf, toAlbumCard, backLink } from '$theme/albums.js';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.rendering.render,
  origin: ORIGIN,
  siteName: siteConfig.siteName,
  description: SITE_DESCRIPTION,
});

export const entries: EntryGenerator = () => routes.entries();

/**
 * One page's data, branched by which template it renders as. Nothing in the schema marks a page
 * as an album or a prose page (cairn.config.ts's own note); this branches on the same derivation
 * `$theme/albums.js` uses everywhere else: a leaf has photos, an interior node has children, and
 * a plain page (About, Imprint) has neither.
 */
export const load: PageServerLoad = async ({ url }) => {
  const data = await routes.entryLoad({ url });
  const all = allPages();
  const entry = pages.byId(data.entry.id);
  if (!entry) error(404, 'Not found');

  if (isLeafAlbum(entry)) {
    return { ...data, view: 'photo-grid' as const, photos: photosOf(entry), back: backLink(entry, all) };
  }
  if (isInteriorAlbum(entry, all)) {
    const cards = childrenOf(entry, all).map((child) => toAlbumCard(child, all));
    return { ...data, view: 'gallery-listing' as const, cards, back: backLink(entry, all) };
  }
  return { ...data, view: 'prose' as const };
};
