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

  it('coerces an absent boolean to false and absent tags to an empty list', () => {
    const result = validateFields(postFields, { title: 'T', date: '2026-01-05', description: 'x' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.draft).toBe(false);
      expect(result.data.tags).toEqual([]);
    }
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
