# Engine hardening, Plan 1: validator and fields parity + unification

> **For agentic workers:** Execute task-by-task. Execution is a workflow in a fresh session (the user
> clears context first). Part A is sequential and correctness-critical: run it as a pipeline, each task
> test-first, with Task 6 (the parity matrix) as the verify stage. The main loop reviews each diff and
> clears the full gate before the next dispatch. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the v2 `fieldset` validator a proven drop-in replacement for the v1 `defineFields`
validator, by single-sourcing the constraint logic both share and closing v2's parity and coercion gaps,
gated by a v1-vs-v2 parity test matrix. This is the Contract v2 cutover's spine.

**Architecture:** Extract the constraint rules (string length, date bounds, regex pattern compilation)
into one shared `field-rules.ts` module that both validators call, so they cannot drift. v2 gains the
text `min`/`max`/`length`/`pattern` and date `min`/`max` checks it lacks, plus declaration-time pattern
compilation, parsed-YAML input symmetry, and the multiselect lone-scalar coercion. The parity matrix
feeds equivalent v1 and v2 fields identical inputs and asserts identical results.

**Tech Stack:** TypeScript, Vitest (node `unit` project). No new dependencies. Reuse `ValidationResult`
from `content/types.ts`, `isCalendarDate`/`dateInputValue` from `content/frontmatter.ts`.

**Spec:** `docs/superpowers/specs/2026-06-26-cairn-engine-hardening-design.md`.

## Global Constraints

- The shared rules are pure functions returning an error string or `null`; no I/O, no `new Date()`/
  `Date.now()` in library code (a `'today'` clock is injected). Determinism holds for Workers.
- A malformed regex pattern fails LOUDLY at declaration (`fieldset(...)`/`defineFields(...)` call time),
  not on every save, mirroring v1's `compilePatterns` (`content/schema.ts:104-116`).
- Every exported symbol gets a minimal one-line TSDoc; no `{type}` tags; no em dash in comments
  (`house/no-em-dash-in-comments`).
- The full gate before "done": the task's targeted test passes, `npm run check` reports 0 errors /
  0 warnings, `npm test` exits 0, and `npm run check:comments` passes. Tests live in
  `src/tests/unit/*.test.ts` (node project, importing from `../../lib/content/*.js`).
- This pass is a refactor-plus-extension: v1's existing behavior must not change (its suites stay green);
  v2 gains behavior. The parity matrix (Task 6) is the proof that the two agree.

---

### Task 1: Extract the shared `field-rules` module; refactor v1 onto it

**Files:**
- Create: `src/lib/content/field-rules.ts`
- Modify: `src/lib/content/schema.ts` (`applyRules`, `compilePatterns` delegate to the new module)
- Test: `src/tests/unit/field-rules.test.ts`

**Interfaces:**
- Produces: `compilePattern(source: string, label: string): RegExp` (throws a labeled error on a bad
  pattern); `stringLengthError(value: string, c: { min?: number; max?: number; length?: number }, label:
  string): string | null`; `patternError(value: string, compiled: RegExp | undefined, label: string):
  string | null`; `dateBoundsError(value: string, c: { min?: string; max?: string }, label: string):
  string | null`. Error strings match v1's current wording exactly (copy from `schema.ts:80-90`), so
  v1's behavior is unchanged.

- [ ] **Step 1: Write the failing test** — assert each helper reproduces v1's messages:

```ts
import { describe, it, expect } from 'vitest';
import { compilePattern, stringLengthError, patternError, dateBoundsError } from '../../lib/content/field-rules.js';

describe('field-rules', () => {
  it('stringLengthError matches v1 wording', () => {
    expect(stringLengthError('ab', { min: 3 }, 'Name')).toBe('Name must be at least 3 characters');
    expect(stringLengthError('abcd', { max: 3 }, 'Name')).toBe('Name must be at most 3 characters');
    expect(stringLengthError('abcd', { length: 3 }, 'Name')).toBe('Name must be exactly 3 characters');
    expect(stringLengthError('abc', { min: 1, max: 5 }, 'Name')).toBeNull();
  });
  it('patternError matches v1 wording', () => {
    expect(patternError('xy', compilePattern('^\\d+$', 'Code'), 'Code')).toBe('Code is not in the expected format');
    expect(patternError('12', compilePattern('^\\d+$', 'Code'), 'Code')).toBeNull();
  });
  it('dateBoundsError matches v1 wording', () => {
    expect(dateBoundsError('2019-01-01', { min: '2020-01-01' }, 'Date')).toBe('Date must be on or after 2020-01-01');
    expect(dateBoundsError('2021-01-01', { max: '2020-12-31' }, 'Date')).toBe('Date must be on or before 2020-12-31');
    expect(dateBoundsError('2020-06-01', { min: '2020-01-01', max: '2020-12-31' }, 'Date')).toBeNull();
  });
  it('compilePattern throws a labeled error on a bad pattern', () => {
    expect(() => compilePattern('(', 'Code')).toThrow(/Code/);
  });
});
```

