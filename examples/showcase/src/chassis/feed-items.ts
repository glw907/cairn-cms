// The pure half of the feed: maps a site's posts into cairn-cms/delivery's FeedItem shape from
// injected pieces, so a unit test drives it without the theme's Svelte imports. feed.ts binds it
// to this site.
import type { CairnAdapter } from '@glw907/cairn-cms';
import {
  createFragmentResolver,
  createLinkResolver,
  type FeedItem,
  type MediaResolve,
  type SiteResolver,
} from '@glw907/cairn-cms/delivery';

/** What the feed reads: the site, its origin, the render call, and the media resolver. */
export interface FeedSource {
  site: SiteResolver;
  origin: string;
  render: CairnAdapter['rendering']['render'];
  resolveMedia: MediaResolve;
}

/**
 * Map a site's posts into feed items. A feed body leaves the site, so each link and each image
 * URL is absolute, and `::include` fragments render from the site's fragments.
 */
export async function feedItemsFrom({
  site,
  origin,
  render,
  resolveMedia,
}: FeedSource): Promise<FeedItem[]> {
  const posts = site.concept('posts');
  if (!posts) return [];
  const toPermalink = createLinkResolver(site);
  const resolve = (ref: Parameters<typeof toPermalink>[0]) => origin + toPermalink(ref);
  const resolveFragment = createFragmentResolver(site);
  const resolveAbsoluteMedia: MediaResolve = (ref) => {
    const url = resolveMedia(ref);
    return url === undefined ? undefined : new URL(url, origin).href;
  };
  return Promise.all(
    posts.all().map(async (p) => ({
      title: p.title,
      url: origin + p.permalink,
      date: p.date,
      summary: p.excerpt,
      contentHtml: await render({
        body: posts.byId(p.id)!.body,
        resolve,
        resolveMedia: resolveAbsoluteMedia,
        resolveFragment,
      }),
      tags: p.tags,
    })),
  );
}
