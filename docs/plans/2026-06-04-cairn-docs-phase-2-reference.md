# Documentation Initiative Phase 2 Implementation Plan: the Reference arm

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give an external adopter one hand-curated reference page per package export subpath, each accurate against the TypeScript types and grounded in real `examples/showcase` usage, behind an automated export-coverage gate.

**Architecture:** Seven pages live under `docs/reference/`, one per importable surface, plus an index. A coverage-check script enumerates the real exported names per subpath from the built `.d.ts` through the TypeScript compiler API, and fails when a page omits an export. The script's RED output is the per-page worklist: it names every export not yet documented, so an implementer writes until green. Depth is tiered: every export is named for completeness, the primary API carries a worked example, and a pure type alias carries a signature and a sentence.

**Tech Stack:** Markdown, `prose-guard` (the writing-voice gate), the `typescript` compiler API (already a dependency, v6) for export enumeration, `vitest` (the `unit` project at `src/tests/unit/`) for the script's test, `git`.

**Design spec:** `docs/superpowers/specs/2026-06-04-cairn-docs-phase-2-reference-design.md`.

---

## Conventions for this plan

**The page gate, not the engine gate.** A reference page changes no engine code, so its verification is the docs gate, not the unit suite. For a page task (Tasks 2 through 9) the gate is three checks: `node scripts/reference-coverage.mjs <subpath>` reports `OK` (every export covered), `prose-guard <page>` shows no blocking tell, and every relative link resolves to a real file. Task 1 is the exception: it adds a real `.ts` test, so it clears `npm run check` and `npm test` like an engine task.

**The coverage check needs a built `dist/`.** It reads the `.d.ts` files `svelte-package` emits. The `npm run check:reference` wrapper runs `npm run package` first, so `npm run check:reference -- <subpath>` always checks against a fresh build. Running `node scripts/reference-coverage.mjs <subpath>` directly is the fast path once `dist/` is current.

**Tiered depth (the completeness rule).** Every name the coverage check reports is documented. A function, a component, the plugin, or the bin carries a worked snippet. A pure type alias or interface carries a signature and a one-line meaning, no snippet. The coverage check enforces presence; depth is the writer's judgment within this rule.

**Core stability tiering.** `core.md` (the `.` subpath) carries 174 exports, several of them internal helpers leaked through `export *`. The page splits them into a **Stable API** tier (the deliberate public surface, with worked examples), a **Low-level** tier (the helpers a site rarely calls, each a name and a one-line meaning, under a note that they are not part of the supported surface), and a **Types** tier (the public type aliases and interfaces, signature-plus-a-line rows). The coverage check requires every name present in some tier. This tiering applies to `core.md` only; the other pages are small enough to stay flat.

**Counts come from the tool, not this plan.** Each page task's first step runs the coverage check to print the authoritative list of names to cover. The counts named in the tasks (174 core, 29 sveltekit, 14 components, 6 delivery-own, 39 delivery-data, 6 vite) are orientation from the TypeScript checker over the built `.d.ts`; the coverage RED output is the source of truth for which names a page must name.

**The per-page template.** Every page follows one skeleton:

1. A one-line intro: what the subpath is, when to import it, and the import statement.
2. The exported symbols, functions and components first, then types.
3. Each primary symbol carries a signature, a short description, and a worked snippet. Params and the return value are called out where the signature does not make them obvious.
4. A type alias or interface carries a signature and a one-line meaning.

**Worked snippets come from the showcase.** Each page task names the `examples/showcase` files that import its subpath. Draw the snippet from real showcase usage. Where the showcase exercises no symbol on a page, write a minimal snippet that compiles against the real types.

**Prose.** All authored prose follows the writing-voice standard, so draft clean on the first pass. The advisory `prose-guard` lines (passive, tricolon, burstiness) are non-blocking; do not chase them.

---

### Task 1: The export-coverage check script and its test

**Files:**
- Create: `scripts/reference-coverage.mjs`
- Create: `src/tests/unit/fixtures/reference-coverage/a.d.ts`
- Create: `src/tests/unit/fixtures/reference-coverage/b.d.ts`
- Create: `src/tests/unit/reference-coverage.test.ts`
- Modify: `package.json` (add the `check:reference` script)

