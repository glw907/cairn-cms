import { describe, it, expect } from 'vitest';
import { createSiteResolver, resolveReferences } from '../../lib/delivery/site-resolver.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';

const [posts] = normalizeConcepts({
  posts: {
    dir: 'p',
    routing: 'feed',
    permalink: '/:year/:month/:day/:slug',
    datePrefix: 'day',
    fields: fieldset({ date: fields.date({ label: 'Date' }) }),
  },
});
const [pages] = normalizeConcepts({ pages: { dir: 'g', fields: fieldset({}) } });

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

  it('resolves reference and array(reference) edges to their target identities across concepts', () => {
    // A posts entry whose frontmatter holds `author: jane-doe` (a PAGES entry) and
    // `related: [a-post]` (another POST). A per-concept index cannot reach the pages entry from
    // the posts index; the cross-concept resolver can, which is the whole point of this layer.
    const [postsRef, pagesRef] = normalizeConcepts({
      posts: {
        dir: 'p',
        routing: 'feed',
        permalink: '/:slug',
        datePrefix: 'day',
        fields: fieldset({
          author: fields.reference({ concept: 'pages', label: 'Author' }),
          related: fields.array(fields.reference({ concept: 'posts', label: 'Related post' }), { label: 'Related' }),
        }),
      },
      pages: { dir: 'g', fields: fieldset({}) },
    });
    const s = createSiteResolver([
      {
        descriptor: postsRef,
        index: createContentIndex(
          [
            { path: '/p/the-edit.md', raw: '---\ntitle: The Edit\ndate: 2026-05-31\nauthor: jane-doe\nrelated:\n  - a-post\n---\n\nBody.' },
            { path: '/p/a-post.md', raw: '---\ntitle: A Post\ndate: 2026-05-30\n---\n\nA post body.' },
          ],
          postsRef,
        ),
      },
      {
        descriptor: pagesRef,
        index: createContentIndex([{ path: '/g/jane-doe.md', raw: '---\ntitle: Jane Doe\n---\n\nAuthor page.' }], pagesRef),
      },
    ]);

    const resolved = resolveReferences(s, postsRef, { author: 'jane-doe', related: ['a-post'] });

    expect(resolved.author).toEqual({
      id: 'jane-doe',
      concept: 'pages',
      title: 'Jane Doe',
      permalink: '/jane-doe',
      summary: 'Author page.',
    });
    expect(resolved.related).toEqual([
      { id: 'a-post', concept: 'posts', title: 'A Post', permalink: '/a-post', summary: 'A post body.' },
    ]);
  });

  it('drops an unresolved reference id, leaving the array in target order', () => {
    const [postsRef, pagesRef] = normalizeConcepts({
      posts: {
        dir: 'p',
        routing: 'feed',
        permalink: '/:slug',
        datePrefix: 'day',
        fields: fieldset({
          author: fields.reference({ concept: 'pages', label: 'Author' }),
          related: fields.array(fields.reference({ concept: 'posts', label: 'Related post' }), { label: 'Related' }),
        }),
      },
      pages: { dir: 'g', fields: fieldset({}) },
    });
    const s = createSiteResolver([
      {
        descriptor: postsRef,
        index: createContentIndex(
          [{ path: '/p/a-post.md', raw: '---\ntitle: A Post\ndate: 2026-05-30\n---\n\nA post body.' }],
          postsRef,
        ),
      },
      {
        descriptor: pagesRef,
        index: createContentIndex([], pagesRef),
      },
    ]);

    // `jane-doe` is mid-flight (no pages entry yet); the build gate fails a true dangling, so an
    // unresolved id here is dropped rather than thrown.
    const resolved = resolveReferences(s, postsRef, { author: 'jane-doe', related: ['a-post', 'ghost-post'] });

    expect(resolved.author).toBeUndefined();
    expect(resolved.related).toEqual([
      { id: 'a-post', concept: 'posts', title: 'A Post', permalink: '/a-post', summary: 'A post body.' },
    ]);
  });

  // The routable gate (Fragments Task 1): a non-routable ('embedded') concept's entries stay
  // readable in-process through site.concept(), but never surface through the public union.
  it('excludes a non-routable concept from byPermalink and entries(), while concept() still reaches its body', () => {
    const [fragments] = normalizeConcepts({
      fragments: {
        dir: 'f',
        routing: 'embedded',
        fields: fieldset({ title: fields.text({ label: 'Title' }) }),
      },
    });
    const s = createSiteResolver([
      { descriptor: pages, index: createContentIndex([{ path: '/g/about.md', raw: '---\ntitle: About\n---\n\nPage body.' }], pages) },
      {
        descriptor: fragments,
        index: createContentIndex([{ path: '/f/address.md', raw: '---\ntitle: Address\n---\n\nFragment body.' }], fragments),
      },
    ]);

    expect(s.byPermalink('/fragments/address')).toBeUndefined();
    expect(s.entries().map((e) => e.path).sort()).toEqual(['about']);
    expect(s.concept('fragments')?.byId('address')?.body.trim()).toBe('Fragment body.');
  });

  it('throws on a permalink collision across concepts, naming both ids', () => {
    const [p2] = normalizeConcepts({ pages: { dir: 'g', permalink: '/dup', fields: fieldset({}) } });
    const [q2] = normalizeConcepts({
      posts: { dir: 'p', routing: 'feed', permalink: '/dup', fields: fieldset({}) },
    });
    expect(() =>
      createSiteResolver([
        { descriptor: p2, index: createContentIndex([{ path: '/g/a.md', raw: '---\ntitle: A\n---\n' }], p2) },
        { descriptor: q2, index: createContentIndex([{ path: '/p/b.md', raw: '---\ntitle: B\ndate: 2026-01-01\n---\n' }], q2) },
      ]),
    ).toThrow(/dup/);
  });
});
