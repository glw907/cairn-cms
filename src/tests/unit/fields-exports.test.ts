import { describe, it, expect, expectTypeOf } from 'vitest';
import * as cairn from '../../lib/index.js';
import type {
  FieldDescriptor,
  Fieldset,
  InferFieldset,
  FieldsetOptions,
  BehaviorTable,
} from '../../lib/index.js';

describe('v2 field vocabulary package exports', () => {
  it('exports the fields constructor namespace from the main entry', () => {
    expect(typeof cairn.fields.text).toBe('function');
    expect(typeof cairn.fields.select).toBe('function');
  });

  it('exports fieldset and initialValues from the main entry', () => {
    expect(typeof cairn.fieldset).toBe('function');
    expect(typeof cairn.initialValues).toBe('function');
  });

  it('exports the v2 field types', () => {
    const set = cairn.fieldset({
      title: cairn.fields.text({ label: 'Title', required: true }),
    });
    expectTypeOf(set).toMatchTypeOf<Fieldset>();
    expectTypeOf<InferFieldset<typeof set>>().toEqualTypeOf<{ title: string }>();
    expectTypeOf<FieldDescriptor>().toMatchTypeOf<{ label: string }>();
    expectTypeOf<FieldsetOptions>().toMatchTypeOf<{ refine?: unknown }>();
    expectTypeOf<BehaviorTable>().toEqualTypeOf<Record<string, never>>();
  });
});
