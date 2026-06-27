import { describe, it, expect } from 'vitest';
import { manifestEntryFromFile, serializeManifest, parseManifest, emptyManifest, verifyManifest, verifyReferences, upsertEntry, removeEntry, manifestLinkResolver, inboundLinks, inboundReferences } from '../../lib/content/manifest.js';
import type { ManifestEntry } from '../../lib/content/manifest.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { extractReferenceEdges } from '../../lib/content/references.js';
import { parseMarkdown } from '../../lib/content/frontmatter.js';

const posts: ConceptDescriptor = {
  id: 'posts',
  label: 'Posts',
  singular: 'Posts',
  dir: 'src/content/posts',
  routing: { routable: true, dated: true, inFeeds: true },
  permalink: '/:year/:month/:slug',
  datePrefix: 'day',
  fields: [],
  schema: fieldset({}),
  summaryFields: [],
  validate: () => ({ ok: true, data: {} }),
};

const file = {
  path: 'src/content/posts/2026-01-04-waxing-guide.md',
  raw: '---\ntitle: Waxing Guide\ndate: 2026-01-04\n---\n\nSee [about](cairn:pages/about).\n',
};

describe('manifestEntryFromFile', () => {
  it('derives the row including outbound links', () => {
    expect(manifestEntryFromFile(posts, file)).toEqual({
      id: '2026-01-04-waxing-guide',
      concept: 'posts',
      title: 'Waxing Guide',
      date: '2026-01-04',
      permalink: '/2026/01/waxing-guide',
      summary: 'See about.',
      draft: false,
      links: [{ concept: 'pages', id: 'about' }],
    });
  });
  it('falls back to the id for a missing title and flags a draft', () => {
    const row = manifestEntryFromFile(posts, {
      path: 'src/content/posts/2026-02-02-untitled.md',
      raw: '---\ndate: 2026-02-02\ndraft: true\n---\n\nBody.\n',
    });
    expect(row.title).toBe('2026-02-02-untitled');
    expect(row.draft).toBe(true);
    expect(row.links).toEqual([]);
  });
  it('records mediaRefs for an entry with a hero and body images, and omits the key when image-free', () => {
    const heroPosts: ConceptDescriptor = {
      ...posts,
      fields: [{ name: 'image', label: 'Hero', type: 'image' }],
    };
    const withMedia = manifestEntryFromFile(heroPosts, {
      path: 'src/content/posts/2026-01-15-hello.md',
      raw:
        '---\ntitle: Hello\ndate: 2026-01-15\nimage:\n  src: media:hero.00112233445566aa\n  alt: A cairn\n---\n\n' +
        '![inline](media:inline.aabbccddeeff0011)\n',
    });
    expect(withMedia.mediaRefs?.sort()).toEqual(['00112233445566aa', 'aabbccddeeff0011']);

    const noMedia = manifestEntryFromFile(posts, file);
    expect(noMedia.mediaRefs).toBeUndefined();
    // The serialized row of an image-free entry carries no mediaRefs key.
    expect(serializeManifest({ version: 1, entries: [noMedia] })).not.toContain('mediaRefs');
  });
  it('records reference edges from a reference-bearing entry, omitting the key when none', () => {
    const refPosts: ConceptDescriptor = {
      ...posts,
      fields: [
        { name: 'author', label: 'Author', type: 'reference', concept: 'pages' },
        { name: 'related', label: 'Related', type: 'array', item: { label: '', type: 'reference', concept: 'posts' } },
      ],
    };
    const withRefs = manifestEntryFromFile(refPosts, {
      path: 'src/content/posts/2026-01-16-linked.md',
      raw: '---\ntitle: Linked\ndate: 2026-01-16\nauthor: jane-doe\nrelated:\n  - a-post\n  - b-post\n---\n\nBody.\n',
    });
    expect(withRefs.references).toEqual([
      { field: 'author', concept: 'pages', id: 'jane-doe' },
      { field: 'related', concept: 'posts', id: 'a-post' },
      { field: 'related', concept: 'posts', id: 'b-post' },
    ]);

    const noRefs = manifestEntryFromFile(posts, file);
    expect(noRefs.references).toBeUndefined();
    expect(serializeManifest({ version: 1, entries: [noRefs] })).not.toContain('references');
  });
  it('derives a summary from the description, else the body', () => {
    // A non-dated descriptor, so the slug permalink resolves from the file stem alone.
    const pages: ConceptDescriptor = {
      id: 'pages',
      label: 'Pages',
      singular: 'Pages',
      dir: 'src/content/pages',
      routing: { routable: true, dated: false, inFeeds: false },
      permalink: '/:slug',
      datePrefix: 'day',
      fields: [],
      schema: fieldset({}),
      summaryFields: [],
      validate: () => ({ ok: true, data: {} }),
    };
    const withDesc = manifestEntryFromFile(pages, {
      path: 'src/content/pages/a.md',
      raw: '---\ntitle: A\ndescription: A short blurb.\n---\nBody text here.',
    });
    expect(withDesc.summary).toBe('A short blurb.');

    const noDesc = manifestEntryFromFile(pages, {
      path: 'src/content/pages/b.md',
      raw: '---\ntitle: B\n---\nThe body becomes the excerpt when there is no description.',
    });
    expect(noDesc.summary).toBe('The body becomes the excerpt when there is no description.');
  });
});

