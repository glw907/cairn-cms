import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import { defaultSchema } from 'hast-util-sanitize';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import { manifestMediaResolver } from '../../lib/render/resolve-media.js';
import type { Schema } from 'hast-util-sanitize';

const plain = () => createRenderer(defineRegistry({ components: [] }));

describe('render sanitize floor', () => {
  it('strips a script element from author HTML', async () => {
    const html = await plain().renderMarkdown('ok\n\n<script>alert(1)<\/script>');
    expect(html).not.toContain('alert');
  });

  it('strips an inline event handler', async () => {
    const html = await plain().renderMarkdown('<img src=x onerror="alert(1)">');
    expect(html).not.toContain('onerror');
  });

  it('neutralizes a javascript: link but keeps the text', async () => {
    const html = await plain().renderMarkdown('[click](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('click');
  });

  it('neutralizes a data: link', async () => {
    const html = await plain().renderMarkdown('[x](data:text/html,<script>alert(1)<\/script>)');
    expect(html).not.toContain('data:text/html');
  });

  it('keeps ordinary formatting', async () => {
    const html = await plain().renderMarkdown('Hello **world**');
    expect(html).toContain('<strong>world</strong>');
  });

  it('keeps benign author tags real content uses', async () => {
    const html = await plain().renderMarkdown(
      '<nav><a href="#x" class="toc-link">X</a></nav>\n\n<details><summary>More</summary>\n\nbody\n\n</details>',
    );
    expect(html).toContain('<nav>');
    expect(html).toContain('class="toc-link"');
    expect(html).toContain('<details>');
    expect(html).toContain('<summary>');
  });

  it('forces rel="noopener noreferrer" on a target="_blank" anchor', async () => {
    const html = await plain().renderMarkdown('<a href="https://x.test" target="_blank">x</a>');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('applies a custom anchorRel value', async () => {
    const r = createRenderer(defineRegistry({ components: [] }), { anchorRel: 'nofollow' });
    const html = await r.renderMarkdown('<a href="https://x.test" target="_blank">x</a>');
    expect(html).toContain('rel="nofollow"');
  });

  it('omits rel when anchorRel is false', async () => {
    const r = createRenderer(defineRegistry({ components: [] }), { anchorRel: false });
    const html = await r.renderMarkdown('<a href="https://x.test" target="_blank">x</a>');
    expect(html).not.toContain('rel=');
  });

  it('preserves the directive markers so a registered component still renders', async () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'box',
          label: '',
          description: '',
          build: (ctx) => {
            const node = ctx.node;
            node.tagName = 'section';
            node.properties = { className: ['box'] };
            return node;
          },
        },
      ],
    });
    const html = await createRenderer(reg).renderMarkdown(':::box\ncontent\n:::');
    expect(html).toContain('class="box"');
    expect(html).toContain('content');
  });

  it('a sanitizeSchema extension admits a tag while the core strip still removes a script', async () => {
    const extend = (s: Schema): Schema => ({ ...s, tagNames: [...(s.tagNames ?? []), 'figure'] });
    const r = createRenderer(defineRegistry({ components: [] }), { sanitizeSchema: extend });
    const html = await r.renderMarkdown('<figure>cap</figure>\n\n<script>alert(1)<\/script>');
    expect(html).toContain('<figure>');
    expect(html).not.toContain('alert');
  });

  it('unsafeDisableSanitize lets raw HTML through (developer-only hatch)', async () => {
    const r = createRenderer(defineRegistry({ components: [] }), { unsafeDisableSanitize: true });
    const html = await r.renderMarkdown('<img src=x onerror="alert(1)">');
    expect(html).toContain('onerror');
  });

  it('keeps a captioned placed figure on the base floor with no consumer override', async () => {
    const html = await plain().renderMarkdown(
      '<figure class="cairn-place-wide"><figcaption>cap</figcaption></figure>',
    );
    expect(html).toContain('<figure class="cairn-place-wide">');
    expect(html).toContain('<figcaption>cap</figcaption>');
  });

  it('keeps the figure tags when a consumer extend adds an unrelated tag', async () => {
    const extend = (s: Schema): Schema => ({ ...s, tagNames: [...(s.tagNames ?? []), 'aside'] });
    const r = createRenderer(defineRegistry({ components: [] }), { sanitizeSchema: extend });
    const html = await r.renderMarkdown(
      '<aside>note</aside>\n\n<figure class="cairn-place-wide"><figcaption>cap</figcaption></figure>',
    );
    expect(html).toContain('<aside>');
    expect(html).toContain('<figure class="cairn-place-wide">');
    expect(html).toContain('<figcaption>cap</figcaption>');
  });

  it('documents why the base addition is required: defaultSchema omits figure', () => {
    // hast-util-sanitize's defaultSchema does not allow figure, so the floor would strip it
    // without cairn's base addition. This guard fails if a dependency bump starts allowing it.
    expect(defaultSchema.tagNames ?? []).not.toContain('figure');
    expect(defaultSchema.tagNames ?? []).not.toContain('figcaption');
  });

  it('survives the real default floor end-to-end: the placed figure renders through createRenderer', async () => {
    const resolveMedia = manifestMediaResolver({
      a1b2c3d4e5f6a7b8: { slug: 'blue-running-shoes', ext: 'webp', contentType: 'image/webp' },
    });
    const token = 'media:blue-running-shoes.a1b2c3d4e5f6a7b8';
    const html = await plain().renderMarkdown(
      `:::figure{.wide}\n![alt](${token})\n\nA caption.\n:::`,
      { resolveMedia },
    );
    expect(html).toContain('<figure class="cairn-place-wide">');
    expect(html).toContain('src="/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp"');
    expect(html).toContain('<figcaption>A caption.</figcaption>');
  });
});

