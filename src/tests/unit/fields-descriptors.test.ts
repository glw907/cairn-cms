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