- [ ] **Step 1: Write the script**

Create `scripts/reference-coverage.mjs` with exactly this content:

```js
// cairn-cms: the reference-arm coverage gate. It enumerates the exported names of each package
// subpath from the built .d.ts through the TypeScript compiler API (so re-exports, `export *`, and
// type-only exports all resolve correctly), then asserts each name appears in that subpath's
// reference page. A missing or renamed export fails the gate. The RED output is the page worklist.
import ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Enumerate the exported names of a .d.ts module. Resolves re-exports and `export *`.
export function enumerateExports(dtsPath) {
  const program = ts.createProgram([dtsPath], {
    noEmit: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(dtsPath);
  if (!source) throw new Error(`cannot load ${dtsPath}`);
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) throw new Error(`no module symbol for ${dtsPath}`);
  return checker
    .getExportsOfModule(moduleSymbol)
    .map((s) => s.name)
    .sort();
}

// The names from `names` that do not appear as a whole-word token in the page text.
export function missingNames(names, pageText) {
  return names.filter((name) => {
    const escaped = name.replace(/[$]/g, '\\$&');
    return !new RegExp(`(?<![\\w$])${escaped}(?![\\w$])`).test(pageText);
  });
}

// One reference page per importable subpath. `excludeDts` drops a re-exported surface that is
// documented on its own page: /delivery re-exports all of /delivery/data, so the delivery page
// documents only its own additions. The /delivery/head entry points at the same delivery.md page,
// so the folded-in CairnHead is covered there.
const CONFIG = [
  { subpath: '.', dts: 'dist/index.d.ts', page: 'docs/reference/core.md' },
  { subpath: '/sveltekit', dts: 'dist/sveltekit/index.d.ts', page: 'docs/reference/sveltekit.md' },
  { subpath: '/components', dts: 'dist/components/index.d.ts', page: 'docs/reference/components.md' },
  { subpath: '/delivery', dts: 'dist/delivery/index.d.ts', page: 'docs/reference/delivery.md', excludeDts: 'dist/delivery/data.d.ts' },
  { subpath: '/delivery/data', dts: 'dist/delivery/data.d.ts', page: 'docs/reference/delivery-data.md' },
  { subpath: '/delivery/head', dts: 'dist/delivery/head.d.ts', page: 'docs/reference/delivery.md' },
  { subpath: '/vite', dts: 'dist/vite/index.d.ts', page: 'docs/reference/vite.md' },
];

function checkOne(entry) {
  const dtsPath = resolve(ROOT, entry.dts);
  if (!existsSync(dtsPath)) throw new Error(`missing ${entry.dts}; run "npm run package" first`);
  let names = enumerateExports(dtsPath);
  if (entry.excludeDts) {
    const excluded = new Set(enumerateExports(resolve(ROOT, entry.excludeDts)));
    names = names.filter((n) => !excluded.has(n));
  }
  const pagePath = resolve(ROOT, entry.page);
  if (!existsSync(pagePath)) return { subpath: entry.subpath, page: entry.page, missing: names, noPage: true };
  const missing = missingNames(names, readFileSync(pagePath, 'utf8'));
  return { subpath: entry.subpath, page: entry.page, missing };
}

function main() {
  const only = process.argv[2];
  const entries = only ? CONFIG.filter((c) => c.subpath === only) : CONFIG;
  if (only && entries.length === 0) {
    console.error(`unknown subpath ${only}`);
    process.exit(2);
  }
  let failed = false;
  for (const entry of entries) {
    const r = checkOne(entry);
    if (r.noPage) {
      console.error(`MISSING PAGE ${r.page} (${r.subpath})`);
      failed = true;
    } else if (r.missing.length) {
      console.error(`${r.subpath} (${r.page}): ${r.missing.length} uncovered: ${r.missing.join(', ')}`);
      failed = true;
    } else {
      console.log(`OK ${r.subpath} (${r.page})`);
    }
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
```

- [ ] **Step 2: Write the test fixtures**

Create `src/tests/unit/fixtures/reference-coverage/b.d.ts` with exactly:

```ts
export declare const y: number;
```

