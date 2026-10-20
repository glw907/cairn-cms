# Contract v2 Phase 3a: object/array containers + the repeatable-row editor

> **For agentic workers:** REQUIRED SUB-SKILL: dispatch each task to `cairn-implementer` (pinned Sonnet),
> test-first, and verify the full gate between dispatches per `cairn-pass`. Steps use checkbox (`- [ ]`)
> syntax for tracking. Task 2 (the validator recursion) is the one correctness-critical task: upshift its
> dispatch with `model: opus`. Task 6 (the editor mockup) is a main-loop design checkpoint, not a
> `cairn-implementer` dispatch and not test-first.

**Goal:** Generalize the `array` field beyond references and add a flat `object` field, so a concept can
declare arrays of leaves (`array(text)`, `array(image)`) and repeatable flat rows
(`array(object({ ...leaves }))`) and labeled groups (`object({ ...leaves })`), edited through a new
repeatable-row editor, with nesting capped at one level.

**Architecture:** This is the first of the three-plan Contract v2 phase-3 series (3a containers → 3b adapter
restructure + concept model → 3c field-system unification). 3a is deliberately **additive**: it adds the
`object` descriptor, relaxes the `array`-is-reference-only declaration guard, enriches `ValidationResult`
with an optional `issues` array (multi-segment paths) while keeping the flat `errors` map for back-compat,
and recurses the validator, the form round-trip, and the inference exactly one level. Every task gates green
on its own, unlike the v2 cutover. The editor's `ReferenceField` chip UI and the `array(reference)` validator
and extractor stay exactly as shipped; references inside a container are deferred (the new guard forbids a
`reference` leaf inside an `object`). The trickiest seam is the form-to-frontmatter round-trip for nested
values, which extends the existing per-field decode to a recursive, name-prefixed decode and reuses the
shipped reference round-trip test pattern.

**Tech Stack:** TypeScript, Svelte 5 (runes), SvelteKit 2, DaisyUI 5 + Tailwind 4, Vitest (unit +
workerd-miniflare integration + real-browser component projects), Playwright (showcase e2e),
`@rodrigodagostino/svelte-sortable-list` (already a dependency, `sortItems` proven under Svelte 5 in
`src/tests/component/sortable-list.test.ts`).

## Revisions from the adversarial plan review (2026-06-26)

A three-lens adversarial review (round-trip/validator, type inference, Svelte editor) ran against this plan
and the real code before execution and found seven blocker-level defects plus several should-fixes, all
folded in below. The headline fixes, so an implementer reading a task knows why it deviates from the obvious
approach:

- **Type inference (Task 1).** `fields.object()` infers a polluted index-signature type unless `InferRecord`
  strips the index signature first (`RemoveIndex`); fixing it on the constructor leaves the deep
  `object > array > object` path polluted, so the fix lives in `InferRecord`. `ObjectField.label` is
  **optional**, so `array(object({ fields }))` needs no object label (the spec's canonical usage). A field key
  containing a dot is rejected at declaration (the round-trip addresses nested values by dotted path).
- **Round-trip (Task 3).** The shipped `content-frontmatter.test.ts` pins that a top-level empty text stores
  `''` and an empty multiselect stores `[]`; the new nested decode omits empties, so the top-level arms stay
  exactly as shipped and only the new container arms use the omit-on-empty `decodeField`. Empty array rows are
  pruned (minimal-frontmatter); a row with any non-default content survives. `oneLeafFormValue` MUST route
  through the real `formValues` (that is what keeps a date inside a row from drifting). The lone-scalar
  multiselect display bug is fixed in passing.
- **Editor (Tasks 5, 7).** Array rows must be keyed by a stable id (a `{ id, value }` UI envelope) or remove
  and reorder lose in-progress edits and focus; the id is a seed-time counter, not `randomUUID` (which would
  cause an SSR hydration mismatch). `MediaHeroField` builds its hidden-input names off `field.name`, so a
  nested image must receive the prefixed `name` as its field name, and its one-arg `onneedsaltchange` must be
  wrapped into the host's `(name, n)` handler. `heroFieldRefs` keys by the prefixed name to avoid collision.
- **SEO (Task 4).** `seo-fields.ts` reads a hardcoded key list with no schema walk, so an object-nested seo
  image cannot resolve at delivery; this phase forbids `seo` outside a top-level image and defers nesting.
  Task 4 no longer touches `seo-fields.ts`.
- Two reactivity fears were checked and found **UNFOUNDED**: the `{#key entryKey}` wrapper
  (`EditPage.svelte:1415-2299`) already remounts field components on entry change, so RepeatableField must
  **NOT** add a re-seed `$effect` (that would reintroduce the effect-loop hazard a prior pass hit); and the
  one-level container recursion terminates. The per-row sentinel the review proposed is **not** adopted:
  empty rows are pruned anyway, and a row with content emits a form key, so a counter-keyed envelope plus
  drop-empty is sufficient (verified).

## Global Constraints

- **Worktree, not the main checkout.** Execute on a feature worktree off `main` (per STATUS). Every Edit/Write
  targets the worktree path. A symlinked-`node_modules` worktree must run `npm run package` before `npm test`,
  or `EditorToolbar`'s dist import fakes a browser-pool flake.
- **Held unpublished.** This ships as **0.71.0** (additive, minor) but is **not** published; the held window
  (0.69.0 onward) rolls into one release when the whole v2 series lands. Bump the version and sync the **root
  lockfile self-version** in the same commit (`check:version` does not catch the lockfile self-version, and CI
  `npm ci` needs it).
- **Additive, no breaking change.** No `Consumers must:` changelog line. Existing concept configs, the shipped
  `array(reference)`, `ReferenceField`, the reference extractor, and the reference rename rewriter are
  untouched. The shipped regression locks that must stay green unchanged: `fieldset-validate.test.ts` (Task 2),
  `content-frontmatter.test.ts` (Task 3's top-level decode contract), `frontmatter-reference-roundtrip.test.ts`
  (Task 3), and `fieldset-infer.test.ts` (Task 1's inference).
- **One-level nesting cap.** An `object` holds only leaf fields (scalars + `image`). An `array` holds a leaf
  (scalar, `image`, or `reference`) or a flat `object` of leaves. There is no `array(array(...))`, no
  `object` inside `object`, no `object` inside `array(object)`, and (this phase) no `reference` inside an
  `object`. No field key (top-level or container leaf) may contain a dot, since the form round-trip addresses
  nested values by a dotted path. Enforce all of this loudly at declaration.
- **Full gate per task.** Targeted test green, then `npm run check` 0 errors / 0 warnings, then `npm test`
  exit 0 (a passing assertion count is not enough; an unhandled rejection can leave tests green and exit 1).
  `check:comments` and the doc gates run at the pass-end (Task 9), but a task that adds an exported symbol
  documents it in the same task.
- **TSDoc on every exported symbol** (`check:reference` requires it); the local `house/no-em-dash-in-comments`
  rule bans the em dash in comments. New exports: `fields.object`, `ObjectField`, `ValidationIssue`, and the
  new editor components.

---

## File structure

| File | Responsibility | Tasks |
|---|---|---|
| `src/lib/content/fields.ts` | `ObjectField` descriptor (optional label) + `fields.object()`; relax the `array` doc | 1 |
| `src/lib/content/fieldset.ts` | one-level-cap + dotted-key guard, `ValueOf` object arm, `RemoveIndex`+`InferRecord` fix, the recursive validator + `issues`, the seo guard | 1, 2, 4 |
| `src/lib/content/types.ts` | `ValidationIssue`, the additive `issues?` on `ValidationResult` | 2 |
| `src/lib/content/frontmatter.ts` | recursive omit-on-empty `decodeField` + `decodeRows` (top-level arms unchanged), `formValues` recursion + lone-scalar multiselect fix | 3 |
| `src/lib/components/FieldInput.svelte` | **new**: the leaf-field dispatcher, extracted from `EditPage`, name-prefixable; wraps `MediaHeroField`'s name + alt callback | 5 |
| `src/lib/components/EditPage.svelte` | call `FieldInput` per detail field; wire `object`/`array` arms | 5, 7 |
| `src/lib/components/ObjectGroupField.svelte` | **new**: a labeled group of leaves | 7 |
| `src/lib/components/RepeatableField.svelte` | **new**: the array repeatable-row editor (keyed rows, add/remove/reorder, itemLabel, live region) | 7 |
| `examples/showcase/src/lib/cairn.config.ts` + content + e2e | exercise `array(object)` + `array(image)`, incl. remove/reorder | 8 |
| `docs/reference/core.md`, a guide, an explanation, `CHANGELOG.md`, upgrade guide, `package.json` | docs + bump | 9 |

Task 4 no longer modifies `src/lib/delivery/seo-fields.ts` (see Task 4). Test homes: unit in `src/tests/unit/`,
real-browser component in `src/tests/component/`, showcase e2e in `examples/showcase/tests/`.

---

### Task 1: The `object` descriptor, `fields.object()`, the relaxed `array`, the nesting + dotted-key guard, and the inference fix

**Files:**
- Modify: `src/lib/content/fields.ts` (add `ObjectField` with optional label ~after line 85; extend the union
  ~101-114; add the `object` constructor ~after 146; relax the `array` doc 147-154)
- Modify: `src/lib/content/fieldset.ts` (add the `ValueOf` object arm ~61; add `RemoveIndex` and rewrite
  `InferRecord` ~78; replace `checkArrayItems` 291-304 with `checkContainerNesting`; call it at 316)
- Test: `src/tests/unit/fieldset-infer.test.ts`, `src/tests/unit/fields-descriptors.test.ts`,
  `src/tests/unit/fieldset-seo.test.ts` (guard cases)

**Interfaces:**
- Produces: `ObjectField` (`{ type: 'object'; label?: string; fields: Record<string, FieldDescriptor> }`),
  `fields.object(o)` preserving `{ fields: F }`, the relaxed `ArrayField` (its `item` may now be any leaf or a
  flat `object`), `checkContainerNesting(record)`, and a `RemoveIndex`-corrected `InferRecord`.
  `ValueOf<object>` is `InferRecord<F>`; `ValueOf<array(object)>` is `InferRecord<F>[]`.
- Consumes: the existing `FieldDescriptor` union, `FieldBase`, the `ValueOf`/`InferRecord`/`Prettify` machinery.

- [ ] **Step 1: Write the failing type + guard tests**

In `src/tests/unit/fieldset-infer.test.ts` (the file already uses `expectTypeOf`/`toEqualTypeOf`). Note the
`object` calls omit `label` deliberately, to prove the optional-label fix; the `toEqualTypeOf` exactness is
what catches the index-signature pollution:

```ts
it('infers a flat object as a record of its leaf value types', () => {
  const fs = fieldset({
    address: fields.object({ fields: { street: fields.text({ label: 'Street', required: true }), zip: fields.text({ label: 'Zip' }) } }),
  });
  expectTypeOf<InferFieldset<typeof fs>>().toEqualTypeOf<{ address?: { street: string; zip?: string } }>();
});

it('infers an array of flat objects', () => {
  const fs = fieldset({
    faq: fields.array(fields.object({ fields: { q: fields.text({ label: 'Q', required: true }), a: fields.textarea({ label: 'A' }) } }), { label: 'FAQ' }),
  });
  expectTypeOf<InferFieldset<typeof fs>>().toEqualTypeOf<{ faq?: { q: string; a?: string }[] }>();
});

it('infers an array of a non-reference leaf', () => {
  const fs = fieldset({ aliases: fields.array(fields.text({ label: 'Alias' }), { label: 'Aliases' }) });
  expectTypeOf<InferFieldset<typeof fs>>().toEqualTypeOf<{ aliases?: string[] }>();
});

it('preserves a nested literal option union and a top-level object label', () => {
  const fs = fieldset({
    meta: fields.object({ label: 'Meta', fields: { kind: fields.select({ label: 'Kind', options: ['a', 'b'] }) } }),
  });
  expectTypeOf<InferFieldset<typeof fs>>().toEqualTypeOf<{ meta?: { kind?: 'a' | 'b' } }>();
});
```

In `src/tests/unit/fieldset-seo.test.ts` (or `fields-descriptors.test.ts`) add the guard cases:

```ts
it('rejects an object nested in an object', () => {
  expect(() => fieldset({
    a: fields.object({ fields: { b: fields.object({ fields: { c: fields.text({ label: 'C' }) } }) } }),
  })).toThrow(/one level|leaf field/i);
});

it('rejects an array of arrays', () => {
  expect(() => fieldset({ a: fields.array(fields.array(fields.text({ label: 'T' }))) })).toThrow(/leaf or a flat object/i);
});

it('rejects a reference inside an object (deferred this phase)', () => {
  expect(() => fieldset({
    a: fields.object({ fields: { author: fields.reference({ concept: 'pages', label: 'Author' }) } }),
  })).toThrow(/reference/i);
});

it('rejects a field key containing a dot', () => {
  expect(() => fieldset({ 'og.image': fields.text({ label: 'X' }) })).toThrow(/dot/i);
});

it('still accepts a top-level array of references', () => {
  expect(() => fieldset({ related: fields.array(fields.reference({ concept: 'posts', label: '' })) })).not.toThrow();
});
```

- [ ] **Step 2: Run, verify failures**

Run: `npx vitest run src/tests/unit/fieldset-infer.test.ts src/tests/unit/fieldset-seo.test.ts`
Expected: FAIL (no `fields.object`; the guard does not exist yet). The inference file will also fail to
COMPILE until Step 3-4, which is expected at this stage.

- [ ] **Step 3: Add `ObjectField` (optional label) and `fields.object()` to `fields.ts`**

Add the interface after `ImageField` (after line 85, before `ReferenceField`). `label` is **optional** here,
unlike every leaf: an `object` inside an `array` is labeled by the array and summarized per row by
`itemLabel`, so it carries no label of its own (the spec's `array(object({ fields }))` form), while a
top-level object provides one for its group legend.

```ts
/** A group of leaf fields, stored as a nested object. Holds only leaves (no nested container). */
export interface ObjectField extends Omit<FieldBase, 'label'> {
  type: 'object';
  /**
   * Optional group label. An object inside an array is labeled by the array (and summarized per row by
   *  itemLabel), so it may omit this; a top-level object supplies it for the group legend.
   */
  label?: string;
  /** The leaf fields this group holds, keyed by frontmatter sub-key. */
  fields: Record<string, FieldDescriptor>;
}
```

Add `| ObjectField` to the `FieldDescriptor` union (line ~101-114). Relax the `array` constructor doc and the
`ArrayField.item` doc (remove "This phase accepts only a reference item"): the item is "a leaf, or a flat
object of leaves". Add the constructor to the `fields` namespace (after `image`, near line 144):

```ts
  /** A group of leaf fields, preserving each leaf's type for inference. Label is optional (the array labels a row group). */
  object: <const F extends Record<string, FieldDescriptor>, const O extends Omit<ObjectField, 'type' | 'fields'>>(
    o: { fields: F } & O,
  ): ObjectField & { fields: F } & O => ({ type: 'object', ...o }),
```

- [ ] **Step 4: Add the `ValueOf` object arm AND strip the index signature in `InferRecord`**

In `ValueOf` (line 55-69), add an arm before the `select` arm so `object` maps to its inferred record. The
`array` arm already recurses (`ValueOf<I>[]`), so `array(object)` composes for free:

```ts
  : D extends { type: 'object'; fields: infer F extends Record<string, FieldDescriptor> }
    ? InferRecord<F>
```

The arm alone infers a POLLUTED type. `ObjectField.fields` is declared `Record<string, FieldDescriptor>` (an
index signature) intersected with the captured literal record, so `InferRecord` maps the `[x: string]`
signature too and emits `{ [x: string]: ...; a: string; b?: string }`. The adversarial type review verified
this fails `toEqualTypeOf` and so fails `npm run check`. Fix it in `InferRecord` (NOT on the constructor; the
constructor-`Omit` approach leaves the deep `object > array > object` path polluted) by stripping the index
signature first. This exact form was verified to compile 0/0 including the shipped `fieldset-infer.test.ts`:

```ts
/** Drop an index signature so a captured literal record infers its own keys only, not `[x: string]`. */
type RemoveIndex<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

type InferRecord<RR extends Record<string, FieldDescriptor>, R = RemoveIndex<RR>> = Prettify<
  { -readonly [K in keyof R as R[K] extends { required: true } ? K : never]: ValueOf<R[K] extends FieldDescriptor ? R[K] : never> } & {
    -readonly [K in keyof R as R[K] extends { required: true } ? never : K]?: ValueOf<R[K] extends FieldDescriptor ? R[K] : never>;
  }
>;
```

(The co-recursive `ValueOf`/`InferRecord` aliases are legal; the review confirmed no instantiation-depth
blowup, and the object arm cannot shadow another arm since no other descriptor carries `type: 'object'`.)

- [ ] **Step 5: Replace `checkArrayItems` with `checkContainerNesting`**

Delete `checkArrayItems` (291-304) and its call at 316; add the recursive guard and call it at 316. It
enforces the one-level cap, forbids a `reference` inside an `object` (deferred this phase), and forbids a dot
in any key (the round-trip addresses nested values by `name.index.leafKey`, which a dotted key would make
ambiguous).

```ts
// A leaf is any non-container descriptor. A container (object, array) may hold leaves one level deep only.
function isLeaf(field: FieldDescriptor): boolean {
  return field.type !== 'object' && field.type !== 'array';
}

// Enforce the one-level nesting cap, the no-reference-in-object deferral, and the no-dot-in-key rule, all
// loudly at declaration. A deeper nesting, a nested reference, or a dotted key would otherwise mis-save or
// mis-decode at the edge, so fail here.
function checkContainerNesting(record: Record<string, FieldDescriptor>): void {
  const checkKey = (k: string, where: string): void => {
    if (k.includes('.')) throw new Error(`cairn: ${where} "${k}" must not contain a dot; field keys address the nested form by dotted path.`);
  };
  const checkObjectLeaves = (fieldsRecord: Record<string, FieldDescriptor>, where: string): void => {
    for (const [k, leaf] of Object.entries(fieldsRecord)) {
      checkKey(k, where);
      if (!isLeaf(leaf)) {
        throw new Error(`cairn: ${where} "${k}" must be a leaf field; containers nest one level only.`);
      }
      if (leaf.type === 'reference') {
        throw new Error(`cairn: ${where} "${k}" is a reference; a reference inside an object is not supported this phase. Model it as the parent's own concept, or use a top-level array(reference).`);
      }
    }
  };
  for (const [key, field] of Object.entries(record)) {
    checkKey(key, 'the field');
    if (field.type === 'object') {
      checkObjectLeaves(field.fields, `the object field "${key}" sub-field`);
    } else if (field.type === 'array') {
      const item = field.item;
      if (item.type === 'object') {
        checkObjectLeaves(item.fields, `the array field "${key}" row sub-field`);
      } else if (!isLeaf(item)) {
        throw new Error(`cairn: the array field "${key}" item must be a leaf or a flat object; an array of arrays is not allowed.`);
      }
    }
  }
}
```

Replace the call at line 316 (`checkArrayItems(record);`) with `checkContainerNesting(record);`.

- [ ] **Step 6: Run the tests, verify green**

Run: `npx vitest run src/tests/unit/fieldset-infer.test.ts src/tests/unit/fieldset-seo.test.ts src/tests/unit/fields-descriptors.test.ts`
Expected: PASS. Then `npm run check` (0/0), `npm test` exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/content/fields.ts src/lib/content/fieldset.ts src/tests/unit/fieldset-infer.test.ts src/tests/unit/fieldset-seo.test.ts src/tests/unit/fields-descriptors.test.ts
git commit -m "feat(fields): add object container, relax array, cap nesting, fix object inference"
```

