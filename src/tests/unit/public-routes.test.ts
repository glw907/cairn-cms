import { describe, it, expect } from 'vitest';
import { createPublicRoutes } from '../../lib/sveltekit/public-routes.js';
import { createSiteIndex } from '../../lib/delivery/site-index.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';

const [posts] = normalizeConcepts(
  { posts: { dir: 'p', fields: [], validate: () => ({ ok: true as const, data: {} }) } },
  { posts: { permalink: '/:year/:month/:day/:slug', datePrefix: 'day' } },
);
const [pages] = normalizeConcepts({ pages: { dir: 'g', fields: [], validate: () => ({ ok: true as const, data: {} }) } });

const site = createSiteIndex([
  { descriptor: posts, index: createContentIndex([
    { path: '/p/2026-02-01-a.md', raw: '---\ntitle: A\ndate: 2026-02-01\ntags: [x]\n---\n\nBody A.' },
    { path: '/p/2026-01-01-b.md', raw: '---\ntitle: B\ndate: 2026-01-01\ntags: [y]\n---\n\nBody B.' },
  ], posts) },
  { descriptor: pages, index: createContentIndex([{ path: '/g/about.md', raw: '---\ntitle: About\n---\n\nAbout body.' }], pages) },
]);

const routes = createPublicRoutes({ site, render: (md) => `<r>${md.trim()}</r>`, origin: 'https://example.com', siteName: 'Test', description: 'Test description.' });

describe('createPublicRoutes', () => {
  it('entryLoad resolves a dated Posts URL by pathname', async () => {
    const data = await routes.entryLoad({ url: new URL('https://example.com/2026/02/01/a') });
    expect(data.entry.id).toBe('2026-02-01-a');
    expect(data.html).toBe('<r>Body A.</r>');
    expect(data.canonicalUrl).toBe('https://example.com/2026/02/01/a');
  });

  it('entryLoad resolves a flat Pages URL through the same route', async () => {
    const data = await routes.entryLoad({ url: new URL('https://example.com/about') });
    expect(data.entry.id).toBe('about');
  });

  it('entryLoad throws a 404 for an unknown path', async () => {
    await expect(routes.entryLoad({ url: new URL('https://example.com/missing') })).rejects.toMatchObject({ status: 404 });
  });

  it('entries enumerates every path across concepts', () => {
    expect(routes.entries().map((e) => e.path).sort()).toEqual(['2026/01/01/b', '2026/02/01/a', 'about']);
  });

  it('archiveLoad and tagLoad stay per-concept', () => {
    expect(routes.archiveLoad('posts').entries.map((e) => e.id)).toEqual(['2026-02-01-a', '2026-01-01-b']);
    expect(routes.tagLoad('posts', { params: { tag: 'x' } }).entries.map((e) => e.id)).toEqual(['2026-02-01-a']);
    expect(routes.tagIndexLoad('posts').tags).toEqual([{ tag: 'x', count: 1 }, { tag: 'y', count: 1 }]);
  });
});
