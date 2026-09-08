import type { RequestHandler } from './$types';
import { sitemapResponse, type SitemapUrl } from '@glw907/cairn-cms/delivery';
import { site, siteMeta } from '$chassis/content.js';

export const prerender = true;

export const GET: RequestHandler = () => {
  const urls: SitemapUrl[] = [
    { loc: siteMeta.origin + '/' },
    ...site.all().map((s) => ({
      loc: siteMeta.origin + s.permalink,
      ...(s.date ? { lastmod: s.date } : {}),
    })),
  ];
  return sitemapResponse(urls);
};
