import { describe, it, expect } from 'vitest';
import { fields } from '../../lib/content/fields.js';

describe('fields string leaves', () => {
  it('text() returns a plain serializable descriptor', () => {
    const d = fields.text({ label: 'Title', required: true, max: 120 });
    expect(d).toEqual({ type: 'text', label: 'Title', required: true, max: 120 });
    expect(JSON.parse(JSON.stringify(d))).toEqual(d); // plain data, no functions
  });

  it('textarea() carries rows and the shared string constraints', () => {
    const d = fields.textarea({ label: 'Summary', rows: 4, max: 200 });
    expect(d).toEqual({ type: 'textarea', label: 'Summary', rows: 4, max: 200 });
  });
});

describe('fields.number', () => {
  it('returns a numeric descriptor with bounds', () => {
    expect(fields.number({ label: 'Rating', min: 1, max: 5, integer: true }))
      .toEqual({ type: 'number', label: 'Rating', min: 1, max: 5, integer: true });
  });
});

describe('fields select/multiselect', () => {
  it('select carries a closed option list', () => {
    expect(fields.select({ label: 'Status', options: ['draft', 'published'], default: 'draft' }))
      .toEqual({ type: 'select', label: 'Status', options: ['draft', 'published'], default: 'draft' });
  });
  it('multiselect supports creatable and the taxonomy marker', () => {
    expect(fields.multiselect({ label: 'Topics', creatable: true, taxonomy: true }))
      .toEqual({ type: 'multiselect', label: 'Topics', creatable: true, taxonomy: true });
  });
});

describe('fields url/email', () => {
  it('url and email are labeled leaves', () => {
    expect(fields.url({ label: 'Website' })).toEqual({ type: 'url', label: 'Website' });
    expect(fields.email({ label: 'Contact' })).toEqual({ type: 'email', label: 'Contact' });
  });
});
