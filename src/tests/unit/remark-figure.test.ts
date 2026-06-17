import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import { manifestMediaResolver } from '../../lib/render/resolve-media.js';

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
