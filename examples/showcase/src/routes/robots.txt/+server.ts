import type { RequestHandler } from './$types';
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import type { CairnAdapter } from '@glw907/cairn-cms';
import { siteMeta } from '$chassis/content.js';
import { cairn } from '$theme/cairn.config.js';

export const prerender = true;

// defineAdapter's `<const A extends CairnAdapter>` return type is the exact literal this site
// passed it, so an omitted `aiPosture` key (this site's own choice, per
// docs/extend/choose-an-ai-posture.md) drops the property from `cairn`'s inferred type entirely
// rather than typing it `undefined`. The cast reads it as the `CairnAdapter` interface always
// declares it, an optional field every adapter carries whether or not one site's literal sets it.
export const GET: RequestHandler = () => {
  return robotsResponse({
    sitemapUrl: siteMeta.origin + '/sitemap.xml',
    disallow: ['/admin'],
    posture: (cairn as CairnAdapter).aiPosture,
  });
};
