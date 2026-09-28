import type { RequestHandler } from './$types';
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import type { CairnAdapter } from '@glw907/cairn-cms';
import { siteMeta } from '$chassis/content.js';
import { cairn } from '$theme/cairn.config.js';

export const prerender = true;

// defineAdapter infers `cairn` as the exact literal this site passed it, so a config that leaves
// `aiPosture` unset (docs/extend/choose-an-ai-posture.md) has no such property on its type. The
// cast reads it through `CairnAdapter`, where the field is always declared as optional.
export const GET: RequestHandler = () => {
  return robotsResponse({
    sitemapUrl: siteMeta.origin + '/sitemap.xml',
    disallow: ['/admin'],
    posture: (cairn as CairnAdapter).aiPosture,
  });
};
