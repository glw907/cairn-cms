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

describe('fieldset.validate edge cases', () => {
  const edge = fieldset({
    n: fields.number({ label: 'N' }), // unbounded, so no max masks a non-finite value
    contact: fields.email({ label: 'Contact' }),
  });

  it('rejects a non-finite number', () => {
    expect(edge.validate({ n: 'Infinity' }, '').ok).toBe(false);
    expect(edge.validate({ n: '-Infinity' }, '').ok).toBe(false);
    expect(edge.validate({ n: '1e400' }, '').ok).toBe(false); // overflows to Infinity
    expect(edge.validate({ n: '42' }, '')).toEqual({ ok: true, data: { n: 42 } });
  });

  it('rejects an email with more than one at-sign', () => {
    expect(edge.validate({ contact: 'a@@b.c' }, '').ok).toBe(false);
    expect(edge.validate({ contact: 'a@b@c.d' }, '').ok).toBe(false);
    expect(edge.validate({ contact: 'a@b.c' }, '')).toEqual({ ok: true, data: { contact: 'a@b.c' } });
  });
});

describe('fieldset text constraints (v1 parity)', () => {
  const fs = fieldset({
    title: fields.text({ label: 'Title', max: 5 }),
    code:  fields.text({ label: 'Code', pattern: '^[A-Z]{3}$' }),
  });
  it('enforces max length (the old fixture masked this)', () => {
    expect(fs.validate({ title: 'toolong' }, '').ok).toBe(false);
    expect(fs.validate({ title: 'ok' }, '')).toEqual({ ok: true, data: { title: 'ok' } });
  });
  it('enforces a pattern', () => {
    expect(fs.validate({ code: 'abc' }, '').ok).toBe(false);
    expect(fs.validate({ code: 'ABC' }, '')).toEqual({ ok: true, data: { code: 'ABC' } });
  });
  it('throws on a bad pattern at fieldset() construction', () => {
    expect(() => fieldset({ x: fields.text({ label: 'X', pattern: '(' }) })).toThrow(/X/);
  });
});

describe('fieldset date bounds (v1 parity)', () => {
  const fs = fieldset({ d: fields.date({ label: 'D', min: '2020-01-01', max: '2020-12-31' }) });
  it('rejects a date outside the bounds', () => {
    expect(fs.validate({ d: '2019-06-01' }, '').ok).toBe(false);
    expect(fs.validate({ d: '2021-06-01' }, '').ok).toBe(false);
    expect(fs.validate({ d: '2020-06-01' }, '')).toEqual({ ok: true, data: { d: '2020-06-01' } });
  });
});

describe('fieldset parsed-YAML input symmetry', () => {
  const fs = fieldset({ n: fields.number({ label: 'N', min: 0 }), t: fields.datetime({ label: 'T' }) });
  it('accepts a parsed numeric value, not only a form string', () => {
    expect(fs.validate({ n: 5 }, '')).toEqual({ ok: true, data: { n: 5 } });  // a number, not '5'
    expect(fs.validate({ n: 0 }, '')).toEqual({ ok: true, data: { n: 0 } });  // 0 is a real value, not empty
  });
});

describe('fieldset multiselect lone scalar', () => {
  const fs = fieldset({ tags: fields.multiselect({ label: 'Tags' }) });
  const req = fieldset({ tags: fields.multiselect({ label: 'Tags', required: true }) });
  it('coerces a lone scalar to a single-element list', () => {
    expect(fs.validate({ tags: 'news' }, '')).toEqual({ ok: true, data: { tags: ['news'] } });
  });
  it('a present scalar satisfies required (no misleading "is required")', () => {
    expect(req.validate({ tags: 'news' }, '')).toEqual({ ok: true, data: { tags: ['news'] } });
    expect(req.validate({ tags: '' }, '').ok).toBe(false);
  });
});

