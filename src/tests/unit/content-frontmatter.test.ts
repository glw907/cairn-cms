import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import {
  frontmatterFromForm,
  dateInputValue,
  serializeMarkdown,
  parseMarkdown,
} from '../../lib/content/frontmatter.js';
import type { FrontmatterField } from '../../lib/content/types.js';
import { postFields, pageFields } from './_content-fixture.js';

describe('frontmatterFromForm', () => {
  it('decodes each field by type for a post', () => {
    const form = new FormData();
    form.set('title', 'First Snow');
    form.set('date', '2026-01-05');
    form.set('description', 'It snowed.');
    form.append('tags', 'training');
    form.append('tags', 'racing');
    form.set('draft', 'on');

    expect(frontmatterFromForm(postFields, form)).toEqual({
      title: 'First Snow',
      date: '2026-01-05',
      description: 'It snowed.',
      tags: ['training', 'racing'],
      draft: true,
    });
  });

  it('treats an absent checkbox as false and absent tags as empty', () => {
    const form = new FormData();
    form.set('title', 'Draft Off');
    form.set('date', '2026-01-05');
    form.set('description', 'x');

    const data = frontmatterFromForm(postFields, form);
    expect(data.draft).toBe(false);
    expect(data.tags).toEqual([]);
  });

  it('splits, trims, and de-duplicates a free-form tags field', () => {
    const fields: FrontmatterField[] = [{ type: 'freetags', name: 'tags', label: 'Tags' }];
    const form = new FormData();
    form.set('tags', ' alpha , beta,alpha , , gamma ');

    expect(frontmatterFromForm(fields, form)).toEqual({ tags: ['alpha', 'beta', 'gamma'] });
  });

  it('treats an empty free-form tags input as an empty list', () => {
    const fields: FrontmatterField[] = [{ type: 'freetags', name: 'tags', label: 'Tags' }];
    expect(frontmatterFromForm(fields, new FormData())).toEqual({ tags: [] });
  });

  it('normalizes an absent text field to an empty string, not null', () => {
    expect(frontmatterFromForm(pageFields, new FormData())).toEqual({ title: '' });
  });

  it('reads only the declared field for a page', () => {
    const form = new FormData();
    form.set('title', 'About');
    form.set('date', 'ignored, not a page field');

    expect(frontmatterFromForm(pageFields, form)).toEqual({ title: 'About' });
  });
});

describe('dateInputValue', () => {
  it('formats a Date as YYYY-MM-DD with no timezone shift', () => {
    expect(dateInputValue(new Date('2026-05-14T00:00:00.000Z'))).toBe('2026-05-14');
  });
  it('slices an ISO datetime string to the date', () => {
    expect(dateInputValue('2026-05-14T10:30:00Z')).toBe('2026-05-14');
  });
  it('passes a bare YYYY-MM-DD string through', () => {
    expect(dateInputValue('2026-05-14')).toBe('2026-05-14');
  });
  it('returns empty for a missing, non-date, or invalid value', () => {
    expect(dateInputValue(undefined)).toBe('');
    expect(dateInputValue(null)).toBe('');
    expect(dateInputValue(42)).toBe('');
    expect(dateInputValue(new Date('nonsense'))).toBe('');
    expect(dateInputValue('not a date')).toBe('');
  });
});

describe('serialize and parse', () => {
  it('round-trips frontmatter and body', () => {
    const data = { title: 'Welcome', date: '2026-05-01', draft: false, tags: ['training'] };
    const body = '# Hello\n\nFirst post.\n';

    const out = serializeMarkdown(data, body);
    expect(out).toMatch(/^---\n/);

    const parsed = matter(out);
    expect(parsed.data).toEqual(data);
    expect(parsed.content.trim()).toBe(body.trim());
  });

  it('parses a file back into frontmatter and body', () => {
    const source = '---\ntitle: About\n---\n\nThe body.\n';
    expect(parseMarkdown(source)).toEqual({ frontmatter: { title: 'About' }, body: '\nThe body.\n' });
  });
});
