import { describe, it, expect } from 'vitest';
import { serializeComponent } from '../../lib/render/component-grammar.js';
import type { ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n, description: 'd', use: 'u' };

const card: ComponentDef = {
  ...base, name: 'card', label: 'Card',
  attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline' },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
} as ComponentDef;

describe('serializeComponent flat', () => {
  it('emits a title label, an attribute block, and the unmarked body', () => {
    const md = serializeComponent(card, {
      attributes: { icon: 'snowflake' },
      slots: { title: 'Lessons', body: 'All season long.' },
    });
    expect(md).toBe(':::card[Lessons]{icon="snowflake"}\nAll season long.\n:::');
  });

  it('omits an empty attribute and an empty title', () => {
    const md = serializeComponent(card, { attributes: { icon: '' }, slots: { title: '', body: 'Body only.' } });
    expect(md).toBe(':::card\nBody only.\n:::');
  });

  it('escapes a double quote in an attribute value', () => {
    const md = serializeComponent(card, { attributes: { icon: 'a"b' }, slots: { title: '', body: 'x' } });
    expect(md).toBe(':::card{icon="a\\"b"}\nx\n:::');
  });
});
