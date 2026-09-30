import { describe, it, expect } from 'vitest';
import { previewMarkdown } from '../../lib/index.js';
import { defineComponent } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';

const base = {
  build: () => ({ type: 'element' as const, tagName: 'div', properties: {}, children: [] }),
  description: 'd',
  use: 'u',
};

describe('previewMarkdown', () => {
  it('serializes a component preview sample as directive markdown', () => {
    const callout = defineComponent({
      ...base,
      name: 'callout',
      label: 'Callout',
      attributes: { tone: fields.select({ label: 'Tone', options: ['note', 'tip'] }) },
      slots: [
        { name: 'title', label: 'Title', kind: 'inline' },
        { name: 'body', label: 'Body', kind: 'markdown' },
      ],
      preview: { attributes: { tone: 'note' }, slots: { title: 'Heads up', body: 'A sample body.' } },
    });
    expect(previewMarkdown(callout)).toBe(':::callout[Heads up]{tone="note"}\nA sample body.\n:::');
  });

  it('returns undefined when the component declares no preview', () => {
    const plain = defineComponent({ ...base, name: 'plain', label: 'Plain' });
    expect(previewMarkdown(plain)).toBeUndefined();
  });

  it('serializes nested slots with the four-colon fence', () => {
    const steps = defineComponent({
      ...base,
      name: 'steps',
      label: 'Steps',
      slots: [
        { name: 'title', label: 'Title', kind: 'inline' },
        {
          name: 'items',
          label: 'Items',
          kind: 'repeatable',
          itemFields: { text: fields.text({ label: 'Item' }) },
        },
      ],
      preview: { slots: { title: 'Do this', items: ['One', 'Two'] } },
    });
    expect(previewMarkdown(steps)).toBe('::::steps[Do this]\n:::items\n- One\n- Two\n:::\n::::');
  });
});