---

### Task 2: Recursive validation with multi-segment issue paths

**Correctness-critical. Dispatch with `model: opus`.** This rewrites `validateField` from a mutate-the-maps
function to a return-an-outcome function so it can recurse, and adds an additive `issues` array to
`ValidationResult`. The shipped `src/tests/unit/fieldset-validate.test.ts` is the regression lock and must
stay green unchanged. The adversarial review verified that the planned back-compat `errors` derivation, the
Standard Schema issue ordering, the `structuralKey` pattern lookup, and the `coerceImage` inlining are all
behavior-preserving; the risk is solely in faithfully porting each arm.

**Files:**
- Modify: `src/lib/content/types.ts` (add `ValidationIssue`; add `issues?` to the error variant, 35-37)
- Modify: `src/lib/content/fieldset.ts` (rewrite `validateField` 133-275 to return an outcome; recurse for
  `object` and the non-reference `array`; extend the pattern compile to nested leaves; build `errors` +
  `issues` in the `validate` closure 325-334; emit `issues` from `~standard` 335-345)
- Test: `src/tests/unit/fieldset-validate.test.ts` (add nested cases; keep all existing cases)

**Interfaces:**
- Produces: `ValidationIssue` (`{ path: (string | number)[]; message: string }`); `ValidationResult` error
  variant gains `issues?: ValidationIssue[]`; `validateField(path, field, value, patterns) => FieldOutcome`
  where `FieldOutcome = { value?: unknown; issues: ValidationIssue[] }`.
- Consumes: `ObjectField`/relaxed `ArrayField` from Task 1, the existing `coerceImage`/`coerceToText`/
  `referenceIdsFromValue`/`field-rules` helpers.

- [ ] **Step 1: Write the failing tests** in `src/tests/unit/fieldset-validate.test.ts`

```ts
it('reports a nested required error with a multi-segment path', () => {
  const fs = fieldset({
    faq: fields.array(fields.object({ fields: { q: fields.text({ label: 'Question', required: true }), a: fields.textarea({ label: 'Answer' }) } }), { label: 'FAQ' }),
  });
  const r = fs.validate({ faq: [{ q: '', a: 'an answer' }] }, '');
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.issues).toEqual([{ path: ['faq', 0, 'q'], message: 'Question is required' }]);
    expect(r.errors.faq).toBe('Question is required'); // back-compat: top-level key carries the first message
  }
});

it('validates and stores a clean array of objects', () => {
  const fs = fieldset({ faq: fields.array(fields.object({ fields: { q: fields.text({ label: 'Q', required: true }), a: fields.textarea({ label: 'A' }) } })) });
  const r = fs.validate({ faq: [{ q: 'one', a: 'two' }, { q: 'three' }] }, '');
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.data.faq).toEqual([{ q: 'one', a: 'two' }, { q: 'three' }]);
});

it('reports an object leaf error with a two-segment path', () => {
  const fs = fieldset({ meta: fields.object({ fields: { count: fields.number({ label: 'Count', integer: true }) } }) });
  const r = fs.validate({ meta: { count: '1.5' } }, '');
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.issues).toEqual([{ path: ['meta', 'count'], message: 'Count must be a whole number' }]);
});

it('reports an array-of-leaf element error with an index path', () => {
  const fs = fieldset({ links: fields.array(fields.url({ label: 'Link' })) });
  const r = fs.validate({ links: ['https://ok.example', 'not-a-url'] }, '');
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.issues).toEqual([{ path: ['links', 1], message: 'Link is not a valid URL' }]);
});
```

- [ ] **Step 2: Run, verify failures**

Run: `npx vitest run src/tests/unit/fieldset-validate.test.ts`
Expected: FAIL (no `issues`; the validator does not recurse).

- [ ] **Step 3: Add `ValidationIssue` and `issues?` in `types.ts`**

```ts
/** One validation failure located by a path: a top-level key, then a row index and/or a leaf sub-key. */
export interface ValidationIssue {
  /** The path to the failing field, e.g. ['faq', 0, 'question'] or ['address', 'city'] or ['title']. */
  path: (string | number)[];
  /** The author-facing message, naming the field's label. */
  message: string;
}

/**
 * A validator's verdict. On success it carries the normalized frontmatter to commit; on failure it carries
 * field-keyed error messages (the empty key is a form-level error) and, additively, the located `issues`
 * with multi-segment paths so the form can route a nested-container error to the right input.
 */
export type ValidationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: Record<string, string>; issues?: ValidationIssue[] };
```

- [ ] **Step 4: Rewrite `validateField` to return an outcome and recurse**

Change the signature and every arm. The mechanical rule: an arm that **stored** `data[key] = x` now
`return { value: x, issues: [] }`; an arm that **dropped** (empty optional) now `return { issues: [] }`
(no `value` key); an arm that **errored** now `return { issues: [{ path, message }] }`. The `path` parameter
is the full path to this field. Add the `object` and non-reference `array` arms. Keep `array(reference)` on
the existing reference-list path exactly.

```ts
/** The outcome of validating one field: the stored value when present, plus any located issues. */
interface FieldOutcome {
  value?: unknown;
  issues: ValidationIssue[];
}

// Build the structural key for a path by dropping numeric (row-index) segments, so a nested text field's
// compiled pattern is found regardless of which row it sits in: ['faq', 2, 'code'] -> 'faq.code'.
function structuralKey(path: (string | number)[]): string {
  return path.filter((seg) => typeof seg === 'string').join('.');
}

function validateField(
  path: (string | number)[],
  field: FieldDescriptor,
  value: unknown,
  patterns: Map<string, RegExp>,
): FieldOutcome {
  const label = field.label ?? '';

  // object: validate each leaf one level down, assembling a nested object value and concatenating issues
  // with the leaf key appended to the path. An empty (all-leaves-dropped) object omits the key; a required
  // empty object is an error on the object's own path.
  if (field.type === 'object') {
    const obj: Record<string, unknown> = {};
    const issues: ValidationIssue[] = [];
    const raw = value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    for (const [leafKey, leaf] of Object.entries(field.fields)) {
      const outcome = validateField([...path, leafKey], leaf, raw[leafKey], patterns);
      issues.push(...outcome.issues);
      if ('value' in outcome) obj[leafKey] = outcome.value;
    }
    if (issues.length > 0) return { issues };
    if (Object.keys(obj).length === 0) {
      return field.required ? { issues: [{ path, message: `${label} is required` }] } : { issues: [] };
    }
    return { value: obj, issues };
  }

  // array: a reference item keeps the shipped id-list path; any other item recurses per element with the
  // element index appended to the path. A required empty list errors on the array's own path.
  if (field.type === 'array') {
    if (field.item.type === 'reference') {
      const list = referenceIdsFromValue(value);
      if (field.required && list.length === 0) return { issues: [{ path, message: `${label} is required` }] };
      const invalid = list.find((id) => !isValidId(id));
      if (invalid !== undefined) return { issues: [{ path, message: `${label} is not a valid reference` }] };
      return list.length > 0 ? { value: list, issues: [] } : { issues: [] };
    }
    const elements = Array.isArray(value) ? value : [];
    const out: unknown[] = [];
    const issues: ValidationIssue[] = [];
    elements.forEach((element, i) => {
      const outcome = validateField([...path, i], field.item, element, patterns);
      issues.push(...outcome.issues);
      if ('value' in outcome) out.push(outcome.value);
    });
    if (issues.length > 0) return { issues };
    if (out.length === 0) {
      return field.required ? { issues: [{ path, message: `${label} is required` }] } : { issues: [] };
    }
    return { value: out, issues };
  }

  if (field.type === 'boolean') {
    return value === true ? { value: true, issues: [] } : { issues: [] };
  }

  if (field.type === 'multiselect') {
    // ...port the shipped multiselect body: errors -> return { issues: [{ path, message }] };
    //    a stored list -> return { value: list, issues: [] }; an empty drop -> return { issues: [] }.
  }

  if (field.type === 'image') {
    // ...inline coerceImage returning a FieldOutcome: a stored ImageValue -> { value, issues: [] };
    //    a required-empty src -> { issues: [{ path, message }] }; an empty optional -> { issues: [] }.
  }

  const text = coerceToText(field.type, value);
  if (text === '') {
    return field.required ? { issues: [{ path, message: `${label} is required` }] } : { issues: [] };
  }

  const key = structuralKey(path);
  switch (field.type) {
    // ...each case from the shipped switch, but: errors -> return { issues: [{ path, message }] };
    //    a stored value -> return { value: <coerced>, issues: [] }. Use patterns.get(key) for text/textarea.
  }
}
```

Port each shipped arm body verbatim, changing only the write/return form and using `path` for the message
location and `structuralKey(path)` for the pattern lookup. Do not change any message text, any coercion, or
any constraint check; the shipped `fieldset-validate.test.ts` is the proof of behavior parity.

