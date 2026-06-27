# Contract v2 phase 3c: field-system unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (main-loop orchestrate-and-verify, the cairn default) to implement this plan. Steps use checkbox (`- [ ]`) syntax. **Read the "Execution model" section first: Tasks 1-2 are additive and each gate green on their own; Tasks 3-9 are ONE atomic compile unit gated once at Task 9; Task 10 is the release.**

**Goal:** Collapse the two parallel field systems into one. The directive-component attribute vocabulary (`AttributeField[]`, keyed by `.key`) is retired and components declare their attributes with the same `fields.*` descriptors a concept uses; `defineComponent` supersedes the `ComponentDef` object literal; and the function-valued behavior a descriptor cannot carry (the cross-field validator, an array row-label function) moves into the `BehaviorTable` seam already reserved in `fieldset.ts`, symmetrically for both concept fields and component attributes. A first-class `fields.icon()` lands as part of the unified vocabulary.

**Architecture:** The change has an additive half and a breaking half. The additive half adds `fields.icon()` (a new `IconField` descriptor that validates as a name string), expands `BehaviorTable` from `Record<string, never>` into `Record<string, FieldBehavior>` (`{ validate?, itemLabel? }`) and wires the per-field `validate` into the server-derived `fieldset` validator. The breaking half retypes `ComponentDef.attributes` from `AttributeField[]` to `Record<string, FieldDescriptor>`, adds `defineComponent` (which builds the attribute set's validator by reusing `fieldset()` and validates the component at declaration), moves the component's cross-field `validate` from the descriptor into a co-bundled `behavior` table, deletes `AttributeField`/`FieldType`, and migrates every render-pipeline, editor-form, showcase, and test consumer in lockstep. The validation core is unified by having `defineComponent` build a real `Fieldset` from its attributes, so a component attribute and a concept field validate through identical code. The concept-side `itemLabel`-as-function half of the symmetric scope is CUT from this pass (see decision 10 and addendum A14) and stays a ROADMAP carry-forward; the cheap symmetric half (the per-field `behavior.validate` for concepts, server-side) ships in Task 2.

**Tech Stack:** TypeScript, Svelte 5 (runes), SvelteKit 2, Vitest (unit + integration in workerd/miniflare + component in a real browser), Playwright (showcase e2e), `svelte-package` + the dist-`.svelte` transpile step.

## Global Constraints

- **Breaking within the 0.x window. Version bump: `0.73.0`** (minor; the held-unpublished window becomes `0.69.0`-`0.73.0`). Consumers migrate; the two production sites (ecxc-ski, 907-life) stay pinned to the prior published range until they cut over. Do not publish; the v2 series stays held until render + islands land.
- **No back-compat shim.** Held unpublished, so the showcase migrates in lockstep and the old `AttributeField` shape is removed outright. `AttributeField` and `FieldType` are deleted, not aliased.
- **The gate (run at the end of Tasks 2, 9, 10):** `npm run check` 0 errors AND 0 warnings; `npm test` EXIT 0 (a passing assertion count is not enough; an unhandled rejection can exit 1 with all tests green); `npm run check:comments` (the ESLint TSDoc + em-dash gate, CI-only and not covered by `check`); the four doc gates `check:reference`, `check:reference:signatures` (CI-only; run by name), `check:package`, `check:docs`; `check:version` (minor → `0.73.0`); and the showcase e2e proven against a **from-scratch consumer build** (`rm -rf examples/showcase/{node_modules,package-lock.json}`, fresh install, `npm run build`), or a pushed CI `e2e` run.
- **`check` is svelte-check with 0 warnings.** An unused exported interface or an unreferenced import left mid-migration is a TS6133 warning that fails the gate. Couple each type-body delete with its barrel-export prune and its importer edits.
- **`.svelte` is not type-checked by ESLint** (the Svelte sub-parser is unwired). A missed `.svelte` attribute-shape read fails silently at runtime; the component tests and the e2e are the only net. ComponentForm, ComponentInsertDialog, and FieldInput are all in this blind spot.
- **A version bump must also sync the ROOT lockfile self-version** (`check:version` misses it; CI `npm ci` needs it). Run `npm install --package-lock-only` after the bump.
- **The dist must be rebuilt before any gate that exercises it.** `npm test` has no pretest rebuild and `npm run check` does not package. A consumer-facing or dist-spawn test (the showcase build, `vite-verify-references`) reads `node_modules/@glw907/cairn-cms` via the self-symlink, so run `npm run package` before gating the atomic unit (the `worktree-needs-dist-build` discipline).
- TSDoc on every exported symbol; no em dash in code comments (`house/no-em-dash-in-comments`); document the contract, never the type the signature already states. Every exported symbol keeps its minimal one-line doc even when self-evident (`check:reference` + `jsdoc/require-jsdoc`).

---

## Execution model (read before dispatching)

The change splits into two additive tasks, one atomic compile unit, and a release.

- **Tasks 1 and 2 are pure-additive groundwork.** `fields.icon()` (Task 1) and the `BehaviorTable` expansion + fieldset wiring (Task 2) add new surface without breaking any consumer. Each is a normal gated `cairn-implementer` dispatch that ends green.
- **Tasks 3-9 are ONE atomic compile unit.** The instant `ComponentDef.attributes` retypes from `AttributeField[]` to `Record<string, FieldDescriptor>` and `AttributeField` is deleted, every render-pipeline consumer (`remark-directives`, `rehype-dispatch`, `component-grammar`, `component-validate`, `component-reference`, `sanitize-schema`), both editor forms, the showcase config, and ~17 test files break at once; `npm run check` (0 warnings) cannot pass at any mid-migration point. Execute 3-9 as a single coherent effort in the **main loop** (the cross-file lockstep and the three `.svelte` files invisible to the type checker make this unsuitable for an unmonitored single Sonnet dispatch). Write all new v2 tests, migrate every consumer and fixture in lockstep, and gate ONCE at the end of Task 9. The task split is for review legibility and ordering, not for independent green gates.
- **Task 10 gates green again** (version bump, dist rebuild, from-scratch e2e, full gate, release).

The legitimate intermediate `npm run check` points are at the end of Task 1 and Task 2.

---

## File map

**Created:**
- `src/tests/unit/fields-icon.test.ts` — `fields.icon()` constructor, inference, and validation (Task 1, additive).
- `src/tests/unit/fieldset-behavior.test.ts` — the per-field `behavior.validate` wiring on a concept fieldset (Task 2, additive).
- `src/tests/unit/define-component.test.ts` — `defineComponent` declaration-time guards and the attribute-via-`fieldset` validation (Task 9, atomic unit).

**Modified (engine, additive):**
- `src/lib/content/fields.ts` — add `IconField` to the descriptor union; add the `fields.icon` constructor (Task 1).
- `src/lib/content/fieldset.ts` — expand `BehaviorTable`; add `FieldBehavior`; add the `behavior` option to `fieldset()` and `FieldsetOptions`; wire per-field `behavior.validate` into the validate loop; guard behavior keys against the record (Task 2).

**Modified (engine, atomic unit):**
- `src/lib/render/registry.ts` — retype `ComponentDef.attributes`/`SlotDef.itemFields` to `Record<string, FieldDescriptor>`; add `ComponentDef.behavior?`/`attributeSchema?`; delete `AttributeField`/`FieldType`; add `defineComponent` + `checkComponentAttributes`; rewrite `findIconField`/`emptyValues`/`previewValues`/the `iconField` accessor over entries; `iconField` returns the attribute name.
- `src/lib/render/component-validate.ts` — delegate attribute validation to `def.attributeSchema.validate`; layer unknown-attribute + required-slot; drop the bespoke required/select/pattern/`validate` loop and `runFieldValidator`.
- `src/lib/render/component-grammar.ts` — `attrBlock`, `valuesFromRoot`, `componentRoundTripSafety`, `emptyComponentValues` iterate `Object.entries(def.attributes)`.
- `src/lib/render/remark-directives.ts` — the stamp loop iterates entries; `iconKey` reads the registry's now-string `iconField`.
- `src/lib/render/rehype-dispatch.ts` — `readAttributes` iterates entries.
- `src/lib/render/component-reference.ts` — the sample-value loop iterates entries.
- `src/lib/render/sanitize-schema.ts` — `dataAttrProp` over `Object.keys(d.attributes)`.
- `src/lib/components/ComponentForm.svelte` — the attribute switch reads descriptor entries; add a per-type `inputType` for the text fallback.
- `src/lib/components/ComponentInsertDialog.svelte` — `hasSchema` via `Object.keys`; the preview-seed loop over entries.
- `src/lib/components/FieldInput.svelte` — add an `icon` arm (IconPicker) and an `icons?: IconSet` prop; thread `icons` into the `ObjectGroupField`/`RepeatableField` recursion.
- `src/lib/components/ObjectGroupField.svelte`, `src/lib/components/RepeatableField.svelte` — accept and forward `icons` to their nested `FieldInput`.
- `src/lib/components/EditPage.svelte` — pass `icons` to `FieldInput` (it already receives `icons` as a prop; today it forwards it only to `ComponentInsertDialog`).
- `src/lib/index.ts` — export `defineComponent`; remove `AttributeField` (barrel L98-104); confirm `FieldDescriptor` (L44) covers the attribute type now.

**Migrated (showcase + docs):** `examples/showcase/src/lib/cairn.config.ts` (callout/alert → `defineComponent` with `fields.*` attributes); the reference/guide/explanation/tutorial pages naming `AttributeField`, the `attributes:` array form, `type: 'icon'`, or the `ComponentDef` literal (see addendum, populated by the adversarial review).

**Migrated (tests):** the ~17 files in the adversarial-review addendum (derived mechanically; see "Test-migration set").

**Deleted:** none (symbols removed in place).

---

## Locked decisions (the design forks, resolved)

Settled in the 3c brainstorm (icon-type research + the symmetric-scope call) and this plan's design pass.

1. **`fields.icon()` is a first-class descriptor, available to concepts and components.** Research across nine CMSs found a built-in icon field is the exception (only Statamic ships one, storing an SVG blob); none of cairn's git-based peers (Keystatic, Decap, Sveltia, Tina) ship one. cairn already owns the picker and the name-key storage model the rest of the category converges on, so promoting `icon` from a component-only attribute type to a `fields.*` descriptor is cheap and a differentiator. An icon value is a name string from the adapter's `rendering.icons` set; the IconPicker constrains the choice and the render layer resolves it, so the record validator only enforces required/non-empty (the set is not threaded into the pure validator). Build-time validation of a frontmatter icon name against the set is a ROADMAP item, not this pass (the directive icon is not set-validated today either). **Most components and concepts will declare NO icon field**, and `rendering.icons` is optional on the adapter; the icon arm and the `icons` threading must no-op cleanly when neither is present (a component or concept with no icon attribute never renders an IconPicker, so the empty-set trap in addendum A7 bites only the rarer case of an icon field declared while the adapter ships no icon set). Treat icons as the exception, not a field every component carries. When a component or concept DOES declare an icon field, its required-ness varies per declaration: `fields.icon({ required: true })` for a component whose render depends on a glyph, a bare `fields.icon({ label: 'Icon' })` where it is optional. The descriptor honors `FieldBase.required` like any field; the IconPicker already reflects it (`required={field.required ?? false}` in ComponentForm, and the same in the new FieldInput arm), and the validator's required/empty check (decision 1) enforces it server-side. So both a required and an optional icon must round-trip: a required-and-empty icon errors, an optional-and-empty icon drops the key.

2. **Attributes fold onto a key→`FieldDescriptor` record, scalar leaves only.** A directive attribute is one flat `data-attr-x="…"` string, so `defineComponent` rejects `object`, `array`, `reference`, `image`, and `multiselect` attribute types (none serialize to a single directive-attribute string). The allowed set is `text`, `textarea`, `number`, `select`, `url`, `email`, `date`, `datetime`, `boolean`, and `icon`. `SlotDef.itemFields` folds the same way (a record of leaf descriptors; v1 still uses only the first).

3. **One validation core, reached by reuse not re-implementation.** `defineComponent` builds a real `Fieldset` from its attribute record via `fieldset(attributes, { behavior })` and stores it as `attributeSchema`. `validateComponent` calls `def.attributeSchema.validate(values.attributes, '')` for the per-attribute coercion, constraints, required, select-domain, pattern, and the per-field `behavior.validate`, then layers the two component-only checks (unknown-attribute, required-slot). A component attribute and a concept field now validate through identical code, including the new icon/number/url/email/date types components never had. Error message strings unify on the `fieldset` vocabulary (`${label} is required`, no trailing period), so the component tests update their expected strings.

4. **The cross-field validator moves out of the descriptor into the behavior table, with a unified signature.** `AttributeField.validate?(value, all: ComponentValues)` is gone. The replacement is `FieldBehavior.validate?(value: unknown, siblings: Record<string, unknown>): string | null`, keyed by field name in the co-bundled `BehaviorTable`, used identically by concept fieldsets and component attributes. `siblings` is the raw input record (the frontmatter for a concept, `values.attributes` for a component), so a component rule reads `siblings.min` rather than the old `all.attributes.min`. The `try/catch` containment of an author throw moves into the fieldset validate loop (a throwing behavior validator is treated as valid with a `console.warn`, preserving the shipped posture).

5. **`refine` stays.** The fieldset-level `refine(data, body)` (whole-record cross-field, returns an error map) is unchanged and complementary to the per-field `behavior.validate` (one field peeking at siblings, error attached to that field). Components do not expose `refine` (the per-field form covers their need); concepts keep both.

6. **`pattern` unifies on the bare-string `fields.*` shape.** `AttributeField.pattern: { source, message }` is gone; an attribute uses `fields.text({ pattern: '…' })` and the generic `patternError` message applies. A custom pattern message becomes a `behavior.validate`. No showcase component uses `pattern`, so there is no migration cost there.

7. **`defineComponent` validates at declaration, mirroring `defineConcept`.** It runs `checkComponentAttributes` (the type allow-list of decision 2) and builds the attribute `fieldset` (whose construction-time `checkContainerNesting`/`checkSeoImageFields`/pattern-compile checks then also fire), so a malformed component fails at module load rather than at first insert.

8. **`ComponentRegistry.iconField(name)` returns the attribute name (a string), not the descriptor.** Its one consumer (`remark-directives`) needs the key, and after the fold there is no `.key` on a descriptor. `findIconField` returns `Object.entries(def.attributes ?? {}).find(([, f]) => f.type === 'icon')?.[0]`.

9. **The two editor form renderers stay separate; the vocabulary and validation core are what unify.** `ComponentForm.svelte` keeps its own switch (migrated to read descriptor entries) and `FieldInput.svelte` keeps its own; they are not merged into one component this pass. Merging them is a further refactor with the multi-instance focus risk that bit 3a, deferred to a ROADMAP item. `FieldInput` gains its own `icon` arm so a concept icon field renders; `ComponentForm` keeps its existing icon arm. The small IconPicker-wiring duplication is the deliberate cost of not merging.

10. **`itemLabel`-as-function for concept arrays is CUT from 3c (Geoff's call, 2026-06-27).** The symmetric-scope call split unevenly. The per-field `behavior.validate` for concepts is server-side and lands free in the core (Task 2, the cheap half, shipped). But `itemLabel`-as-function must run client-side in `RepeatableField` as the author types, and concept fieldsets are not client-imported today (only the registry is), so it would need a new client-side behavior channel (a `CairnAdmin` prop + scaffolder wiring). The adversarial review (A14) then found a structural blocker beyond the prop cost: `RepeatableField` keeps rows intentionally uncontrolled (`row.value` is stale between edits, by design, to avoid edit loss), so feeding a `itemLabel(item)` function live row data requires snapshotting every row input per keystroke, materially more than budgeted. So the function form is cut and stays a ROADMAP carry-forward for a focused concept-array-editor pass that can design the live-row snapshot properly. The core unification (vocabulary + validation core + behavior-table mechanism + per-field validate) ships without it. The string `itemLabel` (a sub-field key) is unchanged and still covers the common case.

11. **Islands and `hydrate` are entirely out.** `defineComponent` introduces no `hydrate` flag and no island surface; the render seam and islands are phase 4, a separate brainstorm. `defineComponent`'s `build(ctx)` returns hast exactly as the `ComponentDef` literal does today.

---

## Review addendum (folded from the four-lens adversarial review)

A four-lens find-then-verify review (types/cycles/gate, validation-parity, migration-scope, svelte-forms/client-channel) verified every finding against the code. Two of the plan's highest-risk bets held: the content↔render module edge is acyclic (content→render imports are `import type` only; the new `render→content` `fieldset` value edge is a DAG, so `defineComponent` calling `fieldset()` at module-eval is safe), and adding `IconField` to the union warns nowhere (icon falls through every switch as a string; no `satisfies never` guard exists). These amendments **supersede** the affected task steps; where this addendum and a task disagree, the addendum wins.

**A1. `defineComponent` return type (BLOCKER).** Folded inline above: `(def: D): D & { attributeSchema: Fieldset }`. The `core.md` `defineComponent` signature block (A6) must declare exactly that rendered type, or add a `.#defineComponent` `ALLOWLIST` entry in `scripts/check-reference-signatures.mjs` (mirroring the `normalizeConcepts`/`initialValues` entries), or `check:reference:signatures` fails.

**A2. `src/lib/index.ts:100` `FieldType` barrel removal (BLOCKER, plan miss).** Task 3 Step 4 removes `AttributeField` (L101) but not `FieldType` (L100). A dangling `export type { FieldType }` for a deleted symbol fails `check`. Remove both. Note `FieldType` (render) is distinct from `FieldTypeDef` (content/extension custom-field-type) at `compose.ts`/`types.ts`: do NOT touch `FieldTypeDef`.

**A3. `ComponentForm.svelte:110` `slot.itemFields?.[0]?.key` (BLOCKER, plan miss, `.svelte` blind spot).** The `SlotDef.itemFields` retype to a record breaks this repeatable-slot label-key read. Change to `const key = Object.keys(slot.itemFields ?? {})[0] ?? 'text'`. Add to Task 6 Step 1; only `ComponentForm.test.ts`/e2e catches it.

**A4. `ComponentInsertDialog` has TWO array-of-attributes sites, not one (BLOCKER, plan mislabel).** Task 6 Step 2's "preview-seed loop (L125-128)" is actually `emptyRequired` (L122-137): `for (const field of picked.attributes ?? [])` reading `field.required`/`.type`/`.key`/`.label`. Re-key to `Object.entries`. Separately, `hasSchema` (L18-20) is `(def.attributes?.length ?? 0) > 0 || (def.slots?.length ?? 0) > 0`: the `|| slots` clause is **load-bearing** (a slots-only, attribute-free component must still open the guided form); keep it as `Object.keys(def.attributes ?? {}).length > 0 || (def.slots?.length ?? 0) > 0`.

**A5. `ComponentForm` re-key is not just the arms (MAJOR, plan under-scope).** Task 6 Step 1 left two type-checker-blind derives under "etc." that read `field.key` and must re-key to the destructured `name`: `incompleteState` (L132-136, `for (const field of attributes)` + `asString(field.key)`) and the `errors` derived (L165-178, `touched[field.key]`, `out[field.key]`). `asString`/`asBool`/`touched` stay keyed by the attribute name string (same value); only `field.key` → `name` changes.

**A6. The `inputType` "reuse" instruction is itself a defect (BLOCKER-class, instruction defect).** Task 6 Step 1 says to reuse `FieldInput.svelte`'s `inputType`. That helper is module-local (not exportable) AND returns `undefined` for `number`/`date`/`text` because FieldInput routes those to dedicated arms ComponentForm lacks. Reusing it renders a number attribute as a plain text box. ComponentForm needs its OWN mapping that folds the dedicated-arm types into the text input: `number→'number'`, `date→'date'`, `datetime→'datetime-local'`, `url→'url'`, `email→'email'`, else `'text'`. Inline this local mapping; do not extract-and-share FieldInput's.

**A7. `icons` threading is wider than two forwards (MAJOR, plan miss).** Neither `ObjectGroupField` nor `RepeatableField` forwards unknown props; both pass an exhaustive explicit list. So `icons` must be added to the `Props` of BOTH and forwarded at EVERY nested render site: FieldInput → {ObjectGroupField, RepeatableField}; ObjectGroupField → FieldInput; RepeatableField → {FieldInput, ObjectGroupField}. The plan named only the two containers' own `FieldInput` and omitted the RepeatableField→ObjectGroupField hop (needed for `array(object({ icon }))`). An empty IconSet renders a *required* icon field with zero choices (unsavable): keep `icons ?? {}` only as a type guard, guarantee threading in practice, and file "empty-icon-set is a doctor-detectable config error" to ROADMAP. Add a component test for a concept icon field rendering choices from a real set.

**A8. The fieldset reuse RETROACTIVELY tightens attribute validation (MAJOR, must be deliberate).** The old `validateComponent` ran only required/select-domain/pattern/validate; it never format-checked a value. `fieldset` enforces `number` (NaN/finite/min/max/integer), `url` (`URL_RE`), `email` (`EMAIL_RE`), `date` (`isCalendarDate` + bounds), and `text`/`textarea` length+pattern. So a hand-authored directive that previously saved (e.g. `:::card{count="abc"}`) now fails the save-path `validateComponent`. This is an intended tightening: add it to the Task 10 CHANGELOG `Consumers must:` block, add a Task 9 test asserting the new rejection, and confirm no showcase content trips it (`componentRoundTripSafety` is unaffected; it gates on parse↔serialize idempotence, not `validateComponent`).

**A9. Error-message changes are semantic, not punctuation (MAJOR, supersedes Task 9 Step 2).** Two capabilities are LOST, not reworded: (a) the select error drops its option list (`${label} contains an unknown value: X` vs the old `must be one of: a, b`); (b) the per-attribute custom pattern message is gone (decision 6 → `behavior.validate`). Rewrite `component-validate.test.ts:20` (the `/info, warning/` assertion → `/unknown value/`) and L48-58 (the custom-pattern-message component → assert the generic `patternError`, or convert it to a `behavior.validate`). Decision for Geoff: accept the generic select message (simpler, unified) or enrich the shared `fieldset` select message to list options (helps concepts too, but churns existing concept-field test assertions). Recommendation: accept the generic message; the select is a dropdown, so an unknown value only arises from hand-edited markdown. Also note the client-side `ComponentForm.svelte:169/176` keeps `${label} is required.` (period) while the server `fieldset` says `is required` (no period): a benign client/server wording divergence; `ComponentForm.test.ts:111` matches case-insensitively and survives.

**A10. `component-reference.ts:32` placeholder is `'…'`, not `''` (MAJOR, supersedes Task 5 Step 4).** The current non-boolean branch seeds `field.options?.[0] ?? '…'`. The plan's rewrite shows `else … = ''`, which silently changes the generated reference sample and breaks `component-reference.test.ts`. Keep the placeholder: `if (field.type === 'boolean') v = false; else if (field.type === 'select') v = field.options[0] ?? '…'; else v = '…'`.

**A11. Add three export/consumer tests to the migration set (BLOCKER risk, supersedes the Task 9 floor).** `render-exports.test.ts` and `component-exports.test.ts` assert the barrel surface; the `AttributeField`/`FieldType` removal and any new export break them without touching an attribute literal. `render-pipeline.test.ts` builds a registry; verify whether it constructs attribute literals. The 17-file floor plus these three is the working set; still derive mechanically.

**A12. The complete docs-migration set (BLOCKER, supersedes the deferred docs list).** No doc gate parses snippet bodies, so a manual grep is the only net for code blocks; `check:reference`/`check:reference:signatures` police the export tables and function signatures.
- `docs/reference/core.md`: DELETE the `AttributeField` row (L779) and the `FieldType` row (L741); ADD a `defineComponent` section with its A1 signature block; verify the `serializeComponent`/`parseComponent`/`validateComponent`/`buildComponentInsert`/`emptyValues` blocks (L459-463) still render (they take `ComponentDef` by name, so likely unchanged). Resolve A13 before deciding which new-type rows to add.
- `docs/tutorial/build-your-first-cairn-site.md` (L237-271): the canonical first-site tutorial teaches the RETIRED shape (`const callout: ComponentDef = { attributes: [ { key, type:'icon' } ] }` + `defineRegistry`). Rewrite to `defineComponent({ attributes: { title: fields.text(...), icon: fields.icon(...) } })`; update the import line to add `defineComponent`/`fields`.
- `docs/reference/components.md` (L485 `type: 'icon'` prose → `fields.icon()`; verify L525-536).
- `docs/guides/configure-rendering.md` (L17-50 prose: components declared with `defineComponent`, attributes a `fields.*` record).
- `docs/guides/define-an-adapter-and-schema.md` (L70-112: add `defineComponent`/`fields.icon`).
- `docs/guides/upgrade-cairn.md`: the `0.73.0` entry (Task 10 Step 2) lands here.
- VERIFY `docs/reference/render.md` for any component-shape example.
- ACCEPTANCE grep (new Task 9 step): `docs/{reference,guides,explanation,tutorial}` for `AttributeField`, an `attributes:` array on a component, `type: 'icon'`, a `ComponentDef` object-literal example, and `pattern: {`; confirm zero hits. Do NOT touch the internal specs/plans/STATUS hits (history, out of the doc gates' scope).

**A13. Resolve the new-type barrel-export decision explicitly (drives A12).** `BehaviorTable` is ALREADY barrel-exported (`index.ts:61`) and documented (`core.md:369`), so the plan's "add `BehaviorTable`" instruction (file map + Task 3 Step 4) is wrong: drop it. The genuinely new types are `FieldBehavior` and `IconField`. Decision: export `FieldBehavior` (public — `ComponentDef.behavior`/`FieldsetOptions.behavior` reference it, so authors writing a literal need it) and add its `core.md` row. For `IconField`, mirror whatever the other `*Field` descriptors do (if `TextField` is not barrel-exported, neither is `IconField`; it is covered by `FieldDescriptor` and the `fields.icon` constructor) — match the existing pattern exactly to avoid a `check:reference` miss.

**A14. Task 10 (`itemLabel`-as-function) is CUT (Geoff confirmed, 2026-06-27).** The svelte-forms lens confirmed two structural gaps beyond decision 10's cost concern:
- The file map omits the EditPage → **FieldInput** → RepeatableField hop: EditPage renders `FieldInput`, not `RepeatableField`, so the per-field behavior must thread through FieldInput (the plan lists only CairnAdmin/EditPage/RepeatableField). RepeatableField today has no concept id and no behavior prop, and resolves labels from the STRING `itemLabel` (a field key) via `summaryNameFor`/`summaryFor`, not "L112-137."
- The function-`itemLabel(item, index)` needs the whole row's live values, but rows are intentionally uncontrolled (`row.value` is stale between edits, by design, to avoid edit loss). So "keep it pure and reactive so the label follows live edits" is not a wiring detail — feeding live data to the function requires snapshotting every row input on each keystroke, a materially larger change than budgeted. (The multi-instance label-crossing worry, by contrast, is already safe: per-instance `$state` isolates `summaries`, and the 3a focus guard scopes queries to `root`.)
Given the new client prop + scaffolder + doc cost AND this live-data design gap, Task 10 is CUT: 3c ships only the cheap symmetric half (the per-field `behavior.validate` for concepts, server-side, already in Task 2), and `itemLabel`-as-function stays a ROADMAP carry-forward for a focused concept-array-editor pass that can design the live-row snapshot properly. The severable-task safety valve worked as intended; the core unification ships intact.

---

### Task 1: `fields.icon()` and the `IconField` descriptor

**Additive. Gates green on its own.** A new union member that validates as a name string. The icon set is not consulted by the validator (decision 1).

**Files:**
- Modify: `src/lib/content/fields.ts`
- Create: `src/tests/unit/fields-icon.test.ts`

**Interfaces:**
- Produces: `interface IconField extends FieldBase { type: 'icon' }`; `fields.icon(o)` constructor; `IconField` added to the `FieldDescriptor` union; `ValueOf<IconField>` resolves to `string`.

- [ ] **Step 1: Add the descriptor.** In `src/lib/content/fields.ts`, after `BooleanField` (~L79), add:

```ts
/** A glyph chosen from the adapter's icon set; the stored value is the glyph's name. */
export interface IconField extends FieldBase {
  type: 'icon';
}
```

Add `IconField` to the `FieldDescriptor` union (~L112-126). Add the constructor to the `fields` object (~after `boolean`, L154):

```ts
  /** An icon field whose value is a glyph name from the adapter's icon set. */
  icon: <const O extends Omit<IconField, 'type'>>(o: O): IconField & O => ({ type: 'icon', ...o }),
```

- [ ] **Step 2: Confirm the validator and inference need no new arm.** In `src/lib/content/fieldset.ts`, `coerceToText` returns `value.trim()` for a string (icon is neither date/datetime/number), and `validateField`'s tail treats a non-text/textarea type as a trimmed non-empty string returned as the value, with the empty-first drop handling required. So `icon` validates as a required-checked name string with no new arm. In `ValueOf` (fieldset.ts:55-71), `icon` matches none of the special arms and falls to the final `: string`. Verify by reading those two functions; do not add an arm unless a test proves one is needed.

- [ ] **Step 3: Audit for exhaustiveness breaks.** Grep `src/lib` for any `switch (field.type)` or `field.type ===` chain that exhaustively enumerates the descriptor union and would warn on the new member: `grep -rn "field.type" src/lib/content src/lib/delivery`. The known sites (`validateField` default arm, `coerceToText`, `frontmatter.ts` decoders, `media-refs.ts`) all treat an unrecognized leaf as a string and need no icon arm; confirm each. Any `satisfies never` exhaustive guard that breaks gets a trivial `icon` case folded with the text-like leaves. A clean `npm run check` is the proof.

- [ ] **Step 4: Write the failing test** `src/tests/unit/fields-icon.test.ts`:

```ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import { fields } from '../../lib/content/fields.js';
import { fieldset, type InferFieldset } from '../../lib/content/fieldset.js';

describe('fields.icon', () => {
  it('constructs a plain icon descriptor', () => {
    expect(fields.icon({ label: 'Icon' })).toEqual({ type: 'icon', label: 'Icon' });
  });
  it('validates a required icon as a name string and drops an empty optional', () => {
    const fs = fieldset({ glyph: fields.icon({ label: 'Glyph', required: true }) });
    expect(fs.validate({ glyph: 'leaf' }, '')).toEqual({ ok: true, data: { glyph: 'leaf' } });
    expect(fs.validate({}, '').ok).toBe(false);
    expect(fieldset({ glyph: fields.icon({ label: 'Glyph' }) }).validate({}, '')).toEqual({ ok: true, data: {} });
  });
  it('infers a string value', () => {
    const fs = fieldset({ glyph: fields.icon({ label: 'Glyph', required: true }) });
    expectTypeOf<InferFieldset<typeof fs>>().toEqualTypeOf<{ glyph: string }>();
  });
});
```

- [ ] **Step 5: Run it to verify it fails, then passes after Step 1.** Run: `npm test -- src/tests/unit/fields-icon.test.ts`. Expected: FAIL (no `fields.icon`) before Step 1, PASS after.

- [ ] **Step 6: Document `fields.icon` in the reference.** Add the `icon` constructor to the `fields` reference page (the page documenting the `fields` namespace; grep `docs/reference` for `fields.boolean` to find it) with its one-line contract. This drift is invisible to the coverage gate (the `fields` export is already documented), so it is a manual edit.

- [ ] **Step 7: Gate.** `npm run check` (0/0), `npm test` (exit 0), `npm run check:comments`, `npm run check:docs`. All green; additive.

- [ ] **Step 8: Commit** `feat(content): add the fields.icon descriptor`.

---

### Task 2: Expand `BehaviorTable` and wire per-field `behavior.validate`

**Additive. Gates green on its own.** Existing fieldsets pass no `behavior`, so it defaults to `{}` and the validate path is unchanged for them.

**Files:**
- Modify: `src/lib/content/fieldset.ts`
- Create: `src/tests/unit/fieldset-behavior.test.ts`

**Interfaces:**
- Produces: `interface FieldBehavior { validate?(value: unknown, siblings: Record<string, unknown>): string | null; itemLabel?(item: Record<string, unknown>, index: number): string | undefined }`; `type BehaviorTable = Record<string, FieldBehavior>`; `FieldsetOptions.behavior?: BehaviorTable`; `fieldset()` stores and applies it.

- [ ] **Step 1: Replace the placeholder `BehaviorTable`.** In `src/lib/content/fieldset.ts`, replace the `BehaviorTable = Record<string, never>` type (L23) with:

```ts
/**
 * Function-valued behavior a field descriptor cannot carry as plain data, keyed by field name. A
 *  `validate` runs cross-field after per-field coercion; an `itemLabel` derives an array row's label.
 *  Resident in the app bundle, never in the `load` payload.
 */
export interface FieldBehavior {
  /** A cross-field validator: returns an error string, or null when valid. `siblings` is the raw input record. */
  validate?(value: unknown, siblings: Record<string, unknown>): string | null;
  /** Derive an array row's label from its item value and zero-based index. */
  itemLabel?(item: Record<string, unknown>, index: number): string | undefined;
}

/** The behavior table co-bundled with a fieldset, keyed by field name. Empty for a behavior-free fieldset. */
export type BehaviorTable = Record<string, FieldBehavior>;
```

- [ ] **Step 2: Add the option and the guard.** In `FieldsetOptions` (L30-32), add `behavior?: BehaviorTable;` with a TSDoc line. In `fieldset()` (L366), after `checkContainerNesting(record)`, add a guard that every `behavior` key names a declared field:

```ts
  for (const key of Object.keys(options.behavior ?? {})) {
    if (!(key in record)) throw new Error(`cairn: behavior names "${key}", which is not a declared field.`);
  }
```

- [ ] **Step 3: Wire per-field `behavior.validate` into the validate loop.** In the `validate` closure (L391-414), after the per-field outcome is pushed and before the `if (issues.length > 0)` check, run the behavior validator for a field that produced no issues:

```ts
      if (outcome.issues.length === 0 && options.behavior?.[key]?.validate) {
        let message: string | null = null;
        try {
          message = options.behavior[key].validate!('value' in outcome ? outcome.value : undefined, frontmatter);
        } catch (err) {
          console.warn(`cairn: behavior.validate for field "${key}" threw; treating it as valid.`, err);
        }
        if (typeof message === 'string') issues.push({ path: [key], message });
      }
```

Return `behavior: options.behavior ?? {}` from the constructed fieldset (replace the literal `behavior: {}` at L426).

- [ ] **Step 4: Write the failing test** `src/tests/unit/fieldset-behavior.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';

describe('fieldset behavior.validate', () => {
  const fs = fieldset(
    { min: fields.number({ label: 'Min' }), max: fields.number({ label: 'Max' }) },
    { behavior: { max: { validate: (value, siblings) => (Number(value) < Number(siblings.min) ? 'Max below min.' : null) } } },
  );
  it('reports a cross-field error keyed to the field', () => {
    const result = fs.validate({ min: 5, max: 2 }, '');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.max).toBe('Max below min.');
  });
  it('passes when the rule holds', () => {
    expect(fs.validate({ min: 1, max: 9 }, '').ok).toBe(true);
  });
  it('rejects a behavior key that names no field', () => {
    expect(() => fieldset({ a: fields.text({ label: 'A' }) }, { behavior: { b: { validate: () => null } } })).toThrow(/not a declared field/);
  });
});
```

- [ ] **Step 5: Run it to verify it fails, then passes.** Run: `npm test -- src/tests/unit/fieldset-behavior.test.ts`.

- [ ] **Step 6: Gate.** `npm run check` (0/0), `npm test` (exit 0), `npm run check:comments`. All green; additive. (`FieldBehavior`/`BehaviorTable` are exported from `fieldset.ts`; confirm whether they are barrel-exported today and, if `BehaviorTable` is, add the `FieldBehavior` reference entry to match `check:reference`.)

- [ ] **Step 7: Commit** `feat(content): expand the field behavior table with a per-field validator`.

---

## Tasks 3-9: the atomic unit (gate ONCE at the end of Task 9)

Execute as a single coherent effort in the main loop. Write the new v2 tests and KEEP them red; migrate every consumer and fixture in lockstep; run no gate until Task 9. The task split below is for ordering and review legibility.

### Task 3: Reshape the registry types and add `defineComponent`

**Files:** `src/lib/render/registry.ts`, `src/lib/index.ts`, `src/tests/unit/define-component.test.ts` (create, RED)

- [ ] **Step 1: Retype the attribute surface.** In `registry.ts`, delete `FieldType` (L9) and the entire `AttributeField` interface (L12-33). Import the descriptor union: `import type { FieldDescriptor } from '../content/fields.js';` and `import type { BehaviorTable, Fieldset } from '../content/fieldset.js';` (use `import type` to keep the content↔render type cycle erasable). Change:
  - `SlotDef.itemFields?: AttributeField[]` (L48) → `itemFields?: Record<string, FieldDescriptor>;`
  - `ComponentDef.attributes?: AttributeField[]` (L99) → `attributes?: Record<string, FieldDescriptor>;`
  - Add to `ComponentDef`: `behavior?: BehaviorTable;` (per-attribute functions, decision 4) and `attributeSchema?: Fieldset;` (the built validator, set by `defineComponent`; TSDoc it as engine-internal, set by the constructor).
  - `ComponentRegistry.iconField(name): AttributeField | undefined` (L127) → `iconField(name: string): string | undefined;` (returns the attribute name, decision 8).

- [ ] **Step 2: Rewrite the icon-field helper and the value seeders over entries.**
  - `findIconField` (L144-146) → returns the key name:

```ts
function findIconField(def: ComponentDef): string | undefined {
  return Object.entries(def.attributes ?? {}).find(([, field]) => field.type === 'icon')?.[0];
}
```

  - The `defaultIconByRole` guard (L173) `!findIconField(c)` still reads correctly (now `!keyOrUndefined`).
  - The registry's `iconField` accessor (L190-193): `return def ? findIconField(def) : undefined;`.
  - `emptyValues` (L210-220): iterate entries; `attributes[name] = field.default ?? (field.type === 'boolean' ? false : '')`.
  - `previewValues` (L227-234) is unchanged (it spreads `def.preview.attributes`, already a name-keyed record).

- [ ] **Step 3: Add `checkComponentAttributes` and `defineComponent`.** After `previewValues`:

```ts
const ATTRIBUTE_TYPES = new Set(['text', 'textarea', 'number', 'select', 'url', 'email', 'date', 'datetime', 'boolean', 'icon']);

/** Reject an attribute type that cannot serialize to a single directive-attribute string (decision 2). */
function checkComponentAttributes(name: string, attributes: Record<string, FieldDescriptor>): void {
  for (const [key, field] of Object.entries(attributes)) {
    if (!ATTRIBUTE_TYPES.has(field.type)) {
      throw new Error(`cairn: component "${name}" attribute "${key}" is type "${field.type}"; a directive attribute must be a single-value scalar (text, number, select, url, email, date, datetime, boolean, or icon).`);
    }
  }
}

/**
 * Declare a site component, building its attribute validator from the `fields.*` descriptors and
 *  validating the component at declaration. Mirrors {@link defineConcept}: a malformed attribute type
 *  or pattern fails at module load. The built `attributeSchema` is what {@link validateComponent} runs.
 */
export function defineComponent<const D extends ComponentDef>(def: D): D & { attributeSchema: Fieldset } {
  const attributes = def.attributes ?? {};
  checkComponentAttributes(def.name, attributes);
  return { ...def, attributeSchema: fieldset(attributes, { behavior: def.behavior }) };
}
```

> **Return type is `D & { attributeSchema: Fieldset }`, NOT `D`** (addendum A1). With `<const D>`, `D` is the exact input literal and excludes the inherited optional `attributeSchema`, so a bare `: D` makes every `def.attributeSchema` read fail TS2551 at the call site (reproduced). The augmented return type makes `attributeSchema` present and non-optional, so the Task 3 test drops its `?.`/`!`.

Add `import { fieldset } from '../content/fieldset.js';` (a value import; `fieldset` is in `content`, so this is a render→content runtime dependency — confirm no runtime cycle, since `content/types.ts` imports `ComponentRegistry` as a type only).

- [ ] **Step 4: Barrel.** In `src/lib/index.ts`, export `defineComponent` beside `defineRegistry` (L96); remove `AttributeField` from the type re-export (L98-104). Keep `ComponentDef`, `ComponentValues`, `defineRegistry`, `emptyValues`. Confirm `FieldDescriptor` (L44) is exported (it is) so the attribute type resolves for consumers.

- [ ] **Step 5: Write `define-component.test.ts` RED** (stays red until the Task 9 gate):

```ts
import { describe, it, expect } from 'vitest';
import { defineComponent } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';
import type { Element } from 'hast';

const build = (): Element => ({ type: 'element', tagName: 'div', properties: {}, children: [] });

describe('defineComponent', () => {
  it('builds an attributeSchema and returns the def', () => {
    const def = defineComponent({
      name: 'callout', label: 'Callout', description: '', build,
      attributes: { tone: fields.select({ label: 'Tone', required: true, options: ['note', 'tip'] }) },
    });
    expect(def.attributeSchema?.validate({}, '').ok).toBe(false); // tone required
    expect(def.attributeSchema?.validate({ tone: 'note' }, '').ok).toBe(true);
  });
  it('rejects a non-scalar attribute type at declaration', () => {
    expect(() => defineComponent({
      name: 'bad', label: 'Bad', description: '', build,
      attributes: { hero: fields.image({ label: 'Hero' }) },
    })).toThrow(/single-value scalar/);
  });
  it('routes a per-attribute behavior.validate through the schema', () => {
    const def = defineComponent({
      name: 'range', label: 'Range', description: '', build,
      attributes: { min: fields.number({ label: 'Min' }), max: fields.number({ label: 'Max' }) },
      behavior: { max: { validate: (v, s) => (Number(v) < Number(s.min) ? 'Max below min.' : null) } },
    });
    const r = def.attributeSchema!.validate({ min: 5, max: 2 }, '');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.max).toBe('Max below min.');
  });
});
```

### Task 4: Rewrite `validateComponent` over the attribute schema

**Files:** `src/lib/render/component-validate.ts`, `src/lib/render/component-insert.ts` (types only)

- [ ] **Step 1: Delegate attribute validation.** Replace the bespoke required/select/pattern/`validate` loop (component-validate.ts:13-33) and delete `runFieldValidator` (L53-60). The new body:

```ts
export async function validateComponent(markdown: string, def: ComponentDef): Promise<ComponentValidation> {
  const { values, rawKeys } = await parseComponentWithRawKeys(markdown, def);
  const errors: Record<string, string> = {};

  const schema = def.attributeSchema ?? fieldset(def.attributes ?? {}, { behavior: def.behavior });
  const result = schema.validate(values.attributes, '');
  if (!result.ok) Object.assign(errors, result.errors);

  const declared = new Set(Object.keys(def.attributes ?? {}));
  for (const key of rawKeys) {
    if (!declared.has(key)) errors[key] = `Unknown attribute "${key}".`;
  }

  for (const slot of def.slots ?? []) {
    if (!slot.required) continue;
    const v = values.slots[slot.name];
    const filled = Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v !== '';
    if (!filled) errors[slot.name] = `${slot.label} is required.`;
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}
```

Add the imports: `import { fieldset } from '../content/fieldset.js';`. The `ComponentValues` import may become unused; prune it if so (0-warnings). Note the error strings now come from `fieldset` (`${label} is required`, no period; `${label} contains an unknown value: …` for a bad select), which the tests in Task 9 assert.

- [ ] **Step 2: `component-insert.ts`** needs no logic change (it calls `serializeComponent` then `validateComponent`); confirm its imports still resolve after the `ComponentValues` shape is untouched (the value record is unchanged, decision per the map).

### Task 5: Migrate the render pipeline

**Files:** `src/lib/render/component-grammar.ts`, `remark-directives.ts`, `rehype-dispatch.ts`, `component-reference.ts`, `sanitize-schema.ts`

- [ ] **Step 1: `component-grammar.ts`** — each `for (const field of def.attributes ?? [])` becomes `for (const [name, field] of Object.entries(def.attributes ?? {}))`, with `field.key` → `name`:
  - `attrBlock` (L12-22): `values.attributes[name]`; `field.type === 'boolean'`; `parts.push(\`${name}="true"\`)`; `${name}="${escaped}"`.
  - `valuesFromRoot` (L106-109): `root.attributes?.[name]`; `values.attributes[name]`.
  - `componentRoundTripSafety` (L184): `const declaredKeys = new Set(Object.keys(def.attributes ?? {}))`.
  - `emptyComponentValues` (L223): `for (const [name, field] of Object.entries(def.attributes ?? {})) attributes[name] = field.type === 'boolean' ? false : ''`.

- [ ] **Step 2: `remark-directives.ts`** — `iconField` is now a name string (L65-67): `const iconKey = registry.iconField(node.name) ?? 'icon';` (drop `?.key`). The stamp loop (L79-82):

```ts
  for (const [name, field] of Object.entries(def?.attributes ?? {})) {
    void field;
    const raw = name === iconKey ? icon : attrs[name];
    if (raw != null) properties[dataAttrProp(name)] = raw;
  }
```

(The `field === iconField` identity compare becomes `name === iconKey`. `field` is unused in the loop body, so destructure only `name`: `for (const name of Object.keys(def?.attributes ?? {}))`.)

- [ ] **Step 3: `rehype-dispatch.ts`** — `readAttributes` (L83-91):

```ts
function readAttributes(node: Element, def: ComponentDef): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const [name, field] of Object.entries(def.attributes ?? {})) {
    const value = strProp(node, dataAttrProp(name));
    if (value == null) continue;
    out[name] = field.type === 'boolean' ? value === 'true' : value;
  }
  return out;
}
```

- [ ] **Step 4: `component-reference.ts`** (L30-32) — iterate entries; `field.options?.[0]` reads off the descriptor (a `SelectField`/`MultiselectField` has `options`; narrow on `field.type === 'select'` since the union no longer guarantees `options`):

```ts
  for (const [name, field] of Object.entries(def.attributes ?? {})) {
    if (field.type === 'boolean') values.attributes[name] = false;
    else if (field.type === 'select') values.attributes[name] = field.options[0] ?? '';
    else values.attributes[name] = '';
  }
```

(Verify the exact current intent against the file; the point is `options` is now type-gated.)

- [ ] **Step 5: `sanitize-schema.ts`** (L26): `registry.defs.flatMap((d) => Object.keys(d.attributes ?? {}).map((key) => dataAttrProp(key)))`.

### Task 6: Migrate the two editor form renderers

**Files:** `src/lib/components/ComponentForm.svelte`, `src/lib/components/ComponentInsertDialog.svelte`

- [ ] **Step 1: `ComponentForm.svelte`** — the attribute block reads descriptor entries (decision 9 keeps this component's own switch):
  - L58: `const attributes = $derived(Object.entries(def.attributes ?? {}))` (an array of `[name, field]`).
  - Everywhere `field.key` appeared (L132-179, the `{#each}` key at L204, the four arm handlers L213/227/239-245/256-257, the error line L264), use the destructured `name`. The `{#each attributes as [name, field] (name)}` re-keys to the attribute name.
  - The text fallback (L247-262): map the descriptor type to an input type so `date`/`number`/`url`/`email` attributes render the right control. Reuse the same `inputType` mapping `FieldInput.svelte` uses (extract it to a tiny shared helper `src/lib/components/field-input-type.ts` if neither imports the other cleanly, or inline a local `const t = field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : field.type === 'datetime' ? 'datetime-local' : 'text'`).
  - The icon arm (L236-246) stays; it already gates `field.type === 'icon' && icons`.

- [ ] **Step 2: `ComponentInsertDialog.svelte`** — `hasSchema` (L19): `(Object.keys(def.attributes ?? {}).length) > 0 || (def.slots?.length ?? 0) > 0` (match the current intent; verify whether slots also count). The preview-seed loop (L125-128): `for (const [name, field] of Object.entries(picked.attributes ?? {}))`, `formValues.attributes[name]`.

### Task 7: `fields.icon()` in concept forms (thread the icon set into `FieldInput`)

**Files:** `src/lib/components/FieldInput.svelte`, `ObjectGroupField.svelte`, `RepeatableField.svelte`, `EditPage.svelte`

- [ ] **Step 1: Add the `icons` prop to `FieldInput.svelte`.** In the `$props` block (L30-67), add `icons?: IconSet` (import `IconSet` from `../render/glyph.js`). Add an `icon` arm to the type switch (beside `boolean`, ~L154), wiring the existing IconPicker:

```svelte
{:else if field.type === 'icon'}
  <IconPicker icons={icons ?? {}} label={field.label} value={typeof frontmatter[field.name] === 'string' ? (frontmatter[field.name] as string) : ''}
    required={field.required ?? false} onChange={(glyph) => { frontmatter[field.name] = glyph; markFieldsDirty(); }} />
```

Import `IconPicker` from `./IconPicker.svelte`. Match the dirty-tracking call the other interactive arms use (the map notes scalar arms are form-name-driven, but icon is callback-driven like image/reference, so it must call `markFieldsDirty` the way `MediaHeroField` does; verify the exact dirty hook name).

- [ ] **Step 2: Thread `icons` through the recursion.** `ObjectGroupField.svelte` and `RepeatableField.svelte` recurse through `FieldInput`; add an `icons?: IconSet` prop to each and forward it to their nested `<FieldInput … {icons} />`.

- [ ] **Step 3: Pass `icons` from `EditPage.svelte` to `FieldInput`.** EditPage already receives `icons` (L91) and forwards it only to `ComponentInsertDialog` (L1963). Add `{icons}` to the `<FieldInput … />` render (L1889-1900).

### Task 8: Migrate the showcase components

**Files:** `examples/showcase/src/lib/cairn.config.ts`

- [ ] **Step 1: Rewrite `callout` and `alert` with `defineComponent` and `fields.*` attributes.** The callout (cairn.config.ts:24-55) and alert (59-86) attribute arrays become records:

```ts
import { defineComponent, fields } from '@glw907/cairn-cms';

const callout = defineComponent({
  name: 'callout', label: 'Callout', description: '…', group: 'Callouts', icon: 'callout',
  preview: { /* unchanged */ },
  build: (ctx) => /* unchanged */,
  attributes: {
    tone: fields.select({ label: 'Tone', required: true, options: ['note', 'tip', 'warning'] }),
    icon: fields.icon({ label: 'Icon' }),
  },
  slots: [ /* unchanged */ ],
});

const alert = defineComponent({
  name: 'alert', label: 'Alert', description: '…', group: 'Notices', icon: 'alert',
  defaultIconByRole: { caution: 'leaf' },
  build: (ctx) => /* unchanged */,
  attributes: {
    role: fields.select({ label: 'Role', options: ['note', 'caution'] }),
    icon: fields.icon({ label: 'Icon' }),
  },
  slots: [ /* unchanged */ ],
});
```

`defineRegistry({ components: [callout, alert] })` (L88) is unchanged; the defs now carry `attributeSchema`. Keep `build`, `preview`, `slots`, `defaultIconByRole` verbatim.

- [ ] **Step 2: Confirm the showcase has no `AttributeField` import** or `attributes:` array form left (grep `examples/showcase`).

### Task 9: Migrate the tests, then GATE the atomic unit

> **Read the adversarial-review addendum's test set first** (populated after this plan's review). The list below is the explore-derived starting set; treat it as a floor, derive the complete set mechanically.

**Test-migration set (derive mechanically, then migrate each):** `grep -rln "attributes:\s*\[" src/tests` UNION `grep -rln "AttributeField\|validateComponent\|buildComponentInsert\|previewValues\|emptyValues\|iconField" src/tests`. The confirmed set: `component-validate.test.ts` (8 literals, the heaviest; error-string assertions change per Task 4), `component-grammar.test.ts`, `ComponentInsertDialog.test.ts`, `render-registry.test.ts`, `render-preview-values.test.ts`, `render-sanitize.test.ts`, `EditPage.test.ts`, `ComponentForm.test.ts`, `component-insert.test.ts`, `render-slot-render.test.ts`, `render-pipeline-snapshot.test.ts`, `render-remark-directives.test.ts`, `render-slot-stamp.test.ts`, `EditPage-insert.test.ts`, `component-reference.test.ts`, `component-schema.test.ts` (also imports `AttributeField` directly, L2/L38 — re-express as a `FieldDescriptor` record), `render-rehype-dispatch.test.ts` (verify its L20-30 registry def). The value records (`ComponentContext.attributes`, `ComponentValues.attributes`, `def.preview.attributes`) are already name-keyed and do NOT change.

- [ ] **Step 1: Migrate each attribute literal** from an `AttributeField[]` array to a `Record<string, FieldDescriptor>`: `[{ key: 'tone', label: 'Tone', type: 'select', options: [...] }]` → `{ tone: fields.select({ label: 'Tone', options: [...] }) }`, and wrap each `ComponentDef` literal in `defineComponent(...)` so it carries `attributeSchema` (a raw literal has none; `validateComponent` falls back to building one, but the tests should exercise the real `defineComponent` path).
- [ ] **Step 2: Update error-string expectations** changed by Task 4 (`is required` without a period; the select-domain message). Grep the migrated tests for `is required.` and the old select message.
- [ ] **Step 3: Add the new v2 assertions** that did not exist: a `type: 'icon'` attribute round-trips through stamp → dispatch (in `render-remark-directives`/`render-rehype-dispatch`); a `defineComponent` with a `number` attribute validates the bound (proving components reach the full vocabulary); the `define-component.test.ts` from Task 3 compiles and passes.
- [ ] **Step 4: Rebuild dist before gating.** Run `npm run package` (the atomic unit changed `registry.ts`/`fieldset.ts`, which the showcase build and any dist-spawn test import via the self-symlink).
- [ ] **Step 5: GATE the atomic unit.** Run, and fix every failure before proceeding:
  - `npm run check` (0 errors, 0 warnings)
  - `npm test` (EXIT 0)
  - `npm run check:comments`
  - `npm run check:reference`, `npm run check:reference:signatures`, `npm run check:package`, `npm run check:docs`
- [ ] **Step 6: Commit** the atomic unit `feat(render)!: declare component attributes with the fields.* vocabulary`. Include the `Consumers must:` lines (Task 10 changelog).

---

### Task 10: Version bump, dist rebuild, from-scratch e2e, full gate, release

**Files:** `package.json`, `package-lock.json`, `CHANGELOG.md`, `docs/guides/upgrade-cairn.md`, `ROADMAP.md`

- [ ] **Step 1:** Bump `package.json` to `0.73.0`. Run `npm install --package-lock-only` to sync the root lockfile self-version. Run `npm run check:version` (expect minor → `0.73.0`).
- [ ] **Step 2:** Write the `CHANGELOG.md` `0.73.0` entry with a `Consumers must:` line per breaking change: declare component attributes as a `fields.*` record (was an `AttributeField[]` array), wrap each component in `defineComponent`, move any cross-field attribute `validate` into the component's `behavior` table, and replace a `pattern: { source, message }` with `fields.text({ pattern })` plus a `behavior.validate` for a custom message. Note the new `fields.icon()`. Add the matching entry to `docs/guides/upgrade-cairn.md`.
- [ ] **Step 3:** ROADMAP: keep the `itemLabel`-as-function carry-forward (Task 10 cut; note the per-field `behavior.validate` half shipped) and re-scope it as a "concept-array editor with a live-row snapshot" item so a later pass can design the uncontrolled-row data path (A14); add (if not already present) the "merge ComponentForm into FieldInput" form-renderer-unification item (decision 9), the "build-time icon-name validation against the set" item (decision 1), and the "empty-icon-set is a doctor-detectable config error" item (A7).
- [ ] **Step 4:** Rebuild dist: `npm run package`.
- [ ] **Step 5:** Prove the consumer build from scratch: `rm -rf examples/showcase/{node_modules,package-lock.json}`, then `npm --prefix examples/showcase install`, `npm --prefix examples/showcase run build`, `npm --prefix examples/showcase run test:e2e`. Expected: build succeeds and the e2e passes (the only net for the `.svelte` form changes). Alternatively push the branch for a CI `e2e` run.
- [ ] **Step 6: Final full gate.** Re-run the Task 9 Step 5 gate set after the dist rebuild. All green.
- [ ] **Step 7: Commit** `chore(release): cairn-cms 0.73.0 (Contract v2 phase 3c)`.

---

## Self-review notes

- **Spec coverage:** the field-system unification (`fields.*` for component attributes, `defineComponent`, the data-vs-behavior split) maps to Tasks 3-9; `fields.icon()` to Tasks 1, 7, 8; the `BehaviorTable` symmetry to Task 2 (concept per-field validate, server-side; the `itemLabel`-as-function half is CUT per decision 10 / A14 and stays a ROADMAP carry-forward); `default`/`taxonomy`/the scalar set already shipped in earlier phases. Islands and the render-seam redesign are explicitly out (phase 4).
- **Type consistency:** `defineComponent<const D extends ComponentDef>(def: D): D & { attributeSchema: Fieldset }` (A1); `ComponentDef.attributes?: Record<string, FieldDescriptor>`; `ComponentDef.behavior?: BehaviorTable`; `ComponentDef.attributeSchema?: Fieldset`; `SlotDef.itemFields?: Record<string, FieldDescriptor>`; `ComponentRegistry.iconField(name: string): string | undefined`; `FieldBehavior { validate?, itemLabel? }`; `BehaviorTable = Record<string, FieldBehavior>`; `IconField { type: 'icon' }`; `fields.icon(o)`.
- **No placeholders:** every code step shows the code or the exact transformation with line refs; the atomic-unit boundary and the single gate are explicit; the test-migration set is the explore-derived floor with the mechanical derivation rule.
- **Adversarial review: DONE** (four-lens find-then-verify, folded as addendum A1-A14). The module cycle and `IconField` exhaustiveness bets held; the gate-failing gaps (the `defineComponent` return type, the `FieldType` barrel + `slot.itemFields` + `emptyRequired` misses, the `inputType` reuse defect, the wider `icons` threading, the retroactive validation tightening, the docs set) are all folded. The addendum supersedes the affected task steps.
