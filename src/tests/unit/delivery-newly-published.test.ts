// newlyPublishedEntries diffs two manifests to find entries a deploy just carried across the
// first-publish transition. Presence-of-stamp is the whole signal (see manifest-published-at.test.ts
// for the stamp rules this relies on): a carried stamp never matches its own counterpart, a legacy
// unstamped entry never matches, and a draft never carries a stamp so never matches either. The
// engine performs no I/O here; a consumer persists `before` across deploys and calls this pure diff.
import { describe, it, expect } from 'vitest';
import { newlyPublishedEntries } from '../../lib/delivery/manifest.js';
import type { Manifest, ManifestEntry } from '../../lib/content/manifest.js';

const NOW = '2026-08-01T12:00:00.000Z';
const EARLIER = '2020-03-04T05:06:07.000Z';

function entry(over: Partial<ManifestEntry> = {}): ManifestEntry {
  return { id: 'hi', concept: 'posts', title: 'Hi', permalink: '/posts/hi', draft: false, links: [], ...over };
}

function manifest(...entries: ManifestEntry[]): Manifest {
  return { version: 1, entries };
}

describe('newlyPublishedEntries', () => {
  it('detects an entry newly stamped since before', () => {
    const before = manifest(entry({ draft: true }));
    const after = manifest(entry({ draft: false, publishedAt: NOW }));
    expect(newlyPublishedEntries(before, after)).toEqual([entry({ draft: false, publishedAt: NOW })]);
  });

  it('does not detect an entry whose stamp was already carried in before', () => {
    const before = manifest(entry({ publishedAt: EARLIER }));
    const after = manifest(entry({ publishedAt: EARLIER }));
    expect(newlyPublishedEntries(before, after)).toEqual([]);
  });

  it('never detects a legacy entry that is non-draft but unstamped', () => {
    const before = manifest(entry({ draft: false }));
    const after = manifest(entry({ draft: false }));
    expect(newlyPublishedEntries(before, after)).toEqual([]);
  });

  it('never returns a draft entry, even one absent from before', () => {
    const before = manifest();
    const after = manifest(entry({ draft: true }));
    expect(newlyPublishedEntries(before, after)).toEqual([]);
  });

  it('returns exactly the stamped set when before is null', () => {
    const after = manifest(
      entry({ id: 'stamped', publishedAt: NOW }),
      entry({ id: 'draft', draft: true }),
      entry({ id: 'legacy', draft: false }),
    );
    expect(newlyPublishedEntries(null, after)).toEqual([entry({ id: 'stamped', publishedAt: NOW })]);
  });

  it('never returns an entry deleted from after, even if before had it stamped', () => {
    const before = manifest(entry({ publishedAt: EARLIER }));
    const after = manifest();
    expect(newlyPublishedEntries(before, after)).toEqual([]);
  });

  it('matches counterparts by concept+id, so a same-id entry in a different concept is unrelated', () => {
    const before = manifest(entry({ concept: 'pages', publishedAt: EARLIER }));
    const after = manifest(entry({ concept: 'posts', publishedAt: NOW }));
    expect(newlyPublishedEntries(before, after)).toEqual([entry({ concept: 'posts', publishedAt: NOW })]);
  });
});
