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
});
