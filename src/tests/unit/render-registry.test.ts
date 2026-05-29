import { describe, it, expect } from 'vitest';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';

const card: ComponentDef = {
  name: 'card',
  label: 'Card',
  description: 'A bordered card',
  insertTemplate: ':::card\n\n:::',
  build: (node) => node,
  defaultIconByRole: { caution: 'warning' },
};

describe('defineRegistry', () => {
  it('looks a component up by name', () => {
    const reg = defineRegistry({ components: [card] });
    expect(reg.get('card')).toBe(card);
    expect(reg.get('missing')).toBeUndefined();
  });

  it('lists the declared names', () => {
    expect(defineRegistry({ components: [card] }).names).toEqual(['card']);
  });

  it('resolves a role default icon, and undefined without a matching role', () => {
    const reg = defineRegistry({ components: [card] });
    expect(reg.defaultIcon('card', 'caution')).toBe('warning');
    expect(reg.defaultIcon('card')).toBeUndefined();
    expect(reg.defaultIcon('missing', 'caution')).toBeUndefined();
  });
});
