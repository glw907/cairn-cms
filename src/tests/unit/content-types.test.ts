import { describe, it, expect } from 'vitest';
import type { FrontmatterField, ValidationResult } from '../../lib/content/types.js';
import { testAdapter, postFields } from './_content-fixture.js';

// A switch over the discriminant; if the union is wrong this fails to type-check under
// `npm run check`. The runtime body just proves each arm is reachable.
function widgetFor(field: FrontmatterField): string {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'date':
      return 'input';
    case 'boolean':
      return 'checkbox';
    case 'tags':
      return `checkboxes:${field.options.length}`;
    case 'freetags':
      return 'csv';
  }
}

describe('adapter contract types', () => {
  it('declares the two concepts with their directories', () => {
    expect(testAdapter.content.posts?.dir).toBe('src/content/posts');
    expect(testAdapter.content.pages?.dir).toBe('src/content/pages');
  });

  it('narrows each field type to its widget', () => {
    expect(postFields.map(widgetFor)).toEqual(['input', 'input', 'input', 'checkboxes:2', 'checkbox']);
  });

  it('discriminates a ValidationResult', () => {
    const ok: ValidationResult = { ok: true, data: { title: 'X' } };
    const bad: ValidationResult = { ok: false, errors: { title: 'Title is required' } };
    expect(ok.ok ? ok.data.title : null).toBe('X');
    expect(bad.ok ? null : bad.errors.title).toBe('Title is required');
  });
});
