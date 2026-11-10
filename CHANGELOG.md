## Unreleased

<!-- release-size: minor -->

A new site now starts from a small standard content set in place of the showcase's trail demo. The
template carries a home page, About, an author page, a Contact page with a placeholder address, six
short how-to posts, and one post that shows every markdown element and each block once. Its one image
ships with the site, so no page loads a picture from another host. The showcase keeps its own fixtures.
The emit takes `src/content/` and `static/` from `scripts/build/starter-overlay/`.

- **The release gate is rebuilt around three legs, and the setup docs gain the token option.** The agent page and the `cairn-setting-up-a-site` plugin skill say how to run `cairn` as one bare background command and how `CAIRN_CF_SETUP_TOKEN` replaces the Cloudflare approval. They also say to run `npx create-cairn-site` with no npx option such as `--yes` in front of the name, no version or tag on it, and no `new` after it, since an option or a tag can keep the call inside the sandbox and the launcher already runs `cairn new`. `cairn new --plan`, `--apply`, and `--resume` now stop at once, with a message that says why, when the call runs inside Claude Code's sandbox, where the approval tab can't be reached. A subdomain given with `--host` is now checked for records on the subdomain, and no longer refused for the records on its zone's apex. The rulings ledger records the verdict.

  Consumers must: nothing.

- **`cairn new` no longer refuses a domain's bare address for its mail records.** The opening check
  counts only A, AAAA, and CNAME records on an address, so an apex that holds an MX and an SPF TXT
  passes, and a domain with live mail can host the site where its owner expects. An address with an A,
  AAAA, or CNAME record or a Worker on it is refused as before. A subdomain given with `--host` is now
  checked for records on the subdomain, not on its zone's apex. The three admin pages that described the
  refusal say which records count.

  Consumers must: nothing.

- **The engine package now ships the Waymark site template and a theme catalog.** The tarball carries `template/waymark/` (the composed starter plus its deploy and check workflows) and `template/catalog.json`, which the `cairn new` setup command will fetch in a later change. Nothing in a site changes: the files sit beside `dist`, and no export or entry point moves.
- **A new CI matrix scaffolds the setup answers.** `setup-matrix` scaffolds every answer combination from a packed engine tarball and runs `npm run check`, `npx cairn-manifest`, and `npm run build` on each.
- **The admin docs describe `cairn new`.** `before-you-start`, `create-your-site`, `own-your-domain`, `setup-recovery`, `troubleshooting`, and `credentials` are rebuilt for the new setup, and four pages are new: `set-up-with-an-agent`, `deploys`, `suggested-plugins`, and the generated `setup-reference`. The agent page is also embedded in the `cairn` binary, and a test fails when the copy drifts.
- **A `cairn` Claude Code plugin and marketplace.** `.claude-plugin/marketplace.json` names the marketplace `cairn`, and `plugins/cairn` holds one skill, `cairn-setting-up-a-site`, that runs the plan and apply steps for an owner. A new site's `.claude/settings.json` offers the Svelte, Cloudflare, and daisyUI plugins, and its `.mcp.json` adds the Svelte MCP server. Both READMEs open with "Setting up with an agent".
- **`cairn new` is shown, and `npm create cairn-site` becomes a launcher.** The JavaScript wizard under `packages/create-cairn-site` is gone. The package now holds only `bin.mjs`, which finds the prebuilt `cairn` binary in one of six optional platform packages (`@glw907/cairn-<os>-<cpu>`) and runs `cairn new` with every flag passed through. The tool release (`tool.yml`, a `tool/v*` tag) packs and publishes the six platform packages and the launcher at the tool's version, so the launcher no longer versions with the engine, and `publish.yml` and `scripts/release/*` drop it from the engine's lockstep. The template bake, the transcript corpus, and the site-config path moved to `scripts/build/` and `tool/testdata/`, and `check:symbols` reads `cairn new`'s flags from the tool's `flags.json`.