- [ ] **Step 2: Run, verify it fails** — `npx vitest run --project unit src/tests/unit/field-rules.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement `field-rules.ts`** with the four functions, copying v1's exact message strings
  and the first-failing-rule-wins order from `schema.ts:80-90`; `compilePattern` wraps `new RegExp(source)`
  in a try/catch throwing `cairn: field "${label}" has an invalid pattern: ${source}` (match
  `schema.ts:111`). Then refactor `schema.ts` `applyRules` to call `stringLengthError`/`patternError`/
  `dateBoundsError`, and `compilePatterns` to call `compilePattern`, deleting the inlined logic. No
  behavior change.
- [ ] **Step 4: Run the targeted test (PASS) and the full v1 schema suite** — `npx vitest run --project unit src/tests/unit/field-rules.test.ts` and the existing `schema`/`validate` tests stay green.
- [ ] **Step 5: Commit** — `git commit -m "refactor(content): extract shared field-rules, v1 validator delegates to it"`

---

### Task 2: v2 text/textarea length + pattern parity, with declaration-time compile

**Files:**
- Modify: `src/lib/content/fieldset.ts` (`validateField` text/textarea arm; `fieldset()` pre-compiles patterns)
- Test: `src/tests/unit/fieldset-validate.test.ts` (fix the masking `max: 5` fixture; add length/pattern cases)

**Interfaces:**
- Consumes: `compilePattern`, `stringLengthError`, `patternError` (Task 1).
- Produces: `fieldset()` now compiles each `text`/`textarea` descriptor's `pattern` once at construction
  (throwing on a bad pattern), stored in a per-fieldset `Map<key, RegExp>`; `validateField` enforces
  `min`/`max`/`length`/`pattern` on a present non-empty string via the Task 1 helpers.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run, verify it fails** (today text length/pattern are accepted-but-ignored).
- [ ] **Step 3: Implement** — in `fieldset()`, iterate the record and `compilePattern` each text/textarea
  `pattern` into a `Map`; pass the map into `validateField`. In `validateField`'s `default` arm (text/
  textarea/datetime), after storing a non-empty trimmed string, call `stringLengthError` then
  `patternError` (text/textarea only) and set the error if non-null. Keep datetime as a plain string for
  now (its bounds are out of scope this pass; note it).
- [ ] **Step 4: Run, verify PASS** + full gate.
- [ ] **Step 5: Commit** — `git commit -m "feat(fields): v2 text length and pattern parity with declaration-time compile"`

---

### Task 3: v2 date min/max parity

**Files:**
- Modify: `src/lib/content/fieldset.ts` (`validateField` date arm)
- Test: `src/tests/unit/fieldset-validate.test.ts`

**Interfaces:**
- Consumes: `dateBoundsError` (Task 1). Produces: the `date` arm enforces `min`/`max` after `isCalendarDate`.

- [ ] **Step 1: Write the failing test**

```ts
describe('fieldset date bounds (v1 parity)', () => {
  const fs = fieldset({ d: fields.date({ label: 'D', min: '2020-01-01', max: '2020-12-31' }) });
  it('rejects a date outside the bounds', () => {
    expect(fs.validate({ d: '2019-06-01' }, '').ok).toBe(false);
    expect(fs.validate({ d: '2021-06-01' }, '').ok).toBe(false);
    expect(fs.validate({ d: '2020-06-01' }, '')).toEqual({ ok: true, data: { d: '2020-06-01' } });
  });
});
```

- [ ] **Step 2: Run, verify it fails.**
- [ ] **Step 3: Implement** — in the `date` case, after the `isCalendarDate` check passes, call
  `dateBoundsError(text, { min: field.min, max: field.max }, field.label)` and set the error if non-null.
- [ ] **Step 4: Run, verify PASS** + full gate.
- [ ] **Step 5: Commit** — `git commit -m "feat(fields): v2 date min/max parity"`

---

### Task 4: Parsed-YAML input symmetry for number and datetime

**Files:**
- Modify: `src/lib/content/fieldset.ts` (the empty-first coercion block)
- Test: `src/tests/unit/fieldset-validate.test.ts`

**Interfaces:**
- Produces: the coercion reads a parsed value, not only a form string: a `number` descriptor accepts a JS
  `number`, a `datetime` accepts an ISO string from a parsed value, mirroring the `date` arm's `Date`
  handling. An empty/absent value still drops (and `Number(NaN)`/non-finite still errors per `0.66.0`).

- [ ] **Step 1: Write the failing test**

```ts
describe('fieldset parsed-YAML input symmetry', () => {
  const fs = fieldset({ n: fields.number({ label: 'N', min: 0 }), t: fields.datetime({ label: 'T' }) });
  it('accepts a parsed numeric value, not only a form string', () => {
    expect(fs.validate({ n: 5 }, '')).toEqual({ ok: true, data: { n: 5 } });  // a number, not '5'
    expect(fs.validate({ n: 0 }, '')).toEqual({ ok: true, data: { n: 0 } });  // 0 is a real value, not empty
  });
});
```

- [ ] **Step 2: Run, verify it fails** (a non-string `n` drops to `''` today).
- [ ] **Step 3: Implement** — extend the `text` derivation: for a `number` descriptor coerce a
  `typeof value === 'number'` (finite) to `String(value)` before the empty check (so `0` survives and
  `NaN`/non-finite still routes to the number error); for a `datetime` descriptor coerce a `Date` via
  `value.toISOString()`. Keep the empty-first drop intact. Add a brief comment on why `0` must not read
  as empty.
- [ ] **Step 4: Run, verify PASS** + full gate.
- [ ] **Step 5: Commit** — `git commit -m "feat(fields): parsed-YAML input symmetry for number and datetime"`

---

### Task 5: Multiselect lone-scalar coercion

**Files:**
- Modify: `src/lib/content/fieldset.ts` (`validateField` multiselect arm)
- Test: `src/tests/unit/fieldset-validate.test.ts`

**Interfaces:**
- Produces: a non-array `multiselect` value that is a non-empty scalar coerces to a single-element list
  (`'news'` → `['news']`); an empty/absent value still drops (or errors when required). This replaces
  today's silent drop and the misleading "required" on a present scalar.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run, verify it fails** (a scalar drops to `[]` today).
- [ ] **Step 3: Implement** — in the multiselect arm, when `value` is not an array but is a non-empty
  trimmed string, treat it as `[value.trim()]` before the empty/required check; an empty string or a
  non-string-non-array stays the empty list. Then the existing option-membership and store logic applies.
- [ ] **Step 4: Run, verify PASS** + full gate.
- [ ] **Step 5: Commit** — `git commit -m "feat(fields): multiselect coerces a lone scalar to a single-element list"`

---

### Task 6: The v1-vs-v2 parity test matrix

**Files:**
- Test: `src/tests/unit/validator-parity.test.ts`

**Interfaces:**
- Consumes: `defineFields` (v1), `fieldset` + `fields` (v2). Produces: a matrix that declares equivalent
  fields in both validators for the overlapping types (text, textarea, date, boolean, image) and asserts
  identical `{ ok, data | errors }` over a representative input set, proving the two agree by construction
  now that they share `field-rules`.

- [ ] **Step 1: Write the test** (this IS the verify stage; it should pass once Tasks 1-5 land)

```ts
import { describe, it, expect } from 'vitest';
import { defineFields } from '../../lib/content/schema.js';
import { fieldset, fields } from '../../lib/content/fieldset.js'; // fields re-exported or imported from fields.js

