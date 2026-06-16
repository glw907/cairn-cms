import { describe, it, expect, vi, afterEach } from 'vitest';
import { reconcileMedia, runReconcile } from '../../lib/media/reconcile.js';
import type { ReconcileBucket } from '../../lib/media/reconcile.js';
import type { MediaEntry, MediaManifest } from '../../lib/media/manifest.js';
import { log } from '../../lib/log/index.js';

function entry(hash: string, ext = 'webp'): MediaEntry {
  return {
    hash,
    sha256: `${hash}${hash}${hash}${hash}`,
    slug: 'shoes',
    displayName: 'Shoes',
    originalFilename: 'IMG.HEIC',
    alt: 'alt',
    ext,
    contentType: 'image/webp',
    bytes: 1024,
    width: 100,
    height: 100,
    createdAt: '2026-06-16T00:00:00.000Z',
  };
}

describe('reconcileMedia', () => {
  it('reports orphaned objects: a stored key whose hash is absent from the manifest', () => {
    const manifest: MediaManifest = { a1b2c3d4e5f6a7b8: entry('a1b2c3d4e5f6a7b8') };
    const stored = [
      'media/a1/a1b2c3d4e5f6a7b8.webp', // in the manifest
      'media/ff/ffffffffffffffff.webp', // not in the manifest -> orphan
    ];
    const result = reconcileMedia(stored, manifest);
    expect(result.orphanedObjects).toEqual(['media/ff/ffffffffffffffff.webp']);
    expect(result.missingObjects).toEqual([]);
  });

  it('reports missing objects: a manifest hash with no stored object', () => {
    const manifest: MediaManifest = {
      a1b2c3d4e5f6a7b8: entry('a1b2c3d4e5f6a7b8'),
      ffffffffffffffff: entry('ffffffffffffffff'),
    };
    const stored = ['media/a1/a1b2c3d4e5f6a7b8.webp'];
    const result = reconcileMedia(stored, manifest);
    expect(result.orphanedObjects).toEqual([]);
    expect(result.missingObjects).toEqual(['ffffffffffffffff']);
  });

  it('reports both directions at once', () => {
    const manifest: MediaManifest = {
      a1b2c3d4e5f6a7b8: entry('a1b2c3d4e5f6a7b8'),
      1111111111111111: entry('1111111111111111'),
    };
    const stored = [
      'media/a1/a1b2c3d4e5f6a7b8.webp', // matched
      'media/22/2222222222222222.png', // orphan
    ];
    const result = reconcileMedia(stored, manifest);
    expect(result.orphanedObjects).toEqual(['media/22/2222222222222222.png']);
    expect(result.missingObjects).toEqual(['1111111111111111']);
  });

  it('ignores a key that does not match the media-key grammar', () => {
    const manifest: MediaManifest = { a1b2c3d4e5f6a7b8: entry('a1b2c3d4e5f6a7b8') };
    const stored = [
      'media/a1/a1b2c3d4e5f6a7b8.webp',
      'not-a-media-key',
      'media/zz/notahash.webp', // bad hash chars
      'media/a1/a1b2c3d4e5f6a7b8', // no ext
      'other/a1/a1b2c3d4e5f6a7b8.webp', // wrong prefix
    ];
    const result = reconcileMedia(stored, manifest);
    expect(result.orphanedObjects).toEqual([]);
    expect(result.missingObjects).toEqual([]);
  });

  it('treats a key whose fan-out byte does not match the hash prefix by its hash, not its path', () => {
    // The grammar parses the short hash from the filename, not the fan-out byte; reconcile keys on
    // the hash, so a misfiled object still reconciles by its true hash.
    const manifest: MediaManifest = { a1b2c3d4e5f6a7b8: entry('a1b2c3d4e5f6a7b8') };
    const stored = ['media/00/a1b2c3d4e5f6a7b8.webp'];
    const result = reconcileMedia(stored, manifest);
    expect(result.orphanedObjects).toEqual([]);
    expect(result.missingObjects).toEqual([]);
  });
});

describe('runReconcile', () => {
  afterEach(() => vi.restoreAllMocks());

  function bucketFrom(keys: string[]): ReconcileBucket {
    return {
      list: async (opts) => {
        expect(opts?.prefix).toBe('media/');
        return { objects: keys.map((key) => ({ key })), truncated: false };
      },
    };
  }

  it('lists R2 keys under media/ and returns the reconcile result', async () => {
    const manifest: MediaManifest = {
      a1b2c3d4e5f6a7b8: entry('a1b2c3d4e5f6a7b8'),
      ffffffffffffffff: entry('ffffffffffffffff'),
    };
    const bucket = bucketFrom([
      'media/a1/a1b2c3d4e5f6a7b8.webp',
      'media/22/2222222222222222.png',
    ]);
    const result = await runReconcile(bucket, manifest);
    expect(result.orphanedObjects).toEqual(['media/22/2222222222222222.png']);
    expect(result.missingObjects).toEqual(['ffffffffffffffff']);
  });

  it('paginates through cursor/truncated pages', async () => {
    const manifest: MediaManifest = { a1b2c3d4e5f6a7b8: entry('a1b2c3d4e5f6a7b8') };
    let call = 0;
    const bucket: ReconcileBucket = {
      list: async (opts) => {
        expect(opts?.prefix).toBe('media/');
        call += 1;
        if (call === 1) {
          expect(opts?.cursor).toBeUndefined();
          return { objects: [{ key: 'media/a1/a1b2c3d4e5f6a7b8.webp' }], truncated: true, cursor: 'next' };
        }
        expect(opts?.cursor).toBe('next');
        return { objects: [{ key: 'media/22/2222222222222222.png' }], truncated: false };
      },
    };
    const result = await runReconcile(bucket, manifest);
    expect(call).toBe(2);
    expect(result.orphanedObjects).toEqual(['media/22/2222222222222222.png']);
    expect(result.missingObjects).toEqual([]);
  });

  it('emits media.orphan_reconcile with counts only and no bytes or key list', async () => {
    const manifest: MediaManifest = {
      a1b2c3d4e5f6a7b8: entry('a1b2c3d4e5f6a7b8'),
      ffffffffffffffff: entry('ffffffffffffffff'),
    };
    const bucket = bucketFrom([
      'media/a1/a1b2c3d4e5f6a7b8.webp',
      'media/22/2222222222222222.png',
    ]);
    const infoSpy = vi.spyOn(log, 'info').mockImplementation(() => {});
    await runReconcile(bucket, manifest);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [event, fields] = infoSpy.mock.calls[0];
    expect(event).toBe('media.orphan_reconcile');
    expect(fields).toEqual({ orphaned: 1, missing: 1 });
    // The record carries counts only, never bytes or a key list.
    expect(Object.keys(fields ?? {})).toEqual(['orphaned', 'missing']);
  });
});