- **The site's files move from `src/theme/` to `src/site/`.** `cairn.config.ts`, `site-config.ts`, and `site.config.yaml` now live in `src/site/`, reached by a `#site/*` subpath import, which leaves `src/theme/` to the theme alone. Two stylesheets join them, `src/site/theme-options.css` and `src/site/overrides.css`, linked after the theme's sheets in the layout, the error page, and the adapter's preview `stylesheets`. The engine's fixed site-config path (`DEFAULT_SITE_CONFIG_PATH`) is now `src/site/site.config.yaml`, the Go doctor still finds the old `src/theme/` path as a legacy location, and `@glw907/cairn-cms-dev`'s fake backend seeds the config at the new path.
- **A missing site config logs `config.missing`.** The nav, settings, and vocabulary loads each emit a `warn` record with `scope` and `path` when the file is absent, in place of failing without a trace. The `log-events` table lists it.
- **The directive vocabulary lives in the chassis.** The nine standard directives are in `src/chassis/directives/`, and the adapter builds its `blocks` with `composeBlocks(icons, renderers)`. A theme replaces a directive's `build` through `src/theme/directives/renderers.ts` and cannot add, drop, or rename one. `src/theme/markdown-blocks.ts` is gone, and a theme's islands moved to `src/theme/directives/islands/`.
- **The chassis gained two roles a theme can set.** `--cairn-eyebrow-case` (default `uppercase`) drives the new `eyebrow-case` utility, and `--cairn-scroll-cue` set to `none` turns off the code block's scroll gradient.
- **Fonts are self-hosted.** The theme carries its woff2 files, and the three `@fontsource-variable` devDependencies leave the showcase and the template.
- **A theme is a directory with a contract.** Waymark lives in `themes/waymark/`, and the showcase's `src/theme/` is generated from it by `npm run theme:lay-in` (`scripts/theme/lay-in.mjs`) and no longer tracked. `cairn-theme.json` is the manifest, checked against `schema/cairn-theme-1.schema.json`, and `schema/cairn-theme-contract-1.json` lists the contract's required and allowed paths, the generated `theme-names.ts`, the required token names, and the names only the chassis sets. The lay-in also generates `theme-names.ts` and the cookie regex in `src/app.html` from the manifest's `colorModes`. The `cairn-styling-public-pages` skill's theme-directory page describes the contract.
- **Waymark's values are tokens.** `themes/waymark/tokens/tokens.json` and `resolver.json` hold them as DTCG tokens, and `scripts/theme/build-tokens.mjs` writes `tokens/tokens.css`, `modes/light.css`, `modes/dark.css`, and any `options/` sheets from them. `theme.css` imports the built `tokens/tokens.css` where the two daisyUI blocks and the `@theme` scale used to sit.
- **`cairn-audit` prints what it measured.** `AuditReport` gains a `measured` list (`Measured`: rule id, file, and the daisyUI theme blocks read there), filled by `theme-contrast` and `theme-conformance` through an optional `StaticRule.measured` method. `formatReport` prints it, and prints `measured nothing` when no theme sheet was read, so a clean run over an empty scope no longer reads as a clean theme. A caller that builds an `AuditReport` by hand adds `measured: []`.
- **A theme check, a theme viewer, and a conformance set.** `npm run check:theme -- <themeDir>` runs thirteen rules over a theme directory (`manifest-schema`, `contract-version`, `tokens-schema`, `resolver-options`, `paths-required`, `paths-unlisted`, `tokens-stale`, `tokens-required`, `render`, `directive-styled`, `audit`, `fonts`, `external-host`) and prints one verdict, as text or as `--json` valid against `schema/cairn-theme-check.schema.json`. `--catalog` checks every catalog theme. The `test` job runs it on every pull request and on each push to `main`, after `npm run test:theme`, and a release waits on that job, so a failing catalog theme blocks the release. `npm run theme:view` renders the standard content and the conformance set (`scripts/theme/conformance/`: hostile cases and one page per markdown layer) under any theme, option, color mode, and width. It runs interactively behind a control page, or headless to PNGs and JSON, and needs no Cloudflare account. Waymark ships three catalog screenshots made with it. `build-tokens.mjs --check` also fails on an option sheet no option value builds.
- **A footnote's links match its ids.** A reference's `href` named an id the page lacked, which failed a prerender. `remark-rehype` now takes an empty `clobberPrefix` and a step after the sanitize step prefixes the footnote `href`s, so the reference and its backref find their targets. The sanitize schema's `clobber` list and prefix are unchanged.

Consumers must: move `cairn.config.ts`, `site-config.ts`, and `site.config.yaml` from `src/theme/` to `src/site/`, repoint their `#theme/...` imports to `#site/...`, add `"#site/*": "./src/site/*"` to the `imports` in `package.json`, set `configModule` in `vite.config.ts` to `/src/site/cairn.config.ts`, and keep `cairn.config.ts` importing the theme's pieces through `#theme/*`.

Consumers must: create `src/site/theme-options.css` and `src/site/overrides.css` and link them after the theme's sheets, in the order theme, site, theme-options, overrides, in the layout, the error page, and the adapter's preview `stylesheets`.

Consumers must: keep the site config at `src/site/site.config.yaml`, the only path the engine reads; a file left at `src/theme/site.config.yaml` is not read and logs `config.missing`.

Consumers must: replace an `uppercase` class on an eyebrow with the `eyebrow-case` utility and set the case through `--cairn-eyebrow-case`, and use `--cairn-scroll-cue` for the code block's scroll cue.

## 0.99.0-rc.4

Released 2026-11-07.

<!-- release-size: minor -->

This release is the rebuild. It breaks the public surface, the platform, the content model, the sign-in
store, and the scaffold together, so a site is not upgraded in place. Start a new site from
`create-cairn-site` and carry your content and theme across, reading the sections below for every name
and behavior that changed from `0.98.0`. The sections list each break in the order a rebuilder meets
it.

Consumers must: rebuild the site from `create-cairn-site`; this release has no upgrade path from an earlier version.

### What happens at deploy

- **Every editor signs in again once.** Session ids are now stored as a SHA-256 digest, so a session row
  written before this release holds a raw id that no longer resolves. Each editor requests a new
  sign-in link after the first deploy. A script that inserts `session` rows by hand must insert the
  lowercase-hex SHA-256 of the id it hands the browser. Deploy at a 100 percent cut-over: under a
  gradual deployment a session made by one version does not resolve on the other, so editors bounce
  between signed in and signed out until the rollout finishes. Rows left from before hold a raw id and
  never match again, and `DELETE FROM session WHERE length(id) != 64` clears them early.
- **Sign-in requests are rate limited.** `createCairnAdmin` takes `auth.rateLimit` (and
  `AuthRoutesConfig.rateLimit` on the lower-level routes): a resolver keyed `login:<CF-Connecting-IP>`
  that returns a Workers rate-limit binding. A limited request answers the same `throttled` outcome as
  a repeat request for one address. With no binding the limiter is open, and a binding that throws logs
  `auth.rate_limit_failed` and lets the request through. A limited request logs `auth.rate_limited`.
  The key is capped at 64 characters, and the failure record carries the error's name and a fixed
  message, never text the limiter supplied.
- **A successful sign-in from a browser that already holds a session replaces that browser's session
  row.** Before, the old row stayed until it expired.
- **The GitHub App needs Contents read and write.** The engine mints its installation token for one
  repository with Contents write only. Grant the App Contents read and write, and set `repo` to the
  repository's current name. A stale name followed GitHub's redirect before. It now reaches a validated
  body and the mint is refused, which `/healthz?live=1` reports as `token_request_refused`.
