// The cairn-manifest regenerate path rebuilds every row from the corpus, and no content file can
// carry the manifest-owned publishedAt stamp, so a bare regenerate would silently strip every one.
// carryPublishStamps is the merge that keeps them. These cases pin the merge and its repair-tool
// contract: a corrupt committed file degrades to the built output with a warning, never a throw,
// since regenerating is how a site repairs a corrupt manifest.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { carryPublishStamps } from '../../lib/vite/internal.js';
import { parseManifest, serializeManifest, type ManifestEntry } from '../../lib/content/manifest.js';

const NOW = '2026-08-01T12:00:00.000Z';

function entry(over: Partial<ManifestEntry> = {}): ManifestEntry {
  return { id: 'hi', concept: 'posts', title: 'Hi', permalink: '/posts/hi', draft: false, links: [], ...over };
}

afterEach(() => vi.restoreAllMocks());

describe('carryPublishStamps', () => {
  it('writes the built output unchanged when no committed file exists', () => {
    const built = serializeManifest({ version: 1, entries: [entry()] });
    expect(carryPublishStamps(built, null)).toBe(built);
  });

  it('carries a committed stamp onto the rebuilt row', () => {
    const built = serializeManifest({ version: 1, entries: [entry({ title: 'Edited' })] });
    const committed = serializeManifest({ version: 1, entries: [entry({ publishedAt: NOW })] });
    const merged = parseManifest(carryPublishStamps(built, committed));
    expect(merged.entries[0]).toMatchObject({ title: 'Edited', publishedAt: NOW });
  });

  it('leaves a rebuilt row unstamped when its committed counterpart is unstamped', () => {
    const built = serializeManifest({ version: 1, entries: [entry()] });
    const committed = serializeManifest({ version: 1, entries: [entry()] });
    expect(carryPublishStamps(built, committed)).toBe(built);
  });

  it('matches on concept and id together, so a same-id row in another concept keeps its own stamp', () => {
    const built = serializeManifest({ version: 1, entries: [entry({ concept: 'posts' }), entry({ concept: 'pages' })] });
    const committed = serializeManifest({ version: 1, entries: [entry({ concept: 'pages', publishedAt: NOW })] });
    const merged = parseManifest(carryPublishStamps(built, committed));
    expect(merged.entries.find((e) => e.concept === 'posts')?.publishedAt).toBeUndefined();
    expect(merged.entries.find((e) => e.concept === 'pages')?.publishedAt).toBe(NOW);
  });

  it('drops a stamp whose entry is gone from the corpus', () => {
    const built = serializeManifest({ version: 1, entries: [] });
    const committed = serializeManifest({ version: 1, entries: [entry({ publishedAt: NOW })] });
    expect(parseManifest(carryPublishStamps(built, committed)).entries).toEqual([]);
  });

  it('warns and writes the built output when the committed file will not parse', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const built = serializeManifest({ version: 1, entries: [entry()] });
    expect(carryPublishStamps(built, '{ not json')).toBe(built);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/publish stamps/i));
  });
});
