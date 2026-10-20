# DX hardening from the 907 migration Design

**Status:** approved 2026-06-04.

**Goal:** Close the developer-experience findings the 907.life migration raised, split into two engine
passes before the `create-cairn-site` scaffolder (P4). Pass DX-A fixes the small engine-surface
ergonomics and writes the missing docs. Pass DX-B rebuilds the manifest toolchain as a Vite plugin so
the regenerate path and the build-time verify share one resolver and a stale manifest fails the build
red.

**Backlog source:** `cairn-dx-feedback-2026-06-04.md` (the 907 migration feedback) and
`docs/dx-backlog-ecnordic-migration.md` (the earlier ecnordic audit). The 907 doc carries the
per-finding symptom and evidence.

## Background

907.life is the second full-surface consumer migration, from `0.6.0` to `0.24.0`. Most of the
idiomatic surface dropped in cleanly. The friction clustered in render composition, the manifest
toolchain, and version upgrades. A signal runs through several findings. The migration plan was written
against the installed types by someone who knows the engine, and it still got the API wrong in a few
spots. When the expert path is wrong, the type or signature should be the thing that leads the caller
right, not more prose.

The 907 feedback mostly sharpens what the ecnordic backlog already records. Three items are new to the
engine surface (907 #1 empty registry, #4 `freetags` two-layer normalization, #6 `urlPolicy`
argument). The manifest-toolchain items (907 #2, #3, #7) restate ecnordic #13 and the fail-closed
backstop (ecnordic #4) with fresh evidence. The docs items (907 #5, #8) restate ecnordic #6 and #16.

The items already closed by earlier passes are out of scope here. P1 closed the `EntryData` concept and
the `summaryField` knob and split `CairnHead` into `/delivery/head`. P2 restored the dropped
validations. P3 closed the render and component-authoring findings. What remains splits along two
distinct verification surfaces, which is the reason for two passes rather than one.

## Pass DX-A: engine-surface ergonomics and docs

One verification surface, the public API signatures and the docs, proven by `npm run check` and
`npm test`. Low blast radius. A minor bump.

### 907 #1: the empty registry is the default

`createRenderer(registry: ComponentRegistry, options)` in `pipeline.ts` requires a full
`ComponentRegistry`, the shape `defineRegistry({ components: [] })` returns. A plain-prose blog has no
directive components, yet it still has to construct one. The migration plan wrote
`createRenderer({ defs: [] }, {})`, which fails `svelte-check` (the real shape needs `names`, `get`, and
`defaultIcon`) and runs at runtime only because plain markdown never calls a registry method. A literal
that compiles in the author's head, fails the type check, and still runs is the footgun.

The `registry` parameter becomes optional and defaults to the empty registry that
`defineRegistry({ components: [] })` produces. The common call becomes `createRenderer()`. A caller
that wants options without a registry passes `createRenderer(undefined, options)`. The parameter type
stays `ComponentRegistry`, so a caller that does pass one is still led to `defineRegistry` rather than
to a bare object literal. No call site that already passes a built registry changes.

### 907 #6: derive the URL policy, never pass it loose

`composeRuntime(adapter, extensions, urlPolicy)` takes the per-concept URL policy as a forgettable
third positional argument. The migration plan itself warned that omitting it silently breaks the admin
create flow's permalink. The delivery side already does the right thing. `siteDescriptors` in
`site-descriptors.ts` calls `normalizeConcepts(adapter.content, urlPolicyFrom(siteConfig))`, deriving
the policy from the site config. So the policy has two derivation points, and the runtime path is the
one a consumer can silently leave empty while the delivery path stays correct.

The fix gives `composeRuntime` the site config the delivery path already uses and lets it call
`urlPolicyFrom` internally, so the loose `urlPolicy` argument goes away and both paths derive from one
source. The new shape is `composeRuntime(adapter, siteConfig, extensions?)`. The argument reorder is a
break, recorded in the changelog under the #5 convention. A consumer with no site config makes
`composeRuntime` throw rather than defaulting to an empty policy, so a missing policy is loud instead of
a wrong permalink. The exact signature is settled at plan time against the real call sites. The locked
decision is that the policy is derived, not passed, and its absence throws.

### 907 #4: make the `freetags` invariant loud

The validator omits an empty list, so `schema.validate(...).data.tags` is `undefined` when tags are
absent (`validate.ts`, `if (list.length > 0) data[field.name] = list`). The read model's `asTags`
always yields `[]` (`content-index.ts`). Each rule is correct on its own. The validator keeps committed
frontmatter minimal, with no `tags: []` noise in a published file. The read model gives a consumer a
stable array to map over. The defect is that the split is invisible, so the obvious test ("absent tags
normalizes to `[]`") is true at the read layer and false at the validator, which cost a real escalation
during the migration.

Both behaviors stay. The fix makes the invariant loud rather than unifying the layers. The validated-data
type carries `tags` as optional, the read-model entry type carries `tags` as a present `string[]`, and a
doc note states the contract that validated data is minimal and the read index is filled. If the two
types already differ, the change is the doc note plus a test that locks each layer's behavior so the
contract is pinned where the escalation happened. This is a docs and types item with no behavior change.

### 907 #8: document the sanitize floor

The render path runs a `rehype-sanitize` floor with an extend-only schema, then forces
`rel="noopener noreferrer"` on `target="_blank"` anchors (the P3 `anchorRel` option). The migration
plan expected `rel` on every external link and was surprised the floor scopes it to `target="_blank"`,
which is a fine policy that was just never written down. The fix is a reference doc stating what the
floor keeps, what it strips, and what it rewrites, including the `target="_blank"` rel policy and the
extend-only escape. No engine code changes.

### 907 #5: a changelog convention for the upgrade path

Going `0.6` to `0.24` meant `renderPreview` becoming `render`, the validator member move, the `EditPage`
prop rename, the `composeRuntime` URL-policy argument, and the registry change, all landing at once.
Each fix was small. Finding them was the work. The `CHANGELOG.md` exists but reaches back only to
`0.22.0`, so the renames that bit this migration have no trail.

The fix is a convention, not a tool. Every breaking change gets a "Consumers must:" line in the
changelog stating the one edit a consumer makes. A short `docs/upgrading.md` collects the renames across
the `0.x` window so a future migration reads a checklist instead of running an investigation. The
`cairn-pass` pass-end ritual gains a step that enforces the "Consumers must:" line on any breaking
change, which is a skill edit outside this repo and is carried as a handoff item, not a code task.
Codemods are out of scope for a two-consumer library.

## Pass DX-B: the manifest Vite plugin

A separate, higher-blast-radius surface, verified by running builds and watching them fail closed. Its
detailed task plan is authored just-in-time after DX-A lands, per the rebuild's next-plan-after-prior
discipline, and because the plugin design sharpens once the node-safe subpath is real. This section
scopes it so nothing is lost.

### The problem it closes

Every consumer copies a roughly 75-line `scripts/build-manifest.mjs` of Node module-hook machinery
(`registerHooks`, `$lib` resolution, `?raw` handling, a reach into `dist/delivery/manifest.js`). It is
fragile and content-agnostic, the largest wart in the integration (907 #2). Underneath it sits a
correctness risk (ecnordic #13). The build backstop reads the corpus through Vite's `import.meta.glob`,
while the regenerate script reads through `fs` and a loader shim, so the two resolvers can disagree and
the build can pass while the script writes a different file. The verify itself reports that the manifest
drifted, not what drifted (907 #7), and it throws during prerender, surfacing as a page 500 that a
site's `handleHttpError: 'warn'` silently downgrades to a passing build (ecnordic #4).

### The design

The `/admin` save path already commits content and manifest atomically in the Worker, so the local tool
matters only for content edited outside `/admin`, such as a migration, a hand edit, or scaffold init,
plus the build-time verify.

One engine module resolves the corpus through Vite. A Vite plugin, `cairnManifest()` exported from a new
`@glw907/cairn-cms/vite` entry, calls that module in verify mode during the build. Because it runs in
the Vite graph, it uses the build's own `import.meta.glob`, `$lib`, and `?raw` resolution, the same
resolver the build uses, which closes the two-resolver divergence at the root. A drift fails the build
as a build error with a printed diff, outside the prerender request lifecycle, so it goes red regardless
of the site's `handleHttpError` policy. A thin Vite-hosted write command regenerates the committed
manifest after a manual content edit, calling the same resolver module in write mode.

The node-safe subpath (907 #3) is the prerequisite and the first task. Today the `/delivery` barrel
re-exports route loaders that import `@sveltejs/kit`, so anything wanting the manifest builder from
plain Node has to dodge the barrel. A guaranteed component-free entry (`@glw907/cairn-cms/manifest` or a
`/delivery/data` barrel) re-exports the builder with a module graph that never reaches a `.svelte` file,
so the plugin and the write command import from it cleanly. Splitting `/delivery/head` out in P1 was the
same instinct run one level deeper.

A strict mode split is the one sharp edge. The build verifies and never writes, so CI stays
reproducible and a build never mutates the tracked manifest. Writing is always an explicit command. The
showcase proves the whole path. A deliberately stale manifest fails the showcase build red, with a diff,
no matter the showcase's prerender error policy.

### What it folds

The plugin closes 907 #2 (the boilerplate goes away), #3 (the node-safe entry), and #7 (the real diff),
plus ecnordic #13 (one shared resolver) and ecnordic #4 (a build error instead of a downgradable 500).

## Forward to P4

The scaffolder consumes the cleaned surface and the new plugin, and carries the remaining ecnordic
items. It states the `cairn:` content-only constraint and confirms the picker offers only content
targets (item 5), bundles the per-version migration guide (item 6), and registers all four admin actions
by default (item 14). These stay out of scope here. The scaffolder must emit correct ergonomics, so the
DX-A and DX-B fixes exist first.

## Versioning

DX-A bumps a minor over `0.24.0`. The additions are additive (the `createRenderer` default, the type
clarifications), and the one break (the `composeRuntime` reorder) is documented under the new changelog
convention. DX-B bumps a further minor for the new `@glw907/cairn-cms/vite` and `/manifest` entries.
Publishing follows the rolling-window practice, with the package published before any site code that
imports the new entries.

## Testing

DX-A is covered by the unit and component suites at each layer.

- 907 #1: a render test asserts `createRenderer()` with no argument renders plain markdown and that a
  component directive still renders when a registry is passed.
- 907 #6: a compose test asserts the URL policy is derived from the site config and that a missing
  config throws, plus a parity test that the runtime and delivery paths produce the same policy.
- 907 #4: a content test locks the validator omitting an empty list and the read model yielding `[]`, so
  the two-layer contract is pinned.
- 907 #8 and #5: docs only, no test.

DX-B is covered at plan time by a build-level test that a stale manifest fails the build with a diff and
a node-import test that the new component-free entry loads without the Svelte plugin. The showcase
build is the end-to-end proof.

## Out of scope

- The scaffolder itself and the ecnordic items it carries (5, 6, 14), which are P4.
- Codemods for the upgrade path (907 #5); the convention and the upgrade doc are the fix.
- Unifying the two `freetags` layers (907 #4); both behaviors are correct and stay.
- Any non-Vite manifest path; the stack is Vite by assumption.
