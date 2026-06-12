# Upgrading cairn

cairn is a `0.x` library and it breaks often. While the version stays under `1.0`, a minor bump can
still carry a breaking rename or a contract change your site has to follow before it compiles again.
Every breaking change in `CHANGELOG.md` carries a "Consumers must:" line, and that line names the
action your site has to take. When you cross several versions in one jump, read each entry's
"Consumers must:" line and apply them oldest first.

The list below collects the renames you cross over the `0.x` window so far. They run oldest first,
one heading per rename, with the action each one needs spelled out.

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

## 0.33.0: the host root layout must be chrome-free

The admin now isolates itself from host chrome, and a dev-only guard logs a console error when a site's
root layout wraps the admin in its own nav, footer, or width-constraining container. Consumers must:
keep the root layout bare and move the public chrome plus `app.css` into a URL-transparent `(site)`
route group. Group folders do not change any URL, so the public pages keep their paths, and the admin,
which sits outside the group, renders standalone. A site already on this structure needs no change.

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

A design-identity pass followed. The admin gained self-hosted display and body fonts, a brand tile and
wordmark, softer radii and floating cards, collapsible nav groups whose state persists in a
`cairn-admin-nav-collapsed` cookie, and a Cmd/Ctrl+K command palette. The login and confirm screens
were rebranded to match. This is visual and additive and needs no migration. The new nav-collapse
cookie is scoped to `/admin`, like the theme cookie, so it never reaches the host's pages.

## 0.35.0: cairn owns admin CSRF, so disable the framework's global check

cairn's guard becomes the single CSRF authority for the admin. It validates a uniform
`__Host-cairn_csrf` double-submit token on every admin form POST and serves a branded 403 on a
failure. The token tolerates a missing `Origin`, so the JS-free magic-link sign-in works. The guard
also restores the strict `Origin` check for the site's own non-admin form POSTs, so the global check
coming off is not a net loss. Consumers must: set `csrf: { checkOrigin: false }` in `kit` in
`svelte.config.js`. Without it the framework's global check rejects the JS-free auth POST and the
admin sign-in fails.

## 0.36.0: structured logging, additive

