import { describe, it, expect } from 'vitest';
import * as root from '../../lib/index.js';

describe('delivery exports', () => {
  it('exposes the delivery builders from the delivery entry', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    for (const name of [
      'createSiteResolver',
      'buildExcerpt',
      'buildSeoMeta',
    ]) {
      expect(typeof (barrel as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('keeps the feed, sitemap, and robots builders behind the response helpers', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    for (const name of ['buildRssFeed', 'buildJsonFeed', 'buildSitemap', 'buildRobots']) {
      expect(name in barrel).toBe(false);
    }
  });

  it('keeps parseSiteConfig on the root entry', () => {
    expect(typeof (root as Record<string, unknown>).parseSiteConfig).toBe('function');
  });

  it('exposes the public route factory from the delivery entry', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    expect(typeof barrel.createPublicRoutes).toBe('function');
  });

  it('exposes the response helpers from the delivery entry', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    for (const name of ['rssResponse', 'jsonFeedResponse', 'sitemapResponse', 'robotsResponse']) {
      expect(typeof (barrel as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('no longer re-exports the delivery surface from the root entry', () => {
    for (const name of [
      'permalink',
      'createContentIndex',
      'createSiteResolver',
      'buildRssFeed',
      'rssResponse',
      'createPublicRoutes',
    ]) {
      expect(name in root).toBe(false);
    }
  });
});
