import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import { makeMediaResolver, manifestMediaResolver } from '../../lib/render/resolve-media.js';
import { normalizeAssets } from '../../lib/media/config.js';
import type { MediaManifest } from '../../lib/media/manifest.js';

// One fixture asset whose hash matches the token the figures author below.
const resolveMedia = manifestMediaResolver({
  a1b2c3d4e5f6a7b8: { slug: 'blue-running-shoes', ext: 'webp', contentType: 'image/webp' },
});

// figure/figcaption join the base sanitize schema in Task 2; until then the floor would lift the
// unknown tags. Task 1 owns the remark step's structure, so it renders with the floor off to verify
// that shape. The sanitize survival is Task 2's contract.
const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }), {
  unsafeDisableSanitize: true,
});

const token = 'media:blue-running-shoes.a1b2c3d4e5f6a7b8';
const deliveryPath = '/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp';

describe('remarkFigure', () => {
  it('wraps a media image plus a caption paragraph (blank-line form) into a placed figure', async () => {
    const html = await renderMarkdown(
      `:::figure{.wide}\n![shoes](${token})\n\nA quiet shore at dusk.\n:::`,
      { resolveMedia },
    );
    expect(html).toContain('<figure class="cairn-place-wide">');
    expect(html).toContain(`src="${deliveryPath}"`);
    expect(html).not.toContain('media:');
    expect(html).toContain('<figcaption>A quiet shore at dusk.</figcaption>');
  });

  it('handles the no-blank-line form (image and caption in one paragraph)', async () => {
    const html = await renderMarkdown(
      `:::figure{.wide}\n![shoes](${token})\nA quiet shore at dusk.\n:::`,
      { resolveMedia },
    );
    expect(html).toContain('<figure class="cairn-place-wide">');
    expect(html).toContain(`src="${deliveryPath}"`);
    expect(html).toContain('<figcaption>A quiet shore at dusk.</figcaption>');
    // The split caption keeps no stray leading newline in the visible text.
    expect(html).not.toContain('<figcaption>\nA quiet shore at dusk.</figcaption>');
  });

  it('renders a bare :::figure with no class (the measure default)', async () => {
    const html = await renderMarkdown(
      `:::figure\n![shoes](${token})\n\nA caption.\n:::`,
      { resolveMedia },
    );
    expect(html).toContain('<figure>');
    expect(html).not.toContain('cairn-place-');
  });

  it('ignores an out-of-set class, rendering a bare figure', async () => {
    const html = await renderMarkdown(
      `:::figure{.left}\n![shoes](${token})\n\nA caption.\n:::`,
      { resolveMedia },
    );
    expect(html).toContain('<figure>');
    expect(html).not.toContain('cairn-place-');
  });

  it('renders no figcaption when there is no caption block', async () => {
    const html = await renderMarkdown(`:::figure{.wide}\n![shoes](${token})\n:::`, {
      resolveMedia,
    });
    expect(html).toContain('<figure class="cairn-place-wide">');
    expect(html).not.toContain('<figcaption>');
  });

  it('leaves the child media image resolving exactly as a bare inline image', async () => {
    const html = await renderMarkdown(`:::figure\n![shoes](${token})\n\nCap\n:::`, {
      resolveMedia,
    });
    expect(html).toContain(`src="${deliveryPath}"`);
    expect(html).not.toContain('media:');
  });

  it('unwraps the image paragraph, so the figure holds the img directly, not a <p><img></p>', async () => {
    const html = await renderMarkdown(`:::figure{.wide}\n![shoes](${token})\n\nCap\n:::`, {
      resolveMedia,
    });
    expect(html).not.toMatch(/<figure[^>]*>\s*<p>\s*<img/);
  });

  it('renders a figure without throwing when there is no media image', async () => {
    const html = await renderMarkdown(`:::figure{.wide}\n![ext](https://example.com/y.png)\n\nCap\n:::`, {
      resolveMedia,
    });
    expect(html).toContain('<figure');
  });
});

describe('remarkFigure: the sizes attribute derives from the figure placement role', () => {
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
  const resolved = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET', transformations: true });
  const resolveDetailedMedia = makeMediaResolver(manifest, resolved);
  const { renderMarkdown: renderWithSanitize } = createRenderer(defineRegistry({ components: [] }));

  it('a center-placed figure gets the center sizes hint', async () => {
    const html = await renderWithSanitize(
      `:::figure{.center}\n![shoes](${token})\n\nCap\n:::`,
      { resolveMedia: resolveDetailedMedia },
    );
    expect(html).toContain('sizes="(min-width: 800px) 800px, 100vw"');
  });

  it('a wide-placed figure gets the wide sizes hint', async () => {
    const html = await renderWithSanitize(`:::figure{.wide}\n![shoes](${token})\n\nCap\n:::`, {
      resolveMedia: resolveDetailedMedia,
    });
    expect(html).toContain('sizes="(min-width: 1200px) 1200px, 100vw"');
  });

  it('a full-placed figure gets the full-viewport sizes hint', async () => {
    const html = await renderWithSanitize(`:::figure{.full}\n![shoes](${token})\n\nCap\n:::`, {
      resolveMedia: resolveDetailedMedia,
    });
    expect(html).toContain('sizes="100vw"');
  });

  it('a bare :::figure with no class falls back to the safe full-viewport hint', async () => {
    const html = await renderWithSanitize(`:::figure\n![shoes](${token})\n\nCap\n:::`, {
      resolveMedia: resolveDetailedMedia,
    });
    expect(html).toContain('sizes="100vw"');
  });
});
