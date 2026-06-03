import { describe, it, expect } from 'vitest';
import { validateFields } from '../../lib/content/validate.js';
import type { FrontmatterField } from '../../lib/content/types.js';
import { postFields, pageFields } from './_content-fixture.js';

describe('validateFields', () => {
  it('accepts a complete post and normalizes its values', () => {
    const result = validateFields(postFields, {
      title: 'First Snow',
      date: '2026-01-05',
      description: 'It snowed.',
      tags: ['training'],
      draft: true,
    });
    expect(result).toEqual({
      ok: true,
      data: {
        title: 'First Snow',
        date: '2026-01-05',
        description: 'It snowed.',
        tags: ['training'],
        draft: true,
      },
    });
  });

  it('flags each missing required field by name', () => {
    const result = validateFields(postFields, { title: '', date: '', description: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual({
        title: 'Title is required',
        date: 'Date is required',
        description: 'Description is required',
      });
    }
  });

  it('omits an absent optional boolean and absent optional tags from normalized data', () => {
    const result = validateFields(postFields, { title: 'T', date: '2026-01-05', description: 'x' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect('draft' in result.data).toBe(false);
      expect('tags' in result.data).toBe(false);
      expect(result.data).toEqual({ title: 'T', date: '2026-01-05', description: 'x' });
    }
  });

  it('keeps a present optional value and omits an empty optional string', () => {
    const fields: FrontmatterField[] = [
      { type: 'text', name: 'title', label: 'Title', required: true },
      { type: 'text', name: 'subtitle', label: 'Subtitle' },
      { type: 'boolean', name: 'draft', label: 'Draft' },
    ];
    expect(validateFields(fields, { title: 'T', subtitle: 'Sub', draft: true })).toEqual({
      ok: true,
      data: { title: 'T', subtitle: 'Sub', draft: true },
    });
    expect(validateFields(fields, { title: 'T', subtitle: '   ', draft: false })).toEqual({
      ok: true,
      data: { title: 'T' },
    });
  });

  it('requires only a title for a page', () => {
    expect(validateFields(pageFields, { title: 'About' })).toEqual({ ok: true, data: { title: 'About' } });
    expect(validateFields(pageFields, { title: '' }).ok).toBe(false);
  });

  it('accepts a JS Date for a required date field and normalizes it to YYYY-MM-DD', () => {
    // gray-matter parses an unquoted YAML date into a Date; a valid one is not "empty".
    const result = validateFields(postFields, {
      title: 'T',
      date: new Date('2026-01-05T00:00:00.000Z'),
      description: 'x',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.date).toBe('2026-01-05');
  });

  it('treats a missing required tags vocabulary as an error', () => {
    const fields: FrontmatterField[] = [
      { type: 'tags', name: 'tags', label: 'Tags', options: ['a'], required: true },
    ];
    const result = validateFields(fields, { tags: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.tags).toBe('Tags is required');
  });
});

describe('date validation', () => {
  const fields: FrontmatterField[] = [{ type: 'date', name: 'date', label: 'Date', required: true }];

  it('accepts a real calendar date', () => {
    const result = validateFields(fields, { date: '2026-01-01' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.date).toBe('2026-01-01');
  });

  it('rejects a date-rollover value', () => {
    const result = validateFields(fields, { date: '2026-02-30' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.date).toBe('Date must be a valid date (YYYY-MM-DD)');
  });

  it('rejects a non-canonical format', () => {
    const result = validateFields(fields, { date: '2026-1-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.date).toBe('Date must be a valid date (YYYY-MM-DD)');
  });

  it('still coerces a parsed YAML Date and passes', () => {
    const result = validateFields(fields, { date: new Date(Date.UTC(2026, 0, 1)) });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.date).toBe('2026-01-01');
  });

  it('omits an empty optional date with no error', () => {
    const optional: FrontmatterField[] = [{ type: 'date', name: 'date', label: 'Date' }];
    const result = validateFields(optional, { date: '' });
    expect(result.ok).toBe(true);
    if (result.ok) expect('date' in result.data).toBe(false);
  });
});
