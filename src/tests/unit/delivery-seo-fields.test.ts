import { describe, it, expect, expectTypeOf } from 'vitest';
import { readSeoFields, resolveImageUrl } from '../../lib/delivery/seo-fields.js';
import { defineFields, type Infer } from '../../lib/content/schema.js';

describe('readSeoFields', () => {
  it('keeps present string head fields', () => {
    expect(
      readSeoFields({ description: 'D', image: '/og/a.png', robots: 'noindex', author: 'Ada' }),
    ).toEqual({ description: 'D', image: '/og/a.png', robots: 'noindex', author: 'Ada' });
  });

  it('omits absent, empty, and non-string values, and ignores unknown keys', () => {
    expect(readSeoFields({ description: '', image: 42, author: 'Ada', title: 'T' })).toEqual({
      author: 'Ada',
    });
    expect(readSeoFields({})).toEqual({});
  });

  it('trims a surrounding-whitespace value so a head tag carries no stray whitespace', () => {
    expect(readSeoFields({ robots: '  noindex  ', description: ' D ' })).toEqual({
      robots: 'noindex',
      description: 'D',
    });
  });
});

describe('resolveImageUrl', () => {
  const origin = 'https://x.test';
  it('passes an absolute or protocol-relative URL through', () => {
    expect(resolveImageUrl('https://cdn.test/a.png', origin)).toBe('https://cdn.test/a.png');
    expect(resolveImageUrl('//cdn.test/a.png', origin)).toBe('https://cdn.test/a.png');
  });
  it('anchors a root-relative or bare path to the origin', () => {
    expect(resolveImageUrl('/og/a.png', origin)).toBe('https://x.test/og/a.png');
    expect(resolveImageUrl('og/a.png', origin)).toBe('https://x.test/og/a.png');
  });
  it('returns undefined for a malformed image string', () => {
    expect(resolveImageUrl('http://[invalid', origin)).toBeUndefined();
  });
  it('returns undefined for an unresolved media: token rather than the token verbatim', () => {
    expect(resolveImageUrl('media:photo.0123456789abcdef', origin)).toBeUndefined();
  });
  it('returns undefined for a non-http scheme such as javascript:', () => {
    expect(resolveImageUrl('javascript:alert(1)', origin)).toBeUndefined();
  });
  it('still anchors a hashed root-relative media path to an https origin', () => {
    expect(resolveImageUrl('/media/a.0123456789abcdef.webp', origin)).toBe(
      'https://x.test/media/a.0123456789abcdef.webp',
    );
  });
});

describe('a declared SEO field reaches the inferred type', () => {
  it('infers image as an optional string', () => {
    const schema = defineFields([
      { type: 'text', name: 'title', label: 'Title', required: true },
      { type: 'text', name: 'image', label: 'Social image' },
    ]);
    expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<{ title: string; image?: string }>();
    expect(schema.fields.map((f) => f.name)).toEqual(['title', 'image']);
  });
});
