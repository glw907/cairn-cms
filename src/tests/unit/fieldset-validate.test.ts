import { describe, it, expect } from 'vitest';
import { fields } from '../../lib/content/fields.js';
import { fieldset } from '../../lib/content/fieldset.js';

const fs = fieldset({
  title:  fields.text({ label: 'Title', required: true, max: 5 }),
  count:  fields.number({ label: 'Count', min: 1, max: 3 }),
  status: fields.select({ label: 'Status', options: ['draft', 'published'] }),
  site:   fields.url({ label: 'Site' }),
});

describe('fieldset.validate', () => {
  it('normalizes valid input and drops empty optionals', () => {
    const r = fs.validate({ title: 'Hi', count: '2', status: 'draft', site: '' }, '');
    expect(r).toEqual({ ok: true, data: { title: 'Hi', count: 2, status: 'draft' } });
  });
  it('flags a missing required field by key', () => {
    const r = fs.validate({ title: '' }, '');
    expect(r).toEqual({ ok: false, errors: { title: 'Title is required' } });
  });
  it('enforces number bounds, select membership, and url format', () => {
    expect(fs.validate({ title: 'Hi', count: '9' }, '').ok).toBe(false);
    expect(fs.validate({ title: 'Hi', status: 'nope' }, '').ok).toBe(false);
    expect(fs.validate({ title: 'Hi', site: 'not a url' }, '').ok).toBe(false);
  });
  it('exposes Standard Schema with a single-segment path', () => {
    const issues = (fs['~standard'].validate({ frontmatter: { title: '' }, body: '' }) as any).issues;
    expect(issues[0].path).toEqual(['title']);
  });
});

describe('fieldset.validate edge cases', () => {
  const edge = fieldset({
    n: fields.number({ label: 'N' }), // unbounded, so no max masks a non-finite value
    contact: fields.email({ label: 'Contact' }),
  });

  it('rejects a non-finite number', () => {
    expect(edge.validate({ n: 'Infinity' }, '').ok).toBe(false);
    expect(edge.validate({ n: '-Infinity' }, '').ok).toBe(false);
    expect(edge.validate({ n: '1e400' }, '').ok).toBe(false); // overflows to Infinity
    expect(edge.validate({ n: '42' }, '')).toEqual({ ok: true, data: { n: 42 } });
  });

  it('rejects an email with more than one at-sign', () => {
    expect(edge.validate({ contact: 'a@@b.c' }, '').ok).toBe(false);
    expect(edge.validate({ contact: 'a@b@c.d' }, '').ok).toBe(false);
    expect(edge.validate({ contact: 'a@b.c' }, '')).toEqual({ ok: true, data: { contact: 'a@b.c' } });
  });
});

describe('fieldset text constraints (v1 parity)', () => {
  const fs = fieldset({
    title: fields.text({ label: 'Title', max: 5 }),
    code:  fields.text({ label: 'Code', pattern: '^[A-Z]{3}$' }),
  });
  it('enforces max length (the old fixture masked this)', () => {
    expect(fs.validate({ title: 'toolong' }, '').ok).toBe(false);
    expect(fs.validate({ title: 'ok' }, '')).toEqual({ ok: true, data: { title: 'ok' } });
  });
  it('enforces a pattern', () => {
    expect(fs.validate({ code: 'abc' }, '').ok).toBe(false);
    expect(fs.validate({ code: 'ABC' }, '')).toEqual({ ok: true, data: { code: 'ABC' } });
  });
  it('throws on a bad pattern at fieldset() construction', () => {
    expect(() => fieldset({ x: fields.text({ label: 'X', pattern: '(' }) })).toThrow(/X/);
  });
});

describe('fieldset date bounds (v1 parity)', () => {
  const fs = fieldset({ d: fields.date({ label: 'D', min: '2020-01-01', max: '2020-12-31' }) });
  it('rejects a date outside the bounds', () => {
    expect(fs.validate({ d: '2019-06-01' }, '').ok).toBe(false);
    expect(fs.validate({ d: '2021-06-01' }, '').ok).toBe(false);
    expect(fs.validate({ d: '2020-06-01' }, '')).toEqual({ ok: true, data: { d: '2020-06-01' } });
  });
});

describe('fieldset parsed-YAML input symmetry', () => {
  const fs = fieldset({ n: fields.number({ label: 'N', min: 0 }), t: fields.datetime({ label: 'T' }) });
  it('accepts a parsed numeric value, not only a form string', () => {
    expect(fs.validate({ n: 5 }, '')).toEqual({ ok: true, data: { n: 5 } });  // a number, not '5'
    expect(fs.validate({ n: 0 }, '')).toEqual({ ok: true, data: { n: 0 } });  // 0 is a real value, not empty
  });
});