describe('render sink guard (post-dispatch)', () => {
  // A deliberately unsafe component: it routes attribute values into href and src and sets a
  // constant on* handler and inline style, the exact residual the guard closes.
  const sinkRegistry = () =>
    defineRegistry({
      components: [
        {
          name: 'sink',
          label: '',
          description: '',
          build: (ctx) =>
            h(
              'a',
              {
                href: typeof ctx.attributes.url === 'string' ? ctx.attributes.url : undefined,
                onClick: 'steal()',
                style: 'color:red',
              },
              [
                h('img', { src: typeof ctx.attributes.img === 'string' ? ctx.attributes.img : undefined }),
                ...ctx.slot('body'),
              ],
            ),
          attributes: [
            { key: 'url', label: 'URL', type: 'text' },
            { key: 'img', label: 'Image', type: 'text' },
          ],
          slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
        },
      ],
    });

  it('neutralizes a javascript: url a build routes from an attribute value', async () => {
    const html = await createRenderer(sinkRegistry()).renderMarkdown(
      ':::sink{url="javascript:alert(1)" img="javascript:alert(2)"}\nbody\n:::',
    );
    expect(html).not.toContain('javascript:');
    expect(html.toLowerCase()).not.toContain('onclick');
    expect(html).not.toContain('style=');
    expect(html).toContain('body');
  });

  it('keeps a safe url a build routes from an attribute value', async () => {
    const html = await createRenderer(sinkRegistry()).renderMarkdown(
      ':::sink{url="https://ok.test/x" img="https://ok.test/i.png"}\nbody\n:::',
    );
    expect(html).toContain('href="https://ok.test/x"');
    expect(html).toContain('src="https://ok.test/i.png"');
  });

  it('unsafeDisableSanitize lets a build-routed javascript: url through (developer-only hatch)', async () => {
    const html = await createRenderer(sinkRegistry(), { unsafeDisableSanitize: true }).renderMarkdown(
      ':::sink{url="javascript:alert(1)"}\nbody\n:::',
    );
    expect(html).toContain('javascript:');
  });
});
