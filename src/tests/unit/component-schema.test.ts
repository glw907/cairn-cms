import { describe, it, expect } from 'vitest';
import { emptyValues, type ComponentDef } from '../../lib/render/registry.js';

const cta: ComponentDef = {
  name: 'cta',
  label: 'Call to action',
  description: 'A highlighted action block.',
  use: 'Use to push the reader toward one next step.',
  build: (ctx) => ctx.node,
  attributes: [
    { key: 'icon', label: 'Icon', type: 'icon' },
    { key: 'featured', label: 'Featured', type: 'boolean', default: false },
  ],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
    { name: 'actions', label: 'Actions', kind: 'repeatable', itemFields: [{ key: 'text', label: 'Item', type: 'text' }] },
  ],
};

describe('emptyValues', () => {
  it('seeds attribute defaults and empty slot values from the schema', () => {
    expect(emptyValues(cta)).toEqual({
      attributes: { icon: '', featured: false },
      slots: { title: '', body: '', actions: [] },
    });
  });

  it('returns empty maps for a component with no attributes or slots', () => {
    const bare: ComponentDef = { name: 'rule', label: 'Rule', description: 'A divider.', use: 'Separate sections.', build: (ctx) => ctx.node };
    expect(emptyValues(bare)).toEqual({ attributes: {}, slots: {} });
  });
});
