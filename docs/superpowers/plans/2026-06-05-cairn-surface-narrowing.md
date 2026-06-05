# Surface-narrowing Implementation Plan (engine-hardening pass 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (one `cairn-implementer` per task) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Run on a feature worktree off `main` (engine code change).

**Goal:** narrow the public export surface so the `.` root and `/sveltekit` stop re-exporting another subpath's symbols and the internal plumbing leaves the public API, with one canonical home per symbol.

**Architecture:** edit two barrel files (`src/lib/index.ts`, `src/lib/sveltekit/index.ts`) to remove the redundant and internal exports, relocate the one type a kept public type still needs, then prune the two reference pages to match. No symbol changes behavior; only its export location. The acceptance proof is both production sites building green against an `npm pack` tarball of the narrowed package.

**Tech Stack:** TypeScript, the svelte-check and export-coverage gates (`npm run check`, `npm run check:reference`, `npm run check:package`), `npm test` (vitest), `npm pack`, `git`.

**Design spec:** `docs/superpowers/specs/2026-06-05-cairn-surface-narrowing-design.md`.

---

## Conventions for this plan

**The gate per task.** Engine tasks (1) clear the full gate: `npm run check` 0 errors and 0 warnings, `npm test` exits 0, `npm run check:reference` exits 0, and `npm run check:package` exits 0. The reference task (2) clears `npm run check:reference` plus the grep checks. The packaging task (3) clears `npm run check:package`. The acceptance task (4) is the two-site tarball build.

**The coverage gate is one-directional.** `npm run check:reference` fails only when a reference page omits a real export (an uncovered name). It does not flag a page that documents a name no longer exported. So narrowing the surface keeps the gate green on its own; pruning the stale entries from the pages (task 2) is a manual editorial step, verified by grep.

**No behavior change.** This pass moves where symbols export from, not what they do. No test should change behavior; if a unit test imports a now-internal helper through the public barrel, that is an internal test using a relative path already, so it is unaffected. Do not weaken any test to pass.

**Prose.** Any changelog or doc prose follows the writing-voice standard (no em dashes, one idea per sentence, no banned openers). `prose-guard` gates the changelog and upgrading lines.

---

## Task 1: Narrow the `.` root and `/sveltekit` barrels

**Files:**
- Modify: `src/lib/index.ts`
- Modify: `src/lib/sveltekit/index.ts`

This task removes the redundant and internal exports from both barrels and relocates `GithubKeyEnv` to the subpath whose public type needs it. Both barrels change together because the type relocation links them, and doing both keeps `npm run check` green within the task.

- [ ] **Step 1: Record the current surface as a baseline**

```bash
npm run package
node -e "const m=require('./dist/index.js'); console.log('root runtime exports:', Object.keys(m).length)"
```

Note the count. After the narrowing it must drop (the dropped runtime names are listed below). This is an orientation baseline, not a gate.

- [ ] **Step 2: Drop the delivery read surface from `src/lib/index.ts`**

Remove the entire "Public content delivery" block and the "Root superset of the delivery route surface" block. Concretely, delete these statements from `src/lib/index.ts`:

```ts
export { permalink } from './content/permalink.js';
export { createContentIndex, fromGlob } from './delivery/content-index.js';
export type {
  RawFile,
  ContentSummary,
  ContentEntry,
  ContentIndex,
  ContentProblem,
} from './delivery/content-index.js';
export { createSiteIndex } from './delivery/site-index.js';
export type { SiteIndex, ConceptIndex } from './delivery/site-index.js';
export { createSiteIndexes } from './delivery/site-indexes.js';
export type { SiteIndexes, SiteGlobs } from './delivery/site-indexes.js';
export { deriveExcerpt, wordCount } from './delivery/excerpt.js';
export { buildRssFeed, buildJsonFeed } from './delivery/feeds.js';
export type { FeedChannel, FeedItem } from './delivery/feeds.js';
export { buildSitemap } from './delivery/sitemap.js';
export type { SitemapUrl } from './delivery/sitemap.js';
export { buildRobots } from './delivery/robots.js';
export { buildSeoMeta } from './delivery/seo.js';
export type { SeoInput, SeoMeta } from './delivery/seo.js';
export { readSeoFields, resolveImageUrl } from './delivery/seo-fields.js';
export type { SeoFields } from './delivery/seo-fields.js';
export { paginate } from './delivery/paginate.js';
export type { Page } from './delivery/paginate.js';
export { rssResponse, jsonFeedResponse, sitemapResponse, robotsResponse } from './delivery/responses.js';
export { createPublicRoutes } from './sveltekit/public-routes.js';
export type { PublicRoutesDeps, ListData, TagData, TagIndexData, EntryData } from './sveltekit/public-routes.js';
```