Create `src/tests/unit/fixtures/reference-coverage/a.d.ts` with exactly:

```ts
export declare const x: string;
export type T = string;
export * from './b.js';
```

- [ ] **Step 3: Write the failing test**

Create `src/tests/unit/reference-coverage.test.ts` with exactly:

```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { enumerateExports, missingNames } from '../../../scripts/reference-coverage.mjs';

const fixture = (name: string) => resolve(__dirname, 'fixtures/reference-coverage', name);

describe('enumerateExports', () => {
  it('lists own exports, type-only exports, and re-exported names', () => {
    expect(enumerateExports(fixture('a.d.ts'))).toEqual(['T', 'x', 'y']);
  });
});

describe('missingNames', () => {
  it('returns the names absent from the page text', () => {
    const text = 'Documents `foo` and the `bar` helper.';
    expect(missingNames(['foo', 'bar', 'baz'], text)).toEqual(['baz']);
  });

  it('matches a whole-word token, not a substring', () => {
    expect(missingNames(['foo'], 'this mentions foobar only')).toEqual(['foo']);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/tests/unit/reference-coverage.test.ts`
Expected: FAIL, because `scripts/reference-coverage.mjs` does not export the functions yet, or the fixtures are missing. (If Steps 1 and 2 are already complete, this passes; in that case confirm the assertions are real by temporarily breaking the fixture, then restore it.)

- [ ] **Step 5: Make it pass**

Steps 1 and 2 already wrote the implementation and fixtures. Run the test again:

Run: `npx vitest run src/tests/unit/reference-coverage.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Add the `check:reference` npm script**

In `package.json`, add this entry to `scripts`, next to `check:package`:

```json
    "check:reference": "npm run package && node scripts/reference-coverage.mjs",
```

- [ ] **Step 7: Confirm the script runs against the real build and reports the missing pages**

Run: `npm run check:reference`
Expected: it builds `dist`, then exits 1 and prints a `MISSING PAGE` line for each of the seven pages (none exist yet). This proves the gate is wired and fails closed.

- [ ] **Step 8: Clear the full gate and commit**

Run: `npm run check` (0 errors, 0 warnings) and `npm test` (exit 0).

```bash
git add scripts/reference-coverage.mjs src/tests/unit/reference-coverage.test.ts src/tests/unit/fixtures/reference-coverage package.json
git commit -m "Add the reference-arm export-coverage gate"
```

---

### Task 2: `core.md`, the root export

**Subpath:** `.`  **Page:** `docs/reference/core.md`  **Model:** Opus (174 exports and the stability-tier judgment, the heaviest page).

**Showcase anchors:** `examples/showcase/src/lib/cairn.config.ts` (`createRenderer`, `defineRegistry`, `defineFields`, `defineAdapter`, `cardShell`, `headRow`, `iconSpan`, `glyph`, `parseSiteConfig`, and the `ComponentDef`/`IconSet` types); `examples/showcase/src/routes/admin/(app)/+layout.server.ts` and the `[concept]` route servers (`composeRuntime`); `examples/showcase/src/app.d.ts` (the `Editor` type).

- [ ] **Step 1: Get the authoritative worklist**

Run: `npm run package && node scripts/reference-coverage.mjs .`
Expected: exit 1 with `MISSING PAGE docs/reference/core.md`, listing every export name to cover. This list is the worklist for this page.

- [ ] **Step 2: Write the page**

Create `docs/reference/core.md` following the per-page template and the core stability-tiering rule. The page has three tiers. Every name from the Step 1 worklist lands in exactly one tier; the coverage check only requires presence.

**Stable API.** The deliberate public surface, grouped by area with a worked snippet for each primary entry point. Suggested grouping:

- **Adapter and schema:** `defineAdapter`, `defineFields`, `defineRegistry`, `normalizeConcepts`, `findConcept`. Worked example: the showcase `cairn.config.ts` adapter.
- **Render:** `createRenderer`, `parseMarkdown`, `serializeMarkdown`, and the component-author helpers (`cardShell`, `headRow`, `iconSpan`, `glyph`). Worked example: `createRenderer` from the showcase.
- **Runtime and config:** `composeRuntime`, `parseSiteConfig`, `urlPolicyFrom`, `permalink`, the id helpers (`composeDatedId`, `idFromFilename`, `filenameFromId`, `slugFromId`, `isValidId`, `slugify`). Worked example: `composeRuntime` from the admin layout server.
- **Content and manifest:** the `createSiteIndex`/`createContentIndex`/`createSiteIndexes` family, the manifest parse/serialize/verify/diff set, the `cairn:` link helpers (`parseCairnToken`, `formatCairnToken`, `extractCairnLinks`).
- **Auth and GitHub App:** `appJwt`, `appCredentials`, `installationToken`, `buildMagicLinkMessage`, `cloudflareSend`, `commitFile`, and the error classes (`CommitConflictError`, `SiteConfigError`, `NavValidationError`).

**Low-level.** Open this tier with a one-line note that these are internal helpers, not part of the supported surface, and a site should not depend on them. List the low-level utilities the worklist reports, each a name and a one-line meaning, no example. Clear members include `signingSelfTest`, `fileSha`, `contentsUrl`, `treeUrl`, `readRaw`, `strProp`, `markFirstList`, `isElement`, `rehypeDispatch`, `remarkDirectiveStamp`, `manifestEntryFromFile`, `manifestLinkResolver`. Use judgment for the rest: a name a worked guide would never call belongs here.

**Types.** A table of the public type aliases and interfaces (the worklist names that are not functions or constants), each a signature and a one-line meaning. This is the bulk of the 174.

- [ ] **Step 3: Verify**

Run:

```bash
node scripts/reference-coverage.mjs .
prose-guard docs/reference/core.md
```

Expected: `OK . (docs/reference/core.md)` and no blocking prose tell. If the coverage check still lists names, place them in a tier and rerun.

- [ ] **Step 4: Log the over-export finding and commit**

This page is the one that surfaces it, so the finding is mandatory, not conditional. Append this entry to `docs/internal/docs-friction-log.md` under `## Findings`:

```markdown
- **developer** (public surface, from `reference/core.md`): the `.` entry exports 174 names, and
  several are internal helpers leaked through `export *` (`signingSelfTest`, `fileSha`, `contentsUrl`,
  `treeUrl`, `readRaw`, `strProp`, `markFirstList`, `isElement`, and similar). A site should not
  depend on them, and documenting them as public cements an accidental surface. Candidate: a future
  engine pass narrows `.` by stopping the `export *` leak, so the public surface is deliberate. The
  reference page tiers them as Low-level in the meantime.
```

Add any other friction this page surfaced as its own entry. Then:

```bash
git add docs/reference/core.md docs/internal/docs-friction-log.md
git commit -m "Add the core reference page"
```

---

### Task 3: `sveltekit.md`

**Subpath:** `/sveltekit`  **Page:** `docs/reference/sveltekit.md`  **Model:** Sonnet.

**Exports (29; Step 1 prints the authoritative list).** The primary functions are `createAuthGuard`, `createAuthRoutes`, `createContentRoutes`, `createEditorRoutes`, `createNavRoutes`, `createPublicRoutes`, `healthLoad`, `requireOwner`, `requireSession`. The rest are the route-data and config types (`AuthRoutesConfig`, `HealthData`, `ListData`, `LayoutData`, `EditData`, and the others the check reports), each a signature and a sentence.

**Showcase anchors:** `examples/showcase/src/routes/admin/(app)/+layout.server.ts` and the `[concept]` route servers (`createContentRoutes`); `examples/showcase/src/routes/healthz/+server.ts` (`healthLoad`); the `ListData`, `LayoutData`, `EditData` types are imported from `/sveltekit` in the admin `.svelte` files.

- [ ] **Step 1: Get the worklist**

Run: `node scripts/reference-coverage.mjs /sveltekit` (build dist first if stale: `npm run package`).
Expected: `MISSING PAGE`, listing the names.

- [ ] **Step 2: Write the page** following the template and tiered depth. The `create*Routes` functions are the primary API; show `createContentRoutes` and `healthLoad` from the showcase. The route-data types (`AuthRoutesConfig`, `HealthData`, and any `*Data` types the check reports) get a signature and a sentence.

