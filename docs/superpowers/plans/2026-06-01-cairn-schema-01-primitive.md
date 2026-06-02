# cairn Schema Source of Truth (Plan 1): The Schema Primitive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the additive `defineFields` schema primitive so one concept field declaration yields a plain-data field projection, a generated validator with declarative per-field rules and a cross-field `refine`, an inferred TypeScript frontmatter type, and a Standard Schema conformance surface.

**Architecture:** A new `src/lib/content/schema.ts` module wraps the existing `validateFields` baseline (required-and-coerce) with declarative per-field rules (`min`/`max`/`length`/`pattern`) and an optional `refine` hook, returns the field list as a plain serializable projection for the editor form, infers the frontmatter type from the field tuple with a single-level mapped type over a `const` type parameter, and exposes a `~standard` property implementing the Standard Schema v1 interface with no runtime dependency. This plan is fully additive: it adds optional rule properties to the field types and a new module, touches no existing caller, and changes no adapter contract. The contract cutover to a single `schema` member and the typed reads are Plan 2.

**Tech Stack:** TypeScript (5.x `const` type parameters, mapped/conditional types), vitest (`unit` project, node; `expectTypeOf` for type-level assertions).

**Design reference:** `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md`.

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. This plan is additive and changes no site, so it runs on `main` directly (a cairn-cms push deploys no site).
- Test-first (TDD): write the failing test, run it and watch it fail for the right reason, implement, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs `unit`, `component`, and `integration`; it must exit 0, not merely show green assertions).
- Targeted test command: `npx vitest run --project unit src/tests/unit/<file>.test.ts`.
- `expectTypeOf` assertions are compile-checked by `npm run check` (svelte-check type-checks the test files). A type-level regression therefore fails the gate, not just the runtime run. Each type-bearing test file also carries at least one runtime `expect`, so the vitest run is not empty.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies; plain voice.
- Do NOT run `npm install` from inside the workspace member; it drifts the root lock.
- Known flake: `src/tests/component/MarkdownEditor.test.ts` can fail once on a CodeMirror mount-timeout under parallel load. If `npm test` exits non-zero solely on that, re-run once to confirm green before committing.

## Reference values (verified against the live tree)

- `src/lib/content/types.ts` defines `FieldBase` (`{ name: string; label: string; required?: boolean }`) and the field variants `TextField`/`TextareaField`/`DateField`/`BooleanField`/`TagsField`/`FreeTagsField`, the union `FrontmatterField`, and `ValidationResult = { ok: true; data: Record<string, unknown> } | { ok: false; errors: Record<string, string> }`. `TagsField` carries `options: readonly string[]`. `TextField` is `{ type: 'text' } & FieldBase`; `TextareaField` is `{ type: 'textarea'; rows?: number } & FieldBase`; `DateField` is `{ type: 'date' } & FieldBase`.
- `src/lib/content/validate.ts` exports `validateFields(fields: FrontmatterField[], frontmatter: Record<string, unknown>): ValidationResult`. It checks required, coerces booleans to real booleans, `tags`/`freetags` to `string[]`, a `date` (a JS `Date` or a string) to a trimmed `YYYY-MM-DD` string via `dateInputValue`, and other fields to a trimmed string. On any required-empty field it returns `{ ok: false, errors }`; otherwise `{ ok: true, data }` with the normalized values. This plan does NOT modify `validateFields`; the new generated validator calls it for the baseline.
- `src/lib/content/frontmatter.ts` exports `dateInputValue(date: Date): string` and `frontmatterFromForm`.
- `src/lib/index.ts` re-exports `FrontmatterField` (type) and the other content types from `./content/types.js`, and `validateFields` from `./content/validate.js`. New schema exports go here in Task 5.
- Tests live in `src/tests/unit/*.test.ts` (node env). There is no existing `expectTypeOf` usage, so this plan introduces it; it ships with vitest, imported from `'vitest'`.

---

## Task 1: defineFields, the inferred type, and the baseline validator

**Files:**
- Create: `src/lib/content/schema.ts`
- Test: `src/tests/unit/content-schema.test.ts`

