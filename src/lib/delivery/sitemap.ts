// cairn-cms: sitemap builder (public-delivery design). Pure over a URL list; the caller
// derives the list from the content index and the routable concepts.
import { escapeXml } from './xml.js';

/** The sitemaps.org limit on URLs in one sitemap file. */
const MAX_SITEMAP_URLS = 50_000;

/**
 * One sitemap URL. `lastmod` is a YYYY-MM-DD date.
 * @public
 */
export interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

/**
 * Build a sitemap XML document from a list of URLs.
 * @throws If the list holds more than 50,000 URLs, the most a single sitemap file may list.
 */
export function buildSitemap(urls: SitemapUrl[]): string {
  if (urls.length > MAX_SITEMAP_URLS) {
    throw new Error(
      `cairn: the sitemap has ${urls.length} URLs, and a sitemap file may list 50,000. List fewer URLs in this route.`,
    );
  }
  const entries = urls
    .map((url) => {
      const lastmod = url.lastmod ? `\n    <lastmod>${escapeXml(url.lastmod)}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(url.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n');
}
