# Changelog

All notable changes to this project are recorded here, most recent first.

## Unreleased

The `svelte` peer dependency floor rises from `^5.0.0` to `^5.56.3`, turning the 0.40.0 advisory
into an enforced range: consumer sites compile the shipped `.svelte` sources, and svelte `5.56.1`
miscompiles parenthesized boolean groupings. `cairn-doctor` gains a `config.dependency-floors`
check in its default set, which compares the lockfile's resolved `svelte` and `@sveltejs/kit`
versions against the peer ranges the installed engine declares.

Consumers must: raise the `svelte` devDependency range to at least `^5.56.3` (and `@sveltejs/kit`
to `^2.12` where it sits lower) and reinstall so the lockfile re-resolves. A site pinning svelte
below the floor now draws an npm peer warning or resolution failure on install, and the doctor
reports the below-floor version as a blocker.

The edit page's preview now renders inside a sandboxed iframe whose document links the site's own
stylesheets, so an entry proofs in the site's real styling without that CSS ever touching the
admin document. The adapter gains an optional `preview` member naming the compiled CSS URLs (a
Vite `?url` import resolves the hashed asset) plus `bodyClass` and `containerClass` for the site's
body classes and content wrapper, and a `byConcept` map overrides either class per concept for a
site whose posts and pages wrap content differently. While Preview shows, the sidebar steps aside
so the document takes the full width, and a width menu on the Preview tab sizes the frame to
Desktop, Tablet, Phone, or Small phone, persisted per browser.

Consumers should: wire `preview` in the adapter, referencing the sheet only through `?url` and
linking the same URL from the site layout, the way
[the adapter guide](docs/guides/define-an-adapter-and-schema.md) shows. Without the knob the
preview renders unstyled markup behind a one-line hint.

The editor's directive highlighting now recognizes labeled and attributed `:::` openers and fences
of four or more colons, where before only bare closers matched, and nested containers step their
band and rail tint by depth. No consumer action.

`cairn-doctor` derives its missing inputs from the repo it runs in: the backend owner and repo
plus the sender address come from evaluating the site's config module through the manifest bin's
Vite machinery, and the Cloudflare account id comes from the wrangler config, with flags and
environment variables taking precedence. A new `--probe <url>` flag runs a zero-side-effect live
check against the deployed admin's sign-in surface: the login envelope, the CSRF cookie and field,
and the uniform non-leak answer to a stranger's sign-in request. Consumers may: drop the `--from`
and `--repo` flags from doctor invocations and run `npx cairn-doctor --probe <url>` after a
deploy.

## 0.50.0

The admin now mounts as one catch-all route. A new `createCairnAdmin(runtime, deps)` facade
serves every admin view through a single `load` and a single `actions` record, the new
`CairnAdmin` component switches the views on the discriminated `AdminData`, and `parseAdminPath`
is the one path authority behind both. A site's whole `/admin` surface is now three files (the
`$lib/cairn.server.ts` composer plus the `/admin/[...path]` route pair) instead of a per-route
tree of shims whose action names coupled to engine components by bare string. The admin URLs are
unchanged. The per-surface factories (`createContentRoutes` and friends) stay public as the
advanced seam.

Consumers must: delete the admin route tree and replace it with the two-file mount plus the
composer; the exact files are in
[the canonical admin mount](docs/reference/admin-routes.md) and the migration is the `0.50.0`
section of [the upgrade guide](docs/guides/upgrade-cairn.md). The engine's auth and shell forms
now post named actions (`?/request`, `?/confirm`, `?/logout`, `?/publishAll`), so a site that
mounts `LoginPage`, `ConfirmPage`, or `AdminLayout` directly must register those names, and the
`/admin/auth/logout` server route leaves the contract.

Consumers must: rename `createSiteIndex` to `createSiteResolver` and `SiteIndex` to
`SiteResolver` where imported from `/delivery/data`; the `paginate` helper is deleted.

Consumers must: read `form.error` where they read `form.renameError`. Every action failure now
carries `error: string` as its one-line summary; the structured extras (`brokenLinks`,
`inboundLinks`) keep their keys beside it.