- [ ] **Step 3: Verify**

```bash
node scripts/reference-coverage.mjs /sveltekit
prose-guard docs/reference/sveltekit.md
```

Expected: `OK` and no blocking tell.

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/reference/sveltekit.md docs/internal/docs-friction-log.md
git commit -m "Add the sveltekit reference page"
```

---

### Task 4: `components.md`

**Subpath:** `/components`  **Page:** `docs/reference/components.md`  **Model:** Sonnet.

**Exports (14 Svelte components):** `AdminLayout`, `ComponentForm`, `ComponentInsertDialog`, `ConceptList`, `ConfirmPage`, `DeleteDialog`, `EditPage`, `IconPicker`, `LinkPicker`, `LoginPage`, `ManageEditors`, `MarkdownEditor`, `NavTree`, `RenameDialog`.

**Showcase anchors:** `examples/showcase/src/routes/admin/(app)/+layout.svelte` (`AdminLayout`); `.../[concept]/+page.svelte` (`ConceptList`); `.../[concept]/[id]/+page.svelte` (`EditPage`). The showcase mounts these three directly; the rest are mounted inside the admin route shims or composed by `EditPage`/`AdminLayout`.

- [ ] **Step 1: Get the worklist**

Run: `node scripts/reference-coverage.mjs /components`.

- [ ] **Step 2: Write the page.** Each component is primary, so each gets a signature line naming its props (read them from the component's `$props()` rune in `src/lib/components/<Name>.svelte`) and a mount snippet. For the three the showcase mounts, draw the snippet from the showcase. For the rest, write a minimal `<Name {...props} />` mount with the real prop names, and note which route shim mounts it.

- [ ] **Step 3: Verify**

```bash
node scripts/reference-coverage.mjs /components
prose-guard docs/reference/components.md
```

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/reference/components.md docs/internal/docs-friction-log.md
git commit -m "Add the components reference page"
```

---

### Task 5: `delivery-data.md`

**Subpath:** `/delivery/data`  **Page:** `docs/reference/delivery-data.md`  **Model:** Sonnet. Runs before Task 6, because `delivery.md` links this page.

**Exports (39; Step 1 prints the authoritative list).** The primary functions are the builders and responders (`buildJsonFeed`, `buildLinkResolver`, `buildRobots`, `buildRssFeed`, `buildSeoMeta`, `buildSiteManifest`, `buildSitemap`, `jsonFeedResponse`, `rssResponse`, `robotsResponse`, `sitemapResponse`, `jsonLdScript`), the index builders (`createContentIndex`, `createSiteIndex`, `createSiteIndexes`), and the pure helpers (`deriveExcerpt`, `wordCount`, `paginate`, `permalink`, `fromGlob`, `resolveImageUrl`, `readSeoFields`, `siteDescriptors`). The remaining names the check reports are the data types (the feed, index, and SEO shapes), each a signature and a sentence.

**What it is:** the node-safe pure projections, with no `@sveltejs/kit` in the module graph, so a plain-Node tool (the manifest bin, the Vite plugin) imports the builders from here. The showcase `src` imports these symbols through the `/delivery` barrel, not `/delivery/data` directly, so draw snippets from the `/delivery` showcase routes (the feed, sitemap, and robots servers) and note that the same symbols import from `/delivery/data` in a plain-Node context.

- [ ] **Step 1: Get the worklist**

Run: `node scripts/reference-coverage.mjs /delivery/data`.

- [ ] **Step 2: Write the page** following the template. `buildSiteManifest`, the feed/sitemap/robots builders and responders, and the index builders are primary; show `createSiteIndexes` and a feed responder. The pure helpers (`deriveExcerpt`, `wordCount`, `paginate`, `permalink`, `fromGlob`, `resolveImageUrl`, `readSeoFields`, `jsonLdScript`, `siteDescriptors`) each get a signature and a sentence.

- [ ] **Step 3: Verify**