Build the module's core: `defineFields` over a `const` field tuple, the `ConceptSchema` interface (without `~standard` yet, added in Task 4), the `InferFields`/`Infer` mapped types, and a generated `validate` that delegates to `validateFields` for the required-and-coerce baseline. No declarative rules and no `refine` yet.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-schema.test.ts`
Expected: FAIL. `../../lib/content/schema.js` does not exist.

- [ ] **Step 3: Create the module**

```ts
// src/lib/content/schema.ts
// cairn-cms: the concept schema primitive (schema-source-of-truth design). One field
// declaration yields a plain-data field projection for the editor form, a generated validator,
// and an inferred frontmatter type. Plan 1 builds the additive primitive; the adapter-contract
// cutover and the typed reads are Plan 2.
import type { FrontmatterField, ValidationResult } from './types.js';
import { validateFields } from './validate.js';

/** Map one field descriptor to the TS type of its normalized value. text, textarea, and date
 *  normalize to a string; a closed-vocabulary `tags` field to the option-union array. */
type FieldValue<K extends FrontmatterField> = K extends { type: 'boolean' }
  ? boolean
  : K extends { type: 'tags'; options: readonly (infer O extends string)[] }
    ? O[]
    : K extends { type: 'tags' | 'freetags' }
      ? string[]
      : string;

/** Flatten an intersection into a single readable object type. */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** The normalized frontmatter type inferred from a field tuple. A field declared
 *  `required: true` is a required key; every other field is optional. */
export type InferFields<F extends readonly FrontmatterField[]> = Prettify<
  { [K in F[number] as K extends { required: true } ? K['name'] : never]: FieldValue<K> } & {
    [K in F[number] as K extends { required: true } ? never : K['name']]?: FieldValue<K>;
  }
>;

/** A concept's schema: the plain-data field projection plus the generated validator. The
 *  `~standard` Standard Schema property lands in Task 4. */
export interface ConceptSchema<F extends readonly FrontmatterField[] = readonly FrontmatterField[]> {
  /** The declared fields as plain serializable data, for the editor form. */
  readonly fields: FrontmatterField[];
  /** Validate raw frontmatter, returning field-keyed errors or the normalized data. */
  validate(frontmatter: Record<string, unknown>, body: string): ValidationResult;
}

/** Extract the inferred frontmatter type from a `ConceptSchema`. */
export type Infer<S> = S extends ConceptSchema<infer F> ? InferFields<F> : never;

/** Declare a concept's fields once. Returns the schema's faces derived from that one declaration. */
export function defineFields<const F extends readonly FrontmatterField[]>(fields: F): ConceptSchema<F> {
  const list = [...fields] as FrontmatterField[];
  const validate = (frontmatter: Record<string, unknown>, _body: string): ValidationResult =>
    validateFields(list, frontmatter);
  return { fields: list, validate };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-schema.test.ts`
Expected: PASS (4 tests). If the `Infer` assertion fails to type-check, the run still executes the runtime tests, but `npm run check` (Step 5) will catch the type error; reconcile `FieldValue`/`InferFields` until `expectTypeOf<Infer<typeof posts>>().toEqualTypeOf<...>()` holds.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/schema.ts src/tests/unit/content-schema.test.ts
git commit -m "feat(content): add the defineFields schema primitive

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Declarative per-field rules (min, max, length, pattern)

**Files:**
- Modify: `src/lib/content/types.ts`
- Modify: `src/lib/content/schema.ts`
- Test: `src/tests/unit/content-schema.test.ts` (extend)

Add optional rule properties to the string-valued field types and enforce them in the generated validator, after the required-and-coerce baseline. Rules apply to a present, non-empty value, so an absent optional field is never rule-checked.

- [ ] **Step 1: Write the failing test**

Append to `src/tests/unit/content-schema.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-schema.test.ts`
Expected: FAIL. The over-max, pattern, length, min, and date-bound cases pass validation today (no rule enforcement), so the assertions fail. The `max`/`pattern`/`length`/`min` properties also do not yet type-check on the field literals.

- [ ] **Step 3: Add the rule properties to the field types**

In `src/lib/content/types.ts`, add the optional rule properties. For `TextField` and `TextareaField`, add length and pattern rules; for `DateField`, add date bounds. These are additive and optional, so no existing field or caller changes.

Change `TextField`:

```ts
/** A single-line text input. */
export interface TextField extends FieldBase {
  type: 'text';
  /** Minimum character length of a non-empty value. */
  min?: number;
  /** Maximum character length. */
  max?: number;
  /** Exact required character length. */
  length?: number;
  /** A regular-expression source string the value must match. Stored as a string so the field
   *  list stays plain serializable data; the validator compiles it. */
  pattern?: string;
}
```

Change `TextareaField` to carry the same four (add the same `min`/`max`/`length`/`pattern` lines after `rows?: number;`):

```ts
/** A multi-line text input. */
export interface TextareaField extends FieldBase {
  type: 'textarea';
  /** Visible rows; the editor picks a default when omitted. */
  rows?: number;
  /** Minimum character length of a non-empty value. */
  min?: number;
  /** Maximum character length. */
  max?: number;
  /** Exact required character length. */
  length?: number;
  /** A regular-expression source string the value must match. */
  pattern?: string;
}
```

Change `DateField`:

```ts
/** A `YYYY-MM-DD` date input. */
export interface DateField extends FieldBase {
  type: 'date';
  /** Earliest allowed date, as `YYYY-MM-DD`. */
  min?: string;
  /** Latest allowed date, as `YYYY-MM-DD`. */
  max?: string;
}
```

- [ ] **Step 4: Enforce the rules in the generated validator**

In `src/lib/content/schema.ts`, import the field variants and add an `applyRules` helper, then call it in `validate` after the baseline succeeds. Update the imports line:

```ts
import type { FrontmatterField, TextField, TextareaField, DateField, ValidationResult } from './types.js';
```

Add the helper above `defineFields`:

```ts
// Enforce the declarative per-field rules on an already-coerced value. Rules run only on a
// present, non-empty string value, so an absent optional field is never flagged. The first
// failing rule per field wins, so the author sees one clear message at a time.
function applyRules(field: FrontmatterField, value: unknown, errors: Record<string, string>): void {
  if (typeof value !== 'string' || value === '') return;
  if (field.type === 'text' || field.type === 'textarea') {
    const f = field as TextField | TextareaField;
    if (f.min != null && value.length < f.min) errors[field.name] = `${field.label} must be at least ${f.min} characters`;
    else if (f.max != null && value.length > f.max) errors[field.name] = `${field.label} must be at most ${f.max} characters`;
    else if (f.length != null && value.length !== f.length) errors[field.name] = `${field.label} must be exactly ${f.length} characters`;
    else if (f.pattern != null && !new RegExp(f.pattern).test(value)) errors[field.name] = `${field.label} is not in the expected format`;
  } else if (field.type === 'date') {
    const f = field as DateField;
    if (f.min != null && value < f.min) errors[field.name] = `${field.label} must be on or after ${f.min}`;
    else if (f.max != null && value > f.max) errors[field.name] = `${field.label} must be on or before ${f.max}`;
  }
}
```

Change the `validate` body inside `defineFields` to apply the rules after the baseline:

```ts
  const validate = (frontmatter: Record<string, unknown>, _body: string): ValidationResult => {
    const base = validateFields(list, frontmatter);
    if (!base.ok) return base;
    const errors: Record<string, string> = {};
    for (const field of list) applyRules(field, base.data[field.name], errors);
    return Object.keys(errors).length > 0 ? { ok: false, errors } : base;
  };
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-schema.test.ts`
Expected: PASS (all Task 1 and Task 2 cases).

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/types.ts src/lib/content/schema.ts src/tests/unit/content-schema.test.ts
git commit -m "feat(content): declarative per-field validation rules

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: The cross-field refine hook

**Files:**
- Modify: `src/lib/content/schema.ts`
- Test: `src/tests/unit/content-schema.test.ts` (extend)

`defineFields` takes an optional `refine(data, body)` that runs after the per-field rules pass. It receives the normalized data typed as the inferred frontmatter and returns field-keyed errors to merge, or nothing. It is validation-only: it does not transform the data.

- [ ] **Step 1: Write the failing test**

Append to `src/tests/unit/content-schema.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-schema.test.ts`
Expected: FAIL. `defineFields` takes only one argument today, so the `{ refine }` option does not type-check, and the cross-field error is not produced.

- [ ] **Step 3: Add the refine option**