- [ ] **Step 5: Recurse the pattern compile, and rebuild `errors`/`issues` in `validate`**

Extend the construction-time pattern walk (319-324) to recurse one level into `object` and `array(object)`
leaves, keyed by `structuralKey` (so `'faq.code'`, `'address.zip'`):

```ts
const patterns = new Map<string, RegExp>();
const compilePatternsIn = (rec: Record<string, FieldDescriptor>, prefix: string[]): void => {
  for (const [k, f] of Object.entries(rec)) {
    if ((f.type === 'text' || f.type === 'textarea') && f.pattern != null) {
      patterns.set([...prefix, k].join('.'), compilePattern(f.pattern, f.label));
    } else if (f.type === 'object') {
      compilePatternsIn(f.fields, [...prefix, k]);
    } else if (f.type === 'array' && f.item.type === 'object') {
      compilePatternsIn(f.item.fields, [...prefix, k]);
    } else if (f.type === 'array' && (f.item.type === 'text' || f.item.type === 'textarea') && f.item.pattern != null) {
      patterns.set([...prefix, k].join('.'), compilePattern(f.item.pattern, f.item.label));
    }
  }
};
compilePatternsIn(record, []);
```

Rewrite the `validate` closure (325-334) to drive the outcome-returning `validateField`, derive the
back-compat flat `errors` from the issues (top-level key -> first message), and carry `issues`:

```ts
const validate = (frontmatter: Record<string, unknown>, body: string): ValidationResult => {
  const data: Record<string, unknown> = {};
  const issues: ValidationIssue[] = [];
  for (const [key, field] of Object.entries(record)) {
    const outcome = validateField([key], field, frontmatter[key], patterns);
    issues.push(...outcome.issues);
    if ('value' in outcome) data[key] = outcome.value;
  }
  if (issues.length > 0) {
    const errors: Record<string, string> = {};
    for (const issue of issues) {
      const top = String(issue.path[0]);
      if (!(top in errors)) errors[top] = issue.message;
    }
    return { ok: false, errors, issues };
  }
  const refined = options.refine?.(data, body);
  if (refined && Object.keys(refined).length > 0) {
    return { ok: false, errors: refined, issues: Object.entries(refined).map(([k, m]) => ({ path: [k], message: m })) };
  }
  return { ok: true, data };
};
```

Update the `~standard` adapter (335-345) to emit the located issues directly when present:

```ts
return result.ok
  ? { value: result.data }
  : { issues: (result.issues ?? Object.entries(result.errors).map(([key, message]) => ({ message, path: [key] }))) };
```

- [ ] **Step 6: Run, verify green; run the full regression**

Run: `npx vitest run src/tests/unit/fieldset-validate.test.ts src/tests/unit/fieldset-seo.test.ts`
Expected: PASS, with every previously-passing case still green. Then `npm run check` (0/0), `npm test` exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/content/types.ts src/lib/content/fieldset.ts src/tests/unit/fieldset-validate.test.ts
git commit -m "feat(validate): recurse one level with multi-segment issue paths"
```

---

### Task 3: The nested form round-trip (decode, serialize, formValues)

**Files:**
- Modify: `src/lib/content/frontmatter.ts` (add a nested `decodeField` + `decodeRows`; branch the `array` arm
  and add an `object` arm in `frontmatterFromForm` 22-88, leaving every other arm as shipped; add object/array
  arms to `formValues` 178-206 and fix the multiselect lone-scalar display)
- Test: `src/tests/unit/frontmatter-container-roundtrip.test.ts` (**new**, mirror
  `frontmatter-reference-roundtrip.test.ts`)

**Interfaces:**
- Produces: `frontmatterFromForm` decoding `object` (`name.leafkey` inputs) and `array` (`name.N` for a leaf
  element, `name.N.leafkey` for an object row), and `formValues` returning nested form-ready values. The
  hidden-input naming scheme `name.N.leafkey` is the contract the editor (Task 7) emits to.
- Consumes: the relaxed descriptors (Task 1), the existing leaf decode arms, `isClosedMultiselect`,
  `referenceId(s)FromValue`, and the date/datetime coercers.

- [ ] **Step 1: Write the failing round-trip test** (`src/tests/unit/frontmatter-container-roundtrip.test.ts`)

The test covers both sides the reference round-trip taught us to cover: side A (form-authored, decode →
serialize → parse → display) and side B (disk-authored, a parsed value such as a `Date` or a lone scalar →
display), because side A passes even when the nested display arm is broken.

```ts
import { describe, it, expect } from 'vitest';
import { frontmatterFromForm, formValues, serializeMarkdown, parseMarkdown } from '../../lib/content/frontmatter.js';
import type { NamedField } from '../../lib/content/types.js';

const faq: NamedField = {
  name: 'faq', type: 'array', label: 'FAQ',
  item: { type: 'object', fields: { q: { type: 'text', label: 'Q' }, a: { type: 'textarea', label: 'A' }, featured: { type: 'boolean', label: 'Featured' } } },
};
const gallery: NamedField = { name: 'gallery', type: 'array', label: 'Gallery', item: { type: 'image', label: 'Image' } };
const meta: NamedField = { name: 'meta', type: 'object', label: 'Meta', fields: { note: { type: 'text', label: 'Note' }, when: { type: 'date', label: 'When' }, tags: { type: 'multiselect', label: 'Tags', creatable: true } } };
const fields = [faq, gallery, meta];

it('round-trips an array of objects (side A)', () => {
  const form = new FormData();
  form.set('faq.0.q', 'First?'); form.set('faq.0.a', 'Yes.');
  form.set('faq.1.q', 'Second?'); form.set('faq.1.a', 'Also yes.');
  const fm = frontmatterFromForm(fields, form);
  expect(fm.faq).toEqual([{ q: 'First?', a: 'Yes.' }, { q: 'Second?', a: 'Also yes.' }]);
  const reloaded = parseMarkdown(serializeMarkdown(fm, 'body')).frontmatter;
  expect((formValues(fields, reloaded).faq as unknown[])).toEqual([{ q: 'First?', a: 'Yes.', featured: false }, { q: 'Second?', a: 'Also yes.', featured: false }]);
});

it('keeps a checked-boolean-only row, prunes an all-default row', () => {
  const form = new FormData();
  form.set('faq.0.q', '');                 // all-default row 0: q empty, no featured key
  form.set('faq.1.featured', 'on');        // row 1: featured only, checked
  expect(frontmatterFromForm(fields, form).faq).toEqual([{ featured: true }]);
});

it('round-trips a date leaf inside a row, and reads a disk-authored Date (side B)', () => {
  const form = new FormData();
  form.set('meta.note', 'hi'); form.set('meta.when', '2026-01-02');
  const fm = frontmatterFromForm(fields, form);
  const reloaded = parseMarkdown(serializeMarkdown(fm, 'body')).frontmatter;
  expect((formValues(fields, reloaded).meta as Record<string, unknown>).when).toBe('2026-01-02');
  // side B: a parsed YAML Date inside a nested object must coerce, not String(Date) drift.
  expect((formValues(fields, { meta: { when: new Date('2026-01-02T00:00:00Z') } }).meta as Record<string, unknown>).when).toBe('2026-01-02');
});

it('coerces a disk-authored lone-scalar nested multiselect to a one-element list (side B)', () => {
  expect((formValues(fields, { meta: { tags: 'lone' } }).meta as Record<string, unknown>).tags).toEqual(['lone']);
});

it('round-trips an array of images', () => {
  const form = new FormData();
  form.set('gallery.0.src', 'media:a'); form.set('gallery.0.alt', 'A');
  form.set('gallery.1.src', 'media:b'); form.set('gallery.1.alt', 'B');
  expect(frontmatterFromForm(fields, form).gallery).toEqual([{ src: 'media:a', alt: 'A' }, { src: 'media:b', alt: 'B' }]);
});

it('omits an empty object and an empty array key', () => {
  expect('meta' in frontmatterFromForm(fields, new FormData())).toBe(false);
  expect('faq' in frontmatterFromForm(fields, new FormData())).toBe(false);
});
```

- [ ] **Step 2: Run, verify failures**

Run: `npx vitest run src/tests/unit/frontmatter-container-roundtrip.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add object/array decode, keeping the shipped top-level arms intact**

Do NOT refactor the existing top-level arms into a shared helper: the shipped `content-frontmatter.test.ts`
pins that an empty top-level text stores `''` and an empty top-level multiselect stores `[]` (omitting only
image/reference/array, which already omit). The adversarial review confirmed a blanket omit-on-empty refactor
breaks three shipped assertions. So keep `frontmatterFromForm`'s switch exactly as shipped for
boolean/multiselect/image/reference/default, BRANCH the `array` case on its item type, and ADD an `object`
case. Nested decoding uses a new recursive `decodeField` whose semantics are OMIT-ON-EMPTY (correct for a
nested leaf, where a blank sub-field drops rather than littering the row):

