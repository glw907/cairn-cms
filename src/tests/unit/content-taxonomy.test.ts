import { describe, it, expect } from 'vitest';
import { resolveTaxonomyField } from '../../lib/content/taxonomy.js';

describe('resolveTaxonomyField', () => {
  it('returns the name of the single marked top-level field', () => {
    // NamedField extends FieldBase, so `label` is required on each entry (the type-check gate).
    const fields = [
      { name: 'title', type: 'text' as const, label: 'Title' },
      { name: 'topics', type: 'multiselect' as const, label: 'Topics', taxonomy: true },
    ];
    expect(resolveTaxonomyField(fields)).toBe('topics');
  });
  it('returns null when no field is marked', () => {
    expect(resolveTaxonomyField([{ name: 'tags', type: 'multiselect' as const, label: 'Tags' }])).toBeNull();
  });
});
