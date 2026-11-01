// cairn-cms: the engine sitemap projection (taxonomy + tag-delivery design). A pure function over
// the site resolver and the concept descriptors, so a site reads its sitemap membership from the
// routing flags instead of re-deriving it. buildSitemapView projects the `routable` concepts into
// SitemapUrls. It takes `origin` because SitemapUrl.loc is absolute and the engine carries no
// ambient origin.
import type { ConceptDescriptor } from '../content/types.js';
import type { SiteResolver } from './site-resolver.js';
import type { SitemapUrl } from './sitemap.js';
import { readSeoFields } from './seo-fields.js';

/**
 * Project the `routable` concepts into sitemap URLs, in each concept's order. `loc` is the
 *  origin-anchored permalink; `lastmod` is the entry's `updated` date when present, else its `date`.
 *  An embedded (non-routable) concept never appears, and neither does an entry whose frontmatter
 *  `robots` field carries `noindex` (read through `readSeoFields`, so only where the concept's
 *  fieldset declares `robots`).
 *
 *  `extraRoutes` carries the site's bespoke, non-concept pages (an about page, a tag index) as
 *  root-relative paths; each becomes an origin-anchored `SitemapUrl` with no `lastmod`, ahead of
 *  every concept URL.
 * @public
 */
export function buildSitemapView(
  site: SiteResolver,
  descriptors: ConceptDescriptor[],
  origin: string,
  extraRoutes: string[] = [],
): SitemapUrl[] {
  const urls: SitemapUrl[] = extraRoutes.map((path) => ({ loc: origin + path }));
  for (const descriptor of descriptors) {
    if (!descriptor.routing.routable) continue;
    const index = site.concept(descriptor.id);
    if (!index) continue;
    for (const summary of index.all()) {
      const entry = index.byId(summary.id);
      if (entry && readSeoFields(entry.frontmatter).robots?.includes('noindex')) continue;
      const url: SitemapUrl = { loc: origin + summary.permalink };
      const lastmod = summary.updated ?? summary.date;
      if (lastmod) url.lastmod = lastmod;
      urls.push(url);
    }
  }
  return urls;
}
