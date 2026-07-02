import { describe, it, expect } from 'vitest';
import * as root from '../../lib/index.js';

describe('delivery exports', () => {
  it('exposes the delivery builders from the data subpath', async () => {
    const data = await import('../../lib/delivery/data.js');
    for (const name of [
      'createSiteIndexes',
      'deriveExcerpt',
      'buildRssFeed',
      'buildJsonFeed',
      'buildSitemap',
      'buildRobots',
      'buildSeoMeta',
    ]) {
      expect(typeof (data as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('keeps parseSiteConfig on the root entry', () => {
    expect(typeof (root as Record<string, unknown>).parseSiteConfig).toBe('function');
  });

  it('exposes the public route factory from the delivery entry', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    expect(typeof barrel.createPublicRoutes).toBe('function');
  });

  it('exposes the response helpers from the data subpath', async () => {
    const data = await import('../../lib/delivery/data.js');
    for (const name of ['rssResponse', 'jsonFeedResponse', 'sitemapResponse', 'robotsResponse']) {
      expect(typeof (data as Record<string, unknown>)[name]).toBe('function');
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
