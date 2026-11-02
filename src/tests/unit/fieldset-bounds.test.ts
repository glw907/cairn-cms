import { describe, it, expect } from 'vitest';
import { fields } from '../../lib/index.js';
import { defineFieldset } from '../../lib/content/fieldset.js';

describe('fieldset bounds guard', () => {
  it('throws when a length conflicts with max', () => {
    expect(() => defineFieldset({ t: fields.text({ label: 'T', length: 5, max: 3 }) })).toThrow(/cairn: .*"t"/);
  });

  it('throws when a length conflicts with min', () => {
    expect(() => defineFieldset({ t: fields.textarea({ label: 'T', length: 2, min: 4 }) })).toThrow(/cairn: .*"t"/);
  });

  it('throws when min exceeds max on text, textarea, number, and date', () => {
    expect(() => defineFieldset({ t: fields.text({ label: 'T', min: 9, max: 3 }) })).toThrow(/cairn: /);
    expect(() => defineFieldset({ t: fields.textarea({ label: 'T', min: 9, max: 3 }) })).toThrow(/cairn: /);
    expect(() => defineFieldset({ n: fields.number({ label: 'N', min: 2, max: 1 }) })).toThrow(/cairn: /);
    expect(() => defineFieldset({ d: fields.date({ label: 'D', min: '2026-02-01', max: '2026-01-01' }) })).toThrow(/cairn: /);
  });

  it('throws for a date bound that is not a calendar date', () => {
    expect(() => defineFieldset({ d: fields.date({ label: 'D', min: '2026-02-30' }) })).toThrow(/cairn: .*"d"/);
    expect(() => defineFieldset({ d: fields.date({ label: 'D', max: 'soon' }) })).toThrow(/cairn: .*"d"/);
  });

  it('checks a leaf inside an object', () => {
    expect(() =>
      defineFieldset({ o: fields.object({ label: 'O', fields: { t: fields.text({ label: 'T', min: 5, max: 1 }) } }) }),
    ).toThrow(/"o\.t"/);
  });

  it('accepts consistent and equal bounds', () => {
    expect(() =>
      defineFieldset({
        t: fields.text({ label: 'T', min: 3, max: 3, length: 3 }),
        n: fields.number({ label: 'N', min: 1, max: 1 }),
        d: fields.date({ label: 'D', min: '2024-02-29', max: '2024-02-29' }),
      }),
    ).not.toThrow();
  });
});
