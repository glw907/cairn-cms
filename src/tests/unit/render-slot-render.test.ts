import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import type { ElementContent } from 'hast';
import { createRenderer } from '../../lib/render/pipeline.js';
import { serializeComponent } from '../../lib/render/component-grammar.js';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';

const callout: ComponentDef = {
  name: 'callout',
  label: 'Callout',
  description: 'd',
  attributes: [
    { key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] },
  ],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
    { name: 'points', label: 'Points', kind: 'repeatable', itemFields: [{ key: 'text', label: 'Item', type: 'text' }] },
  ],
  build: (ctx) =>
    h('aside', { className: ['callout', `callout-${String(ctx.attributes.tone)}`] }, [
      h('p', { className: ['callout-title'] }, ctx.slot('title')),
      h('div', { className: ['callout-body'] }, ctx.slot('body')),
      h('ul', { className: ['callout-points'] }, ctx.items('points').map((item: ElementContent[]) => h('li', item))),
    ]),
};
const registry = defineRegistry({ components: [callout] });

describe('slot render path', () => {
  it('renders title, body, and repeatable items from the serialized component', async () => {
    const md = serializeComponent(callout, {
      attributes: { tone: 'warning' },
      slots: { title: 'Heads up', body: 'Be careful here.', points: ['First', 'Second'] },
    });
    const { renderMarkdown } = createRenderer(registry);
    const html = await renderMarkdown(md);
    expect(html).toContain('class="callout callout-warning"');
    expect(html).toContain('class="callout-title">Heads up');
    expect(html).toContain('Be careful here.');
    expect(html).toContain('<li>First</li>');
    expect(html).toContain('<li>Second</li>');
    // The intermediate slot markers must not leak into the output.
    expect(html).not.toContain('data-slot');
    expect(html).not.toContain('data-attr');
  });
});
