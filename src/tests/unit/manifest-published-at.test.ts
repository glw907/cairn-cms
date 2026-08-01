// The manifest's first-publish stamp: `publishedAt` is manifest-owned, so no path that re-derives
// a row from its file can produce it. These cases pin the four places that must respect that:
// serialize (fixed key order, byte-identical rows for unstamped entries), parse (additive and
// optional), verify (carry the committed stamp onto the corpus-built entry, the inverse of the
// mediaRefs-style drops), and upsert (the preservation chokepoint every write path funnels through).
// stampFirstPublish is the pure transition rule the publish actions call.
import { describe, it, expect } from 'vitest';
import {
  parseManifest,
  serializeManifest,
  stampFirstPublish,
  upsertEntry,
  verifyManifest,
  type Manifest,
  type ManifestEntry,
} from '../../lib/content/manifest.js';

const NOW = '2026-08-01T12:00:00.000Z';
const EARLIER = '2020-03-04T05:06:07.000Z';

function entry(over: Partial<ManifestEntry> = {}): ManifestEntry {
  return { id: 'hi', concept: 'posts', title: 'Hi', permalink: '/posts/hi', draft: false, links: [], ...over };
}

function manifest(...entries: ManifestEntry[]): Manifest {
  return { version: 1, entries };
}

describe('serializeManifest with publishedAt', () => {
  it('writes the stamp right after draft, so the fixed key order stays stable', () => {
    const raw = serializeManifest(manifest(entry({ publishedAt: NOW })));
    expect(JSON.parse(raw).entries[0]).toEqual({
      id: 'hi',
      concept: 'posts',
      title: 'Hi',
      permalink: '/posts/hi',
      draft: false,
      publishedAt: NOW,
      links: [],
    });
    expect(Object.keys(JSON.parse(raw).entries[0])).toEqual([
      'id',
      'concept',
      'title',
      'permalink',
      'draft',
      'publishedAt',
      'links',
    ]);
  });

  it('round-trips the stamp through parse', () => {
    const parsed = parseManifest(serializeManifest(manifest(entry({ publishedAt: NOW }))));
    expect(parsed.entries[0].publishedAt).toBe(NOW);
  });

  it('leaves an unstamped entry byte-identical to a manifest committed before the field', () => {
    const before = '{\n  "version": 1,\n  "entries": [\n    {\n      "id": "hi",\n      "concept": "posts",\n      "title": "Hi",\n      "permalink": "/posts/hi",\n      "draft": false,\n      "links": []\n    }\n  ]\n}\n';
    expect(serializeManifest(manifest(entry()))).toBe(before);
  });
});

describe('parseManifest with publishedAt', () => {
  it('accepts an entry without the key', () => {
    const parsed = parseManifest(serializeManifest(manifest(entry())));
    expect(parsed.entries[0].publishedAt).toBeUndefined();
  });

  it('rejects a non-string publishedAt', () => {
    const raw = JSON.stringify({ version: 1, entries: [{ ...entry(), publishedAt: 1754049600000 }] });
    expect(() => parseManifest(raw)).toThrow(/malformed/);
  });
});

describe('verifyManifest with publishedAt', () => {
  it('does not throw when the committed manifest carries a stamp the corpus-built one cannot', () => {
    const committed = serializeManifest(manifest(entry({ publishedAt: NOW })));
    expect(() => verifyManifest(manifest(entry()), committed)).not.toThrow();
  });

  it('still reports drift in another field of a stamped entry', () => {
    const committed = serializeManifest(manifest(entry({ publishedAt: NOW })));
    expect(() => verifyManifest(manifest(entry({ title: 'Renamed' })), committed)).toThrow(/title/);
  });

  it('reports drift when the built manifest carries a stamp the committed one lacks', () => {
    const committed = serializeManifest(manifest(entry()));
    expect(() => verifyManifest(manifest(entry({ publishedAt: NOW })), committed)).toThrow(/publishedAt/);
  });
});

describe('upsertEntry preserving publishedAt', () => {
  it('carries the existing stamp onto a re-derived row that has none', () => {
    const held = manifest(entry({ publishedAt: NOW }));
    const next = upsertEntry(held, entry({ title: 'Edited' }));
    expect(next.entries[0]).toMatchObject({ title: 'Edited', publishedAt: NOW });
  });

  it('never lets a replacement row overwrite the existing stamp', () => {
    const held = manifest(entry({ publishedAt: EARLIER }));
    const next = upsertEntry(held, entry({ publishedAt: NOW }));
    expect(next.entries[0].publishedAt).toBe(EARLIER);
  });

  it('takes the new row stamp when the manifest holds no prior row', () => {
    const next = upsertEntry(manifest(), entry({ publishedAt: NOW }));
    expect(next.entries[0].publishedAt).toBe(NOW);
  });

  it('leaves an unstamped upsert unstamped when the prior row is unstamped', () => {
    const next = upsertEntry(manifest(entry()), entry({ title: 'Edited' }));
    expect(next.entries[0].publishedAt).toBeUndefined();
  });

  it('matches on concept and id together, so a same-id row in another concept keeps its own stamp', () => {
    const held = manifest(entry({ concept: 'pages', publishedAt: NOW }));
    const next = upsertEntry(held, entry({ concept: 'posts' }));
    expect(next.entries.find((e) => e.concept === 'posts')?.publishedAt).toBeUndefined();
    expect(next.entries.find((e) => e.concept === 'pages')?.publishedAt).toBe(NOW);
  });
});

describe('stampFirstPublish', () => {
  it('stamps a prior draft row now that it lands non-draft', () => {
    expect(stampFirstPublish(entry({ draft: true }), entry({ draft: false }), NOW).publishedAt).toBe(NOW);
  });

  it('stamps a brand-new non-draft row', () => {
    expect(stampFirstPublish(undefined, entry({ draft: false }), NOW).publishedAt).toBe(NOW);
  });

  it('carries an existing stamp unchanged rather than restamping', () => {
    const next = stampFirstPublish(entry({ publishedAt: EARLIER, draft: true }), entry({ draft: false }), NOW);
    expect(next.publishedAt).toBe(EARLIER);
  });

  it('carries an existing stamp even when the row lands back in draft', () => {
    const next = stampFirstPublish(entry({ publishedAt: EARLIER }), entry({ draft: true }), NOW);
    expect(next.publishedAt).toBe(EARLIER);
  });

  it('leaves a legacy non-draft unstamped row unstamped', () => {
    expect(stampFirstPublish(entry({ draft: false }), entry({ draft: false }), NOW).publishedAt).toBeUndefined();
  });

  it('leaves a brand-new draft row unstamped', () => {
    expect(stampFirstPublish(undefined, entry({ draft: true }), NOW).publishedAt).toBeUndefined();
  });

  it('leaves a still-draft row unstamped', () => {
    expect(stampFirstPublish(entry({ draft: true }), entry({ draft: true }), NOW).publishedAt).toBeUndefined();
  });

  it('returns a new object rather than mutating the row it was given', () => {
    const next = entry({ draft: false });
    const stamped = stampFirstPublish(undefined, next, NOW);
    expect(next.publishedAt).toBeUndefined();
    expect(stamped).not.toBe(next);
  });
});
