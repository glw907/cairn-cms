import { describe, it, expect } from 'vitest';
import { defineFieldset, fields } from '../../lib/index.js';

describe('fieldset taxonomy-marker guard', () => {
  it('throws when two multiselect fields both set taxonomy: true', () => {
    expect(() =>
      defineFieldset({
        a: fields.multiselect({ label: 'A', taxonomy: true }),
        b: fields.multiselect({ label: 'B', taxonomy: true }),
      }),
    ).toThrow(/taxonomy/);
  });

  it('names both offending keys in the error', () => {
    expect(() =>
      defineFieldset({
        a: fields.multiselect({ label: 'A', taxonomy: true }),
        b: fields.multiselect({ label: 'B', taxonomy: true }),
      }),
    ).toThrow(/"a".*"b"/);
  });

  it('allows one marked multiselect plus other un-marked multiselects', () => {
    expect(() =>
      defineFieldset({
        topics: fields.multiselect({ label: 'Topics', taxonomy: true }),
        moods: fields.multiselect({ label: 'Moods' }),
      }),
    ).not.toThrow();
  });

  it('allows zero marked fields', () => {
    expect(() =>
      defineFieldset({
        tags: fields.multiselect({ label: 'Tags' }),
      }),
    ).not.toThrow();
  });

  it('still allows one top-level marked multiselect', () => {
    expect(() => defineFieldset({ topics: fields.multiselect({ label: 'Topics', taxonomy: true }) })).not.toThrow();
  });

  it('forbids a taxonomy marker inside an object (top-level only)', () => {
    expect(() =>
      defineFieldset({ box: fields.object({ fields: { topics: fields.multiselect({ label: 'Topics', taxonomy: true }) } }) }),
    ).toThrow(/taxonomy/i);
  });

  it('forbids a taxonomy marker inside an array', () => {
    expect(() =>
      defineFieldset({ rows: fields.array(fields.multiselect({ label: 'Topics', taxonomy: true })) }),
    ).toThrow(/taxonomy/i);
  });
});
