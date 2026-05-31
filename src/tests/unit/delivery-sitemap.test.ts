import { describe, it, expect } from 'vitest';
import { buildSitemap } from '../../lib/delivery/sitemap.js';
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