// Equivalent declarations of the overlapping types.
const v1 = defineFields([
  { name: 'title', type: 'text', label: 'Title', required: true, max: 5 },
  { name: 'body', type: 'textarea', label: 'Body', min: 2 },
  { name: 'date', type: 'date', label: 'Date', min: '2020-01-01' },
  { name: 'draft', type: 'boolean', label: 'Draft' },
]);
const v2 = fieldset({
  title: fields.text({ label: 'Title', required: true, max: 5 }),
  body:  fields.textarea({ label: 'Body', min: 2 }),
  date:  fields.date({ label: 'Date', min: '2020-01-01' }),
  draft: fields.boolean({ label: 'Draft' }),
});

const inputs = [
  { title: 'Hi', body: 'hello', date: '2021-01-01', draft: true },
  { title: 'toolong', body: 'x' }, // title over max, body under min
  { title: '' },                    // required title empty
  { title: 'ok', date: '2019-01-01' }, // date under min
  {},                               // all empty
];

describe('v1/v2 validator parity (overlapping types)', () => {
  for (const [i, input] of inputs.entries()) {
    it(`agrees on input ${i}`, () => {
      expect(v2.validate(input, '')).toEqual(v1.validate(input, ''));
    });
  }
});
```

- [ ] **Step 2: Run, verify it PASSES** — `npx vitest run --project unit src/tests/unit/validator-parity.test.ts`. If any case disagrees, fix the v2 arm (or the v1 wording the shared helper reproduces) until they match; that disagreement is the gate doing its job.
- [ ] **Step 3: Run the full gate** — `npm run check` 0/0, `npm test` exit 0, `npm run check:comments`.
- [ ] **Step 4: Commit** — `git commit -m "test(fields): v1-vs-v2 validator parity matrix"`

---

## Self-review

- **Spec coverage:** the shared-core/no-drift goal lands as `field-rules.ts` used by both validators
  (Task 1); v2 constraint parity (text length/pattern + declaration-time compile, date bounds) in Tasks
  2-3; parsed-YAML symmetry in Task 4; the multiselect scalar decision in Task 5; the parity matrix in
  Task 6. Image coercion is already a faithful v1 port (`0.66.0` review confirmed) and is covered by the
  matrix's `image` row if added; the plan keeps it as-is unless the matrix flags a difference. Datetime
  bounds are deferred (noted in Task 2) since no v1 equivalent exists to reach parity against.
- **Placeholders:** none; every task carries its test and concrete guidance.
- **Type consistency:** `field-rules.ts` exports (`compilePattern`, `stringLengthError`, `patternError`,
  `dateBoundsError`) are consumed with the same names/signatures in Tasks 2-3; `fieldset`/`fields`/
  `defineFields` used consistently.

## Execution

A workflow in a fresh session (after a context clear). Part A is sequential (the tasks touch
`fieldset.ts`/`schema.ts`/`field-rules.ts` in order), so run it as a pipeline, each task test-first, with
Task 6 as the verify stage. The worktree needs `npm run package` before `npm test`, and a graph-changing
`package.json` edit (none expected here) commits its regenerated lockfile in the same commit. After this
plan lands, Plan 2 (engine-misc hardening) is written just-in-time.
