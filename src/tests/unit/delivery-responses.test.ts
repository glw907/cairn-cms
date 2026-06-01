import { describe, it, expect } from 'vitest';
import { rssResponse, jsonFeedResponse, sitemapResponse, robotsResponse } from '../../lib/delivery/responses.js';

const channel = { title: 'T', description: 'D', siteUrl: 'https://x.test', feedUrl: 'https://x.test/feed.xml' };
const items = [{ title: 'Post', url: 'https://x.test/p', date: '2026-05-14', summary: 'S' }];

describe('delivery response helpers', () => {
  it('rssResponse is RSS with the right content type', async () => {
    const res = rssResponse(channel, items);
    expect(res.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8');
    expect(await res.text()).toContain('<rss');
  });

  it('jsonFeedResponse is JSON Feed with the right content type', async () => {
    const res = jsonFeedResponse(channel, items);
    expect(res.headers.get('Content-Type')).toBe('application/feed+json; charset=utf-8');
    expect(JSON.parse(await res.text()).items).toHaveLength(1);
  });

  it('sitemapResponse is XML with the urlset', async () => {
    const res = sitemapResponse([{ loc: 'https://x.test/' }]);
    expect(res.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    expect(await res.text()).toContain('<urlset');
  });

  it('robotsResponse is text with the sitemap and disallow', async () => {
    const res = robotsResponse({ sitemapUrl: 'https://x.test/sitemap.xml', disallow: ['/admin'] });
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    const body = await res.text();
    expect(body).toContain('Sitemap:');
    expect(body).toContain('Disallow: /admin');
  });
});