Consumers must: replace the hand-written `App.Locals` block in `src/app.d.ts` with
`import '@glw907/cairn-cms/ambient';`, the new type-only subpath that ships the
`App.Locals.editor` augmentation.

The diagnostics registry reaches its remaining runtime sites. A missing `AUTH_DB` on a gated
admin request renders a branded condition page instead of a silent login redirect, and a missing
email binding, missing GitHub App credentials, and an invalid site config now carry their
registered condition ids through the error chain and the logs.
`deps.mintToken` widens to accept a plain string return. The concept list reads published rows
from the committed manifest in one call, falling back to the per-file crawl only on a repo with
no manifest yet. Internal layering rides along (one home each for the link rewriter, the escape
helpers, and the conflict check) with no consumer surface change.

This release publishes together with `0.41.0`, so a site crossing from `0.40.0` takes both
windows in one upgrade.

## 0.41.0

`cairn-doctor` ships as a second bin: a setup preflight that runs nine checks over the local config
files (the wrangler bindings, observability, the CSRF handoff, the site config), the Cloudflare
account (the onboarded sending domain, Always Use HTTPS, HSTS, the D1 auth store with its schema
and an owner row), and the GitHub App's full reachability chain. Every check reports into one
plain-text report, a failure prints its condition's why and remediation from the diagnostics
registry, and the exit code is 1 on any failure, so the command slots into a deploy script as a
gate. A missing credential makes the affected checks skip rather than fail, and
`--send-test <address>` opts into one real email through the Email Sending API. The new
[Cloudflare readiness guide](docs/guides/cloudflare-readiness.md) walks the same conditions
manually, a `check:readiness` gate pins that guide to the condition registry, and
[the doctor reference](docs/reference/doctor.md) covers the flags, the checks, and the CI wiring.

The admin layout's GitHub degrade gains a signal. When the pending-entries read fails, the layout
logs a warn-level `github.unreachable` record and the topbar's Publish site button hides instead
of showing a count it cannot know.

Consumers may: run `npx cairn-doctor --from <address> --repo <owner/name>` as a pre-launch gate,
work through the readiness guide when standing up a fresh account, and filter Workers Logs on
`github.unreachable` when the publish button goes missing.

A debt batch rides along. The editor's link autocomplete no longer
pulls CodeMirror into the server bundle, the edit page's load reads its GitHub probes in parallel,
concurrent cold-start token mints coalesce into one, publish-all pluralizes its commit message and
an empty publish-all explains itself instead of redirecting silently, the unsaved-changes warning
tracks client-side navigation and no longer double-fires on a full page unload, the toolbar's
keyboard tab stop holds across Preview round trips, the word count ignores markdown and directive
syntax, and the list's publish flash announces reliably to screen readers.

Consumers must: be on `@sveltejs/kit` 2.12 or later before taking this release. The edit page now
reads `$app/state`, which shipped in kit 2.12.0, and the peer range says so (`^2.12`); a site on
an older kit must upgrade kit first.

## 0.40.0

The edit page is redesigned around the manuscript. A sticky translucent header carries the
breadcrumb, the status badge (New, Edited, or Published, with Hidden beside it when the `draft`
flag is set), an unsaved-changes indicator, Publish and Save, and an overflow menu holding Discard
changes and Delete. The editor sits in one card frame: a full GFM toolbar (bold, italic, two
heading levels, lists, quote, and a More menu with strikethrough, inline code, code block, a table
starter, horizontal rule, and task list), the writing surface, and a footer with a word count and
a Markdown help cheat sheet. Write/Preview tabs replace the stacked preview. When the schema
declares a `title` field, the document title hoists above the card, and the sidebar groups into
Details, Visibility (the `draft` flag as the Hidden toggle), and Address (the slug beside a Change
URL button). On the surface itself: markdown syntax highlighting in the admin palette, a soft
accent band with a plain-language tooltip on `:::` directive machinery, and native browser spell
check.
Ctrl/Cmd+B and Ctrl/Cmd+I format the selection, Ctrl/Cmd+K opens a new web-link dialog,
Ctrl/Cmd+S saves, and leaving the page with unsaved edits asks first.