In `src/lib/content/schema.ts`, change the `defineFields` signature and body to accept and apply `refine`. Replace the whole `defineFields` function with:

```ts
/** Options for `defineFields`. `refine` runs after the per-field rules pass, for cross-field and
 *  body-dependent checks. It is validation-only: it returns field-keyed errors to merge, or
 *  nothing, and never transforms the data. */
export interface DefineFieldsOptions<F extends readonly FrontmatterField[]> {
  refine?: (data: InferFields<F>, body: string) => Record<string, string> | undefined;
}

/** Declare a concept's fields once. Returns the schema's faces derived from that one declaration. */
export function defineFields<const F extends readonly FrontmatterField[]>(
  fields: F,
  options: DefineFieldsOptions<F> = {},
): ConceptSchema<F> {
  const list = [...fields] as FrontmatterField[];
  const validate = (frontmatter: Record<string, unknown>, body: string): ValidationResult => {
    const base = validateFields(list, frontmatter);
    if (!base.ok) return base;
    const errors: Record<string, string> = {};
    for (const field of list) applyRules(field, base.data[field.name], errors);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    const refined = options.refine?.(base.data as InferFields<F>, body);
    return refined && Object.keys(refined).length > 0 ? { ok: false, errors: refined } : base;
  };
  return { fields: list, validate };
}
```

