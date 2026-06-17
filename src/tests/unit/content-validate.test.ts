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

  it('omits an absent optional tags field from the normalized data', () => {
    const fields: FrontmatterField[] = [{ type: 'tags', name: 'tags', label: 'Tags', options: ['a', 'b'] }];
    const result = validateFields(fields, {});
    expect(result.ok).toBe(true);
    if (result.ok) expect('tags' in result.data).toBe(false);
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

describe('image field', () => {
  const fields: FrontmatterField[] = [{ type: 'image', name: 'image', label: 'Hero' }];

  it('normalizes a valid object and carries a non-empty caption', () => {
    const result = validateFields(fields, {
      image: { src: 'media:a.0123456789abcdef', alt: 'x', caption: 'A line.' },
    });
    expect(result).toEqual({
      ok: true,
      data: { image: { src: 'media:a.0123456789abcdef', alt: 'x', caption: 'A line.' } },
    });
  });

  it('defaults a missing alt to an empty string and never fails on empty alt', () => {
    const result = validateFields(fields, { image: { src: 'media:a.0123456789abcdef' } });
    expect(result).toEqual({ ok: true, data: { image: { src: 'media:a.0123456789abcdef', alt: '' } } });
  });

  it('omits an empty or whitespace caption', () => {
    const result = validateFields(fields, {
      image: { src: 'media:a.0123456789abcdef', alt: 'x', caption: '   ' },
    });
    expect(result).toEqual({ ok: true, data: { image: { src: 'media:a.0123456789abcdef', alt: 'x' } } });
  });

  it('drops the key when src is empty', () => {
    const result = validateFields(fields, { image: { src: '', alt: 'x' } });
    expect(result.ok).toBe(true);
    if (result.ok) expect('image' in result.data).toBe(false);
  });

  it('drops the key when the value is absent', () => {
    const result = validateFields(fields, {});
    expect(result.ok).toBe(true);
    if (result.ok) expect('image' in result.data).toBe(false);
  });

  it('drops a malformed value without throwing', () => {
    expect(validateFields(fields, { image: 'media:a.0123456789abcdef' })).toEqual({ ok: true, data: {} });
    expect(validateFields(fields, { image: { alt: 'no src' } })).toEqual({ ok: true, data: {} });
    expect(validateFields(fields, { image: { src: 42 } })).toEqual({ ok: true, data: {} });
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

describe('tags vocabulary', () => {
  const fields: FrontmatterField[] = [
    { type: 'tags', name: 'tags', label: 'Tags', options: ['alpine', 'nordic', 'biathlon'] },
  ];

  it('accepts an in-vocabulary tag set and normalizes it', () => {
    const result = validateFields(fields, { tags: ['alpine', 'nordic'] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.tags).toEqual(['alpine', 'nordic']);
  });

  it('rejects an out-of-vocabulary value and names it', () => {
    const result = validateFields(fields, { tags: ['alpine', 'curling'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.tags).toBe('Tags contains an unknown value: curling');
  });

  it('leaves a freetags field open', () => {
    const free: FrontmatterField[] = [{ type: 'freetags', name: 'tags', label: 'Tags' }];
    const result = validateFields(free, { tags: ['anything', 'goes'] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.tags).toEqual(['anything', 'goes']);
  });
});