```bash
node scripts/reference-coverage.mjs /delivery/data
prose-guard docs/reference/delivery-data.md
```

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/reference/delivery-data.md docs/internal/docs-friction-log.md
git commit -m "Add the delivery-data reference page"
```

---

### Task 6: `delivery.md` (with `/delivery/head` folded in)

**Subpath:** `/delivery` and `/delivery/head`  **Page:** `docs/reference/delivery.md`  **Model:** Sonnet. Runs after Task 5.

**Own exports the page must name (the coverage check excludes the re-exported `/delivery/data` surface):** `createPublicRoutes`, and the route-data types `PublicRoutesDeps`, `ListData`, `TagData`, `TagIndexData`, `EntryData`. Plus `CairnHead` from `/delivery/head`, folded into this page.

**Showcase anchors:** `examples/showcase/src/routes/[...path]/+page.server.ts` (`createPublicRoutes`); `.../[...path]/+page.svelte` (`CairnHead` from `/delivery/head`); the `feed.xml`, `feed.json`, `sitemap.xml`, `robots.txt` servers import the responders through `/delivery`.

- [ ] **Step 1: Get the worklist**

Run: `node scripts/reference-coverage.mjs /delivery` and `node scripts/reference-coverage.mjs /delivery/head`.
Expected: both list the names this page must cover (`createPublicRoutes`, the five route-data types, and `CairnHead`).

- [ ] **Step 2: Write the page.** Open with the intro, then a short section stating that `/delivery` re-exports the entire `/delivery/data` surface and linking [`delivery-data.md`](./delivery-data.md) for those symbols, so they are not repeated here. Document `createPublicRoutes` with the showcase catch-all snippet, the route-data types with a signature and a sentence each, and `CairnHead` (from `@glw907/cairn-cms/delivery/head`) with the showcase head snippet. State that `CairnHead` imports from `/delivery/head`, the component-free split that keeps the data surface node-safe.

- [ ] **Step 3: Verify**

```bash
node scripts/reference-coverage.mjs /delivery
node scripts/reference-coverage.mjs /delivery/head
prose-guard docs/reference/delivery.md
test -f docs/reference/delivery-data.md && echo "link target OK"
```

Expected: both checks `OK`, no blocking tell, `link target OK`.

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/reference/delivery.md docs/internal/docs-friction-log.md
git commit -m "Add the delivery reference page"
```

---

### Task 7: `vite.md`

**Subpath:** `/vite`  **Page:** `docs/reference/vite.md`  **Model:** Sonnet.

**Exports (6):** `cairnManifest`, `CairnManifestOptions`, `buildManifestFromVite`, `verifyManifestFromVite`, `writeManifest`, `stripCairnManifest`.

**Showcase anchor:** `examples/showcase/vite.config.ts` (`cairnManifest`).

- [ ] **Step 1: Get the worklist**

Run: `node scripts/reference-coverage.mjs /vite`.

- [ ] **Step 2: Write the page.** `cairnManifest` is the primary API; show it from the showcase `vite.config.ts` with the `CairnManifestOptions` fields (`configModule`, `content`, `manifestPath`) explained. `buildManifestFromVite`, `verifyManifestFromVite`, and `writeManifest` are the lower-level functions the plugin and the bin call; give each a signature and a sentence. `stripCairnManifest` and `CairnManifestOptions` get a signature and a sentence. Cross-link the bin page for the regenerate command.

- [ ] **Step 3: Verify**

