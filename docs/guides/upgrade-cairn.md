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

`defineRegistry` now fails a component that declares `defaultIconByRole` with no icon attribute.
This catches a configuration that built before but never rendered its default icon, since the default only
reaches the output through an icon attribute. Consumers must: if `defineRegistry` reports the icon guard,
give the offending component an icon attribute or remove its `defaultIconByRole`.

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

After swapping the route tree, run `npx svelte-kit sync` before anything else. SvelteKit
generates the `./$types` modules per route directory, and the generated set still describes the
deleted tree until the sync runs, so the first `npm run check` otherwise fails on a missing
`./$types` import in the new catch-all route.

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

## 0.51.0: the svelte peer floor rises to `^5.56.3`

The 0.40.0 advisory becomes an enforced range. Consumer sites compile the shipped `.svelte`
sources, and svelte `5.56.1` miscompiles parenthesized boolean groupings, so the engine's
`peerDependencies` now declares svelte `^5.56.3` and `cairn-doctor` checks the lockfile's resolved
versions against the declared floors. Consumers must: raise the `svelte` devDependency range to at
least `^5.56.3` (and `@sveltejs/kit` to `^2.12` where it sits lower) and reinstall so the lockfile
re-resolves.

## 0.51.0: the preview renders in an iframe with the site's own CSS

The editor's Preview tab now renders inside a sandboxed iframe whose document links the site's
stylesheets, so an entry proofs in the site's real styling without that CSS ever touching the
admin. A width menu on the Preview tab sizes the frame to Desktop, Tablet, Phone, or Small phone.
Consumers should: wire the adapter's new `preview` member so the frame has stylesheets to link.
The `?url` import resolves the compiled asset's URL at build time:

```ts
import siteCss from './site.css?url';

// ...inside defineAdapter:
preview: { stylesheets: [siteCss], containerClass: 'site-main' },
```

