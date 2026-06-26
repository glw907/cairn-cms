# Contract v2, Plan 1: the `fields.*` field-system foundation

> **For agentic workers:** Execute task-by-task. The cairn executor is `cairn-implementer` (Sonnet),
> one task per dispatch, test-first; the main loop reviews each diff and clears the full gate before the
> next dispatch. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the new composable `fields.*` primitive vocabulary as plain-data descriptors with a
derived validator and inferred types, additively alongside the existing `FrontmatterField` union, so the
keystone of Contract v2 lands fully tested without touching the live editor or delivery yet.

**Architecture:** A new `src/lib/content/fields.ts` exports a `fields` constructor namespace; each
constructor returns a plain serializable `FieldDescriptor`. A new `fieldset(record)` turns a
key-to-descriptor record into a schema carrying the descriptors, a server-derived validator (with
multi-segment Standard Schema paths), and an inferred frontmatter type. The existing
`defineFields([...])`/`FrontmatterField` stay untouched; a later cutover plan migrates concepts and
removes the old model. This is the additive-then-cutover pattern cairn used for the original field work.

**Tech Stack:** TypeScript, Vitest (node `unit` project), Standard Schema v1 (local interface, no
runtime dep), `gray-matter` for the date-coercion parity already used by `validate.ts`.

## Global Constraints

- Field descriptors are plain serializable data (no functions), so `load` can ship them to the client
  form. Function-valued behavior (a cross-field validator, an array `itemLabel`) lives in a co-bundled
  behavior table keyed by field name; this plan's scalars carry no behavior, so the table is introduced
  empty and proven in Task 7.
- The derived validator runs server-side and returns `ValidationResult` (reuse the existing type from
  `content/types.ts`); a failure names the field key. The Standard Schema adapter emits multi-segment
  `path` arrays so nested errors map to nested inputs later.
- No `Date.now()` / `new Date()` with no args in library code (it breaks determinism and Workers). The
  `default: 'today'` sentinel resolves through a passed-in clock, defaulting to an injected `now`.
- Every exported symbol gets a minimal one-line TSDoc (`check:reference` and the jsdoc rule require it);
  no `{type}` tags; no em dash in comments (`house/no-em-dash-in-comments`).
- Tests are `src/tests/unit/fields-*.test.ts`, node project, importing from `../../lib/content/*.js`.
  The full gate before "done": the task's targeted test passes, `npm run check` reports 0 errors /
  0 warnings, and `npm test` exits 0.

---

### Task 1: Descriptor model and the first string leaves (`text`, `textarea`)

**Files:**
- Create: `src/lib/content/fields.ts`
- Test: `src/tests/unit/fields-descriptors.test.ts`

**Interfaces:**
- Produces: `FieldDescriptor` (discriminated union, grows per task), `FieldBase`, `TextField`,
  `TextareaField`, and `fields` (a constructor namespace object). Each constructor returns a plain
  object stamped with its `type`. Later tasks add arms to the union and keys to `fields`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { fields } from '../../lib/content/fields.js';