- **A Cloudflare zone's own HSTS setting overrides the admin's `Strict-Transport-Security:
  max-age=63072000`.** Sites on older engines were seen returning their zone's value, so set the policy
  you want in the zone. `includeSubDomains` is gone from `AuthGuardConfig`, so the engine pins no
  subdomains.
- **A built site is served with `wrangler dev .svelte-kit/cloudflare/_worker.js`.** `vite preview`
  cannot run adapter 8 output, and the adapter no longer caches worker responses in `caches.default`,
  so a site that relied on that caching adds a zone Cache Rule or a `Cache-Control` of its own.
- **`/healthz` answers 503 when `ok` is false.** A non-GitHub backend reads as healthy. The scaffold's
  route sends `cache-control: no-store` on both answers, and `/healthz?live=1` mints one installation
  token to confirm GitHub accepts the key. The passing signing check reports the key's `SHA256:`
  fingerprint.

### Platform

- **The engine runs on SvelteKit 3, `@sveltejs/adapter-cloudflare` 8, `svelte` 5.57.1 or later, and
  `wrangler` 4.118 or later.** A SvelteKit 2 site cannot run it. SvelteKit 3 no longer reads
  `svelte.config.js`, so the kit options move into `sveltekit({ ... })` in `vite.config`, and the
  scaffold writes that shape. Delete the whole `csrf` block, and never set `trustedOrigins: ['*']`:
  it turns off SvelteKit's Origin check on every route, `/admin` included, and `cairn doctor` fails it.
- **SvelteKit's origin check covers every route, and the guard's own non-admin Origin check is gone,**
  with the `auth.csrf-origin-mismatch` condition, the `config.csrf-disable-missing` condition, and
  `guard.refused`'s `origin` reason. A site that sets `Referrer-Policy: no-referrer` site-wide serves
  `strict-origin-when-cross-origin` or `strict-origin` instead, since its own forms otherwise fail the
  check. A server-to-server POST with no `Content-Type`, such as a webhook, now gets SvelteKit's 403, so
  the sender sets a content type.
- **Bindings come from `cloudflare:workers`, not `event.platform`.** Delete `App.Platform` from
  `app.d.ts`, run `wrangler types`, and type bindings from its `Env`. Code that read `event.platform`
  imports `env` and `waitUntil` from `cloudflare:workers`, a handle that wrote it wraps `resolve` in
  `withEnv`, and `createD1AuditSink` takes the module's `waitUntil`. `PlatformContext` and
  `CairnEvent`'s `platform` member and `Env` parameter are gone, so write `CairnEvent` with no type
  argument.
- **`Handle` imports from `@sveltejs/kit/hooks`, and `$lib` becomes `#lib`.** Add `"imports": { "#lib":
  "./src/lib", "#lib/*": "./src/lib/*" }` to `package.json`, and move any custom `kit.alias` to a
  subpath import the same way. A test that mocks `$app/environment` to put `loadPreview` in a build
  mocks `$app/env` instead.
- **A vitest run over code that imports the engine's server modules inlines the engine** with
  `test: { server: { deps: { inline: ['@glw907/cairn-cms'] } } }`, so a test's
  `vi.mock('cloudflare:workers')` reaches the engine's own import.
- **The `cairnManifest()` plugin owns `ssr.noExternal`,** so delete the engine's line from
  `vite.config.ts`. It also defines `__CAIRN_DEV_BUILD__`, which `@glw907/cairn-cms/ambient` declares,
  so a site's own `devBuildDefine` plugin goes. It takes no `content`, `manifestPath`, or
  `siteFactsPath` option: generated files live at `src/content/.cairn/`.
- **The `cairn` command-line tool is `v2`,** and its Go module path is
  `github.com/glw907/cairn-cms/tool/v2`. `cairn doctor` replaces the `config.csrf-disable` check with
  `config.csrf-trusted-origins`, adds `config.migrations-missing` (a warning for a site whose
  migrations directory lacks a migration the package ships), and fails a `createAuthGuard({ roles })`
  call that is no longer wired: pass `{ runtime }`. The `v1` doctor recommends `checkOrigin: false`,
  which is now a build error. `tool/CHANGELOG.md` carries the detail.

### Content model and fields

