// diffNewlyPublished diffs two manifests to find entries a deploy just carried across the
// first-publish transition. Presence-of-stamp is most of the signal (see
// manifest-published-at.test.ts for the stamp rules this relies on): a carried stamp never matches
// its own counterpart, and a legacy unstamped entry never matches. A currently-drafted entry never
// matches either, but not because it lacks a stamp: upsertEntry carries a prior publishedAt forward
// through an ordinary save, including one that flips draft back to true, so the draft check is load
// bearing on its own. The engine performs no I/O here; a consumer persists `before` across deploys
// and calls this pure diff.
import { describe, it, expect } from 'vitest';
import { diffNewlyPublished } from '../../lib/delivery/manifest.js';
import type { Manifest, ManifestEntry } from '../../lib/content/manifest.js';

const NOW = '2026-08-01T12:00:00.000Z';
const EARLIER = '2020-03-04T05:06:07.000Z';

function entry(over: Partial<ManifestEntry> = {}): ManifestEntry {
  return { id: 'hi', concept: 'posts', title: 'Hi', permalink: '/posts/hi', draft: false, links: [], ...over };
}

function manifest(...entries: ManifestEntry[]): Manifest {
  return { version: 1, entries };
}

describe('diffNewlyPublished', () => {
  it('detects an entry newly stamped since before', () => {
    const before = manifest(entry({ draft: true }));
    const after = manifest(entry({ draft: false, publishedAt: NOW }));
    expect(diffNewlyPublished(before, after)).toEqual([entry({ draft: false, publishedAt: NOW })]);
  });

  it('does not detect an entry whose stamp was already carried in before', () => {
    const before = manifest(entry({ publishedAt: EARLIER }));
    const after = manifest(entry({ publishedAt: EARLIER }));
    expect(diffNewlyPublished(before, after)).toEqual([]);
  });

  it('never detects a legacy entry that is non-draft but unstamped', () => {
    const before = manifest(entry({ draft: false }));
    const after = manifest(entry({ draft: false }));
    expect(diffNewlyPublished(before, after)).toEqual([]);
  });

  it('never returns a draft entry, even one absent from before', () => {
    const before = manifest();
    const after = manifest(entry({ draft: true }));
    expect(diffNewlyPublished(before, after)).toEqual([]);
  });

  it('never returns a drafted entry that still carries a stamp from a prior publish, even under the before: null backfill', () => {
    // upsertEntry carries a prior publishedAt forward through an ordinary save that flips draft
    // back to true, so a currently-unpublished entry can still hold a stamp. The draft check, not
    // the stamp check, is what has to exclude it here.
    const after = manifest(entry({ draft: true, publishedAt: EARLIER }));
    expect(diffNewlyPublished(null, after)).toEqual([]);
  });

  it('returns exactly the stamped set when before is null', () => {
    const after = manifest(
      entry({ id: 'stamped', publishedAt: NOW }),
      entry({ id: 'draft', draft: true }),
      entry({ id: 'legacy', draft: false }),
    );
    expect(diffNewlyPublished(null, after)).toEqual([entry({ id: 'stamped', publishedAt: NOW })]);
  });

  it('never returns an entry deleted from after, even if before had it stamped', () => {
    const before = manifest(entry({ publishedAt: EARLIER }));
    const after = manifest();
    expect(diffNewlyPublished(before, after)).toEqual([]);
  });

  it('matches counterparts by concept+id, so a same-id entry in a different concept is unrelated', () => {
    const before = manifest(entry({ concept: 'pages', publishedAt: EARLIER }));
    const after = manifest(entry({ concept: 'posts', publishedAt: NOW }));
    expect(diffNewlyPublished(before, after)).toEqual([entry({ concept: 'posts', publishedAt: NOW })]);
  });
});
