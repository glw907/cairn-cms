import { describe, it, expect } from 'vitest';
import { fields } from '../../lib/content/fields.js';
import { defineFieldset, initialValues } from '../../lib/content/fieldset.js';

describe('initialValues and composition', () => {
  it('resolves literal and today defaults at render time', () => {
    const fs = defineFieldset({
      status: fields.select({ label: 'S', options: ['draft', 'published'], default: 'draft' }),
      date:   fields.date({ label: 'D', default: 'today' }),
    });
    expect(initialValues(fs, new Date('2026-06-25T00:00:00Z')))
      .toEqual({ status: 'draft', date: '2026-06-25' });
  });

  it('carries a number default, including 0, and a list default through', () => {
    const fs = defineFieldset({
      five: fields.number({ label: 'N', default: 5 }),
      zero: fields.number({ label: 'Z', default: 0 }),
      tags: fields.multiselect({ label: 'T', options: ['a', 'b'], default: ['a'] }),
    });
    expect(initialValues(fs)).toEqual({ five: 5, zero: 0, tags: ['a'] });
  });

  it('writes no key for an empty list default', () => {
    const fs = defineFieldset({ tags: fields.multiselect({ label: 'T', options: ['a'], default: [] }) });
    expect(initialValues(fs)).toEqual({});
  });

  it('composes a shared base field set by spreading', () => {
    const base = { title: fields.text({ label: 'Title', required: true }) };
    const fs = defineFieldset({ ...base, body: fields.textarea({ label: 'Body' }) });
    expect(Object.keys(fs.fields)).toEqual(['title', 'body']);
  });
});