- **The `:::` unit is a block.** `defineComponent` is `defineBlock`, `ComponentDef` is `BlockDef`,
  `ComponentRegistry` is `BlockRegistry`, and `ComponentContext` is `BlockContext` (a root type; `/render`
  is gone). `createRenderer({ components: registry })` is `createRenderer({ blocks })` with the array,
  `rendering: { components: registry }` is `rendering: { blocks }`, and `defineRegistry({ components })`
  is `defineRegistry({ blocks })` where a site keeps a registry of its own. `rendering.blocks` is an
  array, not read through `.defs`, `.names`, or `.get`. A scaffolded site renames
  `src/theme/markdown-components.ts` to `src/theme/markdown-blocks.ts` and its `components` export to
  `blocks`. `attributeSchema` reads through `RegisteredBlock`, not `BlockDef`. Registry and adapter
  errors say `cairn: block "..."` where they said `cairn: component "..."`, so code that matches the
  text matches the new one. The admin's controls follow: `Insert a block`, `Search blocks`, `Back to
  blocks`, and an `Edit block` control whose name stays put when it is unavailable.
- **A concept declares a plain `fields` record,** with `refine` and `behavior` beside it. Replace
  `fields: defineFieldset({ ... })` with `fields: { ... }`, drop the `defineFieldset` import, and move
  `refine` and `behavior` onto the concept. Read a concept's `fields` as the record, pass `ConceptConfig`
  the record type, and drop any `FieldsetConfig` import. `defineFieldset` and `defineBlock` throw at
  declaration for `min` over `max`, a `length` outside `min` and `max`, or a date bound that is not a
  calendar date.
- **`fields.array` takes one bag.** `fields.array(item, { label })` is `fields.array({ item, label })`,
  and `label` is required. A field's `default` takes the type of its value, and an `image`, `object`, or
  `array` field takes none. `FieldBehavior.itemLabel` is gone: set `itemLabel` on the `array` field
  descriptor.
- **Field kinds and validation.** `fields.datetime`, `fields.email`, `DatetimeField`, and `EmailField` are
  gone: use `fields.text` with a `pattern` for an address, and `fields.date` plus a text field for a
  moment. A directive attribute that was `email` or `datetime` is `text`. A `date` field refuses a value
  with a time of day. A `boolean` field, and `draft` whether or not the concept declares it, refuse a
  value that is not `true`, `false`, or empty, so `featured: "true"` and `pinned: yes` fail the build
  and the entry leaves the manifest with a `content.entry_invalid` record. A `creatable` multiselect
  keeps a value outside `options`, so code that narrowed its value to the `options` union goes.
  `'~standard'` on `Fieldset`, and `StandardInput`, are gone.
- **Frontmatter parses as YAML 1.2.** `parseMarkdown` and `serializeMarkdown` run on `yaml`, and
  `gray-matter` and `js-yaml` leave the engine. A date reads as text in any key and never as a `Date`,
  so stop passing a `Date` to `validate`: pass the `YYYY-MM-DD` string. A `---yaml` fence, an unclosed
  block, `10:30`, `0755`, `0o755`, `1_000`, `0b11`, and a `<<` merge key read differently, so write what
  you mean. A first admin save rewrites a hand-written block into single-quoted scalars. A date field
  takes the date alone, with the day from the filename when it carries one. `serializeMarkdown` is a root
  export.
- **Read-side names.** `ContentSummary.fields` is `summaryFields`. `InboundLink` and `ResolvedReference`
  are `EntryRef`, and `.summary` is `.excerpt` on an `EntryRef` and a `ManifestEntry`, so run
  `npx cairn-manifest` and commit `src/content/.cairn/index.json`. `routing: 'dated'` replaces
  `routing: 'feed'`, and `RoutingRule.inFeeds` is gone.
- **The site is indexed by `createSiteResolver(adapter, files)`,** over one `/src/content/**/*.md`
  glob, replacing `createSiteIndexes(adapter, config, globs, opts)`. Read a concept through
  `site.concept('posts')` where you read `indexes.posts`, call `site.paths()` where you called
  `site.entries()`, and `site.concept(id).adjacent(entryId)` where you called `site.adjacent`. Drop any
  `SiteIndexes` or `SiteGlobs` import and the config argument to `buildSiteDescriptors` and
  `buildSiteManifest`. `buildSiteManifest` returns `{ manifest, problems }`, so read `.manifest`.
  `validate: false` is gone. The manifest build refuses a concept `dir` outside `src/content`, a markdown
  file under no concept's `dir`, a slash at either end of a `dir`, an entry file stem that is not
  lowercase letters, digits, and single hyphens, and a `cairn:` href that names no entry. It warns on an
  unknown block directive and on a frontmatter key a concept does not declare. `cairn-manifest` prints
  one summary line and exits 1 on an invalid non-draft entry.
- **`EntryData` is typed from the site resolver.** Narrow on `data.concept` before reading a field one
  concept declares in an `entryLoad` result, or annotate the config `PublicRoutesConfig<typeof site>`. A template that typed its
  article prop as untyped `EntryData` switches to `EntryData<typeof site>`, and reads `image` behind a
  `'image' in data.entry.frontmatter` guard.
- **Schema changes to config.** `defineAdapter` declares `navLayout` inline and checks two config keys at
  the type level: correct a `summaryFields` key that is not a field of its concept and a `navLayout`
  `screen` that is neither an engine screen id nor a `content` key. `spellcheck:` is gone from
  `site.config.yaml` and now fails with "unrecognized key". `TidyConventions` drops `fixes` (a `fixes:` key in
  `site.config.yaml` is ignored), and tidy defaults to `claude-sonnet-5-5`. `editor.nav.configPath` is gone, and the site config is always
  `src/theme/site.config.yaml`. A concept id may not be `login`,
  `auth`, `editors`, `help`, `media`, `vocabulary`, `nav`, or `settings`, and each `publishActions`
  entry takes a distinct `label`.

### Rendering, media, and delivery

- **`createRenderer` takes one object and returns one `render`.** Pass `{ blocks, resolveMedia }` and call
  `render({ body, ...opts })` where you called `renderMarkdown(md, opts)`, passing `renderDocument` the
  same input. Stop reading `remarkPlugins`
  and `rehypePlugins` off the renderer, rename `resolve` to `resolveLink` on `ResolveOptions` and
  `SiteRender`, and write `render: renderer.render` in the adapter's `rendering` group. `CairnAdmin`
  takes one `rendering` prop: pass `rendering={cairn.rendering}` and drop `render`, `registry`, and
  `icons`.
- **`RendererConfig` drops `sanitizeSchema`, `unsafeDisableSanitize`, and `anchorRel`.** One pipeline path
  remains, a `<script>` is removed from every render, and the `rel` on a `target="_blank"` anchor is
  always `noopener noreferrer`. `PreviewConfig` drops `bodyClass`. `FormatCivilDateOptions` drops
  `intlOptions`.
- **`AssetConfig` is `MediaConfig` and holds `bucketBinding` alone.** Delete `publicBase`, `urlForm`,
  `maxUploadBytes`, `allowedTypes`, and `transformations`. Retire a media route mounted at a
  `publicBase` other than `/media`, and any `srcset` or `sizes` use. Call
  `createMediaResolver(media, manifest, { strict })` in that order; a strict resolver throws a
  `cairn:`-prefixed error on a hash missing from the manifest. Drop any `normalizeAssets` call and
  `ResolvedAssetConfig` import. `createPublicRoutes` takes `resolveMedia` as a resolver or `null` and no
  `assetsEnabled`. Read `runtime.media` where you read `runtime.resolvedAssets`, stop reading
  `data.mediaBase`, and drop the `urlForm` argument from `publicPath`. `media.resolver_absent` is no
  longer logged. A browser upload accepts AVIF. `cairn-media-seed` moves to `@glw907/cairn-cms-dev`, a
  dev dependency at the engine's version.
- **`/delivery` helpers.** `rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`, and
  `markdownResponse` are `buildRssResponse`, `buildJsonFeedResponse`, `buildSitemapResponse`,
  `buildRobotsResponse`, and `buildMarkdownResponse`. `buildSitemapResponse` throws past 50,000 URLs and
  skips `noindex` entries. `/delivery/data` is gone, `/delivery` loads under plain Node, and `CairnHead`
  imports from `@glw907/cairn-cms/public` where it imported from `/delivery/head`.
- **`loadPreview` and `loadHealth` take the event and an options bag.** The preview route calls
  `loadPreview(event, { runtime, publicRoutes })` and the health route `loadHealth(event, { runtime })`.
  `loadPreview<S>` is generic over the site resolver (`PreviewData<S>`). Run `npm run check`, because
  `vite build` does not type-check and a stale call fails only at runtime.
- **`CairnRuntime` stops copying what the adapter holds.** Read `runtime.email` in place of
  `runtime.sender`, and `render`, `icons`, and `media` from the adapter in place of `runtime.render`,
  `runtime.icons`, and `runtime.assets`. `runtime.registry` is gone.
- **A preview link lives seven days.** `PreviewTokenConfig` and the `preview` option on
  `createCairnAdmin` are gone, and it throws on a leftover `preview` key.

### Public surface

- **Each public name imports from one subpath.** The 107 re-exports are gone. `/delivery`, `/sveltekit`,
  and `/media` no longer carry the root's content-model, adapter, and backend types, and the root no
  longer carries `MediaRef`, the `NavLayout` family, `PublishActionEntry`, or `IslandRegistry`.
  `check:surface` fails any name on two subpaths.
- **The per-route factories and the preview mint pair are gone.** `createContentRoutes`,
  `createAuthRoutes`, `createEditorRoutes`, `mintPreview`, `revokePreview`, `parseManifest`, and
  `buildNewlyPublished` leave the public surface, with the `ContentRoutes`, `AuthRoutes`, `EditorRoutes`,
  `EditorRoutesConfig`, `PreviewMintOutcome`, and `PreviewRevokeOutcome` types. Mount the admin through
  `createCairnAdmin`. A rename no longer reads as a new publish.
- **Hidden names.** `createNavRoutes`, `NavRoutes`, and `NavRoutesConfig` (`/sveltekit`),
  `FormatTimestampOptions` (`/admin-toolkit`), and `EntryDataOverrides` (`/delivery`) leave the public
  surface. None is known to be imported; use `Parameters<typeof formatTimestamp>[1]` for the options.
- **What a site never mounts or calls is gone.** `/admin` exports `CairnAdmin`, `CairnAdminShell`, and
  `CsrfField`, and drops `LoginPage`, `ConfirmPage`, `ConceptList`, `CairnMediaLibrary`,
  `CairnTidySettings`, `HelpHome`, `EditPage`, `CairnHistory`, `ManageEditors`, `MarkdownEditor`,
  `EditorApi`, `TidyApi`, `ImagePlaceholderApi`, `FormatKind`, `NavTree`, `DeleteDialog`, `RenameDialog`,
  `VocabularyAdmin`, and `WelcomeView`. `/delivery` drops `buildRssFeed`, `buildJsonFeed`,
  `buildSitemap`, `buildRobots`, `composeEntryData`, and `renderJsonLdScript`; the root drops
  `formatManifest`, `verifyManifest`, `verifyReferences`, and `resolveCapability`; `/admin-toolkit` drops
  `formatTimestamp`; `/sveltekit` drops `requireEditor`, `createAdminAction`, and `AdminActionOptions`.
  Use a response helper for a feed, sitemap, or robots builder, a literal capability for
  `resolveCapability`, `requireAccess` with a rule naming `editor` for `requireEditor`, and
  `createSectionAction` for `createAdminAction`, with an access-map rule for its target.
  `createSectionAction` checks the access map on every call.
- **`IdentityRefusal` is `IdentityFailure`,** in any `IdentityResolver` you write. `RequestOutcome` is
  `LoginRequestOutcome` and has no `sent` member, and `tokensMatch` is `compareTokens`.
  `createAuthRoutes` takes `{ runtime, send }`. `ContentFormFailure.error` is a required string, with
  `field?` naming the refused field, and a form prop that also carries a success result is
  `Partial<ContentFormFailure>`. `EditData` carries one `data.flash` (`'saved'`, `'renamed'`,
  `'published'`, `'discarded'`, or `null`) in place of `saved`, `renamed`, `publishedFlash`, and
  `discardedFlash`.
- **Actions.** `createSectionAction` takes no `resolveDb` for an action with no binding.
  `tidyAction` and `dictionaryAddAction` answer 404 on a route with no `concept` param, so mount them
  only where the engine's edit view does. `actions.mediaLibraryUpload` is typed on `CairnAdminRoutes`.
  A new `./internal` export backs the `cairnManifest` plugin and is not for sites.
- **Stability tags.** Every export carries `@public`, `@beta`, or `@scaffold` in its doc comment, and
  `check:tiers` and `check:options` hold them. `TidyClient` moves to the Extension tier.

### Access and roles

- **`roles` and `access` are declared once, on the adapter.** Pass `{ runtime }` to every
  `createAuthGuard`, `devBackendHandle`, and per-route `createEditorRoutes` call, where `runtime` is
  `composeRuntime({ adapter, siteConfig })` or the site's exported runtime, and remove `roles` and
  `access` from those calls: `AuthGuardConfig.roles` and `access`, `DevBackendConfig.roles` and
  `access`, and `EditorRoutesConfig.roles` are gone. Declare them as `defineAdapter({ roles, access })`,
  reconciling any map the hooks held first, since the adapter's now governs every reader. A scaffolded
  `src/access.ts` folds into the adapter and goes.
- **The guard's public paths are exactly `/admin/login` and `/admin/auth/confirm`.** A site route under
  `/admin/auth/` that anonymous visitors must reach moves outside `/admin`. The guard clears
  `locals.cairnEditor` on those two paths.
- **Access rules name only declared roles,** and a rule naming an undeclared role fails at server start.
  A `none`-capability role named in a rule reaches that route through `canReach`, `requireAccess`, and
  `createSectionAction`; review such a rule. `canReach` no longer throws on a prototype-named target,
  and such a name takes the any-editor floor.
- **The sign-in store is one store.** `/auth-channel` with its `migrations-channel` schema,
  `createChannelDb`, `CHANNEL_SCHEMA_SQL`, `originMatches`, and `isDeployedHost` are gone, as are the 13
  `auth.channel.*` log events, `auth.channel.delivery_inline` among them, and `src/lib/log.ts` in the
  scaffold: delete it from a site scaffolded earlier. `bootstrapOwner`, `insertOwnerIfEmpty`, the
  `editor.bootstrapped` event, and the `/auth-store` subpath are gone, so delete `auth.bootstrapOwner`
  and seed the owner row before deploy if the `editor` table may be empty (`create-cairn-site` seeds its
  own). `resolveOwnerLevelRoles` leaves the root barrel, so derive owner-capability roles from your own
  role vocabulary. `deleteEditor`, `setEditorRole`, `removeOwnerIfNotLast`, `demoteOwnerIfNotLast`, and `OwnerGuardOutcome` are gone.
  A site that manages its roster outside `/admin/editors` runs its own SQL on `AUTH_DB`: trim and
  lowercase the email before it matches or writes the `editor` table, count owners inside the one
  `DELETE` (`AND (role NOT IN (...) OR (SELECT COUNT(*) FROM editor WHERE role IN (...)) > 1)`), add
  `OR ? = 1` in an `UPDATE` so the last owner can move to another owner-level role, list every role
  with owner capability, delete the person's `session` and `magic_token` rows by `email` only when the
  `DELETE` changed a row, then delete from `preview_tokens` by `editor` in a statement of its own and
  ignore a "no such table" error.
- **`auth.branding` and `AuthBranding` are gone.** `CairnAdminConfig.auth` is `{ send?, rateLimit? }`. The
  site name and sender come from the adapter's `email` group and the site config, and the login and
  confirm pages show the site config's name. To send a different name or from address, change the built
  message in a custom `auth.send`; to send no reply address, remove `replyTo` from the `email` group.
- **A role write against a database without `0001_roles.sql` fails as `auth.store-roles-unmigrated`.**
  `create-cairn-site` carries `0000_auth.sql`, `0001_roles.sql`, `0003_preview.sql`, and
  `0004_login_nonce.sql`. A migration is applied by hand with `wrangler d1 migrations apply`, since a
  Workers Builds deploy applies none.

### Logs, health, and diagnostics

- **Log events added:** `auth.link.sent` (the default Cloudflare sender, with `email` and `messageId`),
  `auth.rate_limited`, `auth.rate_limit_failed`, `content.entry_invalid`, `content.field_undeclared`,
  `entry.delete_refused`, `entry.rename_refused`, `entry.reference_check_failed`,
  `entry.prior_read_failed`, `health.failed`, and `admin.attention_failed`. `auth.access.refused` carries
  a `reason` (`no_rule`, `shadowed`, or `role`), and `admin.action.failed` carries the thrown error's
  `conditionId`. `scope` is gone from `content.entry_invalid`, so a query that filtered `scope:manifest`
  drops it. `publish.address_collided` carries `heldByConcept` and `heldById`, and a missing Turnstile
  secret logs `missing_secret`, not `invalid_input`, from `verifyTurnstile`.
- **Diagnostic conditions removed:** `config.tidy-key-missing` and `admin.login-probe-failed`, along with the
  retired `config.csrf-disable-missing` and `auth.csrf-origin-mismatch`. The registry names 23 ids.
  `cairn doctor` PASS lines print a pass title, and `cairn doctor`'s role-wiring check no longer reads
  `createAuthGuard({ roles })` as wired.
- **A log record prints as one JSON line outside Workers.** A test that spies `console` and compares an
  object stubs a Workers user agent.
- **Errors name the next step.** A thrown GitHub error keeps its operation and adds a step after the
  status, so compare its prefix and not the whole string. Config errors for `navLayout`, `defineRoles`,
  the default-branch read, and a missing `fragments` concept do the same. A local 403 for a missing access
  rule reads `No access rule for <target>. Add it to the adapter's access map.`
