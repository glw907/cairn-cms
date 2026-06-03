# Delivery read-model touch-ups (DX pass P1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the concept id and authored summary fields on the delivery read model, and give the public import surface one obvious home, so a SvelteKit developer stops re-deriving data the engine already holds.

**Architecture:** Three additive read-model fixes plus one breaking import-path move, all on `src/lib/delivery/` and the public entry barrels. `createContentIndex` stamps `concept` and a namespaced `fields` record onto every `ContentSummary`; a new `summaryFields` descriptor knob drives the field copy; the root barrel re-exports the route loaders and response helpers; `CairnHead` moves to its own `./delivery/head` entry so a node-environment data import stays component-free.

**Tech Stack:** TypeScript, Svelte 5, Vitest (node `unit` project, no Svelte plugin), `@glw907/cairn-cms` package export map, `publint` + `attw` via `check:package`.

**Spec:** `docs/superpowers/specs/2026-06-02-cairn-delivery-readmodel-design.md`

**Conventions:** Test-first, one behavior per test. The `unit` project runs in `node` with no Svelte plugin (only the `component` project has `svelte()`). The full gate before "done": the targeted test, then `npm run check` (svelte-check 0 errors / 0 warnings), then `npm test` (must exit 0). Commit specific files, imperative mood, co-author footer `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

## File map

- `src/lib/delivery/content-index.ts`: add `concept` and `fields` to `ContentSummary`; stamp both in `createContentIndex` (Tasks 1, 4).
- `src/lib/sveltekit/public-routes.ts`: add `concept` to `EntryData`; set it in `entryLoad` (Task 2).
- `src/lib/content/types.ts`: add `summaryFields?` to `ConceptConfig` and `summaryFields` to `ConceptDescriptor` (Task 3).
- `src/lib/content/concepts.ts`: default `summaryFields` in `normalizeConcepts` (Task 3).
- `src/lib/delivery/head.ts`: new thin entry re-exporting `CairnHead` (Task 5).
- `src/lib/delivery/index.ts`: drop the `CairnHead` re-export from the data barrel (Task 5).
- `package.json`: add the `./delivery/head` export entry (Task 5).
- `src/lib/index.ts`: root superset re-exports of the route loaders, response helpers, and route types (Task 6).
- `docs/creating-a-cairn-site.md` and `CHANGELOG.md`: the import rule and the breaking-move migration note (Task 7).
- `examples/showcase/**`: declare `summaryFields`, render a list card reading `summary.fields`, read `data.concept`, and fix the `CairnHead` import (Task 8).
- `package.json` (version): bump to `0.22.0` (Task 9).

---

## Task 1: Stamp `concept` onto `ContentSummary`

**Files:**
- Modify: `src/lib/delivery/content-index.ts` (the `ContentSummary` interface near line 18; the entry push near line 101)
- Test: `src/tests/unit/delivery-content-index.test.ts`

- [ ] **Step 1: Write the failing test**

Add these two cases inside the existing `describe('createContentIndex', ...)` block in `src/tests/unit/delivery-content-index.test.ts` (the `index` is already built at the top of that block from the `posts` descriptor):

```ts
  it('stamps the concept id on every summary', () => {
    expect(index.all()[0].concept).toBe('posts');
    expect(index.byTag('a')[0].concept).toBe('posts');
  });

  it('stamps the concept id on a detail entry', () => {
    expect(index.byId('older')?.concept).toBe('posts');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-content-index.test.ts -t "stamps the concept"`
Expected: FAIL. The type has no `concept` and the value is `undefined`.

- [ ] **Step 3: Add the field to the interface**

In `src/lib/delivery/content-index.ts`, add `concept` as the first member of `ContentSummary`:

```ts
/** The cheap, plain-data view of one entry, for lists, feeds, and the sitemap. */
export interface ContentSummary {
  /** The descriptor id this entry belongs to, e.g. "posts". Lets a list or page branch per
   *  concept without re-deriving it from a proxy like `entry.date`. */
  concept: string;
  id: string;
  slug: string;
  permalink: string;
  title: string;
  date?: string;
  updated?: string;
  tags: string[];
  excerpt: string;
  wordCount: number;
  draft: boolean;
}
```

- [ ] **Step 4: Stamp it in the entry construction**

In `createContentIndex`, the `entries.push({ ... })` call (near line 101) builds each entry. Add `concept: descriptor.id` as the first property:

```ts
    entries.push({
      concept: descriptor.id,
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
      frontmatter: result.data as F,
      body,
    });
