// src/tests/unit/content-schema-exports.test.ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import { defineFields, type Infer, type ConceptSchema } from '../../lib/index.js';

describe('schema primitive package exports', () => {
  it('exports defineFields from the main entry', () => {
    const schema = defineFields([{ name: 'title', type: 'text', label: 'Title', required: true }]);
    expect(schema.fields).toHaveLength(1);
    expect(schema['~standard'].vendor).toBe('cairn');
  });

  it('exports the Infer and ConceptSchema types', () => {
    const schema = defineFields([{ name: 'title', type: 'text', label: 'Title', required: true }]);
    expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<{ title: string }>();
    expectTypeOf(schema).toMatchTypeOf<ConceptSchema>();
  });
});