(The `_body` parameter from Task 1 is now `body`, since `refine` consumes it.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/schema.ts src/tests/unit/content-schema.test.ts
git commit -m "feat(content): cross-field refine hook on defineFields

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: The Standard Schema conformance property

**Files:**
- Modify: `src/lib/content/schema.ts`
- Test: `src/tests/unit/content-schema.test.ts` (extend)

Add a `~standard` property implementing the Standard Schema v1 interface, with no runtime dependency. It is a thin adapter over the native validator: its single `{ frontmatter, body }` argument maps a success to `{ value }` and a failure to `{ issues: [{ message, path }] }`. The native `validate` stays the primary API.

- [ ] **Step 1: Write the failing test**

Append to `src/tests/unit/content-schema.test.ts`:

```ts
describe('defineFields: Standard Schema conformance', () => {
  it('declares the standard vendor and version', () => {
    expect(posts['~standard'].version).toBe(1);
    expect(posts['~standard'].vendor).toBe('cairn');
  });

  it('maps a success to a value result', () => {
    const r = posts['~standard'].validate({ frontmatter: { title: 'Hi', tags: ['gear'] }, body: '' });
    expect('issues' in r).toBe(false);
    if (!('issues' in r)) expect(r.value).toEqual({ title: 'Hi', tags: ['gear'], draft: false });
  });

  it('maps a failure to issues with a field path', () => {
    const r = posts['~standard'].validate({ frontmatter: { title: '' }, body: '' });
    expect('issues' in r).toBe(true);
    if ('issues' in r) {
      expect(r.issues[0].message).toMatch(/required/i);
      expect(r.issues[0].path).toEqual(['title']);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-schema.test.ts`
Expected: FAIL. `posts['~standard']` does not exist.

- [ ] **Step 3: Add the Standard Schema interface and the property**

In `src/lib/content/schema.ts`, add the minimal Standard Schema v1 interface (types-only spec, no dependency) below the imports:

```ts
/** The validate input the cairn adapter takes: the raw frontmatter and the body. */
export interface StandardInput {
  frontmatter: Record<string, unknown>;
  body: string;
}

/** A minimal local copy of the Standard Schema v1 interface (https://standardschema.dev), so the
 *  schema is a drop-in where the ecosystem accepts a validator, with no runtime dependency. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => StandardResult<Output>;
    readonly types?: { readonly input: Input; readonly output: Output };
  };
}
type StandardResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<{ readonly message: string; readonly path?: ReadonlyArray<PropertyKey> }> };
```

Add the `~standard` member to the `ConceptSchema` interface (after `validate`):

```ts
  /** Standard Schema v1 conformance, for ecosystem interop. A thin adapter over `validate`. */
  readonly '~standard': StandardSchemaV1<StandardInput, InferFields<F>>['~standard'];
```

In `defineFields`, build and return the property. Replace the final `return { fields: list, validate };` with:

```ts
  const standard: StandardSchemaV1<StandardInput, InferFields<F>>['~standard'] = {
    version: 1,
    vendor: 'cairn',
    validate: (value) => {
      const { frontmatter = {}, body = '' } = (value ?? {}) as Partial<StandardInput>;
      const result = validate(frontmatter, body);
      return result.ok
        ? { value: result.data as InferFields<F> }
        : { issues: Object.entries(result.errors).map(([field, message]) => ({ message, path: [field] })) };
    },
  };
  return { fields: list, validate, '~standard': standard };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/schema.ts src/tests/unit/content-schema.test.ts
git commit -m "feat(content): Standard Schema conformance on the concept schema

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Export from the package entry

**Files:**
- Modify: `src/lib/index.ts`
- Test: `src/tests/unit/content-schema-exports.test.ts`

Re-export the primitive from the main entry so a site imports it as one set of symbols. The contract cutover (Plan 2) consumes these; exporting now keeps Plan 1's surface self-contained and proven.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-schema-exports.test.ts`
Expected: FAIL. `defineFields`, `Infer`, and `ConceptSchema` are not exported from `../../lib/index.js`.

- [ ] **Step 3: Add the exports**

In `src/lib/index.ts`, near the existing `export { validateFields } from './content/validate.js';` line, add the schema exports:

```ts
export { defineFields } from './content/schema.js';
export type { ConceptSchema, Infer, InferFields, DefineFieldsOptions, StandardInput, StandardSchemaV1 } from './content/schema.js';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-schema-exports.test.ts`
Expected: PASS.

- [ ] **Step 5: Validate the package shape**

Run: `npm run check:package`
Expected: green. The new exports are part of the existing main entry, so no new export condition is added; the check confirms the entry still resolves cleanly.

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/index.ts src/tests/unit/content-schema-exports.test.ts
git commit -m "feat(content): export the schema primitive from the package entry

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage.** Plan 1 implements the spec's "schema primitive" section in full: `defineFields` with the three faces (Task 1 projection and inference plus baseline validate, Task 4 `~standard`), the declarative per-field rules `min`/`max`/`length`/`pattern` (Task 2), and the validation-only `refine` (Task 3). The Standard Schema conformance (Task 4) and the package exports (Task 5) complete the surface. The contract cutover (`ConceptConfig` to a `schema` member, `defineAdapter`, `createSiteIndexes`), the validate-once normalized reads with skip-drafts, and the SEO head consumer are Plan 2 and Plan 3, out of scope here.
- **Additivity.** This plan adds a module, adds optional rule properties to three field types, and adds package exports. It does not modify `validateFields`, any adapter, any site, or the existing `ConceptConfig`. The generated validator reuses `validateFields` for the baseline rather than reimplementing coercion, so there is no duplicated normalization to drift; Plan 2 absorbs `validateFields` when the contract cuts over.
- **Type consistency.** `defineFields<const F extends readonly FrontmatterField[]>(fields, options?)` returns `ConceptSchema<F>`. `ConceptSchema<F>` carries `fields: FrontmatterField[]`, `validate(frontmatter, body): ValidationResult`, and `'~standard': StandardSchemaV1<StandardInput, InferFields<F>>['~standard']`. `Infer<S>` extracts `InferFields<F>`. `InferFields` maps `required: true` fields to required keys and the rest to optional, with `FieldValue` mapping boolean to `boolean`, a `tags` field with `options` to the option-union array, `tags`/`freetags` without options to `string[]`, and everything else to `string`. The rule properties are `min`/`max`/`length: number` and `pattern: string` on text and textarea, and `min`/`max: string` on date.
- **Type-level gate.** The `expectTypeOf` assertions are checked by `npm run check`, so an inference regression fails the gate. Each type-bearing test file also carries runtime `expect` assertions, so the vitest run is not empty. This satisfies the spec's invariant that a type-level smoke test guards the inference.
- **Ordering and green builds.** Each task leaves the module compiling and the suite green, so the tasks commit independently. Task 1 lands the type machinery and the baseline; Tasks 2 through 4 are additive layers on the same module; Task 5 exposes it. The `ConceptSchema` interface grows the `~standard` member in Task 4, which is additive within the plan.

---

## Post-mortem (executed 2026-06-01)

Plan 1 landed on `main`, commits `80d2b84..c5ab533` (seven: five plan-task commits, one simplifier pass, one review-gate hardening commit), local only and not yet pushed. It is additive and bumps no version. The breaking `ConceptConfig` cutover stays Plan 2.

**What was built.** A new `src/lib/content/schema.ts` holds the `defineFields` primitive. One `const` field tuple yields three faces from a single declaration: a plain `fields` array for the editor form, a generated `validate` that delegates to the existing `validateFields` for the required-and-coerce baseline and then layers the declarative rules, and an inferred frontmatter type via `InferFields`/`Infer`. Task 2 added the optional rule properties (`min`/`max`/`length`/`pattern` on `TextField` and `TextareaField`, `min`/`max` on `DateField`) and the `applyRules` enforcement, which runs only on a present non-empty value so an absent optional field is never flagged. Task 3 added the validation-only `refine(data, body)` cross-field hook, with `data` typed as the inferred frontmatter. Task 4 added the `~standard` Standard Schema v1 conformance property as a thin adapter over `validate`, with a local types-only copy of the interface and no runtime dependency. Task 5 re-exported `defineFields` and the six types from the package main entry.

**Evidence at the tip.** `npm run check` 745 files 0 errors 0 warnings; `npm test` 93 files / 430 tests exit 0; `check:package` all-green for the existing main entry (no new export condition). The `expectTypeOf` assertions compile under svelte-check, so an inference regression fails the gate.

**Review gate.** A simplifier pass plus a high-effort `/code-review` (seven finder angles, verify) ran. None of the four specialized reviewers applied, since the pass touched no Svelte, Worker, D1, auth, session, cookie, or DaisyUI code. The simplifier dropped the redundant `TextField`/`TextareaField`/`DateField` casts in `applyRules` (the `FrontmatterField` discriminated union narrows on the type guard) and refreshed a stale doc comment. Two correctness findings were folded in test-first as the hardening commit:
- A malformed `pattern` threw an uncaught `SyntaxError` from inside `validate()`, which broke the `ValidationResult` contract that the save endpoint relies on. Patterns now compile once in `defineFields` (a `Map<name, RegExp>`), and a bad pattern fails fast there with a config error naming the field. This also removes the per-call recompilation.
- `~standard.validate` threw a `TypeError` on an explicit `{ frontmatter: null }`, since the `= {}` destructuring default fires only on `undefined`. It now coerces null frontmatter and body to the empty form and returns issues.

**Deviations locked in.** The Task 4 test guard `if ('issues' in r)` did not type-check, because the success member of `StandardResult` declares `issues?: undefined`, so the `in` operator does not discriminate the union. The implementer changed that one guard to `if (r.issues)` with identical runtime behavior and left the implementation byte-for-byte as the plan specified.

**Carried follow-ups for Plan 2 (the contract cutover and typed reads).**
- The load-bearing one: `InferFields` maps a non-required `boolean` or `tags`/`freetags` field to an optional key, but `validateFields` always writes those keys (`false` for an absent boolean, `[]` for absent tags). So the inferred type describes the form input shape, where the key may be omitted, while the validator's normalized output always carries it. Plan 2 wires typed reads that apply the validator's normalized `data` on read, so Plan 2 decides whether `Infer` should describe the input frontmatter or the normalized output, and reconciles the optionality accordingly. The test at `content-schema.test.ts` already encodes the divergence (it asserts the runtime carries `draft: false` while the type infers `draft?: boolean`).
- Date `min`/`max` compare lexicographically, which is correct for the zero-padded `YYYY-MM-DD` the form and YAML-parse paths produce. A hand-authored non-zero-padded quoted string (e.g. `"2026-9-01"`) would compare wrong, the same normalization assumption the rest of the date pipeline already makes. Latent, low likelihood.
- Inherent to `const`-type-param literal capture: hoisting a field's `options` or `required` into a separately-annotated widened variable (`readonly string[]`, `boolean`) silently degrades inference (`options` to `string[]`, a true `required` to an optional key). A duplicate field `name` collapses the inferred key to `never`. All are malformed or unusual declarations; document the inline-literal expectation when the adapter contract cuts over.
