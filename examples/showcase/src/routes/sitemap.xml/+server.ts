import type { RequestHandler } from './$types';
import {
  sitemapResponse,
  buildSitemapView,
  buildSiteDescriptors,
} from '@glw907/cairn-cms/delivery';
import { site, siteMeta } from '#chassis/content.js';
import { cairn } from '#theme/cairn.config.js';

export const prerender = true;

// The engine projection: routable concepts only, `updated` (else `date`) as lastmod, and a
// `robots: noindex` entry left out, so the sitemap and the head agree. The home is a bespoke route.
export const GET: RequestHandler = () =>
  sitemapResponse(buildSitemapView(site, buildSiteDescriptors(cairn), siteMeta.origin, ['/']));
