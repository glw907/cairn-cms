import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
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
