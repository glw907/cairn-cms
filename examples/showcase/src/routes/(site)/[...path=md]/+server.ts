import type { RequestHandler, EntryGenerator } from './$types';
import { createPublicRoutes, markdownResponse } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$chassis/content';
import { cairn, publicMediaResolver, mediaEnabled, siteConfig } from '$theme/cairn.config';

// Prerendered, same as every other public route (robots.txt, sitemap.xml, feed.xml). This is not
// incidental: the build runs against committed `main` content, so there is no request path by
// which a `cairn/*` pending-edit branch can reach this route. Switching this to runtime SSR would
// reopen the disclosure hazard `markdownLoad`'s noindex guard and the enumerator's static import
// walk both close by construction today.
export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.rendering.render,
  origin: ORIGIN,
  siteName: siteConfig.siteName,
  description: SITE_DESCRIPTION,
  resolveMedia: publicMediaResolver,
  assetsEnabled: mediaEnabled,
});

export const entries: EntryGenerator = () => routes.markdownEntries();

export const GET: RequestHandler = async ({ url }) => {
  const { body } = await routes.markdownLoad({ url });
  return markdownResponse({ body });
};
