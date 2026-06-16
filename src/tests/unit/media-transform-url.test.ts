import { describe, it, expect } from 'vitest';
import { variantUrl, presetUrl, type VariantSpec } from '../../lib/media/transform-url.js';

const PUBLIC_PATH = '/media/x.a1b2c3d4e5f6a7b8.webp';

describe('variantUrl', () => {
  it('emits the defaults in the stable option order for a width-only spec', () => {
    expect(variantUrl(PUBLIC_PATH, { width: 800 })).toBe(
      '/cdn-cgi/image/width=800,format=auto,gravity=auto/media/x.a1b2c3d4e5f6a7b8.webp',
    );
  });

  it('carries an explicit gravity, quality, and fit', () => {
    const out = variantUrl(PUBLIC_PATH, {
      width: 600,
      quality: 82,
      fit: 'cover',
      gravity: 'face',
    });
    expect(out).toContain('quality=82');
    expect(out).toContain('fit=cover');
    expect(out).toContain('gravity=face');
    // The explicit gravity overrides the default, so gravity=auto is gone.
    expect(out).not.toContain('gravity=auto');
  });

  it('lets an explicit format override the format=auto default', () => {
    const out = variantUrl(PUBLIC_PATH, { width: 400, format: 'webp' });
    expect(out).toContain('format=webp');
    expect(out).not.toContain('format=auto');
  });

  it('passes the publicPath through unaltered at the tail', () => {
    const out = variantUrl(PUBLIC_PATH, { width: 800 });
    expect(out.endsWith(PUBLIC_PATH)).toBe(true);
  });
});

describe('presetUrl', () => {
  const variants: Record<string, VariantSpec> = { thumb: { width: 320 } };

  it('resolves a known preset to the variantUrl the spec would build', () => {
    expect(presetUrl(PUBLIC_PATH, 'thumb', variants)).toBe(
      variantUrl(PUBLIC_PATH, variants.thumb),
    );
  });

  it('throws a cairn: error on an unknown preset name', () => {
    expect(() => presetUrl(PUBLIC_PATH, 'nope', variants)).toThrow(/cairn:/);
  });
});
