import { describe, it, expect } from 'vitest';
import * as root from '../../lib/index.js';
import * as sveltekit from '../../lib/sveltekit/index.js';

describe('delivery exports', () => {
  it('re-exports the delivery builders and the permalink resolver from the root entry', () => {
    for (const name of [
      'permalink',
      'createContentIndex',
      'fromGlob',
      'createSiteIndex',
      'deriveExcerpt',
      'wordCount',
      'buildRssFeed',
      'buildJsonFeed',
      'buildSitemap',
      'buildRobots',
      'buildSeoMeta',
      'paginate',
    ]) {
      expect(typeof (root as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('re-exports the URL-policy helpers from the root entry', () => {
    expect(typeof (root as Record<string, unknown>).urlPolicyFrom).toBe('function');
    expect(typeof (root as Record<string, unknown>).parseSiteConfig).toBe('function');
  });

  it('re-exports the public route factory from the sveltekit entry', () => {
    expect(typeof sveltekit.createPublicRoutes).toBe('function');
  });

  it('re-exports the route loaders and response helpers from the root entry', () => {
    for (const name of ['createPublicRoutes', 'rssResponse', 'jsonFeedResponse', 'sitemapResponse', 'robotsResponse']) {
      expect(typeof (root as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
