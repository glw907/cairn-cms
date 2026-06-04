# DX-A engine-surface ergonomics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the five small engine-surface and docs findings from the 907 migration (907 #1, #6, #4, #8, #5) so a plain-blog consumer pays no component tax, the URL policy can never be silently dropped, the `freetags` two-layer contract is loud, and the sanitize floor and the upgrade path are documented.

**Architecture:** Two code changes and three docs changes. `createRenderer`'s registry parameter becomes optional and defaults to an empty registry. `composeRuntime` takes a single object input with a required `siteConfig` and derives the URL policy internally, so the loose third argument is gone and both the runtime and delivery paths derive the policy from one source. The `freetags` invariant, the sanitize floor, and the `0.x` upgrade path each get a doc plus, where there is behavior to pin, a test.

**Tech Stack:** TypeScript, Svelte 5, Vitest (unit and component projects), `svelte-check`, the existing `src/lib/render` and `src/lib/content` modules, the `examples/showcase` reference consumer.

**Source spec:** `docs/superpowers/specs/2026-06-04-cairn-dx-907-hardening-design.md`.

**Worktree:** Run on a feature worktree off `main`, per the cairn rebuild topology. The per-task gate is `npm run check` (0 errors, 0 warnings) plus `npm test` (exit 0). The root `npm run check` does not typecheck `examples/showcase`, so Task 3 carries the showcase verification explicitly.

---

### Task 1: `createRenderer` defaults to the empty registry (907 #1)

A plain-prose blog has no directive components, yet `createRenderer(registry, options)` requires a full `ComponentRegistry`. Make the registry optional, defaulting to `defineRegistry({ components: [] })`, so the common call is `createRenderer()`. A caller passing a built registry is unaffected.

