import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import { createMediaResolver, manifestMediaResolver } from '../../lib/render/resolve-media.js';
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

const media = { bucketBinding: 'MEDIA_BUCKET' };

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

const { render } = createRenderer();

describe('cairn media resolution', () => {
  it('rewrites a media token to the canonical delivery path', async () => {
    const resolveMedia = createMediaResolver(media, manifest);
    const html = await render({ body: '![shoes](media:blue-running-shoes.a1b2c3d4e5f6a7b8)', resolveMedia });
    expect(html).toContain('src="/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp"');
    expect(html).not.toContain('media:');
  });
  it('resolves the bare-hash form to the canonical slug from the manifest entry', async () => {
    const resolveMedia = createMediaResolver(media, manifest);
    const html = await render({ body: '![shoes](media:a1b2c3d4e5f6a7b8)', resolveMedia });
    expect(html).toContain('src="/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp"');
  });
  it('serves the bare full-size path, never a /cdn-cgi/image URL', async () => {
    const resolveMedia = createMediaResolver(media, manifest);
    const html = await render({ body: '![shoes](media:blue-running-shoes.a1b2c3d4e5f6a7b8)', resolveMedia });
    expect(html).toContain('src="/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp"');
    expect(html).not.toContain('/cdn-cgi/image');
  });
  it('marks an unknown hash with the broken-media class and does not throw', async () => {
    const resolveMedia = createMediaResolver(media, {});
    const html = await render({ body: '![gone](media:blue-running-shoes.a1b2c3d4e5f6a7b8)', resolveMedia });
    expect(html).toContain('cairn-broken-media');
    expect(html).toContain('title="Missing media asset"');
  });
  it('leaves a non-media image src untouched', async () => {
    const resolveMedia = createMediaResolver(media, manifest);
    const html = await render({ body: '![ext](https://example.com/y.png)', resolveMedia });
    expect(html).toContain('src="https://example.com/y.png"');
  });
  it('leaves a media token inert when no resolver is provided', async () => {
    // With no resolver the plugin returns early, so the token is neither rewritten to a delivery
    // path nor marked broken. The sanitize floor then strips the unresolved media: src (the schema
    // admits media on no protocol allowlist), so the inert image carries neither a path nor the
    // broken-media marker. This is the asymmetry with the cairn: link case, whose href survives the
    // floor because the schema admits the cairn href scheme.
    const html = await render({ body: '![x](media:blue-running-shoes.a1b2c3d4e5f6a7b8)' });
    expect(html).not.toContain('/media/');
    expect(html).not.toContain('cairn-broken-media');
  });
  it('resolves nothing when no media block is declared, and resolves a hash with a bucket binding', () => {
    const ref = { slug: 'blue-running-shoes', hash: 'a1b2c3d4e5f6a7b8' };
    expect(createMediaResolver(undefined, manifest)(ref)).toBeUndefined();
    expect(createMediaResolver({ bucketBinding: 'B' }, manifest)(ref)).toBe(
      '/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp',
    );
  });
});

describe('intrinsic dimensions', () => {
  it('managed media with known dimensions: emits width/height and no srcset', async () => {
    const resolveMedia = createMediaResolver(media, manifest);
    const html = await render({ body: '![shoes](media:blue-running-shoes.a1b2c3d4e5f6a7b8)', resolveMedia });
    expect(html).toContain('width="1600"');
    expect(html).toContain('height="1200"');
    expect(html).not.toContain('srcset=');
    expect(html).not.toContain('sizes=');
  });

  it('managed media with no recorded dimensions: emits neither width nor height', async () => {
    const resolveMedia = createMediaResolver(media, noDimsManifest);
    const html = await render({ body: '![scan](media:unknown-size.b2c3d4e5f6a7b8a1)', resolveMedia });
    expect(html).toContain('src="/media/unknown-size.b2c3d4e5f6a7b8a1.png"');
    expect(html).not.toContain('width=');
    expect(html).not.toContain('height=');
  });

  it('raw external URL: gains no width or height', async () => {
    const resolveMedia = createMediaResolver(media, manifest);
    const html = await render({ body: '![ext](https://example.com/y.png)', resolveMedia });
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
