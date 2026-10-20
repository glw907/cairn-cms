# DX-B manifest Vite plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-consumer manifest boilerplate with a Vite plugin that verifies the committed content manifest on every build and fails the build red with a real diff, plus a node-safe delivery entry and a shipped `cairn-manifest` regenerate command.

**Architecture:** A `cairnManifest()` Vite plugin from a new `@glw907/cairn-cms/vite` entry owns a virtual module that runs `import.meta.glob` over the content dirs inside the Vite graph, builds the manifest with the engine builder, and verifies it against the committed file, so verify uses the build's exact resolution and a drift fails the build outside the prerender lifecycle. A `cairn-manifest` bin evaluates the same virtual module in write mode to regenerate. A new `@glw907/cairn-cms/delivery/data` barrel re-exports the pure projections so the builder imports cleanly from plain Node.

**Tech Stack:** TypeScript, Vite plugin API, SvelteKit, Vitest (unit project), `svelte-check`, the existing `src/lib/delivery` and `src/lib/content/manifest.ts` modules, the `examples/showcase` reference consumer.

**Source spec:** `docs/superpowers/specs/2026-06-04-cairn-dx-b-manifest-plugin-design.md`.

**Worktree:** Run on a feature worktree off `main`, per the cairn rebuild topology. The per-task gate is `npm run check` (0 errors, 0 warnings) plus `npm test` (exit 0). The root `npm run check` does not typecheck or build `examples/showcase`, so the showcase tasks carry the showcase `check` and `build` explicitly.

**Execution note:** Task 1 is a toolchain spike and is judgment-heavy; dispatch it `model: opus`. Task 5 (the bin) and Task 6 (showcase finalize) are also judgment-heavy; dispatch them `model: opus`. The rest fit the Sonnet default.

---

### Task 1: Spike the Vite verify mechanism and land a minimal working plugin (907 #3 prerequisite, ecnordic #4)

The whole pass leans on one unproven assumption: that a virtual module running `import.meta.glob` plus a verify can be evaluated during a SvelteKit `vite build` such that a drift fails the build as a hard build error, outside the prerender request lifecycle. Prove it against the real toolchain before anything else builds on it, and land the proof as the minimal real plugin (verify only, using the existing `buildSiteManifest`/`verifyManifest`), wired into the showcase. This is the Plan-07 "verify locked build assumptions against the real toolchain" lesson applied first.

This task is discovery. The code below is the primary candidate to try first, not a guaranteed final shape. Record the working mechanism in the findings step so the later tasks reference what actually worked.

**Files:**
- Create: `src/lib/vite/index.ts` (the plugin)
- Modify: `examples/showcase/vite.config.ts` (wire the plugin)
- Modify: this plan file (append the findings note in Step 6)

- [ ] **Step 1: Read the current build-verify and the showcase wiring**

Read `examples/showcase/src/lib/content.ts` (the in-graph `verifyManifest(buildSiteManifest(...), manifestRaw)` call this plugin will replace), `examples/showcase/vite.config.ts`, `examples/showcase/src/lib/cairn.config.ts` (the `cairn` adapter and `siteConfig` exports), and `src/lib/delivery/manifest.ts` (`buildSiteManifest(adapter, config, globs)`) and `src/lib/content/manifest.ts` (`verifyManifest(built, committedRaw)`, `serializeManifest`). Note the showcase content globs: `/src/content/posts/*.md` and `/src/content/pages/*.md`, both read with `{ query: '?raw', import: 'default', eager: true }`, and the manifest path `/src/content/.cairn/index.json`.

- [ ] **Step 2: Write the primary-candidate plugin**

Create `src/lib/vite/index.ts`. The plugin owns a virtual module whose code runs `import.meta.glob` and the verify in the app's Vite graph, and the plugin evaluates that virtual module during the build through a nested Vite SSR module load, failing the build on a throw. Start from this candidate:

```ts
import type { Plugin } from 'vite';

/** Options for {@link cairnManifest}. Paths are app-root-absolute (the form `import.meta.glob` wants),
 *  so they match the build's own resolution. */
export interface CairnManifestOptions {
  /** The module exporting the `cairn` adapter and the parsed `siteConfig`, app-root-absolute. */
  configModule: string;
  /** Per-concept content globs, keyed by concept id, app-root-absolute. */
  content: Record<string, string>;
  /** The committed manifest path, app-root-absolute. Defaults to `/src/content/.cairn/index.json`. */
  manifestPath?: string;
}

const VIRTUAL_ID = 'virtual:cairn-manifest';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/** Build the virtual module source. In verify mode it throws on drift; in write mode it returns the
 *  serialized manifest. The module runs in the app graph, so its `import.meta.glob`, `$lib`, and `?raw`
 *  resolution is the build's own. */
function virtualSource(opts: CairnManifestOptions, mode: 'verify' | 'write'): string {
  const manifestPath = opts.manifestPath ?? '/src/content/.cairn/index.json';
  const globEntries = Object.entries(opts.content)
    .map(([id, pattern]) => `  ${JSON.stringify(id)}: import.meta.glob(${JSON.stringify(pattern)}, { query: '?raw', import: 'default', eager: true }),`)
    .join('\n');
  return `
import { buildSiteManifest } from '@glw907/cairn-cms/delivery';
import { serializeManifest, verifyManifest } from '@glw907/cairn-cms';
import { cairn, siteConfig } from ${JSON.stringify(opts.configModule)};
import committed from ${JSON.stringify(manifestPath + '?raw')};
const globs = {
${globEntries}
};
const built = buildSiteManifest(cairn, siteConfig, globs);
export const result = (${JSON.stringify(mode)} === 'write')
  ? serializeManifest(built)
  : (verifyManifest(built, committed), 'ok');
