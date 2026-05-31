import { describe, it, expect } from 'vitest';
import { createPublicRoutes } from '../../lib/sveltekit/public-routes.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import type { RawFile } from '../../lib/delivery/content-index.js';

const [posts] = normalizeConcepts({ posts: { dir: 'd', fields: [], validate: () => ({ ok: true, data: {} }) } });
const files: RawFile[] = [
  { path: '/c/a.md', raw: '---\ntitle: A\ndate: 2026-02-01\ntags: [x]\n---\n\nBody A.' },
  { path: '/c/b.md', raw: '---\ntitle: B\ndate: 2026-01-01\ntags: [y]\n---\n\nBody B.' },
];
const routes = createPublicRoutes({
  index: createContentIndex(files, posts),
  render: (md) => `<rendered>${md.trim()}</rendered>`,
  origin: 'https://example.com',
});

describe('createPublicRoutes', () => {
  it('archiveLoad returns newest-first summaries', () => {
    expect(routes.archiveLoad().entries.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('entryLoad renders the body through the injected renderer', async () => {
    const data = await routes.entryLoad({ params: { slug: 'a' } });
    expect(data.entry.id).toBe('a');
    expect(data.html).toBe('<rendered>Body A.</rendered>');
    expect(data.canonicalUrl).toBe('https://example.com/posts/a');
  });

  it('entryLoad throws a 404 for an unknown slug', async () => {
    await expect(routes.entryLoad({ params: { slug: 'missing' } })).rejects.toMatchObject({ status: 404 });
  });

  it('tagLoad filters by tag and tagIndexLoad lists tag counts', () => {
    expect(routes.tagLoad({ params: { tag: 'x' } }).entries.map((e) => e.id)).toEqual(['a']);
    expect(routes.tagIndexLoad().tags).toEqual([{ tag: 'x', count: 1 }, { tag: 'y', count: 1 }]);
  });

  it('entries enumerates slugs for prerender', () => {
    expect(routes.entries().map((e) => e.slug).sort()).toEqual(['a', 'b']);
  });
});