```ts
import type { FieldDescriptor } from './fields.js';

// Decode one field addressed by `name`, for NESTED use (object leaves, array rows). Returns undefined when
// empty so the caller omits the key; this nested contract differs from the top-level arms, which preserve
// '' / [] for back-compat. Recurses one level for an object item.
function decodeField(name: string, field: FieldDescriptor, form: FormData): unknown {
  switch (field.type) {
    case 'boolean':
      return form.get(name) === 'on' ? true : undefined;
    case 'multiselect': {
      const list = isClosedMultiselect(field)
        ? form.getAll(name).map(String)
        : [...new Set(String(form.get(name) ?? '').split(',').map((t) => t.trim()).filter(Boolean))];
      return list.length > 0 ? list : undefined;
    }
    case 'image': {
      const src = String(form.get(`${name}.src`) ?? '').trim();
      if (src === '') return undefined;
      const value: ImageValue = { src, alt: String(form.get(`${name}.alt`) ?? '') };
      const caption = String(form.get(`${name}.caption`) ?? '').trim();
      if (caption !== '') value.caption = caption;
      if (String(form.get(`${name}.decorative`) ?? '') === 'true') value.decorative = true;
      return value;
    }
    case 'object': {
      const obj: Record<string, unknown> = {};
      for (const [leafKey, leaf] of Object.entries(field.fields)) {
        const v = decodeField(`${name}.${leafKey}`, leaf, form);
        if (v !== undefined) obj[leafKey] = v;
      }
      return Object.keys(obj).length > 0 ? obj : undefined;
    }
    default: {
      // text, textarea, number-as-string, url, email, date, datetime: a trimmed non-empty string.
      const s = String(form.get(name) ?? '').trim();
      return s === '' ? undefined : s;
    }
  }
}

// Enumerate array rows by any present name.<i>.* key, decode each item, and drop a row that decodes to empty
// (minimal-frontmatter). A row with any non-default content emits at least one key (a text leaf submits even
// when empty; a checked boolean submits its key), so a present-but-meaningful row is always seen; a fully
// all-default row carries no data and is correctly pruned. Output order follows ascending index, which the
// editor's keyed rows keep in sync.
function decodeRows(name: string, item: FieldDescriptor, form: FormData): unknown[] {
  const indices = new Set<number>();
  const prefix = `${name}.`;
  for (const k of form.keys()) {
    if (!k.startsWith(prefix)) continue;
    const n = Number(k.slice(prefix.length).split('.')[0]);
    if (Number.isInteger(n)) indices.add(n);
  }
  const rows: unknown[] = [];
  for (const i of [...indices].sort((a, b) => a - b)) {
    const v = decodeField(`${name}.${i}`, item, form);
    if (v !== undefined) rows.push(v);
  }
  return rows;
}
```

Then branch the existing `array` case and add the `object` case in `frontmatterFromForm`, leaving every other
case exactly as shipped:

```ts
case 'array': {
  if (field.item.type === 'reference') {
    // shipped path, unchanged:
    const ids = form.getAll(field.name).map(String).map((id) => id.trim()).filter(Boolean);
    if (ids.length > 0) data[field.name] = ids;
    break;
  }
  const rows = decodeRows(field.name, field.item, form);
  if (rows.length > 0) data[field.name] = rows;
  break;
}
case 'object': {
  const obj = decodeField(field.name, field, form);
  if (obj !== undefined) data[field.name] = obj;
  break;
}
```

- [ ] **Step 4: Add object/array arms to `formValues`, and fix the lone-scalar multiselect display**

First fix the existing top-level multiselect arm (line 191) so a disk-authored lone scalar shows in the
editor instead of vanishing (it currently returns `[]` for a non-array, while the validator coerces a lone
scalar to a one-element list; the review flagged this latent asymmetry, now reachable nested):

```ts
else if (field.type === 'multiselect') out[field.name] = Array.isArray(value) ? value.map(String) : (typeof value === 'string' && value.trim() !== '' ? [value.trim()] : []);
```

Then add the container arms before the final `else`, recursing one level into a nested form-ready value:

```ts
else if (field.type === 'object') {
  const raw = value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  out[field.name] = formValues(namedLeaves(field.fields), raw);
}
else if (field.type === 'array') {
  if (field.item.type === 'reference') out[field.name] = referenceIdsFromValue(value);
  else {
    const elements = Array.isArray(value) ? value : [];
    const item = field.item;
    out[field.name] = elements.map((el) =>
      item.type === 'object'
        ? formValues(namedLeaves(item.fields), el !== null && typeof el === 'object' ? (el as Record<string, unknown>) : {})
        : oneLeafFormValue(item, el),
    );
  }
}
```

Add two module-private helpers. `oneLeafFormValue` MUST route through the real `formValues` (not a bespoke
per-type switch): the review verified the nested date/datetime/multiselect/image arms all reuse the existing
coercers this way, which is exactly what keeps a date inside a row from drifting.

```ts
/** The NamedField[] shape formValues iterates, derived from a container's keyed sub-field record. */
function namedLeaves(record: Record<string, FieldDescriptor>): NamedField[] {
  return Object.entries(record).map(([name, f]) => ({ ...f, name }));
}

/** The form value for one leaf array element, reusing the per-type rules so dates/images/etc. coerce identically. */
function oneLeafFormValue(field: FieldDescriptor, value: unknown): unknown {
  return formValues([{ ...field, name: '_' } as NamedField], { _: value })._;
}
```

- [ ] **Step 5: Run, verify green; run the shipped regression locks**

Run: `npx vitest run src/tests/unit/frontmatter-container-roundtrip.test.ts src/tests/unit/frontmatter-reference-roundtrip.test.ts src/tests/unit/content-frontmatter.test.ts`
Expected: PASS (all three; `content-frontmatter.test.ts` proves the top-level decode contract is intact).
Then `npm run check` (0/0), `npm test` exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content/frontmatter.ts src/tests/unit/frontmatter-container-roundtrip.test.ts
git commit -m "feat(frontmatter): decode and round-trip nested object and array values"
```

---

### Task 4: Forbid `seo` outside a top-level image

**Re-scoped after the review.** `src/lib/delivery/seo-fields.ts` reads a hardcoded key list
(`description`, `image`, `robots`, `author`) directly off frontmatter, with no schema walk and no `seo`
predicate, so an object-nested seo image cannot resolve at delivery. Rather than rework the delivery seo
reader in this additive phase, 3a forbids `seo: true` anywhere except a top-level image leaf and defers
object-nested seo to the pass that generalizes delivery seo resolution (a 3b/concept-model concern). This
makes Task 4 a pure declaration-time guard with no delivery change.

**Files:**
- Modify: `src/lib/content/fieldset.ts` (`checkSeoImageFields` 280-289: keep the at-most-one rule over
  top-level images; throw on `seo: true` inside any `object` or `array`)
- Test: `src/tests/unit/fieldset-seo.test.ts`

**Interfaces:**
- Produces: the at-most-one-seo rule over top-level images; a loud throw on `seo: true` inside a container.
- Consumes: Task 1's `object` descriptor.

- [ ] **Step 1: Write the failing tests** in `src/tests/unit/fieldset-seo.test.ts`

```ts
it('still allows one top-level seo image', () => {
  expect(() => fieldset({ hero: fields.image({ label: 'Hero', seo: true }) })).not.toThrow();
});

it('forbids an seo image inside an object (deferred this phase)', () => {
  expect(() => fieldset({ box: fields.object({ fields: { pic: fields.image({ label: 'Pic', seo: true }) } }) })).toThrow(/seo/i);
});

it('forbids an seo image inside an array', () => {
  expect(() => fieldset({ gallery: fields.array(fields.image({ label: 'Shot', seo: true })) })).toThrow(/seo/i);
});

it('still rejects two top-level seo images', () => {
  expect(() => fieldset({
    a: fields.image({ label: 'A', seo: true }),
    b: fields.image({ label: 'B', seo: true }),
  })).toThrow(/at most one/i);
});
```

- [ ] **Step 2: Run, verify failures.** `npx vitest run src/tests/unit/fieldset-seo.test.ts` -> FAIL.

- [ ] **Step 3: Extend `checkSeoImageFields`**

```ts
function checkSeoImageFields(record: Record<string, FieldDescriptor>): void {
  const seo: string[] = [];
  for (const [key, field] of Object.entries(record)) {
    if (field.type === 'image' && field.seo === true) seo.push(`"${key}"`);
    else if (field.type === 'object') {
      for (const [leafKey, leaf] of Object.entries(field.fields)) {
        if (leaf.type === 'image' && leaf.seo === true) {
          throw new Error(`cairn: the image "${key}.${leafKey}" sets seo: true, but a nested seo image is not supported this phase. Put the social-card image at the top level.`);
        }
      }
    } else if (field.type === 'array') {
      const item = field.item;
      const nested = (item.type === 'image' && item.seo === true)
        || (item.type === 'object' && Object.values(item.fields).some((l) => l.type === 'image' && l.seo === true));
      if (nested) {
        throw new Error(`cairn: the array field "${key}" declares an seo image, but an array would mean one social card per row. Put seo: true on a top-level image.`);
      }
    }
  }
  if (seo.length > 1) {
    throw new Error(`cairn: a concept declares at most one SEO image field, but found ${seo.length} (${seo.join(', ')}). Set seo: false on all but one.`);
  }
}
```

- [ ] **Step 4: Run, verify green.** `npx vitest run src/tests/unit/fieldset-seo.test.ts` -> PASS. Then `npm run check` (0/0), `npm test` exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/fieldset.ts src/tests/unit/fieldset-seo.test.ts
git commit -m "feat(seo): forbid seo outside a top-level image, defer nested seo"
```

---

### Task 5: Extract the leaf-field dispatcher into `FieldInput.svelte`

A behavior-preserving refactor: move the inline `{#if field.type === ...}` chain (`EditPage.svelte`
1904-2058) into a reusable, name-prefixable component, so a container row (Task 7) renders its leaves through
the same dispatcher recursed one level. No new field types render yet; `object`/`array(non-reference)` still
fall through to the existing text fallback after this task (Task 7 wires them).

The review surfaced three concrete wiring fixes that the mechanical "replace `name={field.name}` with
`name={name}`" rule does not cover, all because `MediaHeroField` is a child component, not a raw input.

