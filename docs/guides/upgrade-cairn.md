# Upgrading cairn

cairn is a `0.x` library and it breaks often. While the version stays under `1.0`, a minor bump can
still carry a breaking rename or a contract change that a consuming site has to follow before it will
compile again. Every breaking change in `CHANGELOG.md` carries a "Consumers must:" line. That line
names the action a site has to take. When you cross several versions in one jump, read each entry's
"Consumers must:" line and apply them oldest first.

The list below collects the renames a consumer crosses over the `0.x` window so far. They run oldest
first, one heading per rename, with the action each one needs spelled out.

## 0.7.0: the adapter `renderPreview` member became `render`

The adapter's preview function was renamed from `renderPreview` to `render`. The matching `EditPage`
prop moved with it. Consumers must: rename the adapter's `renderPreview` to `render`, and rename the
`EditPage` `renderPreview` prop to `render`.

## 0.9.0: the `EditPage` `preview` prop was dropped

The `EditPage` component dropped its `preview` prop. That prop had passed Carta preview plugins, and
the editor moved to CodeMirror in this window, so the plugin array no longer applies. Consumers must:
remove the `preview` prop from every `EditPage` usage.

## 0.13.0: the validator moved off the adapter contract

A concept config dropped its separate `fields` and `validate` members for one generic `schema`
member built with `defineFields`. The `validateFields` helper became internal and is no longer
re-exported from the package entry. Consumers must: declare each concept's fields through the
`schema` member, build it with `defineFields`, and stop importing `validateFields` from the package
root.

## 0.25.0: `composeRuntime` takes one object

`composeRuntime` now takes a single object, `composeRuntime({ adapter, siteConfig, extensions? })`,
and derives the per-concept URL policy from `siteConfig`. The loose third `urlPolicy` argument is
gone, and a missing `siteConfig` throws. Consumers must: pass the parsed site config to every
`composeRuntime` call and drop any hand-passed URL policy.

## 0.25.0: `createRenderer()` defaults its registry

`createRenderer()` now defaults its registry to the empty registry. A plain-prose site can call
`createRenderer()` with no argument. Consumers must: nothing. Passing a built registry is unchanged.

## 0.26.0: the `cairnManifest()` Vite plugin verifies the manifest on every build

A `cairnManifest()` plugin from `@glw907/cairn-cms/vite` now owns the build-time manifest check, and it
fails the build outside the prerender lifecycle so `handleHttpError` cannot downgrade it. Consumers
must: add `cairnManifest({ configModule, content, manifestPath })` to the Vite config and drop any
hand-rolled in-graph `verifyManifest` call.

## 0.26.0: the `cairn-manifest` bin replaces the hand-written regenerate script

A shipped `cairn-manifest` bin regenerates the committed manifest from a Vite context. To adopt it, set
the regenerate script to `"cairn:manifest": "cairn-manifest"` and delete the hand-written
`scripts/build-manifest.mjs`.

## 0.26.0: node-side data imports move to `@glw907/cairn-cms/delivery/data`

The pure delivery projections now live at a node-safe `@glw907/cairn-cms/delivery/data` entry that pulls
no `@sveltejs/kit` into the graph. Consumers must: move any plain-Node import of a delivery data helper
(such as `buildSiteManifest`) from `@glw907/cairn-cms/delivery` to `@glw907/cairn-cms/delivery/data`.

## 0.27.0: the delivery read helpers move to `@glw907/cairn-cms/delivery/data`

The `.` root stopped re-exporting the delivery read helpers. Consumers must: import
`createContentIndex`, `createSiteIndexes`, the feed, sitemap, robots, SEO, and pagination builders, and
`permalink` from `@glw907/cairn-cms/delivery/data` instead of the `.` root.

## 0.27.0: the public route surface moves to `@glw907/cairn-cms/delivery`

The `.` root and `/sveltekit` stopped re-exporting the public route surface. Consumers must: import the
public route loaders, the `*Response` helpers (`createPublicRoutes`, `rssResponse`, `jsonFeedResponse`,
`sitemapResponse`, `robotsResponse`), and the public route types (`PublicRoutesDeps`, the public
`ListData`, `TagData`, `TagIndexData`, `EntryData`) from `@glw907/cairn-cms/delivery` instead of the `.`
root or `/sveltekit`.

## 0.27.0: the internal GitHub, signing, and hast helpers left the public API

The internal helpers behind GitHub token minting and the render pipeline are no longer public. The
engine wires them internally, so no consumer needs them. Consumers must: stop importing `appJwt`,
`installationToken`, `signingSelfTest`, `appCredentials`, `treeUrl`, `contentsUrl`, `readRaw`,
`fileSha`, `listMarkdown`, `markdownFilesIn`, `commitFile`, `isElement`, `strProp`, and `markFirstList`.
