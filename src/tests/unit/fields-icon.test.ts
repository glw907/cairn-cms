import { describe, it, expect, expectTypeOf } from 'vitest';
import { fields } from '../../lib/content/fields.js';
import { fieldset, type InferFieldset } from '../../lib/content/fieldset.js';

describe('fields.icon', () => {
  it('constructs a plain icon descriptor', () => {
    expect(fields.icon({ label: 'Icon' })).toEqual({ type: 'icon', label: 'Icon' });
  });
  it('validates a required icon as a name string and drops an empty optional', () => {
    const fs = fieldset({ glyph: fields.icon({ label: 'Glyph', required: true }) });
    expect(fs.validate({ glyph: 'leaf' }, '')).toEqual({ ok: true, data: { glyph: 'leaf' } });
    expect(fs.validate({}, '').ok).toBe(false);
    expect(fieldset({ glyph: fields.icon({ label: 'Glyph' }) }).validate({}, '')).toEqual({ ok: true, data: {} });
  });
  it('infers a string value', () => {
    const fs = fieldset({ glyph: fields.icon({ label: 'Glyph', required: true }) });
    expectTypeOf<InferFieldset<typeof fs>>().toEqualTypeOf<{ glyph: string }>();
  });
});