- **`cairn-audit` is static-only.** `cairn-audit --rendered`, `cairn-audit norms`, the `rendered` config
  section (`rendered.pages`, `rendered.allowlist`), the norms manifest with `norms:generate` and
  `norms:check`, `CAIRN_AUDIT_COOKIES`, the `check:cairn:rendered` script, and the 17 browser rules (`border-contrast`,
  `chip-ground-collision`, `container-inset-asymmetry`, `field-edge-alignment`, `focus-renders`,
  `form-font-parity`, `interactive-contrast`, the browser `list-role` (the static one stays),
  `motion-reduced-delay`, `norms-bands`, `one-filled-action`, `panel-width`, `relational-spacing`,
  `screen-anatomy`, `touch-targets`, `viewport-overflow`, and `weight-budget`) are gone; remove Playwright if the audit was its only use. A new advisory rule, `public-route-prerender`,
  flags a public route that never chooses how it renders, and `--fail-on advisory` makes an advisory fail
  the run. A leftover `rendered` key in `cairn-audit.config.json` is ignored.
- **`radius-scale` and the three retired-patch arms of `stock-default-hazards` now fail `cairn-audit`.**
  They reported at advisory tier through `0.98.0`. A bare, fixed, or arbitrary `rounded-*` class, and
  `bg-neutral`, `bg-primary/10`, or `shadow-none` on a `btn`, are error-tier findings, so the default exit
  code is 1 until they are fixed. The rule messages no longer name a promotion version.

