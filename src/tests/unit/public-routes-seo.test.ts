import { describe, it, expect } from 'vitest';
import { createPublicRoutes } from '../../lib/sveltekit/public-routes.js';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { createSiteIndex } from '../../lib/delivery/site-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { defineFields } from '../../lib/content/schema.js';

const [posts] = normalizeConcepts(
  {
    posts: {
      dir: 'src/content/posts',
      schema: defineFields([
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
        { type: 'textarea', name: 'description', label: 'Description' },
        { type: 'text', name: 'image', label: 'Social image' },
        { type: 'text', name: 'robots', label: 'Robots' },
        { type: 'text', name: 'author', label: 'Author' },
      ]),
    },
  },
  { posts: { permalink: '/:year/:month/:day/:slug' } },
);
const [pages] = normalizeConcepts({
  pages: {
    dir: 'src/content/pages',
    schema: defineFields([
      { type: 'text', name: 'title', label: 'Title', required: true },
      { type: 'text', name: 'robots', label: 'Robots' },
    ]),
  },
});

const index = createContentIndex(
  fromGlob({
    '/src/content/posts/2026-05-14-welcome.md':
      '---\ntitle: Welcome\ndate: 2026-05-14\ndescription: Hello world\nimage: /og/welcome.png\nauthor: Ada\n---\nBody.',
    '/src/content/posts/2026-05-20-plain.md': '---\ntitle: Plain\ndate: 2026-05-20\n---\nBody.',
  }),
  posts,
);
const pageIndex = createContentIndex(
  fromGlob({ '/src/content/pages/secret.md': '---\ntitle: Secret\nrobots: noindex\n---\nHidden.' }),
  pages,
);
const site = createSiteIndex([
  { descriptor: posts, index },
  { descriptor: pages, index: pageIndex },
]);

const routes = createPublicRoutes({
  site,
  render: (md) => `<p>${md}</p>`,
  origin: 'https://x.test',
  siteName: 'X Site',
  description: 'Site default description.',
  defaultImage: '/og/default.png',
  feeds: { rss: 'https://x.test/feed.xml', json: 'https://x.test/feed.json' },
});

describe('entryLoad SEO', () => {
  it('builds a seo head with canonical, og:title, and the article type for a dated entry', async () => {
    const data = await routes.entryLoad({ url: new URL('https://x.test/2026/05/14/welcome') });
    expect(data.seo.title).toBe('Welcome');
    expect(data.seo.links).toContainEqual({ rel: 'canonical', href: data.canonicalUrl });
    expect(data.seo.meta).toContainEqual({ property: 'og:title', content: 'Welcome' });
    expect(data.seo.meta).toContainEqual({ property: 'og:type', content: 'article' });
    expect(data.seo.meta).toContainEqual({ property: 'article:published_time', content: '2026-05-14' });
  });

  it('reads a per-entry image (resolved absolute) and author into the head', async () => {
    const data = await routes.entryLoad({ url: new URL('https://x.test/2026/05/14/welcome') });
    expect(data.seo.meta).toContainEqual({ property: 'og:image', content: 'https://x.test/og/welcome.png' });
    expect(data.seo.meta).toContainEqual({ property: 'article:author', content: 'Ada' });
    expect(data.seo.meta).toContainEqual({ name: 'description', content: 'Hello world' });
  });

  it('falls back to the site default image when an entry declares none', async () => {
    const data = await routes.entryLoad({ url: new URL('https://x.test/2026/05/20/plain') });
    expect(data.seo.meta).toContainEqual({ property: 'og:image', content: 'https://x.test/og/default.png' });
  });

  it('reads a per-entry robots directive into the head', async () => {
    const data = await routes.entryLoad({ url: new URL('https://x.test/secret') });
    expect(data.seo.meta).toContainEqual({ name: 'robots', content: 'noindex' });
  });
});
