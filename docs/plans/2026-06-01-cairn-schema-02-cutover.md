# cairn Schema Source of Truth (Plan 2): The Contract Cutover and Read Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the adapter contract over to a single `schema` member, infer typed reads from it, validate once at build and serve normalized data, and migrate the showcase atomically, so one `defineFields` declaration is the single source of truth end to end.

**Architecture:** `ConceptConfig` drops `fields` and `validate` for one generic `schema: S` member. `defineAdapter` preserves each concept's concrete schema type through a `const` type parameter. `normalizeConcepts` unpacks the schema onto the unchanged `ConceptDescriptor`, so the admin form, save path, and delivery descriptor path read the descriptor exactly as today. The generated validator omits empty optional values from its normalized data, so committed frontmatter stays minimal and the inferred optional-key type is accurate. `createContentIndex` validates each entry once at build, keeps the cheap summary projection raw-derived, stores the normalized data on the typed `frontmatter` detail field, and records each entry's verdict instead of throwing; a new full-auto `createSiteIndexes` maps over the adapter for typed per-concept reads and aggregates the verdicts into one build-gate report that skips drafts.

**Tech Stack:** TypeScript (5.x `const` type parameters, mapped/conditional types), vitest (`unit` project, node; `expectTypeOf` for type-level assertions), Vite `import.meta.glob` for the showcase content layer.

**Design reference:** `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md` (approved; the omit-empty emission decision is recorded in "The schema primitive" section). Plan 1 (the additive primitive) landed in commits `80d2b84..c5ab533`.

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. This plan is breaking on the adapter contract, but a cairn-cms push deploys no site, so it runs on `main` directly. The two production sites are unaffected until their own migration passes.
- Test-first (TDD): write or change the failing test, run it and watch it fail for the right reason, implement, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs `unit`, `component`, and `integration`; it must exit 0, not merely show green assertions).
- Targeted test command: `npx vitest run --project unit src/tests/unit/<file>.test.ts`.
- `expectTypeOf` assertions are compile-checked by `npm run check` (svelte-check type-checks the test files), so a type-level regression fails the gate. Each type-bearing test file also carries a runtime `expect`, so the vitest run is not empty.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies; plain voice.
- Do NOT run `npm install` from inside the workspace member; it drifts the root lock.
- Known flake: `src/tests/component/MarkdownEditor.test.ts` can fail once on a CodeMirror mount-timeout under parallel load. If `npm test` exits non-zero solely on that, re-run once to confirm green before committing.
- `npm run check` exits non-zero locally on the showcase `svelte.config.js` unless the showcase deps are installed (`cd examples/showcase && npm install`). The svelte-check scan itself is 0/0 either way; CI checks out cairn-cms standalone and stays green. If the showcase config import is the only failure, the scan result (0 errors 0 warnings) is the gate.

## Reference values (verified against the live tree)

- `src/lib/content/types.ts`: `ConceptConfig` is `{ dir: string; label?: string; fields: FrontmatterField[]; validate(fm, body): ValidationResult }`. `CairnAdapter.content` is `{ posts?: ConceptConfig; pages?: ConceptConfig }`. `CairnExtension.content` is `Record<string, ConceptConfig>`. `ConceptDescriptor` carries `id`, `label`, `dir`, `routing`, `permalink`, `datePrefix`, `fields`, `validate`. `ConceptDescriptor` does NOT change in this plan.
- `src/lib/content/schema.ts` (Plan 1): exports `defineFields<const F>(fields, options?): ConceptSchema<F>`, the `ConceptSchema<F>` interface (`fields`, `validate`, `~standard`), `Infer<S>`, `InferFields<F>`, `DefineFieldsOptions<F>`. Its generated `validate` delegates to `validateFields` for the baseline, then applies declarative rules and `refine`.
- `src/lib/content/validate.ts`: `validateFields(fields, frontmatter): ValidationResult` writes every declared field into `data` today (absent text/date to `''`, absent tags to `[]`, absent/unchecked boolean to `false`). This plan changes it to omit those empties. Only `schema.ts` (direct import) and `src/tests/unit/content-validate.test.ts` consume it; it is also re-exported from `src/lib/index.ts:40` (removed in Task 5).
- `src/lib/content/concepts.ts`: `normalizeConcepts(content, urlPolicy?, routing?)` copies `config.fields`/`config.validate` onto each descriptor at lines 54-55.
- `src/lib/content/compose.ts`: `composeRuntime` spreads `adapter.content` into a `Record<string, ConceptConfig | undefined>` and calls `normalizeConcepts`. Signature unchanged by this plan.
- `src/lib/delivery/content-index.ts`: `createContentIndex<F = Record<string, unknown>>(files, descriptor): ContentIndex<F>` parses each file and casts `frontmatter as F` with no validation today (line 93). `ContentSummary` and the summary derivations (`asString`/`asDate`/`asTags`) read raw frontmatter. `ContentIndex<F>` has `all`/`byId`/`byTag`/`allTags`/`adjacent`.
- `src/lib/delivery/site-index.ts`: `createSiteIndex(concepts, opts?)` calls `validateAll` (lines 34-51) unless `opts.validate === false`. `validateAll` walks `index.all({ includeDrafts: true })` (drafts included today) and calls `descriptor.validate` again, discarding `result.data`.
- `src/lib/delivery/site-descriptors.ts`: `siteDescriptors(adapter, siteConfig)` calls `normalizeConcepts(adapter.content, urlPolicyFrom(siteConfig))`. Unchanged by this plan.
- `examples/showcase/src/lib/cairn.config.ts`: `export const cairn: CairnAdapter = {...}` with two concepts declaring `fields` + a hand-rolled `validate`. `examples/showcase/src/lib/content.ts`: builds descriptors via `siteDescriptors`, globs posts and pages, and exports `site = createSiteIndex([...])`.
- `package.json`: `"version": "0.12.0"`.

---

## Task 1: The validator omits empty optional values

**Files:**
- Modify: `src/lib/content/validate.ts`
- Modify: `src/tests/unit/content-validate.test.ts`
- Modify: `src/tests/unit/content-schema.test.ts`

Change the baseline validator so a successful result carries only meaningful values. A required field that is empty already fails validation, so on success every empty value belongs to an optional field; the rule is therefore to omit any coerced value that is the type's empty form (`''`, `false`, or `[]`). This keeps committed frontmatter minimal and makes the inferred optional-key type accurate.

- [ ] **Step 1: Change the failing tests**

In `src/tests/unit/content-validate.test.ts`, replace the test at lines 39-46 (`'coerces an absent boolean to false and absent tags to an empty list'`) with the omit-empty expectation:

