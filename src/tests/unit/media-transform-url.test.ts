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

  it('adds a leading slash when the source path lacks one', () => {
    expect(variantUrl('media/x.a1b2c3d4e5f6a7b8.webp', { width: 800 })).toBe(
      '/cdn-cgi/image/width=800,format=auto,gravity=auto/media/x.a1b2c3d4e5f6a7b8.webp',
    );
  });

  it('carries the aspect-crop fit mode', () => {
    const out = variantUrl(PUBLIC_PATH, { width: 500, height: 500, fit: 'aspect-crop' });
    expect(out).toContain('fit=aspect-crop');
  });

  it('carries the scale-up fit mode', () => {
    const out = variantUrl(PUBLIC_PATH, { width: 800, height: 600, fit: 'scale-up' });
    expect(out).toContain('fit=scale-up');
  });

  it('carries the squeeze fit mode', () => {
    const out = variantUrl(PUBLIC_PATH, { width: 800, height: 600, fit: 'squeeze' });
    expect(out).toContain('fit=squeeze');
  });

  it('carries an explicit upscale option', () => {
    const out = variantUrl(PUBLIC_PATH, { width: 800, fit: 'scale-up', upscale: 'generate' });
    expect(out).toContain('upscale=generate');
  });

  it('carries the default-named interpolate upscale option when set explicitly', () => {
    const out = variantUrl(PUBLIC_PATH, { width: 800, fit: 'scale-up', upscale: 'interpolate' });
    expect(out).toContain('upscale=interpolate');
  });

  it('emits upscale only when the spec sets it', () => {
    const withUpscale = variantUrl(PUBLIC_PATH, {
      width: 800,
      fit: 'scale-up',
      upscale: 'generate',
    });
    const withoutUpscale = variantUrl(PUBLIC_PATH, { width: 800, fit: 'scale-up' });
    expect(withUpscale).toContain('upscale=generate');
    expect(withoutUpscale).not.toContain('upscale');
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