The component surface grows additively. `MarkdownEditor` gains `registerFormat` and
`registerGetSelection`, and it no longer renders its own toolbar or card chrome; the host frames
it, and `EditPage` does. `DeleteDialog` and `RenameDialog` gain an exported `open()` and a
`trigger` prop, `LinkPicker` gains an exported `open()` and a `disabled` prop, and
`ComponentInsertDialog` gains `disabled`. The light theme's `--color-accent` darkened to
`oklch(54% 0.16 300)` so the editor's directive ink holds AA contrast.

Consumers must: nothing for a site mounting the admin through the route factories and `EditPage`;
no shim, action, or load changes. A site that renders `MarkdownEditor` directly, outside
`EditPage`, no longer gets an embedded toolbar or card frame; it may host its own controls through
the new `registerFormat` seam or accept the plain surface. One advisory for every consumer: sites
compile the shipped `.svelte` sources, and svelte `5.56.1` has a compiler bug that misprints
parenthesized boolean groupings, so use svelte `5.56.3` or newer. The editor-facing walkthrough is
[the write-in-the-editor guide](docs/guides/write-in-the-editor.md).

## 0.39.0

Content edits are now held until a deliberate Publish. A save commits to the entry's pending
branch, `cairn/<concept>/<id>`, cut lazily from the default branch's head, and the live site does
not change. The per-page Publish validates and holds the posted form like a save, then commits
that markdown to the default branch, with its manifest row upserted, in one commit; that commit
triggers the deploy. The pending branch is then deleted, guarded by a head-sha check so a save
landing mid-publish is never destroyed. A
site-wide "Publish site (N)" action in the admin topbar ships every pending entry in one atomic
commit. Discard deletes the pending branch, restoring the live version of a published entry or
removing a never-published one entirely. The ref's existence is the only pending state; there is
no metadata file and no database row.

The admin shows the new state everywhere. List rows carry a status badge (New, Edited, or
Published), with the `draft:` flag re-presented as a separate Hidden badge whose mechanics are
unchanged. The edit page gains a pending banner, a Publish button, and a Discard changes confirm.
Deleting an entry cascades to its pending branch, and renaming is refused while one exists.
`EntrySummary`, `ListData`, `EditData`, and `LayoutData` widen accordingly, `createContentRoutes`
returns the three new actions, and three log events join the vocabulary (`entry.published`,
`entry.discarded`, `publish.failed`), with `commit.succeeded`/`commit.failed` carrying a `branch`
field on the save path.

Consumers must: add publish/discard to the edit shim's actions and publishAll to the list shim's actions; saves no longer deploy the site, Publish does.
The exact lines are in
[the upgrade guide](docs/guides/upgrade-cairn.md) and
[the admin route structure](docs/reference/admin-routes.md). The editor-facing walkthrough is
[the publish and discard guide](docs/guides/publish-and-discard.md).

## 0.38.0

The magic-link send is now awaited rather than fire-and-forget, so a delivery failure reaches the
login response instead of being swallowed. `requestAction` returns a `status` discriminant
(`sent` | `send_error` | `throttled`) alongside the existing `sent` boolean, and `LoginPage` renders
a send-error and a throttled state. The `auth.link.send_failed` log record gains a `code` (the
Cloudflare binding error code) and a `conditionId` (the mapped diagnostic condition).

Consumers may: read `form.status` to render the new states. A site rendering against `form.sent` is
unaffected, since `sent` is unchanged.

## 0.37.1

Internal groundwork and a docs overhaul; nothing in the public surface or runtime behavior
changes, and no consumer action is needed.

The diagnostics foundation lands as an internal module: a condition registry
(`CairnCondition`), a `CairnError` throw primitive, and a shared condition-response renderer
that the admin guard's three rejection responses (the two CSRF reasons and the HTTPS check) now
route through. Those responses are unchanged and regression-pinned, and the module exports from
no package subpath. This is Pass 1 of the diagnostics initiative, the base the upcoming
`cairn doctor` and readiness checks build on.

