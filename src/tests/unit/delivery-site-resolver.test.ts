import { describe, it, expect } from 'vitest';
import { createSiteResolver, resolveReferences } from '../../lib/delivery/site-resolver.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';

const [posts] = normalizeConcepts({
  posts: { dir: 'p', routing: 'feed', permalink: '/:year/:month/:day/:slug', datePrefix: 'day', fields: fieldset({}) },
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

// A Posts concept with a `topics` taxonomy and tagged entries, plus a Pages concept, exercises the
// three resolveRoute kinds and the slug round-trip.
const [tagPosts] = normalizeConcepts({
  posts: {
    dir: 'p',
    routing: 'feed',
    permalink: '/posts/:slug',
    datePrefix: 'day',
    fields: fieldset({
      title: fields.text({ label: 'Title' }),
      date: fields.date({ label: 'Date' }),
      topics: fields.multiselect({ label: 'Topics', taxonomy: true }),
    }),
  },
});
const [tagPages] = normalizeConcepts({ pages: { dir: 'g', fields: fieldset({}) } });

function taxonomySite() {
  return createSiteResolver([
    {
      descriptor: tagPosts,
      index: createContentIndex(
        [
          {
            path: '/p/2026-05-31-hello.md',
            raw: '---\ntitle: Hello\ndate: 2026-05-31\ntopics: [Svelte, "Web Design"]\n---\n\nHello body.',
          },
          {
            path: '/p/2026-05-30-second.md',
            raw: '---\ntitle: Second\ndate: 2026-05-30\ntopics: [Svelte]\n---\n\nSecond body.',
          },
          {
            path: '/p/2026-05-29-draft.md',
            raw: '---\ntitle: Draft\ndate: 2026-05-29\ndraft: true\ntopics: [Draftonly]\n---\n\nDraft body.',
          },
        ],
        tagPosts,
      ),
    },
    {
      descriptor: tagPages,
      index: createContentIndex([{ path: '/g/about.md', raw: '---\ntitle: About\n---\n\nPage body.' }], tagPages),
    },
  ]);
}

describe('SiteResolver.resolveRoute', () => {
  it('resolves an exact entry permalink to the entry kind', () => {
    const r = taxonomySite().resolveRoute('/posts/hello');
    expect(r?.kind).toBe('entry');
    if (r?.kind === 'entry') expect(r.entry.body.trim()).toBe('Hello body.');
  });

  it('resolves a Pages entry permalink to the entry kind', () => {
    const r = taxonomySite().resolveRoute('/about');
    expect(r?.kind).toBe('entry');
    if (r?.kind === 'entry') expect(r.entry.id).toBe('about');
  });

  it('resolves the taxonomy base to the tag index with all tags and counts', () => {
    const r = taxonomySite().resolveRoute('/topics');
    expect(r?.kind).toBe('tagIndex');
    if (r?.kind === 'tagIndex') {
      expect(r.concept).toBe('posts');
      // Svelte on two non-draft posts, Web Design on one; the draft-only tag is excluded.
      expect(r.tags).toEqual([
        { tag: 'Svelte', count: 2 },
        { tag: 'Web Design', count: 1 },
      ]);
    }
  });

  it('resolves a tag-archive slug back to its canonical value and lists its entries', () => {
    const r = taxonomySite().resolveRoute('/topics/svelte');
    expect(r?.kind).toBe('tagArchive');
    if (r?.kind === 'tagArchive') {
      expect(r.concept).toBe('posts');
      expect(r.tag).toBe('Svelte');
      expect(r.entries.map((e) => e.id).sort()).toEqual(['2026-05-30-second', '2026-05-31-hello']);
    }
  });

  it('resolves a multi-word tag slug back to its canonical value', () => {
    const r = taxonomySite().resolveRoute('/topics/web-design');
    expect(r?.kind).toBe('tagArchive');
    if (r?.kind === 'tagArchive') {
      expect(r.tag).toBe('Web Design');
      expect(r.entries.map((e) => e.id)).toEqual(['2026-05-31-hello']);
    }
  });

  it('returns undefined for an unknown tag slug under the base', () => {
    expect(taxonomySite().resolveRoute('/topics/nope')).toBeUndefined();
  });

  it('returns undefined for a tag whose only entries are drafts', () => {
    // The draft-only tag never reaches allTags, so its slug is unknown; either way it does not render.
    expect(taxonomySite().resolveRoute('/topics/draftonly')).toBeUndefined();
  });

  it('returns undefined for a path more than one segment under the base', () => {
    expect(taxonomySite().resolveRoute('/topics/a/b')).toBeUndefined();
  });

  it('returns undefined for a path that matches no entry and no taxonomy base', () => {
    expect(taxonomySite().resolveRoute('/nope')).toBeUndefined();
  });

  it('enumerates the taxonomy index base and each concrete archive path for prerender, leading slash stripped', () => {
    const paths = taxonomySite().entries().map((e) => e.path);
    expect(paths).toContain('topics');
    expect(paths).toContain('topics/svelte');
    expect(paths).toContain('topics/web-design');
    // The draft-only tag never enumerates.
    expect(paths).not.toContain('topics/draftonly');
    // Every appended tag path has no leading slash, matching the existing entry paths.
    expect(paths.every((p) => !p.startsWith('/'))).toBe(true);
  });
});
