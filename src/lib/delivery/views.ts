// cairn-cms: engine feed and sitemap projections (taxonomy + tag-delivery design). Pure functions
// over the site resolver and the concept descriptors, so a site reads its feed and sitemap membership
// from the routing flags instead of re-deriving it. feedView projects the `inFeeds` concepts into
// FeedItems (summary-only, with taxonomy tags as categories); sitemapView projects the `routable`
// concepts into SitemapUrls. Both take `origin` because FeedItem.url and SitemapUrl.loc are absolute
// and the engine carries no ambient origin.
import type { ConceptDescriptor } from '../content/types.js';
import type { SiteResolver } from './site-resolver.js';
import type { FeedItem } from './feeds.js';
import type { SitemapUrl } from './sitemap.js';
import { resolveTaxonomyField } from '../content/taxonomy.js';

/**
 * Project the `inFeeds` concepts into feed items, in each concept's own date order. Each item is
 *  summary-only: it carries the entry excerpt as `summary` and the taxonomy-field values as `tags`
 *  (the RSS `<category>` and JSON Feed `tags` source), and omits `contentHtml`, since a full-content
 *  feed needs a per-item render and link-resolver pass this pure view does not carry. A site wanting
 *  full content maps render itself.
 */
export function feedView(site: SiteResolver, descriptors: ConceptDescriptor[], origin: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const descriptor of descriptors) {
    if (!descriptor.routing.inFeeds) continue;
    const index = site.concept(descriptor.id);
    if (!index) continue;
    const hasTaxonomy = resolveTaxonomyField(descriptor.fields) !== null;
    for (const summary of index.all()) {
      const item: FeedItem = {
        title: summary.title,
        url: origin + summary.permalink,
        summary: summary.excerpt,
      };
      if (summary.date) item.date = summary.date;
      if (summary.updated) item.updated = summary.updated;
      if (hasTaxonomy && summary.tags.length) item.tags = summary.tags;
      items.push(item);
    }
  }
  return items;
}

/**
 * Project the `routable` concepts into sitemap URLs, in each concept's own order. `loc` is the
 *  origin-anchored permalink; `lastmod` is the entry's `updated` date when present, else its `date`.
 *  An embedded (non-routable) concept never appears.
 */
export function sitemapView(site: SiteResolver, descriptors: ConceptDescriptor[], origin: string): SitemapUrl[] {
  const urls: SitemapUrl[] = [];
  for (const descriptor of descriptors) {
    if (!descriptor.routing.routable) continue;
    const index = site.concept(descriptor.id);
    if (!index) continue;
    for (const summary of index.all()) {
      const url: SitemapUrl = { loc: origin + summary.permalink };
      const lastmod = summary.updated ?? summary.date;
      if (lastmod) url.lastmod = lastmod;
      urls.push(url);
    }
  }
  return urls;
}
