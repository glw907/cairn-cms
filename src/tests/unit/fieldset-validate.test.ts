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