describe('serializeManifest / parseManifest', () => {
  it('serializes canonically: entries and links sorted, pretty, trailing newline', () => {
    const manifest = {
      version: 1 as const,
      entries: [
        { id: 'b', concept: 'posts', title: 'B', date: '2026-01-02', permalink: '/b', draft: false, links: [{ concept: 'pages', id: 'z' }, { concept: 'pages', id: 'a' }] },
        { id: 'a', concept: 'pages', title: 'A', permalink: '/a', draft: false, links: [] },
      ],
    };
    const out = serializeManifest(manifest);
    expect(out.endsWith('\n')).toBe(true);
    const reparsed = parseManifest(out);
    // pages/a sorts before posts/b; the date-less entry omits the date key.
    expect(reparsed.entries.map((e) => `${e.concept}/${e.id}`)).toEqual(['pages/a', 'posts/b']);
    expect(reparsed.entries[0].date).toBeUndefined();
    // the second entry's links are sorted by concept then id.
    expect(reparsed.entries[1].links).toEqual([{ concept: 'pages', id: 'a' }, { concept: 'pages', id: 'z' }]);
    // serialize is idempotent on a parsed manifest.
    expect(serializeManifest(reparsed)).toBe(out);
  });
  it('emptyManifest round-trips', () => {
    expect(parseManifest(serializeManifest(emptyManifest()))).toEqual({ version: 1, entries: [] });
  });
  it('emits a sorted references block only when non-empty', () => {
    const out = serializeManifest({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], references: [
        { field: 'related', concept: 'posts', id: 'z-post' },
        { field: 'author', concept: 'pages', id: 'jane' },
        { field: 'related', concept: 'posts', id: 'a-post' },
      ] },
    ] });
    expect(out).toContain('references');
    const parsed = parseManifest(out);
    // Sorted by field, then concept, then id.
    expect(parsed.entries[0].references).toEqual([
      { field: 'author', concept: 'pages', id: 'jane' },
      { field: 'related', concept: 'posts', id: 'a-post' },
      { field: 'related', concept: 'posts', id: 'z-post' },
    ]);

    const empty = serializeManifest({ version: 1, entries: [
      { id: 'b', concept: 'posts', title: 'B', permalink: '/b', draft: false, links: [], references: [] },
    ] });
    expect(empty).not.toContain('references');
  });
  it('omits an empty summary (no churn) and round-trips a present one', () => {
    const present = parseManifest(serializeManifest({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], summary: 'Blurb.' },
    ] }));
    expect(present.entries[0].summary).toBe('Blurb.');

    const emptyRaw = serializeManifest({ version: 1, entries: [
      { id: 'b', concept: 'posts', title: 'B', permalink: '/b', draft: false, links: [], summary: '' },
    ] });
    expect(emptyRaw).not.toContain('summary');
  });
});

