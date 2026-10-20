# DX-B manifest Vite plugin Design

## Summary

DX-B replaces the per-consumer manifest boilerplate with a Vite plugin that verifies the committed
content manifest on every build and fails the build red, with a real diff, when the manifest has
drifted from the corpus. It introduces a node-safe delivery entry so the manifest builder imports
cleanly from plain Node, a shipped command that regenerates the manifest, and a structured diff that
names what drifted. It is the second of the two DX-hardening passes from the 907 migration, sequenced
after DX-A and before the `create-cairn-site` scaffolder (P4).

This spec sharpens the DX-B section of the combined hardening design
(`2026-06-04-cairn-dx-907-hardening-design.md`) with the decisions settled in the DX-B brainstorm. The
combined spec scoped the pass; this one locks the mechanism.

## The problem it closes

A consumer today carries a hand-written `scripts/build-manifest.mjs` (38 lines in the showcase, around
75 in a real site) of Node module-hook machinery. It reads the corpus through `fs`, resolves the
package main, and swaps to a `dist/delivery/manifest.js` sibling path to dodge the `/delivery` barrel,
which re-exports `createPublicRoutes` and so pulls `@sveltejs/kit` into a plain-Node import. The script
is fragile and content-agnostic (907 #2).

Underneath the script sits a correctness risk (ecnordic #13). The build-time verify reads the corpus
through Vite's `import.meta.glob`, while the regenerate script reads through `fs` and a loader shim, so
the two resolvers can disagree. The build can pass while the script writes a different file. The verify
itself reports only that the manifest drifted, not what drifted (907 #7). It runs at module evaluation
during prerender, so a drift surfaces as a page 500 that a site's `handleHttpError: 'warn'` silently
downgrades to a passing build (ecnordic #4).

## Locked decisions

The brainstorm settled four forks. Each is recorded here so the plan does not re-litigate them.

### 1. Verify reads the corpus through an in-graph virtual module

The plugin owns a virtual module that runs `import.meta.glob` over the configured content directories
inside the Vite graph. The verify therefore uses the build's own resolution, the same files and the
same ids the live indexes see, so it cannot disagree with the corpus the site actually ships. This
closes ecnordic #13 by construction rather than by a parity test.

The cost is accepted. The regenerate path must also run in a Vite context to share that resolution, and
the exact Vite mechanism for evaluating the virtual module as a hard build error inside a SvelteKit
build is the one assumption that must be proven against the real toolchain before the rest of the pass
leans on it. The first task is a spike that proves it (see Architecture).

### 2. The node-safe entry is the `/delivery/data` barrel

A new `@glw907/cairn-cms/delivery/data` entry re-exports every pure projection currently in `/delivery`.
`/delivery/index.ts` becomes `export * from './data.js'` plus `createPublicRoutes` and its route types.
`CairnHead` stays at `/delivery/head`, split in P1.

This was chosen over a narrow `@glw907/cairn-cms/manifest` entry on architecture merit, churn aside. It
fixes the root cause, that framework coupling leaked into the data barrel, rather than routing one
module around the leak. It matches the P1 `/delivery/head` split run one level deeper. It generalizes to
the next node consumer, since the feed, sitemap, and seo builders and `createSiteIndexes` are all
node-safe projections a migration script or the scaffolder will want. It also removes the P1 dual-barrel
drift follow-up, because the data export list now has one source of truth that `/delivery` re-exports.

After the split each entry has one coupling profile. `/delivery/data` is the pure corpus projections and
imports no framework. `/delivery` adds the SvelteKit route loaders. `/delivery/head` is the Svelte
component. App code keeps importing from `/delivery` unchanged.

### 3. The diff names what drifted

A pure `diffManifests(built, committed)` returns a structured diff: the added ids, the removed ids, and
the changed ids paired with the fields that differ (links, slug, date, draft). `verifyManifest` computes
it and throws an error carrying the formatted diff and a line pointing at the regenerate command. The
diff is a pure function, unit-tested apart from any build.

### 4. Regenerate is a shipped `cairn-manifest` command

The package ships a `cairn-manifest` bin. It loads the consumer's Vite config, finds the `cairnManifest`
plugin, and evaluates the same virtual module in write mode through Vite's module loader, then writes the
canonical manifest. The consumer's regenerate script collapses to `"cairn:manifest": "cairn-manifest"`,
which closes 907 #2. The build only ever verifies and never writes, so CI stays reproducible and a build
never mutates the tracked manifest. Writing is always this explicit command.

## Architecture

The pass is one cohesive plan. The tasks below are the units, each with a clear boundary.

### Task 1: toolchain spike (proves the mechanism)

Before the public surface is built, prove both mechanisms against a real SvelteKit plus Vite build in a
throwaway harness or the showcase: the virtual-module verify failing as a hard build error outside the
prerender lifecycle, and the bin evaluating the same virtual module in write mode through Vite's loader.
The spike records the working mechanism (the hook the plugin verifies in, how it loads the virtual
module, how the bin loads the consumer config without tripping SvelteKit's own plugin machinery). If the
SvelteKit build cannot host the evaluation cleanly, the mechanism is adjusted here, not after five tasks
depend on it. The spike's findings feed the plan's later tasks.

### The node-safe barrel

`src/lib/delivery/data.ts` re-exports the pure projections. `src/lib/delivery/index.ts` re-exports the
data barrel and adds `createPublicRoutes` and its types. The package gains a `./delivery/data` export. A
node-import test asserts the data barrel loads with no Svelte plugin and that its module graph reaches
neither `@sveltejs/kit` nor a `.svelte` file.

### The diff core

`diffManifests` and the `verifyManifest` upgrade live in `src/lib/content/manifest.ts` beside the
existing manifest serialize, parse, and verify. The diff type is exported so the plugin can format it.

### The plugin

`cairnManifest(options)` is exported from a new `@glw907/cairn-cms/vite` entry. Its options name the
content globs (or derive them from the adapter and site config) and the manifest path. It owns the
virtual module and runs the verify on build per the spike's mechanism. The package gains a `./vite`
export.

### The bin

The `cairn-manifest` bin loads the consumer config, finds the plugin, and runs the write path per the
spike's mechanism. The package declares the bin.

### The showcase

The showcase drops `scripts/build-manifest.mjs`, adds `cairnManifest()` to `vite.config`, points
`cairn:manifest` at the bin, and removes the in-`content.ts` verify, which the plugin now owns. The
end-to-end proof is the showcase build: a deliberately stale manifest fails it red with a printed diff,
and regenerating goes green. The proof holds regardless of the showcase's prerender error policy.

## Testing

- `diffManifests`: unit tests over added, removed, and changed entries, including which fields a changed
  entry reports.
- `verifyManifest`: a unit test that a drift throws an error carrying the diff.
- The node-safe barrel: a node-import test that `/delivery/data` loads without the Svelte plugin and
  pulls neither kit nor a `.svelte` file.
- The plugin and the bin: covered by the showcase build, the end-to-end proof. The spike establishes the
  mechanism the build then exercises on every run.
- The stale-build proof: the showcase build fails red with a diff on a deliberately stale manifest and
  passes after a regenerate.

## Versioning

DX-B bumps a minor over the DX-A `0.25.0`, for the new `@glw907/cairn-cms/vite` and
`@glw907/cairn-cms/delivery/data` entries and the `cairn-manifest` bin. The additions are additive at
the package surface. The `/delivery` internals reshuffle to re-export the data barrel, with app imports
unchanged. The changelog carries "Consumers must:" lines per the DX-A convention: add `cairnManifest()`
to the Vite config, switch the regenerate script to `cairn-manifest`, and move any node-side data import
to `/delivery/data`. The package is published before any site imports the new entries, per the
rolling-window practice.

## Out of scope

- The `create-cairn-site` scaffolder and the ecnordic items it carries (5, 6, 14), which are P4. The
  scaffolder consumes this plugin and emits the `cairnManifest()` wiring and the `cairn:manifest` script.
- The `/admin` save path, which already commits content and manifest atomically in the Worker. The local
  tool matters only for content edited outside `/admin`, such as a migration, a hand edit, or scaffold
  init, plus the build-time verify.
- Any non-Vite manifest path. The stack is Vite by assumption.

## Risks

- The bin loads a full SvelteKit Vite config and may trip SvelteKit's own plugin machinery when it
  creates a Vite context. The task-1 spike proves the load path, with a minimal Vite context or a
  vite-node invocation as the fallback if the full config is too heavy.
- The virtual-module verify must fail as a build error outside the prerender lifecycle. The spike proves
  the hook that achieves this. The current in-`content.ts` verify is the behavior being moved, so the
  showcase keeps a fallback reference until the plugin path is proven.
