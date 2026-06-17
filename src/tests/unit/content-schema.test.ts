import { describe, it, expect, expectTypeOf } from 'vitest';
import { defineFields, type Infer } from '../../lib/content/schema.js';

const posts = defineFields([
  { name: 'title', type: 'text', label: 'Title', required: true },
  { name: 'tags', type: 'tags', label: 'Tags', options: ['trip-report', 'gear', 'news'] },
  { name: 'draft', type: 'boolean', label: 'Draft' },
]);

describe('defineFields: projection and inference', () => {
  it('exposes the declared fields as a plain array in order', () => {
    expect(posts.fields.map((f) => f.name)).toEqual(['title', 'tags', 'draft']);
  });

  it('infers the frontmatter type from the field tuple', () => {
    expectTypeOf<Infer<typeof posts>>().toEqualTypeOf<{
      title: string;
      tags?: ('trip-report' | 'gear' | 'news')[];
      draft?: boolean;
    }>();
  });

  it('infers an image field as an optional nested object', () => {
    const withHero = defineFields([
      { name: 'title', type: 'text', label: 'Title', required: true },
      { name: 'image', type: 'image', label: 'Hero' },
    ]);
    expectTypeOf<Infer<typeof withHero>>().toEqualTypeOf<{
      title: string;
      image?: { src: string; alt: string; caption?: string };
    }>();
    // A typed read of the nested src compiles.
    expectTypeOf<Infer<typeof withHero>['image']>().toMatchTypeOf<
      { src: string; alt: string; caption?: string } | undefined
    >();
  });
});

describe('defineFields: baseline validation', () => {
  it('returns normalized data when required fields are present', () => {
    const result = posts.validate({ title: '  Hello  ', tags: ['gear'], draft: true }, '');
    expect(result).toEqual({ ok: true, data: { title: 'Hello', tags: ['gear'], draft: true } });
  });

  it('returns field-keyed errors when a required field is empty', () => {
    const result = posts.validate({ title: '', tags: [] }, '');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.title).toMatch(/required/i);
  });
});

const ruled = defineFields([
  { name: 'title', type: 'text', label: 'Title', required: true, max: 5 },
  { name: 'slug', type: 'text', label: 'Slug', pattern: '^[a-z0-9-]+$' },
  { name: 'code', type: 'text', label: 'Code', length: 3 },
  { name: 'bio', type: 'textarea', label: 'Bio', min: 10 },
  { name: 'date', type: 'date', label: 'Date', min: '2026-01-01' },
]);

describe('defineFields: declarative per-field rules', () => {
  it('rejects a value over max length', () => {
    const r = ruled.validate({ title: 'too long' }, '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.title).toMatch(/at most 5/);
  });

  it('rejects a value that fails the pattern', () => {
    const r = ruled.validate({ title: 'ok', slug: 'Not A Slug' }, '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.slug).toBeTruthy();
  });

  it('rejects a value of the wrong exact length', () => {
    const r = ruled.validate({ title: 'ok', code: 'ab' }, '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.code).toMatch(/exactly 3/);
  });

  it('rejects a value under min length', () => {
    const r = ruled.validate({ title: 'ok', bio: 'short' }, '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.bio).toMatch(/at least 10/);
  });

  it('rejects a date before the min bound', () => {
    const r = ruled.validate({ title: 'ok', date: '2025-12-31' }, '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.date).toMatch(/on or after/);
  });

  it('passes when every rule is satisfied and skips an absent optional field', () => {
    const r = ruled.validate({ title: 'ok', slug: 'a-slug', code: 'abc', bio: 'long enough', date: '2026-02-01' }, '');
    expect(r.ok).toBe(true);
  });
});

const withRefine = defineFields(
  [
    { name: 'title', type: 'text', label: 'Title', required: true },
    { name: 'date', type: 'date', label: 'Date', required: true },
    { name: 'updated', type: 'date', label: 'Updated' },
  ],
  {
    refine: (data) => {
      // data is the normalized frontmatter, typed.
      expectTypeOf(data.title).toEqualTypeOf<string>();
      if (data.updated && data.updated < data.date) return { updated: 'Updated cannot precede the date' };
      return undefined;
    },
  },
);

describe('defineFields: refine', () => {
  it('returns a refine error when the cross-field rule fails', () => {
    const r = withRefine.validate({ title: 'x', date: '2026-02-01', updated: '2026-01-01' }, '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.updated).toMatch(/cannot precede/);
  });

  it('passes when refine returns nothing', () => {
    const r = withRefine.validate({ title: 'x', date: '2026-02-01', updated: '2026-02-02' }, '');
    expect(r.ok).toBe(true);
  });
});

describe('defineFields: Standard Schema conformance', () => {
  it('declares the standard vendor and version', () => {
    expect(posts['~standard'].version).toBe(1);
    expect(posts['~standard'].vendor).toBe('cairn');
  });

  it('maps a success to a value result', () => {
    const r = posts['~standard'].validate({ frontmatter: { title: 'Hi', tags: ['gear'] }, body: '' });
    expect('issues' in r).toBe(false);
    if (!('issues' in r)) expect(r.value).toEqual({ title: 'Hi', tags: ['gear'] });
  });

  it('maps a failure to issues with a field path', () => {
    const r = posts['~standard'].validate({ frontmatter: { title: '' }, body: '' });
    expect('issues' in r).toBe(true);
    if (r.issues) {
      expect(r.issues[0].message).toMatch(/required/i);
      expect(r.issues[0].path).toEqual(['title']);
    }
  });
});

describe('defineFields: hardening', () => {
  it('throws a clear config error when a text pattern is invalid', () => {
    expect(() => defineFields([{ name: 'slug', type: 'text', label: 'Slug', pattern: '[' }])).toThrow(/slug.*pattern/i);
  });

  it('still enforces a valid pattern after precompilation', () => {
    const s = defineFields([{ name: 'slug', type: 'text', label: 'Slug', pattern: '^[a-z-]+$' }]);
    expect(s.validate({ slug: 'Bad Slug' }, '').ok).toBe(false);
    expect(s.validate({ slug: 'good-slug' }, '').ok).toBe(true);
  });

  it('returns issues rather than throwing when ~standard receives a null frontmatter', () => {
    const r = posts['~standard'].validate({ frontmatter: null, body: '' });
    expect('issues' in r).toBe(true);
  });

  it('throws when two SEO image fields are declared on one concept', () => {
    expect(() =>
      defineFields([
        { name: 'image', type: 'image', label: 'Hero' },
        { name: 'cover', type: 'image', label: 'Cover', seo: true },
      ]),
    ).toThrow(/seo/i);
  });

  it('treats the field named image as seo by default, so a second seo field collides', () => {
    // image is seo by default; an explicit seo cover is a second SEO image.
    expect(() =>
      defineFields([
        { name: 'image', type: 'image', label: 'Hero' },
        { name: 'cover', type: 'image', label: 'Cover', seo: true },
      ]),
    ).toThrow();
    // Two explicit seo fields also collide.
    expect(() =>
      defineFields([
        { name: 'hero', type: 'image', label: 'Hero', seo: true },
        { name: 'cover', type: 'image', label: 'Cover', seo: true },
      ]),
    ).toThrow();
  });

  it('allows one SEO image alongside non-SEO image fields', () => {
    expect(() =>
      defineFields([
        { name: 'image', type: 'image', label: 'Hero' },
        { name: 'cover', type: 'image', label: 'Cover' },
      ]),
    ).not.toThrow();
  });
});