**Files:**
- Modify: `src/lib/render/pipeline.ts`
- Test: `src/tests/unit/render-pipeline.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `src/tests/unit/render-pipeline.test.ts`, inside the existing `describe('createRenderer', ...)` block:

```ts
it('renders plain markdown with no registry argument', async () => {
  const { renderMarkdown } = createRenderer();
  const html = await renderMarkdown('# Hello\n\nA paragraph.');
  expect(html).toContain('<h1');
  expect(html).toContain('Hello');
  expect(html).toContain('<p>A paragraph.</p>');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run render-pipeline`
Expected: FAIL. Before the change `createRenderer()` is a type error and throws at runtime because `registry` is `undefined` when the pipeline reads it.

- [ ] **Step 3: Make the registry parameter optional with an empty default**

In `src/lib/render/pipeline.ts`, add the `defineRegistry` import to the existing registry import line:

```ts
import { defineRegistry, type ComponentRegistry } from './registry.js';
```

Change the `createRenderer` signature so the registry defaults to an empty registry:

```ts
export function createRenderer(
  registry: ComponentRegistry = defineRegistry({ components: [] }),
  options: RendererOptions = {},
) {
```

Leave the body unchanged. The default flows through the existing `remarkDirectiveStamp`, `rehypeDispatch`, and `buildSanitizeSchema` calls, which already handle a registry with no components.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- --run render-pipeline`
Expected: PASS, including the existing `createRenderer` tests.

- [ ] **Step 5: Run the full gate**

Run: `npm run check && npm test`
Expected: `check` 0/0; `npm test` exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/render/pipeline.ts src/tests/unit/render-pipeline.test.ts
git commit -m "createRenderer defaults to the empty registry"
```

---

### Task 2: `composeRuntime` takes one object input and derives the URL policy (907 #6)

`composeRuntime(adapter, extensions, urlPolicy)` makes the per-concept URL policy a forgettable third positional argument, so a consumer can leave it empty and ship a wrong admin-create permalink while the delivery path (`siteDescriptors`) stays correct. Replace the positional signature with a single object input carrying a required `siteConfig`, derive the policy from it with `urlPolicyFrom`, and throw when it is missing. This change breaks every caller; this task updates the engine, the fixture, and the three compose test files. The showcase is Task 3.

**Files:**
- Modify: `src/lib/content/compose.ts`
- Modify: `src/lib/index.ts` (export the new `ComposeInput` type)
- Modify: `src/tests/unit/_content-fixture.ts` (add a shared `testSiteConfig`)
- Test: `src/tests/unit/content-compose.test.ts`, `src/tests/unit/compose.test.ts`, `src/tests/unit/compose-icons.test.ts`

- [ ] **Step 1: Add a shared `testSiteConfig` to the fixture**

In `src/tests/unit/_content-fixture.ts`, add the `SiteConfig` import and a minimal site config beneath `testAdapter`:

```ts
import type { SiteConfig } from '../../lib/nav/site-config.js';
```

```ts
export const testSiteConfig: SiteConfig = { siteName: 'Test' };
```

- [ ] **Step 2: Write the failing tests for the new shape**

In `src/tests/unit/content-compose.test.ts`, replace the existing `describe('composeRuntime URL policy', ...)` block with the derive, throw, and parity tests. Add the imports at the top of the file:

```ts
import { testAdapter, testSiteConfig } from './_content-fixture.js';
import { siteDescriptors } from '../../lib/delivery/site-descriptors.js';
```

```ts
describe('composeRuntime URL policy', () => {
  it('derives the per-concept URL policy from the site config', () => {
    const siteConfig = { siteName: 'Test', content: { posts: { permalink: '/:year/:slug', datePrefix: 'year' as const } } };
    const runtime = composeRuntime({ adapter: testAdapter, siteConfig });
    const posts = runtime.concepts.find((c) => c.id === 'posts')!;
    expect(posts.routing.pattern).toBe('/:year/:slug');
  });

  it('applies the descriptor default when the site config names no policy', () => {
    const posts = composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig }).concepts.find((c) => c.id === 'posts')!;
    expect(posts.routing.pattern).toBeDefined();
  });

  it('throws when no site config is supplied', () => {
    // @ts-expect-error a missing siteConfig is the failure this guards against
    expect(() => composeRuntime({ adapter: testAdapter })).toThrow(/site config/i);
  });

  it('derives the same concepts as the delivery path', () => {
    const runtime = composeRuntime({ adapter: testAdapter, siteConfig: testSiteConfig });
    expect(runtime.concepts).toEqual(siteDescriptors(testAdapter, testSiteConfig));
  });
});
```

The `routing.pattern` assertion reads the normalized descriptor; if your local `ConceptDescriptor.routing` names the field differently, match the field the existing `concepts.test.ts` asserts on. Keep the parity test exactly as written, since it pins the runtime and delivery paths to one derivation.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run test:unit -- --run content-compose`
Expected: FAIL to compile or run, because `composeRuntime` still takes positional arguments.

- [ ] **Step 4: Rewrite `composeRuntime` to the object input**

Replace the body of `src/lib/content/compose.ts` with the object-input form. Keep the existing top comment block. The imports gain `SiteConfig` and `urlPolicyFrom`:

```ts
import type { AdminPanel, CairnAdapter, CairnExtension, CairnRuntime, ConceptConfig, FieldTypeDef } from './types.js';
import { normalizeConcepts } from './concepts.js';
import { urlPolicyFrom, type SiteConfig } from '../nav/site-config.js';

/** The input to {@link composeRuntime}. `siteConfig` is required so the per-concept URL policy is
 *  always derived from one source and can never be silently dropped. `extensions` fold in after the
 *  adapter's concepts. */
export interface ComposeInput {
  adapter: CairnAdapter;
  siteConfig: SiteConfig;
  extensions?: CairnExtension[];
}

/**
 * Fold an adapter and any extensions into the composed runtime (seam 2). The per-concept URL policy
 * is derived from the site config, the same source the delivery path uses, so the runtime and
 * delivery permalinks cannot diverge. Extension concepts merge after the adapter's. The asset slot
 * (seam 4) passes through untouched.
 */
export function composeRuntime({ adapter, siteConfig, extensions = [] }: ComposeInput): CairnRuntime {
  if (!siteConfig) throw new Error('composeRuntime needs a site config to derive the URL policy');
  const content: Record<string, ConceptConfig | undefined> = { ...adapter.content };
  const adminPanels: AdminPanel[] = [];
  const fieldTypes: FieldTypeDef[] = [];
  for (const extension of extensions) {
    // An extension adds concepts; a key that collides with the adapter is last-write-wins.
    // Reserved seam, unused today, so the collision policy is deliberately left simple.
    if (extension.content) Object.assign(content, extension.content);
    if (extension.adminPanels) adminPanels.push(...extension.adminPanels);
    if (extension.fieldTypes) fieldTypes.push(...extension.fieldTypes);
  }
  return {
    siteName: adapter.siteName,
    concepts: normalizeConcepts(content, urlPolicyFrom(siteConfig)),
    backend: adapter.backend,
    sender: adapter.sender,
    render: adapter.render,
    manifestPath: adapter.manifestPath ?? 'src/content/.cairn/index.json',
    registry: adapter.registry,
    icons: adapter.icons,
    navMenu: adapter.navMenu,
    assets: adapter.assets,
    adminPanels,
    fieldTypes,
  };
}
```

The `ConceptUrlPolicy` import is dropped from this file because the loose policy argument is gone.

- [ ] **Step 5: Export the new type**

In `src/lib/index.ts`, change the `composeRuntime` export line to also export the input type:

```ts
export { composeRuntime } from './content/compose.js';
export type { ComposeInput } from './content/compose.js';
```

- [ ] **Step 6: Update the remaining compose call sites in the tests**

The positional callers in the three test files become the object form. In `src/tests/unit/content-compose.test.ts`, `src/tests/unit/compose.test.ts`, and `src/tests/unit/compose-icons.test.ts`, rewrite each call by this rule, adding the `testSiteConfig` import (or a local `{ siteName: '...' }`) where needed:

- `composeRuntime(adapter)` becomes `composeRuntime({ adapter, siteConfig: testSiteConfig })`
- `composeRuntime(adapter, [ext])` becomes `composeRuntime({ adapter, siteConfig: testSiteConfig, extensions: [ext] })`
- `composeRuntime({ ...adapter, x })` becomes `composeRuntime({ adapter: { ...adapter, x }, siteConfig: testSiteConfig })`

For `compose.test.ts` and `compose-icons.test.ts`, which build their own adapters, either import `testSiteConfig` from `./_content-fixture.js` or define a local `const siteConfig = { siteName: 'Test' }` and pass it. Do not leave any positional `composeRuntime(` call.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm run test:unit -- --run compose`
Expected: PASS for `content-compose`, `compose`, and `compose-icons`.

- [ ] **Step 8: Run the full gate**

Run: `npm run check && npm test`
Expected: `check` 0/0; `npm test` exits 0. A leftover positional call surfaces here as a type error.

- [ ] **Step 9: Commit**

```bash
git add src/lib/content/compose.ts src/lib/index.ts src/tests/unit/_content-fixture.ts src/tests/unit/content-compose.test.ts src/tests/unit/compose.test.ts src/tests/unit/compose-icons.test.ts
git commit -m "composeRuntime takes one object input and derives the URL policy"
```

---

### Task 3: Update the showcase to the new `composeRuntime` shape (907 #6)

The showcase calls `composeRuntime(cairn)` in its admin routes and healthz with no URL policy, the exact latent bug #6 describes. Centralize the parsed site config in `cairn.config.ts`, consume it in `content.ts`, and pass it at every `composeRuntime` call. This is the pattern the scaffolder will emit.

**Files:**
- Modify: `examples/showcase/src/lib/cairn.config.ts`
- Modify: `examples/showcase/src/lib/content.ts`
- Modify: `examples/showcase/src/routes/admin/(app)/+layout.server.ts`
- Modify: `examples/showcase/src/routes/admin/(app)/+page.server.ts`
- Modify: `examples/showcase/src/routes/admin/(app)/[concept]/+page.server.ts`
- Modify: `examples/showcase/src/routes/admin/(app)/[concept]/[id]/+page.server.ts`
- Modify: `examples/showcase/src/routes/healthz/+server.ts`

- [ ] **Step 1: Export the parsed site config from `cairn.config.ts`**

In `examples/showcase/src/lib/cairn.config.ts`, add the `parseSiteConfig` import to the existing package import, import the YAML, and export the parsed config beneath the `cairn` adapter:

```ts
import { createRenderer, defineRegistry, defineFields, defineAdapter, cardShell, headRow, iconSpan, glyph, parseSiteConfig } from '@glw907/cairn-cms';
import siteYaml from './site.config.yaml?raw';
```

```ts
export const siteConfig = parseSiteConfig(siteYaml);
```

- [ ] **Step 2: Consume the shared site config in `content.ts`**

In `examples/showcase/src/lib/content.ts`, drop the local parse and import the shared config. Change the package import to drop `parseSiteConfig`:

```ts
import { verifyManifest } from '@glw907/cairn-cms';
import { cairn, siteConfig } from './cairn.config.js';
```

Remove the `import siteYaml from './site.config.yaml?raw';` line and the `const siteConfig = parseSiteConfig(siteYaml);` line. The rest of the file (the `createSiteIndexes` and `verifyManifest` calls that already read `siteConfig`) is unchanged.

- [ ] **Step 3: Pass the site config at each `composeRuntime` call**

In each of the four admin route files and `healthz/+server.ts`, add `siteConfig` to the `cairn.config` import and change the call. The call changes from:

```ts
const routes = createContentRoutes(composeRuntime(cairn), {
```

to:

```ts
const routes = createContentRoutes(composeRuntime({ adapter: cairn, siteConfig }), {
```

and `healthz/+server.ts` changes from `composeRuntime(cairn)` to `composeRuntime({ adapter: cairn, siteConfig })`. Make sure each file imports `siteConfig` from the same module it imports `cairn` from (`$lib/cairn.config` or the relative path that file already uses for `cairn`).

- [ ] **Step 4: Verify the showcase typechecks and builds**

Run:
```bash
cd examples/showcase && npm run check && npm run build
```
Expected: `check` reports 0 errors; the production build exits 0. A missed call site surfaces as a type error in `check`.

- [ ] **Step 5: Commit**

```bash
git add examples/showcase/src/lib/cairn.config.ts examples/showcase/src/lib/content.ts "examples/showcase/src/routes/admin/(app)/+layout.server.ts" "examples/showcase/src/routes/admin/(app)/+page.server.ts" "examples/showcase/src/routes/admin/(app)/[concept]/+page.server.ts" "examples/showcase/src/routes/admin/(app)/[concept]/[id]/+page.server.ts" examples/showcase/src/routes/healthz/+server.ts
git commit -m "Wire the showcase to the new composeRuntime site-config input"
```

---

### Task 4: Make the `freetags` two-layer invariant loud (907 #4)

The validator omits an empty tags list, so validated data carries no `tags` key when tags are absent, while the read model's `asTags` always yields `[]`. Both behaviors are correct and stay. The fix pins each behavior with a test and states the contract in the type comments, so the split is no longer invisible.

**Files:**
- Modify: `src/lib/delivery/content-index.ts` (comment on the read-model `tags` field)
- Modify: `src/lib/content/validate.ts` (comment on the omit-when-empty rule)
- Test: `src/tests/unit/content-validate.test.ts` and `src/tests/unit/content-index.test.ts`

- [ ] **Step 1: Confirm the test file names**

Run: `ls src/tests/unit | grep -E 'validate|content-index'`
Expected: the validator and content-index unit test files. Use whatever names exist (for example `content-validate.test.ts` and `content-index.test.ts`); the steps below assume those two. If a single file covers both, add both tests there.

- [ ] **Step 2: Write the failing tests that pin both layers**

In the validator test file, add:

```ts
it('omits an absent optional tags field from the normalized data', () => {
  const fields = [{ type: 'tags' as const, name: 'tags', label: 'Tags', options: ['a', 'b'] }];
  const result = validateFields(fields, { });
  expect(result.ok).toBe(true);
  if (result.ok) expect('tags' in result.data).toBe(false);
});
```

In the content-index test file, add a test that the read model fills an absent tags list with an empty array. Build a one-file index for a concept whose markdown has no `tags` front matter and assert the entry's `tags`:

```ts
it('fills an absent tags list with an empty array on the read model', () => {
  const entry = index.byId('no-tags');
  expect(entry?.tags).toEqual([]);
});
```

Match the existing harness in that file for constructing `index` and the fixture markdown (reuse the file's existing `createContentIndex` setup and add a `no-tags` fixture entry with title-only front matter).

- [ ] **Step 3: Run the tests to verify they fail or pass against current behavior**

Run: `npm run test:unit -- --run "content-validate|content-index"`
Expected: these assertions pass against current behavior, since the code already behaves this way. The value is the regression lock. If either fails, the behavior has drifted from the contract and the implementation, not the test, is wrong; stop and reconcile before continuing.

- [ ] **Step 4: State the contract in the type and validator comments**

In `src/lib/delivery/content-index.ts`, expand the comment on the `ContentSummary.tags` field so the read-model contract is explicit:

```ts
  /** The entry's tags, always present as an array and empty when the file declares none. This is the
   *  read-model normalization. It differs on purpose from the validated `frontmatter.tags`, which the
   *  validator omits when empty, so a published file carries no `tags: []` noise. Read `tags` here for
   *  a list; read `frontmatter.tags` only when you need the validated, possibly-absent value. */
  tags: string[];
```

In `src/lib/content/validate.ts`, the function doc comment already states the omit rule; add one sentence so the cross-layer contract is named at the source:

```ts
 * one is omitted, so validated data has no `tags` key when tags are absent. The delivery read model
 * (`ContentEntry.tags`) fills that case with an empty array; the two layers differ on purpose.
```

Fold that sentence into the existing comment where it describes the tag-omit rule, keeping the comment a single coherent block.

- [ ] **Step 5: Run the full gate**

Run: `npm run check && npm test`
Expected: `check` 0/0; `npm test` exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/delivery/content-index.ts src/lib/content/validate.ts src/tests/unit/content-validate.test.ts src/tests/unit/content-index.test.ts
git commit -m "Pin and document the freetags two-layer invariant"
```

---

### Task 5: Document the sanitize floor (907 #8)

The render path runs a `rehype-sanitize` floor with an extend-only schema, then forces a `rel` on `target="_blank"` anchors. The policy is sound but undocumented, which surprised the migration. Write a reference doc stating what the floor keeps, strips, and rewrites. Docs only, no test.

**Files:**
- Create: `docs/render-sanitize-floor.md`

- [ ] **Step 1: Read the floor's current behavior**

Read `src/lib/render/sanitize-schema.ts` (the `buildSanitizeSchema` allowlist, the `FIXED_MARKERS`, and `rehypeAnchorRel`) and the `createRenderer` floor wiring in `src/lib/render/pipeline.ts`. Write the doc from the code as it is, not from memory.

- [ ] **Step 2: Write the reference doc**

Create `docs/render-sanitize-floor.md` covering, in plain prose with no em dashes:

- Where the floor runs in the pipeline (after `rehype-raw`, before the dispatch), and why the dispatch output and inline SVG icons are trusted and not sanitized.
- What the default allowlist keeps (the base `defaultSchema` plus the directive markers and the common benign tags the engine adds).
- What it strips (the dangerous HTML and URI vectors the floor closes).
- What it rewrites: the `rel` forced on `target="_blank"` anchors, default `noopener noreferrer`, configurable through the `anchorRel` option (a string to change it, `false` to disable), and the fact that the floor scopes the `rel` to `target="_blank"` anchors rather than every external link.
- The extend-only escape: the `sanitizeSchema` option receives the default schema and returns an extended one, so a site adds to the allowlist and never removes the dangerous strip; and the developer-only `unsafeDisableSanitize` escape and its risk.

- [ ] **Step 3: Verify the prose passes the guard**

Run: `prose-guard docs/render-sanitize-floor.md`
Expected: no output (a clean pass). Fix any flagged line by rewriting the sentence, not by a mechanical swap.

- [ ] **Step 4: Commit**

```bash
git add docs/render-sanitize-floor.md
git commit -m "Document the render sanitize floor"
```

---

### Task 6: A changelog convention and an upgrade guide, then bump the version (907 #5)

The `0.6` to `0.24` migration had to rediscover each rename because the changelog reaches back only to `0.22.0` and carries no consumer-action line. Adopt a "Consumers must:" convention, write a short upgrade guide collecting the `0.x` renames, add the DX-A changelog entry, and bump the version. Docs and metadata only, no test. The `cairn-pass` ritual edit that enforces the convention is a handoff item recorded at the end, outside this repo.

**Files:**
- Create: `docs/upgrading.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json` (version bump)

- [ ] **Step 1: Write the upgrade guide**

Create `docs/upgrading.md`. Open with one paragraph stating that cairn is a `0.x` library that breaks often, and that each breaking change carries a "Consumers must:" line in `CHANGELOG.md`. Then list, oldest first, the renames a consumer crosses when upgrading across the `0.x` window, one line each with the consumer action. Cover at least the renames the 907 migration hit: `renderPreview` becoming `render`, the validator member move, the `EditPage` prop rename, the registry change that `createRenderer` now defaults (907 #1), and the `composeRuntime` URL-policy argument becoming the object input (907 #6). Confirm each rename against `CHANGELOG.md` and the git history before writing its line, so the actions are accurate.

- [ ] **Step 2: Add the DX-A changelog entry with consumer actions**

In `CHANGELOG.md`, add a new top entry for the bumped version. State the convention by example, giving each breaking line a "Consumers must:" note:

```markdown
## 0.25.0

### Changed (breaking)
- `composeRuntime` now takes a single object, `composeRuntime({ adapter, siteConfig, extensions? })`,
  and derives the per-concept URL policy from `siteConfig`. The loose third `urlPolicy` argument is
  gone, and a missing `siteConfig` throws. Consumers must: pass the parsed site config to every
  `composeRuntime` call and drop any hand-passed URL policy.

### Changed
- `createRenderer()` now defaults its registry to the empty registry, so a plain-prose site calls
  `createRenderer()` with no argument. Consumers must: nothing; passing a built registry is unchanged.

### Docs
- A render sanitize-floor reference (`docs/render-sanitize-floor.md`) states what the floor keeps,
  strips, and rewrites, including the `target="_blank"` rel policy.
- An upgrade guide (`docs/upgrading.md`) collects the `0.x` renames with a consumer action each.
```

- [ ] **Step 3: Bump the version**

In `package.json`, change `"version": "0.24.0"` to `"version": "0.25.0"`.

- [ ] **Step 4: Verify the prose passes the guard**

Run: `prose-guard docs/upgrading.md && prose-guard CHANGELOG.md`
Expected: clean passes. Rewrite any flagged sentence.

- [ ] **Step 5: Run the full gate**

Run: `npm run check && npm test`
Expected: `check` 0/0; `npm test` exits 0. This is metadata and docs, so nothing should move, but run it to confirm the version bump did not disturb a snapshot or a package check.

- [ ] **Step 6: Commit**

```bash
git add docs/upgrading.md CHANGELOG.md package.json
git commit -m "Add a changelog convention and an upgrade guide, bump 0.25.0"
```

---

## Self-review notes

- **Spec coverage.** 907 #1 is Task 1, #6 is Tasks 2 and 3, #4 is Task 4, #8 is Task 5, #5 is Task 6. The spec's `composeRuntime` "derived, not passed, absent throws" is the Task 2 object input with the `siteConfig` guard. The spec's freetags "keep both, make it loud" is Task 4's tests plus type comments with no behavior change.
- **Out of scope, as the spec states.** No manifest toolchain (that is DX-B, planned just-in-time after this lands), no scaffolder items, no codemods, no unifying of the freetags layers.
- **Handoff item, not a code task.** The `cairn-pass` pass-end ritual gains a step enforcing the "Consumers must:" line on a breaking change. That skill file lives outside this repo, so record it in the pass post-mortem and STATUS as a handoff, and apply it to the skill at pass-end.
- **Type consistency.** The new `ComposeInput` is `{ adapter, siteConfig, extensions? }` everywhere. `createRenderer`'s first parameter stays typed `ComponentRegistry` with an empty default. The parity test imports `siteDescriptors` from its file path, not the `/delivery` barrel, so a node unit test stays component-free (the same concern DX-B's 907 #3 fixes wholesale).
- **Gate scope.** The root `npm run check` does not cover `examples/showcase`, so Task 3 runs the showcase `check` and `build` itself. Every other task clears the root gate.

## Versioning and publishing

DX-A bumps to `0.25.0` (Task 6). Publishing follows the rolling-window practice and is held until the user asks, the same as the prior passes. Do not publish or push as part of executing this plan.

---

## Post-mortem (executed 2026-06-03)

DX-A executed subagent-driven, one `cairn-implementer` per task (Sonnet throughout, the tasks were mechanical), on a feature worktree off `main` (`dx-a-ergonomics`). Six task commits `38499ef..e867ab5` plus a review-gate fold-in `3cb5860`. The branch fast-forward merged to local `main` at `3cb5860` and the worktree was removed. **Local only, not pushed, not published.** The minor bumps to `0.25.0`.

### What was built

- **Task 1 (907 #1):** `createRenderer`'s registry parameter is optional, defaulting to `defineRegistry({ components: [] })`, so a plain-prose blog calls `createRenderer()`. The default is evaluated per call, so no registry object is shared across renderers. A new no-argument render test locks it.
- **Task 2 (907 #6):** `composeRuntime` takes one `ComposeInput` object, `composeRuntime({ adapter, siteConfig, extensions? })`, and derives the per-concept URL policy from `siteConfig` via `urlPolicyFrom`, the same call the delivery path uses (`normalizeConcepts(content, urlPolicyFrom(siteConfig))`). A missing `siteConfig` throws. `ComposeInput` is exported from the package root. The new parity test pins the runtime and delivery derivations to one source.
- **Task 3 (907 #6):** the showcase exports a single parsed `siteConfig` from `cairn.config.ts`, consumed in `content.ts` and passed at every `composeRuntime` call (the four admin routes plus healthz). This is the pattern the scaffolder will emit.
- **Task 4 (907 #4):** the `freetags` two-layer invariant is pinned with two regression tests (the validator omits an absent tags key; the read model fills `[]`) and named in the type and validator comments. No behavior change.
- **Task 5 (907 #8):** `docs/render-sanitize-floor.md` states what the floor keeps, strips, and rewrites, written from the code.
- **Task 6 (907 #5):** `docs/upgrading.md` collects the `0.x` renames with a consumer action each, `CHANGELOG.md` adopts the "Consumers must:" convention in a `0.25.0` entry, and the version bumped. The stale committed lockfile (`0.21.0`) was reconciled to `0.25.0`.

### Field-name adjustment (Task 2)

The plan's test snippet asserted on `posts.routing.pattern`, but the real `ConceptDescriptor` exposes the resolved permalink as `posts.permalink` (confirmed in `src/lib/content/types.ts` and the pre-existing `content-compose.test.ts`). The implementer used `posts.permalink`, exactly the adaptation the plan flagged.

### Gate (verified first-hand)

At the merge tip `3cb5860`: `npm run check` 775 files 0 errors 0 warnings, `npm test` 110 files / 643 tests exit 0. The showcase carries its own gate (Task 3): showcase `check` 405 files 0 errors, production build exit 0. One load-induced test timeout flake (`delivery-head-split.test.ts` at 5000ms under machine load) cleared on a re-run and in isolation; two consecutive full-suite runs at and after the fold-in were clean.

### Review gate

The simplifier changed nothing: the compose rewrite mirrors the delivery path by construction, the `!siteConfig` guard is a tested defense against untyped callers, and the empty-registry default matches the existing idiom. A high-effort Opus review returned **SHIP**, no Critical and no Important. It verified the high-risk items first-hand: every `CairnRuntime` field is preserved across the compose rewrite, the policy derivation matches the delivery path exactly, the throw message matches the test, no positional caller remains, and the per-call default registry carries no shared-mutation risk. Two minor accuracy nits folded in as `3cb5860`: the sanitize-floor doc scopes the `data:` strip to `href` (an image `src` still admits a `data:` URI under `defaultSchema`), and the validator comment names `freetags` alongside `tags` in the omit rule. The Svelte, a11y, Worker, and auth reviewers and the live `/admin` smoke did not apply (no auth, Worker, or admin-UI surface change; the showcase admin routes changed only their `composeRuntime` call shape).

### Showcase install reproducibility (carry-forward for the scaffolder)

Task 3 surfaced a real DX finding. A naive `npm install` inside `examples/showcase` pulls a newer `@sveltejs/kit`/`vite` than the linked root pins, and `svelte-check` then reports duplicate-identifier errors inside `node_modules` (two physical kit/vite copies in the include graph), none in showcase `src/`. The implementer deduped by aligning the showcase's installed kit/vite to the root's exact versions, then reverted the showcase `package.json` to its committed loose caret ranges. The scaffolder (or a showcase install doc) should pin or dedupe the SvelteKit toolchain against the linked package so this gate stays reproducible.

### Handoff item applied at pass-end

The `cairn-pass` pass-end ritual gained a step enforcing the "Consumers must:" changelog line on any breaking change. That skill file lives outside this repo, so it was edited at pass-end, not committed here.
