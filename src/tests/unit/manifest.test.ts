import { describe, it, expect } from 'vitest';
import { manifestEntryFromFile, serializeManifest, parseManifest, emptyManifest } from '../../lib/content/manifest.js';
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
