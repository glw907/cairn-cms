import { describe, it, expect, expectTypeOf } from 'vitest';
import * as cairn from '../../lib/index.js';
import type {
  FieldDescriptor,
  Fieldset,
  InferFieldset,
  FieldsetOptions,
  NamedField,
  ImageValue,
  StandardInput,
  StandardSchemaV1,
} from '../../lib/index.js';
import type { BehaviorTable, FieldBehavior } from '../../lib/content/fieldset.js';
import type {
  TextField,
  TextareaField,
  NumberField,
  SelectField,
  MultiselectField,
  UrlField,
  EmailField,
  DateField,
  DatetimeField,
  BooleanField,
  ImageField,
} from '../../lib/content/fields.js';

describe('v2 field vocabulary package exports', () => {
  it('exports the fields constructor namespace from the main entry', () => {
    expect(typeof cairn.fields.text).toBe('function');
    expect(typeof cairn.fields.select).toBe('function');
  });

  it('exports fieldset from the main entry', () => {
    expect(typeof cairn.fieldset).toBe('function');
  });

  it('omits initialValues from the root barrel but keeps it reachable from its module', async () => {
    expect('initialValues' in cairn).toBe(false);
    const fieldsetModule = await import('../../lib/content/fieldset.js');
    expect(typeof fieldsetModule.initialValues).toBe('function');
  });

  it('exports the v2 field types', () => {
    const set = cairn.fieldset({
      title: cairn.fields.text({ label: 'Title', required: true }),
    });
    expectTypeOf(set).toMatchTypeOf<Fieldset>();
    expectTypeOf<InferFieldset<typeof set>>().toEqualTypeOf<{ title: string }>();
    expectTypeOf<FieldDescriptor>().toMatchTypeOf<{ label?: string }>();
    expectTypeOf<FieldsetOptions>().toMatchTypeOf<{ refine?: unknown }>();
    expectTypeOf<BehaviorTable>().toEqualTypeOf<Record<string, FieldBehavior>>();
    expectTypeOf<FieldBehavior>().toMatchTypeOf<{ validate?: unknown }>();
  });

  it('keeps the *Field interfaces, NamedField, and ImageValue reachable through FieldDescriptor narrowing', () => {
    // Type-level imports from their own modules, not the root barrel: the surface-pruning pass
    // demotes these arms in favor of the kept FieldDescriptor union and structural `kind` narrowing.
    expectTypeOf<TextField>().toMatchTypeOf<{ type: 'text' }>();
    expectTypeOf<TextareaField>().toMatchTypeOf<{ type: 'textarea' }>();
    expectTypeOf<NumberField>().toMatchTypeOf<{ type: 'number' }>();
    expectTypeOf<SelectField>().toMatchTypeOf<{ type: 'select' }>();
    expectTypeOf<MultiselectField>().toMatchTypeOf<{ type: 'multiselect' }>();
    expectTypeOf<UrlField>().toMatchTypeOf<{ type: 'url' }>();
    expectTypeOf<EmailField>().toMatchTypeOf<{ type: 'email' }>();
    expectTypeOf<DateField>().toMatchTypeOf<{ type: 'date' }>();
    expectTypeOf<DatetimeField>().toMatchTypeOf<{ type: 'datetime' }>();
    expectTypeOf<BooleanField>().toMatchTypeOf<{ type: 'boolean' }>();
    expectTypeOf<ImageField>().toMatchTypeOf<{ type: 'image' }>();
    expectTypeOf<NamedField>().toMatchTypeOf<{ name: string }>();
    expectTypeOf<ImageValue>().toMatchTypeOf<{ src: string }>();
    expectTypeOf<StandardInput>().toMatchTypeOf<{ body: string }>();
    expectTypeOf<StandardSchemaV1>().toMatchTypeOf<{ '~standard': unknown }>();
  });

  it('no longer exports the retired v1 surface', () => {
    expect(cairn).not.toHaveProperty('defineFields');
  });
});
