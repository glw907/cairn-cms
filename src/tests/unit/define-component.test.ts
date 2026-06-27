import { describe, it, expect } from 'vitest';
import { defineComponent } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';
import type { Element } from 'hast';

const build = (): Element => ({ type: 'element', tagName: 'div', properties: {}, children: [] });

describe('defineComponent', () => {
  it('builds an attributeSchema and returns the def', () => {
    const def = defineComponent({
      name: 'callout', label: 'Callout', description: '', build,
      attributes: { tone: fields.select({ label: 'Tone', required: true, options: ['note', 'tip'] }) },
    });
    expect(def.attributeSchema.validate({}, '').ok).toBe(false); // tone required
    expect(def.attributeSchema.validate({ tone: 'note' }, '').ok).toBe(true);
  });
  it('rejects a non-scalar attribute type at declaration', () => {
    expect(() => defineComponent({
      name: 'bad', label: 'Bad', description: '', build,
      attributes: { hero: fields.image({ label: 'Hero' }) },
    })).toThrow(/single-value scalar/);
  });
  it('routes a per-attribute behavior.validate through the schema', () => {
    const def = defineComponent({
      name: 'range', label: 'Range', description: '', build,
      attributes: { min: fields.number({ label: 'Min' }), max: fields.number({ label: 'Max' }) },
      behavior: { max: { validate: (v, s) => (Number(v) < Number(s.min) ? 'Max below min.' : null) } },
    });
    const r = def.attributeSchema.validate({ min: 5, max: 2 }, '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.max).toBe('Max below min.');
  });
});
