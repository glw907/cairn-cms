import type { RequestHandler } from './$types';
import { buildRssResponse } from '@glw907/cairn-cms/delivery';
import { siteMeta } from '#chassis/content.js';
import { buildFeedItems } from '#chassis/feed.js';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const items = await buildFeedItems();
  return buildRssResponse(
    {
      title: siteMeta.title,
      description: siteMeta.description,
      siteUrl: siteMeta.origin,
      feedUrl: siteMeta.origin + '/feed.xml',
    },
    items,
  );
};
