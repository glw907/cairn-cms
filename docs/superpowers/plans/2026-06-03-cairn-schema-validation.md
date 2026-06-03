# Schema validation touch-ups (DX pass P2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the four validation rules the schema cutover dropped (a real calendar date, a date format, the closed `tags` vocabulary, and at-least-one-tag) as intrinsic field-type behavior, widen `AttributeField.options` so a site can share a frozen vocabulary, and make a stray `summaryFields` key fail loud at declaration.

**Architecture:** Two intrinsic, strict-by-default checks land in the baseline validator `validateFields` (`src/lib/content/validate.ts`) beside the coercion they extend, backed by a new pure `isCalendarDate` helper in `frontmatter.ts`. The at-least-one-tag rule already works through `required: true`, so it needs no code. A declaration-time guard in `normalizeConcepts` rejects a `summaryFields` key that names no declared field. One type widening makes `AttributeField.options` a `readonly string[]`.

**Tech Stack:** TypeScript, Svelte 5, Vitest (node `unit` project, no Svelte plugin), `@glw907/cairn-cms` package export map, `publint` + `attw` via `check:package`.

**Spec:** `docs/superpowers/specs/2026-06-03-cairn-schema-validation-design.md`

**Conventions:** Test-first, one behavior per test. The `unit` project runs in `node` with no Svelte plugin. The full gate before "done": the targeted test, then `npm run check` (svelte-check 0 errors / 0 warnings), then `npm test` (must exit 0). Commit specific files, imperative mood, co-author footer `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

## File map

- `src/lib/content/frontmatter.ts`: add the pure `isCalendarDate` helper beside `dateInputValue` (Task 1).
- `src/lib/content/validate.ts`: enforce a real `YYYY-MM-DD` calendar date in the `date` case (Task 2) and closed-vocabulary membership in the `tags` case (Task 3).
- `src/lib/content/concepts.ts`: throw in `normalizeConcepts` on a `summaryFields` key that is not a declared field (Task 4).
- `src/lib/render/registry.ts`: widen `AttributeField.options` to `readonly string[]` (Task 5).
- `docs/creating-a-cairn-site.md` and `CHANGELOG.md`: the validation notes and the `0.23.0` entry (Task 6).
- `package.json` (version): bump to `0.23.0`, then the full gate including a green showcase build (Task 7).

---

## Task 1: Add the `isCalendarDate` helper

**Files:**
- Modify: `src/lib/content/frontmatter.ts` (add the helper beside `dateInputValue`, near line 48)
- Test: `src/tests/unit/content-frontmatter.test.ts`

- [ ] **Step 1: Write the failing test**

Add this `describe` block to `src/tests/unit/content-frontmatter.test.ts`. Import `isCalendarDate` from `../../lib/content/frontmatter.js` (extend the existing import from that module if the file already imports from it):

```ts
describe('isCalendarDate', () => {
  it('accepts a canonical zero-padded calendar date', () => {
    expect(isCalendarDate('2026-01-01')).toBe(true);
    expect(isCalendarDate('2024-02-29')).toBe(true); // a real leap day
  });

  it('rejects a date-rollover that is not a real day', () => {
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2026-02-29')).toBe(false); // 2026 is not a leap year
  });

  it('rejects an impossible month or day', () => {
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('2026-00-01')).toBe(false);
    expect(isCalendarDate('2026-01-00')).toBe(false);
  });

  it('rejects a non-canonical format', () => {
    expect(isCalendarDate('2026-1-1')).toBe(false);
    expect(isCalendarDate('2026-01-01T00:00')).toBe(false);
    expect(isCalendarDate('01/01/2026')).toBe(false);
    expect(isCalendarDate('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-frontmatter.test.ts -t "isCalendarDate"`
Expected: FAIL. `isCalendarDate` is not exported.

- [ ] **Step 3: Add the helper**

In `src/lib/content/frontmatter.ts`, add this exported function right after `dateInputValue` (after line 57):

```ts
/**
 * True when `s` is a canonical zero-padded `YYYY-MM-DD` string naming a real calendar date.
 * Rejects a wrong format, an impossible month or day, and a JS date-rollover such as
 * `2026-02-30` (which `Date` would silently roll forward to March 2). The committed form a
 * date field carries is exactly this canonical shape, which is what the form and
 * `dateInputValue` emit, so a value outside it is a hand-edit or odd-YAML error.
 */
export function isCalendarDate(s: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-frontmatter.test.ts -t "isCalendarDate"`
Expected: PASS (all four cases).

- [ ] **Step 5: Full gate, then commit**

Confirm `npm run check` 0/0 and `npm test` exits 0. Then:

```bash
git add src/lib/content/frontmatter.ts src/tests/unit/content-frontmatter.test.ts
git commit -m "Add the isCalendarDate frontmatter helper

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Enforce a real calendar date in `validateFields`

**Files:**
- Modify: `src/lib/content/validate.ts` (the `date` case near line 40; add the import)
- Test: `src/tests/unit/content-validate.test.ts`

- [ ] **Step 1: Write the failing test**

Add this `describe` block to `src/tests/unit/content-validate.test.ts` (reuse the existing `validateFields` and `FrontmatterField` imports the file already has; check the top of the file for the exact import paths and match them):

```ts
describe('date validation', () => {
  const fields: FrontmatterField[] = [{ type: 'date', name: 'date', label: 'Date', required: true }];

  it('accepts a real calendar date', () => {
    const result = validateFields(fields, { date: '2026-01-01' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.date).toBe('2026-01-01');
  });

  it('rejects a date-rollover value', () => {
    const result = validateFields(fields, { date: '2026-02-30' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.date).toBe('Date must be a valid date (YYYY-MM-DD)');
  });

  it('rejects a non-canonical format', () => {
    const result = validateFields(fields, { date: '2026-1-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.date).toBe('Date must be a valid date (YYYY-MM-DD)');
  });

  it('still coerces a parsed YAML Date and passes', () => {
    const result = validateFields(fields, { date: new Date(Date.UTC(2026, 0, 1)) });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.date).toBe('2026-01-01');
  });

  it('omits an empty optional date with no error', () => {
    const optional: FrontmatterField[] = [{ type: 'date', name: 'date', label: 'Date' }];
    const result = validateFields(optional, { date: '' });
    expect(result.ok).toBe(true);
    if (result.ok) expect('date' in result.data).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-validate.test.ts -t "date validation"`
Expected: FAIL on the rollover and format cases (a bad date currently passes).

- [ ] **Step 3: Import the helper**

In `src/lib/content/validate.ts`, extend the existing `frontmatter.js` import (line 6) to bring in `isCalendarDate`:

```ts
import { dateInputValue, isCalendarDate } from './frontmatter.js';
```

- [ ] **Step 4: Add the check to the `date` case**

In `validateFields`, replace the `date` case body (near lines 40-45) with this. It keeps the current coercion and the `required`-empty error, and adds the calendar-date check on a present value:

```ts
      case 'date': {
        const text = value instanceof Date ? dateInputValue(value) : typeof value === 'string' ? value.trim() : '';
        if (field.required && text === '') errors[field.name] = `${field.label} is required`;
        else if (text !== '' && !isCalendarDate(text)) errors[field.name] = `${field.label} must be a valid date (YYYY-MM-DD)`;
        if (text !== '') data[field.name] = text;
        break;
      }
```

The check runs before the `min`/`max` date rules in `applyRules` (those live in `schema.ts` and run only after `validateFields` returns `ok`), so `min`/`max` only ever compare a well-formed date.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-validate.test.ts -t "date validation"`
Expected: PASS (all five cases).

- [ ] **Step 6: Full gate, then commit**

Confirm `npm run check` 0/0 and `npm test` exits 0. Then:

```bash
git add src/lib/content/validate.ts src/tests/unit/content-validate.test.ts
git commit -m "Validate a date field as a real YYYY-MM-DD calendar date

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Enforce the closed `tags` vocabulary in `validateFields`

**Files:**
- Modify: `src/lib/content/validate.ts` (the combined `tags`/`freetags` case near lines 33-39)
- Test: `src/tests/unit/content-validate.test.ts`

- [ ] **Step 1: Write the failing test**

Add this `describe` block to `src/tests/unit/content-validate.test.ts`:

```ts
describe('tags vocabulary', () => {
  const fields: FrontmatterField[] = [
    { type: 'tags', name: 'tags', label: 'Tags', options: ['alpine', 'nordic', 'biathlon'] },
  ];

  it('accepts an in-vocabulary tag set and normalizes it', () => {
    const result = validateFields(fields, { tags: ['alpine', 'nordic'] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.tags).toEqual(['alpine', 'nordic']);
  });

  it('rejects an out-of-vocabulary value and names it', () => {
    const result = validateFields(fields, { tags: ['alpine', 'curling'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.tags).toBe('Tags contains an unknown value: curling');
  });

  it('leaves a freetags field open', () => {
    const free: FrontmatterField[] = [{ type: 'freetags', name: 'tags', label: 'Tags' }];
    const result = validateFields(free, { tags: ['anything', 'goes'] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.tags).toEqual(['anything', 'goes']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-validate.test.ts -t "tags vocabulary"`
Expected: FAIL on the out-of-vocabulary case (`curling` currently passes).

- [ ] **Step 3: Add the membership check to the `tags`/`freetags` case**

In `validateFields`, replace the combined `tags`/`freetags` case body (near lines 33-39) with this. The `field.type === 'tags'` guard narrows `field` to `TagsField`, exposing `field.options`; `freetags` carries no `options` and stays open:

```ts
      case 'tags':
      case 'freetags': {
        const list = Array.isArray(value) ? value.map(String) : [];
        if (field.required && list.length === 0) errors[field.name] = `${field.label} is required`;
        else if (field.type === 'tags') {
          const unknown = list.find((tag) => !field.options.includes(tag));
          if (unknown !== undefined) errors[field.name] = `${field.label} contains an unknown value: ${unknown}`;
        }
        if (list.length > 0) data[field.name] = list;
        break;
      }
```

A failed field puts a non-empty `errors`, so `validateFields` returns `{ ok: false, errors }` and the stored `data` is discarded.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-validate.test.ts -t "tags vocabulary"`
Expected: PASS (all three cases).

- [ ] **Step 5: Full gate, then commit**

Confirm `npm run check` 0/0 and `npm test` exits 0. Then:

```bash
git add src/lib/content/validate.ts src/tests/unit/content-validate.test.ts
git commit -m "Enforce the closed tags vocabulary in validateFields

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Reject a stray `summaryFields` key at declaration

**Files:**
- Modify: `src/lib/content/concepts.ts` (`normalizeConcepts`, the loop near line 44)
- Test: `src/tests/unit/content-concepts.test.ts`

- [ ] **Step 1: Write the failing test**

Add this case to `src/tests/unit/content-concepts.test.ts` (reuse the existing `normalizeConcepts` and `defineFields` imports the file already has):

```ts
  it('throws when a summaryFields key is not a declared field', () => {
    expect(() =>
      normalizeConcepts({
        posts: {
          dir: 'p',
          schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]),
          summaryFields: ['description'],
        },
      }),
    ).toThrow('cairn: concept "posts" summaryFields key "description" is not a declared field');
  });

  it('accepts a summaryFields key that names a declared field', () => {
    const [descriptor] = normalizeConcepts({
      posts: {
        dir: 'p',
        schema: defineFields([
          { type: 'text', name: 'title', label: 'Title' },
          { type: 'textarea', name: 'description', label: 'Description' },
        ]),
        summaryFields: ['description'],
      },
    });
    expect(descriptor.summaryFields).toEqual(['description']);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-concepts.test.ts -t "summaryFields key"`
Expected: FAIL. The throw case does not throw (a stray key is silently accepted today).

- [ ] **Step 3: Add the declaration check**

In `src/lib/content/concepts.ts`, add the check inside the `normalizeConcepts` loop, after the `if (!config) continue;` line and before the `descriptors.push`. It mirrors how `compilePatterns` rejects a malformed regex as a site-config error:

```ts
  for (const [id, config] of Object.entries(content)) {
    if (!config) continue;
    const summaryFields = config.summaryFields ?? [];
    const declared = new Set(config.schema.fields.map((field) => field.name));
    for (const key of summaryFields) {
      if (!declared.has(key)) {
        throw new Error(`cairn: concept "${id}" summaryFields key "${key}" is not a declared field`);
      }
    }
    const policy = urlPolicy[id] ?? {};
    descriptors.push({
      id,
      label: config.label ?? defaultLabel(id),
      dir: config.dir,
      routing: routing[id] ?? DEFAULT_ROUTING,
      permalink: policy.permalink ?? defaultPermalink(id),
      datePrefix: policy.datePrefix ?? 'day',
      fields: config.schema.fields,
      summaryFields,
      validate: config.schema.validate,
    });
  }
```

The local `summaryFields` const replaces the inline `config.summaryFields ?? []` in the push, so the resolved value is computed once and reused.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/content-concepts.test.ts -t "summaryFields key"`
Expected: PASS (both cases).

- [ ] **Step 5: Full gate, then commit**

Confirm `npm run check` 0/0 and `npm test` exits 0. The existing `content-concepts.test.ts` `summaryFields` cases (from P1) still pass, since they nominate keys that exist or omit the knob. Then:

```bash
git add src/lib/content/concepts.ts src/tests/unit/content-concepts.test.ts
git commit -m "Reject a summaryFields key that names no declared field

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Widen `AttributeField.options` to `readonly string[]`

**Files:**
- Modify: `src/lib/render/registry.ts` (`AttributeField.options`, line 22)
- Test: `src/tests/unit/component-schema.test.ts`

- [ ] **Step 1: Write the failing test**

Add this `describe` block to `src/tests/unit/component-schema.test.ts` (it imports the registry types; match the file's existing import path for `AttributeField`, e.g. `../../lib/render/registry.js`):

```ts
describe('readonly attribute options', () => {
  it('accepts a frozen as-const options vocabulary', () => {
    const TONES = ['info', 'warning'] as const;
    const field: AttributeField = { key: 'tone', label: 'Tone', type: 'select', options: TONES };
    expect(field.options).toEqual(['info', 'warning']);
  });
});
```

This is a type-level assertion. With `options: string[]`, assigning a `readonly ['info', 'warning']` tuple to the field is a TypeScript error, so `npm run check` fails. With `readonly string[]` it compiles.

- [ ] **Step 2: Run the type check to verify it fails**

Run: `npm run check`
Expected: FAIL with a readonly-to-mutable assignment error on `options: TONES` in the new test (`The type 'readonly ["info", "warning"]' is 'readonly' and cannot be assigned to the mutable type 'string[]'`).

- [ ] **Step 3: Widen the type**

In `src/lib/render/registry.ts`, change line 22:

```ts
  /** Allowed values for `type: 'select'`. */
  options?: readonly string[];
```

No consumer changes are needed. Every reader of `field.options` is read-only: `component-reference.ts` (`field.options?.[0]`), `component-validate.ts` (`.includes` and `.join`), and the two form components (`{#each}`). `ComponentRegistry.names` (line 82) is an engine-built output, not a site-supplied vocabulary, so it stays a mutable `string[]`; `TagsField.options` is already `readonly`. This is the only widening the audit yields.

- [ ] **Step 4: Run the targeted test and the type check to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/component-schema.test.ts -t "readonly attribute options" && npm run check`
Expected: the test PASSES and `npm run check` reports 0 errors / 0 warnings.

- [ ] **Step 5: Full gate, then commit**

Confirm `npm test` exits 0 and `npm run check:package` exits 0 (a public type changed). Then:

```bash
git add src/lib/render/registry.ts src/tests/unit/component-schema.test.ts
git commit -m "Widen AttributeField.options to a readonly string array

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Document the validation rules and the changelog

**Files:**
- Modify: `docs/creating-a-cairn-site.md`
- Modify: `CHANGELOG.md` (repo root)
- Test: none (docs only)

- [ ] **Step 1: Add the validation notes to the site guide**

Open `docs/creating-a-cairn-site.md` and find the section that covers the schema, `defineFields`, or field validation (search for `defineFields`, "schema", or "validate"). Add a short paragraph in the repo's prose voice (no em dashes, one idea per sentence, no "not X but Y" frames):

```markdown
A `date` field validates a real calendar date in canonical `YYYY-MM-DD` form. An impossible date such
as `2026-02-30`, a non-padded value such as `2026-1-1`, or a value carrying a time all fail validation.
A `tags` field enforces its declared `options` as a closed vocabulary, so a value outside the list fails
to save; use a `freetags` field for free-form tags. A `summaryFields` key must name a declared field, and
a stray key throws when the site config loads, so a typo fails loud at startup rather than producing an
empty list card.
```

Place it where the field-declaration rules are explained. If the guide already lists the per-field options (`min`, `max`, `pattern`), slot this beside that list.

- [ ] **Step 2: Add the changelog entry**

Open `CHANGELOG.md` at the repo root. Add a `0.23.0` entry above the `0.22.0` entry, matching the file's existing Keep-a-Changelog format:

```markdown
## 0.23.0

### Changed (breaking)
- A `date` field now validates a real `YYYY-MM-DD` calendar date. A site adopting this version whose
  committed content holds a malformed or impossible date will see it fail validation, which is the loud
  failure this restores.
- A `tags` field now enforces its declared `options` as a closed vocabulary. A committed value outside
  the list fails validation. Use a `freetags` field for free-form tags.
- `normalizeConcepts` now throws when a `summaryFields` key names no declared field, so a typo fails at
  config load instead of silently producing an empty list card.

### Changed
- `AttributeField.options` is now `readonly string[]`, so a site can share one frozen `as const`
  vocabulary across components. Read-only by use, so no call site changes.
```

- [ ] **Step 3: Verify the docs pass the prose guard**

Run: `prose-guard docs/creating-a-cairn-site.md && prose-guard CHANGELOG.md`
Expected: no blocking tells. The em-dash and structural checks are the blocking tier; an advisory anaphora note does not gate. If a blocking tell trips, rewrite the sentence for human cadence.

- [ ] **Step 4: Commit**

```bash
git add docs/creating-a-cairn-site.md CHANGELOG.md
git commit -m "Document the date, tags, and summaryFields validation rules

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Bump the version and run the full gate

**Files:**
- Modify: `package.json` (repo root, the `version` field)
- Test: the full gate plus a green showcase build

- [ ] **Step 1: Bump the version**

In the repo-root `package.json`, set:

```json
  "version": "0.23.0",
```

- [ ] **Step 2: Run the full gate**

Run:
```bash
npm run check && npm test && npm run check:package
```
Expected: `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0 across the unit, integration, and component projects; `check:package` exits 0. A passing assertion count is not enough; the `npm test` process must EXIT 0. If it reports all tests passing but exits non-zero, find the unhandled rejection before continuing.

- [ ] **Step 3: Confirm the showcase still builds green under the stricter checks**

The showcase content index now runs the new date and tags checks at build. The showcase posts carry canonical dates (`2026-01-15`, `2026-02-20`, `2026-03-10`) and valid tags, so none should drop. Rebuild the package and the showcase, and confirm the P1 home list still renders its posts:

```bash
npm run package
cd examples/showcase && npm run build
grep -c 'class="summary"' .svelte-kit/output/prerendered/pages/index.html
cd ../..
```
Expected: both builds exit 0, and the `grep -c` reports the post count (3), proving no showcase entry was dropped by the stricter validation. If an entry drops, the showcase content carries a value the new checks reject; fix the content (the loud failure working as intended) and rebuild.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "Bump version to 0.23.0

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Done criteria

- A `date` field rejects a non-`YYYY-MM-DD` or impossible date; a parsed YAML `Date` still coerces and passes; an empty optional date is omitted.
- A `tags` field rejects an out-of-vocabulary value and names it; `freetags` stays open; at-least-one-tag works through `required: true` with no new code.
- `normalizeConcepts` throws on a `summaryFields` key that names no declared field.
- `AttributeField.options` is `readonly string[]`, and an `as const` vocabulary type-checks.
- The site guide states the rules; the changelog records the breaking validation behavior and the type widening.
- Version is `0.23.0`. The full gate is green (`npm run check` 0/0, `npm test` exit 0, `npm run check:package` exit 0), and the showcase builds with all three posts intact.

## Follow-ups (record in the post-mortem, do not do in this pass)

- The `makeDescriptor(overrides)` test factory carried from P1 (the hand-built `ConceptDescriptor` literals across the unit tests) is still worth a small dedicated cleanup. P2 adds no new literal churn, so it does not force the issue.
- Numeric tag count bounds (a min/max number of tags) stay deferred until a site needs them.

## Pass-end review gate (run after Task 7, before reporting done)

- `code-simplifier:code-simplifier` over the changed engine code.
- `svelte-reviewer` does not strictly apply (no Svelte logic changed); run it only if a form component changed to surface the new errors.
- `cloudflare-workers-reviewer`, `web-auth-security-reviewer`, and `daisyui-a11y-reviewer` do not apply (no Worker, auth, session, cookie, D1, or DaisyUI code).
- A high-effort `/code-review` over the branch diff, with attention to the `isCalendarDate` round-trip and the tags membership edge cases.
- Live `/admin` smoke does not apply (no `/admin` surface changed; the showcase runs `adapter-node`).
- Fold findings in, then update the plan post-mortem and `docs/STATUS.md` per the `cairn-pass` consolidation ritual.
