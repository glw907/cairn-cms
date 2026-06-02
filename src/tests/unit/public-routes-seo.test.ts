import { describe, it, expect } from 'vitest';
import { createPublicRoutes } from '../../lib/sveltekit/public-routes.js';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { createSiteIndex } from '../../lib/delivery/site-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { defineFields } from '../../lib/content/schema.js';

const descriptor = normalizeConcepts({
  posts: { dir: 'src/content/posts', schema: defineFields([]) },
})[0];

const index = createContentIndex(
  fromGlob({ '/src/content/posts/2026-05-14-welcome.md': '---\ntitle: Welcome\ndate: 2026-05-14\ndescription: Hello world\n---\nBody.' }),
  descriptor,
);
const site = createSiteIndex([{ descriptor, index }]);

const routes = createPublicRoutes({
  site,
  render: (md) => `<p>${md}</p>`,
  origin: 'https://x.test',
  siteName: 'X Site',
  description: 'Site default description.',
  feeds: { rss: 'https://x.test/feed.xml', json: 'https://x.test/feed.json' },
});

describe('entryLoad SEO', () => {
  it('builds a seo head with canonical, og:title, and the article type for a dated entry', async () => {
    const url = new URL(site.entries()[0].path, 'https://x.test/');
    const data = await routes.entryLoad({ url });
    expect(data.seo.title).toBe('Welcome');
    expect(data.seo.links).toContainEqual({ rel: 'canonical', href: data.canonicalUrl });
    expect(data.seo.meta).toContainEqual({ property: 'og:title', content: 'Welcome' });
    expect(data.seo.meta).toContainEqual({ property: 'og:type', content: 'article' });
    expect(data.seo.meta).toContainEqual({ property: 'article:published_time', content: '2026-05-14' });
  });
});