### Editor and admin behavior

- **The admin's words follow the ruled vocabulary.** An editor sees entry and entries, **Publish all**,
  **Change address**, **Unpublished changes**, **Restore as draft**, **Apply default alt to entries**,
  lead image, and **Upload image**. A test that quotes a renamed label changes. A settings conflict reads
  `Someone else changed these settings.`, a failed sign-in link reads `That sign-in link didn’t work` on
  both pages, and the sign-in email has a new layout with a **Sign in** button.
- **Saves keep the writing.** A refused settings form keeps what was typed, and a refused save points at
  its field. A failed save or publish applies in place and leaves the editor's text alone. A save always
  reads the prior file, so a stale or forged `new=1` cannot drop undeclared keys, and a failed prior read
  answers 503 and logs `entry.prior_read_failed`. A save keeps every collapsed repeatable row and every
  frontmatter key the fieldset does not declare. A rename onto a live entry's address, and a publish onto
  one, is refused. Rename answers 503, not 409, when it cannot verify references or includes, so a handler
  keyed on 409 expects 503. Every write to the default branch from an earlier snapshot is head-guarded,
  so publish can answer the calm conflict.
- **The admin's publish message no longer claims a rebuild is running.** After a publish it reads "Published. The live site shows this change once the site rebuilds.", because the admin cannot see a rebuild.
- **Controls.** A list row's delete confirms. The edit screen hides Tidy when no key is bound. Text fields
  warn about length through `setCustomValidity` and never cut a paste, so a test selecting `minlength` or
  `maxlength` selects `:invalid`. The media tile's checkbox is `aria-hidden` with `tabindex="-1"`, so a
  test finds the input under the option. Discard and Rename disable submit in flight. Help's
  getting-started list uses `.start-steps` and `.start-step`. The shipped admin stylesheet gains `mb-8`
  and `mt-0`, and `EmptyState` renders an `h1`.
