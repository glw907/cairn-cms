import { describe, it, expect } from 'vitest';
import { buildSeoMeta } from '../../lib/delivery/seo.js';

describe('buildSeoMeta robots and article tags', () => {
  it('emits a robots directive when given one', () => {
    const seo = buildSeoMeta({
      title: 'T', description: 'D', canonicalUrl: 'https://x.test/p', siteName: 'S', robots: 'noindex, nofollow',
    });
    expect(seo.meta).toContainEqual({ name: 'robots', content: 'noindex, nofollow' });
  });

  it('omits robots when not given', () => {
    const seo = buildSeoMeta({ title: 'T', description: 'D', canonicalUrl: 'https://x.test/p', siteName: 'S' });
    expect(seo.meta.some((m) => m.name === 'robots')).toBe(false);
  });

  it('emits article:published_time and author for an article', () => {
    const seo = buildSeoMeta({
      title: 'T', description: 'D', canonicalUrl: 'https://x.test/p', siteName: 'S',
      type: 'article', published: '2026-05-14', author: 'Jane Doe',
    });
    expect(seo.meta).toContainEqual({ property: 'article:published_time', content: '2026-05-14' });
    expect(seo.meta).toContainEqual({ property: 'article:author', content: 'Jane Doe' });
  });
});