**Files:**
- Create: `src/lib/components/FieldInput.svelte`
- Modify: `src/lib/components/EditPage.svelte` (replace the inline chain 1904-2059 with a `FieldInput` call;
  keep the surrounding `<fieldset>`/`<legend>` and the `{#each detailFields}`)
- Test: existing `src/tests/component/edit-page-v2-fields.test.ts`, `EditPage.test.ts`,
  `edit-page-field-hint.test.ts`, `reference-field.test.ts` are the regression lock; add
  `src/tests/component/field-input.test.ts` for the name-prefix and nested-image-name contracts.

**Interfaces:**
- Produces: `FieldInput` with props `{ field: NamedField; name?: string; frontmatter: Record<string, unknown>;
  targets: LinkTarget[]; markFieldsDirty: () => void; mediaLibrary; conceptId; id; heroFieldRefs;
  onuploaded; onheroneedsalt: (name: string, needsAlt: boolean) => void }`. `name` defaults to `field.name`;
  nested callers pass `${parent}.${index}` or `${parent}.${leafkey}`. The `value` each arm reads comes from
  `frontmatter[field.name]` at top level; nested callers pass a row/object slice as `frontmatter` and the leaf
  key as `field.name`, so the arm's reads are unchanged.
- Consumes: `MediaHeroField`, `ReferenceField`, `isClosedMultiselect`, the `str`/`fieldHint`/`DATE_PUBLISH_HINT`
  helpers, `LinkTarget`.

- [ ] **Step 1: Pin the regression behavior.** Run `npm run package` then
  `npx vitest run src/tests/component/edit-page-v2-fields.test.ts src/tests/component/EditPage.test.ts src/tests/component/reference-field.test.ts` and confirm green before refactoring.

- [ ] **Step 2: Create `FieldInput.svelte`** carrying the exact markup from `EditPage.svelte` 1905-2057
  (textarea, number, select, url, email, datetime, date, boolean, both multiselect arms, image, reference +
  array(reference), and the text fallback). Replace every `field` capture with the component's `field` prop,
  every `data.frontmatter[field.name]` read with `frontmatter[field.name]`, and every raw input
  `name={field.name}` / `name={f.name}` with `name={name}` (default `name = field.name`). Thread the other
  props through. Three wiring fixes the review verified are required:

  - **The image arm passes the prefixed `name` into `MediaHeroField`**, because `MediaHeroField` builds its
    hidden inputs `{field.name}.src` / `.alt` / `.caption` / `.decorative` off its own `field.name`
    (`MediaHeroField.svelte:458-461`). Pass `field={{ name, label: field.label }}` (the `name` prop, not
    `field.name`), so a nested image at `gallery.0` emits `gallery.0.src`, which the Task 3 decoder reads.
  - **Wrap `MediaHeroField`'s one-arg alt callback** into the host's two-arg one. `MediaHeroField` fires
    `onneedsaltchange?: (needsAlt: boolean) => void` (`MediaHeroField.svelte:79,152`), so wire
    `onneedsaltchange={(n) => onheroneedsalt(name, n)}`. Passing the two-arg `onheroneedsalt` directly would
    set `heroNeedsAlt[undefined]` and silently break the needs-alt notice.
  - **Bind the hero ref under the prefixed `name`**, `bind:this={heroFieldRefs[name]}` (not `field.name`), so
    two gallery rows do not clobber one `heroFieldRefs` slot.

  Add the `@component` block (Svelte convention) stating purpose, the name-prefix contract, and the
  one-level-recursion role.

- [ ] **Step 3: Call `FieldInput` from `EditPage`.** Replace the inner chain (1905-2057) with:

```svelte
{#each detailFields as field (field.name)}
  <FieldInput
    {field}
    frontmatter={data.frontmatter}
    targets={data.linkTargets}
    markFieldsDirty={markFieldsDirty}
    mediaLibrary={mediaLibrary}
    conceptId={data.conceptId}
    id={data.id}
    heroFieldRefs={heroFieldRefs}
    onuploaded={(record) => (uploadedRecords = [...uploadedRecords, record])}
    onheroneedsalt={(name, n) => (heroNeedsAlt = { ...heroNeedsAlt, [name]: n })}
  />
{/each}
```

  Keep the outer `<fieldset>`/`<legend class="sr-only">Details</legend>` and the `{#if detailFields.length}`.
  Import `FieldInput` in `EditPage`'s script. The existing top-level hero-alt focus flow (`heroFieldRefs`,
  `heroRows`, `imageFields`) stays unchanged and top-level only; nested-image alt-debt remediation is
  deferred (a carry-forward), so the prefixed keying here only prevents collisions, it does not add a nested
  remediation row.

- [ ] **Step 4: Add the name-prefix tests** (`src/tests/component/field-input.test.ts`): render `FieldInput`
  with `field = { name: 'q', type: 'text', label: 'Q' }`, `name="faq.0.q"`, `frontmatter={{ q: 'hi' }}`, and
  assert the input has `name="faq.0.q"` and `value="hi"`. Add an image case: `field = { name: 'photo', type:
  'image', label: 'Photo' }`, `name="gallery.0"`, and assert the rendered hidden input is `name="gallery.0.src"`
  (this is the case the generic name-prefix test would miss).

- [ ] **Step 5: Run, verify green.** `npm run package` then
  `npx vitest run src/tests/component/edit-page-v2-fields.test.ts src/tests/component/EditPage.test.ts src/tests/component/reference-field.test.ts src/tests/component/field-input.test.ts`. Then `npm run check` (0/0), `npm test` exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/FieldInput.svelte src/lib/components/EditPage.svelte src/tests/component/field-input.test.ts
git commit -m "refactor(editor): extract FieldInput leaf dispatcher, name-prefixable for nesting"
```

---

### Task 6: Mockup the repeatable-row and object-group editor (main-loop design checkpoint)

**Not a `cairn-implementer` dispatch and not test-first.** Run the `frontend-design` skill in the main loop to
settle the editor's interaction model before building it, per the mockup-first UI methodology. The deliverable
is an agreed component contract for Task 7, not shipped engine code. The adversarial review already pinned the
load-bearing a11y requirements below; the mockup decides the visual treatment within the admin design system.

- [ ] **Step 1:** Read `docs/internal/admin-design-system.md` (Warm Stone tokens, eyebrow groups, the
  fieldset/legend recipe, the load-bearing `data-theme`-on-a-bare-wrapper rule).
- [ ] **Step 2:** Invoke `frontend-design` with these criteria: a repeatable list of rows where each row shows
  its `itemLabel` value as a collapsed summary and expands to edit (answering the deferred #4b "Details panel
  buries fields", which nesting worsens); keyboard-operable **add / remove / reorder** as the a11y baseline
  (up/down controls, not drag-only; drag via `@rodrigodagostino/svelte-sortable-list` is an optional
  enhancement layered on `sortItems`); an `object` renders as a labeled `<fieldset>`/`<legend>` group matching
  the existing Details groups.
- [ ] **Step 3:** These a11y requirements are fixed (from the review) and must appear in the contract:
  - **An always-mounted polite live region** for add/remove announcements (mount it empty and fill it later;
    a `{#if}`-gated `role="status"` inserted fresh announces inconsistently, the lesson the needs-alt region
    at `EditPage.svelte:689-699` already encodes).
  - **A defined focus-return chain** on remove: focus the next row, else the previous row, else the "Add"
    button. On add, focus the new row's first input.
- [ ] **Step 4:** Record the settled contract (the props, the hidden-input naming `name.N.leafkey` from Task 3,
  the reorder affordance, the summary derivation) inline in this task as the spec Task 7 builds to.

No commit (no engine code). If a throwaway mockup file is produced, keep it out of `src/lib`.

---

### Task 7: Build `RepeatableField` + `ObjectGroupField`, wire into `FieldInput`

**Files:**
- Create: `src/lib/components/ObjectGroupField.svelte`, `src/lib/components/RepeatableField.svelte`
- Modify: `src/lib/components/FieldInput.svelte` (add the `object` and non-reference `array` arms before the
  text fallback)
- Test: `src/tests/component/repeatable-field.test.ts`, `src/tests/component/object-group-field.test.ts`,
  and a container case added to `src/tests/component/edit-page-v2-fields.test.ts`

**Interfaces:**
- Produces: `ObjectGroupField` (props `{ field: NamedField & ObjectField; name: string; frontmatter; ...the
  FieldInput pass-throughs }`) rendering each leaf via `FieldInput` with `name={`${name}.${leafKey}`}` and the
  object slice as `frontmatter`; `RepeatableField` (props `{ field: NamedField & ArrayField; name: string;
  rows: unknown[]; ...pass-throughs }`) rendering each row via `FieldInput` (leaf item) or `ObjectGroupField`
  (object item) at `name={`${name}.${i}`}`, with add/remove/reorder and the `itemLabel` summary.
- Consumes: `FieldInput` (Task 5), `sortItems` from `@rodrigodagostino/svelte-sortable-list`, the Task 3
  decode contract (`name.N.leafkey`, drop-empty rows).

- [ ] **Step 1: Write the failing component tests** (`repeatable-field.test.ts`). The review's B1 is the
  load-bearing case the showcase e2e (add+save only) would miss, so test it here: render a `RepeatableField`
  for `faq: array(object({ q: text, a: textarea }))` seeded with two rows, **type into row B's input, remove
  row A, and assert row B keeps its typed value and the focus** (the unkeyed-each data-loss case); assert
  reorder via the up/down controls flips the rendered order AND the input `name` indices re-sequence; assert
  add appends a row and focuses its first input; assert the collapsed summary shows the `itemLabel` value.
  In `object-group-field.test.ts`, render `meta: object({ note: text })` and assert one `name="meta.note"`
  input. Add an `edit-page-v2-fields.test.ts` case: an `array(object)` field renders a RepeatableField in the
  Details panel.

