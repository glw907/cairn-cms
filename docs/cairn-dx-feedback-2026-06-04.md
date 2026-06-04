# cairn-cms developer-experience feedback

**Source.** The 907.life migration from cairn-cms `0.6.0` to `^0.24.0` (907 Pass 16, shipped
2026-06-04). This is brainstorm input for a future cairn-cms pass, not a plan. Each item carries the
symptom, the evidence from the migration, and one possible direction. The directions are starting
points to argue with, not decisions.

## Context

907.life is consumer #2 of cairn-cms. The migration moved it onto the full idiomatic public surface:
engine render, the `content.ts` delivery layer, the `[...path]` catch-all, the committed-manifest
backstop, and the feed/sitemap/robots helpers. Most of it dropped in cleanly. The friction clustered
in render composition, the manifest toolchain, and version upgrades.

A useful signal runs through several of these. The migration plan was written against the installed
0.24.0 types by someone who knows the engine, and it still got the API wrong in a few places. When
the expert path is wrong, the ergonomic path is unclear.

---

## High-leverage

### 1. The empty registry should be the default

907 has no directive components, yet `src/lib/render.ts` still has to construct a registry. The plan
wrote `createRenderer({ defs: [] }, {})`. That fails the type check (the real shape is a full
`ComponentRegistry` with `names`, `get`, and `defaultIcon`, built by `defineRegistry({ components: [] })`)
and runs at runtime only because plain markdown never calls the registry's methods. A bare literal
that compiles in the author's head, fails `svelte-check`, and still runs is a footgun.

A plain-prose blog is the common consumer, and it currently pays a tax for components it does not
have. One direction: let `createRenderer()` with no registry return the empty-registry renderer. If
the argument stays required, make its type lead the caller to `defineRegistry` rather than to an
object literal.

**Evidence.** `src/lib/render.ts`; the fix landed as a separate commit. The svelte-check error read
"Argument of type '{ defs: never[]; }' is not assignable to parameter of type 'ComponentRegistry'."

### 2. The manifest regeneration script is boilerplate every consumer copies

`scripts/build-manifest.mjs` is about 75 lines of Node module-hook machinery: `registerHooks`, `$lib`
resolution, `?raw` handling, and a reach into `dist/delivery/manifest.js`. It is fragile (it depends
on internal dist paths) and copy-pasted from ecnordic, with nothing in it specific to the consumer's
content. This is the largest wart in the integration.

One direction: ship it as a CLI, `npx cairn manifest`, that knows how to load a SvelteKit-idiom
adapter (the `.ts` config, the `$lib` alias, the Vite `?raw` query) and write the file. A consumer
should never see `import.meta.resolve` or a private module scheme.

**Evidence.** `scripts/build-manifest.mjs` in both 907 and ecnordic, nearly identical.

### 3. Node-safe data exports should never transit Svelte

This is the root cause of #2. The `/delivery` barrel re-exports a `.svelte` component, so anything
that wants the manifest builder from plain Node has to dodge the barrel and reach
`dist/delivery/manifest.js` directly. A guaranteed component-free subpath (`@glw907/cairn-cms/manifest`,
or a `/delivery/data` barrel) would shrink the script in #2 to a few lines.

Splitting `delivery/head` out from `delivery` was the right instinct. The same line could run deeper,
so the data layer and the Svelte layer never share an entry point.

**Evidence.** The script's own comment: the `/delivery` barrel re-exports a `.svelte` component that
plain Node cannot load.

### 4. `freetags` normalizes differently in two layers, invisibly

The validator omits an empty tags list from its data, so `schema.validate(...).data.tags` is
`undefined` when tags are absent. The read model's `asTags` always yields `[]`. Each rule is
defensible on its own. Together they cost a real escalation during the migration, because the obvious
test ("absent tags normalizes to `[]`") is true at the read layer and false at the validator.

One direction: normalize consistently across both layers. Another: keep the split but make the
contract loud in the types and the docs, so a reader knows validated data is minimal and the index is
filled.

**Evidence.** `dist/content/validate.js` (`if (list.length > 0) data[field.name] = list`) versus
`dist/delivery/content-index.js` (`tags: asTags(raw.tags)`, where `asTags` returns `[]` for a
non-array). This blocked a task until both layers were traced.

### 5. Eighteen minor versions accumulate every rename at once

Going 0.6 to 0.24 meant `renderPreview` → `render`, the validator member move, the `EditPage` prop
rename, the `composeRuntime` URL-policy argument, and the registry change, all landing together. Each
fix was small. Finding them was the work.

For a 0.x library that breaks often, a per-version CHANGELOG with a one-line "consumers must…" note
per breaking change would turn an investigation into a checklist. Codemods would be a bonus.

**Evidence.** Tasks 4, 6, and the render-registry fix each resolved a separate rename.

---

## Lower-leverage

### 6. `urlPolicy` is a forgettable third argument to `composeRuntime`

The call is `composeRuntime(cairn, [], urlPolicyFrom(siteConfig))`. The plan itself warned that
omitting the third argument silently breaks the admin create flow's permalink. A silent wrong
permalink is a bad failure mode. Derive the policy from the adapter and config the runtime already
holds, or throw when it is missing.

### 7. `verifyManifest` reports that it drifted, not what drifted

It does a strict byte comparison of the serialized manifest and throws a generic staleness message.
It also surfaces as a prerender 500 that the consumer's `handleHttpError` has to be wired to rethrow,
which is its own integration task. A `--check` mode that prints the diff, or a builder that fails the
build directly, would beat debugging a 500.

### 8. The sanitize floor's behavior is undocumented

The plan expected `rel="noopener noreferrer"` on every external link. The engine adds it only to
`target="_blank"` anchors, which is a fine policy. A written allowlist and hardening list would save
the guesswork about what the floor keeps, strips, and rewrites.

---

## What worked, keep it

The delivery read model carried its weight. `createPublicRoutes`, `createSiteIndexes`, the
feed/sitemap/robots responders, `summaryFields`, and the fail-closed link resolver all dropped in
with little code and behaved as documented. The query and delivery surface is the strong part of the
library. The friction sits in render composition, the manifest toolchain, and version upgrades.

---

## Triage at a glance

| # | Issue | Area | Rough cost to fix |
|---|---|---|---|
| 1 | Empty registry should be default | render | small (signature + types) |
| 2 | Manifest script is copied boilerplate | tooling | medium (a CLI) |
| 3 | Data exports transit Svelte | packaging | small-to-medium (export map) |
| 4 | `freetags` two-layer normalization | content model | small (decide + document) |
| 5 | No upgrade guide across 0.x renames | process | ongoing (CHANGELOG discipline) |
| 6 | `urlPolicy` forgettable arg | runtime | small (derive or throw) |
| 7 | `verifyManifest` gives no diff | tooling | small |
| 8 | Sanitize floor undocumented | docs | small |
