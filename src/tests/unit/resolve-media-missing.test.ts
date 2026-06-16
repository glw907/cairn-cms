import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeMediaResolver } from '../../lib/render/resolve-media.js';
import { normalizeAssets } from '../../lib/media/config.js';
import { log } from '../../lib/log/index.js';
import type { MediaManifest } from '../../lib/media/manifest.js';

const resolved = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' });
const empty: MediaManifest = {};

describe('makeMediaResolver media.resolve_missing', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs media.resolve_missing with the hash on a real miss', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const resolve = makeMediaResolver(empty, resolved);
    expect(resolve({ slug: null, hash: 'a1b2c3d4e5f6a7b8' })).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [event, fields] = warnSpy.mock.calls[0];
    expect(event).toBe('media.resolve_missing');
    expect(fields).toEqual({ hash: 'a1b2c3d4e5f6a7b8' });
    // The record carries the content hash only, never bytes or a token.
    expect(Object.keys(fields ?? {})).toEqual(['hash']);
  });

  it('does not log on the media-off path (that would be noise)', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const off = makeMediaResolver(empty, normalizeAssets(undefined));
    expect(off({ slug: null, hash: 'a1b2c3d4e5f6a7b8' })).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not log when the hash resolves', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const manifest: MediaManifest = {
      a1b2c3d4e5f6a7b8: {
        hash: 'a1b2c3d4e5f6a7b8',
        sha256: 'a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8',
        slug: 'shoes',
        displayName: 'Shoes',
        originalFilename: 'IMG.HEIC',
        alt: 'alt',
        ext: 'webp',
        contentType: 'image/webp',
        bytes: 1024,
        width: 100,
        height: 100,
        createdAt: '2026-06-16T00:00:00.000Z',
      },
    };
    const resolve = makeMediaResolver(manifest, resolved);
    expect(resolve({ slug: null, hash: 'a1b2c3d4e5f6a7b8' })).toBe('/media/shoes.a1b2c3d4e5f6a7b8.webp');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
