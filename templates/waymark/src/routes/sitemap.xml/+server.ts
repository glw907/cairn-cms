import type { RequestHandler } from './$types';
import {
  buildSitemapResponse,
  buildSitemapView,
  buildSiteDescriptors,
} from '@glw907/cairn-cms/delivery';
import { posts, site, siteMeta } from '#chassis/content.js';
import { cairn } from '#site/cairn.config.js';

export const prerender = true;

// The engine projection: routable concepts only, `updated` (else `date`) as lastmod, and a
// `robots: noindex` entry left out, so the sitemap and the head agree. The home is a bespoke route.
// A published page whose id is `home` is served at "/", so its own `/home` is left out, and the
// archive's first page, which then exists whenever there are posts, is listed.
export const GET: RequestHandler = () => {
  const hasHomePage = site
    .concept('pages')
    ?.all()
    .some((page) => page.id === 'home');
  if (!hasHomePage) {
    return buildSitemapResponse(
      buildSitemapView(site, buildSiteDescriptors(cairn), siteMeta.origin, ['/']),
    );
  }
  const extra = posts.all().length > 0 ? ['/', '/archive/1'] : ['/'];
  const urls = buildSitemapView(site, buildSiteDescriptors(cairn), siteMeta.origin, extra);
  return buildSitemapResponse(urls.filter((url) => url.loc !== siteMeta.origin + '/home'));
};
