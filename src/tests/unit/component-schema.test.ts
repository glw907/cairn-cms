import { describe, it, expect } from 'vitest';
import { emptyValues, type ComponentDef } from '../../lib/render/registry.js';
import { fields, type FieldDescriptor } from '../../lib/content/fields.js';

const cta: ComponentDef = {
  name: 'cta',
  label: 'Call to action',
  description: 'A highlighted action block.',
  use: 'Use to push the reader toward one next step.',
  build: (ctx) => ctx.node,
  attributes: {
    icon: fields.icon({ label: 'Icon' }),
    featured: fields.boolean({ label: 'Featured', default: false }),
  },
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
    { name: 'actions', label: 'Actions', kind: 'repeatable', itemFields: { text: fields.text({ label: 'Item' }) } },
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

describe('readonly attribute options', () => {
  it('accepts a frozen as-const options vocabulary', () => {
    const TONES = ['info', 'warning'] as const;
    const attributes: Record<string, FieldDescriptor> = { tone: fields.select({ label: 'Tone', options: TONES }) };
    expect((attributes.tone as { options: readonly string[] }).options).toEqual(['info', 'warning']);
  });
});