Docs are reorganized and rewritten. A new README front door tells the save-flow story, says
what cairn is not, names the chosen stack, and then opens three doors: the tutorial, the
showcase, and the docs map. Stray top-level pages joined their Diátaxis arms (the admin route
contract is `docs/reference/admin-routes.md`, the sanitize floor is
`docs/explanation/render-safety.md`, key rotation is
`docs/guides/rotate-the-github-app-key.md`), and every adopter-facing page is rewritten in a
second-person, example-first voice with its technical content intact.

The magic-link sign-in confirmation is now a branded panel in place of the flat success bar. After an
editor requests a link, the page shows a mail icon in a soft success tile, a "Check your email"
heading, and the ten-minute expiry note, all in the admin's Warm Stone styling. Below a divider it
adds guidance for the link that never arrives: check the spam folder first, then confirm the address
matches the one the site owner added. This covers the common fat-finger case, where a mistyped address
gets the same neutral confirmation and no email. A "Use a different email" action returns to the form
so the address gets corrected without a reload. The confirmation copy stays identical whether or not
the email is on the allowlist, so the page still never leaks membership.

The change is internal to the `LoginPage` component and needs no action.

## 0.36.0

cairn now emits structured diagnostic events. The engine had three bare `console.error` calls and no
queryable diagnostics. An internal logger assembles a JSON record for each event, with an envelope
(`level`, `event`, `timestamp`) and event-specific fields, and writes it to `console`. Cloudflare
Workers Logs ingests and indexes those records when a site sets `observability.enabled = true`, so
each field filters. The event vocabulary covers the auth flow, the commit pipeline, and the admin
guard's pre-resolve refusals. The records carry an editor's email for attribution and never carry a
magic-link token, a session id, or a magic-link's contents; a standing redaction test pins that.

