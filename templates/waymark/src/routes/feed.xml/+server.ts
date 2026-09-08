import type { RequestHandler } from './$types';
import { rssResponse } from '@glw907/cairn-cms/delivery';
import { siteMeta } from '$chassis/content';
import { buildFeedItems } from '$chassis/feed';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const items = await buildFeedItems();
  return rssResponse(
    {
      title: siteMeta.title,
      description: siteMeta.description,
      siteUrl: siteMeta.origin,
      feedUrl: siteMeta.origin + '/feed.xml',
    },
    items,
  );
};
