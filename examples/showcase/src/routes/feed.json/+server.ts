import type { RequestHandler } from './$types';
import { buildJsonFeedResponse } from '@glw907/cairn-cms/delivery';
import { siteMeta } from '#chassis/content.js';
import { buildFeedItems } from '#chassis/feed.js';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const items = await buildFeedItems();
  return buildJsonFeedResponse(
    {
      title: siteMeta.title,
      description: siteMeta.description,
      siteUrl: siteMeta.origin,
      feedUrl: siteMeta.origin + '/feed.json',
    },
    items,
  );
};