Also delete the two comment blocks that introduce them (the "Public content delivery (public-delivery design): ..." comment and the "Root superset of the delivery route surface: ..." comment), since their content is gone.

These symbols keep their homes: the pure projections resolve from `@glw907/cairn-cms/delivery/data` and the route loaders and `*Response` helpers from `@glw907/cairn-cms/delivery`, both unchanged.

- [ ] **Step 3: Drop the internal plumbing from `src/lib/index.ts`**

Replace the rehype-dispatch export (which mixes component-author helpers with internal hast helpers):

```ts
export {
  rehypeDispatch,
  isElement,
  strProp,
  iconSpan,
  cardShell,
  headRow,
  markFirstList,
} from './render/rehype-dispatch.js';
```

with the component-author helpers only (drop `isElement`, `strProp`, `markFirstList`):

```ts
export { rehypeDispatch, iconSpan, cardShell, headRow } from './render/rehype-dispatch.js';
```

Delete the GitHub signing and repo plumbing exports entirely:

```ts
export { appJwt, installationToken, signingSelfTest } from './github/signing.js';
export {
  treeUrl,
  markdownFilesIn,
  listMarkdown,
  contentsUrl,
  readRaw,
  fileSha,
  commitFile,
} from './github/repo.js';
```

In the credentials block, drop `appCredentials` and `GithubKeyEnv` from the root:

```ts
export { appCredentials } from './github/credentials.js';
export type { GithubKeyEnv } from './github/credentials.js';
```

Keep on the root the GitHub types and the conflict error already present (`RepoRef`, `RepoFile`, `CommitAuthor`, `AppCredentials`, `CommitConflictError`), and keep `markdownFilesIn`'s sibling intentionally removed. Leave every other root export (the engine-authoring, content-model, manifest, nav, and auth surface) exactly as is, including `verifyManifest`.

- [ ] **Step 4: Stop `/sveltekit` re-exporting the public route surface, and relocate `GithubKeyEnv`**

In `src/lib/sveltekit/index.ts`, delete the public-routes re-export block:

```ts
export { createPublicRoutes } from './public-routes.js';
export type {
  PublicRoutesDeps,
  ListData as PublicListData,
  TagData,
  TagIndexData,
  EntryData,
} from './public-routes.js';
```

`createPublicRoutes` and those types keep their `@glw907/cairn-cms/delivery` home. The remaining `/sveltekit` `ListData` is the admin list type from `content-routes.ts`, which is what both sites import, so no alias is needed.

`ContentRoutesDeps.mintToken` is typed `(env: GithubKeyEnv) => Promise<string>`, and `GithubKeyEnv` just left the root. Add its export to `/sveltekit`, its real consumer subpath, so the public `ContentRoutesDeps` type stays nameable. Add to `src/lib/sveltekit/index.ts`:

```ts
export type { GithubKeyEnv } from '../github/credentials.js';
```

- [ ] **Step 5: Run the full gate and resolve any nameability fallout**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: `npm run check` 0 errors and 0 warnings, `npm test` exits 0, `npm run check:reference` exits 0 (narrowing only reduces exports, so no page goes uncovered), `npm run check:package` exits 0.

If `npm run check` or `check:package` reports a type that "cannot be named" or is "not portable" (a kept public type transitively references a symbol that just left the public surface), keep that one type exported from the subpath whose public type needs it, the same way `GithubKeyEnv` moved to `/sveltekit`. Do not re-add a runtime helper or a delivery symbol to the root to silence it; only a transitively-required type, on its conceptual subpath.

- [ ] **Step 6: Confirm the dropped runtime names are gone from the root**

```bash
npm run package
node -e "const m=require('./dist/index.js'); for (const n of ['createSiteIndexes','buildRssFeed','rssResponse','createPublicRoutes','readRaw','fileSha','installationToken','appCredentials','isElement','strProp','markFirstList']) if (n in m) { console.error('STILL EXPORTED:', n); process.exit(1) } console.log('root narrowed: dropped runtime names absent')"
```

