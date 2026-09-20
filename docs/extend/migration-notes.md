# Migration notes

The per-version record of what a consumer must do to take a cairn upgrade, distilled from
`CHANGELOG.md`'s own `Consumers must:` lines. `CHANGELOG.md` is the authoritative, gate-checked
source; this page exists so you can scan the versions that carried a real action without reading
the whole file. A version not listed here stated no consumer action for that release.

This record starts at `0.84.4`, the oldest version among the sites that depend on cairn today (per
`CHANGELOG.md`'s own `0.94.0` entry). A site upgrading from further back crosses more history than
this page carries; read `CHANGELOG.md` directly for anything older.

## Unreleased

The release step sets the version number at the cut and renames this section to match it.

- **`cairn-manifest` now exits 2 on an unrecognized command-line flag** instead of silently
  ignoring it, and all four engine bins (`cairn-doctor`, `cairn-audit`, `cairn-media-seed`,
  `cairn-manifest`) now answer `--help`. A CI job piping `cairn-manifest`'s output no longer risks
  a truncated error message. A script that already passes no arguments or only valid flags needs
  no change. `cairn-audit`'s rendered harness also gains a redirect-trap refusal: a run with every
  configured page resolving to the login route's own title and landmark now throws and exits 2,
  naming `CAIRN_AUDIT_COOKIES`, instead of silently reporting a clean run.
- **Apply migration `0004` before deploying.** A magic link now only signs in the browser that
  requested it: `cp node_modules/@glw907/cairn-cms/migrations/0004_login_nonce.sql migrations/`,
  then `npx wrangler d1 migrations apply <auth-db> --remote`. An un-migrated `AUTH_DB` is a total
  login outage with no second channel, since every confirm names the new `nonce_hash` column;
  `npx cairn doctor`'s `auth.store` check now fails when the column is absent, so run it before
  the deploy.
- **`createContentRoutes` and `createCairnAdmin` (`/sveltekit`) take one config bag, not two
  arguments.** Change `createContentRoutes(runtime, config)` to
  `createContentRoutes({ runtime, ...config })`, and `createCairnAdmin(runtime, config)` to
  `createCairnAdmin({ runtime, ...config })`; a call with no `config` becomes
  `createContentRoutes({ runtime })` or `createCairnAdmin({ runtime })`.
- **`createNavRoutes` and `createMediaRoute` (`/sveltekit`) take one config bag, not a positional
  runtime.** Change `createNavRoutes(runtime)` to `createNavRoutes({ runtime })`, and
  `createMediaRoute(runtime)` to `createMediaRoute({ runtime })`.
- **Six factory-level parameter and load-data bags are renamed, across both packages.** Rename
  any imported type reference: `AuthGuardOptions` to `AuthGuardConfig` (`/sveltekit`),
  `RendererOptions` to `RendererConfig` (`.`), `FieldsetOptions` to `FieldsetConfig` (`.`),
  `DevBackendOptions` to `DevBackendConfig` (`@glw907/cairn-cms-dev`), `NavLoadData` to `NavData`
  (`/sveltekit`), and `VocabularyLoadData` to `VocabularyData` (`/sveltekit`). A call site passing
  the bag positionally or by inference needs no change.
- **Three functions rename per the engine's verb vocabulary.** Rename `serializeManifest` (`.`) to
  `formatManifest`, `deriveExcerpt` (`/delivery/data`) to `buildExcerpt`, and `diffNewlyPublished`
  (`/delivery/data`) to `buildNewlyPublished` at any call site; every signature and behavior is
  unchanged. `parseManifest`'s canonical home also moves to `.`, beside `formatManifest`, but it
  stays importable from `/delivery/data` too, so this half needs no action.
- **Three noun-first factory functions rename per the engine's verb vocabulary.** Rename
  `cookieName` (`/auth-crypto`) to `buildCookieName`, `githubApp` (`.`) to `createGithubApp`, and
  `adminAction` (`/sveltekit`) to `createAdminAction` at any call site; every signature, return
  type, and thrown error is unchanged. `src/theme/cairn.config.ts` is the site file every consumer
  meets for `createGithubApp`, since every production site's adapter calls it directly.
- **Thirteen more functions rename per the engine's verb vocabulary, name-only, no deprecated
  alias.** Rename `buildMediaResolver` (`/media`) to `createMediaResolver`; `buildLinkResolver`
  and `buildFragmentResolver` (`/delivery`, `/delivery/data`) to `createLinkResolver` and
  `createFragmentResolver`; `extractMenu` and `extractVocabulary` (`.`) to `readMenu` and
  `readVocabulary`; `siteDescriptors` to `buildSiteDescriptors`, `newlyPublishedEntries` to
  `buildNewlyPublished` (two renames inside this one window collapse to the final name),
  `sitemapView` to `buildSitemapView`, and `jsonLdScript` to `renderJsonLdScript` (`/delivery`,
  `/delivery/data`); `mediaToken` (`/media`) to `formatMediaToken`; `glyph` (`.`) to
  `renderGlyph`; `fieldset` (`.`) to `defineFieldset`; and `ownerLevelRoles` (`.`) to
  `resolveOwnerLevelRoles`. `createMediaResolver` also drops its dead `opts?: { preset?: string }`
  third parameter; a caller passing `{ preset }` there drops it.
- **`createAuthChannel`'s event and options shapes change.** Replace every `AuthChannelEvent`
  import with `CairnEvent`, from `@glw907/cairn-cms/auth-channel` or
  `@glw907/cairn-cms/sveltekit`. Rewrite `ttl: { X }` as `limits: { <group>: { X } }` per the new
  grouping (for example `ttl: { sessionTtlMs }` becomes `limits: { session: { ttlMs } }`). Add a
  `{ env }` context parameter to a hand-rolled `lookup` and `verify`, reading the D1 binding off
  `ctx.env` instead of a captured closure. Copy
  `node_modules/@glw907/cairn-cms/migrations-channel/0000_channel.sql` into the channel binding's
  own `migrations_dir` in place of any file transcribed from `CHANNEL_SCHEMA_SQL`, then run
  `npx wrangler d1 migrations apply <channel-db>`; every statement is idempotent, so applying it
  against an already-provisioned database is a safe no-op. `revokeSessions(db, subject)` is
  unchanged.
- **Three more factory bags rename to `*Config`, and the `deps`/`opts` parameter renames to
  `config`.** Rename `CairnAdminOptions` to `CairnAdminConfig`, `ContentRoutesOptions` to
  `ContentRoutesConfig`, and `EditorRoutesOptions` to `EditorRoutesConfig` in any import from
  `@glw907/cairn-cms/sveltekit`. `AuthRoutes`, `EditorRoutes`, `NavRoutes`, and `SectionAction`
  keep their existing names and shapes; a site annotating `createPublicRoutes`'s return imports
  the newly declared `PublicRoutes` type from `@glw907/cairn-cms/delivery` instead of deriving it
  with `ReturnType<typeof createPublicRoutes>`. A test driving `createAuthGuard`'s returned handle
  with a structural fake event needs an `as unknown as`-style shim, since the factory is now
  annotated `: Handle`.
- **Four preview and health functions rename per the engine's verb vocabulary.** Rename
  `previewMint` (`/sveltekit`) to `mintPreview`, `previewRevoke` (`/sveltekit`) to `revokePreview`,
  `previewLoad` (`/sveltekit`) to `loadPreview`, and `healthLoad` (`/sveltekit`) to `loadHealth` at
  any call site; every signature, return type, and thrown error is unchanged. `loadHealth` reaches
  every production site's own `src/routes/healthz/+server.ts`; `loadPreview` reaches the two of
  four that mount a preview route, each in its own `src/routes/(site)/preview/[token]/+page.server.ts`.
- **Four discriminated results move onto the `outcome` idiom, every discriminant value restated in
  kebab case.** `RequestResult` (`/sveltekit`) renames to `RequestOutcome`: a login form switches
  from `form.status` to `form.outcome`, and from `'send_error'` to `'send-error'`; `form.sent` is
  unchanged. `ChannelRequestResult` and `ChannelConfirmResult` (`/auth-channel`) rename to
  `ChannelRequestOutcome` and `ChannelConfirmOutcome` and drop their `{ sent | ok: true } | {
  error: ... }` splits for one shape each; a site holding `createAuthChannel`'s return switches its
  `request` and `confirm` handling to the single `outcome` field, including the renamed success
  values `'sent'` and `'confirmed'`. A `result.ok` or `result.error` read fails the build, but `if
  ('error' in result)` still compiles and now always reads false, silently treating every refusal
  as a success; grep for `'error' in` against a held `createAuthChannel` result and rewrite each
  to `result.outcome !== 'sent'` / `result.outcome !== 'confirmed'`. The example site's own
  `src/routes/members/login/+page.server.ts` carried the `'error' in result` pattern before this
  pass rewrote it, so check a copy of that route first. `RevertFailure` (`/sveltekit`) renames to `RevertOutcome`: a
  history screen switches from `form.reason` to `form.outcome`, and from
  `'draft_exists'`/`'ref_unknown'`/`'history_stale'` to
  `'draft-exists'`/`'ref-unknown'`/`'history-stale'`; `draftEditor`, `draftLastSavedAt`, and
  `revertAction`'s HTTP statuses are unchanged.
- **The rate-limit and owner-guard families move onto the `outcome` idiom.** Replace
  `checkRateLimit(binding, key)` and `checkRateLimitKeys(binding, keys)` with
  `resolveRateLimit(binding, keys)` (`/cloudflare`), branching on `result.outcome` (`'allowed'`,
  `'limited'`, `'no-binding'`, `'failed'`) instead of a boolean; a degrade-to-open reader checks
  `result.outcome === 'allowed' || result.outcome === 'no-binding' || result.outcome === 'failed'`
  explicitly. Pass `deleteEditor(db, email, ownerRoles)` and
  `setEditorRole(db, email, role, ownerRoles)` (`/auth-store`) their site's owner-capability role
  names (`[]` keeps today's unconditional-write behavior) and read the returned `outcome` instead
  of relying on a resolved `Promise<void>`. Replace a `removeOwnerIfNotLast`/`demoteOwnerIfNotLast`
  boolean check with `result.outcome === 'ok'`.
- **`ContentFormFailure` (`/sveltekit`) flattens to one interface, and the arm types it used to
  compose retire.** `SaveFailure`, `DeleteRefusal`, `RenameFailure`, `CreateFailure`,
  `PreviewMintFailure`, `MediaDeleteRefusal`, `MediaUpdateFailure`, `MediaReplaceFailure`,
  `MediaAltPropagateFailure`, `MediaBulkFailure`, `MediaUploadFailure`, `VocabularySaveFailure`,
  `SettingsSaveFailure`, and `NavSaveFailure` all retire from `@glw907/cairn-cms/sveltekit`. A
  site importing one to annotate an action's `form` prop replaces it with `ContentFormFailure`,
  which already carries every one of those fields optionally; a site annotating an action outside
  that union (settings, nav, upload, dictionary) reads the return type through inference instead.
  `UsageEntry` also retires: index its element type off the carrier,
  `NonNullable<ContentFormFailure['usage']>[number]`, instead of importing it by name.
  `UploadResult`, `MediaBulkDeleteResult`, `MediaOrphanPurgeResult`, `MediaOrphanScanResult`,
  `MediaReplacePreviewPlan`, `MediaReplacePreviewEntry`, `MediaAltPreviewPlan`,
  `MediaAltPreviewEntry`, `TidyResult`, and `DictionaryAddResult` also retire from `/sveltekit`; a
  site importing one to annotate its own action reads the action's return type through inference
  instead, since none of these ten media-janitorial and settings/tidy/dictionary actions are
  reachable outside `createCairnAdmin`'s own composition. See `CHANGELOG.md`'s entries for the
  full list, grouped by family.
- **`validateReproFence` (`@glw907/cairn-cms/reproductions/manifest`) gains an
  `options?: ValidateReproFenceOptions` third parameter, and `ReproFenceValidation` retires.** A
  caller that relied on the previous baked-in register (an alt prefix, a length ceiling, an
  unknown-key refusal) now supplies `options` explicitly to keep that behavior; a caller that
  imported `ReproFenceValidation` to annotate the return value annotates the inline
  `{ issues: string[] }` shape instead. `DEFAULT_ROLES` retires from the root barrel: a site that
  imported it to satisfy `defineAccess`'s first parameter now passes `undefined` there directly.
- **`cairn-doctor` gains a fourth status, `UNCHECKED`, and a third exit code, `3`.** A CI job that
  gates on the exit code alone still works unmodified (both `1` and `3` are nonzero), but a pnpm
  or yarn site that previously read a silent SKIP on `config.dependency-floors` now gets a real
  verdict. A job that wants to distinguish a real failure (`1`) from an unchecked environment gap
  (`3`) captures the exit code and branches on it; see `docs/reference/doctor.md#status-vocabulary`
  for the CI wiring example.
- **Four more names narrow to one canonical home.** Import `AuthBranding` from
  `@glw907/cairn-cms/sveltekit` instead of the root package; import `MediaEntry` from
  `@glw907/cairn-cms/media` instead of `/sveltekit`; import `PublishActionEntry` from
  `@glw907/cairn-cms/sveltekit` instead of `/delivery` or `/delivery/data`. `PublishActionsConfig`
  retires: replace it with `PublishActionEntry[]` wherever it annotated `editor.publishActions` or
  a runtime read.
- **`EditorRow` (`/auth-store`) renames to `UnresolvedEditor`.** Rename any imported type
  reference; `findEditor` and `listEditors` return the renamed type, and every field and behavior
  is unchanged.
- **`iconSpan`, `cardShell`, and `headRow` are gone from `/render`**, now type-only
  (`ComponentContext`). Inline `iconSpan`'s body (`role === 'secondary' ? ['cairn-icon',
  'cairn-icon-secondary'] : ['cairn-icon']` then `h('span', { className }, [glyphEl])`) and
  `cardShell`'s body (`h('section', { className: classes }, [h('div', { className:
  ['cairn-alert-body'] }, body)])`) at their call sites, and re-home `headRow` as your own code
  with its signature unchanged; see `CHANGELOG.md`'s entry for the exact shape. The removed
  `cardShell` and `headRow` helpers carried the `card-body` and `card-title` literals. The
  preceding worked example already shows the rename the DaisyUI collision requires
  (`cairn-alert-body`/`cairn-head-title`), so if you keep DaisyUI's `card` component enabled for
  other markup, carry that same rename into your own re-homed code and update any prose CSS that
  targets it. Re-homing the helpers verbatim, literals included, moves `card-body`/`card-title`
  into your own Tailwind-scanned source, where DaisyUI's own `.card-body`/`.card-title` rules
  restyle the alert.
- **Seventeen type-only names moved to their canonical home.** The engine now publishes each
  exported name from exactly one subpath. Re-point these imports away from
  `@glw907/cairn-cms/delivery` and `@glw907/cairn-cms/delivery/data`, which no longer carry them:
  to `@glw907/cairn-cms` for `AssetConfig`, `SenderConfig`, `NavMenuConfig`, `PreviewConfig`,
  `SiteRender`, `ComponentRegistry`, `ComponentDef`, `ComponentContext`, `SlotDef`, `IconSet`, and
  `MediaResolve`; to `@glw907/cairn-cms/sveltekit` for `NavLayout`, `NavLayoutEntry`,
  `NavLayoutEngineRef`, and `NavLayoutSection`; to `@glw907/cairn-cms/islands` for `IslandRegistry`;
  and to `@glw907/cairn-cms/media` for `MediaRef`. All are type-only, so a missed one is a type
  error at build, never a runtime failure. `MediaRef`, `MediaResolve`, and `SiteRender` are still
  importable from `@glw907/cairn-cms/delivery`, whose `PublicRoutesConfig` names all three.
- **`LoginData` is now a discriminated union.** `createAuthGuard`'s new `identity` option adds a
  second shape to `LoginData` (`/sveltekit`), the type `loginLoad` returns. A site that typed a
  custom `/admin/login` route against `LoginData` and reads `csrf` or `error` directly now needs
  to narrow on `'identity' in data` first; a site that has not built a custom login route needs
  no change.
- **The `admin.login-probe` doctor check reclassifies two findings from `fail` to `info`.** A
  site that reads the probe's exit status programmatically must treat the workers.dev arm's
  exposure finding as `info`, not `fail`, on a plain magic-link site that still leaves
  `workers_dev` enabled (fix: `workers_dev: false` and `preview_urls: false` in the wrangler
  config, which the info detail now names); and must treat a 401 or 403 answering `GET
  /admin/login` as `info`, not a probe failure, since a WAF rule or a broken deploy answers the
  same way as a real identity gate and the check cannot tell them apart. A site that only reads
  the human-readable report needs no change.
- **`VariantSpec` and `AssetConfig.variants` are retired.** A site's evidence sweep found zero
  reachable runtime consumers: no family site declared a custom transform preset, and
  `presetUrl`, the only reader, had no non-test caller. The built-in `thumb`, `inline`, `card`,
  and `hero` presets are now the whole vocabulary. Drop any `variants:` key from a `media` block
  (it's a type error now, not a silent no-op); a site needing a size beyond the four built-ins
  builds a URL directly against Cloudflare's `/cdn-cgi/image/<options>/<path>` transform-URL
  format, since cairn's own URL builder was never public surface.
- **`StatusChip`'s register grammar moved to its second generation.** `register` is now
  `'quiet' | 'warning' | 'outline'` (default `'quiet'`); the `tone` prop, the status dot, and the
  STATUS_CHIP_DOT_CLASS export are all removed. Replace `register="bounded"` with
  `register="outline"` and `.cairn-chip-bounded` with `.cairn-chip-outline`; drop `tone`, mapping
  `neutral`/`info`/`success` to `register="quiet"` (or omit `register`, now the default) and
  `warning`/`danger` to `register="warning"`. A former `tone="danger"` chip now renders identically
  to a `tone="warning"` one (there is no chip-level danger tier in the second generation); the
  chip's own label text is the differentiator between the two states, not its color.
- **The `status-<tone>` classes no longer compile into the shipped admin sheet.** Stop relying on
  `status-neutral`/`status-info`/`status-success`/`status-warning`/`status-error` (and their size
  variants) in hand-authored admin markup.
- **The bracketed `text-[var(--cairn-warning-ink)]`/`text-[var(--color-positive-ink)]` arbitrary
  values no longer compile.** Replace `text-[var(--cairn-warning-ink)]` with `cairn-text-warning`
  and `text-[var(--color-positive-ink)]` with `cairn-text-success`, the new named utilities
  (`docs/reference/admin-grammar-tokens.md`, "Status-text idioms").
- **`createContentRoutes` no longer returns the ten media-janitorial actions**
  (`mediaBulkDeleteAction`, `mediaOrphanScanAction`, `mediaOrphanPurgeAction`,
  `mediaReplaceAction`, `mediaAltPropagateAction`, `mediaDeleteAction`, `mediaUpdateAction`,
  `mediaAltPreviewAction`, `mediaReplacePreviewAction`, `mediaLibraryUploadAction`). A site that
  hand-mounts the public `CairnMediaLibrary` component has lost its public seam for wiring those
  actions; there is no replacement factory for them. Mount the Media Library through
  `createCairnAdmin`, which still serves the component the full action vocabulary it posts to. A
  site that hand-mounts any other admin view is unaffected, `uploadAction` and `mediaLibraryLoad`
  included, and every result and failure type stays exported from `/sveltekit`.
- **The retires pass closed 56 ratified any-site-audit rulings, removing 53 exported names with
  zero remaining public consumers**; the other 3 closed rulings were process/tooling proposals
  with no exported name to remove. The removals span `@glw907/cairn-cms` (the root package),
  `/admin-toolkit`, `/auth-crypto`, `/auth-channel`, `/auth-store`, `/delivery`, `/delivery/data`,
  `/render`, `/reproductions`, and `/sveltekit`. None has a replacement export. A site importing
  one hand-rolls the composition or reads the value structurally off its surviving keep type
  instead. See `CHANGELOG.md`'s
  consolidated entry for the full name list, grouped by subpath, and the row-for-row replacement
  expression for the 18 names that survive only as an unnamed structural member of another
  export's shape, such as `EditData['linkTargets'][number]` in place of `LinkTarget`.
- **A declared access map narrows only the targets it names, and the composition now warns about
  the gap.** `validateAccessComposition` gains a non-throwing `config.access_unmapped` warning
  naming every concept and fixed screen a site's declared map leaves uncovered. Audit your access
  map for coverage: a map you believed was a whitelist may have left a screen or concept open to
  every editor-capability session; the warning names exactly which ones on the next server start,
  and `docs/extend/security-model.md#recovering-whitelist-semantics` gives the exhaustive-map
  recipe to close the gap.
- **Two log event names change to match the vocabulary's own grammar.** taxonomy.unmarked_field
  becomes `content.field_unmarked` and `publish.address_collision` becomes
  `publish.address_collided`. Rename both in any log filter or alert.
- **`mintPreview` replaces `mintPreviewToken`** (`/sveltekit`), taking
  `(runtime, config, event, { concept, entryId })` and performing the entry-scoped authorization
  and draft check itself, rather than leaving them to the caller. It returns a discriminated
  `PreviewMintOutcome` (`minted`, `unknown-concept`, `invalid-id`, `no-draft`) instead of throwing
  for a bad target. A site calling `mintPreviewToken` from its own workflow route switches to
  `mintPreview` and its new signature and outcome shape.
- **`TidyClient` (`/sveltekit`) narrows to an engine-owned contract**: `tidy(request, options)`
  takes `{ model, system, text, effort? }` and returns `{ corrected, refused, tokens: { input,
  output } }`, dropping the transcribed Anthropic wire fields (`max_tokens`, `output_config.effort`,
  `stop_reason`, `usage.*`). A hand-rolled `TidyClient` fake (through
  `ContentRoutesConfig.tidy.client`) implements the narrower shape instead of `messages.create`'s
  wire body. `TidyResult.model` (the action's own return, separate from `TidyClient`) is unaffected:
  it still names the requested model, never one the client or Anthropic resolved it to.
- **`ComponentContext` (`/render`) gains `attr(key)`; `strAttr` retires.** Replace
  `strAttr(ctx, key)` with `ctx.attr(key)`.
- **`HistoryData.draft.startedAt` renames to `lastSavedAt`, and `RevertFailure`'s
  `draft_exists.draftStartedAt` renames to `draftLastSavedAt`.** Rename both field reads.
- **`formatTimestamp` (`/admin-toolkit`) now accepts only two input shapes**: a SQLite
  `datetime('now')`-shaped string and a full ISO 8601 string carrying its own `Z` suffix or an
  explicit `±hh:mm` offset. Supply a zone (`Z` or a `±hh:mm` offset) on any near-ISO timestamp
  passed to `formatTimestamp`; a zone-less near-ISO string now passes through unformatted, where
  published `0.96.0` rendered it as UTC.
- **`cairn-audit`'s five rendered-mode harness failure ids move to a dot-namespace.**
  `rendered-allowlist-stale`, `rendered-allowlist-unprobeable`, `rendered-allowlist-dead`,
  `rendered-page-identity-mismatch`, and `rendered-state-unreachable` become
  `rendered.allowlist-stale`, `rendered.allowlist-unprobeable`, `rendered.allowlist-dead`,
  `rendered.page-identity-mismatch`, and `rendered.state-unreachable`. Update any
  `cairn-audit.config.json` allowlist `rule` value from the old `rendered-*` form to `rendered.*`.
- **`ReproContext` (`/reproductions`) gains a `mediaBase` prop; `fixtureMediaBase` retires from
  `/reproductions/manifest`.** Pass `mediaBase` to `ReproContext` instead of importing
  `fixtureMediaBase`; a site deployed under a SvelteKit `paths.base` composes fixture image URLs
  inside its own namespace by passing that prefix.
- **`MarkdownEditor`'s thirteen `register*` props retire in favor of one `registerEditor`
  callback.** `registerInsert`, `registerInsertLink`, `registerInsertImage`,
  `registerCaretCoords`, `registerFocusEditor`, `registerImagePlaceholders`,
  `registerGetSelection`, `registerGetSelectionRange`, `registerTidy`, `registerUndo`,
  `registerFormat`, `registerReplaceRange`, and `registerSelectRange` retire. Replace any of
  them passed directly to `MarkdownEditor` with one `registerEditor` callback that reads the
  matching member off the `EditorApi` it receives (annotatable as `EditorApi | null` from
  `/components`).
- **`MarkdownEditor`'s `registerEditor` now also delivers `null` once, from its real `onDestroy`
  teardown, revoking the mount grant.** A host holding one `editor` reference from a direct
  `MarkdownEditor` mount whose `registerEditor` callback assumed it was only ever called with a
  live `EditorApi` should narrow the parameter (`(api) => { if (!api) return; ... }`) before
  taking this release; the type widens to `EditorApi | null`. The revocation is identity-guarded
  (a host nulls its reference only when the revoked value is the one it still holds), so an
  out-of-order destroy from a superseded `{#key}` instance can never clobber a newer, already-live
  grant.
- **The five classes the render pipeline stamps onto its built-in directives rename from `ec-*`
  to `cairn-*`.** Rename `.ec-head` to `.cairn-head`, `.ec-icon` to `.cairn-icon`,
  `.ec-icon-secondary` to `.cairn-icon-secondary`, `.ec-glyph` to `.cairn-glyph`, and `.ec-grid`
  to `.cairn-grid` in any hand-authored prose CSS that targets `cardShell`/`headRow`/`iconSpan`/
  `renderGlyph`/`markFirstList` output. See `docs/reference/render.md` for the full emitted list.
- **Six log events rename onto the `refused` verb.** Rename any log subscriber matching on the
  old string, preview.rejected to `preview.refused`, guard.rejected to `guard.refused`,
  media.delete_blocked to `media.delete_refused`, media.replace_blocked to
  `media.replace_refused`, auth.access.denied to `auth.access.refused`, and
  admin.action.csrf_rejected to `admin.action.csrf_refused`; every record's field set is
  unchanged.
- **One log event moves onto its true area.** Rename admin.action.sink_threw to
  `audit.sink.call_failed` in any log filter, alert, or subscriber; `audit.sink.write_failed` is
  unchanged and every record's field set is unchanged.
- **`OfficeList` (`/admin-toolkit`) is retired.** Replace an `<OfficeList>` composition with
  `PageHeader` beside `AdminTable` inside a bare `overflow-hidden card-shell card-shadow` div (no
  `overflow-x-auto` on that div; `AdminTable`'s own wrapper already carries the horizontal
  scroll, and `overflow-hidden` clips the table's square edges to the card's rounded corners):

  ```svelte
  <script lang="ts">
    import { PageHeader, AdminTable } from '@glw907/cairn-cms/admin-toolkit';

    let { data }: { data: { events: { id: string; name: string; status: string }[] } } = $props();
  </script>

  <PageHeader eyebrow="Club" title="Events" meta="12 upcoming">
    {#snippet action()}
      <button type="button" class="btn btn-primary btn-sm">New event</button>
    {/snippet}
  </PageHeader>
  <div class="overflow-hidden card-shell card-shadow">
    <AdminTable rowCount={data.events.length}>
      {#snippet header()}
        <th scope="col">Name</th>
      {/snippet}
      {#snippet children()}
        <!-- rows -->
      {/snippet}
    </AdminTable>
  </div>
  ```

  The packaged admin sheet also drops `gap-0` and `overflow-x-auto`: `OfficeList.svelte` was the
  engine's only user of each.
- **`cairn-audit` gains three error-tier static rules and one advisory rendered rule for
  motion.** `motion-property`, `motion-vocabulary`, and `motion-hover-gate` join the static
  rules; `motion-reduced-delay` joins the rendered ones. A custom admin screen that transitions a
  layout property, writes `transition-all`, writes a literal duration or easing, or declares an
  ungated hand-authored `:hover` transition now fails `npx cairn-audit`. Move onto the
  `--cairn-dur-*`/`--cairn-ease-*` tokens, or suppress with a reason. One layout property is
  allowed, and only by the frame-offset key: an element carrying `data-cairn-motion="frame-offset"`,
  at most one per screen, may transition `margin-left`.
- **`motion-band`'s band widens from `150ms` to `250ms` to `70ms` to `400ms`, and it no longer
  reports a call site that references a token.** A site relying on the narrow band loses that
  check; `motion-vocabulary` is what replaces it. An existing `cairn-audit-disable-next-line
  motion-band` directive that covered a finding inside the old band and outside the new one now
  silences nothing, which `cairn-audit` reports as a dead suppression at error tier that cannot
  itself be suppressed: delete the directive on upgrade. The motion predicate also widens, so a
  `transition-delay` reaches `motion-band`'s band check and a rule declaring only
  `transition-timing-function` now owes a reduced-motion sibling under `reduced-motion`.
- **The admin sheet sets `--default-transition-duration` and
  `--default-transition-timing-function` to cairn tokens on the admin root.** A bare `transition`
  utility on a custom screen changes curve from Tailwind's `cubic-bezier(0.4, 0, 0.2, 1)` to
  Carbon's productive standard `cubic-bezier(0.2, 0, 0.38, 0.9)`. The duration is unchanged at
  `150ms`.
- **The admin's reduced-motion block now zeroes `transition-delay` and `animation-delay`.** A
  custom screen that relied on a delay surviving a reduced-motion preference loses it, which is
  the fix.
- **The edit page's preview pane no longer animates its width when the split changes.** The
  resize snaps.
- **The upload progress fill no longer transitions its `width`, and no motion replaces it.** The
  fill snaps to each new value. The native `<progress>` element is unchanged and keeps its
  implicit `progressbar` role and its `value`/`max` mapping, so nothing changes for assistive
  technology. The reduced-motion pin on `::-webkit-progress-value` goes with the transition it
  pinned.
- **Three utility classes leave the packaged admin sheet, because their last call sites go:**
  `transition-all`, `transition-[width]`, and `duration-[250ms]`. A site whose own markup carries
  any of the three was relying on the engine's sheet to compile it; add the class to that site's
  own Tailwind content or restate the declaration.
- **A native `title` on an admin action control is replaced by `admin-toolkit`'s `Tooltip`.** No
  action, unless your own admin copied the `cairn-btn-guarded` marker class from the engine's own
  markup; no production site has. `cairn-audit`'s `stock-default-hazards` rule now names that
  class retired, reported at advisory tier until `0.98.0` promotes the finding to error; the class
  itself stays compiled until a later release removes it.

### The four sites' upgrade order

Four production sites depend on this window, each on its own version range measured at plan
authoring: `ecxc-ski` (`^0.95.0`), `907-life` (`^0.84.4`), `xcathletes-org` (`^0.96.0`, plus
`@glw907/cairn-cms-dev` `^0.96.0`), and `aksailingclub-org` (`^0.96.0`). Upgrade in this order:
`ecxc-ski`, `907-life`, `xcathletes-org`, `aksailingclub-org`. The first three are four or five
mechanical call-site edits each; the fourth carries the `OfficeList` sweep across eighteen
screens and is the only one needing a composition change rather than a rename, so proving the
rename set on three smaller sites first de-risks the one site with real work.

- **`ecxc-ski`**, four files: `src/chassis/cairn.server.ts` (`createCairnAdmin`),
  `src/routes/media/[...path]/+server.ts` (`createMediaRoute`),
  `src/routes/healthz/+server.ts` (`healthLoad`), and `src/theme/cairn.config.ts` (`githubApp`).
- **`907-life`**, the same four files and the same four calls. It crosses the widest version gap
  of the four sites, so it reads more of this page than the others.
- **`xcathletes-org`**, five files: the same four as `ecxc-ski` plus
  `src/routes/(site)/preview/[token]/+page.server.ts` (`previewLoad`). It is the one site on
  `@glw907/cairn-cms-dev`, and it calls `devBackendHandle()` bare today with no type annotation,
  so `DevBackendConfig` reaches it only if it starts annotating.
- **`aksailingclub-org`**, the heaviest by far: the same four files as `ecxc-ski` plus
  `src/tests/adapter.test.ts` (`createContentRoutes`),
  `src/routes/(site)/preview/[token]/+page.server.ts` (`previewLoad`),
  `src/member-auth/lib/crypto.ts` (`cookieName`), `src/admin-club/lib/announcements.ts` and
  `src/routes/(site)/events/[id]/+page.server.ts` (`deriveExcerpt`), and **eighteen**
  `src/routes/admin/club/**/+page.svelte` files importing `OfficeList` plus
  `src/tests/announce-list-order.test.ts`. It is the only site the `OfficeList` removal reaches.

See [`CHANGELOG.md`](../../CHANGELOG.md) for the full entry.

## 0.96.0

The release step sets the version number at the cut and renames this section to match it. This
window raises three toolchain floors.

- **Run Node 24 or later on your build machine.** `create-cairn-site`'s own preflight now refuses
  a Node 22 install; the engine, the scaffolder, and the dev backend package all raised
  `engines.node` from `>=22` to `>=24`.
- **The `@sveltejs/kit` and `svelte` floors moved to the versions cairn now develops and tests
  against.** Be on `@sveltejs/kit ^2.70` and `svelte ^5.56.10` (the exact ranges in `package.json`)
  before installing; npm's default peer resolution refuses the install otherwise.
- **`@cloudflare/workers-types` is now a peer dependency at `^5`.** Install
  `@cloudflare/workers-types@^5` as a devDependency, even if you generate your own binding types
  with `wrangler types`: cairn's own shipped `.d.ts` files import named types directly from this
  package, so skipping the install silently loses every cairn-typed binding signature to an
  unresolvable-import `any` under `skipLibCheck: true`, and npm's default peer resolution refuses
  the install without it.

One more entry carries a conditional action. The exported `TidyClient` type gained an optional
`output_config` field, which matters only to a hand-rolled `TidyClient` fake that rejects unknown
body fields.

Three fixes need no consumer action but are worth knowing about. `previewLoad` (`/sveltekit`) now
reads `$app/environment` through a dynamic import guarded by `try`/`catch`, esbuild's own
documented escape hatch for downgrading an unresolvable specifier from a bundle-time error to a
runtime concern, so a site that added a Wrangler alias for `$app/environment` to work around the
barrel failing to resolve in a raw, non-Vite esbuild bundle (a Cron handler wired outside Vite,
for example) can remove that workaround. `previewLoad` now also strips `canonical`, `og:url`, and
`jsonLd.url` from the `seo` it returns, so a site that already stripped those fields itself before
rendering a preview can drop its own strip. `PreviewBanner` (`/components`) now renders its expiry
as a fixed UTC string instead of the visitor's locale, closing a possible hydration mismatch; a
site wanting its own date vocabulary can pass the new optional `formatExpiry` prop.

Nothing else in this window asks anything of a consumer. The dependency bumps stay inside their
own ranges. Tidy's default model changed, and a site that set `tidy.model` explicitly is
unaffected. A newly scaffolded site starts on `compatibility_date` `2026-08-21` without the
redundant `nodejs_compat` flag; an existing site keeps its own. The rest is documentation, gates,
and internal tooling that ships in no tarball.

See [`CHANGELOG.md`](../../CHANGELOG.md#0960).

## 0.95.0

This release promotes `0.95.0-rc.1`, which only ever reached the `next` dist-tag, so a site coming
from `0.94.0` crosses the `0.95.0-rc.1` section below as well as this one.

The reproduction seam and its two mounting overrides (`CairnAdminShell.themeOverride`,
`EditPage.spellcheckOverride`) need nothing: every new prop is optional and off by default. The
release-debt pass that followed carries five type-level changes, all of which surface as compile
errors rather than runtime failures, and one operational fact.

- **A cairn site runs on Cloudflare's Workers Paid plan, $5 a month, from its first deploy.** No
  code action. The admin documentation previously described the Worker as running on the free plan,
  which the built bundle's size has outgrown. Nothing about your site changes; the docs now state
  what it costs.
- **`SiteConfig` no longer carries an index signature.** Reading a parsed config by its declared
  fields, the supported way, is unaffected. Code that indexed one with a dynamic key, or passed one
  where a `Record<string, unknown>` was expected, now fails to compile; read the field by name.
  `parseSiteConfig` was already refusing those same unknown keys at runtime.
- **`AdminShellData` gained a required `mediaBase`, and `EditData` a required `singular`.** Both
  arrive populated through `shellLoad` and `editLoad`, so a site reaching them the normal way does
  nothing. A site that hand-builds either payload, including in its own tests, adds the field.
- **`DeleteDialog` and `RenameDialog` renamed their `label` prop to `singular`.** Pass the concept's
  singular noun rather than its plural label: these dialogs write sentences about one entry, and the
  plural rendered "Delete this posts?"

See [`CHANGELOG.md`](../../CHANGELOG.md#0950).

## 0.95.0-rc.1

- **The tidy action's SDK dependency moved.** `@anthropic-ai/sdk` is now an optional peer
  dependency instead of a plain one. A site using the tidy action adds it to its own dependencies
  (`npm install @anthropic-ai/sdk`); a site not using tidy does nothing, and its install gets
  lighter. See [`CHANGELOG.md`](../../CHANGELOG.md#0950-rc1).

## 0.94.0

A large, deliberately consolidated breaking release: a rename-and-type sweep across the event
shape, the role type, the deps types, the admin-action refusal channels, the admin-toolkit field
names, and the `navLayout` types finalized after 0.86.0's introduction; a route-factory action-name
rekey; and an access-map rekey for a parameterized `createSectionAction` route. `CHANGELOG.md`
carries its own ordered, numbered checklist for this version rather than scattering the steps
across prose, specifically so a consumer crossing it has one list to work from. Read [that
checklist](../../CHANGELOG.md#0940) directly rather than this page's summary; it is long enough
that reproducing it here would only create a second copy to keep in sync.

## 0.92.0

- **A field's default label register flipped.** `register="stacked"` is now the default for
  `FieldLabel`/`TextField`/`SelectField`, replacing `register="inline"`. Pass `register="inline"`
  explicitly on any call whose inline label-beside-control layout should survive the upgrade.
- **A stricter `cairn-audit --rendered` finding.** A screen with a filled header action stacked
  above a filled card action now counts as a finding; demote the non-primary fill to `btn-ghost` or
  `btn-outline`.

See [`CHANGELOG.md`](../../CHANGELOG.md#0920) for the full entries.

## 0.91.0

- **`badge-ghost` retired from cairn's own tree.** Replace any own `badge-ghost` usage with
  `StatusChip register="quiet"` (`@glw907/cairn-cms/admin-toolkit`) or the equivalent
  `.cairn-chip-quiet` recipe; `cairn-audit`'s `stock-default-hazards` check now errors on
  `badge-ghost` directly.

See [`CHANGELOG.md`](../../CHANGELOG.md#0910) for the full entry, including two informational
changes (a `PageHeader` spacing tightening, a `cairn-audit` finding demoted to advisory) that carry
no required action.

## 0.87.0

- **`routing: 'embedded'` became genuinely enforced.** An embedded concept's entries no longer
  resolve through permalinks, prerender, or appear in the sitemap; before this version the
  shorthand was declarable but not enforced. Check any concept your site declares
  `routing: 'embedded'`: if its entries are meant to have public URLs, declare `routing: 'page'`
  instead; if they were only ever meant to be referenced or included, no action is needed.

See [`CHANGELOG.md`](../../CHANGELOG.md#0870).

## 0.86.0

`navLayout` shipped in this version, giving a site one declarative tree for the whole admin
sidebar. Its types were renamed in 0.94.0 (`AdminNavEntry` and its siblings became
`NavLayoutEntry` and its siblings), so a site jumping from before 0.86.0 to past 0.94.0 in one leap
applies this version's shape first and then 0.94.0's rename on top of it.

- Any code reading `AdminShellData` fields directly (`customNav`, `canManageEditors` as a nav
  signal, `navLabel`) moves to the new consolidated `nav` field.
- A declared `navFilter` widens its parameter and return type from `ResolvedNavItem[]` to
  `ResolvedLayoutNode[]`; a filter that only reads `.label` needs no other change.

See [`CHANGELOG.md`](../../CHANGELOG.md#0860).
