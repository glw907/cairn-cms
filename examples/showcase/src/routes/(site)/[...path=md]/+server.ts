import type { RequestHandler, EntryGenerator } from './$types';
import { createPublicRoutes, buildMarkdownResponse } from '@glw907/cairn-cms/delivery';
import { publicRoutesConfig } from '#chassis/public-routes.js';
import { site } from '#chassis/content.js';

// Prerendered, same as every other public route (robots.txt, sitemap.xml, feed.xml). This is not
// incidental: the build runs against committed `main` content, so there is no request path by
// which a `cairn/*` pending-edit branch can reach this route. Switching this to runtime SSR would
// reopen the disclosure hazard `markdownLoad`'s noindex guard and the enumerator's static import
// walk both close by construction today.
export const prerender = true;

const routes = createPublicRoutes(publicRoutesConfig);

// A published page whose id is `home` is served at "/" and `/home` redirects there, so it gets no
// `/home.md` twin; a twin at `/.md` would not resolve. Leaving it out of the entries means the
// build writes no file for it.
export const entries: EntryGenerator = () => {
  const hasHomePage = site
    .concept('pages')
    ?.all()
    .some((page) => page.id === 'home');
  const twins = routes.markdownEntries();
  return hasHomePage ? twins.filter((twin) => twin.path !== 'home.md') : twins;
};

export const GET: RequestHandler = async ({ url }) => {
  const { body } = await routes.markdownLoad({ url });
  return buildMarkdownResponse({ body });
};
