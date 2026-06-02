import type { RequestHandler } from './$types';
import { rssResponse, type FeedItem } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn } from '$lib/cairn.config';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const posts = site.concept('posts');
  const items: FeedItem[] = await Promise.all(
    (posts?.all() ?? []).map(async (p) => ({
      title: p.title,
      url: ORIGIN + p.permalink,
      date: p.date,
      summary: p.excerpt,
      contentHtml: await cairn.render(posts!.byId(p.id)!.body),
      tags: p.tags,
    })),
  );
  return rssResponse(
    { title: cairn.siteName, description: SITE_DESCRIPTION, siteUrl: ORIGIN, feedUrl: ORIGIN + '/feed.xml' },
    items,
  );
};
