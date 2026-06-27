import { describe, it, expect } from 'vitest';
import type { NamedField, ValidationResult } from '../../lib/content/types.js';
import { testAdapter, postFields } from './_content-fixture.js';

// A switch over the discriminant; if the union is wrong this fails to type-check under
// `npm run check`. The runtime body just proves each arm is reachable.
function widgetFor(field: NamedField): string {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'date':
    case 'datetime':
    case 'number':
    case 'url':
    case 'email':
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

  it('discriminates a ValidationResult', () => {
    const ok: ValidationResult = { ok: true, data: { title: 'X' } };
    const bad: ValidationResult = { ok: false, errors: { title: 'Title is required' } };
    expect(ok.ok ? ok.data.title : null).toBe('X');
    expect(bad.ok ? null : bad.errors.title).toBe('Title is required');
  });
});
