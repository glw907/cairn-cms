import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
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

  it('emits an island boundary for an empty-body attribute-only hydrate directive', async () => {
    const registry = defineRegistry({
      components: [
        {
          name: 'converter',
          label: '',
          description: '',
          hydrate: true,
          attributes: { from: { type: 'text', label: 'From' } as never, rate: { type: 'number', label: 'Rate' } as never },
          build: () => h('p', { className: ['fallback'] }, ['1 mi = 1.609 km']),
        },
      ],
    });
    const { renderMarkdown } = createRenderer(registry);
    const html = await renderMarkdown(':::converter{from="mi" rate="1.609"}\n:::');
    expect(html).toContain('data-cairn-island="converter"');
    expect(html).toContain('class="fallback"');
    // the number field is a JSON number in the escaped prop payload (rehypeStringify escapes the
    // JSON double-quotes as the &#x22; hex entity, not &quot;); the absence of a quote before 1.609
    // is what proves number coercion rather than a quoted string.
    expect(html).toMatch(/data-cairn-props="[^"]*&#x22;rate&#x22;:1\.609/);
  });
});
