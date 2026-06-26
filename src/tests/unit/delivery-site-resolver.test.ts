import { describe, it, expect } from 'vitest';
import { createSiteResolver } from '../../lib/delivery/site-resolver.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { fieldset } from '../../lib/content/fieldset.js';

const [posts] = normalizeConcepts(
  { posts: { dir: 'p', schema: fieldset({}) } },
  { posts: { permalink: '/:year/:month/:day/:slug', datePrefix: 'day' } },
);
const [pages] = normalizeConcepts({ pages: { dir: 'g', schema: fieldset({}) } });

function site() {
  return createSiteResolver([
    { descriptor: posts, index: createContentIndex([{ path: '/p/2026-05-31-snowball.md', raw: '---\ntitle: S\ndate: 2026-05-31\n---\n\nPost body.' }], posts) },
    { descriptor: pages, index: createContentIndex([{ path: '/g/about.md', raw: '---\ntitle: About\n---\n\nPage body.' }], pages) },
  ]);
}

describe('createSiteResolver', () => {
  it('resolves a dated Posts URL and a flat Pages URL through one byPermalink', () => {
    const s = site();
    expect(s.byPermalink('/2026/05/31/snowball')?.body.trim()).toBe('Post body.');
    expect(s.byPermalink('/about')?.body.trim()).toBe('Page body.');
  });

  it('normalizes a trailing slash', () => {
    expect(site().byPermalink('/about/')?.id).toBe('about');
  });

  it('returns undefined for an unmatched path', () => {
    expect(site().byPermalink('/nope')).toBeUndefined();
  });

  it('enumerates every entry path across concepts for prerender, without a leading slash', () => {
    expect(site().entries().map((e) => e.path).sort()).toEqual(['2026/05/31/snowball', 'about']);
  });

  it('exposes a concept index for per-concept loaders', () => {
    expect(site().concept('posts')?.all()[0].id).toBe('2026-05-31-snowball');
  });

  it('returns adjacency within the entry own concept', () => {
    const s = site();
    const about = s.byPermalink('/about')!;
    expect(s.adjacent(about)).toEqual({});
  });

  it('throws on a permalink collision across concepts, naming both ids', () => {
    const [p2] = normalizeConcepts(
      { pages: { dir: 'g', schema: fieldset({}) } },
      { pages: { permalink: '/dup' } },
    );
    const [q2] = normalizeConcepts(
      { posts: { dir: 'p', schema: fieldset({}) } },
      { posts: { permalink: '/dup' } },
    );
    expect(() =>
      createSiteResolver([
        { descriptor: p2, index: createContentIndex([{ path: '/g/a.md', raw: '---\ntitle: A\n---\n' }], p2) },
        { descriptor: q2, index: createContentIndex([{ path: '/p/b.md', raw: '---\ntitle: B\ndate: 2026-01-01\n---\n' }], q2) },
      ]),
    ).toThrow(/dup/);
  });
});
