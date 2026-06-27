# Contract v2 References Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Read the "Execution model" section first: this pass is INCREMENTAL (each task gates green), and the "Hazard-sweep amendments" section, which records the 21 verified hazards folded into the tasks below.**

**Goal:** Add a frontmatter `reference` field (single and `array(reference())` many) that lifts cairn's `cairn:<concept>/<id>` content graph from body links to typed frontmatter edges, with rename-safe, delete-protected, build-verified referential integrity across open branches and no database.

**Architecture:** A new `reference` descriptor stores the target's permanent id; cardinality is composition (`reference()` / `array(reference())`). A schema-driven extractor records each edge `{field, concept, id}` in a new additive `references` array on the manifest entry (mirroring `mediaRefs`). A surgical YAML-value rewriter (built on the shared frontmatter-region helpers extracted from `media-rewrite.ts`) repoints inbound edges on rename, re-quoting any YAML-significant id. A strict, fail-closed cross-branch reference index (modeled on the media usage index) powers the delete refusal and the rename cross-branch refusal. The build fails on a dangling edge; save warns but never blocks; delivery resolves an edge to the target's identity at the cross-concept site-resolver layer.

**Tech Stack:** TypeScript, Svelte 5 (runes), SvelteKit 2, Vitest (unit + integration in workerd/miniflare + component in a real browser), Playwright (showcase e2e), `svelte-package` + the dist-`.svelte` transpile step, gray-matter (frontmatter; js-yaml under it), remark/mdast (body links).

## Global Constraints

- **This is additive within the 0.x window. Version bump: `0.70.0` (minor).** No public symbol is removed or retyped; the new field types sit beside the existing vocabulary. The held-unpublished window (STATUS, 2026-06-26) continues: do NOT cut a GitHub Release or npm publish; `0.70.0` rolls into the one Contract v2 release when the whole series lands. The two production sites (ecxc-ski, 907-life) stay on the prior published range.
- **No `Consumers must:` line** (additive, non-breaking). The CHANGELOG and upgrade-guide entries state the new capability and that no consumer action is required.
- **The gate, run per task:** `npm run check` 0 errors AND 0 warnings; `npm test` EXIT 0 (a passing assertion count is not enough); plus, at the final task, `npm run check:comments`, the four doc gates (`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`), `check:version`, and the showcase e2e proven against a **from-scratch consumer build** (`rm -rf examples/showcase/{node_modules,package-lock.json}`, fresh install, `npm run build`) or a pushed CI `e2e` run.
- **`check` is svelte-check with 0 warnings.** A new exported interface or a TS6133 unused symbol fails the gate. Couple every new type with a consumer or an export in the same task.
- **TSDoc on every exported symbol** (`check:comments` + `check:reference`); no em dash in code comments (the `house/no-em-dash-in-comments` rule); no `{type}` tags.
- **`field-rules.ts` is shared by the validator** and survives untouched; reference validation adds new arms.
- **`.svelte` is not type-checked by ESLint.** A missed `.svelte` field-read fails silently at runtime; the component tests are the only net. Grep `.svelte` for residual reads after each editor change.
- **ids are constrained tokens:** `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` (`isValidId`, ids.ts:6). They exclude `#`, whitespace, and quotes, so the rewriter's comment-split and token-boundary logic are unambiguous. But the grammar still admits YAML-significant tokens (`true`, `false`, `123`, `0xff`, a date-shaped `2026-01-02`), which is the rewriter's central hazard (see the amendments).

---

## Execution model (read before dispatching)

**This pass is incremental, not atomic.** The cutover was one atomic compile unit because it DELETED v1 and RETYPED `ConceptConfig`'s generic. This pass only ADDS to the `FieldDescriptor` union. Every type switch in the field system has a `default`/`else` arm and none asserts `never` exhaustiveness (verified by the sweep: `validateField`, `frontmatterFromForm`, `formValues`, `ValueOf`, `coerceToText`; the `array { item: FieldDescriptor }` recursive type was checked for circularity and is sound at one level), so a new union member compiles and falls through to a default until its arm lands. Each behavior arm is added test-first as its own green gate.

