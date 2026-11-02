import type { RequestHandler } from './$types';
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { siteMeta } from '#chassis/content.js';
import { cairn } from '#theme/cairn.config.js';

export const prerender = true;

export const GET: RequestHandler = () => {
  return robotsResponse({
    sitemapUrl: siteMeta.origin + '/sitemap.xml',
    disallow: ['/admin'],
    posture: cairn.aiPosture,
  });
};
