import { describe, it, expect } from 'vitest';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';

const card: ComponentDef = {
  name: 'card',
  label: 'Card',
  description: 'A bordered card',
  insertTemplate: ':::card\n\n:::',
  build: (ctx) => ctx.node,
  defaultIconByRole: { caution: 'warning' },
  attributes: { icon: fields.icon({ label: 'Icon' }) },
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

describe('defaultIcon engine fallback', () => {
  it('falls back to the engine default for a known role when the def sets no defaultIconByRole', () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'admonition',
          label: '',
          description: '',
          build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
          attributes: { icon: fields.icon({ label: 'Icon' }) },
        },
      ],
    });
    expect(reg.defaultIcon('admonition', 'warning')).toBe('warning');
  });

  it("lets a def's own defaultIconByRole override the engine default for the same role", () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'admonition',
          label: '',
          description: '',
          build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
          defaultIconByRole: { warning: 'siren' },
          attributes: { icon: fields.icon({ label: 'Icon' }) },
        },
      ],
    });
    expect(reg.defaultIcon('admonition', 'warning')).toBe('siren');
  });

  it('returns undefined for an unknown role even with an icon field', () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'admonition',
          label: '',
          description: '',
          build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
          attributes: { icon: fields.icon({ label: 'Icon' }) },
        },
      ],
    });
    expect(reg.defaultIcon('admonition', 'nope')).toBeUndefined();
  });

  it('returns undefined for a known role when the def has no icon field', () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'plain',
          label: '',
          description: '',
          build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
          attributes: { x: fields.text({ label: 'X' }) },
        },
      ],
    });
    expect(reg.defaultIcon('plain', 'warning')).toBeUndefined();
  });
});

describe('registry.iconField', () => {
  it('returns the first declared icon field name (first-wins)', () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'a',
          label: '',
          description: '',
          build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
          attributes: {
            one: fields.icon({ label: 'One' }),
            two: fields.icon({ label: 'Two' }),
          },
        },
      ],
    });
    expect(reg.iconField('a')).toBe('one');
  });
  it('returns undefined when no attribute is an icon field', () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'b',
          label: '',
          description: '',
          build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
          attributes: { x: fields.text({ label: 'X' }) },
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
            attributes: { role: fields.select({ label: 'Role', options: ['caution'] }) },
          },
        ],
      }),
    ).toThrow('cairn: component "c" sets defaultIconByRole but declares no type:\'icon\' attribute');
  });
  it('rejects a component that takes the reserved "figure" name', () => {
    const build = () =>
      defineRegistry({
        components: [
          {
            name: 'figure',
            label: 'x',
            description: 'x',
            build: () => ({ type: 'element', tagName: 'figure', properties: {}, children: [] }),
          },
        ],
      });
    // Keeps the core substring so any consumer matching it still passes.
    expect(build).toThrow('reserved directive name handled by the engine render step');
    // Names the colliding component so the developer can find it.
    expect(build).toThrow('component "figure"');
    // Points at the fix: remove it (engine now covers it) or rename it.
    expect(build).toThrow(/remove it/);
    expect(build).toThrow(/rename it/);
  });
  it('rejects a component that takes the reserved "include" name', () => {
    const build = () =>
      defineRegistry({
        components: [
          {
            name: 'include',
            label: 'x',
            description: 'x',
            build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
          },
        ],
      });
    // Keeps the core substring so any consumer matching it still passes.
    expect(build).toThrow('reserved directive name handled by the engine render step');
    // Names the colliding component so the developer can find it.
    expect(build).toThrow('component "include"');
    // Points at the fix: remove it (engine now covers it) or rename it.
    expect(build).toThrow(/remove it/);
    expect(build).toThrow(/rename it/);
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
            attributes: { icon: fields.icon({ label: 'Icon' }) },
          },
        ],
      }),
    ).not.toThrow();
  });
});