- [ ] **Step 2: Run, verify failures.** `npm run package` then
  `npx vitest run src/tests/component/repeatable-field.test.ts src/tests/component/object-group-field.test.ts` -> FAIL.

- [ ] **Step 3: Build `ObjectGroupField.svelte`** as a `<fieldset class="...">`/`<legend>` group rendering
  `{#each Object.entries(field.fields) as [leafKey, leaf]}` a `FieldInput` with
  `field={{ ...leaf, name: leafKey }}`, `name={`${name}.${leafKey}`}`, and `frontmatter={objectSlice}` (the
  object value, defaulting to `{}`). Pass through `markFieldsDirty` and the media props. Use the object's
  `label` for the legend, falling back to a humanized key when absent (label is optional). Match the existing
  Details `<fieldset>`/`<legend>` recipe. Add the `@component` block.

- [ ] **Step 4: Build `RepeatableField.svelte`.** Key the rows to survive remove and reorder without losing
  in-progress edits or focus (review B1), seed once (review confirmed the `{#key entryKey}` wrapper at
  `EditPage.svelte:1415-2299` remounts this component on entry change, and save is a native 303 redirect, so
  **do NOT add a re-seed `$effect`** — that reintroduces the effect-loop hazard for no benefit):

  - Wrap each row in a `{ id, value }` envelope at seed; the `id` is a **seed-time counter** (not
    `crypto.randomUUID()`, which would differ between SSR and client and cause a hydration mismatch):
    `let nextId = value.length; let rows = $state(untrack(() => value.map((v, i) => ({ id: i, value: v }))));`
  - Render `{#each rows as row, i (row.id)}` so node identity follows the row through reorder/remove; derive
    each child's `name` from the position `i` (`${name}.${i}`), so the decoder reads a compact, ordered set.
    Pass `row.value` as the FieldInput value / ObjectGroupField slice. The envelope is UI-only; it never
    reaches the form, so the Task 3 decoder is unaffected.
  - For an `object` item render `ObjectGroupField`; for a leaf item render a single `FieldInput`, both at
    `name={`${name}.${i}`}`.
  - Controls: "Add {label}" appends `{ id: nextId++, value: <empty> }` and focuses the new row's first input;
    per-row "Remove" drops the row and moves focus per the chain (next row, else previous, else the Add
    button); per-row "Move up"/"Move down" call `rows = sortItems(rows, i, i + dir)` (the proven helper,
    which preserves the envelope refs so data and focus follow the row).
  - Every **structural** mutation (add, remove, reorder) calls `markFieldsDirty()` (these do not fire the form
    `oninput`). A leaf edit inside a row does NOT need it: the row inputs sit inside the edit `<form>` whose
    `oninput` bubbles (review confirmed), so typing already marks the form dirty.
  - Mount an always-empty polite live region (`<div role="status" aria-live="polite" class="sr-only">`) and
    fill it on add/remove ("Row added", "Row removed"); do not gate it behind `{#if}`.
  - Add the `@component` block.

- [ ] **Step 5: Wire the arms into `FieldInput`.** Before the text fallback, add:

```svelte
{:else if field.type === 'object'}
  <ObjectGroupField {field} {name} frontmatter={(frontmatter[field.name] ?? {}) as Record<string, unknown>} {markFieldsDirty} {mediaLibrary} {conceptId} {id} {heroFieldRefs} {targets} {onuploaded} {onheroneedsalt} />
{:else if field.type === 'array' && field.item.type !== 'reference'}
  <RepeatableField {field} {name} rows={(frontmatter[field.name] ?? []) as unknown[]} {markFieldsDirty} {mediaLibrary} {conceptId} {id} {heroFieldRefs} {targets} {onuploaded} {onheroneedsalt} />
```

  The `array(reference)` arm stays on `ReferenceField`; `reference` stays unchanged. The one-level cap (Task 1
  guard) guarantees the inner `FieldInput` only ever sees leaves, so this recursion terminates.

- [ ] **Step 6: Run, verify green.** `npm run package` then the three test files above, plus the
  `edit-page-v2-fields.test.ts` and `EditPage.test.ts` regression. Then `npm run check` (0/0), `npm test` exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/ObjectGroupField.svelte src/lib/components/RepeatableField.svelte src/lib/components/FieldInput.svelte src/tests/component/repeatable-field.test.ts src/tests/component/object-group-field.test.ts src/tests/component/edit-page-v2-fields.test.ts