describe('parseManifest hardening', () => {
  it('rejects a wrong version', () => {
    expect(() => parseManifest(JSON.stringify({ version: 2, entries: [] }))).toThrow(/version/i);
  });
  it('rejects an entry missing a required field', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts' }] });
    expect(() => parseManifest(raw)).toThrow(/entry/i);
  });
  it('rejects an entry whose links are not an array', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: 'no' }] });
    expect(() => parseManifest(raw)).toThrow(/entry/i);
  });
  it('rejects a links element missing id', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [{ concept: 'pages' }] }] });
    expect(() => parseManifest(raw)).toThrow(/entry|link/i);
  });
  it('rejects a links element that is a string', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: ['pages/home'] }] });
    expect(() => parseManifest(raw)).toThrow(/entry|link/i);
  });
  it('rejects a links element that is null', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [null] }] });
    expect(() => parseManifest(raw)).toThrow(/entry|link/i);
  });
  it('rejects a present non-string date', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts', title: 'A', date: 123, permalink: '/a', draft: false, links: [] }] });
    expect(() => parseManifest(raw)).toThrow(/entry|date/i);
  });
  it('accepts a well-formed manifest including a valid link and an optional date', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts', title: 'A', date: '2026-01-04', permalink: '/a', draft: false, links: [{ concept: 'pages', id: 'home' }] }] });
    const parsed = parseManifest(raw);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].date).toBe('2026-01-04');
    expect(parsed.entries[0].links).toEqual([{ concept: 'pages', id: 'home' }]);
  });
  it('still accepts an older entry with no summary key', () => {
    const old = parseManifest(JSON.stringify({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [] },
    ] }));
    expect(old.entries[0].summary).toBeUndefined();
  });
  it('leniently accepts an entry with no mediaRefs key (a manifest predating the field)', () => {
    const old = parseManifest(JSON.stringify({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [] },
    ] }));
    expect(old.entries[0].mediaRefs).toBeUndefined();
  });
  it('round-trips a present mediaRefs and serializes it sorted', () => {
    const out = serializeManifest({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], mediaRefs: ['bbbb111122223333', 'aaaa111122223333'] },
    ] });
    expect(out).toContain('mediaRefs');
    const parsed = parseManifest(out);
    expect(parsed.entries[0].mediaRefs).toEqual(['aaaa111122223333', 'bbbb111122223333']);
  });
  it('rejects a mediaRefs element that is not a string', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], mediaRefs: [123] }] });
    expect(() => parseManifest(raw)).toThrow(/entry|mediaRefs/i);
  });
  it('leniently accepts an entry with no references key (a manifest predating the field)', () => {
    const old = parseManifest(JSON.stringify({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [] },
    ] }));
    expect(old.entries[0].references).toBeUndefined();
  });
  it('round-trips a present references and validates each edge shape', () => {
    const out = serializeManifest({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], references: [{ field: 'author', concept: 'pages', id: 'jane' }] },
    ] });
    expect(out).toContain('references');
    const parsed = parseManifest(out);
    expect(parsed.entries[0].references).toEqual([{ field: 'author', concept: 'pages', id: 'jane' }]);
  });
  it('rejects a references element that is not an object', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], references: ['nope'] }] });
    expect(() => parseManifest(raw)).toThrow(/entry|reference/i);
  });
  it('rejects a references element missing id', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], references: [{ field: 'author', concept: 'pages' }] }] });
    expect(() => parseManifest(raw)).toThrow(/entry|reference/i);
  });
});

const entryA: ManifestEntry = { id: 'a', concept: 'pages', title: 'A', permalink: '/a', draft: false, links: [] };
const entryB: ManifestEntry = { id: 'b', concept: 'posts', title: 'B', date: '2026-01-02', permalink: '/b', draft: false, links: [] };

