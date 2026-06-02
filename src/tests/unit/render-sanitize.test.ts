import { describe, it, expect } from 'vitest';
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
