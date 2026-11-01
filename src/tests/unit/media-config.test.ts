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
    expect(resolved.transformations).toBe(false);
  });

  it('carries an explicit transformations flag', () => {
    const resolved = normalizeAssets({ bucketBinding: 'X', transformations: true });
    if (!resolved.enabled) throw new Error('expected enabled');
    expect(resolved.transformations).toBe(true);
  });

  it('carries an explicit opaque urlForm', () => {
    const resolved = normalizeAssets({ bucketBinding: 'X', urlForm: 'opaque' });
    if (!resolved.enabled) throw new Error('expected enabled');
    expect(resolved.urlForm).toBe('opaque');
  });

  it('throws cairn: for a present block missing bucketBinding', () => {
    expect(() => normalizeAssets({ publicBase: '/m' } as AssetConfig)).toThrow(/cairn:/);
  });

  it('throws cairn: for an allowedTypes entry the upload path cannot store', () => {
    expect(() => normalizeAssets({ bucketBinding: 'X', allowedTypes: ['image/svg+xml'] })).toThrow(/cairn:.*image\/svg\+xml/);
  });

  it('accepts every default type and a narrowed subset', () => {
    expect(() => normalizeAssets({ bucketBinding: 'X', allowedTypes: DEFAULT_TYPES })).not.toThrow();
    expect(() => normalizeAssets({ bucketBinding: 'X', allowedTypes: ['image/png'] })).not.toThrow();
  });

  it('throws cairn: for an unknown urlForm', () => {
    expect(() => normalizeAssets({ bucketBinding: 'X', urlForm: 'weird' as 'slug' })).toThrow(/cairn:/);
  });

  it('returns disabled media when no assets block is declared', () => {
    expect(normalizeAssets(undefined)).toEqual({ enabled: false });
  });
});
