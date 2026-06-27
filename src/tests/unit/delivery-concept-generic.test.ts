import { describe, it, expect } from 'vitest';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { buildRssFeed, type FeedItem } from '../../lib/delivery/feeds.js';
import { buildSitemap } from '../../lib/delivery/sitemap.js';

// A synthetic third concept the engine has never heard of, with a custom dated pattern. The concept
// declares the feed routing so it is dated and ordered newest-first.
const [news] = normalizeConcepts({
  news: {
    dir: 'src/content/news',
    routing: 'feed',
    permalink: '/news/:year/:month/:slug',
    fields: fieldset({}),
  },
});

describe('delivery is concept-generic', () => {
  const index = createContentIndex(
    [
      { path: '/c/late.md', raw: '---\ntitle: Late\ndate: 2026-04-02\ntags: [field]\n---\n\nLate body.' },
      { path: '/c/early.md', raw: '---\ntitle: Early\ndate: 2026-03-01\ntags: [field]\n---\n\nEarly body.' },
    ],
    news,
  );

  it('builds an index, orders by date, and resolves the custom pattern for a non-posts concept', () => {
    expect(index.all().map((e) => e.id)).toEqual(['late', 'early']);
    expect(index.all()[0].permalink).toBe('/news/2026/04/late');
  });

  it('feeds and sitemap accept the concepts summaries unchanged', () => {
    const origin = 'https://example.com';
    const items: FeedItem[] = index.all().map((e) => ({
      title: e.title,
      url: origin + e.permalink,
      date: e.date!,
      summary: e.excerpt,
    }));
    const rss = buildRssFeed({ title: 'News', description: '', siteUrl: origin, feedUrl: `${origin}/news/feed.xml` }, items);
    expect(rss).toContain('/news/2026/04/late');
    const sitemap = buildSitemap(index.all().map((e) => ({ loc: origin + e.permalink, lastmod: e.date })));
    expect(sitemap).toContain('/news/2026/04/late');
  });
});