```

The `summarize` helper spreads the entry and strips only `frontmatter`/`body`, so `concept` flows to `all`, `byTag`, `adjacent`, and (through `byId`) to detail reads with no further change.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-content-index.test.ts -t "stamps the concept"`
Expected: PASS (both cases).

- [ ] **Step 6: Commit**

```bash
git add src/lib/delivery/content-index.ts src/tests/unit/delivery-content-index.test.ts
git commit -m "Stamp the concept id on every ContentSummary

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Carry `concept` onto `EntryData`

**Files:**
- Modify: `src/lib/sveltekit/public-routes.ts` (the `EntryData` interface near line 47; the `entryLoad` return near line 90)
- Test: `src/tests/unit/public-routes.test.ts`

- [ ] **Step 1: Write the failing test**

Add this case inside the existing `describe('createPublicRoutes', ...)` block in `src/tests/unit/public-routes.test.ts` (the `routes` const is built at the top of the file from a Posts and a Pages concept):

```ts
  it('entryLoad carries the resolved concept on EntryData', async () => {
    const post = await routes.entryLoad({ url: new URL('https://example.com/2026/02/01/a') });
    expect(post.concept).toBe('posts');
    const page = await routes.entryLoad({ url: new URL('https://example.com/about') });
    expect(page.concept).toBe('pages');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/public-routes.test.ts -t "carries the resolved concept"`
Expected: FAIL. `EntryData` has no `concept`.

- [ ] **Step 3: Add the field to `EntryData`**

In `src/lib/sveltekit/public-routes.ts`, add `concept` to the `EntryData` interface:

```ts
export interface EntryData {
  concept: string;
  entry: ContentEntry;
  html: string;
  canonicalUrl: string;
  seo: SeoMeta;
  newer?: ContentSummary;
  older?: ContentSummary;
}
```

- [ ] **Step 4: Set it in `entryLoad`**

In `entryLoad`, the resolved `entry` is a `ContentEntry` that now carries `concept` (Task 1). Add `concept: entry.concept` to the returned object (the final `return { ... }` of `entryLoad`):

```ts
    return { concept: entry.concept, entry, html: await render(entry.body, { stagger: true, resolve: buildLinkResolver(site) }), canonicalUrl, seo, newer, older };
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/public-routes.test.ts -t "carries the resolved concept"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sveltekit/public-routes.ts src/tests/unit/public-routes.test.ts
git commit -m "Carry the resolved concept on EntryData

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Add the `summaryFields` descriptor knob

**Files:**
- Modify: `src/lib/content/types.ts` (`ConceptConfig` near line 106; `ConceptDescriptor` near line 207)
- Modify: `src/lib/content/concepts.ts` (`normalizeConcepts` near line 47)
- Test: `src/tests/unit/content-concepts.test.ts`

- [ ] **Step 1: Write the failing test**

Add this case to `src/tests/unit/content-concepts.test.ts` (import `normalizeConcepts` and `defineFields` if the file does not already; the existing tests there show the import shape):

```ts
  it('carries summaryFields onto the descriptor and defaults it to empty', () => {
    const [withFields] = normalizeConcepts({
      posts: { dir: 'p', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]), summaryFields: ['description', 'heroImage'] },
    });
    expect(withFields.summaryFields).toEqual(['description', 'heroImage']);

    const [withoutFields] = normalizeConcepts({
      pages: { dir: 'g', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]) },
    });
    expect(withoutFields.summaryFields).toEqual([]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/content-concepts.test.ts -t "summaryFields"`
Expected: FAIL. `summaryFields` is not a known `ConceptConfig` member, and the descriptor has no such field.

- [ ] **Step 3: Add `summaryFields` to `ConceptConfig`**

In `src/lib/content/types.ts`, add the optional member to `ConceptConfig` (after `schema`):

```ts
export interface ConceptConfig<S extends ConceptSchema = ConceptSchema> {
  /** Repo-relative content directory, e.g. "src/content/posts". */
  dir: string;
  /** Sidebar label; defaults from the concept id when omitted. */
  label?: string;
  /** The concept's schema: the form projection, the generated validator, and the inferred type. */
  schema: S;
  /** Frontmatter keys to surface on each `ContentSummary.fields`, so a list card reads an authored
   *  field without a per-entry detail read. Each key should also be declared in `schema`. */
  summaryFields?: string[];
}
```

- [ ] **Step 4: Add `summaryFields` to `ConceptDescriptor`**

In the same file, add the field to `ConceptDescriptor` (after `fields`, before `validate`). Type it
non-optional. A normalized descriptor is fully resolved, so the field matches the other resolved members
(`datePrefix`, `permalink`, `fields`) and every consumer reads a clean `string[]`. The cost is that every
hand-built descriptor literal in the unit tests must add the field; Step 6 does exactly that.

```ts
  fields: FrontmatterField[];
  /** Frontmatter keys the index copies onto each summary's `fields` record. `normalizeConcepts`
   *  resolves it to `[]` when a concept omits `summaryFields`. */
  summaryFields: string[];
  validate(frontmatter: Record<string, unknown>, body: string): ValidationResult;
```

- [ ] **Step 5: Default it in `normalizeConcepts`**

In `src/lib/content/concepts.ts`, add the line to the `descriptors.push({ ... })` call (after `fields: config.schema.fields,`):

```ts
    descriptors.push({
      id,
      label: config.label ?? defaultLabel(id),
      dir: config.dir,
      routing: routing[id] ?? DEFAULT_ROUTING,
      permalink: policy.permalink ?? defaultPermalink(id),
      datePrefix: policy.datePrefix ?? 'day',
      fields: config.schema.fields,
      summaryFields: config.summaryFields ?? [],
      validate: config.schema.validate,
    });
```

- [ ] **Step 6: Update every hand-built `ConceptDescriptor` literal in the unit tests**

The non-optional field breaks `npm run check` on every test that builds a descriptor by hand (the
admin-runtime and permalink tests construct descriptor literals directly, bypassing `normalizeConcepts`).
Add `summaryFields: []` to each, right after its `fields:` entry. This is the exhaustive list (13
literals across 9 files):

- `src/tests/unit/manifest.test.ts:13`, after `fields: [],`
- `src/tests/unit/content-permalink.test.ts:8`, in `fields: [], validate: ...`, insert `summaryFields: [],` before `validate:`
- `src/tests/unit/content-routes-edit.test.ts`, after the multi-line `fields: [ ... ]` (before `validate: ok,` near line 20)
- `src/tests/unit/content-routes-delete.test.ts:15`, after `fields: [{ ... }],`
- `src/tests/unit/content-routes-rename.test.ts:18` and `:26`, after each `fields: [{ ... }],` (two literals)
- `src/tests/unit/content-routes-list.test.ts:10` (inline) and `:136` (multi-line), after each `fields:` entry
- `src/tests/unit/content-routes-save.test.ts:16`, after `fields: [{ ... }],`
- `src/tests/unit/content-routes-layout.test.ts:10` and `:11`, in each inline literal insert `summaryFields: [], ` before `validate: ok` (two literals)
- `src/tests/unit/nav-routes-load.test.ts:10` and `:11`, in each inline literal insert `summaryFields: [], ` before `validate: ok` (two literals)

For an inline literal the edit looks like:

```ts
{ id: 'posts', label: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, permalink: '/posts/:slug', datePrefix: 'day', fields: [], summaryFields: [], validate: ok },
```

For a multi-line literal add a line:

```ts
  fields: [],
  summaryFields: [],
  validate: () => ({ ok: true, data: {} }),
```

- [ ] **Step 7: Run the targeted test and the full type check**

Run: `npx vitest run --project unit src/tests/unit/content-concepts.test.ts -t "summaryFields" && npm run check`
Expected: the test PASSES, and `npm run check` reports 0 errors / 0 warnings. A non-zero `check` names any
hand-built literal still missing `summaryFields`; add it there and re-run until clean. The check is the
completeness backstop for Step 6.

- [ ] **Step 8: Commit**

```bash
git add src/lib/content/types.ts src/lib/content/concepts.ts src/tests/unit/content-concepts.test.ts src/tests/unit/manifest.test.ts src/tests/unit/content-permalink.test.ts src/tests/unit/content-routes-edit.test.ts src/tests/unit/content-routes-delete.test.ts src/tests/unit/content-routes-rename.test.ts src/tests/unit/content-routes-list.test.ts src/tests/unit/content-routes-save.test.ts src/tests/unit/content-routes-layout.test.ts src/tests/unit/nav-routes-load.test.ts
git commit -m "Add the summaryFields descriptor knob

Non-optional resolved field on ConceptDescriptor, matching datePrefix/permalink.
Every hand-built descriptor literal in the unit tests gains summaryFields: [].

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Surface `summaryFields` on `ContentSummary.fields`

**Files:**
- Modify: `src/lib/delivery/content-index.ts` (`ContentSummary` interface; the entry push)
- Test: `src/tests/unit/delivery-content-index.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new `describe` block to `src/tests/unit/delivery-content-index.test.ts` (it builds its own descriptor with `summaryFields` so it does not disturb the shared `posts` fixture):

```ts
describe('summary fields', () => {
  const [withSummary] = normalizeConcepts({
    posts: {
      dir: 'p',
      schema: defineFields([
        { type: 'text', name: 'title', label: 'Title' },
        { type: 'date', name: 'date', label: 'Date' },
        { type: 'textarea', name: 'description', label: 'Description' },
        { type: 'text', name: 'image', label: 'Image' },
      ]),
      summaryFields: ['description', 'image'],
    },
  });

  const files: RawFile[] = [
    { path: '/p/2026-01-01-a.md', raw: '---\ntitle: A\ndate: 2026-01-01\ndescription: An authored summary.\nimage: /og/a.png\n---\n\nBody A.' },
    { path: '/p/2026-02-01-b.md', raw: '---\ntitle: B\ndate: 2026-02-01\ndescription: Only a description.\n---\n\nBody B.' },
  ];
  const index = createContentIndex(files, withSummary);

  it('copies the named frontmatter keys onto summary.fields', () => {
    const a = index.all().find((e) => e.id === '2026-01-01-a')!;
    expect(a.fields.description).toBe('An authored summary.');
    expect(a.fields.image).toBe('/og/a.png');
  });

  it('omits a named key the entry does not carry', () => {
    const b = index.all().find((e) => e.id === '2026-02-01-b')!;
    expect(b.fields.description).toBe('Only a description.');
    expect('image' in b.fields).toBe(false);
  });

  it('yields an empty fields object when summaryFields is unset', () => {
    const [plain] = normalizeConcepts({ pages: { dir: 'g', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]) } });
    const plainIndex = createContentIndex([{ path: '/g/about.md', raw: '---\ntitle: About\n---\n\nAbout.' }], plain);
    expect(plainIndex.all()[0].fields).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-content-index.test.ts -t "summary fields"`
Expected: FAIL. `ContentSummary` has no `fields`.

- [ ] **Step 3: Add `fields` to the interface**

In `src/lib/delivery/content-index.ts`, add `fields` to `ContentSummary` (after `draft`):

```ts
  wordCount: number;
  draft: boolean;
  /** The frontmatter keys the descriptor nominated via `summaryFields`, read off the validated,
   *  normalized frontmatter. Namespaced so a nominated key cannot collide with a typed summary
   *  field. Empty when the concept declares no `summaryFields`. */
  fields: Record<string, unknown>;
```

- [ ] **Step 4: Populate it in the entry construction**

In `createContentIndex`, build the record from the validated `result.data` and add it to the `entries.push` call. Add this block just before the `entries.push({ ... })`:

```ts
    const summaryFieldValues: Record<string, unknown> = {};
    for (const key of descriptor.summaryFields) {
      if (key in result.data) summaryFieldValues[key] = (result.data as Record<string, unknown>)[key];
    }
```

Then add `fields: summaryFieldValues,` to the pushed object (after `draft,`):

```ts
      wordCount: wordCount(body),
      draft,
      fields: summaryFieldValues,
      frontmatter: result.data as F,
      body,
```

The copy reads `result.data` (the validator's normalized output), so a surfaced field is already schema-conformed, and a key the frontmatter omits is simply absent from the record (the `key in result.data` guard).

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-content-index.test.ts -t "summary fields"`
Expected: PASS (all three cases).

- [ ] **Step 6: Commit**

```bash
git add src/lib/delivery/content-index.ts src/tests/unit/delivery-content-index.test.ts
git commit -m "Surface summaryFields on ContentSummary.fields

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Split `CairnHead` into a `./delivery/head` entry

**Files:**
- Create: `src/lib/delivery/head.ts`
- Modify: `src/lib/delivery/index.ts` (drop the `CairnHead` re-export at line 37)
- Modify: `package.json` (the `exports` map near line 51)
- Test: `src/tests/unit/delivery-head-split.test.ts` (new)

- [ ] **Step 1: Write the failing test**

The node `unit` project has no Svelte plugin, so today a runtime import of the `/delivery` barrel throws on `CairnHead.svelte`. This test pins that the barrel becomes component-free. Create `src/tests/unit/delivery-head-split.test.ts`:

```ts
// The /delivery data barrel must not pull a .svelte component into the module graph, so a
// node-environment consumer can import a delivery data helper without the Svelte vitest plugin.
// The CairnHead component lives at the dedicated ./delivery/head entry instead.
import { describe, it, expect } from 'vitest';

describe('delivery head split', () => {
  it('imports the /delivery barrel at runtime under node with no Svelte plugin', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    expect(typeof barrel.createContentIndex).toBe('function');
    expect(typeof barrel.createPublicRoutes).toBe('function');
  });

  it('does not export CairnHead from the data barrel', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    expect('CairnHead' in barrel).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-head-split.test.ts`
Expected: FAIL at import analysis with `Failed to parse source for import analysis ... CairnHead.svelte` (the barrel still statically imports the component).

- [ ] **Step 3: Create the dedicated head entry**

Create `src/lib/delivery/head.ts`:

```ts
// cairn-cms: the delivery head component entry (@glw907/cairn-cms/delivery/head). CairnHead lives
// behind its own export so importing a delivery data helper from /delivery never pulls a .svelte
// module into the graph. A node-environment data import then needs no Svelte plugin.
export { default as CairnHead } from './CairnHead.svelte';
```

- [ ] **Step 4: Drop `CairnHead` from the data barrel**

In `src/lib/delivery/index.ts`, delete the final line:

```ts
export { default as CairnHead } from './CairnHead.svelte';
```

Leave the rest of the barrel unchanged.

- [ ] **Step 5: Add the package export entry**

In `package.json`, add the `./delivery/head` entry to the `exports` map, right after the `./delivery` entry (mirror the same `types`/`svelte`/`default` triple):

```json
    "./delivery": {
      "types": "./dist/delivery/index.d.ts",
      "svelte": "./dist/delivery/index.js",
      "default": "./dist/delivery/index.js"
    },
    "./delivery/head": {
      "types": "./dist/delivery/head.d.ts",
      "svelte": "./dist/delivery/head.js",
      "default": "./dist/delivery/head.js"
    },
    "./package.json": "./package.json"
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-head-split.test.ts`
Expected: PASS (both cases). The barrel now loads in node and does not expose `CairnHead`.

- [ ] **Step 7: Verify the package surface resolves**

Run: `npm run check:package`
Expected: exit 0. `publint`/`attw` resolve the new `./delivery/head` entry (`svelte-package` builds `dist/delivery/head.js` and `.d.ts` from the new source file).

- [ ] **Step 8: Commit**

```bash
git add src/lib/delivery/head.ts src/lib/delivery/index.ts package.json src/tests/unit/delivery-head-split.test.ts
git commit -m "Split CairnHead into a /delivery/head entry

Keeps a node data import from /delivery component-free. Breaking import move:
CairnHead is no longer exported from /delivery; import it from /delivery/head.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Make the root barrel a superset of the delivery route surface

**Files:**
- Modify: `src/lib/index.ts` (the delivery re-export block, the tail of the file)
- Test: `src/tests/unit/delivery-exports.test.ts`

- [ ] **Step 1: Write the failing test**

Extend `src/tests/unit/delivery-exports.test.ts`. Add a new `it` block asserting root now re-exports the route factory and the response helpers (the file already imports `* as root` and `* as sveltekit`):

```ts
  it('re-exports the route loaders and response helpers from the root entry', () => {
    for (const name of ['createPublicRoutes', 'rssResponse', 'jsonFeedResponse', 'sitemapResponse', 'robotsResponse']) {
      expect(typeof (root as Record<string, unknown>)[name]).toBe('function');
    }
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/delivery-exports.test.ts -t "route loaders and response helpers"`
Expected: FAIL. Root does not yet re-export these (they resolve only from `/delivery` and `/sveltekit`).

- [ ] **Step 3: Add the superset re-exports to root**

In `src/lib/index.ts`, after the existing delivery re-export block (the last delivery line is `export type { Page } from './delivery/paginate.js';`), add the route loaders, the response helpers, and the route types. Do NOT add `CairnHead`: the root barrel is imported by the node `unit` project with no Svelte plugin, and a `.svelte` re-export would break those tests. The head component resolves from `./delivery/head`.

```ts
export type { Page } from './delivery/paginate.js';
// Root superset of the delivery route surface: a wrong guess from root for a route loader or a
// response helper now resolves. The CairnHead component stays out of root so the root barrel stays
// node-importable for the unit suite; it resolves from @glw907/cairn-cms/delivery/head.
export { rssResponse, jsonFeedResponse, sitemapResponse, robotsResponse } from './delivery/responses.js';
export { createPublicRoutes } from './sveltekit/public-routes.js';
export type { PublicRoutesDeps, ListData, TagData, TagIndexData, EntryData } from './sveltekit/public-routes.js';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/delivery-exports.test.ts`
Expected: PASS (the new case and the existing ones; the existing `createPublicRoutes` from the sveltekit entry still resolves).

- [ ] **Step 5: Confirm root still loads in node and the package surface resolves**

Run: `npx vitest run --project unit src/tests/unit/delivery-exports.test.ts && npm run check:package`
Expected: both exit 0. The root barrel still imports no `.svelte` (it loaded in the test above), and `publint`/`attw` stay green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/index.ts src/tests/unit/delivery-exports.test.ts
git commit -m "Re-export the delivery route loaders and response helpers from root

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Document the import rule and the breaking move

**Files:**
- Modify: `docs/creating-a-cairn-site.md`
- Modify: `CHANGELOG.md` (repo root; create the unreleased section if the file leads with an older version)
- Test: none (docs only)

- [ ] **Step 1: Add the import rule to the site guide**

Open `docs/creating-a-cairn-site.md` and find the section that covers the delivery surface or public-page imports (search for `@glw907/cairn-cms/delivery` or "delivery"). Add a short paragraph stating the rule. Write it in the repo's prose voice (no em dashes, one idea per sentence, no "not X but Y" frames):

```markdown
A site's public pages import the data builders, the route loaders (`createPublicRoutes`), and the
response helpers (`rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`) from
`@glw907/cairn-cms/delivery`. That entry is backend-free, so it keeps auth, github, and email out of the
public bundle. The package root re-exports the same symbols for convenience when a file already imports
from the root. The `CairnHead` head component is the one exception. Import it from
`@glw907/cairn-cms/delivery/head`, which keeps the data entry free of any Svelte component.
```

- [ ] **Step 2: Add the changelog migration note**

Open `CHANGELOG.md` at the repo root. Add a `0.22.0` entry (most-recent-first, matching the file's existing format) recording the additive surface and the one breaking import path:

```markdown
## 0.22.0

### Added
- `ContentSummary.concept` and `EntryData.concept`: the read model carries its resolved concept id, so a
  list or page branches per concept without re-deriving it from `entry.date`.
- A `summaryFields` knob on a concept config surfaces named frontmatter keys on `ContentSummary.fields`,
  so a list card reads an authored field with no per-entry detail read.
- The package root re-exports the delivery route loaders (`createPublicRoutes`) and the response helpers
  (`rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`).

### Changed (breaking)
- `CairnHead` moved off the `@glw907/cairn-cms/delivery` barrel to its own `@glw907/cairn-cms/delivery/head`
  entry, so a node-environment data import from `/delivery` stays component-free. Update the import:
  `import { CairnHead } from '@glw907/cairn-cms/delivery/head'`.
```

- [ ] **Step 3: Verify the docs pass the prose guard**

Run: `prose-guard docs/creating-a-cairn-site.md && prose-guard CHANGELOG.md`
Expected: no blocking tells. The em-dash and structural checks are the blocking tier; an advisory anaphora note does not gate. If a blocking tell trips, rewrite the sentence for human cadence rather than swapping one punctuation mark.

- [ ] **Step 4: Commit**

```bash
git add docs/creating-a-cairn-site.md CHANGELOG.md
git commit -m "Document the delivery import rule and the CairnHead move

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Wire the new surface end to end in the showcase

**Files:**
- Modify: `examples/showcase/src/lib/cairn.config.ts` (the `posts` concept, near line 43)
- Create: `examples/showcase/src/routes/+page.server.ts`
- Modify: `examples/showcase/src/routes/+page.svelte`
- Modify: `examples/showcase/src/routes/[...path]/+page.svelte` (the `CairnHead` import, line 3)
- Test: the showcase production build

- [ ] **Step 1: Declare `summaryFields` on the showcase posts concept**

In `examples/showcase/src/lib/cairn.config.ts`, add `summaryFields` to the `posts` concept config (it already declares `description` in its schema). Add the line inside the `posts` object, before `schema`:

```ts
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      summaryFields: ['description'],
      schema: defineFields([
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
        { type: 'textarea', name: 'description', label: 'Description' },
        { type: 'text', name: 'image', label: 'Social image' },
        { type: 'text', name: 'author', label: 'Author' },
      ]),
    },
```

- [ ] **Step 2: Add a prerendered home load that lists post summaries**

Create `examples/showcase/src/routes/+page.server.ts`. It reads the `posts` index built in `$lib/content` and returns the summaries (which now carry `concept` and `fields`):

```ts
import type { PageServerLoad } from './$types';
import { posts } from '$lib/content';

export const prerender = true;

export const load: PageServerLoad = () => ({ posts: posts.all() });
```

- [ ] **Step 3: Render the authored summary and the concept on the home page**

Replace `examples/showcase/src/routes/+page.svelte` with a version that lists each post, reads `summary.fields.description` (the authored field, no detail read), and shows `summary.concept`:

```svelte
<!-- @component The showcase home: lists post summaries, proving summaryFields and the concept stamp
     reach a list card with no per-entry detail read. -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<h1>cairn showcase</h1>
<nav>
  <a href="/calendar">Calendar (a non-cairn feature)</a>
  <a href="/admin">Admin</a>
</nav>

<ul class="post-list">
  {#each data.posts as post (post.id)}
    <li data-concept={post.concept}>
      <a href={post.permalink}>{post.title}</a>
      {#if post.fields.description}
        <p class="summary">{post.fields.description}</p>
      {/if}
    </li>
  {/each}
</ul>
```

- [ ] **Step 4: Fix the `CairnHead` import for the breaking move**

In `examples/showcase/src/routes/[...path]/+page.svelte`, change the import on line 3 from the `/delivery` barrel to the new head entry:

```svelte
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';
```

- [ ] **Step 5: Build the showcase**

The showcase consumes the package through the `file:../..` link, so rebuild the package first, then build the showcase.

Run:
```bash
npm run package
cd examples/showcase && npm run build
```
Expected: both exit 0. The home page prerenders; the `[...path]` pages prerender with the head from the new entry.

- [ ] **Step 6: Confirm the rendered output carries the authored field and the concept**

Run (from `examples/showcase`):
```bash
grep -r 'class="summary"' .svelte-kit/output/prerendered/pages/index.html
grep -r 'data-concept="posts"' .svelte-kit/output/prerendered/pages/index.html
```
Expected: both match. The authored `description` and the `posts` concept reached the prerendered list card with no per-entry detail read. (If the adapter writes the prerendered home to a different filename, list `.svelte-kit/output/prerendered/pages/` and grep the home document.)

- [ ] **Step 7: Commit**

```bash
cd ../..
git add examples/showcase/src/lib/cairn.config.ts examples/showcase/src/routes/+page.server.ts examples/showcase/src/routes/+page.svelte examples/showcase/src/routes/[...path]/+page.svelte
git commit -m "Wire summaryFields, the concept stamp, and the head move into the showcase

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Bump the version to 0.22.0

**Files:**
- Modify: `package.json` (repo root, the `version` field)
- Test: the full gate

- [ ] **Step 1: Bump the version**

In the repo-root `package.json`, set:

```json
  "version": "0.22.0",
```

- [ ] **Step 2: Run the full gate**

Run:
```bash
npm run check && npm test && npm run check:package
```
Expected: `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0 across the unit, integration, and component projects; `check:package` exits 0. If `npm test` reports all tests passing but exits non-zero, treat it as a failure and find the unhandled rejection before continuing.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "Bump version to 0.22.0

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Done criteria

- `ContentSummary` carries `concept` and `fields`; `EntryData` carries `concept`. Every list and the catch-all entry page read them with no detail read and no `entry.date` sniffing.
- `summaryFields` is a declarative, serializable concept knob; the index copies the named keys off the validated frontmatter.
- The package root re-exports the delivery route loaders and response helpers; `CairnHead` resolves from `./delivery/head`; the `/delivery` data barrel loads in node with no Svelte plugin.
- The site guide states the import rule; the changelog records the additive surface and the one breaking import move.
- The showcase declares `summaryFields`, renders a list card from `summary.fields`, reads `data.concept`, imports the head from `/delivery/head`, and builds clean.
- Version is `0.22.0`. The full gate is green: `npm run check` 0/0, `npm test` exit 0, `npm run check:package` exit 0.

## Follow-ups (record in the post-mortem, do not do in this pass)

- The unit tests carry 13 hand-built `ConceptDescriptor` literals across 9 files, so every new resolved
  descriptor field (this pass's `summaryFields`, a future one) forces a touch through all of them. A
  shared `makeDescriptor(overrides)` test factory would localize the default to one place. It is a
  test-infra refactor with its own blast radius, so it stays out of this delivery read-model pass. Worth
  a small dedicated cleanup.

## Pass-end review gate (run after Task 9, before reporting done)

- `code-simplifier:code-simplifier` over the changed engine code.
- `svelte-reviewer` (Opus): the `EntryData` change and the showcase `+page.svelte` runes.
- `daisyui-a11y-reviewer` does not strictly apply (the showcase list is plain markup), so run it only if the list grows DaisyUI classes.
- `cloudflare-workers-reviewer` and `web-auth-security-reviewer` do not apply (no Worker, auth, session, cookie, or D1 code).
- A high-effort `/code-review` over the branch diff.
- Live `/admin` smoke does not apply (no `/admin` surface changed; the showcase runs `adapter-node`).
- Fold findings in, then update the plan post-mortem and `docs/STATUS.md` per the `cairn-pass` consolidation ritual.
