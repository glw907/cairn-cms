import type { RequestHandler } from './$types';
import { jsonFeedResponse } from '@glw907/cairn-cms/delivery';
import { siteMeta } from '$chassis/content.js';
import { buildFeedItems } from '$chassis/feed.js';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const items = await buildFeedItems();
  return jsonFeedResponse(
    {
      title: siteMeta.title,
      description: siteMeta.description,
      siteUrl: siteMeta.origin,
      feedUrl: siteMeta.origin + '/feed.json',
    },
    items,
  );
};
