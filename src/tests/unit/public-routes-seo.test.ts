import { describe, it, expect } from 'vitest';
import { createPublicRoutes } from '../../lib/delivery/public-routes.js';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { createSiteResolver } from '../../lib/delivery/site-resolver.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { fields } from '../../lib/content/fields.js';
import { fieldset } from '../../lib/content/fieldset.js';

const [posts] = normalizeConcepts({
  posts: {
    dir: 'src/content/posts',
    routing: 'feed',
    permalink: '/:year/:month/:day/:slug',
    fields: fieldset({
      title: fields.text({ label: 'Title', required: true }),
      date: fields.date({ label: 'Date' }),
      description: fields.textarea({ label: 'Description' }),
      image: fields.text({ label: 'Social image' }),
      robots: fields.text({ label: 'Robots' }),
      author: fields.text({ label: 'Author' }),
    }),
  },
});
const [pages] = normalizeConcepts({
  pages: {
    dir: 'src/content/pages',
    fields: fieldset({
      title: fields.text({ label: 'Title', required: true }),
      robots: fields.text({ label: 'Robots' }),
    }),
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
const site = createSiteResolver([
  { descriptor: posts, index },
  { descriptor: pages, index: pageIndex },
]);

const routes = createPublicRoutes({
  site,
  render: ({ body }) => Promise.resolve(`<p>${body}</p>`),
  origin: 'https://x.test',
  siteName: 'X Site',
  description: 'Site default description.',
  defaultImage: '/og/default.png',
  feeds: { rss: 'https://x.test/feed.xml', json: 'https://x.test/feed.json' },
});

/** Resolve a path through the entry loader these tests assert on. */
async function entry(path: string) {
  return routes.entryLoad({ url: new URL(path) });
}

describe('entryLoad entry SEO', () => {
  it('builds a seo head with canonical, og:title, and the article type for a dated entry', async () => {
    const data = await entry('https://x.test/2026/05/14/welcome');
    expect(data.seo.title).toBe('Welcome');
    expect(data.seo.links).toContainEqual({ rel: 'canonical', href: data.canonicalUrl });
    expect(data.seo.meta).toContainEqual({ property: 'og:title', content: 'Welcome' });
    expect(data.seo.meta).toContainEqual({ property: 'og:type', content: 'article' });
    expect(data.seo.meta).toContainEqual({ property: 'article:published_time', content: '2026-05-14' });
  });

  it('reads a per-entry image (resolved absolute) and author into the head', async () => {
    const data = await entry('https://x.test/2026/05/14/welcome');
    expect(data.seo.meta).toContainEqual({ property: 'og:image', content: 'https://x.test/og/welcome.png' });
    expect(data.seo.meta).toContainEqual({ property: 'article:author', content: 'Ada' });
    expect(data.seo.meta).toContainEqual({ name: 'description', content: 'Hello world' });
  });

  it('falls back to the site default image when an entry declares none', async () => {
    const data = await entry('https://x.test/2026/05/20/plain');
    expect(data.seo.meta).toContainEqual({ property: 'og:image', content: 'https://x.test/og/default.png' });
  });

  it('reads a per-entry robots directive into the head', async () => {
    const data = await entry('https://x.test/secret');
    expect(data.seo.meta).toContainEqual({ name: 'robots', content: 'noindex' });
  });
});

describe('entryLoad entry feed autodiscovery', () => {
  it('attaches feed alternate links to a dated entry', async () => {
    const data = await entry('https://x.test/2026/05/14/welcome');
    expect(data.seo.links).toContainEqual({
      rel: 'alternate',
      type: 'application/rss+xml',
      href: 'https://x.test/feed.xml',
      title: 'X Site',
    });
    expect(data.seo.links).toContainEqual({
      rel: 'alternate',
      type: 'application/feed+json',
      href: 'https://x.test/feed.json',
      title: 'X Site',
    });
  });

  it('attaches no feed alternate links to an undated page', async () => {
    const data = await entry('https://x.test/secret');
    expect(data.seo.links.some((link) => link.rel === 'alternate')).toBe(false);
  });
});