The event names are a stable contract, so renaming one is a breaking change later. The full list, with
each event's level, trigger, and fields, is in the new [log events reference](docs/reference/log-events.md),
and the [read cairn's logs guide](docs/guides/read-cairn-logs.md) covers the one setup line and the
dashboard query.

Consumers may: set `observability.enabled = true` in `wrangler.jsonc` to read the events in Workers
Logs. The change is otherwise additive and needs no action.

## 0.35.0

cairn now owns CSRF for the admin. A consuming site disables SvelteKit's global `checkOrigin`, and
cairn's guard becomes the single authority. Every unsafe admin form POST must carry a valid
`__Host-cairn_csrf` double-submit token (the cookie name is `cairn_csrf` bare on local http). The
token is issued lazily and stably by the login, confirm, and admin shell loads, rendered as a hidden
`csrf` field by the new `CsrfField` export, and validated centrally in the guard. A failed check
serves a branded 403 page in place of the framework's raw text. The session cookie stays a second
layer. The token tolerates a missing `Origin`, so the JS-free magic-link sign-in works from a
browser that omits the header. The guard restores the strict `Origin === url.origin` check for the
site's own non-admin form POSTs, so handing cairn the admin authority is not a net loss elsewhere.

The `CsrfField` component is a new export from `@glw907/cairn-cms/components`. The `LoginPage` and
`ConfirmPage` data now carries `csrf`, and `AdminLayout`'s `LayoutData` now carries `csrf`, which the
shell provides to its descendant forms through context.

Consumers must: set `csrf: { checkOrigin: false }` in `kit` in `svelte.config.js`. Without it the
framework's global check rejects the JS-free auth POST and the admin sign-in fails.

## 0.34.0

A deployed admin request that arrives over http now gets a clear, branded help page instead of the
framework's opaque CSRF 403. The magic-link sign-in posts a JS-free form, and the framework rejects a
form POST unless the request carries a matching https origin, so an admin reached over http cannot sign
in. The auth guard detects that case on a deployed host and serves a self-contained page that names the
problem, links to the https version for one-click recovery, and gives the exact Cloudflare fix (Always
Use HTTPS). The page matches the admin design system in light and dark. Local `wrangler dev` over http
is exempt.

The release also adds a `check:prose` gate (`scripts/check-admin-prose.mjs`, in CI) that scans the admin
components' user-facing strings for AI-writing tells, since the component copy ships compiled and a
consuming site's prose tooling never sees it.

Consumers may: force HTTPS at the edge (Always Use HTTPS plus HSTS), which the deploy guide now requires.
The help page is a fallback for the window before that is set, not a substitute.

## 0.33.0

The admin isolates itself from host chrome. A dev-only guard in the admin and login roots walks the
ancestor chain on mount and logs one `console.error` when a width-constraining ancestor sits between the
admin root and `<body>`, the sign that a site's root layout is wrapping the admin in its own nav, footer,
or container. The guard compiles out of production and changes no rendering. The canonical route pattern
is documented and demonstrated: a chrome-free root layout plus a URL-transparent `(site)` group that
holds the public chrome and `app.css`, so the host chrome never wraps `/admin`. The showcase gains a
`(site)` group with plain-CSS chrome, which proves the admin renders fully styled on a site that uses
neither Tailwind nor DaisyUI.

This closes the global at-rule note carried since the self-styling foundation. The compiled admin sheet
holds DaisyUI `@keyframes` and Tailwind `@property` rules that are document-global by CSS spec, but the
sheet is code-split to the admin roots that import it, so it loads only on `/admin`, and the route pattern
keeps the host's CSS off `/admin` from the other side. A boundary test pins that the admin sheet is
imported only by the admin roots.

Consumers must: keep the host root layout chrome-free and move the public chrome plus `app.css` into a
`(site)` route group, so the host chrome never wraps `/admin`. A site already on this structure needs no
change. The dev guard names the problem in the console if a root layout still wraps the admin.

## 0.32.0

The admin gets a real CMS UX. The concept list is now a searchable, sortable data-table with status
badges, formatted dates, per-row delete, and pagination. The sidebar carries an icon per nav item and
a user menu with sign-out. The topbar is sticky and shows breadcrumbs. The admin has a dark mode, with
a topbar toggle that persists through a cookie and follows the OS preference on a first visit. The admin
icons are Lucide, added as a runtime dependency.

This release also fixes the self-styled admin so its drawer sidebar renders: the stylesheet build now
flattens CSS nesting before scoping (so DaisyUI's `lg:drawer-open` reveal is not severed from its
parent), and the admin layout carries `data-theme` on a wrapper so the drawer's own classes are scoped
descendants. The build gained `lightningcss` as a build-only devDependency for the flatten step; this
does not affect a consumer's runtime.

A frontend-design polish pass then refined the look. The Warm Stone light and dark palettes gained
clearer surface layering and crisper borders, the sidebar an active state in a soft primary tint, and
the list table refined column labels, row hover, and cleaner entry-title links. The list now defaults
to newest-first. A reduced-motion preference is honored inside the admin. A scoped anchor reset
restores the no-underline, inherit-color default the omitted Preflight used to provide.

A design-identity pass then gave the admin its own look. Cairn has a wordmark set in Bricolage
Grotesque over a body face of Figtree, both self-hosted as variable woff2 under the SIL Open Font
License, so the admin makes no webfont network call. An app-icon brand tile sits at the top of the
sidebar with the Cairn cairn-stack mark, a CC0 public-domain glyph, beside a CMS chip. The surfaces
moved to softer radii and floating cards over a calm warm-neutral ground, with a soft violet lift on
the primary button. The sidebar and the topbar share one flat header strip, so their intersection
reads as a single plane.

The nav now groups its entries. The core Cairn functions live in one collapsible group, and a
developer's own admin extensions sit in their own custom-named groups at the same level. Each group's
open or collapsed state persists through a `cairn-admin-nav-collapsed` cookie that the layout load
reads for a no-flash first paint, the way the theme cookie already works. A command palette opens with
Cmd/Ctrl+K or the topbar search box, jumps to any admin destination, and runs a couple of actions like
the theme toggle. The login and confirm screens carry the same wordmark, voice, and favicon.

Two more rendering fixes landed in this window. The login and confirm screens centered on a wrapper
rather than the themed element, so they now fill the viewport like the rest of the admin. The command
palette closed its dialog from a result link's own click handler, and closing a native dialog mid-click
cancelled the navigation, so a destination did nothing; a destination now navigates and the palette
closes once the new route lands.

This is additive for a consumer that mounts the admin through the documented routes. The engine now
depends on `@lucide/svelte`, which installs transitively, so no consumer action is required. A new
`listDeleteAction` is available on the content routes for wiring per-row delete on the list page; the
showcase wires it as the list `?/delete` action.

## 0.31.0

The admin now ships its own stylesheet. The engine compiles the admin's Tailwind utilities and
DaisyUI component classes, scoped under the admin `data-theme`, and the admin styles itself on any
host with no Tailwind or DaisyUI of its own. The compiled sheet leaks no global rule, so it never
touches the host's pages.

Consumers may: remove any Tailwind `@source` entry that existed only to generate the admin's classes;
the admin no longer depends on the host's Tailwind or DaisyUI build. A host that already provides
DaisyUI globally keeps working, since the engine's scoped rules are low-specificity (`:where`) and
the class names match; a later pass moves the admin out of the host's chrome entirely.

## 0.30.0

Carved a `@glw907/cairn-cms/render` authoring subpath for the component-authoring toolkit. `iconSpan`,
`cardShell`, `headRow`, the re-homed `isElement`, and the new `strAttr` now live there, so the root barrel
stays lean and a component `build()` imports its helpers from one obvious place. Added `strAttr(ctx, key)`,
a string-attribute reader, a configurable `headRow` heading level that defaults to 2, a
`registry.iconField(name)` accessor, and a `defineRegistry` guard that fails a component declaring
`defaultIconByRole` with no `type:'icon'` attribute. Dropped `rehypeDispatch` from the public surface, so
`createRenderer` is the one public render pipeline.

Consumers must: import `iconSpan`, `cardShell`, `headRow`, `isElement`, and `strAttr` from
`@glw907/cairn-cms/render` instead of the package root, and replace any direct `rehypeDispatch` use with
`createRenderer`. A component that sets `defaultIconByRole` with no `type:'icon'` attribute now fails
`defineRegistry`; give it an icon attribute or drop `defaultIconByRole`.

## 0.29.0

Consolidated the URL-identity model. A content entry's id, slug, date, and permalink are now derived in
one place (`entryIdentity`), so the content index and the manifest cannot drift on an entry's URL, and a
site's concept descriptors are resolved through one path shared by the admin runtime and the delivery
layer. No public surface changed.

The YAML URL policy is now validated at build. A permalink pattern must be root-relative and use only the
tokens `:slug`, `:year`, `:month`, and `:day`, a date token is valid only on a dated concept, a
`datePrefix` must be `year`, `month`, or `day`, and a policy keyed to an undeclared concept fails the
build.

Behavior note: a site whose `content:` URL policy was malformed and silently defaulted will now fail the
build with a named error. A valid policy is unaffected.

## 0.28.0

### Security
Closed the render attribute-sink residual by construction. A new post-dispatch guard runs last in
`createRenderer` and neutralizes the sinks a component `build()` could route a raw author attribute
value into, including the unsafe URL schemes `javascript:`, `data:`, and `vbscript:` in `href`,
`src`, `srcset`, `xlink:href`, `poster`, `formaction`, `action`, `object`'s `data`, and
`background`, the inline `on*` event handlers, and inline `style`, which is stripped wholesale. Safe
schemes, relative URLs, anchors, and the `cairn:` token are preserved. The guard is gated by the
existing `unsafeDisableSanitize` switch.

Behavior note: a site whose component `build()` emits a non-standard URL scheme, an `on*` handler,
or inline `style` will see that output neutralized. Route dynamic styling through a class or an
inert `data-*` attribute instead.

## 0.27.0

### Changed (breaking)
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

## 0.26.0

### Added
- A `cairnManifest()` Vite plugin (`@glw907/cairn-cms/vite`) verifies the committed content manifest on
  every build and fails the build with a diff naming what drifted. The check runs outside the prerender
  lifecycle, so `handleHttpError` cannot mask it. Consumers must: add `cairnManifest({ configModule,
  content, manifestPath })` to the Vite config.
- A `cairn-manifest` bin regenerates the committed manifest from a Vite context. Consumers must: set the
  regenerate script to `"cairn:manifest": "cairn-manifest"` and delete the hand-written
  `scripts/build-manifest.mjs`.
- A node-safe `@glw907/cairn-cms/delivery/data` entry exposes the pure delivery projections with no
  `@sveltejs/kit` in the graph. Consumers must: move any plain-Node import of a delivery data helper
  (such as `buildSiteManifest`) from `@glw907/cairn-cms/delivery` to `@glw907/cairn-cms/delivery/data`.

### Changed
- `verifyManifest` now throws an error that names the added, removed, and changed entries. Consumers
  must: nothing. The message is strictly more informative.

## 0.25.0

### Changed (breaking)
- `composeRuntime` now takes a single object, `composeRuntime({ adapter, siteConfig, extensions? })`,
  and derives the per-concept URL policy from `siteConfig`. The loose third `urlPolicy` argument is
  gone, and a missing `siteConfig` throws. Consumers must: pass the parsed site config to every
  `composeRuntime` call and drop any hand-passed URL policy.

### Changed
- `createRenderer()` now defaults its registry to the empty registry, so a plain-prose site calls
  `createRenderer()` with no argument. Consumers must: nothing; passing a built registry is unchanged.

### Docs
- A render sanitize-floor reference (`docs/render-sanitize-floor.md`) states what the floor keeps,
  strips, and rewrites, including the `target="_blank"` rel policy.
- An upgrade guide (`docs/upgrading.md`) collects the `0.x` renames with a consumer action each.

## 0.24.0

### Added
- `headRow(title, icon?)` builds the icon-plus-heading component head, exported beside `cardShell` and
  `iconSpan`.
- A `createRenderer` `anchorRel` option sets the `rel` value forced on `target="_blank"` anchors
  (default `'noopener noreferrer'`), or disables the injection when set to `false`.

### Changed
- A component's `defaultIconByRole` default now reaches the build through the declared `type: 'icon'`
  attribute (`ctx.attributes`), so a role default no longer needs a hardcoded fallback in the build. A
  component using `defaultIconByRole` must declare a `type: 'icon'` attribute.
- The engine drops an unclaimed directive `[label]` when a component has no `title` slot, so a stray
  `[]` no longer renders an empty paragraph.

### Removed
- The internal `data-icon` marker, which no build read. The resolved icon now travels on the declared
  attribute path.

## 0.23.0

### Changed (breaking)
- A `date` field now validates a real `YYYY-MM-DD` calendar date. A site adopting this version whose
  committed content holds a malformed or impossible date will see it fail validation, which is the loud
  failure this restores.
- A `tags` field now enforces its declared `options` as a closed vocabulary. A committed value outside
  the list fails validation. Use a `freetags` field for free-form tags.
- `normalizeConcepts` now throws when a `summaryFields` key names no declared field, so a typo fails at
  config load instead of silently producing an empty list card.

### Changed
- `AttributeField.options` is now `readonly string[]`, so a site can share one frozen `as const`
  vocabulary across components. Read-only by use, so no call site changes.

## 0.22.0

### Added
- `ContentSummary.concept` and `EntryData.concept`: the read model carries its resolved concept id, so a
  list or page branches per concept without re-deriving it from `entry.date`.
- A `summaryFields` knob on a concept config surfaces named frontmatter keys on `ContentSummary.fields`,
  so a list card reads an authored field with no per-entry detail read.
- The package root re-exports the delivery route loaders (`createPublicRoutes`) and the response helpers
  (`rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`).

### Changed (breaking)
- `CairnHead` moved off the `@glw907/cairn-cms/delivery` barrel to its own `@glw907/cairn-cms/delivery/head`
  entry, so a node-environment data import from `/delivery` stays component-free. Update the import:
  `import { CairnHead } from '@glw907/cairn-cms/delivery/head'`.