```ts
  it('omits an absent optional boolean and absent optional tags from normalized data', () => {
    const result = validateFields(postFields, { title: 'T', date: '2026-01-05', description: 'x' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect('draft' in result.data).toBe(false);
      expect('tags' in result.data).toBe(false);
      expect(result.data).toEqual({ title: 'T', date: '2026-01-05', description: 'x' });
    }
  });
```

Then append a new test that proves a present non-empty optional value is kept and an empty optional string is omitted:

```ts
  it('keeps a present optional value and omits an empty optional string', () => {
    const fields: FrontmatterField[] = [
      { type: 'text', name: 'title', label: 'Title', required: true },
      { type: 'text', name: 'subtitle', label: 'Subtitle' },
      { type: 'boolean', name: 'draft', label: 'Draft' },
    ];
    expect(validateFields(fields, { title: 'T', subtitle: 'Sub', draft: true })).toEqual({
      ok: true,
      data: { title: 'T', subtitle: 'Sub', draft: true },
    });
    expect(validateFields(fields, { title: 'T', subtitle: '   ', draft: false })).toEqual({
      ok: true,
      data: { title: 'T' },
    });
  });
```

In `src/tests/unit/content-schema.test.ts`, the `~standard` success test asserts a `draft: false` that omit-empty now drops. Change the assertion at the `'maps a success to a value result'` test so the expected value omits `draft`:

```ts
    if (!('issues' in r)) expect(r.value).toEqual({ title: 'Hi', tags: ['gear'] });
```

(The input there is `{ frontmatter: { title: 'Hi', tags: ['gear'] }, body: '' }`, with no `draft`, so under omit-empty the normalized value carries only `title` and `tags`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/content-validate.test.ts src/tests/unit/content-schema.test.ts`
Expected: FAIL. Today `validateFields` writes `draft: false` and `tags: []`, so the new `'draft' in result.data` / `toEqual` assertions fail, and the `~standard` success value still carries `draft: false`.

- [ ] **Step 3: Implement omit-empty in the validator**

In `src/lib/content/validate.ts`, change the loop body so each case assigns to `data` only when the coerced value is non-empty. Replace the `switch` block (lines 26-48) with:

```ts
    switch (field.type) {
      case 'boolean':
        // Absent or unchecked means false; omit it so a published file carries no draft: false noise.
        if (value === true) data[field.name] = true;
        break;
      case 'tags':
      case 'freetags': {
        const list = Array.isArray(value) ? value.map(String) : [];
        if (field.required && list.length === 0) errors[field.name] = `${field.label} is required`;
        if (list.length > 0) data[field.name] = list;
        break;
      }
      case 'date': {
        const text = value instanceof Date ? dateInputValue(value) : typeof value === 'string' ? value.trim() : '';
        if (field.required && text === '') errors[field.name] = `${field.label} is required`;
        if (text !== '') data[field.name] = text;
        break;
      }
      default: {
        const text = typeof value === 'string' ? value.trim() : '';
        if (field.required && text === '') errors[field.name] = `${field.label} is required`;
        if (text !== '') data[field.name] = text;
      }
    }
```

Update the function's doc comment (lines 8-16) so it states the omit-empty behavior. Replace the sentence "Booleans coerce to `true`/`false` and tag fields to string arrays." with:

```
 * A present boolean coerces to `true` and an unchecked one is omitted; a present tag field
 * coerces to a string array and an empty one is omitted; an empty optional text or date field is
 * omitted, so the normalized data carries only meaningful values and committed frontmatter stays
 * minimal.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/content-validate.test.ts src/tests/unit/content-schema.test.ts`
Expected: PASS. The first-test assertion `validateFields(pageFields, { title: 'About' })` toEqual `{ title: 'About' }` still holds (Pages declare only a required title). The full-post test (all fields present and non-empty) still keeps every key.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/validate.ts src/tests/unit/content-validate.test.ts src/tests/unit/content-schema.test.ts
git commit -m "feat(content): omit empty optional values from normalized data

A successful validation now carries only meaningful values: an unchecked
boolean, an empty tag list, and an empty optional text or date field are
omitted. Required fields that are empty already fail, so on success every empty
value belongs to an optional field. Committed frontmatter stays minimal and the
inferred optional-key type reads back accurately.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Validate once at build, serve normalized reads, skip drafts at the gate

**Files:**
- Modify: `src/lib/delivery/content-index.ts`
- Modify: `src/lib/delivery/site-index.ts`
- Modify: `src/lib/delivery/index.ts`
- Modify: `src/tests/unit/delivery-content-index.test.ts`
- Modify: `src/tests/unit/delivery-site-index-validation.test.ts`

`createContentIndex` runs the concept's `validate` once per entry at build. The cheap summary projection (title, date, tags, excerpt, draft) stays derived from the raw parsed frontmatter, so it is robust and unchanged. The typed `frontmatter` detail field stores `result.data` on success and the raw frontmatter on failure. Each failure is recorded as a verdict the index exposes via `problems()`, rather than thrown. `createSiteIndex` reads those verdicts, skips drafts, and throws one combined report, so validation runs once instead of twice and a half-finished draft no longer fails the build.

- [ ] **Step 1: Change and add the failing tests**

In `src/tests/unit/delivery-site-index-validation.test.ts`, replace the test at lines 31-36 (`'validates drafts too'`) with the skip-drafts behavior:

```ts
  it('skips drafts at the build gate', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-03-10-draft.md': '---\ndraft: true\n---\nBody.',
    });
    expect(() => createSiteIndex([ci])).not.toThrow();
  });
```

Append a test proving a non-draft still fails the gate even when a draft alongside it is invalid:

```ts
  it('still fails the gate for an invalid non-draft beside an invalid draft', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-03-10-draft.md': '---\ndraft: true\n---\nBody.',
      '/src/content/posts/2026-04-01-live.md': '---\ndescription: no title\n---\nBody.',
    });
    expect(() => createSiteIndex([ci])).toThrowError(/2026-04-01-live/);
    expect(() => createSiteIndex([ci])).not.toThrowError(/2026-03-10-draft/);
  });