Reference the sheet only through `?url` and link the resolved URL from the site layout's
`<svelte:head>`; a static import of the same file breaks the frame's link, for the reason
[the core reference](../reference/core.md#preview-adapter-editor-member) explains. Without the knob the
preview renders unstyled markup behind a one-line hint, which is no worse than before.

The editor also fixes its directive highlighting (labeled and attributed `:::` openers and fences
of four or more colons now highlight, where before only bare closers did) and steps nested
containers' tint by depth. No consumer action.

## 0.51.0: `cairn-doctor` derives its inputs and gains `--probe`, additive

The doctor now derives its missing inputs from the repo it runs in: the backend owner and repo
plus the sender address come from evaluating the site's config module, and the Cloudflare account
id comes from the wrangler config, with flags and environment variables taking precedence. A new
`--probe <url>` flag runs a zero-side-effect live check against the deployed admin's sign-in
surface. Consumers may: drop the `--from` and `--repo` flags from doctor invocations and run
`npx cairn-doctor --probe https://your-site.example` after a deploy. The flag details are in
[the doctor reference](../reference/doctor.md).

## 0.52.0: the editor becomes a quiet writing surface, additive

The in-editor experience reworks around the manuscript: self-hosted iA Writer Mono on a centered
70-character measure, stepped heading sizes, syntax markers and URLs dimmed to the muted ink,
an inline-code chip, GFM parsing (the toolbar's strikethrough, tables, and task lists now
highlight), directive machinery drawn as depth-stepped bracket rails with the caret's block one
step stronger, and two persisted writing modes (focus mode, typewriter scrolling) behind the
toolbar's overflow menu. Everything ships inside the admin's own stylesheet and components.

No consumer action. A site embedding `MarkdownEditor` directly may pass the new optional
`focusMode` and `typewriter` booleans, documented in
[the components reference](../reference/components.md#markdowneditor); the stock `EditPage`
wires and persists both.

## 0.52.1: editor polish from the field, additive

In Write mode the editor card caps near the manuscript's measure and centers, so wide windows no
longer frame empty space; Preview keeps the full width. Nested directive rails space out to a
4px gap with a matching gutter step. No consumer action.

## 0.53.0: editor-as-home refinements, additive

The UI face moves to IBM Plex Sans (harmonizing with the iA Writer Mono editor face), the editor
gains persisted Prose/Markup surface postures toggled from its footer strip, the writing-mode
toggles move from the toolbar overflow into that footer, the insert actions become toolbar icons,
and the admin chrome narrows around a more central editor. No consumer action. A site embedding
`MarkdownEditor` directly may pass the new optional `surface` prop, documented in
[the components reference](../reference/components.md#markdowneditor).

## 0.54.0: the editor takes the shell, additive

An open document becomes its own context. The edit page's sticky header dissolves into the single
topbar, the nav drawer opens closed with the breadcrumb as the way out, the frontmatter fields move
to a right slide-over panel, and a zen toggle fades the chrome to the manuscript alone. The editor
ergonomics round out: an 8px directive rail pitch with a strength-only caret rail, hanging indents
on wrapped quote and list lines, container folding from the rail band, the completed format keymap
plus page-level shortcuts and a `Ctrl+/` sheet, and the everyday formats promoted onto the strip.
No consumer action; the changes apply in place, and `MarkdownEditor`'s public props are unchanged.

## 0.57.0: media, with per-site wiring

cairn gains images end to end. An editor pastes, drags, or inserts an image in the editor, and the
engine stores it in R2, names it by its content hash, commits it with the entry, and serves it from a
locked-down `/media` route. The full surface is in [the media reference](../reference/media.md) and
[the sveltekit reference](../reference/sveltekit.md).

Media is off until a site wires it, so this is additive with four required setup steps. The fourth
step is the one a site is most likely to miss: without the public resolver, a published
`![](media:...)` ships a bare `media:` token to the live page with no error. Consumers must:

1. **Bind the R2 bucket.** Add an `r2_buckets` entry named `MEDIA_BUCKET`. In `wrangler.jsonc`:

   ```jsonc
   "r2_buckets": [
     { "binding": "MEDIA_BUCKET", "bucket_name": "your-site-media" }
   ]
   ```

   A `wrangler.toml` site (both production sites use one) writes the same binding as a table array:

   ```toml
   [[r2_buckets]]
   binding = "MEDIA_BUCKET"
   bucket_name = "your-site-media"
   ```

2. **Mount the delivery route.** Create `src/routes/media/[...path]/+server.ts` and export the
   handler from `createMediaRoute`, passing the runtime's `resolvedAssets`:

   ```ts
   // src/routes/media/[...path]/+server.ts
   import { createMediaRoute } from '@glw907/cairn-cms/sveltekit';
   import { runtime } from '$lib/cairn.server.js';

   export const GET = createMediaRoute(runtime.resolvedAssets);
   ```

3. **Declare the `assets` block.** Add an `assets` block to the adapter naming that bucket binding,
   so `normalizeAssets` turns media on. See [the media reference](../reference/media.md#config) for
   the field shape. Without the block, media stays off and the route 404s.

4. **Wire the public media resolver.** Steps 1 through 3 make media work for the editor: insert and
   the admin preview both resolve through the route. The published page does not. A public
   `![](media:...)` token (a body image or a frontmatter hero) only resolves to a URL when the site
   threads a resolver into the render path and the public routes. Build one resolver and inject it in
   both places:

   ```ts
   // src/lib/cairn.config.ts
   import { normalizeAssets, makeMediaResolver } from '@glw907/cairn-cms/media';
   import mediaManifest from './content/.cairn/media.json';

   // One resolver over the committed manifest, exported so the public route reuses it.
   export const publicMediaResolver = makeMediaResolver(
     mediaManifest,
     normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' }),
   );

   export const cairn = defineAdapter({
     // ...
     assets: { bucketBinding: 'MEDIA_BUCKET' },
     // Default resolveMedia so a published body image resolves; the preview path overrides it.
     render: ({ body, resolve, resolveMedia }) =>
       renderMarkdown(body, { resolve, resolveMedia: resolveMedia ?? publicMediaResolver }),
   });
   ```

   ```ts
   // src/routes/(site)/[...path]/+page.server.ts
   import { publicMediaResolver } from '$lib/cairn.config';
   const routes = createPublicRoutes({ /* ...existing... */, resolveMedia: publicMediaResolver });
   ```

   `makeMediaResolver` and `normalizeAssets` both import from `@glw907/cairn-cms/media`. The
   `mediaManifest` import reads the committed `src/content/.cairn/media.json`. A fresh site that has
   never uploaded has no such file, and the JSON import fails the build, so create it as an empty
   object first:

   ```sh
   mkdir -p src/content/.cairn && echo '{}' > src/content/.cairn/media.json
   ```

   The upload pipeline writes real rows into that file from then on.

Cloudflare Images transforms stay behind the `transformations: false` default. A site serves
full-size bytes until it sets `transformations: true`, which needs the zone's Image Resizing turned
on. The route mount is also covered in
[the wire the delivery surface guide](wire-the-delivery-surface.md).

> **Breaking: `figure` is now a reserved directive name.** The same release adds the inline figure (an
> image wraps in a cairn-reserved `:::figure` directive to carry a caption and a placement), and that
> reserves the name. `defineRegistry` throws if a site registers a component named `figure`, which
> hard-fails both `cairn-manifest` and the build. If your site has a custom `figure` component, the
> fix depends on why it exists. A `figure` that the engine's built-in figure now covers (a
> hand-rolled caption-and-placement wrapper, which is the common case) should be removed so the site
> adopts the engine's; renaming it keeps a duplicate. A `figure` that does something unrelated should
> be renamed. Also check for a hand-authored `:::figure` block in your content: it now renders as an
> engine figure.

The inline figure also ships default `.cairn-place-center`, `.cairn-place-wide`, and
`.cairn-place-full` CSS in the showcase reference (`examples/showcase/src/lib/site.css`). Copy those
rules into your site's content stylesheet to own the placement look. The showcase scopes them under
`.site-main`, its content container. A site whose container differs (ecxc uses `.post-body`) must
re-scope every selector to its own container, not just tune the pixel values. Without the rules a
`wide` or `full` figure still renders, it just sits at the text measure until the classes are styled.

The release also adds the frontmatter hero image, a new built-in `image` field type. Adopting it is
optional and additive; a site does nothing until it declares the field. The public resolver from
required step 4 already covers the hero, so adoption is only the field plus the template:

1. **Declare the field.** Add `{ type: 'image', name: 'image', label: 'Hero image' }` to the
   concept's `defineFields`. The field named `image` is the social-card image by default; mark a
   differently-named field with `seo: true` to feed the `og:image`, and a concept declares at most
   one such field. The stored value is a nested object `{ src, alt, caption }`.

2. **Render the hero.** With `resolveMedia` already injected into `createPublicRoutes` (required step
   4), the read path exposes a derived `heroImage` projection on the entry data, and the template
   renders it however it wants (`<img src={data.heroImage.url} alt={data.heroImage.alt}>`). The site
   owns the hero layout; cairn ships only the resolved data. The SEO head reads the same resolved
   image as the `og:image` automatically.

If a site already carries a bare-string SEO image under a `{ type: 'text', name: 'image' }` field,
that keeps working unchanged: the SEO head still reads the string. Migrating it to the structured
hero is optional. To migrate, switch the field to `type: 'image'` and rewrite each post's
`image: /path.png` string to the nested form `image: { src: media:..., alt: ... }`, since the
`image` field type stores an object and drops a bare string. Behavior change to know about regardless
of adoption: `resolveImageUrl` now returns no URL for a non-http(s) value, so an unresolved `media:`
reference degrades to no social image instead of shipping a `media:` token in the `og:image` tag.

The release also adds the Media Library, the admin screen at `/admin/media` that browses every
committed asset, shows where each is used, edits its name and default alt, and deletes it safely. It
appears in the admin nav automatically once media is wired; nothing else turns it on. One recommended
step: regenerate the content manifest (`npm run cairn:manifest` or `npx cairn-manifest`, then commit)
so the Library's where-used is accurate for already-published content. The manifest gained an additive
`mediaRefs` field; it is optional, so a site builds without regenerating, but an un-regenerated
manifest reads every published media reference as absent (the Library shows "no references found" and
safe-delete would treat an in-use asset as an orphan). Save and publish keep the field current from
then on, so the one-time regenerate only matters for content committed before this release.

## 0.57.1: media polish and cutover DX, additive

A polish patch over the `0.57.0` media stack. The Media Library now confirms a delete or a rename and
surfaces a commit conflict on a feedback strip; the slide-over Escape no longer fights the search box;
and a frontmatter hero marked decorative persists that choice (an additive `decorative` key on the
`image` object) so it stops reading as needs-alt after a reload. The reserved-`figure` build error now
names the colliding component. No consumer action: the `decorative` key is additive and optional, and
the rest is admin or build-time behavior with no public surface change.

This release also reworks the media docs. If you are wiring media for the first time, the public media
resolver is now documented as a required step (a published `media:` token ships bare without it), and
the reserved-`figure` collision is a prominent breaking callout. The 0.57.0 entry above carries both,
so read it when you adopt media. The new
[content authoring syntax reference](../reference/authoring-syntax.md) collects the `cairn:` and
`media:` token schemes.

## 0.58.0: replace and push-alt across content, additive

The Media Library gains two operations that rewrite every placement of one asset in a single commit:
Replace swaps the file behind an image and repoints every published reference to the new content hash
while keeping the slug, and Push alt fills missing alt text (with an opt-in to overwrite custom alt)
from the asset's default. Both read usage across `main` and every open edit branch and refuse when
usage cannot be verified. No consumer action: the surface is admin-side and additive, with no rename
and no content-format change. The editor walkthrough is in
[manage the media library](manage-the-media-library.md).

## 0.55.0: the office list gains triage and self-describing rows

The post and page list rises to the same grade as the editor: a triage bar filters by publish state
(All, Pending edits, Published, each with a live count, plus a Hidden toggle), and each row carries a
summary line under its title. One data change feeds the rows: the content manifest now indexes a
per-entry `summary`, built by the same excerpt helper the public delivery uses.

Consumers must: regenerate the content manifest (`npm run cairn:manifest` or `npx cairn-manifest`,
then commit). The manifest is verified whole-string, so the `cairnManifest` build fails closed until
the regenerated manifest with the new `summary` keys is committed. That is the only action; the
triage and the rows apply in place, and a site that renders its own list against `EntrySummary` gains
the optional `summary` field.

## 0.59.0: bulk delete and orphan collection, additive

The Media Library gains multi-select bulk delete and an on-demand orphan collection (Find orphaned
files, with a one-irreversible byte purge behind a typed-count confirm). Both read usage across
`main` and every open edit branch and refuse when usage cannot be verified. Consumers must: nothing.
The surface is admin-side and additive, with no public surface change and no content-format change.
The editor walkthrough is in [manage the media library](manage-the-media-library.md).

## 0.60.0: the editor copy-edit, spellcheck and tidy, additive

The editor gains a spellcheck that runs as you write and an opt-in tidy that proposes a
voice-preserving light copy-edit you review before it lands. Spellcheck is on by default and runs
locally, so no text leaves the browser. Tidy reads a draft once through the Anthropic API, computes
the diff locally, and commits nothing on its own.

Consumers must: nothing for an existing site. Both features are additive. Spellcheck replaces the
browser's native spell checking with cairn's own (the editor now drops the native `spellcheck`,
`autocorrect`, and `autocapitalize` attributes so a browser cannot rewrite a token), so an upgrading
editor sees cairn's amber underline and its correction popover in place of the browser's right-click
menu, with no config change. The dialect is declared once per site under `spellcheck.dialect` (default
`en-us`), and an editor's personal additions commit to `src/content/.cairn/dictionary.txt`.

Tidy is opt-in and gives a site nothing until a developer turns it on. To enable it, set
`tidy.enabled: true` in the site config, add the `ANTHROPIC_API_KEY` Worker secret, and optionally
pick a model (default `claude-sonnet-4-6`) and the `tidy.conventions` block. `cairn doctor` checks the
key is configured once tidy is enabled. The developer setup is in
[enable tidy](enable-tidy.md), and the editor walkthrough is in
[write in the editor](write-in-the-editor.md).

New dependencies are pulled in automatically with the version: `@codemirror/lint`,
`@anthropic-ai/sdk`, and `spellchecker-wasm` with its bundled English dictionary asset (the spellcheck
Worker and the word list ship from the packaged `dist`).

## 0.62.2: the edit-load address advisory checks published entries only

The editor's address-collision advisory now compares against the published corpus on `main` and no
longer reads sibling edit branches when an editor opens an entry. The publish-time re-check is
unchanged and stays full cross-branch. Consumers must: nothing. The change is internal to the read
path and additive in behavior.

## 0.65.0: build-time syntax highlighting and labeled task-list checkboxes

Fenced code blocks are now highlighted at build time, emitting `.cairn-tok-*` token classes with no
client highlighter. GFM task-list checkboxes gain an `aria-label` from their item text. Consumers must:
nothing. A site renders both automatically. To color the highlighted tokens, add a `--cairn-code-*` ramp
to your theme and style the `.cairn-tok-*` classes from it; the Waymark showcase template is the
reference.

## 0.66.0: the additive `fields.*` field vocabulary

Contract v2 begins with an additive field vocabulary beside the existing `defineFields` model. A concept
can declare its fields as a record of `fields.*` constructors, and `fieldset(record)` derives a
validator with Standard Schema conformance and an inferred type. The new root-barrel exports are
`fields`, `fieldset`, `initialValues`, `FieldDescriptor`, `Fieldset`, `InferFieldset`, `FieldsetOptions`,
and `BehaviorTable`. Consumers must: nothing. The vocabulary doesn't yet wire into the adapter or
editor. The contract-v2 cutover, a later breaking release, names the migration off `defineFields` then.

## 0.67.0: the `fieldset` validator reaches `defineFields` constraint parity

The Contract v2 `fieldset` validator now enforces the constraints it previously accepted but ignored: a
`text` or `textarea` field's `min`, `max`, `length`, and `pattern`, and a `date` field's `min` and
`max`, with the same messages `defineFields` produces. A malformed `pattern` fails at `fieldset()` call
time rather than on every save. The validator also accepts a parsed value, not only a form string (a
numeric `number`, a `Date` on a `datetime` field), and a `multiselect` given a lone scalar coerces it to
a single-element list. Consumers must: nothing. The `fieldset` surface is still additive and not yet
wired live, and the change brings it in line with the long-standing `defineFields` checks. A site already
relying on `fieldset` directly sees stricter, correct validation it would have wanted.

## 0.68.0: engine-misc hardening (accessibility, default icons, gates)

The second hardening pass clears eight engine-misc items. The component picker dialog caps at 85vh and
scrolls its catalog within a held header and footer; a repeated content-lifecycle error in the concept
list now re-announces to a screen reader through one polite live region. The component registry ships a
default role-to-glyph fallback for the conventional admonition roles, which a component's own
`defaultIconByRole` overrides. Internal gate and doc hygiene rounds it out: the admin-prose gate scans
the `.ts` copy modules, a `check:dev-package` gate covers `packages/**` in CI, and the friction log marks
its resolved items. Consumers must: nothing. The accessibility fixes and the icon fallback are additive;
a site using the registry's `defaultIcon` may now resolve an engine default glyph where it previously got
none.

## 0.69.0: the Contract v2 `fieldset` field system goes live (breaking)

The `fieldset` field system replaces the v1 `defineFields` array. A concept's `schema` is now a
`fieldset({...})` record built from the `fields.*` constructors, the record key is the frontmatter key,
and the prior v1 surface is removed. The editor renders an arm per scalar, a fresh entry opens prefilled
from each field's `default`, and the save path round-trips every arm. Consumers must, in order:

1. Move `schema` from `defineFields([...])` (an array) to `fieldset({...})` (a record).
2. Drop the per-field `name` property. The record key is now the frontmatter key.
3. Rename field help from `description` to `help`.
4. Move a closed `tags` field to `fields.multiselect({ options: [...] })`.
5. Move an open `freetags` field to `fields.multiselect({ creatable: true })`. Its `placeholder`
   is preserved through the new optional `placeholder`.
6. Preserve each field's frontmatter key, especially `tags`, or tag pages and feeds read empty.
7. Extract a frontmatter type with `InferFieldset` (the v1 `Infer` is gone). The barrel no longer
   exports `defineFields`, `ConceptSchema`, `FrontmatterField`, `TagsField`, `FreeTagsField`,
   `InferFields`, or `DefineFieldsOptions`. The v2 `*Field` interfaces carry the v2 shape: no `name`,
   and `help` not `description`.
8. ecxc-ski and 907-life stay pinned to the prior version range until they cut over.

## 0.70.0: reference fields, additive

A concept can declare a typed frontmatter edge to another entry with `fields.reference({ concept })`, and
a list of edges with `fields.array(fields.reference({ concept }))`. The stored value is the target's
permanent id, so a rename or slug change never breaks the link. The editor renders a picker over the
target concept in the Details panel, renaming a target repoints its inbound references on `main`, deleting
a referenced target refuses fail-closed across open branches, and the build's `verifyReferences` gate fails
on a dangling edge. The public read model resolves an edge to its target's identity through the new
`resolveReferences` on `/delivery`. The barrel adds `fields.reference`, `fields.array`, and
`verifyReferences`. (`ReferenceField`, `ArrayField`, `ReferenceEdge`, and `InboundReference` left the
root barrel again in the pre-beta surface-pruning pass; `ResolvedReference` moved to `/delivery`,
its resolver's home.) Consumers must: nothing. References are additive; a site that declares no
reference field is unchanged. To adopt them, see [Link content with
references](./link-content-with-references.md).

## 0.71.0: structured fields, additive

A concept can declare an `object` group with `fields.object({ fields })`, and a generalized `array` that
now repeats any leaf or a flat `object` of leaves, not only a reference. The editor renders an `object` as
a labeled group and a non-reference `array` as a repeatable-row editor with add, remove, and reorder; the
optional `itemLabel` names each row. Validation and inference recurse one level, with a nested failure
located by the additive `issues` array on `ValidationResult`. Containers nest one level only, no field key
may contain a dot, and a `reference` inside an `object` and an `seo` image inside any container are
deferred, all enforced at the `fieldset()` call. The barrel adds the `ObjectField` and `ValidationIssue`
interfaces. Consumers must: nothing. The container shapes are additive; the shipped `array(reference)` and
reference editor are unchanged, and a site that declares no container field is unchanged. To adopt them,
see [Structured fields](./structured-fields.md).

## 0.72.0: the adapter restructure and the concept model (breaking)

`CairnAdapter` moved from flat keys into six groups, and a concept now owns its URL policy. Apply each
action below; the six-group shape is in [Define an adapter and
schema](./define-an-adapter-and-schema.md).

Consumers must: regroup the adapter. `sender` becomes `email`. The `render` method, the `registry`, and the
`icons` move under `rendering` as `rendering.{render,components,icons}` (`registry` is renamed to
`components`). `assets` becomes `media`. The `navMenu`, the `preview`, and the `supportContact` move under
`editor` as `editor.{nav,preview,supportContact}` (`navMenu` is renamed to `nav`). `content` and `backend`
keep their names.

Consumers must: rename each concept's `schema:` member to `fields:`, and wrap each concept in
`defineConcept` so its URL policy validates at declaration.

Consumers must: move the per-concept URL policy out of the YAML site-config and onto the concept. Set each
concept's `routing` (the `'feed'`, `'page'`, or `'embedded'` shorthand), `permalink`, and `datePrefix`
inside its `defineConcept` call, then delete the YAML `content:` block. A leftover `content:` block now
throws at `parseSiteConfig`, pointing here, so this is not optional for a site that carried one. A site
whose posts used a non-default `datePrefix` (for example `month`) must transcribe it, or every post URL
silently shifts.

Consumers must: move `siteName` out of the adapter. It stays in the YAML site-config, the one home for it,
and `composeRuntime` reads it from there. Any code that read `cairn.siteName` reads `siteConfig.siteName`
instead.

## 0.73.0: component attributes adopt the `fields.*` vocabulary (breaking)

A directive component's attributes moved from the bespoke `AttributeField[]` array to the same `fields.*`
field system a concept schema uses, and `defineComponent` supersedes the bare `ComponentDef` object
literal. The `AttributeField` and `FieldType` types are removed. A new `fields.icon()` descriptor joins
the vocabulary for concepts and components alike; declaring one needs no migration.

Consumers must: declare each component's `attributes` as a `fields.*` record keyed by attribute name, not
an `AttributeField[]` array. So `[{ key: 'tone', label: 'Tone', type: 'select', options: [...] }]` becomes
`{ tone: fields.select({ label: 'Tone', options: [...] }) }`. A repeatable slot's `itemFields` folds the
same way.

Consumers must: wrap each component definition in `defineComponent({ ... })` so it builds its attribute
validator and validates at declaration. A bare object literal no longer carries the `attributeSchema` that
`validateComponent` runs.

Consumers must: move any cross-field attribute `validate` off the descriptor and into the component's
`behavior` table, keyed by attribute name. The signature is `validate(value, siblings)`, where `siblings`
is the raw attribute record, so a rule reads `siblings.min` rather than the old `all.attributes.min`.

Consumers must: replace a `pattern: { source, message }` attribute with `fields.text({ pattern: source })`.
The custom per-attribute pattern message is gone; the generic format message applies, or a
`behavior.validate` carries a custom one.

Attribute validation now format-checks every value through the shared `fieldset` validator, so a
hand-authored directive that previously saved with a malformed value (`count="abc"` on a `number`
attribute, say) now fails the save-path `validateComponent`. This tightening is intended.

## 0.74.0: the backend becomes an interface with a `githubApp(...)` provider (breaking)

The adapter's `backend` field changes from a plain `{ owner, repo, branch, appId, installationId }`
object to a `githubApp({ ... })` call, the default implementation of a new `Backend` interface. The
local-development double becomes a conforming `Backend` on the per-request `event.locals.backend`
channel, retiring its global-`fetch` patch.

Consumers must: change the adapter's `backend` field from the object literal to
`backend: githubApp({ owner, repo, branch, appId, installationId })`, importing `githubApp` from
`@glw907/cairn-cms`. The field values are unchanged; only the wrapping call is new.

Consumers must: drop any import of the removed `BackendConfig`, `RepoRef`, or `AppCredentials` types,
and replace any import of `GithubKeyEnv` (from the `/sveltekit` subpath) with `BackendEnv`. A site that
only writes the standard adapter and never imported those types makes the one-line `backend` change and
nothing else.

## 0.75.0: the `render` seam becomes entry-aware and `Promise<string>` (breaking)

The adapter's `rendering.render` member changes from the positional
`render(md, opts?) => string | Promise<string>` to the entry-aware
`render({ body, concept?, frontmatter?, resolve?, resolveMedia? }) => Promise<string>`. The single
object argument carries the markdown in `body` and the resolvers alongside it, and it adds the
optional `concept` and `frontmatter` so a custom renderer can vary its output per entry. The entrance
ordinal (`data-rise`) is now stamped unconditionally by the pipeline, so the `stagger` option is gone.

Consumers must: change the adapter `render` from `(md, opts) => ...` to
`({ body, resolve, resolveMedia }) => ...`, read the markdown from `body`, and return a
`Promise<string>`. A typical body becomes
`renderMarkdown(body, { resolve, resolveMedia })`.

Consumers must: drop any `stagger` option passed to `createRenderer` or the `render` seam. The
`data-rise` ordinal is now always emitted and is inert without site CSS, so a site that wants the
entrance cascade keeps its `[data-rise]` rules and a site that does not is unaffected.

## 0.77.0: the admin chrome moves to a shared shell layout (breaking)

cairn's admin chrome moves out of the `CairnAdmin` view switch into a shared `/admin/+layout.svelte`
that renders the new exported `CairnAdminShell` component, so a site can add its own admin screen as a
normal SvelteKit route under `/admin/` behind the editor login. The `AdminLayout` component is renamed
to `CairnAdminShell`, the shell payload moves to `page.data.shell`, and the dead `LayoutData` type is
removed. Apply each action below; the seam is in
[Add a custom admin screen](./add-a-custom-admin-screen.md).

Consumers must: add the shell layout mount. Create `src/routes/admin/+layout.server.ts` with
`export const load = admin.shellLoad;` and `src/routes/admin/+layout.svelte` that renders
`<CairnAdminShell data={data.shell}>{@render children()}</CairnAdminShell>`. The chrome no longer rides
the catch-all load; it rides this layout. Copy the showcase files at
`examples/showcase/src/routes/admin/`.

Consumers must: rename `AdminLayout` to `CairnAdminShell`. The component export is renamed. A site on
the canonical single-mount never imported it directly, so this affects only a hand-rolled per-route
mount.

Consumers must: read `siteName` and the other shell fields from `page.data.shell`, not `data.layout`.
The per-view `AdminData` members no longer carry a `layout` field; the shell payload is the one source.

Consumers must: remove any `import type { LayoutData }`. `LayoutData` is removed from
`@glw907/cairn-cms/sveltekit`; read the admin payload from `AdminShellData` (via `page.data.shell`)
instead.

## Unreleased: a concept's tags come from a field marked `taxonomy: true` (breaking)

A concept declares its tag field by marking one top-level multiselect `taxonomy: true`. The content
index reads that marked field's validated value for each entry's tags, and the content index and the
feed categories both read it. The old behavior read a field hardcoded as `tags`, so a concept whose tag
field has another name no longer produces tags until you mark it. This entry heads the first free minor
after `0.77.0` publishes; the version is set at release time.

Consumers must: add `taxonomy: true` to each concept's top-level tag multiselect. A concept with no tag
field needs no change.

## Unreleased: the public route loaders narrow to one `entryLoad` (breaking)

`createPublicRoutes` resolves one entry per request path. It returns `{ entryLoad, entries }`;
`entryLoad(event)` returns the entry payload and throws `error(404)` on a miss. The pre-`0.77.0`
`archiveLoad`, `tagIndexLoad`, and `tagLoad` loaders are removed: cairn ships no public tag pages, and a
site renders an archive from `site.concept(id).all()` and a tag list from the tags-as-data on
`ContentSummary.tags`. This entry rides the same release as the preceding taxonomy marker.

Consumers must: drop any call to the removed `archiveLoad`, `tagIndexLoad`, or `tagLoad`; render those
surfaces from `site.concept(id).all()` and `ContentSummary.tags` in site code. The catch-all keeps
calling `entryLoad`; no `data.kind` branching is needed.

## Unreleased: an opt-in tag vocabulary makes the taxonomy field a closed picker (non-breaking)

A site can configure an editor-owned tag vocabulary through a new `vocabulary` key in
`site.config.yaml`, a list of `{ value, label }` entries read at build through the new public
`validateVocabulary`, `extractVocabulary`, and `setVocabulary` functions. With a vocabulary configured,
the concept's taxonomy field (the multiselect marked `taxonomy: true`) becomes a closed picker on save
and on edit: the editor picks from the configured tags, and a value that is neither in the vocabulary
nor already on the entry is rejected. A pre-existing value the vocabulary does not list, an orphan, is
preserved and renders flagged "not in your tag list," never silently dropped. This entry rides the same
release as the preceding taxonomy entries.

Consumers must: nothing. The vocabulary is opt-in. A site with no `vocabulary` key keeps the open
creatable taxonomy field, and the build-time tags-as-data read is unchanged; enforcement is a
save-and-edit concern only.

## Unreleased: an admin screen curates the tag vocabulary (non-breaking)

A new `vocabulary` admin view at `/admin/vocabulary`, with a `saveVocabulary` action, lets an editor
curate the vocabulary from the admin: add a tag, rename a tag's label, delete an unused tag, and seed
the list from tags already in use but absent from the vocabulary. Deleting a tag in use across the
default branch or any open edit branch is rejected, failing closed. The screen commits the curated
list to the `vocabulary` key in `site.config.yaml`. The size-gated archive tag filter is a showcase and
template surface over `ContentSummary.tags`; cairn ships no public filter component. This entry rides
the same release as the preceding taxonomy entries.

Consumers must: nothing. The screen mounts with the rest of the admin and writes only when an editor
saves.