`;
}

export function cairnManifest(opts: CairnManifestOptions): Plugin {
  return {
    name: 'cairn-manifest',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) return virtualSource(opts, 'verify');
    },
    async buildStart() {
      // Evaluate the virtual module so the verify runs as a build error, outside prerender.
      // Primary candidate: a nested Vite SSR module load. The nested server MUST NOT include
      // cairnManifest again, or buildStart recurses. See the findings note for what worked.
      const { createServer } = await import('vite');
      const server = await createServer({
        configFile: false,
        root: this.meta?.watchMode ? process.cwd() : process.cwd(),
        server: { middlewareMode: true, hmr: false },
        plugins: [cairnVirtualOnly(opts, 'verify')],
        // resolve aliases for $lib and the app root come from the real config; the spike
        // determines whether configFile:false + explicit resolve is enough, or whether to
        // load the consumer config with resolveConfig and strip cairnManifest from its plugins.
      });
      try {
        await server.ssrLoadModule(VIRTUAL_ID);
      } catch (err) {
        this.error(err instanceof Error ? err.message : String(err));
      } finally {
        await server.close();
      }
    },
  };
}

/** A minimal plugin that serves only the virtual module, for the nested SSR load to avoid recursion. */
function cairnVirtualOnly(opts: CairnManifestOptions, mode: 'verify' | 'write'): Plugin {
  return {
    name: 'cairn-manifest-virtual',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) return virtualSource(opts, mode);
    },
  };
}
```

This is the candidate. The nested-server approach is the riskiest part. If it cannot resolve `$lib`, the config module, or `import.meta.glob` correctly, try in order: (a) load the consumer config with Vite's `resolveConfig`/`loadConfigFromFile` and build the nested server from it with `cairnManifest` filtered out of `plugins`; (b) use `vite-node`'s `ViteNodeRunner` against the consumer config; (c) Vite 6's Environment API module runner. The success criterion, not the mechanism, is fixed.

- [ ] **Step 3: Wire the plugin into the showcase**

In `examples/showcase/vite.config.ts`, import and add the plugin to the `plugins` array. Use the showcase's real paths:

```ts
import { cairnManifest } from '@glw907/cairn-cms/vite';
```
```ts
    cairnManifest({
      configModule: '/src/lib/cairn.config.ts',
      content: { posts: '/src/content/posts/*.md', pages: '/src/content/pages/*.md' },
      manifestPath: '/src/content/.cairn/index.json',
    }),
```

The `@glw907/cairn-cms/vite` package export does not exist yet (Task 4 adds it). For the spike, import the plugin directly from the source path so the showcase can load it, for example `import { cairnManifest } from '@glw907/cairn-cms/src/lib/vite/index.ts'` or a relative path into the linked package, and record in the findings which import form the showcase needs until Task 4 lands the export. Leave the in-`content.ts` verify in place for now as the fallback reference; Task 6 removes it once the plugin path is proven.

- [ ] **Step 4: Prove the build fails red on a stale manifest**

Run a clean showcase build and confirm it passes:
```bash
cd /home/glw907/Projects/cairn-cms-dx-b/examples/showcase && npm run build
```
Then make the committed manifest stale and confirm the build fails as a build error (non-zero exit), not a prerender warning:
```bash
cd /home/glw907/Projects/cairn-cms-dx-b/examples/showcase
node -e "const f='src/content/.cairn/index.json';const fs=require('fs');const j=JSON.parse(fs.readFileSync(f));j.entries.pop();fs.writeFileSync(f,JSON.stringify(j));"
npm run build; echo "EXIT: $?"
git checkout src/content/.cairn/index.json
```
Expected: the clean build exits 0; the stale build exits non-zero with the cairn manifest error in the output. The worktree path in the commands is illustrative; use the real worktree root.

- [ ] **Step 5: Prove a write evaluation regenerates the manifest**

Prove, even minimally, that the same virtual module in write mode can produce the serialized manifest from a Vite context (a scratch node script that creates the nested server, `ssrLoadModule(VIRTUAL_ID)` against the `write` source, and reads `result`). This de-risks Task 5 (the bin). Record the working invocation in the findings. A throwaway scratch script is fine here; it is not committed.

- [ ] **Step 6: Append the findings note to this plan**

Append a short "Task 1 findings" section to the end of this plan file stating: the exact hook and API that made the verify a build error, whether the nested server used `configFile:false` plus explicit resolve or the loaded consumer config, how recursion was avoided, the working write invocation, and the import form the showcase needed before the `/vite` export exists. Tasks 4 and 5 reference this.

- [ ] **Step 7: Gate and commit**

Run the root gate (`cd <worktree-root> && npm run check && npm test`), expecting `check` 0/0 and `npm test` exit 0 (the new plugin file must typecheck; it has no unit test yet, the showcase build is its proof). Then:
```bash
git add src/lib/vite/index.ts examples/showcase/vite.config.ts docs/superpowers/plans/2026-06-04-cairn-dx-b-manifest-plugin.md
git commit -m "Spike the cairnManifest Vite verify mechanism, proven on the showcase build"
```

---

### Task 2: The node-safe `/delivery/data` barrel (907 #3)

The `/delivery` barrel re-exports `createPublicRoutes`, which imports `@sveltejs/kit`, so a plain-Node import of the manifest builder fails (the showcase regenerate script reaches into `dist` to dodge it). Split the pure projections into a `@glw907/cairn-cms/delivery/data` barrel that imports no framework, and have `/delivery` re-export it plus the kit route loaders. This is the P1 `/delivery/head` split run one level deeper, and it gives the plugin and the bin a clean import.

**Files:**
- Create: `src/lib/delivery/data.ts`
- Modify: `src/lib/delivery/index.ts`
- Modify: `package.json` (add the `./delivery/data` export)
- Test: `src/tests/unit/delivery-data-split.test.ts`

- [ ] **Step 1: Write the failing node-import test**

Model it on `src/tests/unit/delivery-head-split.test.ts`. Create `src/tests/unit/delivery-data-split.test.ts`:

