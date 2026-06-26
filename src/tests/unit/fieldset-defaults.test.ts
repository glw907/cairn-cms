import { describe, it, expect } from 'vitest';
import { fields } from '../../lib/content/fields.js';
import { fieldset, initialValues } from '../../lib/content/fieldset.js';

describe('initialValues and composition', () => {
  it('resolves literal and today defaults at render time', () => {
    const fs = fieldset({
      status: fields.select({ label: 'S', options: ['draft', 'published'], default: 'draft' }),
      date:   fields.date({ label: 'D', default: 'today' }),
    });
    expect(initialValues(fs, new Date('2026-06-25T00:00:00Z')))
      .toEqual({ status: 'draft', date: '2026-06-25' });
  });

  it('composes a shared base field set by spreading', () => {
    const base = { title: fields.text({ label: 'Title', required: true }) };
    const fs = fieldset({ ...base, body: fields.textarea({ label: 'Body' }) });
    expect(Object.keys(fs.fields)).toEqual(['title', 'body']);
  });
});
