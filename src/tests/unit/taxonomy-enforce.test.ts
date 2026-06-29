import { describe, it, expect } from 'vitest';
import type { NamedField } from '../../lib/content/types.js';
import {
  resolveAllowed,
  unlistedTags,
  closeTaxonomyField,
  enforceTaxonomy
} from '../../lib/content/taxonomy-enforce.js';

describe('resolveAllowed', () => {
  it('unions the vocabulary with prior tags, deduped in first-seen order', () => {
    expect(resolveAllowed(['a', 'b'], ['b', 'orphan'])).toEqual(['a', 'b', 'orphan']);
  });

  it('returns the vocabulary alone when there are no prior tags', () => {
    expect(resolveAllowed(['a', 'b'], [])).toEqual(['a', 'b']);
  });

  it('returns the prior tags alone when the vocabulary is empty', () => {
    expect(resolveAllowed([], ['orphan'])).toEqual(['orphan']);
  });
});

describe('unlistedTags', () => {
  it('returns the prior tags absent from the vocabulary', () => {
    expect(unlistedTags(['a', 'b'], ['b', 'orphan'])).toEqual(['orphan']);
  });

  it('returns empty when every prior tag is in the vocabulary', () => {
    expect(unlistedTags(['a', 'b'], ['a', 'b'])).toEqual([]);
  });
});

describe('closeTaxonomyField', () => {
  const fields: NamedField[] = [
    { name: 'title', type: 'text', label: 'Title' },
    {
      name: 'topics',
      type: 'multiselect',
      label: 'Topics',
      taxonomy: true,
      creatable: true
    }
  ];

  it('sets options and creatable:false on the taxonomy field, leaving others untouched', () => {
    const result = closeTaxonomyField(fields, ['a', 'b']);
    const topics = result.find((f) => f.name === 'topics');
    expect(topics).toMatchObject({
      name: 'topics',
      type: 'multiselect',
      options: ['a', 'b'],
      creatable: false
    });
    // Every other field is unchanged (referentially the same object is fine; deep-equal here).
    expect(result.find((f) => f.name === 'title')).toEqual(fields[0]);
  });

  it('returns the input unchanged when there is no taxonomy field', () => {
    const noTaxonomy: NamedField[] = [
      { name: 'title', type: 'text', label: 'Title' },
      { name: 'body', type: 'textarea', label: 'Body' }
    ];
    const result = closeTaxonomyField(noTaxonomy, ['a', 'b']);
    expect(result).toEqual(noTaxonomy);
  });
});

describe('enforceTaxonomy', () => {
  it('returns undefined when every submitted value is allowed', () => {
    expect(enforceTaxonomy(['a'], ['a', 'b'])).toBeUndefined();
  });

  it('returns a message naming the first unlisted value', () => {
    const message = enforceTaxonomy(['a', 'c'], ['a', 'b']);
    expect(message).toBeDefined();
    expect(message).toContain('c');
  });

  it('passes an orphan that is in the allowed union', () => {
    expect(enforceTaxonomy(['orphan'], ['a', 'orphan'])).toBeUndefined();
  });
});