git commit -m "feat(editor): keyed repeatable-row and object-group editors for container fields"
```

---

### Task 8: Exercise containers in the showcase end to end

**Files:**
- Modify: `examples/showcase/src/lib/cairn.config.ts` (add an `array(object)` and an `array(image)` field to a
  concept)
- Modify/Create: a showcase content entry under `examples/showcase/src/content/` using the new fields
- Create: `examples/showcase/tests/container-fields.spec.ts`

**Interfaces:**
- Consumes: the full 3a stack (descriptor, validator, round-trip, editor).

- [ ] **Step 1: Add the fields.** In `examples/showcase/src/lib/cairn.config.ts` posts `schema` (near line
  119-137), add (note the `object` carries no label; the `array` labels the group):

```ts
faq: fields.array(
  fields.object({ fields: { question: fields.text({ label: 'Question', required: true }), answer: fields.textarea({ label: 'Answer', required: true }) } }),
  { label: 'FAQ', itemLabel: 'question' },
),
gallery: fields.array(fields.image({ label: 'Image' }), { label: 'Gallery' }),
```

- [ ] **Step 2: Write the failing e2e** (`examples/showcase/tests/container-fields.spec.ts`), following
  `golden-path.spec.ts` for sign-in and navigation. Open a post's edit page, **open the Details slide-over
  first** (carry-forward #4a: a field e2e must open Details before the field exists in the DOM), add an FAQ
  row, fill question + answer, **add a second row, reorder the two, then remove one** (exercising the B1 path
  the unit test also covers, end to end), save, reload, and assert the surviving row persists in order; add a
  gallery image and assert it round-trips.

- [ ] **Step 3: Run, verify it fails, then passes against a fresh build.** Per `cairn-pass`, prove the
  consumer build, not only `npm test`. Run the showcase e2e with a from-scratch build:

```bash
rm -rf examples/showcase/{node_modules,package-lock.json}
npm --prefix examples/showcase install
npm run package
npm --prefix examples/showcase run build
npm --prefix examples/showcase run test:e2e
```

Expected: the new spec passes; commit the regenerated `examples/showcase/package-lock.json` (CI uses `npm ci`).

- [ ] **Step 4: Commit**

```bash
git add examples/showcase/src/lib/cairn.config.ts examples/showcase/src/content examples/showcase/tests/container-fields.spec.ts examples/showcase/package-lock.json
git commit -m "test(showcase): exercise array(object) and array(image) end to end"
```

---

### Task 9: Docs, gates, and the 0.71.0 bump

**Files:**
- Modify: `docs/reference/core.md` (document `fields.object`, the generalized `fields.array`, `ObjectField`,
  `ValidationIssue`, the enriched `ValidationResult`, the one-level cap and the no-dot-in-key rule; update the
  `ValidationResult` row at 720)
- Create: a guide page (e.g. `docs/guides/structured-fields.md`) for repeatable and grouped fields, linked from
  `docs/guides/README.md`
- Modify/Create: an explanation note on the one-level cap and the model-as-a-concept escape hatch (link from
  `docs/explanation/README.md`)
- Modify: `CHANGELOG.md`, `docs/guides/upgrade-cairn.md` (one 0.71.0 entry each, additive, no `Consumers must:`)
- Modify: `package.json` (`0.70.0` -> `0.71.0`) and sync the root `package-lock.json` self-version

- [ ] **Step 1:** Write the reference entries (every new export needs a doc; `check:reference` and
  `check:reference:signatures` enforce coverage and signature match). Document `fields.object`, the relaxed
  `fields.array` item rule, `ObjectField`, `ValidationIssue`, and the `issues?` field on `ValidationResult`.
- [ ] **Step 2:** Write the guide and the explanation note (Google developer-docs style; Vale runs the Google
  package over `docs/reference|guides|explanation|tutorial`). Show an FAQ and a gallery example, state the
  one-level cap with the "model it as its own concept and a reference" escape hatch, and note that an seo image
  must be top-level this phase.
- [ ] **Step 3:** Add the changelog + upgrade-guide entries: object/array containers and the repeatable-row
  editor, additive, held in the unpublished v2 window.
- [ ] **Step 4:** Bump `package.json` to `0.71.0`; run the repo's lockfile-sync so the root lockfile's
  self-version matches, and stage both.
- [ ] **Step 5: Run every gate.**

```bash
npm run check            # 0 errors, 0 warnings
npm test                 # exit 0
npm run check:comments   # ESLint TSDoc + em-dash, src/lib
npm run check:reference
npm run check:reference:signatures
npm run check:package
npm run check:docs
npm run check:version    # minor -> 0.71.0
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add docs CHANGELOG.md package.json package-lock.json
git commit -m "docs(fields): document object/array containers; bump to 0.71.0"
```

---

## Pass-end ritual (after Task 9, per `cairn-pass`)

1. **Simplify:** dispatch `code-simplifier:code-simplifier` over the changed code; review and apply.
2. **Review gate:** fan out `svelte-reviewer` (the three new components + the FieldInput extraction) and
   `daisyui-a11y-reviewer` (the repeatable editor's keyed rows, focus chain, live region, reorder control
   names), plus `/code-review`. The references post-mortem's durable lesson: the fan-out catches blockers the
   suite misses, especially in test-unexercised paths. Fold findings in test-first.
3. **Live admin smoke:** Task 7 touches `/admin`, so run the live admin smoke against `wrangler dev` per
   `docs/internal/admin-smoke-test.md` (mint a D1 session row): add an FAQ row, type, reorder, remove, save,
   reload, and confirm order and content persist (the B1 path, live).
4. **Docs gates:** confirm Task 9's four doc gates stayed green after the review fixes.
5. **Post-mortem + STATUS:** append the post-mortem to this plan file (what was built, evidence, decisions
   locked, blockers). Update `docs/STATUS.md` (on `main`): 3a shipped as 0.71.0 (held), next = 3b (adapter
   restructure + concept model), and refresh the `cairn-site-contract-v2-opportunity` memory.
6. **Commit** in the worktree; merge to `main` only when Geoff asks.

## Carry-forwards into 3b / later

- **Nested references** (deferred this phase by decision): a `reference` inside an `object` or `array(object)`
  needs the extractor to descend, the byte-preserving rename rewriter to address a nested YAML path, and the
  cross-branch index + rename/delete gates to cover nested edges. Queue as its own slice with its own integrity
  verification; the rename rewriter is the corruption-prone part (the references fan-out caught three bugs there).
- **Object-nested seo image** (deferred): `seo-fields.ts` reads a hardcoded key list with no schema walk, so
  delivery cannot resolve an `object.key` seo image. When delivery seo resolution is generalized to walk the
  schema (a 3b/concept-model fit), allow `seo: true` directly inside a top-level `object` per the v2 design,
  and relax the Task 4 guard.
- **Nested-image alt-debt gate** (deferred): the top-level `imageFields`/`heroRows` needs-alt notice does not
  count images inside containers. When nesting is common, walk one level so a gallery image's missing alt is
  surfaced; for now the gate stays top-level (alt is debt, never a save block).
- **itemLabel as a function** and **cross-field row validators** ride the data-vs-behavior split, which lands in
  3c (the `BehaviorTable` seam already exists in `fieldset.ts`). 3a keeps `itemLabel` a serializable field-key
  string.
- **3b** opens `content` (the type is the only thing still closed; `composeRuntime` already handles open
  concepts via `CairnExtension`), moves routing off the hardcoded `CONCEPT_ROUTING` table into `defineConcept`,
  brings URL policy home from the YAML, de-duplicates `siteName`, and regroups `CairnAdapter`/`CairnRuntime`
  into the six subsystem groups.

## Self-review

- **Spec coverage.** The design's "object and array primitives" section maps to Tasks 1-3, 7; the
  seo rule (re-scoped to top-level-only this phase) to Task 4; "validation and inference recurse exactly one
  level" and "multi-segment Standard Schema paths" to Tasks 1-2; the editor surface ("object as a labeled
  group, array as a repeatable list with add, remove, reorder, itemLabel") to Tasks 5-7; the
  showcase-is-the-first-consumer rule to Task 8. References-in-containers and object-nested seo are explicitly
  deferred and carried forward. The adapter restructure, concept model, and field-system unification are
  3b/3c, out of this plan by the agreed split.
- **Adversarial findings folded.** All seven blockers and the should-fixes from the three-lens review are in:
  the `RemoveIndex`/`InferRecord` inference fix and optional `ObjectField.label` (Task 1), the dotted-key guard
  (Task 1), the top-level-decode-contract preservation and the `content-frontmatter.test.ts` regression lock
  (Task 3), the drop-empty-row semantic with the side-B disk-authored tests (Task 3), the lone-scalar
  multiselect fix and the `oneLeafFormValue`-through-`formValues` rule (Task 3), the re-scoped top-level-only
  seo guard (Task 4), the `MediaHeroField` prefixed-name + alt-callback-wrap + prefixed `heroFieldRefs` and the
  `targets` prop (Task 5), and the keyed-row envelope (counter id, not `randomUUID`) + always-mounted live
  region + focus-return chain + no-re-seed-`$effect` (Task 7).
- **No placeholders.** Each code step shows real code or names the exact existing arm to port; the two "port
  the shipped body" notes (Task 2 multiselect/image/switch arms) point at the precise source lines and state
  the single mechanical change (return an outcome / use the `path`), with the shipped tests as the behavior
  lock.
- **Type/name consistency.** `ValidationIssue`, `FieldOutcome`, `structuralKey`, `decodeField`, `decodeRows`,
  `namedLeaves`, `oneLeafFormValue`, `RemoveIndex`, `FieldInput`, `ObjectGroupField`, `RepeatableField`, the
  `onheroneedsalt(name, n)` signature, and the `name.N.leafkey` input scheme are used consistently across
  tasks 1, 2, 3, 5, 7. The decoder (Task 3) and the editor (Task 7) agree on the hidden-input naming and the
  drop-empty-row semantic; the validator (Task 2) and the form (Task 3) agree that a missing optional omits
  the key.

---

## Post-mortem (2026-06-27)

**Shipped as 0.71.0 (additive, held unpublished), merged to `main`.** All nine plan tasks landed, plus a
pass-end review-fix commit and a code-simplifier commit. The full gate is green independently of the agents:
`npm run check` 1200 files 0 errors / 0 warnings, `npm test` exit 0 at **2689 tests** (from a 2651 baseline,
+38), all four doc gates plus `check:comments` and `check:version`. The showcase e2e exercises `array(object)`
(an FAQ) and `array(image)` (a gallery) end to end against a from-scratch consumer build, including
add, reorder, remove, save, and reload.

**What was built.** `fields.object()` and the relaxed `fields.array` (a leaf or a flat object), capped at one
level by `checkContainerNesting`; the recursive `fieldset` validator returning a `FieldOutcome` with
multi-segment `ValidationIssue` paths and a back-compat flat `errors` map; the `RemoveIndex`/`InferRecord`
inference fix; the nested form round-trip (`decodeField`/`decodeRows`, the `formValues` container arms, the
top-level arms preserved); the `seo`-top-level-only guard; the extracted name-prefixable `FieldInput`
dispatcher; the keyed `RepeatableField` + `ObjectGroupField` editors; the docs; the 0.71.0 bump plus the root
lockfile self-version sync. `ObjectField` and `ValidationIssue` are now root-barrel exports.

**Execution.** Test-first via `cairn-implementer` (Sonnet; the validator on opus) across two gated workflows
(logic core tasks 1-4, then editor + showcase + docs tasks 5, 7, 8, 9), each task self-clearing the full gate
and the workflow halting on any failure. Run on a feature branch in the main checkout, not a worktree, so the
headless workflow agents kept the default cwd and could not mis-target `main` (the `cd`-into-worktree
permission-prompt trap a worktree would have hit). The mockup (Task 6) was satisfied by the plan's pinned a11y
contract plus `admin-design-system.md` and the a11y reviewer, not a separate skill pass.

**The two-stage adversarial review earned its place again.** The pre-plan three-lens review (round-trip, types,
Svelte) caught seven blocker-level design defects before any code (the `InferRecord` index-signature
pollution, the optional-`label` compile error, the top-level-decode-contract regression, the keyed-row data
loss, the nested-image `MediaHeroField` wiring), all folded into the plan. The pass-end three-lens review then
caught a real blocker the seven hardened design points, the implementers, and 2685 passing tests all missed:
`RepeatableField`'s focus queries ran against `document`, so with two lists on one page (the showcase's FAQ +
gallery) add/remove/reorder moved focus into the wrong list (WCAG 2.4.3). Fixed by scoping every focus query
to the instance's `root` fieldset, proven by a two-instance regression test. The pass-end review also confirmed
the name round-trip, the keyed envelope, `markFieldsDirty`, and the recursion termination sound, and flagged
the misleading gallery hero copy (fixed: a `lead` prop plus label-derived copy). **Durable lesson reaffirmed:
the pre-plan sweep hardens the design; the pass-end fan-out catches the multi-instance and integration bug a
single-component test cannot. Both are necessary, and a workflow runs each as an independent fan-out.**

**Decisions locked.** Containers hold scalars and image only this phase; a `reference` inside a container, an
object-nested `seo` image, and a nested-image needs-alt advisory are deferred. `ObjectField.label` is optional
(the array labels a row group). Field keys may not contain a dot. Row keys use a seed-time counter, not
`randomUUID` (SSR hydration). The collapsed-row summary tracks live edits via a separate `summaries` map,
never by controlling the inputs. The Svelte 5 callback-ref form for `bind:this` does not compile, so the
benign `binding_property_non_reactive` warning on `heroFieldRefs[name]` stays with a comment.

**Carry-forwards (filed in ROADMAP):** nested references inside containers (the corruption-prone nested-YAML
rename rewriter); the object-nested seo image (when delivery seo resolution walks the schema rather than a
hardcoded key list); the nested-image needs-alt advisory; and `itemLabel`-as-function plus cross-field row
validators (the 3c behavior-table split). The live `wrangler dev` admin smoke is covered for this surface by
the passing showcase e2e and stays owed at the next site cutover.

**Next: 3b** — the adapter restructure into six subsystem groups plus the concept model (`defineConcept`, open
`content`, declared routing, URL policy home from the YAML), a fresh-session brainstorm. The open-concept
machinery already exists in `composeRuntime` via `CairnExtension`; only the adapter's `content` type is closed.
