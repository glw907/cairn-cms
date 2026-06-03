import { describe, it, expect } from 'vitest';
import { manifestEntryFromFile, serializeManifest, parseManifest, emptyManifest, verifyManifest, upsertEntry, removeEntry, manifestLinkResolver, inboundLinks } from '../../lib/content/manifest.js';
import type { ManifestEntry } from '../../lib/content/manifest.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';

const posts: ConceptDescriptor = {
  id: 'posts',
  label: 'Posts',
  dir: 'src/content/posts',
  routing: { routable: true, dated: true, inFeeds: true },
  permalink: '/:year/:month/:slug',
  datePrefix: 'day',
  fields: [],
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