describe('verifyManifest', () => {
  it('passes when the committed file matches the built manifest', () => {
    const built = { version: 1 as const, entries: [entryA, entryB] };
    expect(() => verifyManifest(built, serializeManifest(built))).not.toThrow();
  });
  it('throws an actionable error on drift', () => {
    const built = { version: 1 as const, entries: [entryA, entryB] };
    const stale = serializeManifest({ version: 1, entries: [entryA] });
    expect(() => verifyManifest(built, stale)).toThrow(/stale|regenerate/i);
  });
  it('fails a committed manifest that lacks a now-built summary', () => {
    const built = { version: 1 as const, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], summary: 'Blurb.' },
    ] };
    const staleCommitted = serializeManifest({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [] },
    ] });
    expect(() => verifyManifest(built, staleCommitted)).toThrow(/stale/);
  });
  it('does NOT red when the built manifest references media but the committed one omits mediaRefs', () => {
    // The migration landmine (open risk 3): a site whose committed manifest predates mediaRefs must
    // build even when its content references media. The built side carries mediaRefs; the committed
    // side has no mediaRefs key. verifyManifest treats the built mediaRefs as absent for that entry.
    const built = { version: 1 as const, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], mediaRefs: ['00112233445566aa'] },
    ] };
    const committedNoMediaRefs = serializeManifest({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [] },
    ] });
    expect(() => verifyManifest(built, committedNoMediaRefs)).not.toThrow();
  });
  it('still reds on real drift even with the mediaRefs leniency in place', () => {
    // Leniency must not blind verify to a genuine change: a changed title still fails.
    const built = { version: 1 as const, entries: [
      { id: 'a', concept: 'posts', title: 'A renamed', permalink: '/a', draft: false, links: [], mediaRefs: ['00112233445566aa'] },
    ] };
    const committedNoMediaRefs = serializeManifest({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [] },
    ] });
    expect(() => verifyManifest(built, committedNoMediaRefs)).toThrow(/stale/);
  });
  it('reds when a regenerated committed manifest drifts in mediaRefs', () => {
    // Once a site regenerates (committed carries mediaRefs), a real mediaRefs drift is detected.
    const built = { version: 1 as const, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], mediaRefs: ['00112233445566aa'] },
    ] };
    const committedWithStaleRefs = serializeManifest({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], mediaRefs: ['ffffffffffffffff'] },
    ] });
    expect(() => verifyManifest(built, committedWithStaleRefs)).toThrow(/stale/);
  });
  it('d.1: does NOT red when the built manifest carries references but the committed one omits them', () => {
    // Back-compat: a site whose committed manifest predates references must build even when its
    // content carries reference edges. The built side carries references; the committed side has no
    // references key. verifyManifest treats the built references as absent for that entry.
    const built = { version: 1 as const, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], references: [{ field: 'author', concept: 'pages', id: 'jane' }] },
    ] };
    const committedNoReferences = serializeManifest({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [] },
    ] });
    expect(() => verifyManifest(built, committedNoReferences)).not.toThrow();
  });
  it('d.2: still reds on real other-field drift even with the references leniency in place', () => {
    // The references leniency must not blind verify to a genuine change: a changed title still fails
    // even when the committed side omits references.
    const built = { version: 1 as const, entries: [
      { id: 'a', concept: 'posts', title: 'A renamed', permalink: '/a', draft: false, links: [], references: [{ field: 'author', concept: 'pages', id: 'jane' }] },
    ] };
    const committedNoReferences = serializeManifest({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [] },
    ] });
    expect(() => verifyManifest(built, committedNoReferences)).toThrow(/stale/);
  });
  it('d.3: reds when a regenerated committed manifest drifts in references', () => {
    // Once a site regenerates (committed carries references), a real references drift is detected.
    const built = { version: 1 as const, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], references: [{ field: 'author', concept: 'pages', id: 'jane' }] },
    ] };
    const committedWithStaleReferences = serializeManifest({ version: 1, entries: [
      { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], references: [{ field: 'author', concept: 'pages', id: 'joan' }] },
    ] });
    expect(() => verifyManifest(built, committedWithStaleReferences)).toThrow(/stale/);
  });
});

describe('upsertEntry / removeEntry', () => {
  it('replaces an entry with the same concept and id', () => {
    const start = { version: 1 as const, entries: [entryA, entryB] };
    const updated = upsertEntry(start, { ...entryB, title: 'B2' });
    expect(updated.entries.filter((e) => e.concept === 'posts' && e.id === 'b')).toHaveLength(1);
    expect(updated.entries.find((e) => e.id === 'b')?.title).toBe('B2');
  });
  it('adds a new entry', () => {
    const updated = upsertEntry({ version: 1, entries: [entryA] }, entryB);
    expect(updated.entries).toHaveLength(2);
  });
  it('removes by concept and id', () => {
    const updated = removeEntry({ version: 1, entries: [entryA, entryB] }, 'posts', 'b');
    expect(updated.entries.map((e) => e.id)).toEqual(['a']);
  });
});

