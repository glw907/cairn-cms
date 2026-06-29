import { describe, it, expect } from 'vitest';
import { fieldset, fields } from '../../lib/index.js';

describe('fieldset taxonomy-marker guard', () => {
  it('throws when two multiselect fields both set taxonomy: true', () => {
    expect(() =>
      fieldset({
        a: fields.multiselect({ label: 'A', taxonomy: true }),
        b: fields.multiselect({ label: 'B', taxonomy: true }),
      }),
    ).toThrow(/taxonomy/);
  });

  it('names both offending keys in the error', () => {
    expect(() =>
      fieldset({
        a: fields.multiselect({ label: 'A', taxonomy: true }),
        b: fields.multiselect({ label: 'B', taxonomy: true }),
      }),
    ).toThrow(/"a".*"b"/);
  });

  it('allows one marked multiselect plus other un-marked multiselects', () => {
    expect(() =>
      fieldset({
        topics: fields.multiselect({ label: 'Topics', taxonomy: true }),
        moods: fields.multiselect({ label: 'Moods' }),
      }),
    ).not.toThrow();
  });

  it('allows zero marked fields', () => {
    expect(() =>
      fieldset({
        tags: fields.multiselect({ label: 'Tags' }),
      }),
    ).not.toThrow();
  });

  it('still allows one top-level marked multiselect', () => {
    expect(() => fieldset({ topics: fields.multiselect({ label: 'Topics', taxonomy: true }) })).not.toThrow();
  });

  it('forbids a taxonomy marker inside an object (top-level only)', () => {
    expect(() =>
      fieldset({ box: fields.object({ fields: { topics: fields.multiselect({ label: 'Topics', taxonomy: true }) } }) }),
    ).toThrow(/taxonomy/i);
  });

  it('forbids a taxonomy marker inside an array', () => {
    expect(() =>
      fieldset({ rows: fields.array(fields.multiselect({ label: 'Topics', taxonomy: true })) }),
    ).toThrow(/taxonomy/i);
  });
});
