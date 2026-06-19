import { describe, it, expect } from 'vitest';
import { buildOrphanScan } from '../../lib/media/orphan-scan.js';
import type { ReconcileResult } from '../../lib/media/reconcile.js';
import type { MediaEntry, MediaManifest } from '../../lib/media/manifest.js';
import type { UsageEntry, UsageIndex } from '../../lib/media/usage.js';

function entry(hash: string, slug: string): MediaEntry {
  return {
    hash,
    sha256: `${hash}${hash}${hash}${hash}`,
    slug,
    displayName: 'Shoes',
    originalFilename: 'IMG.HEIC',
    alt: 'alt',
    ext: 'webp',
    contentType: 'image/webp',
    bytes: 1024,
    width: 100,
    height: 100,
    createdAt: '2026-06-16T00:00:00.000Z',
  };
}

function usage(id: string): UsageEntry {
  return { concept: 'posts', id, title: id, origin: { kind: 'published' } };
}

describe('buildOrphanScan', () => {
  it('projects an orphaned R2 key to a byte-row with its parsed hash', () => {
    const reconcile: ReconcileResult = {
      orphanedObjects: ['media/ff/ffffffffffffffff.webp'],
      missingObjects: [],
    };
    const scan = buildOrphanScan(reconcile, {}, new Map());
    expect(scan.orphanedBytes).toEqual([
      { key: 'media/ff/ffffffffffffffff.webp', hash: 'ffffffffffffffff' },
    ]);
    expect(scan.brokenRefs).toEqual([]);
  });

  it('projects a missingObjects hash to a broken-ref row with the manifest slug and its usage rows', () => {
    const manifest: MediaManifest = { a1b2c3d4e5f6a7b8: entry('a1b2c3d4e5f6a7b8', 'shoes') };
    const rows = [usage('hello'), usage('world')];
    const index: UsageIndex = new Map([['a1b2c3d4e5f6a7b8', rows]]);
    const reconcile: ReconcileResult = {
      orphanedObjects: [],
      missingObjects: ['a1b2c3d4e5f6a7b8'],
    };
    const scan = buildOrphanScan(reconcile, manifest, index);
    expect(scan.orphanedBytes).toEqual([]);
    expect(scan.brokenRefs).toEqual([
      { hash: 'a1b2c3d4e5f6a7b8', slug: 'shoes', usage: rows },
    ]);
  });

  it('still projects a missingObjects hash that has no usage rows (empty usage)', () => {
    const manifest: MediaManifest = { a1b2c3d4e5f6a7b8: entry('a1b2c3d4e5f6a7b8', 'shoes') };
    const reconcile: ReconcileResult = {
      orphanedObjects: [],
      missingObjects: ['a1b2c3d4e5f6a7b8'],
    };
    const scan = buildOrphanScan(reconcile, manifest, new Map());
    expect(scan.brokenRefs).toEqual([
      { hash: 'a1b2c3d4e5f6a7b8', slug: 'shoes', usage: [] },
    ]);
  });

  it('falls back to an empty slug when the manifest row is absent', () => {
    const reconcile: ReconcileResult = {
      orphanedObjects: [],
      missingObjects: ['a1b2c3d4e5f6a7b8'],
    };
    const scan = buildOrphanScan(reconcile, {}, new Map());
    expect(scan.brokenRefs).toEqual([
      { hash: 'a1b2c3d4e5f6a7b8', slug: '', usage: [] },
    ]);
  });

  it('skips a malformed orphaned key that does not match the media-key grammar', () => {
    const reconcile: ReconcileResult = {
      orphanedObjects: ['not-a-media-key', 'media/ff/ffffffffffffffff.webp'],
      missingObjects: [],
    };
    const scan = buildOrphanScan(reconcile, {}, new Map());
    expect(scan.orphanedBytes).toEqual([
      { key: 'media/ff/ffffffffffffffff.webp', hash: 'ffffffffffffffff' },
    ]);
  });

  it('preserves the input order of both directions', () => {
    const reconcile: ReconcileResult = {
      orphanedObjects: ['media/22/2222222222222222.png', 'media/11/1111111111111111.webp'],
      missingObjects: ['bbbbbbbbbbbbbbbb', 'aaaaaaaaaaaaaaaa'],
    };
    const scan = buildOrphanScan(reconcile, {}, new Map());
    expect(scan.orphanedBytes.map((r) => r.hash)).toEqual([
      '2222222222222222',
      '1111111111111111',
    ]);
    expect(scan.brokenRefs.map((r) => r.hash)).toEqual([
      'bbbbbbbbbbbbbbbb',
      'aaaaaaaaaaaaaaaa',
    ]);
  });

  it('yields empty arrays for an empty reconcile result', () => {
    const scan = buildOrphanScan({ orphanedObjects: [], missingObjects: [] }, {}, new Map());
    expect(scan).toEqual({ orphanedBytes: [], brokenRefs: [] });
  });
});