Expected: `root narrowed: dropped runtime names absent`, no `STILL EXPORTED` line.

- [ ] **Step 7: Commit**

```bash
git add src/lib/index.ts src/lib/sveltekit/index.ts
git commit -m "Narrow the public export surface: drop redundant and internal exports

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Prune the reference pages to the narrowed surface

**Files:**
- Modify: `docs/reference/core.md`
- Modify: `docs/reference/sveltekit.md`

The coverage gate does not flag a page that documents a now-removed export, so the dropped symbols must be pruned from the root and `/sveltekit` pages by hand. The delivery pages (`delivery.md`, `delivery-data.md`) already document the moved symbols and need no change.

- [ ] **Step 1: Prune `docs/reference/core.md`**

Remove every documented entry for a symbol dropped from the root in Task 1: the delivery read surface (`permalink`, `createContentIndex`, `fromGlob`, `createSiteIndex`, `createSiteIndexes`, `deriveExcerpt`, `wordCount`, `buildRssFeed`, `buildJsonFeed`, `buildSitemap`, `buildRobots`, `buildSeoMeta`, `readSeoFields`, `resolveImageUrl`, `paginate`, `createPublicRoutes`, `rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`, and the delivery and public-route types), and the internal plumbing (`appJwt`, `installationToken`, `signingSelfTest`, `appCredentials`, `GithubKeyEnv`, `treeUrl`, `contentsUrl`, `readRaw`, `fileSha`, `listMarkdown`, `markdownFilesIn`, `commitFile`, `isElement`, `strProp`, `markFirstList`). Match the page's existing tier structure (Stable / Low-level / Types); if a whole tier or subsection empties, remove its heading too. Add a one-line pointer where the delivery surface was documented, for example: "The public delivery read surface lives at [`/delivery`](./delivery.md) and [`/delivery/data`](./delivery-data.md)." so a reader who expected those names on the root page is redirected.

- [ ] **Step 2: Prune `docs/reference/sveltekit.md`**

Remove the documented entries for `createPublicRoutes`, `PublicRoutesDeps`, `PublicListData`, `TagData`, `TagIndexData`, and the public `EntryData` that left `/sveltekit` in Task 1. Add `GithubKeyEnv` if the page documents the `ContentRoutesDeps` type and the coverage gate now lists it as a `/sveltekit` export (Step 3 will show whether it is uncovered). Add a one-line pointer that the public route loaders live at [`/delivery`](./delivery.md).

- [ ] **Step 3: Verify coverage and the prune**

```bash
npm run package
npm run check:reference
```

Expected: exit 0 (every real export of each subpath is still covered, including any newly-listed `/sveltekit` `GithubKeyEnv`).

Then confirm the dropped names are no longer presented as root or `/sveltekit` exports:

```bash
for n in createSiteIndexes buildRssFeed rssResponse createPublicRoutes readRaw fileSha installationToken appCredentials isElement strProp markFirstList; do
  grep -qw "$n" docs/reference/core.md && echo "STALE in core.md: $n"
done
grep -qw createPublicRoutes docs/reference/sveltekit.md && echo "STALE in sveltekit.md: createPublicRoutes"
echo "(no STALE line means the pages match the narrowed surface)"
```

Expected: no `STALE` line. A surviving mention is acceptable only inside a "lives at /delivery" pointer sentence, not as a documented export entry; if grep flags a pointer-sentence mention, confirm by eye it is the redirect, not an export entry.

- [ ] **Step 4: Verify prose and commit**

```bash
prose-guard docs/reference/core.md
prose-guard docs/reference/sveltekit.md
```

Expected: no blocking tell on either page (advisory lines are non-blocking).

```bash
git add docs/reference/core.md docs/reference/sveltekit.md
git commit -m "Prune the reference pages to the narrowed surface

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Changelog, upgrade notes, and version bump

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/upgrading.md`
- Modify: `package.json`

- [ ] **Step 1: Add the changelog entry with `Consumers must:` lines**

Read the top of `CHANGELOG.md` to match its format, then add a `0.27.0` entry. It records the narrowing and carries one `Consumers must:` line per move:

```markdown
## 0.27.0

