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

  // Captured from buildRobots before the AI-posture pass touched the builder. An unset posture
  // must stay byte-identical to this, since every site on the engine today states no posture and
  // none of them may see its output change on upgrade.
  const UNSET_POSTURE_FIXTURE =
    'User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: https://example.com/sitemap.xml\n';

  it('is byte-identical to the pre-posture output when posture is unset', () => {
    const txt = buildRobots({ sitemapUrl: 'https://example.com/sitemap.xml', disallow: ['/admin'] });
    expect(txt).toBe(UNSET_POSTURE_FIXTURE);
  });

  it('decline adds Content-Signal: ai-train=no and a Disallow group per training crawler', () => {
    const txt = buildRobots({
      sitemapUrl: 'https://example.com/sitemap.xml',
      disallow: ['/admin'],
      posture: 'decline',
    });
    expect(txt).toBe(
      [
        'User-agent: *',
        'Content-Signal: ai-train=no',
        'Allow: /',
        'Disallow: /admin',
        '',
        'User-agent: Amazonbot',
        'Disallow: /',
        '',
        'User-agent: Applebot-Extended',
        'Disallow: /',
        '',
        'User-agent: CCBot',
        'Disallow: /',
        '',
        'User-agent: ClaudeBot',
        'Disallow: /',
        '',
        'User-agent: Google-Extended',
        'Disallow: /',
        '',
        'User-agent: GPTBot',
        'Disallow: /',
        '',
        'User-agent: meta-externalagent',
        'Disallow: /',
        '',
        'Sitemap: https://example.com/sitemap.xml',
        '',
      ].join('\n'),
    );
  });

  it('decline still emits the site\'s own disallow paths', () => {
    const txt = buildRobots({
      sitemapUrl: 'https://example.com/sitemap.xml',
      disallow: ['/admin', '/drafts'],
      posture: 'decline',
    });
    expect(txt).toContain('Disallow: /admin');
    expect(txt).toContain('Disallow: /drafts');
  });

  it('invite adds an affirmative Content-Signal and no crawler Disallow groups', () => {
    const txt = buildRobots({
      sitemapUrl: 'https://example.com/sitemap.xml',
      disallow: ['/admin'],
      posture: 'invite',
    });
    expect(txt).toBe(
      [
        'User-agent: *',
        'Content-Signal: search=yes, ai-train=yes',
        'Allow: /',
        'Disallow: /admin',
        '',
        'Sitemap: https://example.com/sitemap.xml',
        '',
      ].join('\n'),
    );
  });
});