```ts
// The /delivery/data barrel is the node-safe delivery surface: pure corpus projections with no
// @sveltejs/kit and no .svelte in the graph, so a plain-Node tool (the manifest plugin, the bin,
// a migration script) imports the builder from it. The kit route loaders stay in /delivery.
import { describe, it, expect } from 'vitest';

describe('delivery data split', () => {
  it('exposes the pure projections from the data barrel', async () => {
    const data = await import('../../lib/delivery/data.js');
    expect(typeof data.buildSiteManifest).toBe('function');
    expect(typeof data.createSiteIndexes).toBe('function');
    expect(typeof data.buildRssFeed).toBe('function');
  });

  it('does not export the kit route loaders from the data barrel', async () => {
    const data = await import('../../lib/delivery/data.js');
    expect('createPublicRoutes' in data).toBe(false);
  });

  it('keeps the full /delivery barrel re-exporting both the data surface and the route loaders', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    expect(typeof barrel.buildSiteManifest).toBe('function');
    expect(typeof barrel.createPublicRoutes).toBe('function');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- --run delivery-data-split`
Expected: FAIL, because `../../lib/delivery/data.js` does not exist yet.

- [ ] **Step 3: Create the data barrel**

Create `src/lib/delivery/data.ts` with every export currently in `src/lib/delivery/index.ts` EXCEPT the `createPublicRoutes` block and its route types. Read the current `index.ts` and move these lines verbatim into `data.ts` (the pure projections):

```ts
// cairn-cms: the node-safe delivery data surface (@glw907/cairn-cms/delivery/data). The pure corpus
// projections a SvelteKit site or a plain-Node tool reads, with no @sveltejs/kit and no .svelte in
// the graph. The full ./delivery barrel re-exports this and adds the route loaders.
export { createContentIndex, fromGlob } from './content-index.js';
export type { RawFile, ContentSummary, ContentEntry, ContentIndex, ContentProblem } from './content-index.js';
export { createSiteIndex } from './site-index.js';
export type { SiteIndex, ConceptIndex } from './site-index.js';
export { createSiteIndexes } from './site-indexes.js';
export type { SiteIndexes, SiteGlobs } from './site-indexes.js';
export { siteDescriptors } from './site-descriptors.js';
export { deriveExcerpt, wordCount } from './excerpt.js';
export { buildRssFeed, buildJsonFeed } from './feeds.js';
export type { FeedChannel, FeedItem } from './feeds.js';
export { buildSitemap } from './sitemap.js';
export type { SitemapUrl } from './sitemap.js';
export { buildRobots } from './robots.js';
export { buildSeoMeta } from './seo.js';
export type { SeoInput, SeoMeta } from './seo.js';
export { readSeoFields, resolveImageUrl } from './seo-fields.js';
export type { SeoFields } from './seo-fields.js';
export { paginate } from './paginate.js';
export type { Page } from './paginate.js';
export { rssResponse, jsonFeedResponse, sitemapResponse, robotsResponse } from './responses.js';
export { jsonLdScript } from './json-ld.js';
export { permalink } from '../content/permalink.js';
export { buildSiteManifest, buildLinkResolver } from './manifest.js';
```

If the current `index.ts` export list differs from the above, take the real list from the file as the source of truth and move everything except the `createPublicRoutes` value-and-type block.

- [ ] **Step 4: Reduce `/delivery/index.ts` to re-export the data barrel plus the route loaders**

Rewrite `src/lib/delivery/index.ts` so the data exports come from the new barrel and only the kit route loaders are added here:

```ts
// cairn-cms: the public delivery entry (@glw907/cairn-cms/delivery). The node-safe data surface
// (re-exported from ./delivery/data) plus the SvelteKit catch-all route loaders. The head component
// lives at ./delivery/head. Importing this pulls @sveltejs/kit through the route loaders, so a
// plain-Node tool imports from ./delivery/data instead.
export * from './data.js';
export { createPublicRoutes } from '../sveltekit/public-routes.js';
export type {
  PublicRoutesDeps,
  ListData,
  TagData,
  TagIndexData,
  EntryData,
} from '../sveltekit/public-routes.js';
```

- [ ] **Step 5: Add the `./delivery/data` package export**

In `package.json`, add the export beside `./delivery` and `./delivery/head`:

```json
    "./delivery/data": {
      "types": "./dist/delivery/data.d.ts",
      "svelte": "./dist/delivery/data.js",
      "default": "./dist/delivery/data.js"
    },
```

Match the exact `types`/`svelte`/`default` shape of the sibling entries.

- [ ] **Step 6: Run the test and the full gate**

Run: `npm run test:unit -- --run delivery-data-split` (expect PASS), then `npm run check && npm test` (expect `check` 0/0 and `npm test` exit 0), then `npm run check:package` (expect all entries green, including the new `./delivery/data` subpath).

- [ ] **Step 7: Commit**

```bash
git add src/lib/delivery/data.ts src/lib/delivery/index.ts package.json src/tests/unit/delivery-data-split.test.ts
git commit -m "Split the node-safe /delivery/data barrel from the kit route loaders"
```

---

### Task 3: The manifest diff that names what drifted (907 #7)

`verifyManifest` throws a generic "manifest is stale" message that says nothing about what changed. Add a pure `diffManifests(built, committed)` returning the added, removed, and changed entries (a changed entry names which fields differ), and have `verifyManifest` include the formatted diff in its error.

**Files:**
- Modify: `src/lib/content/manifest.ts`
- Test: `src/tests/unit/content-manifest-diff.test.ts` (or the existing manifest test file if one covers `verifyManifest`)

- [ ] **Step 1: Confirm the manifest test file**

Run: `ls src/tests/unit | grep -iE 'manifest'`. Use the existing `verifyManifest` test location if there is one; otherwise create `src/tests/unit/content-manifest-diff.test.ts`. Read the current `verifyManifest`, `serializeManifest`, `parseManifest`, and the `ManifestEntry` type in `src/lib/content/manifest.ts` first.

- [ ] **Step 2: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { diffManifests, verifyManifest, serializeManifest, type Manifest, type ManifestEntry } from '../../lib/content/manifest.js';

const entry = (over: Partial<ManifestEntry> = {}): ManifestEntry => ({
  id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], ...over,
});

