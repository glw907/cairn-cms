import { describe, it, expect } from 'vitest';
import { generateComponentReference } from '../../lib/render/component-reference.js';
import { defineComponent, defineRegistry } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';

const base = { build: () => ({ type: 'element' as const, tagName: 'div', properties: {}, children: [] }) };
const card = defineComponent({
  ...base, name: 'card', label: 'Card', description: 'A bordered content block.', use: 'Group related copy with a heading.',
  attributes: { icon: fields.icon({ label: 'Icon' }) },
  slots: [{ name: 'title', label: 'Title', kind: 'inline' }, { name: 'body', label: 'Body', kind: 'markdown' }],
});

describe('generateComponentReference', () => {
  const doc = generateComponentReference(defineRegistry({ components: [card] }), {
    title: 'EC Nordic components',
    summary: 'The UI building blocks available in markdown content.',
  });

  it('opens with the llms.txt-style H1 and blockquote header', () => {
    expect(doc.startsWith('# EC Nordic components\n\n> The UI building blocks available in markdown content.\n')).toBe(true);
  });

  it('documents each component with label, name, description, and use', () => {
    expect(doc).toContain('## Card (`:::card`)');
    expect(doc).toContain('A bordered content block.');
    expect(doc).toContain('**When to use:** Group related copy with a heading.');
  });

  it('shows a fenced directive example for the component', () => {
    expect(doc).toMatch(/```[\s\S]*:::card\[Title\]\{icon="…"\}[\s\S]*```/);
  });
});