describe('manifestLinkResolver', () => {
  it('resolves a known target and returns undefined for a miss', () => {
    const resolve = manifestLinkResolver([
      { concept: 'pages', id: 'a', permalink: '/a' },
      { concept: 'posts', id: 'b', permalink: '/b' },
    ]);
    expect(resolve({ concept: 'pages', id: 'a' })).toBe('/a');
    expect(resolve({ concept: 'posts', id: 'missing' })).toBeUndefined();
  });
});

describe('inboundLinks', () => {
  const manifest = {
    version: 1 as const,
    entries: [
      { id: 'a', concept: 'posts', title: 'Post A', permalink: '/a', draft: false, links: [{ concept: 'pages', id: 'home' }] },
      { id: 'b', concept: 'posts', title: 'Post B', permalink: '/b', draft: false, links: [{ concept: 'pages', id: 'home' }, { concept: 'posts', id: 'a' }] },
      { id: 'home', concept: 'pages', title: 'Home', permalink: '/', draft: false, links: [{ concept: 'pages', id: 'home' }] },
    ],
  };
  it('returns the entries that link to the target', () => {
    expect(inboundLinks(manifest, 'pages', 'home').map((e) => e.id).sort()).toEqual(['a', 'b']);
  });
  it('carries each linker concept, id, title, and permalink', () => {
    expect(inboundLinks(manifest, 'posts', 'a')).toEqual([
      { concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' },
    ]);
  });
  it('excludes a self-link', () => {
    expect(inboundLinks(manifest, 'pages', 'home').some((e) => e.id === 'home')).toBe(false);
  });
  it('returns an empty list when nothing links to the target', () => {
    expect(inboundLinks(manifest, 'posts', 'b')).toEqual([]);
  });
});

describe('inboundReferences', () => {
  const manifest = {
    version: 1 as const,
    entries: [
      { id: 'about', concept: 'pages', title: 'About', permalink: '/about', draft: false, links: [] },
      { id: 'about', concept: 'posts', title: 'About Post', permalink: '/about-post', draft: false, links: [] },
      { id: 'a', concept: 'posts', title: 'Post A', permalink: '/a', draft: false, links: [], references: [
        { field: 'related', concept: 'posts', id: 'about' },
        { field: 'author', concept: 'pages', id: 'jane' },
      ] },
      { id: 'b', concept: 'posts', title: 'Post B', permalink: '/b', draft: false, links: [], references: [
        { field: 'related', concept: 'posts', id: 'about' },
        { field: 'editor', concept: 'pages', id: 'jane' },
      ] },
    ],
  };
  it('matches the (concept, id) pair, never id alone (no cross-concept phantom)', () => {
    // pages/about and posts/about coexist; the post references posts/about via related, so a query
    // for pages/about must be empty.
    expect(inboundReferences(manifest, 'pages', 'about')).toEqual([]);
  });
  it('returns the entries holding an edge at the target pair', () => {
    expect(inboundReferences(manifest, 'posts', 'about').map((e) => e.id).sort()).toEqual(['a', 'b']);
  });
  it('carries each linker identity and the distinct fields through which it references', () => {
    expect(inboundReferences(manifest, 'pages', 'jane')).toEqual([
      { concept: 'posts', id: 'a', title: 'Post A', permalink: '/a', fields: ['author'] },
      { concept: 'posts', id: 'b', title: 'Post B', permalink: '/b', fields: ['editor'] },
    ]);
  });
  it('excludes a self-reference', () => {
    const selfManifest = {
      version: 1 as const,
      entries: [
        { id: 'a', concept: 'posts', title: 'Post A', permalink: '/a', draft: false, links: [], references: [
          { field: 'related', concept: 'posts', id: 'a' },
        ] },
      ],
    };
    expect(inboundReferences(selfManifest, 'posts', 'a')).toEqual([]);
  });
  it('dedupes the fields when an entry references the target through one field twice', () => {
    const dupeManifest = {
      version: 1 as const,
      entries: [
        { id: 'a', concept: 'posts', title: 'Post A', permalink: '/a', draft: false, links: [], references: [
          { field: 'related', concept: 'posts', id: 'x' },
          { field: 'related', concept: 'posts', id: 'x' },
        ] },
      ],
    };
    expect(inboundReferences(dupeManifest, 'posts', 'x')).toEqual([
      { concept: 'posts', id: 'a', title: 'Post A', permalink: '/a', fields: ['related'] },
    ]);
  });
  it('returns an empty list when nothing references the target', () => {
    expect(inboundReferences(manifest, 'posts', 'nobody')).toEqual([]);
  });
});

describe('verifyReferences', () => {
  it('throws on a dangling edge, naming the source entry, the field, and the missing target', () => {
    const manifest = {
      version: 1 as const,
      entries: [
        { id: 'a', concept: 'posts', title: 'Post A', permalink: '/a', draft: false, links: [], references: [
          { field: 'author', concept: 'pages', id: 'ghost' },
        ] },
        { id: 'about', concept: 'pages', title: 'About', permalink: '/about', draft: false, links: [] },
      ],
    };
    expect(() => verifyReferences(manifest)).toThrow(/posts\/a/);
    expect(() => verifyReferences(manifest)).toThrow(/author/);
    expect(() => verifyReferences(manifest)).toThrow(/pages\/ghost/);
  });

  it('passes when every edge resolves to an existing (concept, id) target', () => {
    const manifest = {
      version: 1 as const,
      entries: [
        { id: 'a', concept: 'posts', title: 'Post A', permalink: '/a', draft: false, links: [], references: [
          { field: 'author', concept: 'pages', id: 'jane' },
          { field: 'related', concept: 'posts', id: 'b' },
        ] },
        { id: 'b', concept: 'posts', title: 'Post B', permalink: '/b', draft: false, links: [] },
        { id: 'jane', concept: 'pages', title: 'Jane', permalink: '/jane', draft: false, links: [] },
      ],
    };
    expect(() => verifyReferences(manifest)).not.toThrow();
  });

  it('matches the (concept, id) pair, so a same-id target in another concept does not satisfy the edge', () => {
    // posts/about exists but pages/about does not; an edge to pages/about must still dangle.
    const manifest = {
      version: 1 as const,
      entries: [
        { id: 'a', concept: 'posts', title: 'Post A', permalink: '/a', draft: false, links: [], references: [
          { field: 'author', concept: 'pages', id: 'about' },
        ] },
        { id: 'about', concept: 'posts', title: 'About Post', permalink: '/about', draft: false, links: [] },
      ],
    };
    expect(() => verifyReferences(manifest)).toThrow(/pages\/about/);
  });

  it('catches a concept-change re-resolution: the stored id re-pairs with the descriptor current concept', () => {
    // extractReferenceEdges takes the target concept from the descriptor, never the stored value, so a
    // bare `author: jane-doe` re-pairs with whatever concept the schema currently declares. jane-doe is
    // a `posts` entry, so a descriptor pointing `author` at posts resolves; flipping it to pages (where
    // jane-doe does not exist) re-pairs the SAME stored value to a dangling pages/jane-doe edge. This is
    // the spec's bounded "no schema-change data loss" case: the build, not the content edit, catches it.
    const frontmatter = parseMarkdown('---\nauthor: jane-doe\n---\nbody\n').frontmatter;
    const targets = [
      { id: 'jane-doe', concept: 'posts', title: 'Jane Doe', permalink: '/jane-doe', draft: false, links: [] },
    ];
    const buildManifest = (authorConcept: string) => ({
      version: 1 as const,
      entries: [
        {
          id: 'a',
          concept: 'posts',
          title: 'Post A',
          permalink: '/a',
          draft: false,
          links: [],
          references: extractReferenceEdges(frontmatter, [
            { name: 'author', type: 'reference' as const, concept: authorConcept, label: 'Author' },
          ]),
        },
        ...targets,
      ],
    });
    expect(() => verifyReferences(buildManifest('posts'))).not.toThrow();
    expect(() => verifyReferences(buildManifest('pages'))).toThrow(/pages\/jane-doe/);
  });
});
