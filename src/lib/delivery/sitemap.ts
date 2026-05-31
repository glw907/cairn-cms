// cairn-cms: sitemap builder (public-delivery design). Pure over a URL list; the caller
// derives the list from the content index and the routable concepts.

/** One sitemap URL. `lastmod` is a YYYY-MM-DD date. */
export interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Build a sitemap XML document from a list of URLs. */
export function buildSitemap(urls: SitemapUrl[]): string {
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