describe('diffManifests', () => {
  it('reports an added entry', () => {
    const built: Manifest = { version: 1, entries: [entry(), entry({ id: 'b', permalink: '/b', title: 'B' })] };
    const committed: Manifest = { version: 1, entries: [entry()] };
    const d = diffManifests(built, committed);
    expect(d.added.map((e) => e.id)).toEqual(['b']);
    expect(d.removed).toEqual([]);
    expect(d.changed).toEqual([]);
  });

  it('reports a removed entry', () => {
    const built: Manifest = { version: 1, entries: [entry()] };
    const committed: Manifest = { version: 1, entries: [entry(), entry({ id: 'b', permalink: '/b', title: 'B' })] };
    const d = diffManifests(built, committed);
    expect(d.removed.map((e) => e.id)).toEqual(['b']);
  });

  it('reports a changed entry with the differing fields', () => {
    const built: Manifest = { version: 1, entries: [entry({ title: 'New' })] };
    const committed: Manifest = { version: 1, entries: [entry({ title: 'Old' })] };
    const d = diffManifests(built, committed);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0].id).toBe('a');
    expect(d.changed[0].fields).toContain('title');
  });
});

describe('verifyManifest', () => {
  it('throws an error that names what drifted', () => {
    const built: Manifest = { version: 1, entries: [entry({ title: 'New' })] };
    const committed = serializeManifest({ version: 1, entries: [entry({ title: 'Old' })] });
    expect(() => verifyManifest(built, committed)).toThrow(/title/);
  });

  it('does not throw when the committed manifest matches', () => {
    const built: Manifest = { version: 1, entries: [entry()] };
    expect(() => verifyManifest(built, serializeManifest(built))).not.toThrow();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run test:unit -- --run "content-manifest-diff|manifest"`
Expected: FAIL, because `diffManifests` is not exported yet and `verifyManifest`'s message does not name fields.

- [ ] **Step 4: Implement `diffManifests` and upgrade `verifyManifest`**

In `src/lib/content/manifest.ts`, add the diff type and function, and rewrite `verifyManifest` to use it. Key the comparison by `concept` plus `id` (the manifest's identity, the same key `upsertEntry`/`removeEntry` use), and compare a changed entry field by field over the entry's own keys:

```ts
/** A changed entry and the fields that differ between the built and committed manifests. */
export interface ManifestEntryDiff {
  concept: string;
  id: string;
  fields: string[];
}

/** The drift between a freshly built manifest and the committed one, keyed by concept+id. */
export interface ManifestDiff {
  added: ManifestEntry[];
  removed: ManifestEntry[];
  changed: ManifestEntryDiff[];
}

const keyOf = (e: ManifestEntry) => `${e.concept}/${e.id}`;

/** Compare a built manifest against a committed one. Pure, so it is unit-tested apart from any build. */
export function diffManifests(built: Manifest, committed: Manifest): ManifestDiff {
  const builtByKey = new Map(built.entries.map((e) => [keyOf(e), e]));
  const committedByKey = new Map(committed.entries.map((e) => [keyOf(e), e]));
  const added = built.entries.filter((e) => !committedByKey.has(keyOf(e)));
  const removed = committed.entries.filter((e) => !builtByKey.has(keyOf(e)));
  const changed: ManifestEntryDiff[] = [];
  for (const b of built.entries) {
    const c = committedByKey.get(keyOf(b));
    if (!c) continue;
    const fields = [...new Set([...Object.keys(b), ...Object.keys(c)])].filter(
      (k) => JSON.stringify((b as Record<string, unknown>)[k]) !== JSON.stringify((c as Record<string, unknown>)[k]),
    );
    if (fields.length > 0) changed.push({ concept: b.concept, id: b.id, fields });
  }
  return { added, removed, changed };
}

/** Format a diff into a short human-readable block for a build error. */
function formatDiff(d: ManifestDiff): string {
  const lines: string[] = [];
  for (const e of d.added) lines.push(`  + ${keyOf(e)}`);
  for (const e of d.removed) lines.push(`  - ${keyOf(e)}`);
  for (const e of d.changed) lines.push(`  ~ ${e.concept}/${e.id} (${e.fields.join(', ')})`);
  return lines.join('\n');
}
```

Then rewrite `verifyManifest` to parse the committed manifest, compare the canonical serialized forms (the existing semantic-equality guard), and on a mismatch throw with the formatted diff. Keep the regenerate hint:

```ts
export function verifyManifest(built: Manifest, committedRaw: string): void {
  if (committedRaw === serializeManifest(built)) return;
  const diff = diffManifests(built, parseManifest(committedRaw));
  throw new Error(
    'content manifest is stale: the committed file does not match the corpus.\n' +
      formatDiff(diff) +
      '\nRegenerate it (npm run cairn:manifest) and commit the result.',
  );
}
```

Export `diffManifests`, `ManifestDiff`, and `ManifestEntryDiff` from the module. If `parseManifest` is defined after `verifyManifest` in the file, function hoisting still applies; keep the existing order.

- [ ] **Step 5: Export the diff types from the package root**

In `src/lib/index.ts`, add `diffManifests` to the manifest value export block and `ManifestDiff`, `ManifestEntryDiff` to the manifest type export block (match the existing block shape around `serializeManifest`/`verifyManifest` and `Manifest`/`ManifestEntry`).

- [ ] **Step 6: Run the tests and the full gate**

Run: `npm run test:unit -- --run "content-manifest-diff|manifest"` (expect PASS), then `npm run check && npm test` (expect `check` 0/0, `npm test` exit 0).

- [ ] **Step 7: Commit**

```bash
git add src/lib/content/manifest.ts src/lib/index.ts src/tests/unit/content-manifest-diff.test.ts
git commit -m "Add diffManifests and make verifyManifest name what drifted"
```

---

### Task 4: Package the plugin at `@glw907/cairn-cms/vite` and wire in the diff (907 #2)

Promote the spiked plugin to a real package entry and point its imports at the node-safe data barrel and the diff. The plugin's virtual module imports the builder; route it through `@glw907/cairn-cms/delivery/data` so the plugin never depends on the kit-coupled barrel. Fold the structured diff into the build-error output per the spike's mechanism.

**Files:**
- Modify: `src/lib/vite/index.ts`
- Modify: `package.json` (add the `./vite` export)
- Modify: `examples/showcase/vite.config.ts` (switch to the package import)

- [ ] **Step 1: Point the virtual module at the data barrel**

In `src/lib/vite/index.ts`, change the virtual module source so the builder comes from the node-safe barrel:

```ts
import { buildSiteManifest } from '@glw907/cairn-cms/delivery/data';
import { serializeManifest, verifyManifest } from '@glw907/cairn-cms';
```

`verifyManifest` now throws the structured diff (Task 3), so the build error already carries it; confirm the spike's `this.error(...)` surfaces the full message. If the spike captured the verify result differently, keep that mechanism and just confirm the diff text reaches the build output.

- [ ] **Step 2: Add the `./vite` package export**

In `package.json`, add:

```json
    "./vite": {
      "types": "./dist/vite/index.d.ts",
      "default": "./dist/vite/index.js"
    },
```

The `/vite` entry is plain Node (a build tool), so it needs no `svelte` condition; match the `types`/`default` shape and omit `svelte`.

- [ ] **Step 3: Switch the showcase to the package import**

In `examples/showcase/vite.config.ts`, change the spike's direct-source import to the package entry:

```ts
import { cairnManifest } from '@glw907/cairn-cms/vite';
```

- [ ] **Step 4: Verify the package surface and the showcase build**

Run: `npm run check && npm test` (root gate, expect `check` 0/0 and `npm test` exit 0), then `npm run check:package` (expect the new `./vite` entry green). Then the showcase:
```bash
cd <worktree-root>/examples/showcase && npm run check && npm run build
```
Expect the showcase `check` 0 errors and the build exit 0 with the plugin verifying via the package import. Re-run the stale-manifest red check from Task 1 Step 4 to confirm the diff appears in the failure output.

- [ ] **Step 5: Commit**

```bash
git add src/lib/vite/index.ts package.json examples/showcase/vite.config.ts
git commit -m "Publish the cairnManifest plugin at @glw907/cairn-cms/vite with the drift diff"
```

---

### Task 5: The `cairn-manifest` regenerate bin (907 #2)

Replace the hand-written `scripts/build-manifest.mjs` with a shipped `cairn-manifest` bin that evaluates the same virtual module in write mode through a Vite context, sharing the build's resolution, and writes the canonical manifest. Use the write invocation the spike proved in Task 1 Step 5.

**Files:**
- Create: `src/lib/vite/bin.ts` (the bin entry, or the path the spike's write mechanism wants)
- Modify: `src/lib/vite/index.ts` (export a `writeManifest` helper the bin calls, if the spike's mechanism uses one)
- Modify: `package.json` (declare the `bin`)

- [ ] **Step 1: Implement the write path per the spike's mechanism**

Add the write entry that the spike's findings prescribe. The shape depends on what worked in Task 1 Step 5; the contract is fixed even if the mechanism varies: it loads the consumer's Vite config (so resolution matches the build), evaluates the virtual module in write mode, and writes the serialized manifest to the configured `manifestPath`. Export a `writeManifest(cwd?)` function from the plugin module that the bin calls, so the logic is testable apart from the CLI shell. The bin file is a thin shell:

```ts
#!/usr/bin/env node
import { writeManifest } from './index.js';
writeManifest(process.cwd()).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

`writeManifest` finds the consumer's Vite config, locates the `cairnManifest` plugin instance to read its options (the content globs, the config module, the manifest path), evaluates the virtual module in write mode, and writes `manifestPath`. If reading options off the plugin instance is awkward in the resolved config, have `cairnManifest` stash its options on a known symbol the write path reads, and record that in the bin.

- [ ] **Step 2: Declare the bin**

In `package.json`, add:

```json
  "bin": {
    "cairn-manifest": "./dist/vite/bin.js"
  },
```

Confirm `svelte-package` emits `dist/vite/bin.js` with the shebang preserved; if it strips the shebang or skips the file, record the workaround (for example a `files`/`publishConfig` note) in the commit message.

- [ ] **Step 3: Repoint the showcase regenerate script and delete the old script**

In `examples/showcase/package.json`, change the script:
```json
    "cairn:manifest": "cairn-manifest",
```
Delete `examples/showcase/scripts/build-manifest.mjs`.

- [ ] **Step 4: Prove the bin regenerates the manifest**

From the showcase, make the manifest stale, run the bin, and confirm it restores the correct file:
```bash
cd <worktree-root>/examples/showcase
node -e "const f='src/content/.cairn/index.json';const fs=require('fs');const j=JSON.parse(fs.readFileSync(f));j.entries.pop();fs.writeFileSync(f,JSON.stringify(j));"
npm run cairn:manifest
npm run build; echo "BUILD EXIT: $?"
git status --short src/content/.cairn/index.json
```
Expected: `npm run cairn:manifest` rewrites the file, the subsequent build exits 0, and the regenerated file matches the committed one (clean `git status`, or a diff only where the deliberate staleness was). Restore with `git checkout` if needed.

- [ ] **Step 5: Run the root gate and commit**

Run `cd <worktree-root> && npm run check && npm test` (expect `check` 0/0, `npm test` exit 0) and `npm run check:package`. Then:
```bash
git add src/lib/vite/bin.ts src/lib/vite/index.ts package.json examples/showcase/package.json
git rm examples/showcase/scripts/build-manifest.mjs
git commit -m "Ship the cairn-manifest regenerate bin and drop the hand-written script"
```

---

### Task 6: Finalize the showcase and prove the end-to-end fail-closed (ecnordic #4, #13)

Remove the now-redundant in-`content.ts` verify so the plugin is the single source of the build-time check, and prove the whole path end to end: a deliberately stale manifest fails the showcase build red with a diff regardless of the prerender error policy, and a regenerate makes it green.

**Files:**
- Modify: `examples/showcase/src/lib/content.ts`

- [ ] **Step 1: Remove the in-`content.ts` verify**

In `examples/showcase/src/lib/content.ts`, delete the `verifyManifest(buildSiteManifest(...), manifestRaw)` line and the now-unused `verifyManifest`/`buildSiteManifest`/`manifestRaw` imports it relied on, keeping the `createSiteIndexes` wiring intact. The plugin now owns the build-time verify.

- [ ] **Step 2: Confirm the prerender policy does not mask the failure**

Check the showcase's `handleHttpError` setting (in `svelte.config.js` or the prerender config). The plugin's build error is outside the prerender lifecycle, so it must fail the build even when `handleHttpError` is `warn`. If the showcase does not already set `handleHttpError: 'warn'`, set it for this proof so the test is meaningful, and note it; this is the exact ecnordic #4 condition.

- [ ] **Step 3: Prove red on stale, green on regenerate**

```bash
cd <worktree-root>/examples/showcase
npm run build; echo "CLEAN EXIT: $?"
node -e "const f='src/content/.cairn/index.json';const fs=require('fs');const j=JSON.parse(fs.readFileSync(f));j.entries.pop();fs.writeFileSync(f,JSON.stringify(j));"
npm run build; echo "STALE EXIT: $?"
npm run cairn:manifest
npm run build; echo "REGEN EXIT: $?"
git checkout src/content/.cairn/index.json
```
Expected: CLEAN exit 0, STALE non-zero with the diff in the output, REGEN exit 0. Record this as the pass's end-to-end evidence.

- [ ] **Step 4: Showcase check and commit**

Run `cd <worktree-root>/examples/showcase && npm run check && npm run build` (expect 0 errors, build exit 0) and the root gate `cd <worktree-root> && npm run check && npm test`. Then:
```bash
git add examples/showcase/src/lib/content.ts examples/showcase/svelte.config.js
git commit -m "Let the plugin own the showcase manifest verify and prove fail-closed end to end"
```
Include `svelte.config.js` only if Step 2 changed it.

---

### Task 7: Version bump, changelog, and upgrade guide

Bump the minor for the new `@glw907/cairn-cms/vite` and `@glw907/cairn-cms/delivery/data` entries and the bin, and record the consumer actions under the DX-A "Consumers must:" convention.

**Files:**
- Modify: `package.json` (version)
- Modify: `package-lock.json` (version)
- Modify: `CHANGELOG.md`
- Modify: `docs/upgrading.md`

- [ ] **Step 1: Bump the version**

In `package.json`, bump the minor from `0.25.0` to `0.26.0`. Then reconcile the lockfile: run `npm install --package-lock-only --ignore-scripts` and confirm `git diff --stat package-lock.json` shows only the two top-level `"version"` fields moving to `0.26.0`; if it pulls unrelated churn, discard and hand-edit only those two fields.

- [ ] **Step 2: Add the changelog entry**

In `CHANGELOG.md`, add a top `## 0.26.0` entry matching the file's heading style, with a `Consumers must:` line per breaking or action-requiring change:

```markdown
## 0.26.0

### Added
- A `cairnManifest()` Vite plugin (`@glw907/cairn-cms/vite`) verifies the committed content manifest on
  every build and fails the build with a diff naming what drifted, outside the prerender lifecycle so it
  is not masked by `handleHttpError`. Consumers must: add `cairnManifest({ configModule, content,
  manifestPath })` to the Vite config.
- A `cairn-manifest` bin regenerates the committed manifest from a Vite context. Consumers must: set the
  regenerate script to `"cairn:manifest": "cairn-manifest"` and delete the hand-written
  `scripts/build-manifest.mjs`.
- A node-safe `@glw907/cairn-cms/delivery/data` entry exposes the pure delivery projections with no
  `@sveltejs/kit` in the graph. Consumers must: move any plain-Node import of a delivery data helper
  (such as `buildSiteManifest`) from `@glw907/cairn-cms/delivery` to `@glw907/cairn-cms/delivery/data`.

### Changed
- `verifyManifest` now throws an error that names the added, removed, and changed entries. Consumers
  must: nothing; the message is strictly more informative.
```

- [ ] **Step 3: Update the upgrade guide**

In `docs/upgrading.md`, add the `0.26.0` renames in the same one-line-per-action style the file uses: the Vite plugin wiring, the regenerate-script switch, and the `/delivery/data` import move for node-side data imports.

- [ ] **Step 4: Verify the prose and the gate**

Run `prose-guard CHANGELOG.md && prose-guard docs/upgrading.md` (expect clean; rewrite any flagged sentence rather than swapping mechanically). Then `npm run check && npm test` (expect `check` 0/0, `npm test` exit 0) and `npm run check:package`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json CHANGELOG.md docs/upgrading.md
git commit -m "Bump 0.26.0 with the manifest plugin changelog and upgrade notes"
```

---

## Self-review notes

- **Spec coverage.** 907 #2 (boilerplate goes away) is Tasks 4 and 5. 907 #3 (node-safe entry) is Task 2, with the plugin and bin importing from it in Tasks 4 and 5. 907 #7 (the real diff) is Task 3, surfaced in Tasks 4 and 6. ecnordic #13 (one shared resolver) is the Task 1 in-graph virtual module that Tasks 4 and 5 both evaluate. ecnordic #4 (build error not a downgradable 500) is proven in Task 1 and end to end in Task 6.
- **The spike is first by design.** The one unproven assumption (the Vite evaluation mechanism) is Task 1, before the public surface is built. Its findings note feeds Tasks 4 and 5, which reference the proven mechanism rather than re-deriving it.
- **Out of scope, as the spec states.** No scaffolder (P4), no `/admin` save-path change (the Worker already commits the manifest atomically), no non-Vite path.
- **Type and name consistency.** The plugin is `cairnManifest` with `CairnManifestOptions { configModule, content, manifestPath? }` throughout. The diff is `diffManifests` returning `ManifestDiff { added, removed, changed }` with `ManifestEntryDiff { concept, id, fields }`. The node-safe entry is `@glw907/cairn-cms/delivery/data`, the plugin entry `@glw907/cairn-cms/vite`, the bin `cairn-manifest`.
- **Discovery honesty.** Task 1 gives a concrete primary candidate with code and fixed success criteria, plus ordered fallbacks, because the exact Vite mechanism is what the spike exists to settle. Tasks 4 and 5 say "per the spike's mechanism" deliberately, since pinning fake code there would be a placeholder.
- **Gate scope.** The root `npm run check` does not cover `examples/showcase`, so Tasks 1, 4, 5, and 6 run the showcase `check` and `build` themselves. Every task clears the root gate and `check:package` where the package surface changed.

## Versioning and publishing

DX-B bumps to `0.26.0` (Task 7). Publishing follows the rolling-window practice and is held until the user asks. The package must be published before any site imports `@glw907/cairn-cms/vite`, `@glw907/cairn-cms/delivery/data`, or the `cairn-manifest` bin. Do not publish or push as part of executing this plan.

---

## Task 1 findings

The primary candidate worked, with one adjustment to the nested-server construction. The mechanism is proven against the real showcase toolchain (`@sveltejs/kit` 2.61.1, `vite` 8.0.14, `@sveltejs/adapter-node` 5.5.4, `svelte` 5.56.0).

### The hook and API that made the verify a build error

Verification runs in the plugin's `buildStart` hook, which calls `this.error(message)` on a throw. A stale-manifest build failed with exit 1, printed `[plugin cairn-manifest] RolldownError: content manifest is stale...`, and showed `PluginContextImpl.buildStart` in the failure stack. Crucially the failure fired at `0 modules transformed`, before any module load and before prerender, so it is a hard build error that `handleHttpError: 'warn'` cannot reach. This closes ecnordic #4 by construction.

The verify body is a nested Vite SSR module load. The plugin owns a virtual module (`virtual:cairn-manifest`, resolved id `\0virtual:cairn-manifest`) whose generated source runs `import.meta.glob` over the configured content globs, calls `buildSiteManifest`, and runs `verifyManifest(built, committed)`, then exports `result`. Inside `buildStart` the plugin creates a second, throwaway Vite server in `middlewareMode` and calls `server.ssrLoadModule('virtual:cairn-manifest')`. A throw inside the virtual module propagates out of `ssrLoadModule` and into `this.error`. So the verify runs inside the app's own Vite resolution, and its globs, package imports, and `?raw` reads are the build's own.

### The nested server uses the loaded consumer config, not configFile:false plus explicit resolve

A bare `configFile: false` plus `process.cwd()` root was not enough on its own. The virtual module imports `/src/lib/cairn.config.ts` and reads `/src/content/.cairn/index.json?raw`, both of which need the consumer's resolution (the app root, the `?raw` handling, and SvelteKit's plugin pipeline). So the working shape loads the consumer's real config with Vite's `loadConfigFromFile({ command: 'build', mode: 'production' }, undefined, root)`, spreads that loaded config into `createServer`, sets `root` to the resolved app root, and sets `configFile: false` so Vite does not re-read and re-merge the file on top of the spread. That app root comes from the plugin's `configResolved(config)` hook, captured into a closure variable, so the nested server loads the same root the outer build resolved.

### How recursion was avoided

A nested server must not include `cairnManifest` again, or its `buildStart` would recurse. So the plugin filters the loaded config's `plugins` list, dropping any plugin whose `name` is `cairn-manifest` (the guard is `isCairnManifestPlugin`, shape-safe against falsy and nested entries), and appends a minimal `cairnVirtualOnly` plugin that serves only the virtual module and carries no `buildStart`. SvelteKit's own plugins stay in the nested server (so `$lib`, `?raw`, and `import.meta.glob` still resolve), and only the recursing plugin is lost.

### The working write invocation

The same virtual module in write mode exports `serializeManifest(built)` as `result` and skips the committed-file import. A scratch script imported `buildManifestFromVite(opts, process.cwd())` from `dist/vite/index.js`, ran it from the `examples/showcase` directory, and got back the serialized manifest. It matched the committed `index.json` byte for byte (903 bytes, `MATCHES COMMITTED: true`). So `buildManifestFromVite(opts, root)` is the write path Task 5's bin calls: load the consumer config, eval the write-mode virtual module, read `result`, write it to `manifestPath`. The plugin already exports `buildManifestFromVite` and `verifyManifestFromVite` for the bin to reuse, so the bin needs no new evaluation code.

### The import form the showcase needed before the /vite export exists

No `@glw907/cairn-cms/vite` package export exists yet, and the package `exports` map blocks a deep `@glw907/cairn-cms/src/...` subpath import. So the showcase imported the plugin by relative path into the linked package source: `import { cairnManifest } from '../../src/lib/vite/index.ts'` in `examples/showcase/vite.config.ts` (the `node_modules/@glw907/cairn-cms` symlink points at the worktree root, so `../../src` from the showcase reaches the plugin source). Vite processes the config as TypeScript, so the `.ts` extension on the relative import is fine. Task 4 adds the `./vite` export and switches this line to `import { cairnManifest } from '@glw907/cairn-cms/vite'`.

One operational note for Task 4 and Task 5: the virtual module imports `@glw907/cairn-cms/delivery` and `@glw907/cairn-cms`, which resolve through the package `exports` to `dist`. So `npm run package` must run after any `src` change before a showcase build sees the new builder code. The relative plugin import dodges this for the plugin itself, but the virtual module's package imports do not.

---

## Post-mortem (executed 2026-06-04, subagent-driven on the `dx-b-manifest-plugin` worktree off `main`)

DX-B is executed and review-gated. It ran one `cairn-implementer` per task (Opus for the spike, the package entry, the bin, and the showcase finalize; Sonnet for the barrel split, the diff, and the version bump), each verified at its commit before the next dispatched. The minor bumps to `0.26.0`. The work is on local `main` only, not pushed, not published.

### What landed

The seven plan tasks landed across nine commits (`26fee41..bb4823b`), plus a review fold-in `fce30ab`. The Vite plugin `cairnManifest()` ships from a new `@glw907/cairn-cms/vite` entry. It owns the `virtual:cairn-manifest` module that runs `import.meta.glob` over the configured content globs inside the app's own Vite graph, builds the manifest with the engine builder, and verifies it against the committed file. The verify runs in the plugin's `buildStart` through a nested Vite SSR module load, so a drift fails the build as a hard error outside the prerender lifecycle. A `cairn-manifest` bin evaluates the same virtual module in write mode and regenerates the committed manifest from the same resolution the build verifies with. A node-safe `@glw907/cairn-cms/delivery/data` barrel re-exports the pure corpus projections with no `@sveltejs/kit` in the graph, so the plugin and the bin import the builder from plain Node. `verifyManifest` now throws an error that names the added, removed, and changed entries through a pure `diffManifests`. The showcase drops its hand-written `scripts/build-manifest.mjs`, wires `cairnManifest()` into `vite.config.ts`, points `cairn:manifest` at the bin, and removes its in-`content.ts` verify, which the plugin now owns.

### Evidence

The gate at the fold-in tip `fce30ab`, run first-hand: `npm run check` 781 files 0 errors 0 warnings exit 0, `npm test` 113 files / 655 tests exit 0, `npm run check:package` all entries green including the new `./vite` and `./delivery/data` subpaths. The headline end-to-end proof is the showcase production build with `prerender.handleHttpError: 'warn'` set (the exact ecnordic #4 condition): a clean build exits 0, a deliberately stale manifest fails the build with exit 1 in `buildStart` at `0 modules transformed` (before any prerender) carrying the structured diff (`+ posts/2026-03-10-callout`) and the regenerate hint, and `npm run cairn:manifest` followed by a rebuild goes green. The bin regenerates a byte-matching manifest, and `dist/vite/bin.js` carries the shebang and the execute bit after `npm run package`. The Task 1 spike proved the nested-SSR verify mechanism against the real showcase toolchain before the public surface was built, the locked-build-assumption lesson applied first.

### Decisions locked in

The four brainstorm forks held through execution. The verify reads the corpus through an in-graph virtual module, so it shares the build's exact resolution and closes ecnordic #13 by construction. The node-safe entry is the `/delivery/data` barrel, chosen over a narrow `/manifest` entry, so the kit coupling is isolated generally. The diff names what drifted through `diffManifests`. Regenerate is the shipped `cairn-manifest` bin, so a build only ever verifies and never mutates the tracked manifest. Two execution decisions reinforce this. `writeManifest` reads the plugin options off a `Symbol.for('cairn-cms.manifest-options')` stash on the plugin instance in the loaded config, so the bin shares the exact options the build verifies with. `npm run package` sets the bin executable (`svelte-package && chmod +x dist/vite/bin.js`, with `prepare` routed through `package`), so the bin is correct in dev and in the published tarball.

### Review gate

The simplifier found no change. The authored code is already at the clarity bar, and the load-bearing nested-SSR mechanism is fenced off. The relevant scoped reviewers did not apply: no Worker, auth, session, or `.svelte` surface changed, and the showcase runs `adapter-node`, so the live `/admin` smoke did not apply. A high-effort `/code-review` ran across three finder angles (line-by-line, removed-behavior plus cross-file, node-safety plus cleanup). It found no critical build-breaking bug. The node-safety guarantee was verified empirically: a reviewer imported the built `dist/delivery/data.js` from plain Node and it loaded with no kit in the graph. Two confirmed findings folded in as `fce30ab`. The manifest diff now canonicalizes the built side before comparing, so a links reorder no longer reports a false `links` drift in the diagnostic (it reuses the already-computed serialized form). The recursion-avoidance plugin strip is now recursive, mirroring `findCairnOptions`, so a `cairnManifest()` nested in a shared-preset sub-array can no longer survive into the nested verify server.

### The showcase `npm run check` is environmentally confounded in symlink-dev

The showcase `npm run check` reports about 24 type errors in this dev worktree, all in `node_modules` or the `vite.config.ts` plugin-type line, none in `examples/showcase/src/`. The cause is the worktree-root install carrying its own physical SvelteKit toolchain (vite 8.0.16, kit, svelte, esrap), which `svelte-check` reaches through the `file:../..` package symlink and sees as a second ambient-declaration copy alongside the showcase's own (vite 8.0.14). The proven `main` checkout has no physical vite at its root, so its showcase check is clean. This is the DX-A "duplicate physical toolchain copies" carry-forward made concrete, an install-topology artifact rather than a code defect. The published-consumer case is unaffected: a registry install carries no bundled vite, so `import('vite')` resolves to the consumer's single copy. The acceptance proof for the showcase tasks is the production build, which does not typecheck `node_modules` and is green.

### Carry-forwards (from the review gate, for P4 or a later touch)

The `cairn-manifest` bin resolves the output path and the eval root against `process.cwd()`, while the plugin verifies against the resolved Vite `config.root`. The two agree for every real consumer, since a SvelteKit site runs the bin from its project root where `config.root` defaults to cwd. They would diverge only under a custom Vite `root`, where the bin would read the wrong corpus and write to the wrong path. The principled fix separates the config-file location from the Vite root in `writeManifest`. It is deferred because no current consumer sets a custom root and a blind fix risks the common case. The node-safety guarantee is proven empirically this pass, but the unit test only asserts the data barrel under vitest, so a plain-Node dist-spawn test would rot-proof it. A first build before the manifest file exists (a freshly scaffolded site that has not run `cairn:manifest`) fails with a cryptic Vite resolve error rather than a "run cairn:manifest" message, which the P4 scaffolder should address since it emits the wiring. Lower-severity observations recorded and not acted on: the verify spins up a full nested Vite server per build, `writeManifest` loads the consumer config twice per run, and a byte-corrupt committed manifest surfaces a `parseManifest` error rather than the stale message. The DX-A showcase-install carry-forward (pin or dedupe the SvelteKit toolchain against the linked package) now also covers the symlink-dev showcase-check confound above, and feeds the scaffolder.
