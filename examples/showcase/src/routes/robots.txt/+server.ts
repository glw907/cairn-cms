import type { RequestHandler } from './$types';
import { buildRobotsResponse } from '@glw907/cairn-cms/delivery';
import { siteMeta } from '#chassis/content.js';
import { cairn } from '#site/cairn.config.js';

export const prerender = true;

export const GET: RequestHandler = () => {
  return buildRobotsResponse({
    sitemapUrl: siteMeta.origin + '/sitemap.xml',
    disallow: ['/admin'],
    posture: cairn.aiPosture,
  });
};