The one rule that keeps it incremental: **do NOT add a reference field to the shared `src/tests/unit/_content-fixture.ts`.** That fixture is imported by 7 unit-test files; mutating it would couple them. Reference coverage uses purpose-built fixtures (`src/tests/unit/_reference-fixture.ts` and dedicated integration fixtures), so existing tests stay green throughout. (The cutover's "~24 files" was its `schema.js`-deep transitive importers broken by the v1→v2 retype, a larger set than this additive pass touches.)

The trade: a missing arm ships wrong behavior without a compile error (the new type silently hits a `default`). TDD is the net. Several sweep findings are exactly this class (an `array` value silently `String()`-ed or iterated char-by-char), and each now has a failing test specified.

- **Standard dispatch.** Each task is a normal `cairn-implementer` dispatch (pinned Sonnet): write the failing test, make it green, clear the full gate, report. The main loop reviews each diff and verifies the gate before the next dispatch.
- **Parallelizable tasks.** Tasks 1 and 9 are independent of the field-system chain. The chain 2 → 3 → 4 → 5 → 6 → 7 is sequential. The route tasks 11, 12, 13 each depend on the graph (≤ task 7) but are mutually independent.
- **Upshift for the correctness-critical tasks.** Task 2 (the surgical rewriter, with re-quoting) and Task 12 (rename's cross-branch refuse-and-repoint) carry the highest correctness risk; dispatch them with `model: opus`.

---

## Hazard-sweep amendments (21 verified findings, folded into the tasks)

A 5-lens adversarial sweep (2026-06-26), each finding verified against the real code, surfaced 21 confirmed hazards. The load-bearing ones, now folded into the tasks below:

1. **The rewriter must re-quote a YAML-significant `newId`** (`true`, `false`, `123`, `0xff`, a date-shaped `2026-01-02`, a bare `2026`). A raw substitution writes an unquoted scalar that reparses as a boolean/number/Date, the edge's `isValidId` guard then drops it, and the linker is silently corrupted with no error. The robust predicate: quote unless `typeof matter(\`x: ${newId}\`).data.x === 'string'`. (Task 2, two blockers.)
2. **The rewriter reuses `media-rewrite.ts`'s frontmatter-region helpers**, extracted into a shared `frontmatter-region.ts`, so CRLF, the column-0 boundary, and the key-range scan are the already-proven logic, not re-derived. Plus a comment-split (don't rewrite an id inside a `# comment`), a BOM-tolerant fence, and a mandatory colon anchor (`^field:`, not `^field`). (Task 2.)
3. **`verifyReferences` must be wired into the generated virtual-module source**, not the TS call site: `built` lives only inside `virtualSource`'s string (vite/index.ts:57/66), and it must be exported from `src/lib/index.ts`. References have no body-link-style prerender backstop, so this build gate is the only integrity authority. (Tasks 8, 11.)
4. **The read-model resolution moves to `site-resolver.ts`**, the only cross-concept layer (a per-concept `content-index.ts` cannot resolve author→pages). (Task 14.)
5. **One shared canonicalizer** (`referenceIdFromValue` / `referenceIdsFromValue` in `frontmatter.ts`) coerces a Date element to its UTC-sliced id and a bare scalar to a single-element list, used identically by `validate`, `extractReferenceEdges`, and `formValues`, so a hand-edited or rewriter-emitted non-string value never silently drops or stringifies to timezone garbage. (Tasks 3, 4, 5.)
6. **Every graph lookup matches the `(concept, id)` pair, never id alone** (ids are unique only within a concept; the usage.ts clone keys on a single hash). (Tasks 6, 7.)
7. **Delete and rename are explicitly fail-closed** (a strict-index build wrapped in `try/catch` → 503), and the rename refuse-predicate gates `origin.kind === 'branch'` before comparing the branch name. (Tasks 12, 13.)
8. **A self-reference is rewritten on the moved file** (it is excluded from inbound, so the moved entry must repoint its own frontmatter or strand its edge). (Task 12.)
9. **The round-trip test gets a disk-authored side** (raw markdown a human or the rewriter could leave unquoted), since the form-authored side alone cannot exercise the loss vectors. (Task 4.)

---

## Locked decisions (settled in the brainstorm, 2026-06-26)

1. **Single AND many in this phase.** Ship `reference()` and `array(reference())`. The `fields.array(item, opts)` constructor ships its final general signature now, but validation and the editor accept ONLY a reference item this phase and error clearly on any other item type (phase 2 generalizes `array` with no API change).
2. **Taxonomy is deferred and queued.** The `taxonomy` flag stays reserved and documented; the tag-delivery pass is filed in ROADMAP's Next tier (Task 16). Not in this plan.
3. **A separate `references` edge array on the manifest entry**, each edge `{field, concept, id}`, mirroring `mediaRefs` (additive-optional, `verifyManifest` normalization arm, no version bump). It does NOT merge into `links`.
4. **The cross-branch reference index is modeled on `usage.ts` (strict, fail-closed)**, keyed on the `(concept, id)` pair. Built per destructive/rename operation, not cached.
5. **Rename refuses on an inbound reference held by a third-party open branch** (symmetric with the pending-edits guard), and repoints inbound references on `main`. It does not commit a repoint onto another author's branch.
6. **A resolved reference reuses the target's identity:** `ResolvedReference = { id, concept, title, permalink, summary? }`, resolved at the `site-resolver` layer so a Svelte route renders a linked target. The render-seam `resolve()` wiring stays phase 4.
7. **`formValues` lifts into `frontmatter.ts`** (exported, unit-tested) before the reference arm is added, so the round-trip property test (both the form-authored and the disk-authored sides) is real.
8. **Save warns, build fails.** A frontmatter reference to a target absent or draft on `main` produces a non-blocking save WARNING (best-effort, advisory, mirroring `draftLinks`), never a 400. The build (`verifyReferences`) is the only integrity authority.
9. **Body-link delete protection stays main-only** this pass; references get the cross-branch gate. The asymmetry is a ROADMAP follow-up (Task 16).
10. **The reference value canonicalizes Date→UTC-slice and bare-scalar→single-element** across validate, extract, and form-display (the shared canonicalizer). The rewriter re-quotes any id that would not reparse as a string.

---

## File map

**Created:**
- `src/lib/content/frontmatter-region.ts` — the shared frontmatter-region helpers (`splitFrontmatter`, `fmLines`, `frontmatterKeyRange`, `escapeForRegExp`) extracted from `media-rewrite.ts`.
- `src/lib/content/references.ts` — `ReferenceEdge`, `extractReferenceEdges`, the surgical `rewriteFrontmatterReference`.
- `src/lib/content/reference-index.ts` — `ReferenceUsageEntry`, `ReferenceIndex`, `buildReferenceIndex` (strict cross-branch, modeled on `media/usage.ts`).
- `src/lib/components/EntryPicker.svelte` — the search + grouped-list core extracted from `LinkPicker.svelte`.
- `src/lib/components/ReferenceField.svelte` — the single/`array` reference editor arm.
- `src/tests/unit/references.test.ts`, `reference-index.test.ts`, `frontmatter-reference-roundtrip.test.ts`, `src/tests/unit/_reference-fixture.ts`.
- `src/tests/integration/content-routes-reference-rename.test.ts`, `content-routes-reference-delete.test.ts`, `content-routes-reference-save.test.ts`.
- `src/tests/component/reference-field.test.ts`.
- `.gitattributes` (`*.md text eol=lf`; defense-in-depth for the rewriter's CRLF handling).

**Modified (engine):** `src/lib/content/media-rewrite.ts` (import the extracted region helpers), `fields.ts`, `fieldset.ts`, `frontmatter.ts` (lifted `formValues` + the canonicalizer), `manifest.ts`, `concepts.ts`, `delivery/site-resolver.ts` (read-model resolution), `src/lib/vite/index.ts` (the dangling gate), `src/lib/sveltekit/content-routes.ts`, `src/lib/components/EditPage.svelte` + `LinkPicker.svelte`, `src/lib/index.ts` (export `verifyReferences`, `ResolvedReference`, `ReferenceEdge`).

**Migrated (consumer + docs):** `examples/showcase/src/lib/cairn.config.ts`, `examples/showcase/src/content/**`, `examples/showcase/e2e/golden-path.spec.ts`, `docs/reference/core.md`, `docs/guides/`, `docs/explanation/`, `CHANGELOG.md`, `docs/guides/upgrade-cairn.md`, `ROADMAP.md`, `scripts/check-reference-signatures.mjs`.

---

## Task 1: Lift `formValues` into `frontmatter.ts`

Pure refactor: move the route-local `formValues` closure (content-routes.ts:1006) to an exported, unit-tested module function. No behavior change (the reference and canonicalizer arms land in Task 4).

**Files:** Modify `src/lib/content/frontmatter.ts`, `src/lib/sveltekit/content-routes.ts:1006`, `src/lib/index.ts` (if a reference page needs it). Test `src/tests/unit/content-frontmatter.test.ts`.

**Interfaces:** Produces `export function formValues(fields: NamedField[], frontmatter: Record<string, unknown>): Record<string, unknown>` (the current closure body verbatim).

- [ ] **Step 1: Write the failing test** asserting `formValues` coerces text/date/multiselect to input-ready values (the existing closure behavior).
- [ ] **Step 2: Run, expect FAIL** (not exported).
- [ ] **Step 3: Move the closure** verbatim into frontmatter.ts with a TSDoc one-liner; import it in the route.
- [ ] **Step 4: Run the unit + edit integration tests, expect PASS;** `npm run check` 0/0.
- [ ] **Step 5: Commit** `refactor(content): lift formValues into frontmatter for unit testability`.

---

## Task 2: Shared frontmatter-region helpers + the surgical rewriter

Extract `media-rewrite.ts`'s frontmatter-region helpers into a shared module, then build `rewriteFrontmatterReference` on them, with re-quoting of a YAML-significant `newId`, comment-scoping, and CRLF/BOM fidelity. **Correctness-critical; dispatch `model: opus`.**

**Files:**
- Create: `src/lib/content/frontmatter-region.ts`, `src/lib/content/references.ts` (this rewriter; the extractor lands in Task 5).
- Modify: `src/lib/content/media-rewrite.ts` (import the extracted helpers, drop its private copies).
- Test: `src/tests/unit/references.test.ts`; the existing `media-rewrite` tests must stay green after the refactor.

**Interfaces:**
- `frontmatter-region.ts` exports (moved verbatim from media-rewrite.ts:82/126/147/477, with TSDoc): `splitFrontmatter(markdown): { fmBlock; body }`, `fmLines(fmBlock): FmLine[]`, `frontmatterKeyRange(lines, fmBlock, key): [number, number] | null`, `escapeForRegExp(literal): string`.
- `references.ts` produces `export function rewriteFrontmatterReference(source: string, field: string, oldId: string, newId: string): string` — within the named top-level key's line range, replaces token-bounded `oldId` with `newId` (re-quoted if YAML-significant), preserving everything else byte-for-byte. A body with no frontmatter, or a `field` not present, returns `source` unchanged.

**Algorithm:** Assert `isValidId(oldId) && isValidId(newId)` at entry (a malformed id is a programming error, not a content value). Use `splitFrontmatter` (its regex `/^---\r?\n[\s\S]*?\r?\n---\r?\n?/` is CRLF-tolerant; extend the leading match to `/^﻿?---\r?\n.../` so a BOM-prefixed file is recognized, and keep any leading BOM as a fixed prefix on reassembly). Find the field's `[lo, hi]` range with `frontmatterKeyRange` (its opener is the colon-anchored `^${escapeForRegExp(key)}:`, so `author` never matches `authored-by:`). For each line in the range: split off an inline YAML comment at the first `#` preceded by whitespace or line start (ids exclude `#` and whitespace, so this is unambiguous) and operate only on the value side; replace `new RegExp('(?<![a-z0-9-])' + escapeForRegExp(oldId) + '(?![a-z0-9-])', 'g')` with the re-quoted `newId`; reassemble value + comment, preserving the line's trailing `\r`. **Re-quote rule:** write `newId` single-quoted iff it would not reparse as a string, i.e. `typeof matter(\`x: ${newId}\`).data.x !== 'string'` (catches `true`/`false`/`null`, numbers, hex/octal, and date-shaped ids in one parser-faithful check; cairn ids never need escaping inside single quotes). Splice from last offset to first so earlier offsets stay valid.

- [ ] **Step 1: Extract** `splitFrontmatter`, `fmLines`, `frontmatterKeyRange`, `escapeForRegExp` into `frontmatter-region.ts` with TSDoc; import them back into `media-rewrite.ts`, deleting the private copies.
- [ ] **Step 2: Run the media-rewrite tests, expect PASS** (pure move); `npm run check` 0/0. Commit `refactor(content): extract shared frontmatter-region helpers`.
- [ ] **Step 3: Write the failing rewriter tests** in `references.test.ts`:

```ts
const doc = (fm: string) => `---\n${fm}\n---\nBody text mentioning author elsewhere.\n`;

it('rewrites a scalar reference value', () => {
  expect(rewriteFrontmatterReference(doc('author: jane-doe'), 'author', 'jane-doe', 'jane-smith')).toBe(doc('author: jane-smith'));
});
it('rewrites one element of a flow array', () => {
  expect(rewriteFrontmatterReference(doc('related: [a-post, b-post]'), 'related', 'b-post', 'c-post')).toBe(doc('related: [a-post, c-post]'));
});
it('rewrites one item of a block sequence', () => {
  expect(rewriteFrontmatterReference(doc('related:\n  - a-post\n  - b-post'), 'related', 'b-post', 'c-post')).toBe(doc('related:\n  - a-post\n  - c-post'));
});
it('re-quotes a YAML-keyword newId so it reparses as a string', () => {
  const out = rewriteFrontmatterReference(doc('author: jane-doe'), 'author', 'jane-doe', 'true');
  expect(out).toBe(doc("author: 'true'"));
  expect(parseMarkdown(out).frontmatter.author).toBe('true'); // the STRING, not boolean true
});
it('re-quotes a numeric and a date-shaped newId', () => {
  expect(parseMarkdown(rewriteFrontmatterReference(doc('author: jane-doe'), 'author', 'jane-doe', '123')).frontmatter.author).toBe('123');
  expect(typeof parseMarkdown(rewriteFrontmatterReference(doc('author: jane-doe'), 'author', 'jane-doe', '2026-01-02')).frontmatter.author).toBe('string');
  expect(typeof parseMarkdown(rewriteFrontmatterReference(doc('author: jane-doe'), 'author', 'jane-doe', '2026')).frontmatter.author).toBe('string');
});
it('leaves a plain id bare (no over-quoting churn)', () => {
  expect(rewriteFrontmatterReference(doc('author: jane-doe'), 'author', 'jane-doe', 'jane-smith')).toBe(doc('author: jane-smith'));
});
it('preserves CRLF', () => {
  expect(rewriteFrontmatterReference('---\r\nauthor: jane-doe\r\n---\r\nBody\r\n', 'author', 'jane-doe', 'jane-smith')).toBe('---\r\nauthor: jane-smith\r\n---\r\nBody\r\n');
});
it('does not rewrite an id inside an inline comment', () => {
  expect(rewriteFrontmatterReference(doc('author: old-author # mentions jane-doe'), 'author', 'jane-doe', 'X')).toBe(doc('author: old-author # mentions jane-doe'));
});
it('does not bleed past the colon anchor into a sibling prefix key', () => {
  const before = doc('author: jane-doe\nauthored-by: jane-doe');
  expect(rewriteFrontmatterReference(before, 'author', 'jane-doe', 'jane-smith')).toBe(doc('author: jane-smith\nauthored-by: jane-doe'));
});
it('preserves a leading BOM and is a no-op on a BOM-only no-frontmatter input', () => {
  const BOM = '﻿';
  expect(rewriteFrontmatterReference(BOM + doc('author: jane-doe'), 'author', 'jane-doe', 'jane-smith')).toBe(BOM + doc('author: jane-smith'));
  expect(rewriteFrontmatterReference(BOM + 'No frontmatter.\n', 'author', 'a', 'b')).toBe(BOM + 'No frontmatter.\n');
});
it('does not touch a substring id, an absent field, or no-frontmatter', () => {
  expect(rewriteFrontmatterReference(doc('author: post-2'), 'author', 'post', 'X')).toBe(doc('author: post-2'));
  expect(rewriteFrontmatterReference(doc('title: Hi'), 'author', 'a', 'b')).toBe(doc('title: Hi'));
  expect(rewriteFrontmatterReference('No frontmatter.\n', 'author', 'a', 'b')).toBe('No frontmatter.\n');
});
```

(The end-to-end "rename-to-`true` survives the extractor" regression lands in Task 5, once `extractReferenceEdges` exists.)

- [ ] **Step 4: Implement** `rewriteFrontmatterReference` per the algorithm. TSDoc the why: a byte-preserving rewriter must re-quote a YAML-significant id, or it reparses as a non-string and `coerceToText`/`extractReferenceEdges` silently drop the edge.
- [ ] **Step 5: Run, expect PASS;** `npm run check` 0/0. Commit `feat(content): add the surgical frontmatter reference rewriter`.

---

## Task 3: The `reference` and `array` descriptors, inference, validation, and the shared canonicalizer

Add the two descriptors, their constructors, their `ValueOf`/`InferRecord` arms (reference → `string`, `array(item)` → `ValueOf<item>[]`), the shared canonicalizer, and the validator arms placed correctly (the `reference` arm IN the post-coerce switch; the `array` arm an EARLY branch above `coerceToText`).

**Files:** Modify `src/lib/content/fields.ts`, `fieldset.ts`, `frontmatter.ts` (add the canonicalizer), `src/lib/index.ts`. Test `fields-exports.test.ts`, `fieldset-infer.test.ts`, `fieldset-validate.test.ts`.

**Interfaces:**
- `ReferenceField extends FieldBase { type: 'reference'; concept: string }`; `ArrayField extends FieldBase { type: 'array'; item: FieldDescriptor; itemLabel?: string }`.
- `fields.reference: <const O extends Omit<ReferenceField, 'type'>>(o: O) => ReferenceField & O`; `fields.array: <const I extends FieldDescriptor, const O extends Omit<ArrayField, 'type' | 'item'>>(item: I, o?: O) => ArrayField & { item: I } & O`.
- `ValueOf<{ type: 'reference' }>` is `string`; `ValueOf<{ type: 'array'; item: infer I }>` is `ValueOf<I>[]`.
- **The shared canonicalizer (in `frontmatter.ts`, beside `dateInputValue` so there is no import cycle):** `referenceIdFromValue(value: unknown): string` (a Date → `dateInputValue(value)` the UTC slice; a string → trimmed; else `''`), and `referenceIdsFromValue(value: unknown): string[]` (`Array.isArray(value) ? value.map(referenceIdFromValue) : (typeof value === 'string' && value.trim() !== '' ? [referenceIdFromValue(value)] : [])`, then drop empties). `validate`, `extractReferenceEdges`, and `formValues` all call these, so a Date or a bare scalar is canonicalized identically everywhere.

- [ ] **Step 1: Write the failing inference test:** `InferFieldset` of `{ author: reference (required), related: array(reference) }` equals `{ author: string; related?: string[] }`.
- [ ] **Step 2: Write the failing validation tests:**

```ts
const fs = fieldset({ author: fields.reference({ concept: 'pages', label: 'Author', required: true }), related: fields.array(fields.reference({ concept: 'posts' }), { label: 'Related' }) });
it('validates reference and array(reference) ids', () => {
  expect(fs.validate({ author: 'jane-doe', related: ['a-post', 'b-post'] }, '')).toEqual({ ok: true, data: { author: 'jane-doe', related: ['a-post', 'b-post'] } });
  expect(fs.validate({ author: '', related: [] }, '')).toEqual({ ok: false, errors: { author: 'Author is required' } });
  expect(fs.validate({ author: 'Not An Id' }, '')).toEqual({ ok: false, errors: { author: 'Author is not a valid reference' } });
});
it('coerces a lone scalar in an array slot to a single-element list', () => {
  expect(fs.validate({ related: 'b-post' }, '')).toEqual({ ok: true, data: { related: ['b-post'] } });
});
it('coerces a YAML-parsed Date element to its canonical id, never TZ-shifted garbage', () => {
  expect(fs.validate({ related: [new Date('2026-01-02T00:00:00Z')] }, '')).toEqual({ ok: true, data: { related: ['2026-01-02'] } });
});
it('rejects an array of a non-reference item this phase', () => {
  expect(() => fieldset({ tags: fields.array(fields.text({ label: 'Tag' })) })).toThrow(/only reference items/);
});
```

- [ ] **Step 3: Run, expect FAIL.**
- [ ] **Step 4: Implement.** Add the interfaces, constructors, union members, `ValueOf` arms, and the canonicalizer. In `validateField`: a `reference` arm as a `case 'reference':` INSIDE the post-`coerceToText` switch (scalar; the empty-first drop at fieldset.ts:181 is correct) whose non-empty `text` must pass `isValidId` else `${label} is not a valid reference`. The `array` arm is an **early-return branch placed beside `multiselect` (above the `coerceToText` line at ~fieldset.ts:149), NOT a switch case** (a switch case is dead code: `coerceToText` returns `''` for an array, so the empty-first return drops it). The array arm: `const list = referenceIdsFromValue(value)`, validate each element via `isValidId` (the item's reference rule), error `${label} is required` on a required empty list, store `data[key] = list` only when non-empty. Enforce the array-item-is-reference constraint in `fieldset()` at declaration (mirroring `checkSeoImageFields`).
- [ ] **Step 5: Run, expect PASS;** `npm run check` 0/0. Commit `feat(content): add reference and array(reference) descriptors with a shared canonicalizer`.

---

## Task 4: Form decode, form values, and the two-sided round-trip test

Add the `reference`/`array` arms to `frontmatterFromForm` and `formValues` (the latter via the canonicalizer), then pin the round-trip with BOTH a form-authored side and a disk-authored side (raw markdown a human or the rewriter could leave unquoted).

**Files:** Modify `src/lib/content/frontmatter.ts`. Test `src/tests/unit/frontmatter-reference-roundtrip.test.ts`.

**Interfaces:** Decode: a single `reference` reads one form value (trimmed id or omit when empty); an `array` reads `form.getAll(name)` (drop empties, omit when empty). `formValues`: a `reference` returns `referenceIdFromValue(value)`; an `array` returns `referenceIdsFromValue(value)` (so a Date is UTC-sliced and a bare scalar becomes a single-element list, never `String(Date)` or `[]`).

- [ ] **Step 1: Write the failing tests.** Side A (form-authored): single id and many ids round-trip through `frontmatterFromForm → serializeMarkdown → parseMarkdown → formValues`; an empty reference and empty array omit the key. Side B (disk-authored, the real loss vectors), run under `TZ=America/Anchorage`:

```ts
const fields: NamedField[] = [
  { name: 'author', type: 'reference', concept: 'pages', label: 'Author' },
  { name: 'related', type: 'array', item: { type: 'reference', concept: 'posts', label: '' }, label: 'Related' },
];
it('a disk-authored unquoted date-shaped scalar id survives as its id string', () => {
  const reloaded = parseMarkdown('---\nauthor: 2026-01-02\n---\nbody\n').frontmatter; // js-yaml parses to a Date
  expect(formValues(fields, reloaded).author).toBe('2026-01-02');
});
it('a disk-authored bare scalar in an array slot is not dropped to []', () => {
  const reloaded = parseMarkdown('---\nrelated: b-post\n---\nbody\n').frontmatter;
  expect(formValues(fields, reloaded).related).toEqual(['b-post']);
});
it('a disk-authored date-shaped id inside a block sequence survives', () => {
  const reloaded = parseMarkdown('---\nrelated:\n  - 2026-01-02\n  - b-post\n---\nbody\n').frontmatter;
  expect(formValues(fields, reloaded).related).toEqual(['2026-01-02', 'b-post']);
});
it('documents the js-yaml single-element-array guarantee', () => {
  const back = parseMarkdown(serializeMarkdown({ related: ['a-post'] }, 'b')).frontmatter;
  expect(Array.isArray(back.related)).toBe(true);
  expect(back.related).toEqual(['a-post']);
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** the decode arms (omit-when-empty, like the image arm) and the `formValues` arms via the canonicalizer.
- [ ] **Step 4: Run, expect PASS** (include the `TZ=America/Anchorage` run); `npm run check` 0/0.
- [ ] **Step 5: Commit** `feat(content): decode reference fields and pin the two-sided round-trip`.

---

## Task 5: The frontmatter-edge extractor

`extractReferenceEdges` reads parsed frontmatter against a concept's fields, coercing each value through the shared canonicalizer (so a bare scalar is one edge, a Date is its canonical id, and a string is never iterated char-by-char).

**Files:** Modify `src/lib/content/references.ts`. Test `src/tests/unit/references.test.ts`.

**Interfaces:** `ReferenceEdge { field: string; concept: string; id: string }`; `extractReferenceEdges(frontmatter, fields: NamedField[]): ReferenceEdge[]` — a `reference` field yields one edge from `referenceIdFromValue`; an `array(reference)` field yields one edge per `referenceIdsFromValue` element; the edge's `concept` is the descriptor's `concept`; each id must pass `isValidId`; deduped in field/array order.

- [ ] **Step 1: Write the failing tests:**

```ts
const fields: NamedField[] = [
  { name: 'author', type: 'reference', concept: 'pages', label: 'Author' },
  { name: 'related', type: 'array', item: { type: 'reference', concept: 'posts', label: '' }, label: 'Related' },
];
it('extracts scalar and array edges with the descriptor concept', () => {
  expect(extractReferenceEdges({ author: 'jane-doe', related: ['a-post', 'b-post'] }, fields)).toEqual([
    { field: 'author', concept: 'pages', id: 'jane-doe' },
    { field: 'related', concept: 'posts', id: 'a-post' },
    { field: 'related', concept: 'posts', id: 'b-post' },
  ]);
});
it('coerces a scalar value of an array field to ONE edge, never char-by-char', () => {
  expect(extractReferenceEdges({ related: 'b-post' }, fields)).toEqual([{ field: 'related', concept: 'posts', id: 'b-post' }]);
});
it('canonicalizes a Date element to its id edge', () => {
  expect(extractReferenceEdges({ related: [new Date('2026-01-02T00:00:00Z')] }, fields)).toEqual([{ field: 'related', concept: 'posts', id: '2026-01-02' }]);
});
it('skips a malformed id (scalar or element), never per-character edges', () => {
  expect(extractReferenceEdges({ author: 'Not An Id', related: 'Not An Id' }, fields)).toEqual([]);
});
it('a rename-to-true survives the rewriter into a live edge (the silent-drop regression)', () => {
  // The rewriter re-quotes, so the rewritten frontmatter reparses author as the STRING 'true',
  // which the extractor keeps rather than dropping a YAML boolean.
  const out = rewriteFrontmatterReference('---\nauthor: jane-doe\n---\nbody\n', 'author', 'jane-doe', 'true');
  expect(extractReferenceEdges(parseMarkdown(out).frontmatter, fields)).toContainEqual({ field: 'author', concept: 'pages', id: 'true' });
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** using `referenceIdFromValue`/`referenceIdsFromValue` (NEVER `for (const id of value)` against an unknown value).
- [ ] **Step 4: Run, expect PASS;** `npm run check` 0/0. Commit `feat(content): extract frontmatter reference edges from a schema`.

---

## Task 6: Manifest integration — the `references` edge field and `inboundReferences`

Add `references?: ReferenceEdge[]` to `ManifestEntry`, wire `manifestEntryFromFile`, mirror `mediaRefs` through serialize/parse/verify, and add the pair-matched reverse reader.

**Files:** Modify `src/lib/content/manifest.ts`, `src/lib/index.ts`. Test `src/tests/unit/manifest.test.ts`.

**Interfaces:**
- `ManifestEntry.references?: ReferenceEdge[]` (set only when non-empty).
- `InboundReference { concept: string; id: string; title: string; permalink: string; fields: string[] }`; `inboundReferences(manifest, concept, id): InboundReference[]` — matches every entry holding an edge where **`edge.concept === concept && edge.id === id` (the pair, never id alone; ids are unique only within a concept, manifest.ts:172 `keyOf`)**, excluding itself, carrying the distinct `fields` through which it references the target.

- [ ] **Step 1: Write the failing tests:** (a) `manifestEntryFromFile` records `references` from a reference fixture; (b) `serializeManifest` emits a sorted `references` only when non-empty; (c) `parseManifest` validates each `{field, concept, id}` and accepts an entry with none; (d) the three `verifyManifest` normalization cases mirroring `mediaRefs` (manifest.ts:214/226/236):

```ts
// d.1 back-compat: committed OMITS references, built carries them -> no throw.
// d.2 other-field drift still throws: committed omits references AND title differs -> throw /stale/.
// d.3 references drift on a regenerated manifest still throws: committed CARRIES references that DIFFER -> throw /stale/.
```

  (e) `inboundReferences` with BOTH `pages/about` and `posts/about` present, plus a post referencing `posts/about` via `related`, asserts `inboundReferences(manifest, 'pages', 'about')` is `[]` (pair match, no cross-concept phantom).

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Mirror every `mediaRefs` site; the normalization arm condition is exactly `b.references && c && c.references === undefined`. Add `inboundReferences` with the pair predicate.
- [ ] **Step 4: Run, expect PASS;** `npm run check` 0/0. Commit `feat(content): record frontmatter reference edges in the manifest`.

---

## Task 7: The strict cross-branch reference index

`buildReferenceIndex` unions `main` (from `entry.references`) and every open `cairn/*` branch, keyed by the target `(concept, id)` pair, with a `strict` fail-closed mode. A near-clone of `media/usage.ts`, but **the key is the `(concept, id)` pair, never a single id** (usage.ts keys on a globally-unique hash; reverse-mapping by id alone would cross the concept boundary).

**Files:** Create `src/lib/content/reference-index.ts`. Test `src/tests/unit/reference-index.test.ts`.

**Interfaces:** `ReferenceUsageEntry { concept; id; title; permalink?; field; origin: UsageOrigin }` (reuse `UsageOrigin` from `media/usage.ts`); `ReferenceIndex = Map<string, ReferenceUsageEntry[]>` keyed `${targetConcept}/${targetId}`; `buildReferenceIndex(repo, token, concepts, manifest, opts?: { branches?; strict? }): Promise<ReferenceIndex>` — main arm reverse-maps `entry.references`; branch arm `parsePendingBranch` → `findConcept` → reconstruct path → `readRaw` → `extractReferenceEdges`; `strict` rethrows a branch read failure.

- [ ] **Step 1: Write the failing tests** (main reverse map; branch reads an open file; `strict:true` rethrows; non-strict skips), plus the disambiguation test: with `pages/about` and `posts/about`, a post referencing `posts/about`, the `pages/about` bucket is empty and the `posts/about` bucket is non-empty.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** by adapting `buildUsageIndex`: bucket under `${targetConcept}/${targetId}`, resolve the target concept from the EDGE's concept. Add the "key on the pair, not id alone" note.
- [ ] **Step 4: Run, expect PASS;** `npm run check` 0/0. Commit `feat(content): build a strict cross-branch reference index`.

---

## Task 8: The dangling-reference build gate, wired into the virtual module

A reference to a missing id fails the build with a file-and-field error; the gate runs inside the generated virtual-module source (where `built` exists), not at the TS call site.

**Files:** Modify `src/lib/content/manifest.ts` (`verifyReferences`), `src/lib/content/concepts.ts` (declaration-time concept-key check), `src/lib/vite/index.ts` (the verify `resultExpr` + import), `src/lib/index.ts` (export `verifyReferences`). Test `src/tests/unit/manifest.test.ts`, `concepts.test.ts`, plus a vite-integration test.

**Interfaces:** `export function verifyReferences(manifest: Manifest): void` — throws naming the source `concept/id`, the `field`, and the missing `targetConcept/targetId` for the first edge absent from `manifest.entries`. `normalizeConcepts` throws when a `reference`/`array(reference)` field's `concept` is not a key in `content`.

**Wiring (the verified fix):** `built` exists ONLY inside `virtualSource`'s string (vite/index.ts:66), evaluated under `evalVirtual`; the `verifyManifest(built, committed)` call is in the verify-mode `resultExpr` at vite/index.ts:57. So change that expression to `'(verifyManifest(built, committed), verifyReferences(built), "ok")'` and add `verifyReferences` to the `@glw907/cairn-cms` import at vite/index.ts:60. Do NOT call it at the `:128` TS site (`built` is not in scope there). Export `verifyReferences` from `src/lib/index.ts` (beside `serializeManifest`/`verifyManifest`) with a one-line TSDoc and a `check:reference:signatures` entry. References have no prerender backstop, so this is the only integrity authority.

- [ ] **Step 1: Write the failing tests:** (a) `verifyReferences` throws on a dangling edge with file+field in the message; (b) it passes when every edge resolves; (c) `normalizeConcepts` throws on `reference({ concept: 'nope' })`; (d) a vite-integration test (mirroring the existing `verifyManifestFromVite` spike) over a fixture whose frontmatter holds `author: ghost-id` with no `ghost-id` entry asserts the BUILD path rejects (proving the `:57`/`:60` wiring, which the unit test alone does not exercise); (e) the concept-change re-resolution regression: `extractReferenceEdges` re-pairs a stored `author: jane-doe` with the descriptor's concept, so flipping that field's `concept` from `posts` (where `jane-doe` exists) to `pages` (where it does not) makes `verifyReferences` throw naming `pages/jane-doe` (the spec's bounded "no schema-change data loss" case, spec lines 180-185).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** `verifyReferences`, the `normalizeConcepts` check, the `virtualSource` wiring, and the root export.
- [ ] **Step 4: Run, expect PASS;** `npm run check` 0/0. Commit `feat(content): fail the build on a dangling reference, wired into the manifest build`.

---

## Task 9: Extract `EntryPicker` from `LinkPicker`

Pull the search + grouped-list core into a reusable `EntryPicker.svelte` emitting a chosen `LinkTarget`; refactor `LinkPicker` to wrap it (no behavior change). Independent of the field-system chain.

**Files:** Create `src/lib/components/EntryPicker.svelte`. Modify `LinkPicker.svelte`. Test: existing `LinkPicker` test stays green; add an `EntryPicker` selection test.

**Interfaces:** `EntryPicker` props `{ targets: LinkTarget[]; choose: (t: LinkTarget) => void; conceptFilter?: string; selectedIds?: string[]; trigger?: boolean }` with `open()`. It renders the search box, the concept-grouped list (`groups`/`rank`/`heading`), marks an already-selected row, and filters to `conceptFilter`. It does NOT know `cairn:` tokens or the editor cursor.

- [ ] **Step 1: Write the failing `EntryPicker` test** (search filters by title; `choose` fires the picked target; `conceptFilter` narrows).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** by moving the list/search markup and `groups`/`rank`/`heading` out of `LinkPicker`; refactor `LinkPicker` to render `EntryPicker` and, on `choose`, call its existing `insert(formatCairnToken(target), target.title)`.
- [ ] **Step 4: Run, expect PASS;** `npm run check` 0/0. Commit `refactor(components): extract EntryPicker from LinkPicker`.

---

## Task 10: The reference field editor arm

`ReferenceField.svelte` renders a single reference (a combobox over `EntryPicker` filtered to the field's concept) and a many `array(reference)` (a removable chip list + `EntryPicker`). Wire it into `EditPage.svelte` behind the Details slide-over, ship targets + resolved values from `editLoad`.

**Files:** Create `src/lib/components/ReferenceField.svelte`. Modify `EditPage.svelte`, `src/lib/sveltekit/content-routes.ts` (`editLoad` passes `linkTargets` + each field's `concept`). Test `src/tests/component/reference-field.test.ts`.

**Interfaces:** `ReferenceField` props `{ field: NamedField; value: string | string[]; targets: LinkTarget[] }`. It emits the hidden form input(s) the decoder reads: one `<input name={field.name}>` for a single reference, one per selected id for an array (so `frontmatterFromForm`'s `getAll` reads them).

- [ ] **Step 1: Write the failing component tests** (open Details first, per cutover carry-forward #4a): a single reference renders the resolved title and on pick sets the hidden input; an array renders chips and appends a hidden input per id; removing a chip drops its input.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** `ReferenceField` (combobox + chip list over `EntryPicker` with `conceptFilter={field.concept}` and `selectedIds`); add its arm to `EditPage.svelte` behind the Details panel.
- [ ] **Step 4: Run, expect PASS;** `npm run check` 0/0. Commit `feat(editor): add the reference field picker arm`.

---

## Task 11: The save-time reference warning

`saveAction` classifies frontmatter reference targets against `main` (this entry upserted) and surfaces a non-blocking WARNING for an absent or draft target. Never a 400.

**Files:** Modify `src/lib/sveltekit/content-routes.ts` (`saveAction`, beside the link classification at :1295). Test `src/tests/integration/content-routes-reference-save.test.ts`.

**Interfaces:** For each reference edge (excluding a self-edge), look up `byKey`; an absent or draft target appends to `referenceWarnings: string[]` on the save SUCCESS result (the `draftLinks` channel), NOT the `absent` hard-block list. **Note in the step:** this warning is best-effort against the committed (possibly stale) `main` manifest, advisory by design like `draftLinks`, NEVER the integrity guarantee. References have no prerender re-resolve backstop the way body links do (`buildLinkResolver`), so `verifyReferences` (Task 8) at the deploy gate is the only authority.

- [ ] **Step 1: Write the failing integration test:** saving an entry whose `author` references a draft (or absent) target SUCCEEDS and returns a `referenceWarnings` entry; a published target warns nothing.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** the classification loop; thread `referenceWarnings` onto the save-result type.
- [ ] **Step 4: Run, expect PASS;** `npm run check` 0/0. Commit `feat(editor): warn on a mid-flight reference at save, never block`.

---

## Task 12: Rename repoints references on main, refuses a third-party open-branch inbound

Build the strict cross-branch reference index; refuse (409) when a THIRD-PARTY open branch holds an inbound reference; repoint inbound references on `main` and the moved entry's own self-references. **Correctness-critical; dispatch `model: opus`.**

**Files:** Modify `src/lib/sveltekit/content-routes.ts` (`renameAction`, after the body-link loop at :1694). Test `src/tests/integration/content-routes-reference-rename.test.ts`.

**Behaviour (the verified predicate):** The strict index unions main (published rows) and every open `cairn/*` branch, so **filter before refusing**. Refuse (409, naming the branches) iff `(index.get(\`${concept.id}/${id}\`) ?? [])` contains any row with `origin.kind === 'branch' && origin.branch !== pendingBranch(concept.id, id)`. Gate `kind === 'branch'` FIRST: a published row has no `.branch`, so a bare `origin.branch !== pendingBranch(...)` would wrongly trip on every main-side inbound and over-refuse. The entry's OWN pending branch is already refused at :1645 and absent by construction, so every surviving branch row is a third-party entry's edit branch. **Published (main) inbound rows are NOT refused; they are repointed** via `inboundReferences(manifest, concept.id, id)` (a main-only manifest reader), for each linker rewriting each of its `fields` with `rewriteFrontmatterReference(linkerRaw, field, id, newId)`, re-deriving the row. **Self-reference:** before re-deriving the moved file's own row, repoint its own frontmatter self-references too (mirroring the body-link self-rewrite at :1684): for each reference/array(reference) field on this concept, `movedRaw = rewriteFrontmatterReference(movedRaw, field.name, id, newId)`. **Stale-manifest trade:** `inboundReferences` reads the committed manifest (last-writer-wins stale, like the body-link loop at :1692); a real inbound edge not yet in the committed manifest is left to `verifyReferences` at the deploy gate. Wrap the strict-index build in `try/catch` and refuse (`RenameFailure`) on a throw (fail-closed). Ride all rewrites in the single `commitFiles`.

- [ ] **Step 1: Write the failing integration tests:** (a) MAIN inbound repoints (an entry on main references the target via `author`; rename succeeds, repoints, re-derives the linker's `references`); (b) THIRD-PARTY branch refusal (a DIFFERENT entry on `cairn/posts/other-post` authors `related: [target]`; rename returns 409 naming `posts/other-post`, no commit); (c) a MAIN inbound does NOT trip the branch refusal (the published row has no `.branch`); (d) SELF-reference (an entry whose `related` includes its own old id; after rename the moved file's re-derived `references` carry the NEW id and `verifyReferences` does not throw); (e) STALE-manifest backstop (a committed manifest omitting a real main inbound; after rename `verifyReferences(built)` throws naming the dangling linker/field).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** the filtered refuse predicate, the fail-closed catch, the main repoint loop, and the self-field rewrite loop, threading through the existing `changes`/`next` accumulation.
- [ ] **Step 4: Run, expect PASS;** `npm run check` 0/0. Commit `feat(editor): repoint references on rename, refuse a third-party open-branch inbound`.

---

## Task 13: Delete refuses across branches when referenced

Build the strict cross-branch reference index (fail-closed) and refuse (409) when the target is referenced on `main` or any open branch, beside the existing body-link refusal.

**Files:** Modify `src/lib/sveltekit/content-routes.ts` (`deleteEntry`, beside the `inboundLinks` gate at :1563). Test `src/tests/integration/content-routes-reference-delete.test.ts`.

**Behaviour (mirroring the media delete gate at content-routes.ts:1908-1920):** wrap the strict-index build in `try/catch`; on any throw, REFUSE with a `DeleteRefusal`-shaped `fail(503, 'Could not verify where this entry is referenced. Try again.')`, never proceed to commit. After a successful build, `const rows = index.get(\`${concept.id}/${id}\`) ?? []`; a non-empty bucket refuses with `fail(409)` listing the referencing entries. The body-link `inboundLinks` gate stays main-only (Locked decision 9); the reference gate must NOT mirror its degrade-to-allow-on-absent-manifest posture.

- [ ] **Step 1: Write the failing integration tests:** delete refuses when a main entry references the target; refuses when an open-branch entry references it; **refuses (503, no commit, no `removeEntry`) when a branch read throws** (mock `readRaw`/`listBranches` to reject); proceeds when nothing references it.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** the fail-closed strict-index refusal.
- [ ] **Step 4: Run, expect PASS;** `npm run check` 0/0. Commit `feat(editor): refuse deleting a cross-branch-referenced entry, fail closed`.

---

## Task 14: Read-model reference resolution at the site-resolver layer

A `reference`/`array(reference)` field resolves to the target's identity at the cross-concept `site-resolver` layer (the only layer that can reach a different concept's entries).

**Files:** Modify `src/lib/delivery/site-resolver.ts` (add the resolver, mirroring `buildLinkResolver` at :100-105), `src/lib/index.ts` (export `ResolvedReference`). Test the site-resolver test home.

**Interfaces:** `ResolvedReference { id: string; concept: string; title: string; permalink: string; summary?: string }`. Add `resolveReferences(site: SiteResolver, descriptor: ConceptDescriptor, frontmatter: Record<string, unknown>): Record<string, ResolvedReference | ResolvedReference[]>` (or a per-edge `resolveReference(site, edge): ResolvedReference | undefined`): for each reference/array(reference) field, resolve each edge via `site.concept(edge.concept)?.byId(edge.id)`, projecting `{ id, concept, title, permalink, summary }` from the target entry/summary. A single field resolves to one `ResolvedReference`, an array to `ResolvedReference[]`; drop an unresolved id (the Task 8 build gate already failed a true dangling). Resolve lazily at the resolver boundary (per call), since the target entries exist only after all per-concept indexes are unioned. The public route calls it and passes the resolved map to the template.

- [ ] **Step 1: Write the failing test:** a posts entry with `author: jane-doe` (a `pages` entry) and `related: [a-post]` resolves to the `pages/jane-doe` and `posts/a-post` identities (title + permalink), proving the CROSS-concept reach a per-concept index lacks.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** `resolveReferences` in site-resolver.ts; export `ResolvedReference`.
- [ ] **Step 4: Run, expect PASS;** `npm run check` 0/0. Commit `feat(delivery): resolve references to their target identity at the site-resolver layer`.

---

## Task 15: Showcase migration + e2e

Add `author` (reference to pages) and `related` (array of reference to posts) to the showcase posts concept, seed targets, wire `resolveReferences` into the post route, and extend the e2e to pick a reference (open Details first), save, reload, AND assert the RESOLVED target (title + permalink) reaches the rendered route.

**Files:** Modify `examples/showcase/src/lib/cairn.config.ts`, `examples/showcase/src/content/{pages,posts}/**`, the showcase post route (call `resolveReferences`), `examples/showcase/e2e/golden-path.spec.ts`.

- [ ] **Step 1:** Add `author: fields.reference({ concept: 'pages', label: 'Author' })` and `related: fields.array(fields.reference({ concept: 'posts' }), { label: 'Related posts' })`; seed an author page and a second post.
- [ ] **Step 2: Extend the e2e:** open a post, open Details, pick an author and a related post, save, reload, assert both round-trip; assert the committed manifest's `references` carry the edges; AND assert the rendered post route shows the resolved author's title linked to its permalink (the resolution bug cannot pass CI).
- [ ] **Step 3: Prove the consumer build** from scratch (`rm -rf examples/showcase/{node_modules,package-lock.json}`, fresh install, `npm --prefix examples/showcase run build`), then the e2e. Or push for CI `e2e`.
- [ ] **Step 4: Commit** `feat(showcase): exercise reference fields end to end`.

---

## Task 16: Docs, ROADMAP, gates, and tracking

**Files:** Modify `docs/reference/core.md`, `docs/guides/`, `docs/explanation/`, `CHANGELOG.md` + `docs/guides/upgrade-cairn.md`, `ROADMAP.md`, `scripts/check-reference-signatures.mjs`, add `.gitattributes`, this plan (post-mortem).

- [ ] **Step 1: Reference + guide + explanation** for the new public surface (`fields.reference`/`fields.array`, `ResolvedReference`, `ReferenceEdge`, `verifyReferences`); every exported symbol documented.
- [ ] **Step 2: CHANGELOG + upgrade** entry for 0.70.0 (additive; reference fields now available; no `Consumers must:`).
- [ ] **Step 3: `.gitattributes`** at the repo root (`*.md text eol=lf`) and the showcase equivalent, so content normalizes to LF (defense-in-depth for the rewriter's CRLF handling, not a replacement for it).
- [ ] **Step 4: ROADMAP.** Mark references shipped and remove it from the live tiers. Queue two Next-tier entries: (a) the **taxonomy / tag delivery** pass (consumes the reserved `taxonomy` marker), Geoff's explicit ask; (b) the **body-link cross-branch delete** follow-up (lift body-link delete protection to the strict cross-branch gate references now use). Append a friction-log entry for any design friction the docs surfaced.
- [ ] **Step 5: Run every gate.** `npm run check` 0/0, `npm test` exit 0, `npm run check:comments`, `check:reference`, `check:reference:signatures`, `check:package`, `check:docs`, `check:version` (minor → 0.70.0), and the from-scratch showcase e2e.
- [ ] **Step 6: Review gate.** Fan out `svelte-reviewer` (the editor arm), `web-auth-security-reviewer` (the rename/delete commit paths), and `cloudflare-workers-reviewer` (the cross-branch index's branch fan-out, mirroring the media-usage throttle note). Fold findings.
- [ ] **Step 7: Code-simplifier** over the pass's changed code; re-gate.
- [ ] **Step 8: Append the post-mortem** and update `docs/STATUS.md`.
- [ ] **Step 9: Commit** `docs(references): reference, guide, explanation, changelog, and roadmap`.

---

## Carry-forwards / review-gate flags

- **The rewriter (Task 2) carries the silent-corruption risk** the sweep's two Task 2 blockers named: a YAML-significant `newId` reparsing as a non-string. Its test matrix (re-quote keyword/number/date, CRLF, BOM, inline comment, sibling-prefix key, substring guard, the rename-to-`true` round-trip survival) is the deliverable; reuse `frontmatter-region.ts` rather than re-deriving boundary logic.
- **References have no prerender backstop** (unlike body links via `buildLinkResolver`), so `verifyReferences` wired into the build (Task 8) is the only integrity authority. The save warning (Task 11) is advisory.
- **A defensive follow-up (not in this plan):** once all arms land, add `never`-exhaustiveness assertions to the field-system switches so the phase-2 `object` type cannot silently hit a default. Noted for the phase-2 plan.
- **Body-link delete protection stays main-only** (Locked decision 9); the ROADMAP follow-up (Task 16) tracks lifting it.
- **The render-seam `resolve()` of references is phase 4**, not here; this pass resolves at the site-resolver layer only.
- **The deferred taxonomy pass is queued in ROADMAP** (Task 16), per Geoff's instruction.
