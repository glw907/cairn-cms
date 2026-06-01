import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import { remarkDirectiveStamp } from '../../lib/render/remark-directives.js';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';
import type { Root } from 'mdast';

const callout: ComponentDef = {
  name: 'callout',
  label: 'Callout',
  description: 'd',
  build: (ctx) => ctx.node,
  attributes: [
    { key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] },
    { key: 'icon', label: 'Icon', type: 'icon' },
  ],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
    { name: 'points', label: 'Points', kind: 'repeatable', itemFields: [{ key: 'text', label: 'Item', type: 'text' }] },
  ],
};
const registry = defineRegistry({ components: [callout] });

function stamp(md: string): Root {
  const tree = unified().use(remarkParse).use(remarkDirective).parse(md) as Root;
  remarkDirectiveStamp(registry)(tree);
  return tree;
}

function hProps(node: unknown): Record<string, unknown> {
  return ((node as { data?: { hProperties?: Record<string, unknown> } }).data?.hProperties) ?? {};
}

describe('remark slot stamping', () => {
  const md = '::::callout[Heads up]{tone="warning" icon="snowflake"}\nBody line.\n\n:::points\n- One\n- Two\n:::\n::::';

  it('stamps every declared attribute onto the component node', () => {
    const tree = stamp(md);
    let props: Record<string, unknown> = {};
    visit(tree, 'containerDirective', (n) => {
      if ((n as { name: string }).name === 'callout') props = hProps(n);
    });
    expect(props.dataPrimitive).toBe('callout');
    expect(props.dataAttrTone).toBe('warning');
    expect(props.dataAttrIcon).toBe('snowflake');
  });

  it('marks the title label paragraph and the nested slot directive', () => {
    const tree = stamp(md);
    const slots: string[] = [];
    visit(tree, (n) => {
      const p = hProps(n);
      if (typeof p.dataSlot === 'string') slots.push(p.dataSlot);
    });
    expect(slots).toContain('title');
    expect(slots).toContain('points');
  });
});