describe('fields string leaves', () => {
  it('text() returns a plain serializable descriptor', () => {
    const d = fields.text({ label: 'Title', required: true, max: 120 });
    expect(d).toEqual({ type: 'text', label: 'Title', required: true, max: 120 });
    expect(JSON.parse(JSON.stringify(d))).toEqual(d); // plain data, no functions
  });

  it('textarea() carries rows and the shared string constraints', () => {
    const d = fields.textarea({ label: 'Summary', rows: 4, max: 200 });
    expect(d).toEqual({ type: 'textarea', label: 'Summary', rows: 4, max: 200 });
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run --project unit src/tests/unit/fields-descriptors.test.ts`
Expected: FAIL, cannot resolve `fields.ts`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/lib/content/fields.ts
/** Common to every field descriptor: the form label and the universal options. */
export interface FieldBase {
  /** Form label. */
  label: string;
  /** One author-facing sentence shown under the field. */
  help?: string;
  /** A required field fails validation when empty. */
  required?: boolean;
  /** Form-render-time initial value; a sentinel like "today" resolves at render (Task 9). */
  default?: string | boolean;
}
/** A single-line text input. */
export interface TextField extends FieldBase {
  type: 'text';
  min?: number; max?: number; length?: number;
  /** A regular-expression source string the value must match. */
  pattern?: string;
}
/** A multi-line text input. */
export interface TextareaField extends FieldBase {
  type: 'textarea';
  rows?: number; min?: number; max?: number; length?: number; pattern?: string;
}
/** The plain-data descriptor union the form, validator, and inference all read. Grows per task. */
export type FieldDescriptor = TextField | TextareaField;

/** The constructor namespace a concept declares its fields with. */
export const fields = {
  /** A single-line text field. */
  text: (o: Omit<TextField, 'type'>): TextField => ({ type: 'text', ...o }),
  /** A multi-line text field. */
  textarea: (o: Omit<TextareaField, 'type'>): TextareaField => ({ type: 'textarea', ...o }),
};
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run --project unit src/tests/unit/fields-descriptors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/fields.ts src/tests/unit/fields-descriptors.test.ts
git commit -m "feat(fields): descriptor model and text/textarea leaves"
```

---

### Task 2: `number`

**Files:**
- Modify: `src/lib/content/fields.ts`
- Test: `src/tests/unit/fields-descriptors.test.ts` (add a `describe`)

**Interfaces:**
- Produces: `NumberField` (`type: 'number'`, `min?`, `max?`, `integer?`), `fields.number`.

- [ ] **Step 1: Write the failing test**

```ts
import { fields } from '../../lib/content/fields.js';
import { describe, it, expect } from 'vitest';

describe('fields.number', () => {
  it('returns a numeric descriptor with bounds', () => {
    expect(fields.number({ label: 'Rating', min: 1, max: 5, integer: true }))
      .toEqual({ type: 'number', label: 'Rating', min: 1, max: 5, integer: true });
  });
});
```

- [ ] **Step 2: Run, verify it fails** — `npx vitest run --project unit src/tests/unit/fields-descriptors.test.ts` → FAIL (`number` not on `fields`).

- [ ] **Step 3: Implement** — add to `fields.ts`:

```ts
/** A numeric input. */
export interface NumberField extends FieldBase { type: 'number'; min?: number; max?: number; integer?: boolean; }
// extend the union:  export type FieldDescriptor = TextField | TextareaField | NumberField;
// add to fields:     number: (o: Omit<NumberField, 'type'>): NumberField => ({ type: 'number', ...o }),
```

- [ ] **Step 4: Run, verify it passes.**
- [ ] **Step 5: Commit** — `git commit -m "feat(fields): number leaf"`

---

### Task 3: `select` and `multiselect` (with `taxonomy` and `creatable`)

**Files:**
- Modify: `src/lib/content/fields.ts`
- Test: `src/tests/unit/fields-descriptors.test.ts`

**Interfaces:**
- Produces: `SelectField` (`type: 'select'`, `options: readonly string[]`), `MultiselectField`
  (`type: 'multiselect'`, `options?`, `creatable?`, `taxonomy?`), `fields.select`, `fields.multiselect`.

- [ ] **Step 1: Write the failing test**

```ts
describe('fields select/multiselect', () => {
  it('select carries a closed option list', () => {
    expect(fields.select({ label: 'Status', options: ['draft', 'published'], default: 'draft' }))
      .toEqual({ type: 'select', label: 'Status', options: ['draft', 'published'], default: 'draft' });
  });
  it('multiselect supports creatable and the taxonomy marker', () => {
    expect(fields.multiselect({ label: 'Topics', creatable: true, taxonomy: true }))
      .toEqual({ type: 'multiselect', label: 'Topics', creatable: true, taxonomy: true });
  });
});
```

- [ ] **Step 2: Run, verify it fails.**
- [ ] **Step 3: Implement** — add `SelectField`, `MultiselectField` to the union and `select`,
  `multiselect` to `fields`. `MultiselectField` has `options?: readonly string[]`, `creatable?: boolean`,
  `taxonomy?: boolean`.
- [ ] **Step 4: Run, verify it passes.**
- [ ] **Step 5: Commit** — `git commit -m "feat(fields): select and multiselect with taxonomy marker"`

---

### Task 4: `url` and `email`

**Files:**
- Modify: `src/lib/content/fields.ts`
- Test: `src/tests/unit/fields-descriptors.test.ts`

**Interfaces:**
- Produces: `UrlField` (`type: 'url'`), `EmailField` (`type: 'email'`), `fields.url`, `fields.email`.
  Both extend `FieldBase` with no extra keys (format is enforced by the validator in Task 7).

- [ ] **Step 1: Write the failing test**

```ts
describe('fields url/email', () => {
  it('url and email are labeled leaves', () => {
    expect(fields.url({ label: 'Website' })).toEqual({ type: 'url', label: 'Website' });
    expect(fields.email({ label: 'Contact' })).toEqual({ type: 'email', label: 'Contact' });
  });
});
```

- [ ] **Step 2: Run, verify it fails.**
- [ ] **Step 3: Implement** — add `UrlField`, `EmailField` to the union and `url`, `email` to `fields`.
- [ ] **Step 4: Run, verify it passes.**
- [ ] **Step 5: Commit** — `git commit -m "feat(fields): url and email leaves"`

---

### Task 5: `date`, `datetime`, `boolean`

**Files:**
- Modify: `src/lib/content/fields.ts`
- Test: `src/tests/unit/fields-descriptors.test.ts`

**Interfaces:**
- Produces: `DateField` (`type: 'date'`, `min?`, `max?` as `YYYY-MM-DD`), `DatetimeField`
  (`type: 'datetime'`, `min?`, `max?` as ISO), `BooleanField` (`type: 'boolean'`), and the matching
  `fields.date`, `fields.datetime`, `fields.boolean`.

- [ ] **Step 1: Write the failing test**

```ts
describe('fields date/datetime/boolean', () => {
  it('date carries YYYY-MM-DD bounds', () => {
    expect(fields.date({ label: 'Date', min: '2020-01-01' }))
      .toEqual({ type: 'date', label: 'Date', min: '2020-01-01' });
  });
  it('datetime and boolean are labeled leaves', () => {
    expect(fields.datetime({ label: 'Publish at' })).toEqual({ type: 'datetime', label: 'Publish at' });
    expect(fields.boolean({ label: 'Draft' })).toEqual({ type: 'boolean', label: 'Draft' });
  });
});
```

- [ ] **Step 2: Run, verify it fails.**
- [ ] **Step 3: Implement** — add the three descriptors to the union and the three constructors to
  `fields`.
- [ ] **Step 4: Run, verify it passes.**
- [ ] **Step 5: Commit** — `git commit -m "feat(fields): date, datetime, boolean leaves"`

---

### Task 6: `image` (the rich leaf)

**Files:**
- Modify: `src/lib/content/fields.ts`
- Test: `src/tests/unit/fields-descriptors.test.ts`

**Interfaces:**
- Produces: `ImageField` (`type: 'image'`, `seo?: boolean`), `fields.image`, and re-exports the existing
  `ImageValue` (`{ src; alt; caption?; decorative? }`) from `content/types.ts` so the new module owns the
  image value shape too. The stored value stays `{ src, alt, caption?, decorative? }` unchanged.

- [ ] **Step 1: Write the failing test**

```ts
import type { ImageValue } from '../../lib/content/fields.js';
describe('fields.image', () => {
  it('is a rich leaf carrying the seo flag', () => {
    expect(fields.image({ label: 'Hero', seo: true })).toEqual({ type: 'image', label: 'Hero', seo: true });
  });
  it('re-exports the ImageValue shape', () => {
    const v: ImageValue = { src: 'media:abc', alt: 'A photo', caption: 'c', decorative: false };
    expect(v.src).toBe('media:abc');
  });
});
```

- [ ] **Step 2: Run, verify it fails.**
- [ ] **Step 3: Implement** — add `ImageField` to the union, `image` to `fields`, and
  `export type { ImageValue } from './types.js';` at the top of `fields.ts`.
- [ ] **Step 4: Run, verify it passes.**
- [ ] **Step 5: Commit** — `git commit -m "feat(fields): image rich leaf re-exporting ImageValue"`

---

### Task 7: `fieldset()` — derived validator, Standard Schema, behavior table

**Files:**
- Create: `src/lib/content/fieldset.ts`
- Test: `src/tests/unit/fieldset-validate.test.ts`

**Interfaces:**
- Consumes: `FieldDescriptor`, `fields` (Tasks 1-6); `ValidationResult`, `StandardSchemaV1`,
  `StandardInput` (reuse from `content/types.ts` and `content/schema.ts`); `isCalendarDate`,
  `dateInputValue` from `content/frontmatter.ts`.
- Produces: `Fieldset<R>` (`{ fields: R; behavior: BehaviorTable; validate(fm, body): ValidationResult;
  '~standard' }`), `fieldset(record, options?)`, `BehaviorTable` (`Record<string, never>` for now,
  reserved for co-bundled functions), `FieldsetOptions` (`{ refine? }`, server-only). `validate` coerces
  per type, enforces constraints, and returns field-keyed errors or normalized data. The `~standard`
  adapter emits `path: [key]` per issue (multi-segment-ready for nested fields later).

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run, verify it fails** — `npx vitest run --project unit src/tests/unit/fieldset-validate.test.ts` → FAIL (`fieldset.ts` missing).

- [ ] **Step 3: Implement** — `src/lib/content/fieldset.ts`. Per-type coercion: `text`/`textarea`/`url`/
  `email`/`select` coerce to a trimmed string (drop when empty optional); `number` coerces via `Number(...)`
  (reject `NaN`, enforce `integer`/`min`/`max`); `multiselect` coerces to a string array (drop empty;
  reject unknown when `options` is set); `boolean` is `value === true` (omit when false); `date` reuses
  `isCalendarDate`/`dateInputValue`; `image` normalizes the `{ src, alt, caption?, decorative? }` object
  and drops the key when `src` is empty (port the arm from `validate.ts`). `url`/`email` validate with a
  conservative regex (`/^https?:\/\/\S+$/` and `/^\S+@\S+\.\S+$/`). Collect errors keyed by record key;
  run `options.refine?.(data, body)` after, merging field-keyed errors. The `~standard` adapter wraps
  `validate` and maps each error entry to `{ message, path: [key] }`.

- [ ] **Step 4: Run, verify it passes.**
- [ ] **Step 5: Commit** — `git commit -m "feat(fields): fieldset derived validator + Standard Schema"`

---

### Task 8: `Infer` — the inferred frontmatter type

**Files:**
- Modify: `src/lib/content/fieldset.ts`
- Test: `src/tests/unit/fieldset-infer.test.ts`

**Interfaces:**
- Produces: `Infer<F extends Record<string, FieldDescriptor>>` (required where `required: true`, else
  optional) and `InferFieldset<S>`. `ValueOf` maps a descriptor to its TS type: `number` to `number`,
  `boolean` to `boolean`, `image` to `ImageValue`, `multiselect` with literal `options` to that union
  array (else `string[]`), `select` with literal `options` to that union, else `string`.

- [ ] **Step 1: Write the failing test** (a type-level test compiled by `check`, asserted via runtime
  shape so vitest also exercises it)

```ts
import { describe, it, expectTypeOf } from 'vitest';
import { fields } from '../../lib/content/fields.js';
import { fieldset, type InferFieldset } from '../../lib/content/fieldset.js';

const fs = fieldset({
  title:  fields.text({ label: 'Title', required: true }),
  count:  fields.number({ label: 'Count' }),
  status: fields.select({ label: 'Status', options: ['draft', 'published'] }),
  tags:   fields.multiselect({ label: 'Tags', options: ['a', 'b'] }),
});
type T = InferFieldset<typeof fs>;

describe('Infer', () => {
  it('maps required/optional and value types', () => {
    expectTypeOf<T>().toEqualTypeOf<{
      title: string;
      count?: number;
      status?: 'draft' | 'published';
      tags?: ('a' | 'b')[];
    }>();
  });
});
```

- [ ] **Step 2: Run, verify it fails** — also run `npm run check` and expect the type assertion to fail.
- [ ] **Step 3: Implement** the conditional + mapped types `ValueOf`, `Infer`, `InferFieldset` in
  `fieldset.ts`, and make `fieldset` capture the record with a `const` type parameter so literal
  `options` survive (mirror `defineFields`' `<const F>` trick in `schema.ts`).
- [ ] **Step 4: Run, verify it passes** — targeted test PASS and `npm run check` 0/0.
- [ ] **Step 5: Commit** — `git commit -m "feat(fields): inferred frontmatter type from a fieldset"`

---

### Task 9: `default` render-time resolution and composition

**Files:**
- Modify: `src/lib/content/fieldset.ts`
- Test: `src/tests/unit/fieldset-defaults.test.ts`

**Interfaces:**
- Produces: `initialValues(fieldset, now?): Record<string, unknown>` resolving each descriptor's `default`
  to a form-initial value, with the `'today'` sentinel on a `date` field resolved through the passed
  `now` (a `Date`), defaulting to an injected clock the caller supplies. Empty defaults are omitted so the
  minimal-frontmatter invariant holds when the author saves without touching the field.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { fields } from '../../lib/content/fields.js';
import { fieldset, initialValues } from '../../lib/content/fieldset.js';

describe('initialValues and composition', () => {
  it('resolves literal and today defaults at render time', () => {
    const fs = fieldset({
      status: fields.select({ label: 'S', options: ['draft', 'published'], default: 'draft' }),
      date:   fields.date({ label: 'D', default: 'today' }),
    });
    expect(initialValues(fs, new Date('2026-06-25T00:00:00Z')))
      .toEqual({ status: 'draft', date: '2026-06-25' });
  });

  it('composes a shared base field set by spreading', () => {
    const base = { title: fields.text({ label: 'Title', required: true }) };
    const fs = fieldset({ ...base, body: fields.textarea({ label: 'Body' }) });
    expect(Object.keys(fs.fields)).toEqual(['title', 'body']);
  });
});
```

- [ ] **Step 2: Run, verify it fails.**
- [ ] **Step 3: Implement** `initialValues`: iterate the fieldset's descriptors; for each with a
  `default`, set the value; resolve `'today'` on a `date` descriptor to `now.toISOString().slice(0, 10)`.
  Composition needs no code (records spread), so the second test only documents and locks the pattern.
- [ ] **Step 4: Run, verify it passes.**
- [ ] **Step 5: Commit** — `git commit -m "feat(fields): render-time default resolution; lock field composition"`

---

### Task 10: Public exports and reference docs

**Files:**
- Modify: `src/lib/index.ts`
- Create: `docs/reference/fields.md`
- Test: `src/tests/unit/fields-exports.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: the root-barrel exports `fields`, `fieldset`, `initialValues`, and the types
  `FieldDescriptor`, `Fieldset`, `Infer`, `InferFieldset`, `FieldsetOptions`, `BehaviorTable`, and each
  `*Field`. `check:reference` requires a reference page documenting the new subpath surface.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import * as cairn from '../../lib/index.js';

describe('contract v2 field exports', () => {
  it('exposes the fields namespace and fieldset from the root', () => {
    expect(typeof cairn.fields.text).toBe('function');
    expect(typeof cairn.fieldset).toBe('function');
    expect(typeof cairn.initialValues).toBe('function');
  });
});
```

- [ ] **Step 2: Run, verify it fails.**
- [ ] **Step 3: Implement** — add the exports to `src/lib/index.ts` (value exports `fields`, `fieldset`,
  `initialValues`; `export type` the descriptor and fieldset types), and write `docs/reference/fields.md`
  documenting `fields.*`, `fieldset`, `initialValues`, and the inferred-type story (one short section
  each, Google style), linked from `docs/reference/README.md`.
- [ ] **Step 4: Run, verify it passes**, then run the full gate.

Run: `npx vitest run --project unit src/tests/unit/fields-exports.test.ts` → PASS
Run: `npm run check` → 0 errors, 0 warnings
Run: `npm test` → exit 0
Run: `npm run check:reference` → passes (new exports documented)

- [ ] **Step 5: Commit**

```bash
git add src/lib/index.ts docs/reference/fields.md docs/reference/README.md src/tests/unit/fields-exports.test.ts
git commit -m "feat(fields): export the v2 field vocabulary and its reference page"
```

---

## Self-review

- **Spec coverage (the field system):** the primitive set (text, textarea, number, select, multiselect,
  url, email, date, datetime, boolean, image) lands in Tasks 1-6; server-derived validation with
  Standard Schema multi-segment-ready paths in Task 7; inference in Task 8; `default` render-time
  resolution and composition in Task 9; the `taxonomy` marker in Task 3; the rich `image` leaf preserving
  `caption`/`decorative` in Task 6. The data-versus-behavior split is established as an empty behavior
  table in Task 7 (scalars have no behavior), to be populated when object/array `itemLabel` and component
  validators arrive in the next plans. Deferred by design to later plans: `object`/`array`, `reference`,
  the directive-component unification, `computed`, the concept model (`defineConcept`, routing,
  permalink), the adapter restructure, render/islands, and the backend seam. The cutover that wires this
  into the live editor, delivery, and manifest, and removes `FrontmatterField`/`defineFields`, is the
  next plan.
- **Placeholders:** none; every step carries its test or its concrete implementation guidance.
- **Type consistency:** `FieldDescriptor`, `fields`, `fieldset`, `Fieldset`, `Infer`/`InferFieldset`,
  `initialValues`, `BehaviorTable`, `FieldsetOptions`, and `ImageValue` are used with the same names and
  shapes across Tasks 1-10.

## Execution

Per the workstation default, this runs same-session orchestrate-and-verify: dispatch each task to
`cairn-implementer` (Sonnet), review the diff, and clear the full gate (targeted test, `npm run check`
0/0, `npm test` exit 0) before the next dispatch. Upshift a single dispatch to `model: opus` only for a
task whose logic this plan does not fully specify; here Task 7 (the validator) and Task 8 (the inference
types) are the most intricate but are specified, so Sonnet should suffice with main-loop review.
