import { describe, it, expect } from 'vitest';
import { normalizeAssets } from '../../lib/media/config.js';
import type { AssetConfig } from '../../lib/content/types.js';

const DEFAULT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

describe('normalizeAssets', () => {
  it('applies defaults when the optional fields are omitted', () => {
    const resolved = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' });
    expect(resolved.enabled).toBe(true);
    if (!resolved.enabled) throw new Error('expected enabled');
    expect(resolved.bucketBinding).toBe('MEDIA_BUCKET');
    expect(resolved.publicBase).toBe('/media');
    expect(resolved.urlForm).toBe('slug');
    expect(resolved.maxUploadBytes).toBe(25 * 1024 * 1024);
    expect(resolved.allowedTypes).toEqual(DEFAULT_TYPES);
    expect(Object.keys(resolved.variants).sort()).toEqual(['card', 'hero', 'inline', 'thumb']);
  });

  it('lets a caller variant override a built-in preset while the rest stay built-in', () => {
    const resolved = normalizeAssets({ bucketBinding: 'X', variants: { hero: { width: 2000 } } });
    if (!resolved.enabled) throw new Error('expected enabled');
    expect(resolved.variants.hero).toEqual({ width: 2000 });
    expect(resolved.variants.thumb).toEqual({ width: 320, height: 320, fit: 'cover' });
    expect(resolved.variants.inline).toEqual({ width: 800 });
    expect(resolved.variants.card).toEqual({ width: 640, height: 400, fit: 'cover' });
  });

  it('carries an explicit opaque urlForm', () => {
    const resolved = normalizeAssets({ bucketBinding: 'X', urlForm: 'opaque' });
    if (!resolved.enabled) throw new Error('expected enabled');
    expect(resolved.urlForm).toBe('opaque');
  });

  it('throws cairn: for a present block missing bucketBinding', () => {
    expect(() => normalizeAssets({ publicBase: '/m' } as AssetConfig)).toThrow(/cairn:/);
  });

  it('throws cairn: for an unknown urlForm', () => {
    expect(() => normalizeAssets({ bucketBinding: 'X', urlForm: 'weird' as 'slug' })).toThrow(/cairn:/);
  });

  it('throws cairn: for a variant with a bad fit', () => {
    expect(() =>
      normalizeAssets({ bucketBinding: 'X', variants: { hero: { fit: 'stretch' as 'cover' } } }),
    ).toThrow(/cairn:/);
  });

  it('throws cairn: for a variant with a bad gravity', () => {
    expect(() =>
      normalizeAssets({ bucketBinding: 'X', variants: { hero: { gravity: 'nonsense' } } }),
    ).toThrow(/cairn:/);
  });

  it('returns disabled media when no assets block is declared', () => {
    expect(normalizeAssets(undefined)).toEqual({ enabled: false });
  });
});
