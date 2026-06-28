import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';

describe('createRenderer', () => {
  it('empty-registry renderer renders plain markdown', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    expect(await renderMarkdown('# Hi\n\nText')).toContain('<h1');
  });

  it('renders plain markdown with no registry argument', async () => {
    const { renderMarkdown } = createRenderer();
    const html = await renderMarkdown('# Hello\n\nA paragraph.');
    expect(html).toContain('<h1');
    expect(html).toContain('Hello');
    expect(html).toContain('<p>A paragraph.</p>');
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
          build: (ctx) => {
            const node = ctx.node;
            node.tagName = 'section';
            node.properties = { className: ['box'] };
            return node;
          },
        },
      ],
    });
    const { renderMarkdown } = createRenderer(reg);
    const html = await renderMarkdown(':::box\ncontent\n:::');
    expect(html).toContain('class="box"');
    expect(html).toContain('data-rise="0"');
  });

  it('labels GFM task-list checkboxes from their item text so axe finds no unlabeled control', async () => {
    // remark-gfm emits a real <input type="checkbox" disabled> with no accessible name, which axe's
    // `label` rule flags as a critical violation even though the box is read-only. The pipeline gives
    // each task-list checkbox an aria-label derived from its item text (the visible label), so the
    // control carries its name programmatically while the engine still ships the real disabled input.
    const { renderMarkdown } = createRenderer();
    const html = await renderMarkdown('- [x] Write the draft\n- [ ] Publish it');
    expect(html).toContain('class="task-list-item"');
    expect(html).toContain('type="checkbox"');
    // Each checkbox names itself from the adjacent item text, in source order.
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*aria-label="Write the draft"/);
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*aria-label="Publish it"/);
  });
});
