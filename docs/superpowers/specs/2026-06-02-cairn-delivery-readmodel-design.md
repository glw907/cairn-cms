# Delivery read-model touch-ups (DX pass P1)

This is the first of the engine DX passes that came out of the ecnordic `0.21` migration audit
(`docs/dx-backlog-ecnordic-migration.md`). It fixes three places where a correct SvelteKit instinct
hits a surprise on the delivery surface: the read model carries less than the engine already knows,
and the import surface splits across two entries with no signpost. The organizing goal for the whole
DX sequence is the `create-cairn-site` scaffolder, so each fix here lands the corrected surface the
scaffolder template will later capture.

The pass covers backlog items 1, 2, and 3. It is additive in behavior with one breaking import path,
and it bumps the version to `0.22.0`.

## Scope

Three fixes, all on `src/lib/delivery/` and the public entry barrels:

1. **Item 2, concept on the read model.** `ContentSummary` gains the resolved concept id, stamped at
   index build, so `EntryData` and every list carry it and a template stops re-deriving the concept
   from `entry.date`.
2. **Item 3, the `summaryFields` knob.** A concept nominates frontmatter fields to surface on its
   summaries, so a list card that prints an authored field reads it off the summary with no per-entry
   detail read.
3. **Item 1, the import surface.** The root barrel becomes a true superset of `/delivery` so a wrong
   guess resolves, and `CairnHead` moves to its own `/delivery/head` entry so a data import from
   `/delivery` stays component-free.

Item 7 from the backlog (the `splitHead` replacement head helper) was reassigned to P3 during design:
its fix is a component-`build()` helper beside `cardShell` and `iconSpan` in `render/rehype-dispatch.ts`,
not a delivery-surface concern.

## Item 2: concept on the read model

### Problem

`entryLoad` resolves any concept through `site.byPermalink`, but the `EntryData` it returns has no
concept field. A template that branches per concept reconstructs it from a proxy, typically
`data.entry.date ? 'posts' : 'pages'`, which breaks for a second dated concept or a dateless post. The
engine knows the concept at resolution time and discards it.

### Design

`ConceptDescriptor` already carries `id` (the key under `content`, for example `"posts"`).
`createContentIndex` stamps it onto every entry at build:

```ts
export interface ContentSummary {
  concept: string; // the descriptor id this entry belongs to
  id: string;
  slug: string;
  // ...existing fields
}
```

The stamp goes on in the one place entries are constructed in `createContentIndex`, reading
`descriptor.id`. Because `ContentEntry extends ContentSummary` and `summarize` strips only
`frontmatter` and `body`, the field flows to `byId`, `all`, `byTag`, `adjacent`, and `byPermalink`
with no further plumbing. `EntryData` gains `concept: string`, set from `entry.concept` in `entryLoad`.

`concept` is a required field on `ContentSummary`, not optional. Every entry has a concept by
construction, so an optional field would invite a needless undefined check in consumer code.

### Consumer effect

A template reads `data.concept` (on `EntryData`) or `summary.concept` (on any list item) instead of
sniffing `entry.date`. No signature changes on `byPermalink` or `adjacent`.

## Item 3: the `summaryFields` knob

### Problem

`ContentSummary` carries a derived `excerpt`, not the authored frontmatter the site wrote. A list that
shows an authored summary (a tagline, a card description, a hero image) has to call `byId` per row to
reach the frontmatter, which is a detail read over a list the index already built. The derived
`excerpt` falls back to `description`, so the two coincide when `description` is the only summary
field, but a site that wants the authored value distinct from a body-derived excerpt, or wants a second
field like an image, has no path short of the per-row read.

### Design

A concept declares which frontmatter fields to surface on its summaries. The declaration lives in the
adapter content config beside the concept `schema` and `label`, and `normalizeConcepts` carries it onto
the descriptor:

```ts
// adapter content config, per concept
summaryFields: ['description', 'heroImage']
```

`ConceptDescriptor` gains `summaryFields: string[]`, non-optional, set by `normalizeConcepts`
(`config.summaryFields ?? []`). A normalized descriptor is fully resolved, so the field matches the other
resolved members (`datePrefix`, `permalink`, `fields`) rather than being the one weakly-typed resolved
field. A non-optional type pays off as more consumers read it later (the scaffolder, a list helper),
each reading a clean `string[]` with no `?? []` guard. The cost is a one-line addition to every
hand-built `ConceptDescriptor` literal in the admin-runtime tests (13 across 9 files); under aggressive
development that churn is acceptable in service of the honest type. The recurring-churn smell those
literals create is logged as a separate follow-up (a shared test descriptor factory).
`createContentIndex` copies the named keys off the validated, normalized frontmatter onto a new
namespaced record:

```ts
export interface ContentSummary {
  // ...
  fields: Record<string, unknown>;
}
```

