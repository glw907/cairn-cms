import { describe, it, expect } from 'vitest';
import { diffManifests, verifyManifest, serializeManifest, type Manifest, type ManifestEntry } from '../../lib/content/manifest.js';

const entry = (over: Partial<ManifestEntry> = {}): ManifestEntry => ({
  id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], ...over,
});

describe('diffManifests', () => {
  it('reports an added entry', () => {
    const built: Manifest = { version: 1, entries: [entry(), entry({ id: 'b', permalink: '/b', title: 'B' })] };
    const committed: Manifest = { version: 1, entries: [entry()] };
    const d = diffManifests(built, committed);
    expect(d.added.map((e) => e.id)).toEqual(['b']);
    expect(d.removed).toEqual([]);
    expect(d.changed).toEqual([]);
  });

  it('reports a removed entry', () => {
    const built: Manifest = { version: 1, entries: [entry()] };
    const committed: Manifest = { version: 1, entries: [entry(), entry({ id: 'b', permalink: '/b', title: 'B' })] };
    const d = diffManifests(built, committed);
    expect(d.removed.map((e) => e.id)).toEqual(['b']);
  });

  it('reports a changed entry with the differing fields', () => {
    const built: Manifest = { version: 1, entries: [entry({ title: 'New' })] };
    const committed: Manifest = { version: 1, entries: [entry({ title: 'Old' })] };
    const d = diffManifests(built, committed);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0].id).toBe('a');
    expect(d.changed[0].fields).toContain('title');
  });
});

describe('verifyManifest', () => {
  it('throws an error that names what drifted', () => {
    const built: Manifest = { version: 1, entries: [entry({ title: 'New' })] };
    const committed = serializeManifest({ version: 1, entries: [entry({ title: 'Old' })] });
    expect(() => verifyManifest(built, committed)).toThrow(/title/);
  });

  it('does not throw when the committed manifest matches', () => {
    const built: Manifest = { version: 1, entries: [entry()] };
    expect(() => verifyManifest(built, serializeManifest(built))).not.toThrow();
  });

  it('does not report a links drift for an entry whose links only differ in order', () => {
    // One entry's built links are in extraction (non-sorted) order; serializeManifest sorts links,
    // so a naive diff of the non-canonical built side reports a false (links) drift. A second entry
    // carries a genuine title drift, so the slow diff path runs.
    const reordered = entry({
      id: 'a',
      links: [
        { concept: 'posts', id: 'b' },
        { concept: 'posts', id: 'a' },
      ],
    });
    const builtDrift = entry({ id: 'c', permalink: '/c', title: 'New' });
    const built: Manifest = { version: 1, entries: [reordered, builtDrift] };
    // The committed side is canonical (links sorted) for the reordered entry, with a stale title for c.
    const committed = serializeManifest({
      version: 1,
      entries: [reordered, entry({ id: 'c', permalink: '/c', title: 'Old' })],
    });
    let message = '';
    try {
      verifyManifest(built, committed);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain('posts/c');
    expect(message).toContain('title');
    expect(message).not.toContain('links');
    expect(message).not.toContain('posts/a (');
  });
});