- **The dev backend serves your own content,** and `seedContent` is gone: pass `content: 'fixtures'`
  when it runs under `wrangler dev`. `content: 'empty'` serves an empty site, selected in the showcase by
  `CAIRN_DEV_CONTENT`. `devBackendHandle` refuses a request to a deployed host. Dev start leaves
  `index.json` untouched when a published entry goes invalid, while `cairn-manifest` still writes.
- **Defensive fixes.** `scanBody` reads a raw-HTML `href` or `src` attribute by attribute,
  `repointMediaRef` and `fillAltForHash` handle a leading BOM, `slugify` strips accents, and
  `resolveReferences` skips a draft target, so a template that read a draft target from the resolved map
  guards for the absent key. Where-used, safe delete, replace, and manifest verification read an image
  nested in an object or array: regenerate with `npx cairn-manifest` and commit it, or a site declaring
  such an image fails its build. A site calling `verifyManifest` passes its adapter as the third
  argument.

### Security

- Every admin response carries `X-Robots-Tag: noindex, nofollow` and `Referrer-Policy: strict-origin`,
  and the shell's theme and sidebar cookies carry `Secure` over HTTPS.
- The admin guard screens the same requests SvelteKit 3's check does, so a same-site `fetch` to a
  site-authored `/admin` endpoint that posts no body or an untyped one sends `X-Cairn-CSRF`.
- The logout redirect re-checks `locals.cairnIdentity.logoutUrl`. A minted installation token is scoped
  to one repository and Contents write.

### Tooling, scaffold, and guidance

- **Skills and guidance.** The four packaged skills have new names and rebuilt references: run
  `npx cairn-guidance install`, which removes the old skill directories when their files are unedited and
  names any it keeps (`--dry-run` previews). Rewrite a project instruction of your own that names an old
  skill. The developer docs tracks under `docs/` are gone: read upgrade steps from
  `node_modules/@glw907/cairn-cms/MIGRATION-NOTES.md` and a JSON schema from
  `node_modules/@glw907/cairn-cms/schema/`. The packaged Stop hook exits 2 on a finding and ends on
  `stop_hook_active`, and it moved with the DaisyUI tooling text to the `adopt-cairn.md` reference's
  "Agent tooling" section, so replace the hook command in `.claude/settings.json`. `cairn-guidance
  check --strict` needs every FIX line fixed.
- **`create-cairn-site`.** The scaffold ships no `/styleguide` and no signups demo, provisions one
  database, and gains an admin error page, a `cf-typegen` script, a `CLAUDE.md` and `README.md` with
  aliases, commands, and a make-it-yours reference, and a home intro that reads `description` from
  `site.config.yaml`. The setup writes the site's real origin to every prerendered file, validates the
  origin before writing it, and restores it when a cutover fails. The closing block names
  `github.com/settings/installations`. The tool and the template build at `--logLevel warn`.