cairn emits structured diagnostic events for the auth flow, the commit pipeline, and the admin guard,
written to `console` as JSON for Cloudflare Workers Logs. Consumers must: nothing. To read the events,
set `observability.enabled = true` in `wrangler.jsonc`; see the
[read cairn's logs guide](read-cairn-logs.md). The records carry an editor's email and never a token
or session id.

## 0.38.0: the login request reports its send outcome, additive

The magic-link send is awaited, and `requestAction` returns `{ status, sent }` where `status` is
`sent`, `send_error`, or `throttled`. `LoginPage` renders the two new states on its own. Consumers
must: nothing. A site rendering its own form against `form.sent` sees the same value as before; it
opts into the new states by reading `form.status`.

## 0.39.0: saves hold on a pending branch until Publish

A save now commits to the entry's pending branch (`cairn/<concept>/<id>`) and leaves the live site
untouched; a deliberate Publish (per entry, or site-wide from the topbar) copies the held edits to
the default branch and triggers the deploy. The behavior is unconditional, with no mode knob.
Consumers must: add `publish: content.publishAction` and `discard: content.discardAction` to the
edit shim's `actions`, and `publishAll: content.publishAllAction` to the list shim's `actions`, the
shape [the admin route structure](../reference/admin-routes.md) shows. Without those lines the new
Publish and Discard controls post to actions that do not exist, and since saves no longer deploy,
nothing an editor does reaches the live site.

Tell your editors too: Save now holds changes, and the new Publish button ships them. The
[publish and discard guide](publish-and-discard.md) is the editor-facing walkthrough. The `draft:`
checkbox keeps its mechanics under the name Hidden.

## 0.40.0: the edit page redesign, additive

The edit page is rebuilt: lifecycle actions move into a sticky header, the toolbar grows the full
GFM set with Write/Preview tabs, the sidebar groups into Details, Visibility, and Address, and the
editing surface gains syntax highlighting, spell check, and unsaved-changes tracking. Consumers
must: nothing for a site mounting `EditPage` through the route factories; no shim, action, or load
changes. A site that renders `MarkdownEditor` directly, outside `EditPage`, no longer gets an
embedded toolbar or card chrome; it may drive its own controls through the new `registerFormat`
seam or accept the plain surface, since the engine's toolbar component is not exported.

Mind your svelte version too. Consumer sites compile the shipped `.svelte` sources, and svelte
`5.56.1` has a compiler bug that misprints parenthesized boolean groupings, so use svelte `5.56.3`
or newer. The editor-facing tour of the new page is
[the write-in-the-editor guide](write-in-the-editor.md).

## 0.41.0: the `cairn-doctor` preflight, additive

The package ships a second bin, `cairn-doctor`, which checks a site's wrangler bindings, site
config, Cloudflare zone settings, sending domain, D1 auth store, and GitHub App reachability in one
report and exits non-zero on a failure. A new
[Cloudflare readiness guide](cloudflare-readiness.md) walks the same list manually, and the admin
layout now logs a warn-level `github.unreachable` event when its GitHub read fails, hiding the
topbar's Publish site button until GitHub answers again. This needs no migration. Consumers may:
run `npx cairn-doctor --from <address> --repo <owner/name>` as a pre-launch gate, work through the
readiness guide when standing up a fresh account, and filter Workers Logs on `github.unreachable`
when the publish button goes missing. A batch of internal fixes rides along (a leaner server
bundle, a faster edit-page load, coalesced GitHub token mints, and several editor polish items)
with no consumer action.

One note on the window: `0.41.0` and `0.50.0` publish together, so a site crossing from `0.40.0`
applies this entry and the `0.50.0` entries below in one upgrade.

## 0.50.0: the admin mounts as one catch-all route

The per-route admin tree is gone as the canonical wiring. `createCairnAdmin` now serves every
admin view through one `load` and one `actions` record, and the new `CairnAdmin` component
switches the views, so a site no longer restates the route table or couples to action names by
string. Consumers must: delete the admin route tree and replace it with the two-file catch-all
mount plus the composer. The tree a site carried looked like this:

```
src/routes/admin/
  +layout.server.ts
  +layout.svelte
  login/+page.server.ts                  login/+page.svelte
  auth/confirm/+page.server.ts           auth/confirm/+page.svelte
  auth/logout/+server.ts
  (app)/+layout.server.ts                (app)/+layout.svelte
  (app)/+page.server.ts
  (app)/[concept]/+page.server.ts        (app)/[concept]/+page.svelte
  (app)/[concept]/[id]/+page.server.ts   (app)/[concept]/[id]/+page.svelte
  (app)/editors/+page.server.ts          (app)/editors/+page.svelte
  (app)/nav/+page.server.ts              (app)/nav/+page.svelte
```

Three files replace it:

```
src/lib/cairn.server.ts                    composeRuntime + createCairnAdmin, once
src/routes/admin/[...path]/+page.server.ts re-exports admin.load and admin.actions
src/routes/admin/[...path]/+page.svelte    mounts CairnAdmin
```

The exact file contents are in [the canonical admin mount](../reference/admin-routes.md). The
admin URLs do not change, so no editor bookmark breaks, and the single mount also serves the
login, editors, and nav views a partial tree may have skipped.

A site that keeps mounting `LoginPage`, `ConfirmPage`, or `AdminLayout` directly (the advanced
per-route seam) must know two things. The components' forms now post named actions (`?/request`
on the login form, `?/confirm` on the confirm form, `?/logout` and `?/publishAll` from the
shell), so a route that registered a handler as `default` no longer receives the post; register
it under the named key instead. And the shell's sign-out posts `?/logout` on the current URL, so
the `/admin/auth/logout` `+server.ts` route is gone from the contract; delete it.

## 0.50.0: the ambient Locals type ships as a subpath

The `App.Locals.editor` declaration the guard relies on now ships at
`@glw907/cairn-cms/ambient`. Consumers must: replace the hand-written `App.Locals` block in
`src/app.d.ts` with one line, `import '@glw907/cairn-cms/ambient';`, so the editor's type tracks
the engine instead of a copy.

## 0.50.0: `createSiteIndex` becomes `createSiteResolver`, and `paginate` is gone

The cross-concept resolver builder and its type are renamed: `createSiteIndex` is now
`createSiteResolver` and `SiteIndex` is now `SiteResolver`, matching what the thing returns. The
unused `paginate` helper is deleted. Consumers must: rename both identifiers where they import
them from `@glw907/cairn-cms/delivery/data`, and drop any `paginate` import (page math is the
site's own few lines). A site that only calls `createSiteIndexes` needs no change.

## 0.50.0: every action failure carries `error`

The `fail()` payloads from the admin actions unify on one summary key. Every failure now carries
`error: string`, and the rename failure's separate `renameError` key is gone. Consumers must:
nothing for a site rendering the engine's components, which read the unified shape. A site that
read `form.renameError` in its own markup must read `form.error` instead.

## 0.50.0: diagnostics conditions and a wider `mintToken`, additive

Two additions need no migration. The runtime faults the readiness checklist already names now
carry their registered condition ids: a missing `AUTH_DB` on a gated admin request renders a
branded condition page instead of silently redirecting to a login that could never work, and a
missing email binding, missing GitHub App credentials, or an invalid site config carry their ids
through the error chain and the logs, where `cairn-doctor` and Workers Logs can name the fix. And
`deps.mintToken` accepts a plain string return as well as a promise, so a test stub no longer
needs an `async` wrapper.
