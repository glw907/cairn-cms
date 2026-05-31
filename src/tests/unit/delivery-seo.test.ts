import { describe, it, expect } from 'vitest';
import { buildSeoMeta } from '../../lib/delivery/seo.js';

describe('buildSeoMeta', () => {
  it('builds website meta with canonical, description, and og tags', () => {
    const meta = buildSeoMeta({
      title: 'Home',
      description: 'A site.',
      canonicalUrl: 'https://example.com/',
      siteName: 'Example',
      feeds: { rss: 'https://example.com/feed.xml' },
    });
    expect(meta.title).toBe('Home');
    expect(meta.links).toContainEqual({ rel: 'canonical', href: 'https://example.com/' });
    expect(meta.links).toContainEqual({
      rel: 'alternate',
      type: 'application/rss+xml',
      href: 'https://example.com/feed.xml',
      title: 'Example',
    });
    expect(meta.meta).toContainEqual({ name: 'description', content: 'A site.' });
    expect(meta.meta).toContainEqual({ property: 'og:title', content: 'Home' });
    expect(meta.jsonLd['@type']).toBe('WebSite');
  });

  it('builds Article JSON-LD with published and modified dates', () => {
    const meta = buildSeoMeta({
      title: 'Post',
      description: 'A post.',
      canonicalUrl: 'https://example.com/posts/p',
      siteName: 'Example',
      type: 'article',
      published: '2026-05-09',
      modified: '2026-05-10',
    });
    expect(meta.jsonLd['@type']).toBe('Article');
    expect(meta.jsonLd).toMatchObject({ datePublished: '2026-05-09', dateModified: '2026-05-10' });
    expect(meta.meta).toContainEqual({ property: 'og:type', content: 'article' });
  });
});
