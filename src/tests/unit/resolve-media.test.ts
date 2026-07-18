import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import { makeMediaResolver, manifestMediaResolver } from '../../lib/render/resolve-media.js';
import { normalizeAssets } from '../../lib/media/config.js';
import type { MediaManifest } from '../../lib/media/manifest.js';

const manifest: MediaManifest = {
  a1b2c3d4e5f6a7b8: {
    hash: 'a1b2c3d4e5f6a7b8',
    sha256: 'a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8',
    slug: 'blue-running-shoes',
    displayName: 'Blue running shoes',
    originalFilename: 'IMG_4821.HEIC',
    alt: 'A pair of blue running shoes',
    ext: 'webp',
    contentType: 'image/webp',
    bytes: 184320,
    width: 1600,
    height: 1200,
    createdAt: '2026-06-15T00:00:00.000Z',
  },
};

const resolved = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' });

// A second asset with no recorded dimensions (the client-only-dimension-source case), for the
// "managed without dimensions" arm.
const noDimsManifest: MediaManifest = {
  b2c3d4e5f6a7b8a1: {
    hash: 'b2c3d4e5f6a7b8a1',
    sha256: 'b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1',
    slug: 'unknown-size',
    displayName: 'Unknown size',
    originalFilename: 'scan.png',
    alt: 'A scan with no recorded dimensions',
    ext: 'png',
    contentType: 'image/png',
    bytes: 4096,
    width: null,
    height: null,
    createdAt: '2026-06-15T00:00:00.000Z',
  },
};

const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));

describe('cairn media resolution', () => {
  it('rewrites a media token to the canonical delivery path', async () => {
    const resolveMedia = makeMediaResolver(manifest, resolved);
    const html = await renderMarkdown('![shoes](media:blue-running-shoes.a1b2c3d4e5f6a7b8)', {
      resolveMedia,
    });
    expect(html).toContain('src="/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp"');
    expect(html).not.toContain('media:');
  });
  it('resolves the bare-hash form to the canonical slug from the manifest entry', async () => {
    const resolveMedia = makeMediaResolver(manifest, resolved);
    const html = await renderMarkdown('![shoes](media:a1b2c3d4e5f6a7b8)', { resolveMedia });
    expect(html).toContain('src="/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp"');
  });
  it('serves the bare full-size path and ignores the preset when transformations are off', async () => {
    // The default resolved config has transformations: false, so a fresh zone without Image
    // Transformations serves the full-size delivery path rather than a dead /cdn-cgi/image URL.
    const resolveMedia = makeMediaResolver(manifest, resolved, { preset: 'inline' });
    const html = await renderMarkdown('![shoes](media:blue-running-shoes.a1b2c3d4e5f6a7b8)', {
      resolveMedia,
    });
    expect(html).toContain('src="/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp"');
    expect(html).not.toContain('/cdn-cgi/image');
  });
  it('applies a named preset to the delivery path when transformations are on', async () => {
    const transformsOn = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET', transformations: true });
    const resolveMedia = makeMediaResolver(manifest, transformsOn, { preset: 'inline' });
    const html = await renderMarkdown('![shoes](media:blue-running-shoes.a1b2c3d4e5f6a7b8)', {
      resolveMedia,
    });
    expect(html).toContain(
      'src="/cdn-cgi/image/width=800,format=auto,gravity=auto/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp"',
    );
  });
  it('marks an unknown hash with the broken-media class and does not throw', async () => {
    const resolveMedia = makeMediaResolver({}, resolved);
    const html = await renderMarkdown('![gone](media:blue-running-shoes.a1b2c3d4e5f6a7b8)', {
      resolveMedia,
    });
    expect(html).toContain('cairn-broken-media');
    expect(html).toContain('title="Missing media asset"');
  });
  it('leaves a non-media image src untouched', async () => {
    const resolveMedia = makeMediaResolver(manifest, resolved);
    const html = await renderMarkdown('![ext](https://example.com/y.png)', { resolveMedia });
    expect(html).toContain('src="https://example.com/y.png"');
  });
  it('leaves a media token inert when no resolver is provided', async () => {
    // With no resolver the plugin returns early, so the token is neither rewritten to a delivery
    // path nor marked broken. The sanitize floor then strips the unresolved media: src (the schema
    // admits media on no protocol allowlist), so the inert image carries neither a path nor the
    // broken-media marker. This is the asymmetry with the cairn: link case, whose href survives the
    // floor because the schema admits the cairn href scheme.
    const html = await renderMarkdown('![x](media:blue-running-shoes.a1b2c3d4e5f6a7b8)');
    expect(html).not.toContain('/media/');
    expect(html).not.toContain('cairn-broken-media');
  });
  it('threads a custom publicBase from the resolved config into the delivery path', async () => {
    const customBase = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET', publicBase: '/assets' });
    const resolveMedia = makeMediaResolver(manifest, customBase);
    const html = await renderMarkdown('![shoes](media:blue-running-shoes.a1b2c3d4e5f6a7b8)', {
      resolveMedia,
    });
    expect(html).toContain('src="/assets/blue-running-shoes.a1b2c3d4e5f6a7b8.webp"');
  });
});

