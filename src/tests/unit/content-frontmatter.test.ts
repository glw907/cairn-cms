import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import {
  frontmatterFromForm,
  dateInputValue,
  datetimeInputValue,
  isCalendarDate,
  serializeMarkdown,
  parseMarkdown,
} from '../../lib/content/frontmatter.js';
import type { NamedField } from '../../lib/content/types.js';
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

  it('reads a closed multiselect from getAll', () => {
    const fields: NamedField[] = [
      { type: 'multiselect', name: 'tags', label: 'Tags', options: ['training', 'racing'] },
    ];
    const form = new FormData();
    form.append('tags', 'training');
    form.append('tags', 'racing');
    expect(frontmatterFromForm(fields, form)).toEqual({ tags: ['training', 'racing'] });
  });

  it('comma-splits an open multiselect (no options), trimming and de-duplicating', () => {
    const fields: NamedField[] = [{ type: 'multiselect', name: 'tags', label: 'Tags' }];
    const form = new FormData();
    form.set('tags', ' alpha , beta,alpha , , gamma ');

    expect(frontmatterFromForm(fields, form)).toEqual({ tags: ['alpha', 'beta', 'gamma'] });
  });

  it('comma-splits a creatable multiselect even when it carries options', () => {
    const fields: NamedField[] = [
      { type: 'multiselect', name: 'tags', label: 'Tags', options: ['training'], creatable: true },
    ];
    const form = new FormData();
    form.set('tags', 'training, ad-hoc');

    expect(frontmatterFromForm(fields, form)).toEqual({ tags: ['training', 'ad-hoc'] });
  });

  it('treats an empty multiselect input as an empty list', () => {
    const fields: NamedField[] = [{ type: 'multiselect', name: 'tags', label: 'Tags' }];
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

  it('assembles an image field from its src, alt, and caption sub-fields', () => {
    const fields: NamedField[] = [{ type: 'image', name: 'image', label: 'Hero' }];
    const form = new FormData();
    form.set('image.src', 'media:a.0123456789abcdef');
    form.set('image.alt', 'A snowy ridge');
    form.set('image.caption', 'Above the treeline.');

    expect(frontmatterFromForm(fields, form)).toEqual({
      image: { src: 'media:a.0123456789abcdef', alt: 'A snowy ridge', caption: 'Above the treeline.' },
    });
  });

  it('omits an empty caption from an image field', () => {
    const fields: NamedField[] = [{ type: 'image', name: 'image', label: 'Hero' }];
    const form = new FormData();
    form.set('image.src', 'media:a.0123456789abcdef');
    form.set('image.alt', 'A snowy ridge');
    form.set('image.caption', '   ');

    expect(frontmatterFromForm(fields, form)).toEqual({
      image: { src: 'media:a.0123456789abcdef', alt: 'A snowy ridge' },
    });
  });

  it('omits the whole image key when src is empty', () => {
    const fields: NamedField[] = [{ type: 'image', name: 'image', label: 'Hero' }];
    const form = new FormData();
    form.set('image.src', '');
    form.set('image.alt', 'orphaned alt');
    form.set('image.caption', 'orphaned caption');

    expect('image' in frontmatterFromForm(fields, form)).toBe(false);
  });

  it('commits the decorative flag with an empty alt when the form marks it decorative', () => {
    const fields: NamedField[] = [{ type: 'image', name: 'image', label: 'Hero' }];
    const form = new FormData();
    form.set('image.src', 'media:a.0123456789abcdef');
    form.set('image.alt', '');
    form.set('image.decorative', 'true');

    expect(frontmatterFromForm(fields, form)).toEqual({
      image: { src: 'media:a.0123456789abcdef', alt: '', decorative: true },
    });
  });

  it('omits the decorative key for a described hero with no decorative flag', () => {
    const fields: NamedField[] = [{ type: 'image', name: 'image', label: 'Hero' }];
    const form = new FormData();
    form.set('image.src', 'media:a.0123456789abcdef');
    form.set('image.alt', 'A snowy ridge');

    expect(frontmatterFromForm(fields, form)).toEqual({
      image: { src: 'media:a.0123456789abcdef', alt: 'A snowy ridge' },
    });
  });

  it('omits the decorative key for a left-blank hero with no decorative flag', () => {
    const fields: NamedField[] = [{ type: 'image', name: 'image', label: 'Hero' }];
    const form = new FormData();
    form.set('image.src', 'media:a.0123456789abcdef');
    form.set('image.alt', '');

    expect(frontmatterFromForm(fields, form)).toEqual({
      image: { src: 'media:a.0123456789abcdef', alt: '' },
    });
  });

  it('stores image alt verbatim, with no markdown escaping', () => {
    const fields: NamedField[] = [{ type: 'image', name: 'image', label: 'Hero' }];
    const form = new FormData();
    form.set('image.src', 'media:a.0123456789abcdef');
    form.set('image.alt', 'A [bracketed] *starred* alt');

    expect(frontmatterFromForm(fields, form)).toEqual({
      image: { src: 'media:a.0123456789abcdef', alt: 'A [bracketed] *starred* alt' },
    });
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

describe('isCalendarDate', () => {
  it('accepts a canonical zero-padded calendar date', () => {
    expect(isCalendarDate('2026-01-01')).toBe(true);
    expect(isCalendarDate('2024-02-29')).toBe(true); // a real leap day
  });

  it('rejects a date-rollover that is not a real day', () => {
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2026-02-29')).toBe(false); // 2026 is not a leap year
  });

  it('rejects an impossible month or day', () => {
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('2026-00-01')).toBe(false);
    expect(isCalendarDate('2026-01-00')).toBe(false);
  });

  it('rejects a non-canonical format', () => {
    expect(isCalendarDate('2026-1-1')).toBe(false);
    expect(isCalendarDate('2026-01-01T00:00')).toBe(false);
    expect(isCalendarDate('01/01/2026')).toBe(false);
    expect(isCalendarDate('')).toBe(false);
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

  it('round-trips a nested image object, quoting the media: token and omitting an absent caption', () => {
    const data = { image: { src: 'media:a.0123456789abcdef', alt: 'x' } };
    const out = serializeMarkdown(data, '');
    // The media: token carries a colon, so gray-matter must quote it rather than read it as a YAML map.
    const parsed = parseMarkdown(out);
    expect(parsed.frontmatter).toEqual(data);
    expect((parsed.frontmatter.image as { caption?: string }).caption).toBeUndefined();
  });

  it('round-trips a datetime value as a naive-local string through the full save-load cycle', () => {
    // A datetime is stored as TEXT, so the YYYY-MM-DDTHH:mm string must survive
    // frontmatterFromForm -> serializeMarkdown -> parseMarkdown -> formValues without
    // re-parsing into a JS Date and going blank.
    const fields: NamedField[] = [{ type: 'datetime', name: 'when', label: 'When' }];
    const form = new FormData();
    form.set('when', '2026-06-26T14:30');

    const decoded = frontmatterFromForm(fields, form);
    expect(decoded.when).toBe('2026-06-26T14:30');

    const out = serializeMarkdown(decoded, '');
    const parsed = parseMarkdown(out);
    // The stored value reads back to the same naive-local string the input wants, never blank.
    expect(datetimeInputValue(parsed.frontmatter.when)).toBe('2026-06-26T14:30');
  });
});

describe('datetimeInputValue', () => {
  it('passes a naive-local YYYY-MM-DDTHH:mm string through', () => {
    expect(datetimeInputValue('2026-06-26T14:30')).toBe('2026-06-26T14:30');
  });
  it('formats a Date with UTC getters, no timezone shift', () => {
    expect(datetimeInputValue(new Date('2026-06-26T14:30:00.000Z'))).toBe('2026-06-26T14:30');
  });
  it('returns empty for a missing or invalid value', () => {
    expect(datetimeInputValue(undefined)).toBe('');
    expect(datetimeInputValue(new Date('nonsense'))).toBe('');
    expect(datetimeInputValue('not a datetime')).toBe('');
  });
});
