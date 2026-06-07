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

## 0.28.0: a component `build()` can no longer emit unsafe attribute sinks

A render guard runs last in `createRenderer` and neutralizes the sinks a component `build()` could route
a raw author attribute value into. It rewrites an unsafe URL scheme on a URL-bearing attribute, drops an
inline `on*` handler, and strips inline `style`. Safe schemes, relative URLs, anchors, and the `cairn:`
token pass through untouched. Consumers must: nothing for a component that emits standard markup. If a
component `build()` emits a non-standard URL scheme, an `on*` handler, or inline `style`, that output is
neutralized, so route dynamic styling through a class or an inert `data-*` attribute instead.

## 0.29.0: the YAML URL policy is validated at build

The `content:` URL policy in the site config is now checked when the config loads. A permalink must be
root-relative and use only the tokens `:slug`, `:year`, `:month`, and `:day`, a date token is valid only
on a dated concept, a `datePrefix` must be `year`, `month`, or `day`, and a policy key must name a concept
the adapter declares. A malformed policy that earlier defaulted silently now fails the build with a named
error. Consumers must: nothing for a valid policy. If the build reports a policy error, correct the named
`content:` entry in the site config.

## 0.30.0: the render-authoring helpers move to `@glw907/cairn-cms/render`

The component-authoring toolkit now lives behind a `@glw907/cairn-cms/render` subpath. `iconSpan`,
`cardShell`, `headRow`, the re-homed `isElement`, and the new `strAttr` import from there, and the root
barrel no longer carries them. Consumers must: import `iconSpan`, `cardShell`, `headRow`, `isElement`, and
`strAttr` from `@glw907/cairn-cms/render` instead of the package root.

## 0.30.0: `rehypeDispatch` is no longer exported

The public surface dropped `rehypeDispatch`, so `createRenderer` is the one public render pipeline.
Consumers must: replace any direct `rehypeDispatch` use with `createRenderer`.

## 0.30.0: render-authoring additions and a new registry guard

Two additions need no migration. `headRow` takes a configurable heading level that defaults to 2, and
`registry.iconField(name)` reads a component's icon field.

`defineRegistry` now fails a component that declares `defaultIconByRole` with no `type:'icon'` attribute.
This catches a configuration that built before but never rendered its default icon, since the default only
reaches the output through an icon attribute. Consumers must: if `defineRegistry` reports the icon guard,
give the offending component a `type:'icon'` attribute or remove its `defaultIconByRole`.

## 0.31.0: the admin ships its own stylesheet

The engine now compiles the admin's Tailwind utilities and DaisyUI component classes and ships them in
`dist/components/cairn-admin.css`, scoped under the admin `data-theme`. The admin styles itself on any
host, including one that ships no Tailwind and no DaisyUI. The scoped rules use `:where`, so they stay
low-specificity and never override a host rule.

This needs no migration. Consumers may: drop any Tailwind `@source` entry that existed only to generate
the admin's classes, since the host build no longer feeds the admin its CSS. A host that provides DaisyUI
globally keeps working unchanged.

## 0.32.0: the admin UX rebuild and dark mode

The admin list, sidebar, and topbar are rebuilt in DaisyUI with Lucide icons and a dark mode. This
needs no migration. Consumers may: wire per-row delete on the concept list by adding
`delete: routes.listDeleteAction` to the list route's `actions`, the way the showcase does. The dark
mode persists through a `cairn-admin-theme` cookie scoped to `/admin`, so it never reaches the host's
pages.

This release also fixes the self-styled admin stylesheet so the drawer sidebar renders. A consumer on
an older `0.3x` that saw a missing admin sidebar gets the fix by upgrading. No consumer action is
required.

The admin's visual design was then polished: refined Warm Stone tokens, a soft active-nav state, a
cleaner list table, a newest-first default sort, and a reduced-motion guard. This is visual only and
needs no migration.
