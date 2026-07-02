import { describe, it, expect, vi, afterEach } from 'vitest';
import { fieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';
import { log } from '../../lib/log/index.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fieldset behavior.validate', () => {
  const fs = fieldset(
    { min: fields.number({ label: 'Min' }), max: fields.number({ label: 'Max' }) },
    { behavior: { max: { validate: (value, siblings) => (Number(value) < Number(siblings.min) ? 'Max below min.' : null) } } },
  );
  it('reports a cross-field error keyed to the field', () => {
    const result = fs.validate({ min: 5, max: 2 }, '');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.max).toBe('Max below min.');
  });
  it('passes when the rule holds', () => {
    expect(fs.validate({ min: 1, max: 9 }, '').ok).toBe(true);
  });
  it('rejects a behavior key that names no field', () => {
    expect(() => fieldset({ a: fields.text({ label: 'A' }) }, { behavior: { b: { validate: () => null } } })).toThrow(/not a declared field/);
  });

  it('treats a field as valid and logs, rather than throwing, when its behavior.validate throws', () => {
    const throwing = fieldset(
      { a: fields.text({ label: 'A' }) },
      {
        behavior: {
          a: {
            validate: () => {
              throw new Error('boom');
            },
          },
        },
      },
    );
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const result = throwing.validate({ a: 'value' }, '');
    expect(result.ok).toBe(true);
    expect(warn).toHaveBeenCalledWith('content.field_behavior_error', { field: 'a', error: 'boom' });
  });
});
