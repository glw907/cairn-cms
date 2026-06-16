import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import { makeMediaResolver } from '../../lib/render/resolve-media.js';
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
    bytes: 184320,
    width: 1600,
    height: 1200,
    createdAt: '2026-06-15T00:00:00.000Z',
  },
};

const resolved = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' });

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
  it('applies a named preset to the delivery path', async () => {
    const resolveMedia = makeMediaResolver(manifest, resolved, { preset: 'inline' });
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
});
