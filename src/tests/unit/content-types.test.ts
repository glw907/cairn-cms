import { describe, it, expect, expectTypeOf } from 'vitest';
import type { NamedField } from '../../lib/content/types.js';
import { fields } from '../../lib/content/fields.js';
import { defineFieldset, type InferFieldset } from '../../lib/content/fieldset.js';
import { testAdapter, postFields } from './_content-fixture.js';

// A switch over the discriminant; if the union is wrong this fails to type-check under
// `npm run check`. The runtime body just proves each arm is reachable.
function widgetFor(field: NamedField): string {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'date':
    case 'number':
    case 'url':
    case 'icon':
      return 'input';
    case 'select':
      return `select:${field.options.length}`;
    case 'boolean':
      return 'checkbox';
    case 'multiselect':
      return field.options ? `multiselect:${field.options.length}` : 'csv';
    case 'image':
      return 'image';
    case 'reference':
      return `reference:${field.concept}`;
    case 'object':
      return `object:${Object.keys(field.fields).length}`;
    case 'array':
      return `array:${field.item.type}`;
  }
}

describe('adapter contract types', () => {
  it('declares the two concepts with their directories', () => {
    expect(testAdapter.content.posts?.dir).toBe('src/content/posts');
    expect(testAdapter.content.pages?.dir).toBe('src/content/pages');
  });

  it('narrows each field type to its widget', () => {
    expect(postFields.map(widgetFor)).toEqual(['input', 'input', 'input', 'multiselect:2', 'checkbox']);
  });
});

describe('multiselect creatable inference', () => {
  it('infers string[] when creatable and the option union when not', () => {
    const open = defineFieldset({ t: fields.multiselect({ label: 'T', options: ['a', 'b'], creatable: true }) });
    const closed = defineFieldset({ t: fields.multiselect({ label: 'T', options: ['a', 'b'] }) });
    expectTypeOf<InferFieldset<typeof open>>().toEqualTypeOf<{ t?: string[] }>();
    expectTypeOf<InferFieldset<typeof closed>>().toEqualTypeOf<{ t?: ('a' | 'b')[] }>();
  });
});