The copy reads `result.data` (the validator's normalized output), so a surfaced field is already
schema-conformed and a missing key is simply absent from `fields`. The record is namespaced under
`fields` rather than spread onto the summary top level, so a nominated key can never collide with a
typed summary field like `slug` or `title`.

`fields` is always present, an empty object when `summaryFields` is empty, so a consumer reads
`summary.fields.description` without a guard on `fields` itself.

### Interaction with the schema pass (P2)

`summaryFields` names frontmatter keys, and a named key should be declared in the concept schema so the
copy reads a normalized value. P2 (the schema-validation pass) does not change this contract; it only
strengthens what the schema validates. The `creating-a-cairn-site.md` note states that a `summaryFields`
key should appear in the schema.

## Item 1: the import surface

### Problem

The delivery surface splits across two entries with no signpost. Some symbols resolve from the package
root (`createContentIndex`, `createSiteIndexes`, `buildSiteManifest`, `FeedItem`, and more); the route
loaders (`createPublicRoutes`), the `*Response` helpers, and `CairnHead` resolve only from `/delivery`.
A developer who imported `createSiteIndexes` from root then reaches for `createPublicRoutes` from root
and gets a bare "not exported" error. Separately, the `/delivery` barrel statically imports
`CairnHead.svelte`, so importing any delivery data helper from `/delivery` pulls a `.svelte` module into
the graph, and a node-environment unit test then needs the Svelte vitest plugin to parse an engine file.

### Design

Two coordinated changes.

**Superset root.** The root barrel (`src/lib/index.ts`) re-exports the JS and TS public symbols that
today resolve only from `/delivery`: `createPublicRoutes`, its `PublicRoutesDeps`/`ListData`/`TagData`/
`TagIndexData`/`EntryData` types, and the four `*Response` helpers (`rssResponse`, `jsonFeedResponse`,
`sitemapResponse`, `robotsResponse`). A wrong guess from root for any of these now resolves. Root stays
the full surface, which already pulls auth, github, and email, so it was never the backend-free entry
and adding these re-exports changes nothing about its bundle character. `/delivery` stays the lean,
backend-free public entry.

The superset stops short of the one Svelte component. `CairnHead` is not re-exported from root, because
the root barrel is node-importable today and the unit test suite imports it under the `node` project
with no Svelte plugin. Re-exporting a `.svelte` module from root would break every node-environment test
that imports the root entry. The head component resolves from its own `/delivery/head` entry instead, so
root stays node-clean and the import surface still has one obvious home for the head.

A one-line rule lands in `creating-a-cairn-site.md`: a site's public pages import the data builders,
route loaders, and response helpers from `@glw907/cairn-cms/delivery` (or the root full surface), and the
`CairnHead` component from `@glw907/cairn-cms/delivery/head`.

**Head split.** A new package export `./delivery/head` holds `CairnHead`, backed by a thin
`src/lib/delivery/head.ts` that re-exports the existing `CairnHead.svelte`. The `/delivery` barrel
(`src/lib/delivery/index.ts`) stops re-exporting the component. After the split, a data import from
`/delivery` evaluates no `.svelte` module, so a node-environment test loads it with no Svelte plugin.

This moves one import path: `CairnHead` is no longer importable from `@glw907/cairn-cms/delivery`. A
consumer imports it from `@glw907/cairn-cms/delivery/head` or from the root entry. ecnordic is the only
current consumer and is local and unpushed, so the migration is one import-line change plus a changelog
note. The `package.json` export map gains the `./delivery/head` entry with the same `types`/`svelte`/
`default` triple the other component-bearing entries use.

## Testing

The pass is test-first, layered the way the rebuild's suite already is.

**Unit (node project).**
- The concept stamp appears on a summary and on a `byId` entry, for a dated concept and an undated one,
  and survives `adjacent`, `all`, and `byTag`.
- `summaryFields` copies the named keys onto `summary.fields` off the normalized frontmatter, omits an
  unnamed key, and yields an empty `fields` object when `summaryFields` is empty or unset.
- A `summaryFields` key that the frontmatter omits is absent from `fields` rather than present as
  `undefined`.
- A node-environment test imports a delivery data helper from `/delivery` and asserts it evaluates with
  no Svelte plugin configured, pinning the component-free guarantee.

**Package resolution.** `check:package` covers the new `./delivery/head` entry (types and runtime both
resolve). A unit test on the root barrel asserts the superset re-exports resolve (`createPublicRoutes`
and the four `*Response` helpers are functions from root), and that the root barrel still loads under the
node project (no `.svelte` pulled in).

**Showcase build (end-to-end).** The showcase declares a `summaryFields` on a concept and renders a
list card that reads `summary.fields`, and a page that reads `data.concept`. The production build stays
exit 0 and the prerendered output shows the authored field and the resolved concept.

## Versioning

`0.22.0`. The behavior is additive (two new read-model fields, one new descriptor knob, the root
superset). The one breaking element is the `CairnHead` import path moving off the `/delivery` barrel to
`/delivery/head`, which the changelog records as a migration note. The 0.x minor bump covers an additive
surface with a documented breaking import path, consistent with the prior content-graph passes.

## What this pass does not do

- It does not touch the render path or component `build()` helpers. The `splitHead` head helper (item 7)
  is P3.
- It does not change the schema or the validator. That is P2.
- It does not add the scaffolder. The scaffolder (P4) inherits the corrected surface this pass lands.