```bash
node scripts/reference-coverage.mjs /vite
prose-guard docs/reference/vite.md
```

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/reference/vite.md docs/internal/docs-friction-log.md
git commit -m "Add the vite reference page"
```

---

### Task 8: `cli-cairn-manifest.md`, the bin

**Page:** `docs/reference/cli-cairn-manifest.md`  **Model:** Sonnet.

The bin has no `.d.ts`, so the coverage check does not cover this page. Its acceptance is the page existing, `prose-guard` clean, and the documented behavior matching `src/lib/vite/bin.ts`.

**Source of truth:** `src/lib/vite/bin.ts` runs `writeManifest(process.cwd())` and exits non-zero on error. The consumer wires it as the `"cairn:manifest": "cairn-manifest"` package script (see `examples/showcase/package.json`).

- [ ] **Step 1: Write the page.** Document the `cairn-manifest` command: what it does (regenerate the committed content manifest by evaluating the `cairnManifest` virtual module in write mode through the consumer's own Vite resolution), how to run it (from the project root, wired as the `cairn:manifest` package script, no arguments), and its exit behavior (non-zero with the error message on failure). Cross-link [`vite.md`](./vite.md) for the `cairnManifest` plugin it pairs with.

- [ ] **Step 2: Verify**

```bash
prose-guard docs/reference/cli-cairn-manifest.md
test -f docs/reference/vite.md && echo "link target OK"
```

Expected: no blocking tell and `link target OK`.

- [ ] **Step 3: Commit**

```bash
git add docs/reference/cli-cairn-manifest.md docs/internal/docs-friction-log.md
git commit -m "Add the cairn-manifest CLI reference page"
```

---

### Task 9: The reference index and the docs index link

**Files:**
- Create: `docs/reference/README.md`
- Modify: `docs/README.md` (flip the Reference line from forthcoming to a link)

- [ ] **Step 1: Write `docs/reference/README.md`**

Create it with this shape, one line per page, linking all seven:

```markdown
# Reference

One page per package export subpath. The TypeScript types in `src/lib` are the source of truth, and
each page is checked against them by the export-coverage gate.

- [Core (`@glw907/cairn-cms`)](./core.md): the engine, the adapter and schema contract, render, and the runtime.
- [SvelteKit (`/sveltekit`)](./sveltekit.md): the server load and action route factories.
- [Components (`/components`)](./components.md): the admin Svelte UI.
- [Delivery (`/delivery`)](./delivery.md): the public read-model route loaders, the response helpers, and `CairnHead`.
- [Delivery data (`/delivery/data`)](./delivery-data.md): the node-safe pure projections.
- [Vite (`/vite`)](./vite.md): the `cairnManifest()` build plugin.
- [The `cairn-manifest` CLI](./cli-cairn-manifest.md): the manifest regenerate command.
```

- [ ] **Step 2: Flip the Reference line in `docs/README.md`**

In `docs/README.md`, replace the line:

```markdown
- **Reference** documents each package export. Forthcoming in a later pass.
```

with:

```markdown
- **Reference** documents each package export, one page per subpath. See the
  [reference index](./reference/README.md).
