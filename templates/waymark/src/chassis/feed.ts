// The one place that maps this site's posts index into cairn-cms/delivery's FeedItem
// shape. feed.xml and feed.json both call this, so the two feed formats read the same permalinks,
// excerpts, and rendered bodies and can never drift from each other.
import type { FeedItem } from '@glw907/cairn-cms/delivery';
import { site, siteMeta } from './content.js';
import { feedItemsFrom } from './feed-items.js';
import { cairn, publicMediaResolver } from '#theme/cairn.config.js';

/** Build this site's post feed items, shared by the RSS and JSON Feed routes. */
export function buildFeedItems(): Promise<FeedItem[]> {
  return feedItemsFrom({
    site,
    origin: siteMeta.origin,
    render: cairn.rendering.render,
    resolveMedia: publicMediaResolver,
  });
}
