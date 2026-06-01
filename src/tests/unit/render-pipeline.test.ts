import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';

describe('createRenderer', () => {
  it('empty-registry renderer renders plain markdown', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    expect(await renderMarkdown('# Hi\n\nText')).toContain('<h1');
  });

  it('exposes the remark/rehype plugin arrays for editor-preview wiring', () => {
    const r = createRenderer(defineRegistry({ components: [] }));
    expect(Array.isArray(r.remarkPlugins)).toBe(true);
    expect(Array.isArray(r.rehypePlugins)).toBe(true);
  });

  it('renders a registered component and stamps the data-rise ordinal', async () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'box',
          label: '',
          description: '',
          insertTemplate: '',
          build: (node) => {
            node.tagName = 'section';
            node.properties = { className: ['box'] };
            return node;
          },
        },
      ],
    });
    const { renderMarkdown } = createRenderer(reg, { stagger: true });
    const html = await renderMarkdown(':::box\ncontent\n:::');
    expect(html).toContain('class="box"');
    expect(html).toContain('data-rise="0"');
  });
});
