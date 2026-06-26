# Contract v2 Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Read the "Execution model" section first: tasks 4-9 are one atomic compile unit and do NOT gate green individually.**

**Goal:** Make the Contract v2 field system (`fieldset()` + the `fields.*` constructors) the one live field system, replacing v1 (`defineFields`/`FrontmatterField`/`validate.ts`) across the editor, validator, delivery, manifest, and the showcase.

**Architecture:** The live seam is `ConceptDescriptor.fields` + `validate`, fed from `ConceptConfig.schema`. The cutover retypes `ConceptConfig.schema` from the v1 `ConceptSchema` (array, built by `defineFields`) to the v2 `Fieldset` (record, built by `fieldset`), and carries the descriptors internally as a derived `NamedField[]` (`FieldDescriptor & { name }`) so every downstream consumer keeps iterating an array and reading `.name` with a one-line type change. The v2 validator already handles every scalar; this pass completes the editor form for the five new scalar arms (number, select, url, email, datetime) and the unified multiselect (replacing tags + freetags), then deletes the v1 surface and reclaims its barrel names.

**Tech Stack:** TypeScript, Svelte 5 (runes), SvelteKit 2, Vitest (unit + integration in workerd/miniflare + component in a real browser), Playwright (showcase e2e), `svelte-package` + the dist-`.svelte` transpile step.

## Global Constraints

- **This is breaking within the 0.x window.** Version bump: **0.69.0**. Consumers migrate; the two production sites (ecxc-ski, 907-life) stay pinned to the prior range until they cut over. Publish to npm BEFORE pushing any consumer-site code that imports the reclaimed v2 names.
- **Scope is the field-system swap ONLY.** Out of scope (later plans): references (`fields.reference`), `object`/`array` containers, the adapter restructure / `defineConcept`, the backend seam, the render seam / islands, computed fields. Keep `ConceptConfig.schema` as the member name (typed `Fieldset`); do NOT rename it to `fields` and do NOT introduce `defineConcept`.
- **The gate (run once at the end, Task 11):** `npm run check` 0 errors AND 0 warnings; `npm test` EXIT 0 (a passing assertion count is not enough); `npm run check:comments`; the four doc gates `check:reference`, `check:reference:signatures`, `check:package`, `check:docs`; and the showcase e2e proven against a **from-scratch consumer build** (`rm -rf examples/showcase/{node_modules,package-lock.json}`, fresh install, `npm run build`), or a pushed CI `e2e` run.
- **`check` is svelte-check with 0 warnings.** An unused exported interface left in `types.ts` mid-migration is a TS6133 warning that fails the gate. Never leave a v1 interface defined-but-unexported-and-unused: couple each interface-body delete with its barrel-export prune.
- **`field-rules.ts` is shared by construction** and survives untouched. Do not duplicate its constraint helpers.
- **`.svelte` is not type-checked by ESLint** (the Svelte sub-parser is unwired). A missed `.svelte` field-read fails silently at runtime; the component tests are the only net. Grep `.svelte` for residual `.description` after the rename.
- TSDoc on every exported symbol (`check:comments` + `check:reference`); no em dash in code comments; the `house/no-em-dash-in-comments` rule is enforced.

---

## Execution model (read before dispatching)

The hazard sweep's central, code-confirmed finding: **the cutover is one atomic compile unit.** The instant `types.ts` retypes `ConceptConfig`'s generic to `Fieldset` and deletes the v1 `*Field` union, every consumer across `src/lib` breaks at once, and the shared test fixture (`_content-fixture.ts`, imported transitively by ~24 `schema.js`-deep-importing test files and ~17 `FrontmatterField` test files) breaks the whole suite's compile simultaneously. `npm run check` (0 errors AND 0 warnings) cannot pass at any mid-migration point.

This contradicts the normal cairn `cairn-implementer` contract (each task clears the full gate before reporting done). So:

- **Tasks 1-3 are pure-additive groundwork.** Each gates green on its own and may be a normal gated `cairn-implementer` dispatch.
- **Tasks 4-9 are ONE atomic change set.** They are authored and migrated in lockstep on a single worktree, gate-checked only at the END (the green gate is Task 9's compile + the suite). Write all new v2 tests red and KEEP them red; migrate every source + test consumer together; delete `schema.ts`/`validate.ts` only after their last consumer is gone (Task 8). Do NOT dispatch 4-9 as six independently-gated implementer tasks; execute them as a single coherent effort (main-loop orchestration, or one large dispatch that does 4-9 without mid-gating). The task split below is for review legibility and ordering, not for independent green gates.
- **Tasks 10-11 gate green again** (10 after the dist rebuild; 11 is the single full gate).

The "intermediate `npm run check`" is only legitimate at a coherent state where the v1 names are still BOTH defined AND exported (end of Task 3), never at a half-pruned barrel.

---

## File map

**Created:**
- `src/lib/content/standard-schema.ts` — new home for `StandardInput`/`StandardSchemaV1` (moved out of the deleted `schema.ts`).
- `src/tests/unit/fieldset-seo.test.ts` — the ported at-most-one-SEO-image guard test.
- `src/tests/component/edit-page-v2-fields.test.ts` — the new editor-arm component tests (number/select/url/email/datetime/multiselect).
- `src/tests/unit/content-routes-edit.test.ts` — datetime round-trip + initialValues prefill (if not folded into existing edit tests).

**Modified (engine):** `src/lib/content/types.ts`, `concepts.ts`, `fieldset.ts`, `frontmatter.ts`, `media-refs.ts`, `src/lib/sveltekit/content-routes.ts`, `src/lib/delivery/site-indexes.ts`, `src/lib/doctor/checks-local.ts`, `src/lib/components/EditPage.svelte`, `src/lib/index.ts`.

**Deleted:** `src/lib/content/schema.ts`, `src/lib/content/validate.ts`.

**Migrated (tests + fixture):** `_content-fixture.ts` and every deep importer of `content/schema.js`/`validate.js` and every `FrontmatterField` consumer (enumerated in Task 8).

**Migrated (consumer + docs):** `examples/showcase/src/lib/cairn.config.ts`, `examples/showcase/e2e/golden-path.spec.ts`, `docs/reference/core.md`, `scripts/check-reference-signatures.mjs`, plus the guide/explanation/tutorial pages that name a removed symbol.

---

## Locked decisions (the residual forks, resolved)

These were the synthesis's open questions; resolved here so every task has a single contract. Flagged for the review gate; defaults below are what the plan implements.

1. **`ConceptDescriptor.fields = NamedField[]`** (`FieldDescriptor & { name: string }`), the derived array re-attaching the record key in `concepts.ts`. Lowest blast radius: downstream consumers keep iterating an array reading `.name`.
2. **`StandardInput`/`StandardSchemaV1` move to `standard-schema.ts`** (relocated FIRST, before any `schema.ts` delete).
3. **Drop the `Infer` reclaim; keep only `InferFieldset` public.** Rename `fieldset.ts`'s module-local `Infer<R>` to `InferRecord<R>` to clear the way and avoid the TS2300 duplicate-identifier trap. `delivery/site-indexes.ts` re-points to `InferFieldset<S>`. One extractor name, no alias to maintain; consumers migrate anyway.
4. **datetime is naive-local, minute-precision (`YYYY-MM-DDTHH:mm`), round-tripped as text.** `serializeMarkdown` writes it as a quoted YAML string so it never re-parses as a `Date`; `formValues` passes it verbatim to `<input type="datetime-local">`; `coerceToText`'s `Date` branch for datetime formats with UTC getters to `YYYY-MM-DDTHH:mm` as a fallback. A dedicated round-trip test pins it. (This is the riskiest arm; the review-gate alternative is to defer the datetime editor arm and keep `fields.datetime` validator-only.)
5. **Add optional `placeholder?: string` to `MultiselectField`** to preserve v1 freetags placeholder parity (907-life uses it).
6. **Port `checkSeoImageFields` into `fieldset()`** (declaration-time, exact v1 parity). Note for the post-mortem: the runtime `og:image` reads the literal `image` key, not the `.seo` flag, so dropping the guard would only lose the loud-at-declaration multi-SEO error, not change runtime output. We keep the loud guard.
7. **Create-form prefill is wired live:** `editLoad` calls `initialValues(fieldset, new Date())` (server-side per-request, a clock is acceptable). A `default: 'today'` date field opens prefilled. Pinned with a test. This requires the `Fieldset` (not just `NamedField[]`) reachable at `editLoad` — thread it onto the descriptor.
8. **Optional select renders a leading empty `— none —` option** that submits `''` (key dropped on save); a required select also leads with an empty placeholder option so an unset value fails `required` with a clear message. The shared `isClosedMultiselect(field)` predicate gates the multiselect decode in BOTH the render arm and `frontmatterFromForm`.

---

### Task 1: Relocate `StandardInput`/`StandardSchemaV1` out of `schema.ts`

**Files:**
- Create: `src/lib/content/standard-schema.ts`
- Modify: `src/lib/content/fieldset.ts:8` (import), `src/lib/content/schema.ts:10-29` (remove the moved interfaces), `src/lib/index.ts:47` (re-export from the new module)
- Test: `src/tests/unit/fields-exports.test.ts` (assert the barrel still exports `StandardInput`/`StandardSchemaV1`)

**Interfaces:**
- Produces: `StandardInput { frontmatter: Record<string, unknown>; body: string }` and `StandardSchemaV1<Input, Output>` from `./content/standard-schema.js`.

- [ ] **Step 1:** Create `src/lib/content/standard-schema.ts` with the verbatim `StandardInput`, `StandardSchemaV1`, and the local `StandardResult` from `schema.ts:10-29`, with their existing TSDoc.
- [ ] **Step 2:** Re-point `fieldset.ts:8` to `import type { StandardInput, StandardSchemaV1 } from './standard-schema.js';`. Remove the now-moved interfaces from `schema.ts` and have `schema.ts` import them from `./standard-schema.js` (it still uses them until Task 8 deletes it).
- [ ] **Step 3:** In `index.ts`, change the `StandardInput, StandardSchemaV1` re-export source from `./content/schema.js` to `./content/standard-schema.js`.
- [ ] **Step 4:** Run `npm run check` (expect 0/0) and `npm test` (expect exit 0). This task is pure-additive and must stay green.
- [ ] **Step 5:** Commit `refactor(content): move Standard Schema types to their own module ahead of the v1 delete`.

---

### Task 2: Port the at-most-one-SEO-image guard into `fieldset()`

**Files:**
- Modify: `src/lib/content/fieldset.ts` (add the guard, called from `fieldset()`)
- Test: `src/tests/unit/fieldset-seo.test.ts`

**Interfaces:**
- Consumes: `Fieldset`, the `image` descriptor's `seo?: boolean`.
- Produces: `fieldset()` throws at declaration when more than one image field sets `seo: true`.

- [ ] **Step 1: Write the failing test** in `fieldset-seo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fieldset, fields } from '../../lib/index.js';

describe('fieldset SEO-image guard', () => {
  it('throws when two image fields both set seo: true', () => {
    expect(() =>
      fieldset({
        hero: fields.image({ label: 'Hero', seo: true }),
        cover: fields.image({ label: 'Cover', seo: true }),
      }),
    ).toThrow(/at most one SEO image/i);
  });
  it('allows one seo image plus other images', () => {
    expect(() =>
      fieldset({
        hero: fields.image({ label: 'Hero', seo: true }),
        thumb: fields.image({ label: 'Thumb' }),
      }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2:** Run `npx vitest run src/tests/unit/fieldset-seo.test.ts` — expect FAIL (no throw).
- [ ] **Step 3:** In `fieldset.ts`, add a `checkSeoImageFields(record)` adapted from `schema.ts:116-132` for the record shape (no back-compat `name === 'image'` default — v2 is explicit `seo: true` only, since the record key is arbitrary), and call it inside `fieldset()` before returning. The check: count entries where `descriptor.type === 'image' && descriptor.seo === true`; throw if `> 1`, naming the keys.
- [ ] **Step 4:** Run the test — expect PASS. Run `npm run check` 0/0 and `npm test` exit 0.
- [ ] **Step 5:** Commit `feat(content): port the at-most-one-SEO-image guard into fieldset()`.

---

### Task 3: Define `NamedField` and lock the descriptor contract

**Files:**
- Modify: `src/lib/content/types.ts` (add `NamedField`, import `FieldDescriptor` type-only)
- Test: covered by Task 4's seam tests (no standalone test; this is a type addition)

**Interfaces:**
- Produces: `export type NamedField = FieldDescriptor & { name: string };` — the descriptor with its record key re-attached, the shape `ConceptDescriptor.fields` carries.

- [ ] **Step 1:** Add to `types.ts`: `import type { FieldDescriptor } from './fields.js';` (type-only; the resulting cycle is erased at compile) and `export type NamedField = FieldDescriptor & { name: string };` with a one-line TSDoc ("A field descriptor with its frontmatter key re-attached as `name`, the normalized form `ConceptDescriptor.fields` carries.").
- [ ] **Step 2:** Run `npm run check` — expect 0/0 (additive; `NamedField` is unused but exported, so no unused-warning). `npm test` exit 0.
- [ ] **Step 3:** Commit `feat(content): add NamedField, the normalized descriptor shape for the v2 cutover`.

> **State at the end of Task 3:** v1 and v2 both exist and are both exported — the last coherent intermediate state. Tasks 4-9 below are the atomic core; do not gate-check between them.

---

### Task 4: Atomic seam — retype the contract, re-point the spine, delivery inference, and doctor

**Files:**
- Modify: `src/lib/content/types.ts` (retype `ConceptConfig`/`ConceptDescriptor`, delete the v1 `*Field` union + `FrontmatterField` + v1 `FieldBase`), `src/lib/content/concepts.ts` (lines 93, 112), `src/lib/delivery/site-indexes.ts` (lines 8, 27), `src/lib/doctor/checks-local.ts` (lines 11, 165)
- Modify (tests, written red here, green at Task 9): `src/tests/unit/_content-fixture.ts`, `src/tests/unit/content-concepts.test.ts`, `src/tests/unit/delivery-site-indexes.test.ts`

**Interfaces:**
- Consumes: `Fieldset` (Task 1 path unchanged), `NamedField` (Task 3).
- Produces: `ConceptConfig<S extends Fieldset = Fieldset>` with `schema: S`; `ConceptDescriptor.fields: NamedField[]`; `normalizeConcepts` derives `fields` via `Object.entries(schema.fields).map(([name, d]) => ({ name, ...d }))`.

- [ ] **Step 1: Migrate the fixture** `_content-fixture.ts` to v2 (this breaks the suite's compile — expected, kept red until Task 9). Replace the `defineFields([...])` arrays with `fieldset({...})` records: drop `name`, use `fields.*`, map v1 `tags` → `fields.multiselect({ options: [...] })`, `freetags` → `fields.multiselect({ creatable: true })`, `description` → `help`. Keep every frontmatter KEY identical (especially `tags`, which the delivery tag index reads literally).
- [ ] **Step 2:** In `types.ts`: change `import type { ConceptSchema } from './schema.js'` to `import type { Fieldset } from './fieldset.js'`; retype `ConceptConfig<S extends Fieldset = Fieldset>` with `schema: S`; retype `ConceptDescriptor.fields` to `NamedField[]` with an updated TSDoc; DELETE the v1 `FieldBase`, `TextField`..`ImageField`, and the `FrontmatterField` union. KEEP `ImageValue` and `ValidationResult`.
- [ ] **Step 3:** In `concepts.ts`: line 93 → `const declared = new Set(Object.keys(config.schema.fields));`; line 112 → `fields: Object.entries(config.schema.fields).map(([name, descriptor]) => ({ name, ...descriptor }))` (extract a local `namedFields(schema: Fieldset): NamedField[]` helper). Line 114 (`validate: config.schema.validate`) is unchanged.
- [ ] **Step 4:** In `site-indexes.ts`: line 8 `import type { InferFieldset } from '../content/fieldset.js';`; line 27 `ConceptConfig<infer S> ? InferFieldset<S> : ...`. **Keep `delivery-site-indexes.test.ts`'s exact `toEqualTypeOf<{ title: string; date?: string }>()` assertion** — it is the only tripwire for the silent `never` collapse; never weaken to `toMatchTypeOf`.
- [ ] **Step 5:** In `checks-local.ts`: line 11 `import { fieldset } from '...'` (drop `defineFields`); line 165 `schema: fieldset({})`.
- [ ] **Step 6:** Write `content-concepts.test.ts`'s named-descriptor assertion (the derived array has `{ name, type, ... }`) AND the inverse summaryFields assertion (a DECLARED summaryFields key does NOT throw, guarding against the Set-of-undefined regression). Keep the existing undeclared-key-throws assertion.
- [ ] **Step 7:** Do NOT run the full gate. `npm run check` will report errors in Tasks 5-9 consumers — expected. Proceed to Task 5.

---

### Task 5: Re-point the save path — decode, validate, multiselect, datetime round-trip, prefill

**Files:**
- Modify: `src/lib/content/frontmatter.ts` (`frontmatterFromForm`, `serializeMarkdown` datetime quoting), `src/lib/sveltekit/content-routes.ts` (`EditData.fields`, `formValues`, `editLoad`, the save action)
- Modify (tests, red until Task 9): `src/tests/unit/content-frontmatter.test.ts`, `src/tests/unit/content-routes-edit.test.ts`

**Interfaces:**
- Consumes: `NamedField[]` from `ConceptDescriptor.fields`; `Fieldset` + `initialValues` for prefill.
- Produces: `frontmatterFromForm(fields: NamedField[], form): Record<string, unknown>`; `formValues(fields: NamedField[], frontmatter): Record<string, ...>`; `isClosedMultiselect(field): boolean` (shared predicate, exported from `frontmatter.ts` so EditPage imports the same one).

- [ ] **Step 1:** Add the shared predicate to `frontmatter.ts`: `export function isClosedMultiselect(field: { type: string; options?: readonly string[]; creatable?: boolean }): boolean { return field.type === 'multiselect' && !!field.options && !field.creatable; }` with TSDoc.
- [ ] **Step 2: Write the failing decode tests** in `content-frontmatter.test.ts` — the four multiselect corners (closed→`getAll`; open no-options→comma-split; creatable-with-options→comma-split; empty→key dropped) and the datetime round-trip (`frontmatterFromForm` → `serializeMarkdown` → `parseMarkdown` → `formValues` yields the same `YYYY-MM-DDTHH:mm`). Run — expect FAIL.
- [ ] **Step 3:** In `frontmatterFromForm`, re-point the param to `NamedField[]`, iterate reading `field.name`, and replace the v1 `tags`/`freetags` arms with one `multiselect` arm keyed on `isClosedMultiselect` (closed → `form.getAll(name)`; else → comma-split + trim + drop-empty). Add `number`/`select`/`url`/`email` arms (read the single form value; the validator does format/range checks). Add the `datetime` arm (pass the `YYYY-MM-DDTHH:mm` string through). Ensure `serializeMarkdown` writes a datetime value as a quoted string so it never re-parses as a `Date`.
- [ ] **Step 4:** In `content-routes.ts`: retype `EditData.fields` to `NamedField[]`; `formValues` reads `field.name`, adds a `datetime` arm (a parsed `Date` → `YYYY-MM-DDTHH:mm` via UTC getters; a string → verbatim) mirroring the existing `date` arm, and a `multiselect` read-back (array → the value the editor arm expects). In `editLoad`'s `isNew` path, call `initialValues(concept.schema, new Date())` and merge over the empty frontmatter before `formValues`. (Requires the `Fieldset` on the descriptor — see Task 4 note; thread `concept.schema` through, or carry the fieldset on `ConceptDescriptor`.)
- [ ] **Step 5: Write the prefill test** in `content-routes-edit.test.ts`: an `isNew` load of a concept with a `date` field `default: 'today'` returns frontmatter prefilled with today's date.
- [ ] **Step 6:** Do NOT gate. Proceed.

> **Note on the `Fieldset` at `editLoad`:** `ConceptDescriptor` currently carries only `fields: NamedField[]` + `validate`. To call `initialValues(fieldset, ...)`, either add `initialValues: Record<string, unknown>` precomputed in `normalizeConcepts` (cleanest — no clock in the descriptor, but then `'today'` can't resolve at compose since compose is build-time/Workers-deterministic), OR carry the `Fieldset` reference on the descriptor and resolve at request time in `editLoad`. **Decision: carry `schema: Fieldset` on `ConceptDescriptor`** (additive field) so `editLoad` resolves `'today'` against a real request-time clock. Update `ConceptDescriptor` in Task 4 accordingly and `normalizeConcepts` to pass `schema: config.schema`.

---

### Task 6: Editor form arms for every v2 scalar + the `field.help` rename

**Files:**
- Modify: `src/lib/components/EditPage.svelte` (the field-type switch ~1887-1973, `MediaHeroField` invocation, ~11 `.description` reads)
- Test: `src/tests/component/edit-page-v2-fields.test.ts`, migrate `src/tests/component/edit-page-field-hint.test.ts`

**Interfaces:**
- Consumes: `NamedField[]`, `isClosedMultiselect` (imported from `../content/frontmatter.js`), `field.help`.

- [ ] **Step 1: Write the failing component tests** in `edit-page-v2-fields.test.ts`: render `EditPage` against a concept with `number`/`select`/`url`/`email`/`datetime`/closed-`multiselect`/creatable-`multiselect` fields and assert each renders the right control (`<input type="number">`, `<select>` with a leading empty option, `type="url"`, `type="email"`, `type="datetime-local"`, a checkbox group, a chip/tag input). Run — expect FAIL.
- [ ] **Step 2:** Re-point EditPage to iterate `NamedField[]`, keying `{#each detailFields as field (field.name)}` and all `.find`/`.filter`/`.map` off `field.name`. Replace every `field.description` read (lines ~1891-1973) with `field.help`. **Verify line ~1902 (the date arm)**: `fieldHint(field.name, field.help || DATE_PUBLISH_HINT)` must still let adapter help override `DATE_PUBLISH_HINT`.
- [ ] **Step 3:** Add the render arms: `number` (`<input type="number">` with `min`/`max`/`step` from `integer`), `select` (single `<select>`, leading `— none —` empty option), `url`/`email` (typed inputs), `datetime` (`<input type="datetime-local">`), and one `multiselect` arm branching on `isClosedMultiselect` — closed → checkbox group (the old `tags` UI, `aria-describedby` wired to the help id); creatable/open → chip input (the old `freetags` UI, honoring the new `placeholder`). Supply `MediaHeroField` the `name` from the record key.
- [ ] **Step 4:** Migrate `edit-page-field-hint.test.ts` to `help` and keep BOTH assertions (adapter-help-renders AND the `DATE_PUBLISH_HINT` fallback).
- [ ] **Step 5:** Grep `EditPage.svelte` for residual `\.description\b` — expect zero. Do NOT gate. Proceed.

---

### Task 7: Re-point `extractMediaRefs` to `NamedField[]`

**Files:**
- Modify: `src/lib/content/media-refs.ts` (lines 21, 30-60)
- Test: `src/tests/unit/content-media-refs.test.ts`

**Interfaces:**
- Consumes: `NamedField[]`.
- Produces: `extractMediaRefs(frontmatter, body, fields: NamedField[])` reading the hero from `field.name` where `field.type === 'image'`.

- [ ] **Step 1:** Migrate `content-media-refs.test.ts` fixtures to `NamedField`s (the test builds image field descriptors); add a regression assertion that a hero ref is found via the record key. Run — expect FAIL (signature/type).
- [ ] **Step 2:** Re-point the `fields` param type to `NamedField[]` (import from `../content/types.js`), drop the `FrontmatterField`/`ImageValue` import of the v1 names (`ImageValue` now from `types.ts` still). The iteration logic is unchanged (it already reads `field.type`/`field.name`).
- [ ] **Step 3:** Confirm `manifest.ts:57` (`extractMediaRefs(..., descriptor.fields)`) and `media/usage.ts:134` compile unchanged (they pass the descriptor's `NamedField[]`). Do NOT gate. Proceed.

---

### Task 8: Delete `schema.ts` + `validate.ts`, migrate ALL remaining v1 test consumers, port uncovered coverage

**Files:**
- Delete: `src/lib/content/schema.ts`, `src/lib/content/validate.ts`
- Migrate/delete tests (the full enumerated set — grep-verified, larger than the named clusters):
  - **Delete (v1-only, coverage ported elsewhere):** `content-validate.test.ts` (→ coverage lives in `fieldset-validate.test.ts`), `content-schema.test.ts` (→ `fieldset-infer.test.ts`/`fieldset-validate.test.ts`; port the image-object matrix + refine + seo-collision), `validator-parity.test.ts` (loses its v1 arm; either delete or reduce to a v2-only validation test), `content-schema-exports.test.ts` (→ `fields-exports.test.ts`, Task 9).
  - **Migrate (defineFields/FrontmatterField/`type Infer` deep-importers):** `content-types.test.ts`, `content-frontmatter.test.ts` (done in Task 5), `content-concepts.test.ts` (Task 4), `content-compose.test.ts`, `compose.test.ts`, `compose-icons.test.ts`, `content-adapter.test.ts` (re-point `type Infer` → `InferFieldset`), `delivery-seo-fields.test.ts` (re-point `type Infer`), `delivery-generic-frontmatter.test.ts`, `delivery-concept-generic.test.ts`, `delivery-content-index.test.ts`, `delivery-manifest.test.ts`, `delivery-site-descriptors.test.ts`, `delivery-site-resolver.test.ts`, `delivery-site-resolver-validation.test.ts`, `content-identity.test.ts`, `content-permalink-parity.test.ts`, `public-routes.test.ts`, `public-routes-seo.test.ts`, `admin-dispatch.test.ts`, and the component tests `EditPage.test.ts`, `edit-page-advisories.test.ts`, `editor-pref-isolation.test.ts`, `CairnAdmin.test.ts`.

**Interfaces:** none new; this task removes the v1 surface.

- [ ] **Step 1:** Grep the pre-delete checklist and record the counts: `grep -rln "from '.*content/schema'" src/tests src/lib`, `grep -rln "from '.*content/validate'" src/tests src/lib`, `grep -rln "defineFields\|validateFields\|FrontmatterField" src/`. Every hit must be migrated or deleted before the delete.
- [ ] **Step 2:** Port the unique v1 coverage into the v2 suite: the image-object normalization matrix, the `refine` cross-field path, and the seo-collision case (now Task 2's `fieldset-seo.test.ts`).
- [ ] **Step 3:** Migrate each remaining test in the list (drop `name`, records, `help`, `tags`→`multiselect options`, `freetags`→`multiselect creatable`).
- [ ] **Step 4:** Delete `schema.ts` and `validate.ts`. Re-grep: zero `content/schema`, `content/validate`, `defineFields`, `validateFields`, `FrontmatterField` references survive in `src/`.
- [ ] **Step 5:** Do NOT gate yet (the barrel still exports the v1 names → Task 9). Proceed.

---

### Task 9: Reclaim the barrel + the green gate for the atomic core

**Files:**
- Modify: `src/lib/content/fieldset.ts` (rename module-local `Infer<R>` → `InferRecord<R>`), `src/lib/index.ts`
- Test: `src/tests/unit/fields-exports.test.ts` (extend), delete `content-schema-exports.test.ts`

**Interfaces:**
- Produces the final barrel: drops `defineFields`, `ConceptSchema`, `Infer` (v1), `InferFields`, `DefineFieldsOptions`, `FrontmatterField`, and the v1 `*Field` names from `content/types.js`; publishes the v2 `TextField`..`ImageField` + `NumberField`/`SelectField`/`MultiselectField`/`UrlField`/`EmailField`/`DatetimeField` from `fields.js`, plus `NamedField`. Keeps `fields`, `fieldset`, `initialValues`, `Fieldset`, `InferFieldset`, `FieldsetOptions`, `BehaviorTable`, `FieldDescriptor`. `ImageValue` sourced once (from `fields.js` or `types.js`, not both).

- [ ] **Step 1:** In `fieldset.ts`, rename the module-local `type Infer<R>` (line 75) to `InferRecord<R>` and update its use at line 82. (Avoids the TS2300 duplicate when `Infer` is NOT re-added — we keep only `InferFieldset`.)
- [ ] **Step 2:** Edit `index.ts`: prune the v1 exports (the v1 `*Field`/`FrontmatterField` from `types.js`; `defineFields`; `ConceptSchema`/`Infer`/`InferFields`/`DefineFieldsOptions` from `schema.js`). Add `NamedField` from `types.js`. Add the v2 `*Field` interfaces from `fields.js`. Delete the stale "held back" comment (lines 48-50). Ensure exactly one `ImageValue` export.
- [ ] **Step 3:** Extend `fields-exports.test.ts`: positive assertions that the eleven v2 `*Field` interfaces, `ImageValue`, and `NamedField` import from `../../lib/index.js`; a runtime `expect(cairn).not.toHaveProperty('defineFields')`. Delete `content-schema-exports.test.ts`.
- [ ] **Step 4: GREEN GATE for the atomic core.** Run `npm run check` (expect 0/0 now — every consumer migrated) and `npm test` (expect exit 0). Fix every break. This is the first legitimate gate since Task 3.
- [ ] **Step 5:** Run `npm run check:comments`. Commit the whole atomic core (Tasks 4-9) — one coherent commit, or a tight sequence — `feat(content)!: cut over to the Contract v2 fieldset field system`.

---

### Task 10: Rebuild dist, migrate the showcase, prove a new arm through the e2e

**Files:**
- Modify: `examples/showcase/src/lib/cairn.config.ts`, `examples/showcase/e2e/golden-path.spec.ts`

**Interfaces:** consumes the published v2 barrel from the rebuilt dist.

- [ ] **Step 1:** Run `npm run package` (svelte-package + build-admin-css + transpile-dist-svelte + chmod) so dist ships the new barrel and the retyped `ConceptConfig`. **Guard:** a later `fieldset is not exported` / `schema type mismatch` in the showcase means a STALE dist, not a real bug — repackage.
- [ ] **Step 2:** Migrate `cairn.config.ts`: posts/pages from `schema: defineFields([{type,name,label,...}])` to `schema: fieldset({ title: fields.text({ label: 'Title', required: true }), date: fields.date({ label: 'Date' }), description: fields.textarea({ label: 'Description' }), image: fields.image({ label: 'Hero image', seo: true }), author: fields.text({ label: 'Author' }) })`. Keep `summaryFields: ['description']`. Add a NEW scalar to exercise a new arm: `status: fields.select({ label: 'Status', options: ['draft', 'published'], default: 'draft' })`.
- [ ] **Step 3:** Extend `golden-path.spec.ts`: edit a post, set the status select, save, reload, assert the select round-trips and the value persists through a from-scratch consumer build.
- [ ] **Step 4:** `cd examples/showcase && npm run check` (expect 0 errors). Run the showcase e2e from a from-scratch build (`rm -rf examples/showcase/{node_modules,package-lock.json}`, fresh install, `npm run build`, e2e) OR push for the CI `e2e` job.
- [ ] **Step 5:** Commit `feat(showcase): migrate the adapter to the v2 fieldset field system, add a status select`.

---

### Task 11: Single full gate + docs

**Files:**
- Modify: `docs/reference/core.md`, `scripts/check-reference-signatures.mjs`, `docs/guides/define-the-content-schema.md` (or the equivalent field-schema guide), `docs/explanation/the-content-model.md`, `docs/tutorial/build-your-first-cairn-site.md`, `CHANGELOG.md`, `docs/guides/upgrade-cairn.md`

- [ ] **Step 1:** `core.md`: remove the six v1 rows (`FrontmatterField`, `TagsField`, `FreeTagsField`, `ConceptSchema`, `DefineFieldsOptions`, `InferFields`) and the `defineFields` import/snippet/prose (the synthesis flagged lines ~9, 49, 198-210, 277-278, and the `frontmatterFromForm` signature ~661 still saying `FrontmatterField[]`). Add the seven net-new v2 rows (`NumberField`, `SelectField`, `MultiselectField`, `UrlField`, `EmailField`, `DatetimeField`, `NamedField`). **Manual grep** `grep -n 'defineFields\|FrontmatterField\|ConceptSchema\|TagsField\|FreeTagsField\|InferFields' docs/reference/core.md` — expect zero (no gate catches stale v1 prose).
- [ ] **Step 2:** Update the `.#normalizeConcepts` allowlist comment in `check-reference-signatures.mjs` to the v2 resolved default (`ConceptConfig<Fieldset<Record<string, FieldDescriptor>>>`).
- [ ] **Step 3:** Update the field-schema guide, the content-model explanation, and the tutorial's schema step to the `fieldset({...})` record form, `fields.*`, `help`, and multiselect.
- [ ] **Step 4:** `CHANGELOG.md` + `docs/guides/upgrade-cairn.md` — the 0.69.0 entry with the full **Consumers must:** block (see below).
- [ ] **Step 5: THE FULL GATE, once:** `npm run check` 0/0; `npm test` exit 0; `npm run check:comments`; `npm run check:reference`; `npm run check:reference:signatures`; `npm run check:package`; `npm run check:docs`; the showcase e2e (from-scratch or CI). Fix every failure.
- [ ] **Step 6:** Commit `docs(reference): document the v2 fieldset field system, retire the v1 surface`.

**CHANGELOG "Consumers must:" block (every rename, not just the headline):**
1. `schema` goes from `defineFields([...])` (array) to `fieldset({...})` (record).
2. The per-field `name` property is removed — the record KEY is now the frontmatter key.
3. Field help text renames `description` → `help`.
4. `tags` (closed) → `fields.multiselect({ options: [...] })`.
5. `freetags` (open) → `fields.multiselect({ creatable: true })` (its `placeholder` is preserved via the new optional `placeholder`).
6. Preserve each field's frontmatter KEY, especially `tags`, or tag pages/feeds empty.
7. The barrel no longer exports `defineFields`/`ConceptSchema`/`FrontmatterField`/`TagsField`/`FreeTagsField`/`InferFields`/`DefineFieldsOptions`; type extraction is `InferFieldset` (the v1 `Infer` is gone). The v2 `*Field` interfaces now carry the v2 shape (no `name`, `help` not `description`).
8. ecxc-ski and 907-life are unmigrated and stay pinned to the prior version range until they cut over.

---

## Self-review

- **Spec coverage:** the cutover slice of the v2 spec (the `fields.*`/`fieldset` field system going live, the showcase migration, the v1 removal) is covered by Tasks 1-11. References, `object`/`array`, the adapter restructure, the backend/render seams stay explicitly out of scope per the Global Constraints. ✓
- **Placeholder scan:** every code step shows the change or the exact grep/command; no TBDs. ✓
- **Type consistency:** `NamedField` (Task 3) is the single descriptor shape threaded through concepts (4), save path (5), editor (6), media-refs (7). `isClosedMultiselect` is defined once (Task 5) and imported by the editor (6). `InferFieldset` is the one type extractor (4, 8, 9); the module-local rename to `InferRecord` (9) clears the duplicate-identifier. `ConceptDescriptor` gains `schema: Fieldset` (Task 5 note, applied in Task 4). ✓
- **Atomic-core risk:** Tasks 4-9 do not gate green individually; the Execution model section and the per-task "do NOT gate" steps make this explicit. ✓

## Carry-forwards / review-gate flags

- **datetime is the riskiest arm.** The plan ships it as naive-local minute-precision with a round-trip test; the de-risk alternative is to defer the datetime editor arm (keep `fields.datetime` validator-only). Confirm at the gate.
- **`ConceptDescriptor` gains `schema: Fieldset`** so `editLoad` can resolve `default: 'today'` against a request-time clock. Minor surface growth; alternative is a precomputed `initialValues` that can't resolve `'today'` at build time.
- The five later phases stay queued: references → object/array + adapter + component unification → backend → render + islands.