- **`create-cairn-site` and Workers Builds.**
  - **A site whose owner skips the domain is offered Workers Builds in the same run, and each closing block says whether a publish deploys.** `create-cairn-site` no longer stops at the live block when the domain is declined. Every closing block states whether a publish from the admin reaches the live site, and "This site is set up end to end." prints only once Workers Builds is connected. A successful build prints one line, and the full output prints only when the build fails.
  - **Connecting a domain or turning on email after Workers Builds commits the change and lets Builds deploy it.** On a site connected to Workers Builds, `create-cairn-site` no longer builds or deploys from your machine: the domain and email chapters commit `wrangler.jsonc` and `src/theme/cairn.config.ts` to the repository and watch the Builds deploy of that commit. A re-run at either Builds step asks the domain question again when no domain is connected.
  - **The email offer no longer ends at Workers Builds.** A site whose owner declined email sign-in is asked again on a later run, before or after Builds is connected.
  - **`--yes` no longer skips Workers Builds after an email decline.** An unattended run connects Builds whether or not it declined email.
  - **The setup tool refuses to commit over repository edits to its two config files.** Before a domain or email commit on a Builds site, it compares the repository's `wrangler.jsonc` and `src/theme/cairn.config.ts` with the checkout's, ignoring the values the tool writes, and stops with a `git pull` step when anything else differs.
  - **The Builds commit path checks first and waits for the deploy to start.** Before it commits a domain or email change, the setup tool reads the Builds API with your token, so a token without the Workers Builds permission stops at the token step instead of after the commit. It then waits up to two minutes for the push build to appear, reuses that build on a re-run instead of starting a second, drops its saved token when it parks for a sign-in, and strips control characters from a failed build's log tail before printing it. A read that fails mid-reconcile now stops the commit.
  - **The first deploy no longer replaces a Worker, database, or bucket that already carries the site's name.** Before it builds, `create-cairn-site` reads the chosen Cloudflare account for a Worker named for the site, a `-auth` D1 database, and a `-media` R2 bucket, and stops with `resource-names-taken` when any exists, naming each one and pointing to `--name`; a read that fails stops with `resource-names-check-failed`, a `wrangler.jsonc` that names other resources, or carries a `database_id`, a bucket `jurisdiction`, a `preview_` key on a database or bucket binding, or an `env` block, stops with `resource-names-mismatch`, and a resume of the site's interrupted first deploy accepts only the resources that deploy created. The check runs again just before the first deploy. `--sign-in` now seeds the saved Cloudflare account, and stops when the record has none.
  - **The email setup states what onboarding does to the domain's DMARC record.** `create-cairn-site` reads the zone's `_dmarc` record before it onboards Email Sending: with none, the prompt and the closing message say onboarding adds a domain-wide `p=reject` policy, and with one, they name its `p=` value and say onboarding leaves it unchanged. The closing message no longer claims the record stays after Email Sending is turned off.
  - **Workers Builds deploys with a narrow token of its own.** `create-cairn-site --connect` now asks for a second token with Workers Scripts, D1, and Workers R2 Storage at edit, registers it once per Cloudflare account as `cairn-build`, and reuses it for later sites. The setup token no longer becomes the build token. An unattended run reads `CAIRN_CF_BUILD_TOKEN`. `build-token-missing` stops it when neither a registration nor the variable exists, and `build-token-invalid` stops any run whose deploy token Cloudflare refuses.
- **Setup reports a site live when only this computer's resolver is behind.** When the authoritative nameservers serve the domain and a pinned HTTPS check finds the site, setup reports it live and prints one line that the resolver may take up to 30 minutes to see it.
- **A release candidate now publishes to the hidden `gate` dist-tag and reaches `next` only after it passes the release gate.** A candidate no longer moves `next` on its own: the gate run promotes it, and promotion also moves `create-cairn-site@latest` to the passed candidate until a stable supersedes it.
- **Publishing now runs only from a published GitHub release, with npm provenance.** The maintainers verify each publish with `scripts/release/verify.mjs`.
- **Breaking changes now require a minor version from these candidates on.** `check:version` refuses a patch that carries an actionable `Consumers must:` line.
- **`@glw907/cairn-cms-dev` publishes built output.** `scripts/checks/api-surface.md` ships in the package.

### Dependencies

- The engine takes every minor and patch through the 2026-11-07 sweep, and the peer ranges do not
  move. The scaffold takes `wrangler` `^4.158.0`, `@sveltejs/kit` `^3.1.1`, `svelte` `^5.57.3`, `vite`
  `^8.3.6`, and `daisyui` `^5.7.50`. It pins `tailwindcss` and every `@tailwindcss/*` package at
  exactly `4.3.3`, because tailwindcss 4.3.4 and 4.3.5 compile daisyUI's `.join` rule to a selector
  that lightningcss rejects, and the build fails. Wrangler 4.148 gains ambient `*.txt`, `*.html`,
  `*.sql`, `*.bin`, and `*.wasm` module declarations in a regenerated `worker-configuration.d.ts`. `gray-matter` and `js-yaml` leave the
  engine's dependencies.
- The engine and the scaffold take vitest 5. The engine's test tooling moves `vitest`,
  `@vitest/browser`, and `@vitest/browser-playwright` to `^5.1.0`, and the scaffold's `vitest` range
  is `^5.1.0`. `@vitest/browser` and `@vitest/browser-playwright` each peer on one exact `vitest`
  version, so a site that adds them installs the same version of all three.

## 0.98.0

The changelog from this version back lives in the tag:
https://github.com/glw907/cairn-cms/blob/v0.98.0/CHANGELOG.md

The detail of `## Unreleased` before it was consolidated sits in no tag. Read it at commit
`c074feff5d32ad790bbf1272c0c41dfacccc1258`:
https://github.com/glw907/cairn-cms/blob/c074feff5d32ad790bbf1272c0c41dfacccc1258/CHANGELOG.md