describe('measured-floor: intrinsic dimensions and responsive srcset', () => {
  it('managed media with known dimensions, transformations off: emits width/height only', async () => {
    const resolveMedia = makeMediaResolver(manifest, resolved);
    const html = await renderMarkdown('![shoes](media:blue-running-shoes.a1b2c3d4e5f6a7b8)', {
      resolveMedia,
    });
    expect(html).toContain('width="1600"');
    expect(html).toContain('height="1200"');
    expect(html).not.toContain('srcset=');
    expect(html).not.toContain('sizes=');
  });

  it('managed media with known dimensions, transformations on: emits width/height and a width-ladder srcset', async () => {
    const transformsOn = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET', transformations: true });
    const resolveMedia = makeMediaResolver(manifest, transformsOn);
    const html = await renderMarkdown('![shoes](media:blue-running-shoes.a1b2c3d4e5f6a7b8)', {
      resolveMedia,
    });
    expect(html).toContain('width="1600"');
    expect(html).toContain('height="1200"');
    expect(html).toContain(
      'srcset="/cdn-cgi/image/width=400,format=auto,gravity=auto/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp 400w, ' +
        '/cdn-cgi/image/width=800,format=auto,gravity=auto/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp 800w, ' +
        '/cdn-cgi/image/width=1200,format=auto,gravity=auto/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp 1200w, ' +
        '/cdn-cgi/image/width=1600,format=auto,gravity=auto/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp 1600w"',
    );
    // A bare inline image (no enclosing figure) falls back to the safe full-viewport sizes hint.
    expect(html).toContain('sizes="100vw"');
  });

  it('managed media with no recorded dimensions: emits neither width/height nor srcset, even with transformations on', async () => {
    const transformsOn = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET', transformations: true });
    const resolveMedia = makeMediaResolver(noDimsManifest, transformsOn);
    const html = await renderMarkdown('![scan](media:unknown-size.b2c3d4e5f6a7b8a1)', { resolveMedia });
    expect(html).toContain('src="/media/unknown-size.b2c3d4e5f6a7b8a1.png"');
    expect(html).not.toContain('width=');
    expect(html).not.toContain('height=');
    expect(html).not.toContain('srcset=');
    expect(html).not.toContain('sizes=');
  });

  it('raw external URL: gains no width/height/srcset (the engine cannot derive variants for it)', async () => {
    const resolveMedia = makeMediaResolver(manifest, normalizeAssets({ bucketBinding: 'MEDIA_BUCKET', transformations: true }));
    const html = await renderMarkdown('![ext](https://example.com/y.png)', { resolveMedia });
    expect(html).toBe('<p><img src="https://example.com/y.png" alt="ext"></p>');
  });
});

describe('manifestMediaResolver', () => {
  it('resolves a known hash to its delivery path and returns undefined for a miss', () => {
    const resolve = manifestMediaResolver({
      a1b2c3d4e5f6a7b8: { slug: 'blue-running-shoes', ext: 'webp', contentType: 'image/webp' },
    });
    expect(resolve({ slug: 'blue-running-shoes', hash: 'a1b2c3d4e5f6a7b8' })).toBe(
      '/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp',
    );
    // The token slug is cosmetic: the resolver builds the path from the projection's slug, so even
    // a bare-hash ref resolves to the canonical delivery path.
    expect(resolve({ slug: null, hash: 'a1b2c3d4e5f6a7b8' })).toBe(
      '/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp',
    );
    expect(resolve({ slug: null, hash: 'ffffffffffffffff' })).toBeUndefined();
  });
});
