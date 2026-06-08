import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn } from '$lib/cairn.config';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.render,
  origin: ORIGIN,
  siteName: cairn.siteName,
  description: SITE_DESCRIPTION,
  defaultImage: ORIGIN + '/og/default.png',
  feeds: { rss: ORIGIN + '/feed.xml', json: ORIGIN + '/feed.json' },
});

export const entries: EntryGenerator = () => routes.entries();

export const load: PageServerLoad = ({ url }) => routes.entryLoad({ url });
