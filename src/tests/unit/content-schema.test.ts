// src/tests/unit/content-schema.test.ts
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
