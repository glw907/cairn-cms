import { describe, it, expect } from 'vitest';
import { createPublicRoutes } from '../../lib/delivery/public-routes.js';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { createSiteResolver } from '../../lib/delivery/site-resolver.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { fields } from '../../lib/content/fields.js';
import { defineFieldset } from '../../lib/content/fieldset.js';

const [posts] = normalizeConcepts({
  posts: {
    dir: 'src/content/posts',
    routing: 'feed',
    permalink: '/:year/:month/:day/:slug',
    fields: defineFieldset({
      title: fields.text({ label: 'Title', required: true }),
      date: fields.date({ label: 'Date' }),
      robots: fields.text({ label: 'Robots' }),
    }),
  },
});
const [pages] = normalizeConcepts({
  pages: {
    dir: 'src/content/pages',
    fields: defineFieldset({
      title: fields.text({ label: 'Title', required: true }),
      robots: fields.text({ label: 'Robots' }),
    }),
  },
});

const index = createContentIndex(
  fromGlob({
    '/src/content/posts/2026-05-14-welcome.md':
      '---\ntitle: Welcome\ndate: 2026-05-14\n---\n\n# Welcome\n\nSome **bold** markdown text.',
    '/src/content/posts/2026-05-20-hidden.md':
      '---\ntitle: Hidden\ndate: 2026-05-20\nrobots: noindex, nofollow\n---\n\nHidden body.',
  }),
  posts,
);
const pageIndex = createContentIndex(
  fromGlob({ '/src/content/pages/about.md': '---\ntitle: About\n---\n\nAbout body.' }),
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
});

describe('createPublicRoutes markdownEntries', () => {
  it('excludes an entry whose robots field carries noindex and includes ordinary entries', () => {
    const paths = routes.markdownEntries().map((e) => e.path).sort();
    expect(paths).toEqual(['2026/05/14/welcome.md', 'about.md']);
  });
});

describe('createPublicRoutes markdownLoad', () => {
  it('serves the stored markdown body unrendered, proven against markdown syntax a renderer would transform', async () => {
    const data = await routes.markdownLoad({ url: new URL('https://x.test/2026/05/14/welcome.md') });
    expect(data.body).toContain('# Welcome');
    expect(data.body).toContain('**bold**');
    expect(data.body).not.toContain('<h1>');
    expect(data.body).not.toContain('<strong>');
    expect(data.body).not.toContain('<p>');
  });

  it('throws a 404 for a path with no matching entry', async () => {
    await expect(
      routes.markdownLoad({ url: new URL('https://x.test/missing.md') }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('throws a 404 for a noindex entry, so the loader and the enumerator agree by construction', async () => {
    // The entry resolves through byPermalink, so only the robots check can refuse it. Assert the
    // page itself still serves, or this would pass on a resolver miss and prove nothing.
    expect(site.byPermalink('/2026/05/20/hidden')).toBeTruthy();
    await expect(
      routes.markdownLoad({ url: new URL('https://x.test/2026/05/20/hidden.md') }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('createPublicRoutes markdown twin disclosure boundary', () => {
  it("markdownLoad's only data source is the injected SiteResolver: a path absent from the resolver 404s and served bodies are exactly the resolver's entry bodies", async () => {
    const welcome = await routes.markdownLoad({ url: new URL('https://x.test/2026/05/14/welcome.md') });
    expect(welcome.body).toBe(site.byPermalink('/2026/05/14/welcome')!.body);

    const about = await routes.markdownLoad({ url: new URL('https://x.test/about.md') });
    expect(about.body).toBe(site.byPermalink('/about')!.body);

    // Nothing on the site's own resolver, so nothing outside it (a pending cairn/* branch, say)
    // can reach the response: the only path to a body is a hit in `site`.
    await expect(
      routes.markdownLoad({ url: new URL('https://x.test/never-published.md') }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
