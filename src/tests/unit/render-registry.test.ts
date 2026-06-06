import { describe, it, expect } from 'vitest';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';

const card: ComponentDef = {
  name: 'card',
  label: 'Card',
  description: 'A bordered card',
  insertTemplate: ':::card\n\n:::',
  build: (ctx) => ctx.node,
  defaultIconByRole: { caution: 'warning' },
  attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }],
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

describe('registry.iconField', () => {
  it('returns the first declared icon field (first-wins)', () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'a',
          label: '',
          description: '',
          build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
          attributes: [
            { key: 'one', label: 'One', type: 'icon' },
            { key: 'two', label: 'Two', type: 'icon' },
          ],
        },
      ],
    });
    expect(reg.iconField('a')?.key).toBe('one');
  });
  it('returns undefined when no attribute is an icon field', () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'b',
          label: '',
          description: '',
          build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
          attributes: [{ key: 'x', label: 'X', type: 'text' }],
        },
      ],
    });
    expect(reg.iconField('b')).toBeUndefined();
  });
});

describe('defineRegistry icon guard', () => {
  it('throws when a component sets defaultIconByRole but declares no icon attribute', () => {
    expect(() =>
      defineRegistry({
        components: [
          {
            name: 'c',
            label: '',
            description: '',
            build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
            defaultIconByRole: { caution: 'leaf' },
            attributes: [{ key: 'role', label: 'Role', type: 'select', options: ['caution'] }],
          },
        ],
      }),
    ).toThrow('cairn: component "c" sets defaultIconByRole but declares no type:\'icon\' attribute');
  });
  it('accepts a component that declares both defaultIconByRole and an icon attribute', () => {
    expect(() =>
      defineRegistry({
        components: [
          {
            name: 'd',
            label: '',
            description: '',
            build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
            defaultIconByRole: { caution: 'leaf' },
            attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }],
          },
        ],
      }),
    ).not.toThrow();
  });
});
