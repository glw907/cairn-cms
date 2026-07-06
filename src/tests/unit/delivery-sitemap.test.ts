import { describe, it, expect } from 'vitest';
import { buildSitemap, unlistedRoutes } from '../../lib/delivery/sitemap.js';
import { buildRobots } from '../../lib/delivery/robots.js';

describe('buildSitemap', () => {
  const xml = buildSitemap([
    { loc: 'https://example.com/posts/a', lastmod: '2026-05-09' },
    { loc: 'https://example.com/about' },
  ]);
  it('emits a urlset with a loc and an optional lastmod', () => {
    expect(xml).toContain('<loc>https://example.com/posts/a</loc>');
    expect(xml).toContain('<lastmod>2026-05-09</lastmod>');
    expect(xml).toContain('<loc>https://example.com/about</loc>');
  });
  it('omits lastmod when absent', () => {
    const about = xml.slice(xml.indexOf('/about'));
    expect(about).not.toContain('<lastmod>');
  });
});

describe('unlistedRoutes', () => {
  it('flags a static route id missing from the listed paths', () => {
    const routeIds = ['/(site)/about', '/(site)/archives', '/(site)/tags'];
    expect(unlistedRoutes(routeIds, ['/', '/about', '/tags'])).toEqual(['/archives']);
  });

  it('strips the route-group segment before comparing', () => {
    expect(unlistedRoutes(['/(site)/about'], ['/about'])).toEqual([]);
  });

  it('never flags a dynamic route id, whose instances are enumerated per-entry', () => {
    const routeIds = ['/(site)/tags/[tag]', '/(site)/[...path]'];
    expect(unlistedRoutes(routeIds, [])).toEqual([]);
  });

  it('normalizes a route group root to the home path', () => {
    expect(unlistedRoutes(['/(site)'], ['/'])).toEqual([]);
    expect(unlistedRoutes(['/(site)'], [])).toEqual(['/']);
  });

  it('returns nothing when every static route id is listed', () => {
    const routeIds = ['/(site)/about', '/(site)/tags'];
    expect(unlistedRoutes(routeIds, ['/about', '/tags'])).toEqual([]);
  });
});

describe('buildRobots', () => {
  it('allows all and points at the sitemap', () => {
    const txt = buildRobots({ sitemapUrl: 'https://example.com/sitemap.xml' });
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Allow: /');
    expect(txt).toContain('Sitemap: https://example.com/sitemap.xml');
  });
  it('lists disallow rules when given', () => {
    const txt = buildRobots({ sitemapUrl: 'https://example.com/sitemap.xml', disallow: ['/admin'] });
    expect(txt).toContain('Disallow: /admin');
  });
});