```

- [ ] **Step 3: Verify the whole arm**

Run:

```bash
npm run check:reference
prose-guard docs/reference/README.md
prose-guard docs/README.md
for p in core sveltekit components delivery delivery-data vite cli-cairn-manifest; do test -f "docs/reference/$p.md" || echo "MISSING docs/reference/$p.md"; done
```

Expected: `check:reference` prints `OK` for all seven configured subpaths and exits 0, no blocking tell, and no `MISSING` line.

- [ ] **Step 4: Commit**

```bash
git add docs/reference/README.md docs/README.md
git commit -m "Add the reference index and link it from the docs index"
```

---

## Task ordering

Link and reference dependencies fix the order: **1, 2, 3, 4, 5, 6, 7, 8, 9.** Task 1 builds the gate every page task runs. Task 5 (`delivery-data.md`) precedes Task 6 (`delivery.md`), which links it. Task 7 (`vite.md`) and Task 8 (the CLI page) cross-link, so run 7 before 8. Task 9 links all seven, so it runs last.

## Phase-end ritual

After all tasks commit, before declaring the phase done:

- [ ] Run the full coverage gate: `npm run check:reference`. Every configured subpath reports `OK` and the command exits 0.
- [ ] Run `prose-guard` across every authored page: `for f in docs/README.md docs/reference/*.md; do prose-guard "$f"; done`. No blocking tell on any.
- [ ] Confirm no dangling relative links in `docs/reference/*.md` and the flipped `docs/README.md` line.
- [ ] Confirm the gate fails closed: temporarily delete a covered name's mention from one page, run `node scripts/reference-coverage.mjs <subpath>`, see it reported, then restore the page. Record the result.
- [ ] Append any remaining design friction this phase surfaced to `docs/internal/docs-friction-log.md`.
- [ ] Update `docs/STATUS.md` to record Phase 2 landed and name Phase 3 (Explanation) as the next action, per the `cairn-pass` ritual.
- [ ] Leave the tree clean.

## Self-review notes (already applied)

- The coverage check uses the TypeScript compiler API, not a regex, so `export type { … } from` (the delivery route-data types), `export *` (the delivery-data re-export), and type-only aliases all enumerate correctly. A hand-rolled regex missed the `export type {` form during planning.
- `/delivery` excludes the `/delivery/data` surface in the check, so `delivery.md` documents only its six own exports plus `CairnHead` and does not duplicate the 23 shared symbols.
- The `/delivery/head` config entry points at `delivery.md`, so the folded-in `CairnHead` is covered on the page it lives on.
- The page gate is the docs gate (coverage, prose, links), not the unit suite, because a page changes no engine code. Task 1 is the one task that adds a test and clears the full `npm run check` and `npm test` gate.
- The CLI page has no `.d.ts`, so it is verified by existence, prose, and a read of `src/lib/vite/bin.ts`, not the coverage check.
- The phase publishes nothing and carries no version bump. It adds one repo script (`scripts/reference-coverage.mjs`) and one test.
- The TS-API enumeration was proven against the real `dist/` during planning: it resolves `export *` (delivery includes the re-exported `permalink`), the exclude logic yields delivery's exact six own exports, and the real counts are 174 core, 29 sveltekit, 39 delivery-data, 14 components, 6 vite, 1 head. The earlier grep counts undercounted, so the tasks cite the tool output, not a hand list.
- `core.md` tiers Stable, Low-level, and Types because the 174-name surface includes internal helpers leaked through `export *`. The over-export is logged as a friction finding for a future surface-narrowing engine pass (the user's call, 2026-06-04). The other pages stay flat.

---

## Post-mortem (executed 2026-06-04)

Phase 2 executed subagent-driven on `main`, one `cairn-implementer` per task, in order 1 through 9.
Task 2 (`core.md`) ran on Opus for its 174-export stability-tier judgment. The rest ran on the
Sonnet default. Nine commits `47092f8..03c1c3d`.

**What was built.** Task 1 added the export-coverage gate (`scripts/reference-coverage.mjs`, the
TypeScript compiler-API enumeration, the `check:reference` npm script) and its unit test, and
cleared the full engine gate (`npm run check` 786 files 0/0, `npm test` 114 files / 658 tests exit
0). Tasks 2 through 8 wrote the seven reference pages, each clearing the docs gate. Task 9 added the
reference index and flipped the docs-index Reference line.

**Verification, run first-hand at the phase end.** `npm run check:reference` reports `OK` for all
seven configured subpaths and exits 0. No blocking prose tell on any authored page; the remaining
tells are advisory (tricolon, burstiness, anaphora), which the plan declares non-blocking. No
dangling relative link across the reference pages or the flipped docs-index line. The gate fails
closed: blanking `stripCairnManifest` from `vite.md` reported it uncovered and exited 1, and
restoring the page returned `OK`.

**Deviation logged (Task 1).** The implementer removed three emit-only keys (`declaration`,
`declarationMap`, `rootDir`) from the shared `tsconfig.json` and added JSDoc to the script, because
the test imports the `.mjs` build tool into the check program and `svelte-check` broke without it.
Nothing emits from that tsconfig: `check` is `svelte-check` and `package` is `svelte-package`, which
computes its own dts emit. The removed keys were dead config for emit, and `npm run check:package`
stays green, which proves dts emission is unaffected. The change was accepted as a cleanup over
adding a second tsconfig.

**Friction surfaced.** Three findings in `docs/internal/docs-friction-log.md`, all pointing at one
future surface-narrowing engine pass: the `.` root over-exports 174 names with internal helpers
leaked through `export *`; the `.` root re-exports the whole delivery builder set, dual-homing those
symbols on `core.md` and the delivery pages; and `/sveltekit` re-exports the public route-data types
whose home is `/delivery`, forcing a `PublicListData` alias off a `ListData` collision.

**Tooling note.** The CLI `prose-guard <path>` exits 1 on any reported tell, advisory included, and
does not distinguish the tiers by exit code. The blocking hook that gates a file write fires only on
the blocking categories (em-dash, banned, structural, marketing). Every page commit succeeded, so no
blocking tell fired, and the advisory exit-1 is expected rather than a gate.
