import type { RequestHandler } from './$types';
import { rssResponse } from '@glw907/cairn-cms/delivery';
import { ORIGIN, SITE_DESCRIPTION } from '$chassis/content';
import { siteConfig } from '$theme/cairn.config';
import { buildFeedItems } from '$chassis/feed';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const items = await buildFeedItems();
  return rssResponse(
    { title: siteConfig.siteName, description: SITE_DESCRIPTION, siteUrl: ORIGIN, feedUrl: ORIGIN + '/feed.xml' },
    items,
  );
};