// The image-object normalization matrix, ported from the v1 validate suite (the v2 coerceImage is
// the same logic): a well-formed object normalizes, a missing alt defaults to empty, a blank caption
// drops, the decorative flag carries only when an explicit true, and a malformed value drops the key.
describe('fieldset image field (v1 parity)', () => {
  const fs = fieldset({ image: fields.image({ label: 'Hero' }) });

  it('normalizes a valid object and carries a non-empty caption', () => {
    expect(fs.validate({ image: { src: 'media:a.0123456789abcdef', alt: 'x', caption: 'A line.' } }, '')).toEqual({
      ok: true,
      data: { image: { src: 'media:a.0123456789abcdef', alt: 'x', caption: 'A line.' } },
    });
  });

  it('defaults a missing alt to an empty string and never fails on empty alt', () => {
    expect(fs.validate({ image: { src: 'media:a.0123456789abcdef' } }, '')).toEqual({
      ok: true,
      data: { image: { src: 'media:a.0123456789abcdef', alt: '' } },
    });
  });

  it('omits an empty or whitespace caption', () => {
    expect(fs.validate({ image: { src: 'media:a.0123456789abcdef', alt: 'x', caption: '   ' } }, '')).toEqual({
      ok: true,
      data: { image: { src: 'media:a.0123456789abcdef', alt: 'x' } },
    });
  });

  it('keeps the decorative key only for an explicit true', () => {
    expect(fs.validate({ image: { src: 'media:a.0123456789abcdef', alt: '', decorative: true } }, '')).toEqual({
      ok: true,
      data: { image: { src: 'media:a.0123456789abcdef', alt: '', decorative: true } },
    });
    expect(fs.validate({ image: { src: 'media:a.0123456789abcdef', alt: 'x', decorative: false } }, '')).toEqual({
      ok: true,
      data: { image: { src: 'media:a.0123456789abcdef', alt: 'x' } },
    });
    expect(fs.validate({ image: { src: 'media:a.0123456789abcdef', alt: 'x', decorative: 'true' } }, '')).toEqual({
      ok: true,
      data: { image: { src: 'media:a.0123456789abcdef', alt: 'x' } },
    });
  });

  it('drops the key for an empty, absent, or malformed value without throwing', () => {
    expect((fs.validate({ image: { src: '', alt: 'x' } }, '') as { data: object }).data).toEqual({});
    expect((fs.validate({}, '') as { data: object }).data).toEqual({});
    expect(fs.validate({ image: 'a string' }, '')).toEqual({ ok: true, data: {} });
    expect(fs.validate({ image: { alt: 'no src' } }, '')).toEqual({ ok: true, data: {} });
    expect(fs.validate({ image: { src: 42 } }, '')).toEqual({ ok: true, data: {} });
  });

  it('enforces required on a missing src, never on a missing alt', () => {
    const req = fieldset({ image: fields.image({ label: 'Hero', required: true }) });
    expect(req.validate({}, '').ok).toBe(false);
    expect(req.validate({ image: { src: '', alt: 'x' } }, '').ok).toBe(false);
    expect(req.validate({ image: 'a string' }, '').ok).toBe(false);
    expect(req.validate({ image: { src: 'media:a.0123456789abcdef', alt: '' } }, '')).toEqual({
      ok: true,
      data: { image: { src: 'media:a.0123456789abcdef', alt: '' } },
    });
  });
});

describe('fieldset reference and array(reference)', () => {
  const fs = fieldset({
    author: fields.reference({ concept: 'pages', label: 'Author', required: true }),
    related: fields.array(fields.reference({ concept: 'posts', label: 'Post' }), { label: 'Related' }),
  });

  it('validates reference and array(reference) ids', () => {
    expect(fs.validate({ author: 'jane-doe', related: ['a-post', 'b-post'] }, '')).toEqual({
      ok: true,
      data: { author: 'jane-doe', related: ['a-post', 'b-post'] },
    });
    expect(fs.validate({ author: '', related: [] }, '')).toEqual({ ok: false, errors: { author: 'Author is required' } });
    expect(fs.validate({ author: 'Not An Id' }, '')).toEqual({
      ok: false,
      errors: { author: 'Author is not a valid reference' },
    });
  });

  it('coerces a lone scalar in an array slot to a single-element list', () => {
    expect(fs.validate({ author: 'jane-doe', related: 'b-post' }, '')).toEqual({
      ok: true,
      data: { author: 'jane-doe', related: ['b-post'] },
    });
  });

  it('coerces a YAML-parsed Date element to its canonical id, never TZ-shifted garbage', () => {
    expect(fs.validate({ author: 'jane-doe', related: [new Date('2026-01-02T00:00:00Z')] }, '')).toEqual({
      ok: true,
      data: { author: 'jane-doe', related: ['2026-01-02'] },
    });
  });
});

// The refine cross-field path, ported from the v1 defineFields suite.
describe('fieldset refine', () => {
  const fs = fieldset(
    {
      title: fields.text({ label: 'Title', required: true }),
      date: fields.date({ label: 'Date', required: true }),
      updated: fields.date({ label: 'Updated' }),
    },
    {
      refine: (data) => {
        const date = data.date as string | undefined;
        const updated = data.updated as string | undefined;
        if (updated && date && updated < date) return { updated: 'Updated cannot precede the date' };
        return undefined;
      },
    },
  );

  it('returns a refine error when the cross-field rule fails', () => {
    const r = fs.validate({ title: 'x', date: '2026-02-01', updated: '2026-01-01' }, '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.updated).toMatch(/cannot precede/);
  });

  it('passes when refine returns nothing', () => {
    expect(fs.validate({ title: 'x', date: '2026-02-01', updated: '2026-02-02' }, '').ok).toBe(true);
  });
});
