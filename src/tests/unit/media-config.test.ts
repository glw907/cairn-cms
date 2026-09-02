import { describe, it, expect } from 'vitest';
import { normalizeAssets, BUILT_IN_PRESETS } from '../../lib/media/config.js';
import { presetUrl, variantUrl } from '../../lib/media/transform-url.js';
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

  it('throws cairn: for an unknown urlForm', () => {
    expect(() => normalizeAssets({ bucketBinding: 'X', urlForm: 'weird' as 'slug' })).toThrow(/cairn:/);
  });

  it('returns disabled media when no assets block is declared', () => {
    expect(normalizeAssets(undefined)).toEqual({ enabled: false });
  });
});

describe('BUILT_IN_PRESETS', () => {
  // Ruling 4 (2026-09-01, the `variants` evidence sweep) retires a site's ability to declare its
  // own transform presets; the four built-ins are the whole vocabulary presetUrl resolves
  // against, so they must keep working through it with no AssetConfig in the loop.
  it('names exactly the thumb, inline, card, and hero presets', () => {
    expect(Object.keys(BUILT_IN_PRESETS).sort()).toEqual(['card', 'hero', 'inline', 'thumb']);
  });

  it.each(['thumb', 'inline', 'card', 'hero'] as const)(
    'resolves the %s preset through presetUrl to the variantUrl its spec would build',
    (name) => {
      const path = '/media/x.a1b2c3d4e5f6a7b8.webp';
      expect(presetUrl(path, name, BUILT_IN_PRESETS)).toBe(variantUrl(path, BUILT_IN_PRESETS[name]));
    },
  );
});