Narrowed the public export surface so each symbol has one canonical home. The `.` root and
`/sveltekit` no longer re-export another subpath's symbols, and the internal GitHub, signing, and
hast helpers left the public API. No symbol changed behavior; only where it exports from.

- Consumers must: import the delivery read helpers (`createContentIndex`, `createSiteIndexes`, the
  feed, sitemap, robots, SEO, and pagination builders, `permalink`) from `@glw907/cairn-cms/delivery/data`
  instead of the `.` root.
- Consumers must: import the public route loaders and the `*Response` helpers (`createPublicRoutes`,
  `rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`) and the public route types
  (`PublicRoutesDeps`, the public `ListData`, `TagData`, `TagIndexData`, `EntryData`) from
  `@glw907/cairn-cms/delivery` instead of the `.` root or `/sveltekit`.
- Consumers must: stop importing the internal helpers that left the public API (`appJwt`,
  `installationToken`, `signingSelfTest`, `appCredentials`, `treeUrl`, `contentsUrl`, `readRaw`,
  `fileSha`, `listMarkdown`, `markdownFilesIn`, `commitFile`, `isElement`, `strProp`, `markFirstList`);
  the engine wires GitHub token minting and the render pipeline internally, so no consumer needs them.
```

- [ ] **Step 2: Add the upgrade lines**

Append to `docs/upgrading.md`, matching its one-line-per-rename format, the moves above (delivery read helpers to `/delivery/data`; public route surface to `/delivery`; internal helpers removed).

- [ ] **Step 3: Bump the version**

In `package.json`, change `"version": "0.26.0"` to `"version": "0.27.0"` (a minor bump; `0.x` breaks between minors).

- [ ] **Step 4: Verify and commit**

```bash
prose-guard CHANGELOG.md
prose-guard docs/upgrading.md
npm run check:package
```

Expected: no blocking tell, `check:package` exits 0.

```bash
git add CHANGELOG.md docs/upgrading.md package.json
git commit -m "Bump 0.27.0 and record the surface-narrowing consumer actions

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Acceptance proof against both production sites

**Files:** none committed under the sites; this task proves the narrowed package builds the real consumers and records the evidence. **Model:** Opus (judgment across two external repos and any breakage triage).

The narrowing was audited as zero-impact on both sites, so this task is the empirical confirmation. A site that fails to build is either a real consumer break the audit missed (fix the barrel or the site, and record which) or a toolchain artifact (record it).

- [ ] **Step 1: Pack the narrowed package**

```bash
cd /home/glw907/Projects/cairn-cms
npm run package
npm pack
```

This writes `glw907-cairn-cms-0.27.0.tgz` in the repo root. Note its absolute path.

- [ ] **Step 2: Build ecnordic-ski against the tarball**

In a throwaway copy or a clean checkout of `/home/glw907/Projects/ecnordic-ski` (do not commit the dependency change), install the tarball and run the site gate:

```bash
cd /home/glw907/Projects/ecnordic-ski
npm install /home/glw907/Projects/cairn-cms/glw907-cairn-cms-0.27.0.tgz --no-save
npm run check
npm run build
```

Expected: the site's `check` shows no error in its `src/`, and `npm run build` exits 0. If `check` reports only the known duplicate-SvelteKit-toolchain artifact in `node_modules` (none in `src/`), that is the documented symlink-dev noise, not a narrowing break; record it as such. A real failure is an import of a now-moved symbol from the wrong subpath; if one appears, the audit missed it, so fix the site's import and record the miss.

- [ ] **Step 3: Build 907-life against the tarball**

```bash
cd /home/glw907/Projects/907-life
npm install /home/glw907/Projects/cairn-cms/glw907-cairn-cms-0.27.0.tgz --no-save
npm run check
npm run build
```

Expected: same as Step 2.

- [ ] **Step 4: Restore the sites' dependency and record the evidence**

Restore each site's original `@glw907/cairn-cms` dependency so the throwaway tarball install leaves no trace:

```bash
cd /home/glw907/Projects/ecnordic-ski && git checkout package.json package-lock.json 2>/dev/null; npm install >/dev/null 2>&1
cd /home/glw907/Projects/907-life && git checkout package.json package-lock.json 2>/dev/null; npm install >/dev/null 2>&1
```

Remove the tarball:

```bash
rm /home/glw907/Projects/cairn-cms/glw907-cairn-cms-0.27.0.tgz
```

