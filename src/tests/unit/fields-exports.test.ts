import { describe, it, expect, expectTypeOf } from 'vitest';
import * as cairn from '../../lib/index.js';
import type {
  FieldDescriptor,
  Fieldset,
  InferFieldset,
  FieldsetOptions,
  BehaviorTable,
  NamedField,
  ImageValue,
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
  StandardInput,
  StandardSchemaV1,
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
    expectTypeOf<FieldDescriptor>().toMatchTypeOf<{ label?: string }>();
    expectTypeOf<FieldsetOptions>().toMatchTypeOf<{ refine?: unknown }>();
    expectTypeOf<BehaviorTable>().toEqualTypeOf<Record<string, never>>();
  });

  it('reclaims the v2 *Field interfaces, NamedField, and ImageValue from the main entry', () => {
    // Type-level imports; if the barrel drops a name this file fails to type-check under svelte-check.
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