```

In `src/tests/unit/delivery-content-index.test.ts`, append a describe block proving the normalized read and the recorded verdict. It uses a validate that trims the title and requires it:

```ts
describe('createContentIndex validate-once reads', () => {
  const [trimmed] = normalizeConcepts({
    posts: {
      dir: 'd',
      fields: [],
      validate: (fm) => {
        const title = typeof fm.title === 'string' ? fm.title.trim() : '';
        return title ? { ok: true, data: { ...fm, title } } : { ok: false, errors: { title: 'Title is required' } };
      },
    },
  });

  it('stores the normalized data on the detail frontmatter', () => {
    const index = createContentIndex(
      fromGlob({ '/d/2026-01-01-a.md': '---\ntitle: "  Padded  "\n---\nBody.' }),
      trimmed,
    );
    expect(index.byId('2026-01-01-a')?.frontmatter.title).toBe('Padded');
  });

  it('records a verdict instead of throwing on an invalid entry', () => {
    const index = createContentIndex(
      fromGlob({ '/d/2026-01-02-b.md': '---\ndescription: no title\n---\nBody.' }),
      trimmed,
    );
    expect(index.problems()).toEqual([
      { id: '2026-01-02-b', draft: false, errors: { title: 'Title is required' } },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/delivery-content-index.test.ts src/tests/unit/delivery-site-index-validation.test.ts`
Expected: FAIL. `index.problems` does not exist, the normalized-read test sees the raw `"  Padded  "` (validate is not run today), and the draft currently throws at the gate.

- [ ] **Step 3: Add the verdict type and run validate-once in `createContentIndex`**

In `src/lib/delivery/content-index.ts`, add the verdict type after `ContentEntry` (after line 37):

```ts
/** One entry's validation failure, recorded at build for the site aggregator's gate. */
export interface ContentProblem {
  id: string;
  draft: boolean;
  errors: Record<string, string>;
}
```

Add `problems()` to the `ContentIndex` interface (after `adjacent` at line 45):

```ts
  /** Per-entry validation failures recorded at build, for the site-level build gate. */
  problems(): ContentProblem[];
```

Replace the `entries` construction and the `return` object (lines 77-134) so it validates once, keeps summaries raw-derived, stores normalized data on `frontmatter`, and collects verdicts:

```ts
  const problems: ContentProblem[] = [];
  const entries: ContentEntry<F>[] = files.map((file) => {
    const id = idFromFilename(basename(file.path));
    const slug = slugFromId(id, descriptor.routing.dated ? descriptor.datePrefix : null);
    const { frontmatter: raw, body } = parseMarkdown(file.raw);
    const date = asDate(raw.date);
    const draft = raw.draft === true;
    // Validate once at build. The cheap summary stays raw-derived and robust; the typed detail
    // frontmatter carries the normalized data on success, the raw frontmatter on failure. A
    // failure is recorded, not thrown, so the query surface does not explode on construction.
    const result = descriptor.validate(raw, body);
    if (!result.ok) problems.push({ id, draft, errors: result.errors });
    return {
      id,
      slug,
      permalink: permalink(descriptor, { id, slug, date }),
      title: asString(raw.title) ?? id,
      date,
      updated: asDate(raw.updated),
      tags: asTags(raw.tags),
      excerpt: deriveExcerpt(body, { description: asString(raw.description) }),
      wordCount: wordCount(body),
      draft,
      frontmatter: (result.ok ? result.data : raw) as F,
      body,
    };
  });

  // Dated concepts sort newest-first; undated concepts (Pages) sort by title.
  const sorted = [...entries].sort((a, b) =>
    descriptor.routing.dated ? (b.date ?? '').localeCompare(a.date ?? '') : a.title.localeCompare(b.title),
  );

  const summarize = (entry: ContentEntry<F>): ContentSummary => {
    const { frontmatter: _frontmatter, body: _body, ...summary } = entry;
    return summary;
  };
  const visible = (list: ContentEntry<F>[], includeDrafts?: boolean): ContentEntry<F>[] =>
    includeDrafts ? list : list.filter((entry) => !entry.draft);

  return {
    all: (opts = {}) => visible(sorted, opts.includeDrafts).map(summarize),
    byId: (id) => entries.find((entry) => entry.id === id),
    byTag: (tag, opts = {}) =>
      visible(sorted, opts.includeDrafts)
        .filter((entry) => entry.tags.includes(tag))
        .map(summarize),
    allTags: () => {
      const counts = new Map<string, number>();
      for (const entry of sorted) {
        if (entry.draft) continue;
        for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
      return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => a.tag.localeCompare(b.tag));
    },
    adjacent: (id) => {
      const list = visible(sorted, false);
      const i = list.findIndex((entry) => entry.id === id);
      if (i < 0) return {};
      return {
        newer: i > 0 ? summarize(list[i - 1]) : undefined,
        older: i < list.length - 1 ? summarize(list[i + 1]) : undefined,
      };
    },
    problems: () => problems,
  };
```

- [ ] **Step 4: Read the verdicts in `createSiteIndex` and skip drafts**

In `src/lib/delivery/site-index.ts`, replace `validateAll` (lines 33-51) with a verdict reader that skips drafts:

```ts
/** Collect non-draft validation failures across concepts from each index's recorded verdicts. */
function siteProblems(concepts: ConceptIndex[]): string[] {
  const problems: string[] = [];
  for (const { descriptor, index } of concepts) {
    for (const problem of index.problems()) {
      if (problem.draft) continue; // a half-finished draft never ships, so it does not fail the build
      for (const [field, message] of Object.entries(problem.errors)) {
        problems.push(`${descriptor.dir}/${problem.id}: ${field}: ${message}`);
      }
    }
  }
  return problems;
}
```

Replace the body of `createSiteIndex` up to the `byPath` map (lines 58-59) so it throws from the collected verdicts:

```ts
export function createSiteIndex(concepts: ConceptIndex[], opts: { validate?: boolean } = {}): SiteIndex {
  if (opts.validate !== false) {
    const problems = siteProblems(concepts);
    if (problems.length > 0) {
      throw new Error(`site index: ${problems.length} invalid frontmatter field(s):\n  ${problems.join('\n  ')}`);
    }
  }
```

Update the `createSiteIndex` doc comment (lines 53-57) so the validation sentence reads "unless `validate` is `false`, on any non-draft entry whose frontmatter fails its concept's validator". Leave the rest of the function (the `byPath`/`byId` build and the returned object) unchanged.

- [ ] **Step 5: Export the verdict type**

In `src/lib/delivery/index.ts`, add `ContentProblem` to the content-index type export at line 7:

```ts
export type { RawFile, ContentSummary, ContentEntry, ContentIndex, ContentProblem } from './content-index.js';
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/delivery-content-index.test.ts src/tests/unit/delivery-site-index-validation.test.ts`
Expected: PASS. The existing summary tests in `delivery-content-index.test.ts` stay green because summaries derive from raw frontmatter, and `delivery-generic-frontmatter.test.ts` stays green because its validate is a passthrough (`data: fm`).

- [ ] **Step 7: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0). Watch for any other test that reads `.frontmatter` off an index built with a throwaway `validate` that discards data; the only ones in the tree are `delivery-generic-frontmatter.test.ts` (passthrough, safe) and `public-routes.ts` (falls back to the excerpt). If `npm test` surfaces another, change that fixture's validate to a passthrough `(fm) => ({ ok: true, data: fm })`. Then:

```bash
git add src/lib/delivery/content-index.ts src/lib/delivery/site-index.ts src/lib/delivery/index.ts src/tests/unit/delivery-content-index.test.ts src/tests/unit/delivery-site-index-validation.test.ts
git commit -m "feat(delivery): validate once at build and serve normalized reads

createContentIndex now runs the concept validator once per entry. The cheap
summary projection stays raw-derived and robust; the typed frontmatter detail
field carries the normalized data on success and the raw frontmatter on
failure. Each failure is recorded as a verdict the index exposes, rather than
thrown. createSiteIndex reads those verdicts, skips drafts, and throws one
combined report, so validation runs once and a half-finished draft no longer
fails the build.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Cut the contract over to a single `schema` member

**Files:**
- Modify: `src/lib/content/types.ts`
- Modify: `src/lib/content/concepts.ts`
- Create: `src/lib/content/adapter.ts`
- Modify: `src/lib/index.ts`
- Modify: `src/tests/unit/_content-fixture.ts`
- Modify: `src/tests/unit/content-concepts.test.ts`
- Modify: `src/tests/unit/delivery-content-index.test.ts`
- Modify: `src/tests/unit/delivery-site-index-validation.test.ts`
- Modify: `src/tests/unit/delivery-generic-frontmatter.test.ts`
- Modify: `examples/showcase/src/lib/cairn.config.ts`
- Create: `src/tests/unit/content-adapter.test.ts`

This is the breaking, high-blast-radius change, kept atomic so the tree never sits in an uncompilable state. `ConceptConfig` becomes `{ dir, label?, schema }` and generic over the schema. `defineAdapter` preserves each concept's concrete schema type. `normalizeConcepts` unpacks the schema onto the unchanged descriptor, so the admin form, the save path, and `siteDescriptors` need no change. Every `ConceptConfig` literal in the tree (the showcase and the test fixtures) migrates to `schema: defineFields([...])` in the same task.

**Type-system note (verify against the toolchain):** `defineAdapter<const A extends CairnAdapter>(a: A): A` relies on a concept's concrete `ConceptSchema<F>` being assignable to the constraint's `ConceptSchema` default. If `npm run check` rejects the migrated showcase adapter at the `extends CairnAdapter` constraint, relax the constraint type only (not the captured type): change `CairnAdapter.content` member types to `ConceptConfig<ConceptSchema<readonly FrontmatterField[]>>` explicitly, or as a last resort `ConceptConfig<any>`. The captured `A` keeps the narrow literal schema either way, so typed reads in Task 4 still infer the concrete type. Confirm with the Task 4 `expectTypeOf` assertions, which are the real proof inference survived.

- [ ] **Step 1: Write the failing `defineAdapter` test**

Create `src/tests/unit/content-adapter.test.ts`:

```ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import { defineAdapter } from '../../lib/content/adapter.js';
import { defineFields, type Infer } from '../../lib/content/schema.js';
import type { CairnAdapter } from '../../lib/content/types.js';

const adapter = defineAdapter({
  siteName: 'Test',
  content: {
    posts: {
      dir: 'src/content/posts',
      schema: defineFields([
        { name: 'title', type: 'text', label: 'Title', required: true },
        { name: 'date', type: 'date', label: 'Date' },
      ]),
    },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'noreply@test.example' },
  render: (md) => md,
});

describe('defineAdapter', () => {
  it('returns the adapter unchanged at runtime', () => {
    expect(adapter.content.posts?.dir).toBe('src/content/posts');
    expect(adapter.content.posts?.schema.fields.map((f) => f.name)).toEqual(['title', 'date']);
  });

  it('is assignable to CairnAdapter', () => {
    expectTypeOf(adapter).toMatchTypeOf<CairnAdapter>();
  });

  it('preserves the concrete schema type for inference', () => {
    expectTypeOf<Infer<typeof adapter.content.posts.schema>>().toEqualTypeOf<{
      title: string;
      date?: string;
    }>();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-adapter.test.ts`
Expected: FAIL. `../../lib/content/adapter.js` does not exist, and `ConceptConfig` has no `schema` member yet, so the literal does not type-check.

- [ ] **Step 3: Make `ConceptConfig` generic over a `schema` member**

In `src/lib/content/types.ts`, add the type-only import of `ConceptSchema` near the top (after the existing imports, around line 12):

```ts
import type { ConceptSchema } from './schema.js';
```

(This is a type-only cycle: `schema.ts` imports `FrontmatterField`/`ValidationResult` from `types.ts`, and `types.ts` imports `ConceptSchema` from `schema.ts`. Type-only imports erase, so there is no runtime cycle.)

Replace the `ConceptConfig` interface (lines 80-89) with the generic single-member form:

```ts
/**
 * Per-site configuration for one content concept (spec §8). One `schema`, built with
 * `defineFields`, is the single source of truth for the editor form, the validator, and the
 * inferred frontmatter type. Generic over the schema so a concept's concrete type survives for
 * typed reads. Concept-fixed behavior such as routability is not here; it lives in the engine's
 * routing table (`CONCEPT_ROUTING`).
 */
export interface ConceptConfig<S extends ConceptSchema = ConceptSchema> {
  /** Repo-relative content directory, e.g. "src/content/posts". */
  dir: string;
  /** Sidebar label; defaults from the concept id when omitted. */
  label?: string;
  /** The concept's schema: the form projection, the generated validator, and the inferred type. */
  schema: S;
}
```

- [ ] **Step 4: Unpack the schema in `normalizeConcepts`**

In `src/lib/content/concepts.ts`, change the descriptor copy (lines 54-55) to read from the schema:

```ts
      fields: config.schema.fields,
      validate: config.schema.validate,
```

Update the module's top comment (lines 1-5) so "(id, label, directory, concept-fixed routing, fields, validator)" still reads true; it does, since the descriptor keeps `fields` and `validate`. No other change in this file.

- [ ] **Step 5: Add `defineAdapter`**

Create `src/lib/content/adapter.ts`:

```ts
// cairn-cms: the adapter-authoring helper. A plain `const adapter: CairnAdapter = {...}` annotation
// widens each concept's schema type away and breaks typed reads. defineAdapter captures the adapter
// through a `const` type parameter, so each concept's concrete ConceptSchema<F> survives for the
// full-auto typed reads in createSiteIndexes, while still checking the adapter against the contract.
import type { CairnAdapter } from './types.js';

/** Declare a site's adapter while preserving each concept's concrete schema type for typed reads. */
export function defineAdapter<const A extends CairnAdapter>(adapter: A): A {
  return adapter;
}
```

In `src/lib/index.ts`, add the export beside `defineFields` (after line 42):

```ts
export { defineAdapter } from './content/adapter.js';
```

- [ ] **Step 6: Migrate the test fixtures and the showcase to the schema shape**

Every `ConceptConfig` literal now needs `schema: defineFields([...])` instead of `fields` + `validate`. The conversion pattern is mechanical:

```ts
// before
{ dir: 'd', fields: [ ...field objects... ], validate: someFn }
// after
{ dir: 'd', schema: defineFields([ ...the same field objects... ]) }
```

A literal whose old `validate` required a field maps to `defineFields` with `required: true` on that field; a passthrough `validate` maps to `defineFields` with no required fields. Apply it in each file, adding the `defineFields` import where missing.

`src/tests/unit/_content-fixture.ts`: import `defineFields` from `'../../lib/content/schema.js'`, and rewrite `testAdapter.content` to:

```ts
    posts: {
      // posts omits `label` to exercise the default; pages overrides it.
      dir: 'src/content/posts',
      schema: defineFields(postFields),
    },
    pages: {
      label: 'Site Pages',
      dir: 'src/content/pages',
      schema: defineFields(pageFields),
    },
```

`src/tests/unit/content-concepts.test.ts`: import `defineFields`. Rewrite the Fragments literal (lines 40-44) to:

```ts
    const fragments: ConceptConfig = {
      dir: 'src/content/fragments',
      schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]),
    };
```

Rewrite the shared `cfg` (line 58) to:

```ts
const cfg = { dir: 'd', schema: defineFields([]) };
```

`src/tests/unit/delivery-content-index.test.ts`: import `defineFields`. Rewrite both inline `posts` configs (lines 6-8 and 51-54) so each uses `schema: defineFields([...])`. The first needs the fields the summary derivations and tests read, declared so the schema is a faithful concept:

```ts
const [posts] = normalizeConcepts({
  posts: {
    dir: 'd',
    schema: defineFields([
      { type: 'text', name: 'title', label: 'Title' },
      { type: 'date', name: 'date', label: 'Date' },
      { type: 'tags', name: 'tags', label: 'Tags', options: ['a'] },
      { type: 'boolean', name: 'draft', label: 'Draft' },
    ]),
  },
});
```

The slug-test config (lines 51-54) becomes `{ dir: 'd', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }, { type: 'date', name: 'date', label: 'Date' }]) }`. The `validate-once reads` block added in Task 2 used an inline `validate`; rewrite its concept to a schema that requires title, which yields the same trim-and-require behavior:

```ts
  const [trimmed] = normalizeConcepts({
    posts: { dir: 'd', schema: defineFields([{ type: 'text', name: 'title', label: 'Title', required: true }]) },
  });
```

The `'stores the normalized data on the detail frontmatter'` assertion still holds: `defineFields` trims the title via its baseline coercion, so `frontmatter.title` is `'Padded'`. The `'records a verdict'` assertion still holds: a missing required title yields `{ title: 'Title is required' }`.

`src/tests/unit/delivery-site-index-validation.test.ts`: import `defineFields`. Rewrite the `descriptor` config (lines 6-15) to:

```ts
const descriptor = normalizeConcepts({
  posts: {
    dir: 'src/content/posts',
    schema: defineFields([{ type: 'text', name: 'title', label: 'Title', required: true }]),
  },
})[0];
```

The error-message assertions match `/title: Title is required/`, which is the `defineFields` required message, so they still hold.

`src/tests/unit/delivery-generic-frontmatter.test.ts`: import `defineFields`. Rewrite the `descriptor` config (lines 10-16) to a schema that declares the read fields, so the typed read carries them:

```ts
const descriptor = normalizeConcepts({
  posts: {
    dir: 'src/content/posts',
    schema: defineFields([
      { type: 'text', name: 'title', label: 'Title' },
      { type: 'textarea', name: 'description', label: 'Description' },
    ]),
  },
})[0];
```

The two tests read `entry.frontmatter.description` of a post with `description: Hi there`. Under validate-once the normalized data keeps the present `description`, so both assertions still hold.

`examples/showcase/src/lib/cairn.config.ts`: import `defineFields` and `defineAdapter` from `'@glw907/cairn-cms'` (add them to the existing import from that module). Wrap the adapter in `defineAdapter` and convert both concepts. Replace `export const cairn: CairnAdapter = {` with `export const cairn = defineAdapter({`, drop the now-unused `CairnAdapter` from the type import if nothing else uses it, convert the two concepts, and close with `});`:

```ts
export const cairn = defineAdapter({
  siteName: 'Cairn Showcase',
  content: {
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      schema: defineFields([
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
      ]),
    },
    pages: {
      dir: 'src/content/pages',
      label: 'Pages',
      schema: defineFields([{ type: 'text', name: 'title', label: 'Title', required: true }]),
    },
  },
  backend: { owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'cms@showcase.test' },
  render: (md) => renderMarkdown(md),
  navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
  registry,
  icons,
});
```

(The showcase's old hand-rolled `validate` only required and trimmed the title, which `defineFields` with `required: true` reproduces.)

- [ ] **Step 7: Run the targeted tests and the full type gate**

Run: `npx vitest run --project unit src/tests/unit/content-adapter.test.ts src/tests/unit/content-concepts.test.ts src/tests/unit/content-compose.test.ts`
Expected: PASS. Then run `npm run check` and confirm 0 errors / 0 warnings. The check enumerates any `ConceptConfig` literal still on the old shape; convert each with the pattern above. If the `extends CairnAdapter` constraint rejects the showcase adapter, apply the constraint relaxation from the type-system note and re-run.

- [ ] **Step 8: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/types.ts src/lib/content/concepts.ts src/lib/content/adapter.ts src/lib/index.ts src/tests/unit/_content-fixture.ts src/tests/unit/content-concepts.test.ts src/tests/unit/content-adapter.test.ts src/tests/unit/delivery-content-index.test.ts src/tests/unit/delivery-site-index-validation.test.ts src/tests/unit/delivery-generic-frontmatter.test.ts examples/showcase/src/lib/cairn.config.ts
git commit -m "feat(content): cut the adapter contract over to a single schema member

ConceptConfig drops fields and validate for one generic schema member, built
with defineFields. defineAdapter preserves each concept's concrete schema type
through a const type parameter. normalizeConcepts unpacks the schema onto the
unchanged descriptor, so the admin form, the save path, and siteDescriptors
need no change. The showcase and the test fixtures migrate to the schema shape
in the same commit, since the breaking change leaves no compilable middle
state.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Full-auto typed reads with `createSiteIndexes`

**Files:**
- Create: `src/lib/delivery/site-indexes.ts`
- Modify: `src/lib/delivery/index.ts`
- Modify: `src/lib/index.ts`
- Modify: `examples/showcase/src/lib/content.ts`
- Create: `src/tests/unit/delivery-site-indexes.test.ts`

`createSiteIndexes` maps over a `defineAdapter`-typed adapter to give one typed per-concept index per concept, with `frontmatter` typed as `Infer` of that concept's schema, plus a `site` resolver for the catch-all route. It is built on `createContentIndex` and `createSiteIndex` (both kept), and is the typed convenience over those primitives rather than a replacement. The showcase migrates its content layer to it.

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/delivery-site-indexes.test.ts`:

```ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import { createSiteIndexes } from '../../lib/delivery/site-indexes.js';
import { defineAdapter } from '../../lib/content/adapter.js';
import { defineFields } from '../../lib/content/schema.js';
import { parseSiteConfig } from '../../lib/nav/site-config.js';

const adapter = defineAdapter({
  siteName: 'Test',
  content: {
    posts: {
      dir: 'src/content/posts',
      schema: defineFields([
        { name: 'title', type: 'text', label: 'Title', required: true },
        { name: 'date', type: 'date', label: 'Date' },
      ]),
    },
    pages: {
      dir: 'src/content/pages',
      schema: defineFields([{ name: 'title', type: 'text', label: 'Title', required: true }]),
    },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'noreply@test.example' },
  render: (md) => md,
});

const config = parseSiteConfig('siteName: Test\nmenus:\n  primary: []\n');

const indexes = createSiteIndexes(adapter, config, {
  posts: { '/src/content/posts/2026-01-05-hello.md': '---\ntitle: Hello\ndate: 2026-01-05\n---\nBody.' },
  pages: { '/src/content/pages/about.md': '---\ntitle: About\n---\nThe about page.' },
});

describe('createSiteIndexes', () => {
  it('builds one typed index per concept', () => {
    expect(indexes.posts.byId('2026-01-05-hello')?.frontmatter.title).toBe('Hello');
    expect(indexes.pages.all().map((p) => p.id)).toEqual(['about']);
  });

  it('exposes a site resolver for the catch-all route', () => {
    expect(indexes.site.byPermalink('/posts/hello')?.id).toBe('2026-01-05-hello');
    expect(indexes.site.entries().map((e) => e.path).sort()).toEqual(['about', 'posts/hello']);
  });

  it('types each concept frontmatter from its schema', () => {
    const entry = indexes.posts.byId('2026-01-05-hello');
    if (entry) expectTypeOf(entry.frontmatter).toEqualTypeOf<{ title: string; date?: string }>();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-site-indexes.test.ts`
Expected: FAIL. `../../lib/delivery/site-indexes.js` does not exist.

- [ ] **Step 3: Implement `createSiteIndexes`**

Create `src/lib/delivery/site-indexes.ts`:

```ts
// cairn-cms: the full-auto typed site index (schema-source-of-truth design). It maps over a
// defineAdapter-typed adapter to give one typed per-concept index, with frontmatter typed as the
// concept's inferred schema type, plus a site resolver for the catch-all route. It is the typed
// convenience over createContentIndex and createSiteIndex, not a replacement: both stay the
// lower-level escape hatch. It imports only pure content and delivery code, so the delivery
// bundle stays backend-free.
import type { CairnAdapter } from '../content/types.js';
import type { Infer } from '../content/schema.js';
import type { SiteConfig } from '../nav/site-config.js';
import { siteDescriptors } from './site-descriptors.js';
import { createContentIndex, fromGlob } from './content-index.js';
import { createSiteIndex } from './site-index.js';
import type { ContentIndex, ConceptIndex } from './content-index.js';
import type { SiteIndex } from './site-index.js';

/** A per-concept raw glob record (`{ path: raw }`) keyed by concept id, from `import.meta.glob`. */
export type SiteGlobs<A extends CairnAdapter> = {
  [K in keyof A['content']]?: Record<string, string>;
};

/** The typed per-concept indexes plus the cross-concept `site` resolver. A concept literally named
 *  `site` is not supported, since `site` is the reserved resolver key. */
export type SiteIndexes<A extends CairnAdapter> = {
  [K in keyof A['content']]: ContentIndex<Infer<NonNullable<A['content'][K]>['schema']>>;
} & { readonly site: SiteIndex };

/**
 * Build typed per-concept indexes and a site resolver from one adapter. Pass the per-concept raw
 * globs as `{ posts: import.meta.glob('...?raw', { eager: true }), ... }`; Vite needs the literal
 * glob at the call site, so the engine cannot glob on the site's behalf. `validate: false` opts out
 * of the build gate, exactly as on `createSiteIndex`.
 */
export function createSiteIndexes<const A extends CairnAdapter>(
  adapter: A,
  config: SiteConfig,
  globs: SiteGlobs<A>,
  opts: { validate?: boolean } = {},
): SiteIndexes<A> {
  const descriptors = siteDescriptors(adapter, config);
  const byConcept: Record<string, ContentIndex> = {};
  const conceptIndexes: ConceptIndex[] = [];
  for (const descriptor of descriptors) {
    const record = (globs as Record<string, Record<string, string> | undefined>)[descriptor.id] ?? {};
    const index = createContentIndex(fromGlob(record), descriptor);
    byConcept[descriptor.id] = index;
    conceptIndexes.push({ descriptor, index });
  }
  const site = createSiteIndex(conceptIndexes, opts);
  return { ...byConcept, site } as SiteIndexes<A>;
}
```

- [ ] **Step 4: Export `createSiteIndexes`**

In `src/lib/delivery/index.ts`, add after the `createSiteIndex` export (line 9):

```ts
export { createSiteIndexes } from './site-indexes.js';
export type { SiteIndexes, SiteGlobs } from './site-indexes.js';
```

In `src/lib/index.ts`, add after the `createSiteIndex` export (line 124):

```ts
export { createSiteIndexes } from './delivery/site-indexes.js';
export type { SiteIndexes, SiteGlobs } from './delivery/site-indexes.js';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-site-indexes.test.ts`
Expected: PASS. The `expectTypeOf<{ title: string; date?: string }>` assertion is compile-checked by `npm run check`; if it fails, the inference did not survive `defineAdapter`, which means the Task 3 constraint relaxation needs revisiting (the captured `A` must keep the narrow schema literal).

- [ ] **Step 6: Migrate the showcase content layer**

Rewrite `examples/showcase/src/lib/content.ts` to use the full-auto helper. Replace the whole file body (keeping the `ORIGIN`/`SITE_DESCRIPTION` exports) with:

```ts
// The showcase's one delivery content layer: it globs the markdown and hands the adapter to the
// full-auto createSiteIndexes, which builds the typed per-concept indexes and the site resolver.
import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { parseSiteConfig } from '@glw907/cairn-cms';
import { cairn } from './cairn.config.js';
import siteYaml from './site.config.yaml?raw';

const postsRaw = import.meta.glob('/src/content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const pagesRaw = import.meta.glob('/src/content/pages/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexes = createSiteIndexes(cairn, parseSiteConfig(siteYaml), { posts: postsRaw, pages: pagesRaw });

export const site = indexes.site;
export const posts = indexes.posts;
export const pages = indexes.pages;

export const ORIGIN = 'https://showcase.test';
export const SITE_DESCRIPTION = 'The cairn showcase site.';
```

(The public routes import `site`, which keeps the same `SiteIndex` shape, so they need no change. The new `posts`/`pages` typed exports are available for the SEO consumer in Plan 3.)

- [ ] **Step 7: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0). Build the showcase to prove the end-to-end path: `cd examples/showcase && npm install && npm run build` and confirm it prerenders without error, then return to the repo root. Then:

```bash
git add src/lib/delivery/site-indexes.ts src/lib/delivery/index.ts src/lib/index.ts examples/showcase/src/lib/content.ts src/tests/unit/delivery-site-indexes.test.ts
git commit -m "feat(delivery): full-auto typed reads with createSiteIndexes

createSiteIndexes maps over a defineAdapter-typed adapter for one typed index
per concept, with frontmatter typed as the concept's inferred schema, plus a
site resolver for the catch-all route. It is the typed convenience over
createContentIndex and createSiteIndex, both kept as the escape hatch. The
showcase content layer migrates to it.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Make `validateFields` internal and bump the version

**Files:**
- Modify: `src/lib/index.ts`
- Modify: `package.json`

`validateFields` is now the internal engine of the generated validator, so it stops being a function a site calls. The breaking contract change bumps the version to `0.13.0`, rolling together with the still-unpublished `0.12.0`.

- [ ] **Step 1: Confirm no public dependence on the export**

Run: `grep -rn "validateFields" src/ examples/ --include=*.ts --include=*.svelte | grep -v "src/lib/content/validate.ts"`
Expected: matches only in `src/lib/content/schema.ts` (direct import from `./validate.js`), `src/lib/index.ts:40` (the export to remove), `src/tests/unit/content-validate.test.ts` (direct import from `../../lib/content/validate.js`), and a doc-comment mention in `src/lib/content/types.ts`. No consumer imports it from the package entry, so removing the entry export is safe.

- [ ] **Step 2: Remove the export**

In `src/lib/index.ts`, delete line 40:

```ts
export { validateFields } from './content/validate.js';
```

`validateFields` stays exported from its own module for `schema.ts`'s direct import and the unit test; only the package-entry re-export goes.

- [ ] **Step 3: Bump the version**

In `package.json`, change `"version": "0.12.0"` to `"version": "0.13.0"`.

- [ ] **Step 4: Validate the package shape**

Run: `npm run check:package`
Expected: green. No export condition changes; `defineAdapter` and `createSiteIndexes` ride the existing main and delivery entries. The removed `validateFields` export does not add or change a condition.

- [ ] **Step 5: Full gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/index.ts package.json
git commit -m "feat(content)!: make validateFields internal, bump to 0.13.0

validateFields is now the internal engine of the generated validator, so it is
no longer re-exported from the package entry. The breaking adapter-contract
cutover bumps the version to 0.13.0, rolling together with the unpublished
0.12.0. Publishing stays a separate release step.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage.** This plan implements the spec's "The adapter contract changes", "Full-auto typed reads", and "The read path" sections in full: `ConceptConfig` to a generic `{ schema }` (Task 3), `defineAdapter` (Task 3), the `normalizeConcepts` unpack (Task 3), `createSiteIndexes` over the adapter (Task 4), validate-once normalized reads with the recorded verdict (Task 2), skip-drafts at the build gate (Task 2), and the omit-empty emission the spec records under "The schema primitive" (Task 1). `validateFields` becomes internal (Task 5). The SEO head consumer is Plan 3, per the brainstorm decision. The feed and excerpt robustness guards are the separate follow-up pass, out of scope.
- **Atomicity.** Task 3 is the one breaking, high-blast-radius change, kept in a single commit so the tree never sits uncompilable. The showcase and every test fixture migrate in that commit. Tasks 1, 2, 4, and 5 are each independently green: Task 1 changes only the validator emission and its tests; Task 2 changes only the read path and its tests, both before the contract flip, using the descriptor's `validate` that exists either way; Task 4 is additive over the flipped contract; Task 5 is a small breaking cleanup plus the version bump.
- **The summary stays raw-derived.** A deliberate design choice the exploration forced: `createContentIndex` keeps deriving the cheap `ContentSummary` (title, date, tags, excerpt, draft) from the raw parsed frontmatter, and stores the normalized `result.data` only on the typed `frontmatter` detail field. This keeps the draft mechanism robust (a draft is a draft whether or not the schema declares a `draft` field) and avoids breaking the summary tests that use throwaway validators. The validate-once normalized read is on `.frontmatter`, which is what typed reads and the Plan 3 SEO consumer consume.
- **Type consistency.** `ConceptConfig<S extends ConceptSchema = ConceptSchema>` carries `dir`, `label?`, `schema: S`. `defineAdapter<const A extends CairnAdapter>(a: A): A`. `createSiteIndexes<const A extends CairnAdapter>(adapter, config, globs, opts?)` returns `SiteIndexes<A>`, which maps `keyof A['content']` to `ContentIndex<Infer<NonNullable<A['content'][K]>['schema']>>` intersected with `{ site: SiteIndex }`. `ContentIndex<F>` gains `problems(): ContentProblem[]` where `ContentProblem` is `{ id; draft; errors }`. `normalizeConcepts` reads `config.schema.fields`/`config.schema.validate`; `ConceptDescriptor` is unchanged.
- **The one verification point.** The `defineAdapter` constraint assignability (a concrete `ConceptSchema<F>` against the `ConceptSchema` default) is verified against the toolchain at Task 3, with an explicit constraint-relaxation contingency that does not lose inference (the captured `A` keeps the narrow literal). The Task 4 `expectTypeOf` assertions are the proof inference survived, per the cairn-pass lesson to verify a locked build assumption at the first task that touches it.
- **Ordering and green builds.** Task 1 (emission) and Task 2 (read path) land before the flip and are each green against the old contract. Task 3 flips atomically. Task 4 adds the typed helper over the flipped contract. Task 5 cleans up and bumps. Each task ends with the full gate (`npm run check` 0/0, `npm test` exit 0), and Task 4 adds the showcase production build as the end-to-end proof.
```

---

## Post-mortem (executed 2026-06-01)

**Status: DONE.** All five tasks landed on `main` test-first, plus one review-gate hardening commit. Commits `a49c928..526b5b0` (six), local only, not yet pushed or published. The version is `0.13.0`. This is the breaking adapter-contract cutover, so it rolls together with the unpublished `0.12.0` slot-render bump.

### What was built

- **Task 1 (`a49c928`):** `validateFields` now omits empty optional values from a successful result. An unchecked boolean, an empty tag list, and an empty optional text or date field are dropped, so committed frontmatter stays minimal and the inferred optional-key type reads back accurate. Required-empty fields still error, so on success every empty value belongs to an optional field.
- **Task 2 (`8f3c7ff`):** `createContentIndex` validates each entry once at build. The cheap `ContentSummary` stays raw-derived and robust; the typed `frontmatter` detail field carries `result.data` on success and the raw frontmatter on failure. A failure is recorded as a `ContentProblem` verdict exposed via `problems()`, not thrown. `createSiteIndex` reads those verdicts, skips drafts, and throws one combined report, so validation runs once and a half-finished draft no longer fails the build.
- **Task 3 (`2d228a7`, atomic):** `ConceptConfig` dropped `fields`/`validate` for one generic `schema: S` member. `defineAdapter<const A>` preserves each concept's concrete schema type. `normalizeConcepts` unpacks `config.schema.fields`/`config.schema.validate` onto the unchanged `ConceptDescriptor`, so the admin form, the save path, and `siteDescriptors` needed no change. The showcase and every test fixture migrated to `schema: defineFields([...])` in the one commit.
- **Task 4 (`9b12151`):** `createSiteIndexes` maps over a `defineAdapter`-typed adapter for one typed index per concept, with `frontmatter` typed as the concept's inferred schema, plus a `site` resolver for the catch-all route. It is the typed convenience over `createContentIndex`/`createSiteIndex`, both kept. The showcase content layer migrated to it.
- **Task 5 (`611c5ac`):** `validateFields` is no longer re-exported from the package entry (it stays its own module's export for `schema.ts` and the unit test). Version bumped to `0.13.0`.

### What was verified

- Final gate at the tip: `npm run check` 749 files 0/0, `npm test` 95 files / 440 tests exit 0, `check:package` all-green across all five entries (no export-condition change), and the showcase production build prerenders the catch-all routes, feeds, sitemap, and robots without error.
- **The type proof held with no constraint relaxation.** Task 3's `defineAdapter` constraint accepted the migrated showcase adapter as written, and Task 4's `expectTypeOf<{ title: string; date?: string }>` on `indexes.posts.byId(...).frontmatter` is compile-checked by the 0/0 check, so the concrete schema type survived `defineAdapter` into typed reads. The plan's contingency was not triggered.

### Execution deviations (all sound)

- **Task 3 migrated six more fixtures than the plan listed.** Atomicity required migrating every old-shape `ConceptConfig` literal that flows through `normalizeConcepts`, and the plan's file list omitted `content-compose.test.ts`, `delivery-concept-generic.test.ts`, `public-routes.test.ts`, `delivery-site-index.test.ts`, `public-routes-seo.test.ts`, `delivery-site-descriptors.test.ts`, and `compose.test.ts`. The tree would not compile until all migrated, so they landed in the same commit. The `ConceptDescriptor` literals (the `content-routes-*` and `nav-routes-load` tests) stayed untouched, since `ConceptDescriptor` is unchanged by this plan.
- **Task 4 corrected two type-level drafts in the plan.** `ConceptIndex` is exported from `site-index.js`, not `content-index.js` as the draft imported. The `SiteIndexes` mapped type `[K in ...]: ContentIndex<Infer<NonNullable<A['content'][K]>['schema']>>` failed `svelte-check` because a generic mapped type sees only the constraint upper bound, which does not expose `schema`; the form that both type-checks and preserves the concrete inference extracts the schema parameter with a conditional, `NonNullable<A['content'][K]> extends ConceptConfig<infer S> ? Infer<S> : Record<string, unknown>`. The runtime is exactly the plan's code.

### Review gate

A simplifier pass (no changes; the code was already clean) and a high-effort seven-angle `/code-review` ran. None of the four specialized reviewers applied, since the pass touched no Svelte, Worker, D1, auth, session, cookie, or DaisyUI code. The review surfaced one confirmed observable regression, folded in test-free as the `526b5b0` hardening commit, plus several latent follow-ups.

- **Confirmed and fixed:** the migrated showcase `posts` schema declared only `title`/`date`, but the post files carry a `description` the SEO head reads at `public-routes.ts:70`, so validate-once dropped it and the prerendered `<meta name="description">` silently fell back to the derived excerpt. Declaring a `description` field restored the authored value (verified in the prerendered `posts/hello.html` and the two other posts) and makes the schema a faithful source of truth for the content the showcase carries. The same commit re-exports `ContentProblem` from the package root, so a consumer importing `ContentIndex` from the main entry has a name for its `problems()` element type.
- **Refuted:** the claimed single-concept `keyof A['content']` type trap. A `@ts-expect-error` probe through the project's own `svelte-check` confirmed a posts-only adapter does not expose `indexes.pages`, so the mapped key set narrows correctly. The non-required-boolean omit concern is also refuted: `InferFields` types every non-required field as optional, so an omitted `false` reads back as `boolean | undefined`, which is sound.

### Carried follow-ups (latent, out of scope, none reachable under the sites' current shape)

- **Failure-path `frontmatter` typing.** On a validation failure, `createContentIndex` stores the raw frontmatter cast `as F`, so a typed reader of an invalid entry could see un-normalized data under a type that promises it is valid. The build gate fails any non-draft invalid entry before it ships, and an invalid draft is reachable only through an explicit `includeDrafts` read, so this is a backstop edge, not a live path.
- **A required boolean is omitted while typed present.** The boolean validator arm never errors, so a `required: true` boolean left unchecked passes validation with its key omitted, while `InferFields` types it as a required `boolean`. No concept declares a required boolean (a required checkbox is the rare consent pattern), so it is unreachable today; the fix, when wanted, is to error a required boolean that is not `true`.
- **The reserved `site` key is comment-guarded only.** A concept literally named `site` would have its index clobbered by the `{ ...byConcept, site }` resolver merge. The fixed `{ posts?, pages? }` content model makes the name impossible today; a one-line construction guard is the cheap insurance when the additive-concept seam opens.
- **A missing or misspelled glob key yields a silent empty index.** `createSiteIndexes` falls back to `{}` for a concept with no matching glob key, so a typo produces an empty-but-valid index with no diagnostic. `SiteGlobs` keys are intentionally optional (a site need not glob every concept), so a warning rather than a throw is the right future refinement.
- **The summary and detail can drift.** The summary derives `date`/`tags` from raw frontmatter while the detail carries the validator's normalized values, so a validator that re-normalizes those fields would diverge between the two faces. The coercion is identical today (`asTags`/`asDate` match the baseline), so this is latent.

### The lesson for the site migrations

Every frontmatter key a site reads must be declared in its concept schema. The cutover makes the schema the single source of truth, so validate-once serves only declared fields on `.frontmatter`. A migrating site that reads an undeclared key (the showcase's `description` was the first instance) gets `undefined` and a silent degrade, not an error. The ecnordic and 907 migrations each audit their content for every read key before declaring the schema.