Record the result (both builds green, any artifact noted) in the post-mortem at plan end. No commit in this task unless a barrel or reference fix was needed, in which case commit it against `src/lib` or `docs/reference` with a clear message and rerun the relevant gate.

---

## Task ordering

Sequence: **1, 2, 3, 4.** Task 1 narrows the barrels (the substance). Task 2 prunes the reference pages to match. Task 3 records the consumer actions and bumps the version. Task 4 proves the narrowed package builds both production sites. Tasks 1 through 3 run on the feature worktree; Task 4 reads from the worktree's `npm pack` and the two site repos.

## Phase-end ritual

After all tasks commit, before declaring the pass done:

- [ ] `npm run check` 0/0, `npm test` exits 0, `npm run check:reference` exits 0, `npm run check:package` exits 0 on the worktree.
- [ ] The dropped runtime names are absent from the built root (Task 1 Step 6 check passes).
- [ ] The reference pages carry no stale export entry for a dropped symbol (Task 2 Step 3 grep clean).
- [ ] `CHANGELOG.md` carries a `Consumers must:` line per move, and `docs/upgrading.md` has the lines.
- [ ] Both production sites build green against the `0.27.0` tarball, with any toolchain artifact recorded.
- [ ] Run the code-simplifier over the changed `src/lib` barrels before the final commit (per the repo git convention).
- [ ] Append the post-mortem to this plan and update `docs/STATUS.md`: surface-narrowing landed, the next pass is render attribute-sink hardening (pass 2 of the series), publishing held until the series and P4 sequencing decision.
- [ ] Refresh the `cairn-engine-hardening-release-gate` memory (pass 1 of 3 landed).

## Self-review notes (already applied)

- The plan covers all three spec moves (drop the delivery read surface from root, drop the internal plumbing from root, stop `/sveltekit` re-exporting the public route surface) in Task 1, the reference reconciliation in Task 2, the migration record in Task 3, and the two-site acceptance proof in Task 4.
- The `GithubKeyEnv` relocation is the one type-nameability case the design flagged; Task 1 Step 4 handles it explicitly, and Step 5 gives the general rule for any other transitively-required type the gate surfaces.
- The coverage gate's one-directional behavior is called out, so Task 2's manual prune plus grep is the correct way to catch stale page entries the gate will not.
- The acceptance proof uses an `npm pack` tarball install (the Phase 5 reproduction method), since a registry consumer installs the packaged tarball, not the source.
- No symbol changes behavior; the pass is export-location only, so no test is weakened and no new unit test is forced. The gates (`check`, `test`, `check:reference`, `check:package`) plus the two-site build are the acceptance contract.

---

## Post-mortem (executed 2026-06-05, landed on `main`)

Surface-narrowing, pass 1 of the engine-hardening series, executed subagent-driven with one
`cairn-implementer` per task on `main` directly (Geoff's call: docs-and-barrel edits gated by the
checks, no worktree). Tasks 1 and 4 ran on Opus, Tasks 2 and 3 on the Sonnet default. Four task
commits plus a simplifier comment commit:

- `15035b5` Task 1: narrow the `.` root and `/sveltekit` barrels.
- `06d31b2` Task 2: prune the reference pages.
- `04ce38b` Task 3: bump `0.27.0` and record the consumer actions.
- `8bbbf6a` simplifier: a one-line comment on the relocated `GithubKeyEnv` export.

Task 4 (the acceptance proof) committed nothing in cairn-cms; it committed one import fix in the
ecnordic-ski repo (see the carry-forwards).

### What was built

The root barrel dropped 34 names, from 90 runtime exports to 56. Three groups left it: the delivery
read surface (the content/site index builders, the feed, sitemap, robots, SEO, and pagination
builders, `permalink`, the `*Response` helpers, `createPublicRoutes`, and their types), the GitHub
signing and repo plumbing (`appJwt`, `installationToken`, `signingSelfTest`, `treeUrl`,
`markdownFilesIn`, `listMarkdown`, `contentsUrl`, `readRaw`, `fileSha`, `commitFile`,
`appCredentials`), and three internal hast helpers (`isElement`, `strProp`, `markFirstList`). The
rehype-dispatch export narrowed to the four component-author helpers (`rehypeDispatch`, `iconSpan`,
`cardShell`, `headRow`). `/sveltekit` stopped re-exporting the public route surface, so its
`ListData` is now unambiguously the admin list type and the `PublicListData` alias is gone.
`GithubKeyEnv` relocated to `/sveltekit`, the home of its real consumer (`ContentRoutesDeps.mintToken`),
which is the one type-nameability case the design flagged.

