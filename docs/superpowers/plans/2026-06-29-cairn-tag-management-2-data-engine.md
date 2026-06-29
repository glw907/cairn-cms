# Tag-management Plan 2: The data engine — vocabulary config, manifest tag usage, and the enforced field

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the engine for an editor-owned, enforced tag vocabulary: a committed `vocabulary` key in the site config with its parser/validation and a `setVocabulary` commit mutator; a `ManifestEntry.tags` projection and a cross-branch `tagUsage`; and the field seam that, on save and edit, sources the vocabulary from the runtime, renders the taxonomy field as a closed vocabulary-sourced picker, enforces it against new values, and never drops a pre-existing (orphan) tag.

**Architecture:** The vocabulary is config, not a store: a `vocabulary?: VocabularyEntry[]` key in the committed `site.config.yaml`, validated and read at build through `composeRuntime` onto `CairnRuntime.vocabulary`, and edited at runtime through the same parse-and-commit path `setMenu`/`setTidy` use. The seam reads the vocabulary from `runtime.vocabulary` (the deployed snapshot, the same source `tidy` uses), so there is no per-request config read and no config-read failure mode. Tag usage rides the manifest: `ManifestEntry.tags?` mirrors `mediaRefs?`/`references?`, a pure `tagUsage(manifest, value)` mirrors the internal `inboundReferences`, and an internal cross-branch `buildTagUsageIndex` mirrors `buildReferenceIndex` (main ∪ every open `cairn/*` branch). Enforcement is **not** a fieldset rebuild: the `fieldset` validator stays untouched (so a concept's `refine` and `behavior` survive), and the taxonomy field is enforced by a small, separate seam — a pure fields transform that produces the closed picker descriptor for render and decode, plus a standalone `enforceTaxonomy` gate at save. Orphan preservation is a per-entry **union**: the allowed set is `vocabulary ∪ the entry's own prior tags`, so the closed picker blocks a new value while a pre-existing orphan validates and renders as a flagged, removable chip. The build path needs **no** enforcement change: because the allowed set always includes the entry's own tags, a build that validated against it would be a no-op, and the published tags-as-data read is identical, so this plan leaves the build untouched (the Plan-3 migration seed makes the vocabulary a superset for picker clarity; the union is the safety net against any delist).

**Tech Stack:** TypeScript, `src/lib/nav`, `src/lib/content`, `src/lib/delivery`, `src/lib/sveltekit`, Svelte 5, Vitest. The save/edit enforcement tests are Node-project unit tests that build a hand-constructed `CairnRuntime` (with `vocabulary` set) and drive `saveAction`/`editLoad` through the in-memory GithubDouble `fetch` double (`vi.stubGlobal('fetch', …)`, see `src/tests/unit/_github-double.ts` and `content-routes-save.test.ts`); only the `FieldInput` component test runs in a real browser (chromium). The workerd/miniflare project is the D1-bound auth suite, not the save/edit/build path.

## Global Constraints

- **Spec is canonical.** `docs/superpowers/specs/2026-06-29-cairn-tag-management-design.md`, Components 1 and 3, the "Breaking change and migration" section, the "Testing" section, and the Plan-2 line of "Plan split". This plan is its Plan 2; Plan 1 (the reshape) has landed. **Plan-against-code reassessment (folded from the Plan-2 adversarial review):** the spec lists three resolution points (save, render, build); against the code, the per-entry union makes the **build** point a provable no-op (an entry's own tags always pass), so this plan implements the seam at **save and edit-render only** and documents why build needs no change. This is the leaner, correct form of the same guarantee.
- **Builds on the kept tags-as-data surface.** Plan 1 kept the `taxonomy` marker, `resolveTaxonomyField` (`src/lib/content/taxonomy.ts:7`, returns `string | null`), `ContentSummary.tags`, `ContentIndex.byTag`/`allTags`, and feed categories. This plan consumes them; do not change their contracts.
- **The vocabulary is config, not a store.** `VocabularyEntry = { value: string; label: string }`; `value` is a frozen slug (the stored frontmatter token and the filter key), `label` is the editable display. Per-concept scoping is out of scope (global only). No descriptions or richer fields (the entry object stays open to them).
- **No admin SCREEN in this plan.** The tag-admin UI (add/rename/delete), the enable/seed orphan **checklist**, and the size-gated template filter are Plan 3. This plan is testable without the admin screen: it ships the config engine, the manifest surface, and the field seam (including the post-editor field's orphan chip, which is component-testable), but not the vocabulary-management screen.
- **The validator is untouched.** `fieldset.validate` (`fieldset.ts:435-467`) stays a pure closure over the static descriptor, so a concept's `refine` and `behavior` (which are **not** recoverable from `ConceptDescriptor.schema` — `Fieldset` carries `behavior` but not `refine`) are never dropped. Enforcement is the separate `enforceTaxonomy` gate plus the closed-picker fields transform, not a fieldset rebuild.
- **The enforced field is `options`-set AND `creatable:false`.** Only then do `isClosedMultiselect` (`frontmatter.ts:19`, `options && !creatable`), the render (`FieldInput.svelte:169`), and the decode (`frontmatter.ts:93`/`:30`, `getAll`) all agree on the closed checkbox picker.
- **Orphan preservation (locked design).** At save the allowed set is `unique([...vocabularyValues, ...priorTags])`, where `priorTags` is the entry's own committed tag set read **branch-first** (mirroring `editLoad`, `content-routes.ts:1069-1070`): the entry's pending branch when its `branchHead` is non-null, else `backend.defaultBranch`; a create has `priorTags = []`. This admits a re-saved pre-existing orphan while `enforceTaxonomy` rejects a genuinely new value. At edit-render the orphan set is `priorTags \ vocabularyValues`, rendered flagged.
- **Opt-in.** When `runtime.vocabulary` is empty (a site configures no vocabulary) **or** a concept has no taxonomy field, every seam point falls back to the bare descriptor and the taxonomy field stays the open creatable multiselect it is today. Enforcement is adopted, never imposed; this plan is non-breaking for an unadopted site.
- **Gate before done (each task):** the task's targeted test, then `npm run check` 0/0, then `npm test` exit 0. Run `npm run package` before any `check:surface`/`check:reference`; run `check:reference:signatures` and `check:surface` **in the task that changes a public signature**, not deferred. The `FieldInput` component test runs in chromium. **Worktree note:** `npm run package` before `npm test` if a dist import flakes.
- **Worker fan-out throttle.** `buildTagUsageIndex` must mirror the existing branch-read throttle (`reference-index.ts:108-112` / `usage.ts:110-112`, the workerd 6-connection limit); do not merge all branch reads into one `Promise.all`.
- **Public surface is minimal.** The only new **public** (barrel-exported) surface is the vocabulary functions and `VocabularyEntry` (Task 1). `ManifestEntry.tags` rides the existing `ManifestEntry` export. `tagUsage` and `buildTagUsageIndex` stay **internal** (mirroring `inboundReferences`/`buildReferenceIndex`, which are not barrel-exported); Plan 3's in-package admin imports them directly.

---

## Task 1: The `vocabulary` config key — type, validation, and the `setVocabulary` mutator

Add the committed vocabulary to `SiteConfig` with a validator and a commit-path mutator, mirroring the tidy pattern. Pure module work.

**Files:**
- Modify: `src/lib/nav/site-config.ts` (add `VocabularyEntry` and `SiteConfig.vocabulary?`; add `validateVocabulary`, `extractVocabulary`, `setVocabulary`).
- Modify: `src/lib/index.ts` (barrel-export `validateVocabulary`, `extractVocabulary`, `setVocabulary`, and the `VocabularyEntry` type, with the site-config exports at L127-136).
- Test: `src/tests/unit/nav-site-config.test.ts`.

**Interfaces:**
- Produces: `interface VocabularyEntry { value: string; label: string }`; `SiteConfig.vocabulary?: VocabularyEntry[]`; `validateVocabulary(value: unknown): VocabularyEntry[]` (throws `SiteConfigError` on malformed); `extractVocabulary(config: SiteConfig): VocabularyEntry[]` (absent → `[]`); `setVocabulary(raw: string, vocab: VocabularyEntry[]): string`.

**Steps:**

- [ ] **Step 1: Write the failing tests.** In `nav-site-config.test.ts`: a well-formed `vocabulary: [{ value: 'web-design', label: 'Web Design' }]` parses and `extractVocabulary` returns it; an absent key → `[]`; a duplicate `value` throws; an empty `label` throws; a non-slug `value` (`'Web Design'`, `'WebDesign'`, `'web design'`, `'-x'`) throws; a non-array `vocabulary` throws. For the mutator: `setVocabulary(raw, [{value:'a',label:'A'}])` round-trips a config still containing `siteName` and the other keys with `vocabulary` set; `setVocabulary` on a config missing `siteName` throws.
- [ ] **Step 2: Run; confirm failures.**

Run: `npx vitest run src/tests/unit/nav-site-config.test.ts`
Expected: FAIL (undefined functions).

- [ ] **Step 3: Implement** in `site-config.ts`:
  - `export interface VocabularyEntry { value: string; label: string }` and `vocabulary?: VocabularyEntry[]` on `SiteConfig` (after `tidy?`, ~L92).
  - `const SAFE_TAG_VALUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;` (lowercase alphanumeric segments joined by single hyphens — the stored token and filter key).
  - `validateVocabulary(value: unknown): VocabularyEntry[]` mirroring `validateTidyConventions` (L207-241): require an array (else throw `SiteConfigError`); each element an object with a non-empty string `label` and a non-empty string `value` matching `SAFE_TAG_VALUE`; track seen values, throw on duplicate; return `{ value, label }[]` in input order.
  - `extractVocabulary(config): VocabularyEntry[]` mirroring `extractMenu` (L296-300): `config.vocabulary === undefined ? [] : validateVocabulary(config.vocabulary)`.
  - `setVocabulary(raw, vocab): string` mirroring `setTidy` (L326-339): `parseDocument(raw)`, assert `siteName`, `doc.setIn(['vocabulary'], vocab.map((v) => ({ value: v.value, label: v.label })))`, return `doc.toString()`.
- [ ] **Step 4: Barrel-export** the three functions + `VocabularyEntry` from `src/lib/index.ts` (L127-136).
- [ ] **Step 5: Run; confirm pass.**
- [ ] **Step 6: Full gate + `npm run package` + `node scripts/check-surface.mjs --update` + `npm run check:reference:signatures`** (new public exports). Commit `site-config.ts`, `index.ts`, the test, `docs/internal/api-surface.md`.

```bash
git add src/lib/nav/site-config.ts src/lib/index.ts src/tests/unit/nav-site-config.test.ts docs/internal/api-surface.md
git commit -m "Add the vocabulary site-config key, validation, and setVocabulary"
```

---

## Task 2: Thread the vocabulary onto `CairnRuntime`

Make the validated vocabulary available on the runtime so the seam (Tasks 6–7) reads it the same way it reads `tidy`. This is the seam's vocabulary source.

**Files:**
- Modify: `src/lib/content/compose.ts` (`composeRuntime` sets `vocabulary: extractVocabulary(siteConfig)`, ~L56).
- Modify: `src/lib/content/types.ts` (`CairnRuntime` gains `vocabulary: VocabularyEntry[]`, ~L349 near `navMenu`).
- Test: `src/tests/unit/content-compose.test.ts`.

**Interfaces:**
- Consumes: `extractVocabulary` (Task 1).
- Produces: `CairnRuntime.vocabulary: VocabularyEntry[]` (always present, `[]` when the config omits the key). A malformed vocabulary fails the build through `extractVocabulary`.

**Steps:**

- [ ] **Step 1: Write the failing test.** In `content-compose.test.ts`: `composeRuntime({ adapter, siteConfig })` with `siteConfig.vocabulary = [{value:'a',label:'A'}]` produces `runtime.vocabulary` equal to that array; no key → `runtime.vocabulary === []`; a malformed `vocabulary` throws.
- [ ] **Step 2: Run; confirm failure.**
- [ ] **Step 3: Implement.** Add `vocabulary: VocabularyEntry[]` to `CairnRuntime` (import `VocabularyEntry` from `../nav/site-config.js`). In `composeRuntime`, add `vocabulary: extractVocabulary(siteConfig)` (~L56, alongside `tidy`).
- [ ] **Step 4: Run; confirm pass.**
- [ ] **Step 5: Full gate.** Commit `compose.ts`, `types.ts`, the test.

```bash
git add src/lib/content/compose.ts src/lib/content/types.ts src/tests/unit/content-compose.test.ts
git commit -m "Thread the vocabulary onto CairnRuntime"
```

---

## Task 3: `ManifestEntry.tags` projection and `verifyManifest` normalization

Add the additive-optional `tags?: string[]`, projected from the marked taxonomy field with the same scalar coercion the validator and form layer use, normalized like `mediaRefs`/`references`.

**Files:**
- Modify: `src/lib/content/manifest.ts` (`ManifestEntry` ~L37; `manifestEntryFromFile` ~L65-81; `serializeManifest` ~L112-115; `parseManifest` struct check ~L149-150 and element loop ~L158-164; `verifyManifest` drop-block ~L271-274).
- Test: `src/tests/unit/manifest.test.ts`.

**Interfaces:**
- Consumes: `resolveTaxonomyField` (returns `string | null`), and a **scalar-coercing** tag normalizer (not bare `asTags`).
- Produces: `ManifestEntry.tags?: string[]` (additive-optional, absent reads as none, mirrors `mediaRefs?`), projected from raw frontmatter with scalar coercion so a lone `topics: svelte` scalar projects `['svelte']` (matching the validator at `fieldset.ts:206` and `multiselectFormValue` at `frontmatter.ts:265`; bare `asTags` drops a scalar and would under-report `tagUsage`, breaking Plan 3's delete-safety gate).

**Steps:**

- [ ] **Step 1: Write the failing tests.** In `manifest.test.ts`: an entry whose concept marks `topics` and whose frontmatter has `topics: ['svelte','web-design']` yields `entry.tags === ['svelte','web-design']`; a **lone scalar** `topics: svelte` yields `entry.tags === ['svelte']` (not absent — the scalar-coercion guard); an entry with no taxonomy field or empty tags has `tags` absent (`'tags' in entry === false`); `serializeManifest` emits a sorted `tags` only when present; `parseManifest` accepts `tags` absent, accepts a string array, rejects a non-string-array `tags`; `verifyManifest` does not fail when the built entry has `tags` but the committed manifest omits it.
- [ ] **Step 2: Run; confirm failures.**
- [ ] **Step 3: Implement.** First add the shared coercion helper, then the projection:
  - In `src/lib/content/taxonomy.ts` (next to `resolveTaxonomyField`), add and export `coerceTags(value: unknown): string[]` = `Array.isArray(value) ? value.map(String) : (typeof value === 'string' && value.trim() !== '' ? [value.trim()] : [])` (the scalar-coercing form, matching `fieldset.ts:206`/`frontmatter.ts:265`; do **not** reuse bare `asTags`, which drops a scalar). Tasks 4, 6, and 7 import this one helper.
  - In `manifest.ts`: type `tags?: string[]` after `references?` (~L37); import `coerceTags` from `taxonomy.js`.
  - `manifestEntryFromFile`: `const taxField = resolveTaxonomyField(descriptor.fields); const tags = taxField ? coerceTags(frontmatter[taxField]) : [];` and spread `...(tags.length ? { tags } : {})` (~L80-81). Guard the `null` from `resolveTaxonomyField` (no `?? ''`).
  - `serializeManifest`: `...(e.tags?.length ? { tags: [...e.tags].sort() } : {})` (~L114).
  - `parseManifest`: add `(e.tags === undefined || Array.isArray(e.tags))` to the struct check (~L150) and a string-element loop mirroring `mediaRefs` (~L158-164).
  - `verifyManifest`: a third drop-block mirroring `mediaRefs`/`references` (~L271-274).
- [ ] **Step 4: Run; confirm pass.**
- [ ] **Step 5: Full gate + surface regen** (`ManifestEntry` changed; `npm run package` then `node scripts/check-surface.mjs --update`). Commit `manifest.ts`, the test, `docs/internal/api-surface.md`.

```bash
git add src/lib/content/manifest.ts src/tests/unit/manifest.test.ts docs/internal/api-surface.md
git commit -m "Add ManifestEntry.tags projection (scalar-coercing) and verifyManifest normalization"
```

---

## Task 4: `tagUsage` (pure) and the internal cross-branch `buildTagUsageIndex`

A pure manifest query plus a cross-branch builder whose "in use" unions `main` with every open `cairn/*` branch. Both internal (mirroring `inboundReferences`/`buildReferenceIndex`, which are not barrel-exported); Plan 3's in-package admin delete gate imports them directly.

**Files:**
- Modify: `src/lib/content/manifest.ts` (add pure `tagUsage(manifest, value)` mirroring `inboundReferences` ~L366-381, and `TagUsageRow`).
- Create: `src/lib/content/tag-usage-index.ts` (cross-branch `buildTagUsageIndex`, mirroring `reference-index.ts`).
- Test: `src/tests/unit/manifest.test.ts` (the pure helper), `src/tests/unit/tag-usage-index.test.ts` (new, mirroring `reference-index.test.ts`).

**Interfaces:**
- Produces (internal, not barrel-exported): `interface TagUsageRow { concept: string; id: string; title: string; permalink: string }`; `tagUsage(manifest: Manifest, value: string): TagUsageRow[]`; `buildTagUsageIndex(backend, concepts, manifest, opts?): Promise<Map<string, TagUsageEntry[]>>` keyed by the bare tag `value` (a value is corpus-global, like a media hash — key on the bare value, not a `concept/id` pair), with `TagUsageEntry = { concept: string; id: string; origin: { kind: 'published' } | { kind: 'branch'; branch: string } }` and `opts: { branches?: string[]; strict?: boolean }`.

**Steps:**

- [ ] **Step 1: Write the failing pure-helper test.** `tagUsage(manifest, 'svelte')` returns `{ concept, id, title, permalink }` rows for entries whose `tags` include `'svelte'`, `[]` when none, never an entry lacking the value.
- [ ] **Step 2: Write the failing cross-branch test** (new `tag-usage-index.test.ts`, mirroring `reference-index.test.ts`): with a double whose `listBranches('cairn/')` returns one open branch whose edited file carries `topics: ['draft-only-tag']`, `buildTagUsageIndex` keys `'draft-only-tag'` with a `{ kind: 'branch', branch }` origin **even though no `main` entry carries it**; a tag on a `main` entry keys `{ kind: 'published' }`; `opts.branches` overrides the branch list; `opts.strict` rethrows a branch-read failure.
- [ ] **Step 3: Run; confirm failures.**
- [ ] **Step 4: Implement `tagUsage`** in `manifest.ts` mirroring `inboundReferences` (iterate `manifest.entries`, collect those whose `tags?.includes(value)`, project the row).
- [ ] **Step 5: Implement `buildTagUsageIndex`** in `tag-usage-index.ts` mirroring `buildReferenceIndex` (`reference-index.ts:82-159`): main arm reverse-maps `entry.tags ?? []` keyed by the bare value `{ kind: 'published' }`; branch arm lists `opts.branches ?? backend.listBranches(PENDING_PREFIX)`, reads each branch's edited file with the **same throttle** as `reference-index.ts:108-112`, computes `const tf = resolveTaxonomyField(concept.fields); if (!tf) continue;` then `coerceTags(frontmatter[tf])` (guard the `null`), keys each value `{ kind: 'branch', branch }`; `opts.strict` rethrows, else degrade-and-skip.
- [ ] **Step 6: Run; confirm pass.**
- [ ] **Step 7: Full gate.** (No barrel export, so no public-surface regen for these.) Commit `manifest.ts`, `tag-usage-index.ts`, both tests.

```bash
git add src/lib/content/manifest.ts src/lib/content/tag-usage-index.ts src/tests/unit/manifest.test.ts src/tests/unit/tag-usage-index.test.ts
git commit -m "Add internal tagUsage and the cross-branch buildTagUsageIndex"
```

---

## Task 5: The pure enforcement helpers (no fieldset rebuild)

The seam's pure core: the allowed-set union, the orphan set, the fields transform that produces the closed picker descriptor for render/decode, and the standalone `enforceTaxonomy` save gate. The fieldset validator is **not** touched, so `refine`/`behavior` survive.

**Files:**
- Create: `src/lib/content/taxonomy-enforce.ts`.
- Test: `src/tests/unit/taxonomy-enforce.test.ts`.

**Interfaces:**
- Consumes: `NamedField`, `resolveTaxonomyField`.
- Produces (internal): `resolveAllowed(vocabularyValues: string[], priorTags: string[]): string[]` = `unique([...vocabularyValues, ...priorTags])`; `unlistedTags(vocabularyValues: string[], priorTags: string[]): string[]` = `priorTags.filter((t) => !vocabularyValues.includes(t))`; `closeTaxonomyField(fields: NamedField[], allowed: string[]): NamedField[]` — returns a copy of `fields` where the taxonomy field (if any) has `options: allowed` and `creatable: false`, leaving every other field untouched and returning the input unchanged when there is no taxonomy field; `enforceTaxonomy(submittedTags: string[], allowed: string[]): string | undefined` — returns an error message naming the first value not in `allowed`, or `undefined` when all pass.

**Steps:**

- [ ] **Step 1: Write the failing tests.**
  - `resolveAllowed(['a','b'], ['b','orphan']) === ['a','b','orphan']` (dedupe, first-seen order); `unlistedTags(['a','b'], ['b','orphan']) === ['orphan']`.
  - `closeTaxonomyField(fields, ['a','b'])` for fields with a `topics` taxonomy returns fields whose `topics` has `options:['a','b']`, `creatable:false`, and every other field unchanged; for fields with **no** taxonomy field returns the input unchanged (deep-equal).
  - `enforceTaxonomy(['a'], ['a','b']) === undefined`; `enforceTaxonomy(['a','c'], ['a','b'])` returns a message naming `'c'`; `enforceTaxonomy(['orphan'], ['a','orphan']) === undefined` (the orphan is in the allowed union).
- [ ] **Step 2: Run; confirm failures.**
- [ ] **Step 3: Implement** the four pure functions. `closeTaxonomyField` finds the taxonomy field via `resolveTaxonomyField(fields)`; if `null`, return `fields`; else map, replacing that field with `{ ...field, options: allowed, creatable: false }`.
- [ ] **Step 4: Run; confirm pass.**
- [ ] **Step 5: Full gate.** Commit `taxonomy-enforce.ts`, the test.

```bash
git add src/lib/content/taxonomy-enforce.ts src/tests/unit/taxonomy-enforce.test.ts
git commit -m "Add the pure taxonomy enforcement helpers (allowed union, closed field, enforce gate)"
```

---

## Task 6: Enforce on SAVE

The save action sources the vocabulary from `runtime.vocabulary`, reads the entry's prior committed tags branch-first for the orphan union, decodes through the closed field, validates unchanged (so `refine` survives), and rejects a genuinely new value through `enforceTaxonomy`.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`saveToBranch` ~L1255-1365).
- Test: `src/tests/unit/content-routes-save.test.ts` (GithubDouble-driven; build the runtime with `vocabulary` set).

**Interfaces:**
- Consumes: `runtime.vocabulary` (Task 2), `resolveAllowed`/`closeTaxonomyField`/`enforceTaxonomy` (Task 5), `frontmatterFromForm`, the branch-first read helpers `pendingBranch`/`backend.branchHead`/`backend.readFile`/`parseMarkdown` already used by `editLoad`.
- Produces: a save where the closed `getAll` decode path is taken, `concept.validate` runs **unchanged** (refine intact), a submitted value neither in the vocabulary nor a prior tag is rejected (the existing invalid-field redirect), and a re-save preserving a prior orphan succeeds.

**Steps:**

- [ ] **Step 1: Write the failing test** in `content-routes-save.test.ts` (mirror its GithubDouble setup; build `runtime` with `vocabulary: [{value:'a',label:'A'}]` and a concept marking a `topics` taxonomy): saving a form posting only `topics=a` commits; saving with a brand-new `topics=brandnew` (not in the vocabulary, not a prior tag) is rejected (the `result`/`enforceTaxonomy` redirect path, no commit); editing an entry that already carries `topics: ['a','legacy']` and re-posting `topics=a` + `topics=legacy` (the orphan via `getAll`) commits and `legacy` survives in the committed frontmatter. Seed the entry's prior file in the double so the branch-first prior read finds `['a','legacy']`. When `runtime.vocabulary` is `[]`, the bare path runs (a free-form value commits, no enforcement) — assert the opt-in fallback.
- [ ] **Step 2: Run; confirm failure.**
- [ ] **Step 3: Implement.** In `saveToBranch`, before the validate/decode at L1267. **First move `const backend = resolveBackend(event);` up** from its current spot (~L1274, after the validate) to the top of the function, since the branch-first prior read needs it before validating. Then:
  - `const vocabValues = runtime.vocabulary.map((v) => v.value);` and `const taxField = resolveTaxonomyField(concept.fields);` (`runtime` is the `createContentRoutes` closure var, in scope here as in `editLoad`).
  - If `vocabValues.length === 0 || taxField === null` → keep the current bare path (`concept.validate(frontmatterFromForm(concept.fields, form), body)`), no behavior change.
  - Else: read the entry's prior tags **branch-first** mirroring `editLoad` (`content-routes.ts:1069-1070`): for an edit, probe `pendingBranch(concept.id, id)`; if `backend.branchHead` is non-null read the entry file there, else read on `backend.defaultBranch`; parse with `parseMarkdown`; `priorTags = coerceTags(frontmatter[taxField])`. For a create (`new=1`), `priorTags = []`. If the prior read fails, degrade to `priorTags = []` (do not block the save).
  - `const allowed = resolveAllowed(vocabValues, priorTags);` `const closedFields = closeTaxonomyField(concept.fields, allowed);`
  - `const decoded = frontmatterFromForm(closedFields, form);` (the closed `getAll` path).
  - `const result = concept.validate(decoded, body);` (unchanged — refine/behavior intact).
  - After the existing `!result.ok` handling, add: `const tagError = enforceTaxonomy(coerceTags(decoded[taxField]), allowed); if (tagError) { …the same invalid-field redirect with the message… }`.
  - Commit `decoded` as today.
- [ ] **Step 4: Run; confirm pass; full suite green** (the existing save tests must not regress; the bare path is unchanged for an unadopted site).
- [ ] **Step 5: Full gate.** Commit.

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-save.test.ts
git commit -m "Enforce the vocabulary on save, preserving prior orphan tags"
```

---

## Task 7: Render the closed picker on EDIT and flag orphans

The edit load injects the closed field so the picker renders, and `FieldInput` flags any orphan value as a removable "not in your tag list" chip. No extra backend read: the vocabulary comes from `runtime.vocabulary` and the entry tags from the already-loaded frontmatter.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`editLoad` ~L1038-1174; inject before `fields`/`formValues` at ~L1139-1140; carry an orphan set on `EditData`).
- Modify: `src/lib/components/FieldInput.svelte` (the closed-multiselect branch ~L169-191: flag an option in the orphan set).
- Modify: the `EditData` type and the edit page/details chain that passes `fields` + data to `FieldInput` (thread the orphan set; the prop is **optional** since `FieldInput` recurses through container fields).
- Test: `src/tests/unit/content-routes-*.test.ts` (editLoad resolves the closed field + orphan set from a runtime vocabulary) and a `FieldInput` component test (chromium) for the orphan chip.

**Interfaces:**
- Consumes: `runtime.vocabulary`, the loaded entry tags, `resolveAllowed`/`closeTaxonomyField`/`unlistedTags`.
- Produces: `editLoad` returns `fields` whose taxonomy field is closed (`isClosedMultiselect` true → checkbox picker) and an orphan set; `FieldInput` renders vocabulary options as plain checkboxes and orphan values as checked, removable, flagged checkboxes.

**Steps:**

- [ ] **Step 1: Write the failing tests.** Unit: `editLoad` (build `runtime.vocabulary = [{value:'a',label:'A'}]`, concept with `topics`, entry tags `['a','legacy']`) returns `fields` with `topics` `creatable:false` and `options: ['a','legacy']` and an orphan set `['legacy']`; with `runtime.vocabulary = []` returns the bare open field and no orphans (opt-in fallback). Component: render `FieldInput` for a closed multiselect with `['a','legacy']` and orphan set `['legacy']`; assert `legacy` is a checked checkbox carrying the "not in your tag list" flag/label and `a` is a plain checkbox.
- [ ] **Step 2: Run; confirm failures.**
- [ ] **Step 3: Implement.** In `editLoad`: `const vocabValues = runtime.vocabulary.map((v)=>v.value); const taxField = resolveTaxonomyField(concept.fields);` if non-empty and `taxField`, compute `allowed`/`orphans` from the loaded entry tags, set the returned `fields` to `closeTaxonomyField(concept.fields, allowed)` (feed `formValues` the same), and add the orphan set to `EditData`; else the bare path. In `FieldInput.svelte`, the closed-multiselect branch: when an option is in the (optional) orphan-set prop, render it checked with the non-blocking-notice styling and a "not in your tag list" label, kept removable. Thread the orphan set from `EditData` through the edit page/details chain to `FieldInput` as an optional prop.
- [ ] **Step 4: Run; confirm pass; full suite + component layer green.**
- [ ] **Step 5: Full gate.** Commit.

```bash
git add src/lib/sveltekit/content-routes.ts src/lib/components/FieldInput.svelte src/tests/unit/content-routes-*.test.ts src/tests/**/field-input*.test.ts
git commit -m "Render the enforced picker on edit and flag orphan tags"
```

---

## Task 8: Docs, surface, and the gates

Document the new public surface (the vocabulary functions) and the field behavior; clear every gate. Note the deliberate no-build-change.

**Files:**
- Modify: `docs/reference/core.md` (the `vocabulary` config: `VocabularyEntry`, `validateVocabulary`, `extractVocabulary`, `setVocabulary`; the enforced-multiselect behavior under the field-types section — a taxonomy field becomes a closed vocabulary-sourced picker when the site configures a `vocabulary`, an orphan renders flagged and is preserved).
- Modify: `CHANGELOG.md` `## Unreleased` and `docs/guides/upgrade-cairn.md` (the vocabulary config + enforced field; **opt-in**, a site with no `vocabulary` key is unaffected — note no consumer action required, so no `Consumers must` line, only an entry that says so).
- Verify: `ManifestEntry.tags` rides the existing `ManifestEntry` doc; `tagUsage`/`buildTagUsageIndex` are internal and need no reference page.

**Steps:**

- [ ] **Step 1: Reference docs.** Document each new public export with its real signature and stability tier; document the enforced-multiselect behavior and the orphan chip.
- [ ] **Step 2: CHANGELOG + upgrade guide.** Add the `## Unreleased` entry; state it is opt-in and non-breaking (the taxonomy field stays the open creatable multiselect for a site with no vocabulary). Note that the build read is unchanged (tags-as-data is identical; enforcement is a save/edit concern).
- [ ] **Step 3: Run every gate.**

Run: `npm run package && npm run check:reference && npm run check:reference:signatures && npm run check:docs && node scripts/check-surface.mjs && npm run check:package && npm run check:comments`
Expected: all pass.

- [ ] **Step 4: Commit.**

```bash
git add docs/reference/core.md CHANGELOG.md docs/guides/upgrade-cairn.md docs/internal/api-surface.md
git commit -m "Document the vocabulary config and the enforced taxonomy field"
```

---

## Self-review

- **Spec coverage.** Vocabulary config artifact (Component 1) → Tasks 1–2. `ManifestEntry.tags` + cross-branch `tagUsage` (review fold 2, the corrected delete-usage source) → Tasks 3–4. The async pre-resolve enforcement seam (review fold 1) → Tasks 5–7, implemented at save and edit-render (build is a proven no-op under the union; the spec's three-point framing collapses to two against the code). Orphan preserve-and-flag (review fold 4) → the per-entry union + the chip. The mandatory migration seed (review fold 3) is Plan 3's enable/seed flow; this plan ships the engine it gates and, via the union + the no-build-change, ensures Plan 2 alone can never silently delist a post even before the seed exists. Docs → Task 8.
- **Premise check (charter).** The editor/admin frame and the content engine, cairn's core job. The vocabulary is config, tags stay values, no new actor, no store. The closed picker is the first authoring-time drift prevention cairn ships.
- **Why no fieldset rebuild.** `Fieldset` carries `behavior` but not `refine` (verified: `fieldset.ts:48-57`, `FieldsetOptions.refine` at `:39` is an input, not stored), so rebuilding the validator would silently drop a concept's `refine`. The seam therefore leaves `concept.validate` untouched and enforces through the separate `enforceTaxonomy` gate plus the `closeTaxonomyField` fields transform (render/decode only). This is the central correction from the Plan-2 adversarial review.
- **Why no build change.** The allowed set always includes the entry's own tags, so a build that validated the taxonomy field against it would never reject the entry — a no-op — and `ContentSummary.tags` (the published read) is identical with or without it. Leaving the build untouched avoids a public-signature change to `createContentIndex` (a documented Extension-API export) and removes the migration-seed delist hazard entirely (the union is the safety net; the seed is Plan-3 picker clarity). This is the second correction from the review.
- **Vocabulary source.** Save and edit read `runtime.vocabulary` (the deployed snapshot, the same source `tidy` uses), so there is no per-request config read and no config-read failure mode. The only new read is the save-time branch-first prior-tags read, gated behind "vocabulary non-empty AND concept has a taxonomy field" and degrading to `[]` on failure.
- **Type consistency.** `VocabularyEntry` (Task 1) → `CairnRuntime.vocabulary` (Task 2) → the save/edit seam (Tasks 6–7). `resolveAllowed`/`unlistedTags`/`closeTaxonomyField`/`enforceTaxonomy` (Task 5) are the one helper set both call sites use. `coerceTags` is the shared scalar-coercing normalizer in `manifest.ts`/the branch arm/`taxonomy-enforce` call sites (define it once and import, or duplicate the three-line guard consistently — prefer one shared helper).
- **Forward-safety for Plan 3.** Plan 3 gets `setVocabulary` (add/rename/delete commits), `extractVocabulary`/`runtime.vocabulary` (the screen + the build-time filter options), `buildTagUsageIndex` (the delete-unused cross-branch gate), `ContentSummary.tags` (the size-gated filter, kept by Plan 1), and `allTags()` (the seed). The `vocabularyLoad`/`vocabularySave` admin route pair is deferred to Plan 3 with the screen, coherent because nothing in Plan 2 needs it.
- **Test harness reality.** Save/edit tests are GithubDouble-driven Node unit tests with a hand-built `CairnRuntime`; only `FieldInput` runs in chromium. The save test seeds the entry's prior file in the double for the branch-first read; no site-config seeding is needed because the vocabulary comes from the constructed runtime, not a committed-config read.
