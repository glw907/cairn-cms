import type { RequestHandler } from './$types';
import { sitemapResponse, type SitemapUrl } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN } from '$lib/content';

export const prerender = true;

export const GET: RequestHandler = () => {
  const urls: SitemapUrl[] = [
    { loc: ORIGIN + '/' },
    ...site.all().map((s) => (s.date ? { loc: ORIGIN + s.permalink, lastmod: s.date } : { loc: ORIGIN + s.permalink })),
  ];
  return sitemapResponse(urls);
};