The delivery and `/delivery/data` barrels were untouched, so every dropped read symbol kept a home.
The two reference pages were pruned by hand (the coverage gate is one-directional and does not flag a
page that over-documents). `core.md` went from 174 documented names to 118; `sveltekit.md` lost the
five public-route entries and gained a `GithubKeyEnv` entry.

### Verification (evidence)

- Full gate green at the tip: `npm run check` 786 files 0 errors 0 warnings, `npm test` 114 files /
  661 tests exit 0, `npm run check:reference` exit 0 (all seven subpaths OK), `npm run check:package`
  exit 0 (all entry points across node10/node16/bundler).
- The dropped runtime names are absent from the built root (the Task 1 Step 6 node check printed
  `root narrowed: dropped runtime names absent`).
- The reference pages carry no stale export entry (the Task 2 grep printed no `STALE` line).
- Every consumer-facing home the changelog names resolves: the delivery read helpers and `permalink`
  are present on `/delivery/data`; the `*Response` helpers, `createPublicRoutes`, and the public route
  types are present on `/delivery`; `createPublicRoutes` is correctly absent from `/delivery/data`
  (it needs Svelte). Confirmed by importing the built `dist` barrels from plain Node.
- Both production sites build green against the `0.27.0` `npm pack` tarball (see carry-forwards for
  the one fix the proof drove): ecnordic-ski `check` 0/0 and `build` exit 0, 907-life `check` 0/0 and
  `build` exit 0.

### Review gate

The simplifier ran over the two changed barrels and made one comment-only edit (no symbol changed).
A high-effort `/code-review` over the full pass diff returned no finding: the change is
export-location only, the gate is green, both sites build, and every changelog home resolves. The
Worker, auth, Svelte, and a11y reviewers and the live `/admin` smoke did not apply, since the pass
changes no runtime behavior.

### Two implementer deviations, both correct

- Task 1 realigned two surface tests (`delivery-exports.test.ts`, `render-exports.test.ts`) that
  pinned the old export locations. Those tests are the contract for exactly this change, so the
  implementer rewrote them to assert the new canonical homes plus negative `name in root === false`
  assertions. This is realigning the contract, not weakening it; the tests shipped in the Task 1
  commit because the gate stays red otherwise.
- Task 3 found that `docs/upgrading.md` no longer exists; it was renamed to
  `docs/guides/upgrade-cairn.md` in the Phase 4 guides pass (`f11b370`). The implementer edited the
  real file. The plan's stale path is recorded here so a later reader corrects it.

### Carry-forwards

- **The audit had one miss, now fixed in the site.** ecnordic-ski's `src/lib/markdown/components.ts`
  root-imported `isElement` and `markFirstList`, which the narrowing dropped as internal hast
  plumbing. The fix inlined local copies in the site, since both are pure (hast types plus
  `hastscript`, already site deps), so the barrel was not weakened. Committed in ecnordic as
  `5183b3f`. 907-life imported neither, so the narrowing has zero impact there, as the audit claimed.
- **Open design question for pass 2 or P4: should a hast type guard be public?** `isElement` is a
  general hast type guard useful to any site writing custom render components, the same category as
  the kept `iconSpan`, `cardShell`, `headRow`, and `rehypeDispatch`. The approved spec drew it on the
  internal side, and the inline fix respects that, so `0.27.0` ships as designed. The question of a
  small public component-authoring render helper surface (a `/render` authoring subpath carrying
  `isElement` and friends) is worth settling when the next render-and-component pass or the scaffolder
  touches that surface. Recommendation: do not widen reflexively now; decide it where the
  component-authoring surface is in scope.
- **Both sites carry a pre-existing `composeRuntime` break against their own `^0.24.0` pin**, unrelated
  to this narrowing. Each calls the pre-0.24.0 positional `composeRuntime(cairn, [], urlPolicyFrom(...))`,
  but the signature became a single object input at `0.24.0`. The acceptance proof applied the object
  form temporarily to clear each site's build gate, then reverted it (out of scope for a narrowing
  proof). A site-migration pass must update both call sites before either site can build against
  `0.24.0` or later.
