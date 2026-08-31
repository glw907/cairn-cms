## Unreleased

<!-- release-size: minor -->

### Added

- `ExpandableRow` (`/admin-toolkit`) accepts a `data-cairn-inert-cell` attribute on any element
  inside a summary cell: the row's own click handler now ignores a click whose target resolves
  inside one (`closest('[data-cairn-inert-cell]')`), so a consumer wraps a genuinely interactive
  summary cell (an inline-editable value, a per-row action) instead of hand-rolling a
  `stopPropagation()` wrapper. The trigger button's own `aria-expanded` control and keyboard
  behavior are unchanged. The component's own `@component` doc comment is amended to match: an
  inline interactive summary cell is now a supported shape when wrapped in the attribute, not a
  contract violation. The trigger's rendered touch target was measured against the packaged admin
  CSS at the 390px viewport (24x24 CSS px, the engine's ruled AA floor) and clears it, so no size
  change was made. Consumers must: nothing.

- `ToolbarDisclosure` (`/admin-toolkit`) extracts the trigger-plus-panel disclosure `ListToolbar`
  implemented twice, its overflow menu and each `'menu'`-display facet: five dismissal mechanics
  (`aria-expanded`/`aria-controls`, focus-into-panel-on-open, Escape-plus-return-focus,
  outside-pointerdown, and focus-leaving-the-boundary), fully controlled via `open`/`onOpenChange`,
  with the trigger and panel staying the caller's own snippet-authored markup so a `'menu'` facet's
  ARIA-menu content (role, roving tabindex, reset-to-first) stays outside the primitive. Hiding is
  primitive-owned: the panel attrs' `hidden` member (`ToolbarDisclosurePanelAttrs`) tracks `open`
  directly, and a scoped `[hidden]` rule neutralizes any display-setting class the caller's own
  panel root carries (daisyUI's `.menu`, say), so an omitted `dropdown-content` positioning class
  can never leave the panel visible and tabbable while `aria-expanded` reads `false`. `ListToolbar`
  folds both duplications onto it; single-open-at-a-time for the facets stays in `ListToolbar` via
  `openFacetId`, since no self-contained primitive can enforce it across siblings. The Svelte-scoped
  `:focus-within` neutralizer that used to live in `ListToolbar`'s own style (`ListToolbar.svelte`,
  historically `:684-696`) moves with the container markup it serves, so it survives the fold rather
  than orphaning silently. `ListToolbar`'s own behavior, markup classes, and public contract are
  unchanged; this is an internal-implementation extraction plus one new export. Consumers must:
  nothing.

- `MediaPicker` publishes from `/admin-toolkit`, with `MediaSelection` and `MediaLibraryEntry`
  beside it, so a site building its own admin screen composes cairn's read-only combobox over the
  committed media library instead of rebuilding a selection UI over the manifest. Its prop is now
  `entries: MediaLibraryEntry[]`, the array `mediaLibraryLoad` already returns on
  `MediaLibraryData.assets`, so the loader's output passes straight through with no projection
  step; the picker was unexported before this release, so no consumer held the old
  `Record<string, MediaLibraryEntry>` shape. `MediaLibraryEntry`'s canonical home is
  `/admin-toolkit`, beside the component whose prop signature names it, and `/sveltekit` keeps its
  existing re-export. Consumers must: nothing.

- The packaged admin sheet (`cairn-admin.css`) gains two new classes: `cairn-text-warning` and
  `cairn-text-success`, the on-surface warning and success text idioms (`--cairn-warning-ink` and
  `--color-positive-ink`), replacing the bracketed `text-[var(--cairn-warning-ink)]` form with a
  named, documented utility (`docs/reference/admin-grammar-tokens.md`, "Status-text idioms"), and
  `toolkit-list`, an opt-in `<ul>`/`<ol>` class that drops the UA's 40px marker-gutter reservation
  for a plain bulleted or numbered list without pulling in daisyUI's own `.list` component's real
  baggage for prose: a forced flex/column layout in place of normal block flow between items, and a
  forced `.875rem` font-size in place of the ambient one. Every in-tree `text-[var(--cairn-warning-ink)]`
  and `text-[var(--color-positive-ink)]` call site now writes `cairn-text-warning`/`cairn-text-success`
  instead, so neither bracketed arbitrary-value class has any surviving reference in the scanned
  admin tree, and neither compiles into the shipped sheet. Consumers must: replace any
  hand-authored `text-[var(--cairn-warning-ink)]` with `cairn-text-warning` and any
  `text-[var(--color-positive-ink)]` with `cairn-text-success`, since the arbitrary-value classes
  no longer ship.

- `cairn-doctor` gains `config.no-referrer-blanket`, a check that catches a site-wide
  `Referrer-Policy: no-referrer` in `src/hooks.server.ts` (or `.js`) or `static/_headers`. Under
  the Fetch spec that policy strips the `Origin` header from a plain same-origin form POST, so it
  arrives as `Origin: null` and cairn's strict `originMatches` guard rejects it, breaking a
  non-admin form the site never left. The guard itself stays strict on purpose; the check flags
  the site-side misconfiguration instead, with a source-naming SKIP (never a silent PASS) when
  neither file is readable. See [Security model](docs/extend/security-model.md#response-hardening)
  and [Is it working?](docs/admin/is-it-working.md#scope-a-site-wide-no-referrer-policy).
  Consumers must: nothing.

- `cairn-audit` gains two static rules. `stripe-trim-parity` flags a striped row's `:nth-child`
  background pattern, or a `.table-zebra`-style class, co-occurring with an unconditioned
  first/last-child padding trim on the same row class: the trim clips the stripe fill on an
  even-count group unless it's scoped to its own parity (`:last-child:nth-child(odd)`).
  `unlayered-font-clobber` flags a scoped `<style>` block declaring `font-family`/`font-size`/
  `font-weight`/`font` outside an `@layer` on an element that also carries a font-affecting
  utility class (`text-*` size, `font-*` weight/family): under the no-Preflight admin, an
  unlayered scoped declaration beats a `@layer utilities` class at any specificity, since cascade
  layer precedence, not specificity, decides the winner. Both rules run at error tier and apply
  to any component `static.scope` reaches, not only the admin's own. See
  [`cairn-audit`](docs/reference/cairn-audit.md#the-static-rules). Consumers must: nothing.

- `cairn-audit` gains a third static rule, `list-role`. A `<ul>`/`<ol>` whose marker is
  suppressed, by its own classes (a `list-style`/`list-style-type: none` declaration, such as
  Tailwind's `list-none`) or by an item's classes changing that item's rendered display away from
  `list-item` to another display that still renders the item, such as `flex`, `grid`, `block`, or
  `inline-flex` (daisyUI's own `.list-row` renders `display: grid`), stops being announced as a
  list by WebKit/VoiceOver once it carries no role attribute; the finding names the WebKit
  mechanism and the one-attribute remedy, `role="list"`. `display: none` (Tailwind's `hidden` and
  its responsive variants) is excluded, since a hidden item never reaches the accessibility tree
  and so cannot strip the enclosing list's implicit role. A list already carrying a different
  explicit role is exempt, since that role already overrides the implicit one on purpose. Runs at
  error tier and applies to any component `static.scope` reaches. The engine's own admin adopts
  the remedy on every in-tree list the rule caught, the rule's own dogfooding proof. See
  [`cairn-audit`](docs/reference/cairn-audit.md#the-static-rules). Consumers must: nothing.

- `cairn-audit` gains a sixth error-tier rendered rule, `panel-width`. `viewport-overflow` declines
  this case on purpose: its document-scroll gate reads clean when a table wrapper absorbs a wide row
  by scrolling, and its scroll-container skip exempts everything under any non-`visible` ancestor
  whether or not that ancestor actually offers a scrollbar, so a row clipped inside a wrapper that
  never genuinely scrolls reached neither test. `panel-width` checks an ExpandableRow summary row
  or its expanded panel: flagged only when some element inside it overflows its own box while no
  ancestor between it and the table wrapper is genuinely reachable (`overflow-x: auto`/`scroll` and
  currently overflowing); an `overflow-x: hidden` ancestor never counts, and neither does an `auto`
  one that never actually grows past its own width. The same test exempts a deliberately scrollable
  AdminTable and a deliberately scrollable descendant living inside the panel. Also exempt: a native
  `input`/`textarea`/`select` (the UA's own internal scrolling is invisible to the computed-style
  test) and the house truncation idiom, `text-overflow: ellipsis` with a clipping `overflow-x`. See
  [`cairn-audit`](docs/reference/cairn-audit.md#the-rules). Consumers must: nothing.

- The showcase's public theme (`examples/showcase/src/theme/site.css`, baked into every scaffolded
  site) gains `scroll-behavior: smooth` on `html`, so an in-page anchor jump or a focused heading
  glides to the existing `scroll-padding-top` offset instead of snapping; a `prefers-reduced-motion:
  reduce` query restores an instant jump for anyone who asked the OS for less motion. Left alone,
  `scroll-behavior: smooth` also animates SvelteKit's own post-navigation scroll reset (a bare
  `window.scrollTo(x, y)`, which the CSSOM View spec animates the same as any other scroll on a
  smooth-scrolling element), turning every route change into a glide with a mid-animation focus
  reset; the (site) group's own layout now brackets the router's own scroll with a
  `beforeNavigate`/`afterNavigate` pair that toggles a `cairn-router-scrolling` class, forcing
  `scroll-behavior: auto` for that one scroll only, so a reader's own anchor jump or focused
  heading still glides. Consumers must: nothing; a site that already copied `site.css` and the
  (site) layout during scaffolding can pull the same rules and the toggle.

### Changed

- The conventions pass (Task 2) applies two of the 2026-08-30 sitting's ratified rulings across the
  factory population: **parameter bags** (`*Config` is the primary bag, `config` its primary
  parameter identifier) and **contract-first factory returns** (every public factory's signature
  declares a named, deliberately authored return type; `ReturnType<typeof f>` leaves the public
  surface). Renamed bags, with no deprecated alias (churn is free; the window batches):
  `CairnAdminOptions` → `CairnAdminConfig`, `ContentRoutesOptions` → `ContentRoutesConfig`,
  `EditorRoutesOptions` → `EditorRoutesConfig`; the `deps` parameter renames to `config` on every
  touched factory (`createCairnAdmin`, `createContentRoutesInternal`, `createContentRoutes`,
  `createContentRoutesContext`, `createPublicRoutes`), and `opts` renames to `config` on
  `createEditorRoutes` only. `createAuthGuard`'s `AuthGuardOptions`/`opts` are UNCHANGED
  deliberately: the audit's own C2 table ruled it a correct secondary bag, and this pass honors
  that annotation. Declared return contracts replace every `ReturnType`-derived or unnamed return
  in the touched population: `AuthRoutes`, `EditorRoutes`, and `NavRoutes` convert from
  `ReturnType<typeof f>` aliases to hand-declared interfaces the factory signatures now return;
  `PublicRoutes` (the Task 1 reopen of `audit-delivery-publicroutes`) is a newly AUTHORED interface
  under the name the retires pass previously removed, and `createPublicRoutes(config:
  PublicRoutesConfig): PublicRoutes` names it in its own signature; `SectionAction<Env, Db>` names
  `createSectionAction`'s curried wrapper return, previously unnamed; `createAuthGuard` is
  annotated `: Handle`, kit's own ambient type, under the interop carve-out
  (`convention-interop-carve-out`: a host ecosystem's convention wins over cairn's grammar on an
  interop surface), and `createMediaRoute`'s existing `: RequestHandler` is recorded as conforming
  to the same clause. `cairnManifest`'s `CairnManifestOptions` (`/vite`) keeps its `*Options` name
  for the same interop reason: Vite's own plugin-factory convention names every options bag
  `*Options`, and the barrel now carries a comment saying so. **Consumers must:** replace
  `CairnAdminOptions` with `CairnAdminConfig`, `ContentRoutesOptions` with `ContentRoutesConfig`,
  and `EditorRoutesOptions` with `EditorRoutesConfig` in any import from `@glw907/cairn-cms/sveltekit`;
  a site annotating `createPublicRoutes`'s return imports the newly declared `PublicRoutes` type
  from `@glw907/cairn-cms/delivery` instead of deriving it with
  `ReturnType<typeof createPublicRoutes>` (see the amended retires-pass line below); `AuthRoutes`,
  `EditorRoutes`, `NavRoutes`, and `SectionAction` keep their existing names and shapes, so no
  action is needed for those beyond the type now being hand-declared rather than derived.

- `createCairnAdmin` now returns a narrowed `CairnAdminRoutes`, the same Pick-composed pattern
  `ContentRoutes` (foundations-B) already established: `Pick`-composed over a new internal wide
  factory, `createCairnAdminInternal` (reachable through no package subpath), which the single-mount
  composer keeps driving in full. Ten of the `actions` record's media-janitorial actions withdraw
  from the declared contract, mirroring `ContentRoutes`'s own ten exactly: `mediaDelete`,
  `mediaUpdate`, `mediaLibraryUpload`, `mediaReplacePreview`, `mediaReplace`, `mediaAltPreview`,
  `mediaAltPropagate`, `mediaBulkDelete`, `mediaOrphanScan`, `mediaOrphanPurge`. `mediaUpload`
  stays on the contract: it wraps the same `uploadAction` the kept `upload` action wraps, gated to
  the media view instead of the edit view. **Consumers must:** nothing at runtime. This is a
  type-level capability withdrawal, not a runtime boundary: `createCairnAdmin` returns the same
  object `createCairnAdminInternal` builds, so every action is still present and still runs the
  session, CSRF, and view gates it always ran; a site that annotated a hand-held reference to one of
  the ten (uncommon, since the documented mount is `export const actions = admin.actions;`) recovers
  them with a spread (`{ ...admin.actions }`) or a cast, the same recovery `ContentRoutes`'s own
  narrowing documented.

- The engine ratifies a **canonical-home rule**: every exported name has exactly one declaring
  subpath, and any other barrel that publishes it does so as a recorded re-export naming that home
  and the signature requiring it. The rule answers a whole-surface finding no per-export review
  could see: of 411 exported names, 122 published from two or more subpaths, so a developer holding
  `NavLayoutEntry` had four import statements and no way to learn which was intended, and because
  each barrel rendered the type through its own expansion, two files in one repo importing it from
  two subpaths could produce a diff that looked like version skew. Executing it removed 18
  publications the export-rule closure never justified: `/delivery/data` published ten
  adapter-only members (`AssetConfig`, `SenderConfig`, `NavMenuConfig`, `PreviewConfig`,
  `SiteRender`, `ComponentRegistry`, `ComponentDef`, `ComponentContext`, `SlotDef`, `IconSet`), the
  four nav-layout types, `IslandRegistry`, `VariantSpec`, `MediaRef`, and `MediaResolve`, none of
  which any signature on that subpath names, since the barrel deliberately stops short of
  `CairnAdapter` itself. `/delivery` drops the same set apart from `MediaRef`, `MediaResolve`, and
  `SiteRender`, which `PublicRoutesConfig` names and which it now exports directly. The 120
  surviving non-home publications are recorded in
  `scripts/checks/check-surface-reexports.json` with their home and the signature that requires
  each, and `check:surface` now fails an unrecorded duplicate, a record entry the surface has
  outlived, and a record entry whose stated home the surface does not declare, so the set shrinks as
  later slices narrow rather than drifting; the rule runs ahead of both the snapshot diff and the
  `--update` regeneration, so a new duplicate cannot be written into the golden. `/delivery` over
  `/delivery/data` is recorded as one home, not two: the dependency-axis pair over one source tree
  keeps its documented `export *`. Consumers must: import these names from their canonical home
  rather than from `/delivery` or `/delivery/data`. From `@glw907/cairn-cms`: `AssetConfig`,
  `SenderConfig`, `NavMenuConfig`, `PreviewConfig`, `SiteRender`, `ComponentRegistry`,
  `ComponentDef`, `ComponentContext`, `SlotDef`, `IconSet`, `MediaResolve`. From
  `@glw907/cairn-cms/sveltekit`: `NavLayout`, `NavLayoutEntry`, `NavLayoutEngineRef`,
  `NavLayoutSection`. From `@glw907/cairn-cms/islands`: `IslandRegistry`. From
  `@glw907/cairn-cms/media`: `MediaRef`, `VariantSpec`. All are type-only imports, so no runtime
  behavior changes;
  `@glw907/cairn-cms/delivery` still carries `MediaRef`, `MediaResolve`, and `SiteRender`.

- `StatusChip`'s (`/admin-toolkit`) register grammar moves to its second generation (the
  2026-08-24 owner probe, Geoff's own ratification: illegible-dot evidence and the ratified
  three-register recipe are on record in `docs/internal/probes/2026-08-26-chip-registers-v2`).
  `register` is now `'quiet' | 'warning' | 'outline'` (default `'quiet'`); the `tone` prop, the
  small `status` dot it drove, and the `STATUS_CHIP_DOT_CLASS` export are all removed, since the
  register alone now carries both shape and color. The sheet's shared hand-composed vocabulary
  moves the same way: `.cairn-chip-bounded` is gone and `.cairn-chip-warning` is new. `title`
  renders only when a `legend` prop is passed; a self-explanatory label with no `legend` carries no
  `title` at all, since a bare `<span>` tooltip is hover-only anyway (no focus of its own to
  surface it to a keyboard user), and the visually-hidden `legend` span already carries the
  assistive-technology-reachable half of that same information. The shared `.cairn-chip-quiet`/
  `.cairn-chip-warning`/`.cairn-chip-outline` rules pin `font-weight: 400`, and, being unlayered,
  that pin outranks any Tailwind weight utility on the same element regardless of source order
  (cascade layers resolve before specificity); a hand-composed chip that also carries
  `font-semibold` or `font-medium` computes 400 anyway. `EditPage`'s three header status badges
  (Published, on `.cairn-chip-quiet`; Edited and New, on the stock `badge-warning`/`badge-info`
  fills) now render at that same uniform weight 400: the `font-medium` those two previously
  carried was load-bearing for the Edited and New states, and dropping it to match Published is
  deliberate. Consumers must: replace `register="bounded"` with `register="outline"` and
  `.cairn-chip-bounded` with `.cairn-chip-outline`; remove the `tone` prop and any dependency on
  the status dot, mapping `neutral`/`info`/`success` to `register="quiet"` (or leave `register`
  unset, since `quiet` is now the default) and `warning`/`danger` to `register="warning"`; remove
  any reference to the removed `STATUS_CHIP_DOT_CLASS` export; and remove any weight utility from
  a hand-composed `.cairn-chip-*` element, since it renders at 400 regardless.

- The status-dot safelist family in `admin-css-safelist.ts` (thirteen entries, `status-primary`
  through `status-xl`) is removed from the shipped `cairn-admin.css`, since the dot itself is
  retired with `tone` above; the base `status` class stays blessed for one documented,
  audit-complete list even though nothing renders it today. `badge-error`/`badge-success`, which
  previously compiled only as a side effect of `StatusChip`'s own retired doc-comment prose naming
  them (never from real usage), are now blessed deliberately in the same safelist instead of being
  silently dropped. Consumers must: stop relying on any `status-<tone>` class (`status-neutral`,
  `status-info`, `status-success`, `status-warning`, `status-error`, and every size variant) in
  hand-authored admin markup; it no longer compiles into the shipped sheet.

- `CsrfField` now pins its own hidden input's `defaultValue` attribute directly, alongside `value`,
  so the token-survives-a-native-form-reset guarantee no longer depends on a hidden input's own
  value-mode semantics. Setting `defaultValue` explicitly also means Svelte's compiler no longer
  reaches for its own default-management machinery on this input: the hydration-time
  `remove_input_defaults` call and the document-level `reset` listener it registers to reconcile a
  dynamic `value` binding back to its default. No consumer-side change. Consumers must: nothing.

- `createContentRoutes` now returns a narrowed `ContentRoutes`: the 25 loads and actions a site
  mounts by hand. The ten media-janitorial actions it used to return (`mediaBulkDeleteAction`,
  `mediaOrphanScanAction`, `mediaOrphanPurgeAction`, `mediaReplaceAction`,
  `mediaAltPropagateAction`, `mediaDeleteAction`, `mediaUpdateAction`, `mediaAltPreviewAction`,
  `mediaReplacePreviewAction`, `mediaLibraryUploadAction`) are reachable only from the engine's own
  Media Library screen, so they move to an unexported internal factory that the single-mount
  composer keeps driving in full. `createCairnAdmin` is unchanged: every one of those actions is
  still registered under its `actions` record, and every result and failure type stays exported
  from `/sveltekit`. The narrow type is derived from the internal shape rather than hand-mirrored,
  so the two cannot drift. **Consumers must:** a site that hand-mounts the public
  `CairnMediaLibrary` component has lost its public seam for wiring the media actions. There is no
  replacement factory for them; mount the Media Library through `createCairnAdmin`, which serves
  the component the full action vocabulary it posts to. A site that hand-mounts any other admin
  view is unaffected, `uploadAction` and `mediaLibraryLoad` included.

- The retires pass closes 56 ratified any-site-audit retire verdicts
  (`docs/internal/engine-rulings.md`): 38 unsanctioned exports the audit found zero consumers for
  anywhere in the engine, showcase, or docs, plus 18 accepted `NavIcon`-class closure leaks Geoff's
  F-1 hybrid ruling sanctions (`docs/internal/record/2026-08-30-r4-rederivation.md`, section 7; the
  full row-for-row leak record, with every replacement expression, is
  `docs/internal/record/2026-08-30-retires-move-record.md`). By family: `TextInput`, `SelectInput`,
  `SelectInputOption`, and `FieldRow` (`audit-admin`) are deleted outright from `/admin-toolkit`:
  `TextInput`, `SelectInput`, and `FieldRow` all composed `FieldLabel` plus a bare control, and
  that composition is now the documented hand-roll (the bottom-aligned field row recipe `FieldRow`
  shipped, `display: flex; align-items: flex-end; gap: var(--cairn-gap-control, 0.5rem)`, is
  unchanged, just no longer a component); `SelectInputOption` retires alongside `SelectInput`,
  the only module that declared it, since it named only that component's own `options` prop;
  `ageFromBirthdate`, `formatMoney`/`FormatMoneyOptions`, and `formatPhone`/`FormatPhoneOptions`
  are deleted outright from `admin-toolkit/format.ts`, none had a call site anywhere; `roleHome`
  and `StandardSchemaV1` (`audit-adapter`) unexport from the root barrel but stay reachable at
  their own module (`auth/roles.ts`, `content/standard-schema.ts`) for the engine's own internal
  use; `AppliedFilterPill`, `computeAppliedFilters`, `computeCountLine`, `ItemRange`,
  `computeItemRange`, `PageWindowItem`, `computePageWindow`, and `itemNoun` (`audit-admin`) all
  unexport from the `/admin-toolkit` barrel and their owning component's own module context, but
  stay exported from their source module (`list-toolbar.ts`, `pagination-window.ts`, `format.ts`),
  since `ListToolbar` and `Pagination` still compute and render this arithmetic internally.
  `generateCsrfToken` and `generateSessionId` (`audit-auth`) unexport from `/auth-crypto` but stay
  reachable at `auth/crypto.ts` for the engine's own internal use (`sveltekit/csrf.ts`,
  `sveltekit/auth-routes.ts`), both bodies were byte-identical to `generateToken` under a second
  name; `CHANNEL_SCHEMA_VERSION` drops its `export` keyword in `auth-channel/store.ts` and its
  barrel line in `auth-channel/index.ts`, staying a module-internal const `verifySchema` and the
  seeding `INSERT` still read; `devDelivery` deletes outright from `/auth-channel`
  (`auth-channel/dev.ts` removed, zero remaining consumers anywhere in `src/lib`), its stated
  purpose, guarding a dev transport reaching production, is a discoverability problem an export
  does not fix; a factory-side refusal is a design question for a later pass (`createAuthChannel`
  reads no env at construction time, so it cannot observe a per-request `CAIRN_DEV_BACKEND`
  value), and until then the refusal lives in the site's own transport body (see the migration
  line below); `insertOwnerIfEmpty` unexports from `/auth-store` but stays reachable at `auth/store.ts`
  for the engine's own internal use (`sveltekit/auth-routes.ts`'s `bootstrapOwner` wiring), the
  declarative `bootstrapOwner` config on `createCairnAdmin` already seeds the first owner
  atomically on the bootstrap login path, where the race this function guards actually matters;
  three `audit-cli` rows are process/tooling proposals the CLI-surface audit ledgered as `retire`
  (decline the proposal), not exported names, a `check:dogfood` tripwire proposed into
  `cairn-audit`, `unlistedRoutes` proposed as a `cairn-audit` rendered rule, and a
  `skill.admin-screens` check plus `cairn-doctor --fix`, closing each is a ledger-only act, with
  nothing to delete in `src/`. `AI_CRAWLERS_REVIEWED`, `feedView`, `PublicRoutes`, and
  `unlistedRoutes` (`audit-delivery`) delete outright from `/delivery` and `/delivery/data` (or
  `/delivery` alone for `PublicRoutes`), each had zero remaining consumers anywhere in `src/lib`,
  and `unlistedRoutes` takes its two now-orphaned private helpers with it; `AI_CRAWLERS` unexports
  from both delivery barrels but stays reachable at `delivery/ai-crawlers.ts` for the engine's own
  internal use (`robots.ts`, `doctor/check-posture.ts`), its element type `AiCrawler` unexports
  too, consumed only inside its declaring module. `isElement` (`audit-render`) unexports from
  `/render` but stays reachable at `render/rehype-dispatch.ts`, where the pipeline's own transform
  functions call it internally; a site needing the narrowing reaches for `hast-util-is-element`,
  named as the leaner alternative in the audit's own rationale. `stories` (`audit-repro`,
  `/reproductions`) drops its `export` keyword, module-internal now beside `getStory`, the seam a
  consumer already reaches a registered story through; the engine's own
  `reproductions-stories.test.ts` repoints its "universal story contract" loop onto `manifest`
  filtered through `getStory` rather than the array directly. `resolveNavLayout` and
  `validateNavLayout` (`audit-sveltekit`) unexport from `/sveltekit` but stay reachable at
  `sveltekit/admin-nav.ts` for the engine's own internal use (`content-routes-core.ts`'s
  `shellLoad`, `content-routes-context.ts`'s runtime composition); `ResolveNavLayoutOptions`
  unexports too, consumed only inside its declaring module. The 18 sanctioned `NavIcon`-class
  leaks, all `audit-sveltekit` except `ReproInstance` (`audit-repro`): the audit found no consumer
  naming these types directly, but each is still named, unexported, inside a surviving keep
  export's rendered public shape, and stays reachable through a structural indexed-access
  expression rather than by import. `AdvisoryNotice`, `LinkTarget`, `FragmentTarget`,
  `PublishActionLink`, `ResolvedPreview`, `LoginData`, `ConfirmData`, `EditorsData`,
  `EntrySummary`, `GettingStarted`, `MarkdownReferenceRow`, `HistoryEntry`, `MediaUsageInfo`, and
  `TidyKeyProbeResult` all unexport from `/sveltekit`'s barrel but stay exported at (or re-exported
  through, for `EntrySummary` and `TidyKeyProbeResult`) their own declaring module for the engine's
  own internal use; `AdvisoryAction`, `NavConcept`, and `NavPageOption` drop their `export`
  keyword entirely, each consumed only inside its declaring module; `ReproInstance`
  (`/reproductions`) drops its
  `export` keyword too, and the two in-tree consumers that used to import it
  (`ReproContext.svelte`, the test suite's shared reproduction mount helper) now derive the type
  structurally instead of importing the name. **Consumers must**, grouped by family: stop
  importing `roleHome`, `StandardSchemaV1`, `TextInput`, `SelectInput`, `SelectInputOption`,
  `FieldRow`, `ageFromBirthdate`, `formatMoney`, `FormatMoneyOptions`, `formatPhone`,
  `FormatPhoneOptions`, `itemNoun`, `AppliedFilterPill`, `computeAppliedFilters`,
  `computeCountLine`, `ItemRange`, `computeItemRange`, `PageWindowItem`, or `computePageWindow`
  from `@glw907/cairn-cms` or `@glw907/cairn-cms/admin-toolkit` (`audit-adapter`/`audit-admin`);
  none has a replacement export, and a site that needs the
  `TextInput`/`SelectInput`/`SelectInputOption`/`FieldRow` composition or the pagination/toolbar
  arithmetic hand-rolls it directly against `FieldLabel` and the two components' own documented
  behavior. Stop importing `generateCsrfToken` or `generateSessionId`
  from `@glw907/cairn-cms/auth-crypto` (`audit-auth`; call `generateToken` instead, for a
  magic-link token, a session identifier, or a double-submit CSRF token alike); stop importing
  `CHANNEL_SCHEMA_VERSION` or `devDelivery` from `@glw907/cairn-cms/auth-channel` (a site needing
  the dev-only console print hand-rolls it as the showcase's own capture transport does,
  `examples/showcase/src/members/capture-transport.ts`: `deliver: async (contact, code, ctx) => {
  if (ctx.env?.CAIRN_DEV_BACKEND !== '1') throw new Error('refusing to deliver without
  CAIRN_DEV_BACKEND=1'); console.log(contact, code); }`; the refusal must live inside the
  `deliver` function body, never in a caller's wrapper around it, since a wrapper is exactly what
  the deleted `devDelivery`'s own design was built to make unnecessary); stop importing
  `insertOwnerIfEmpty` from `@glw907/cairn-cms/auth-store` (pass `bootstrapOwner` to
  `createCairnAdmin` instead). Stop
  importing `AI_CRAWLERS`, `AI_CRAWLERS_REVIEWED`, `AiCrawler`, or `feedView` from
  `@glw907/cairn-cms/delivery` or `@glw907/cairn-cms/delivery/data`, and stop importing
  `unlistedRoutes` from either subpath (`audit-delivery`); none has a replacement export. A site
  wanting the AI-crawler posture keeps using `buildRobots`'s `posture` option, which applies the
  table internally. A site wanting a full-content feed hand-writes its own mapping off
  `siteDescriptors`, filtering `routing.inFeeds` itself, the same one-line derivation all six
  family sites already wrote by hand.
  (**Amended by the conventions pass, Task 2:** `PublicRoutes` is reopened as a declared contract,
  not deleted; drop it from this stop-importing list. A site annotating `createPublicRoutes`'s
  return imports the declared `PublicRoutes` type from `@glw907/cairn-cms/delivery` instead of
  writing `ReturnType<typeof createPublicRoutes>` itself, the exact idiom the contract-first-returns
  ruling now bans on the public surface; see the conventions-pass entry above.)
  (**Amended by the conventions pass, Task 3:** `siteDescriptors` renames to `buildSiteDescriptors`
  (the verb-rule and bare-noun conventions; see the conventions-pass entry below); a site hand-writing
  a full-content feed off it names the new function, `buildSiteDescriptors`, not `siteDescriptors`.)
  Stop importing `isElement` from `@glw907/cairn-cms/render` (`audit-render`; reach for
  `hast-util-is-element`, or the inline `!!node && node.type === 'element'` check, over hast types
  the site already imports). Stop importing `stories` from `@glw907/cairn-cms/reproductions`
  (`audit-repro`; call `getStory(id)` for each manifest entry instead). Stop importing
  `resolveNavLayout`, `ResolveNavLayoutOptions`, or `validateNavLayout` from
  `@glw907/cairn-cms/sveltekit` (`audit-sveltekit`); none has a replacement export, and a site
  rendering its own nav outside `CairnAdminShell` no longer has a public seam for it. Stop
  importing `AdvisoryNotice`, `AdvisoryAction`, `LinkTarget`, `FragmentTarget`,
  `PublishActionLink`, `ResolvedPreview`, `LoginData`, `ConfirmData`, `EditorsData`,
  `EntrySummary`, `GettingStarted`, `MarkdownReferenceRow`, `HistoryEntry`, `MediaUsageInfo`,
  `NavConcept`, `NavPageOption`, `TidyKeyProbeResult`, or `ReproInstance` from
  `@glw907/cairn-cms/sveltekit` or `@glw907/cairn-cms/reproductions` (the sanctioned 18,
  `audit-sveltekit`/`audit-repro`); none has a replacement export, and each reads structurally off
  its surviving keep parent instead: `EditData['advisories'][number]` for `AdvisoryNotice`,
  `NonNullable<EditData['advisories'][number]['actions']>[number]` for `AdvisoryAction`,
  `EditData['linkTargets'][number]` for `LinkTarget`,
  `NonNullable<EditData['fragmentTargets']>[number]` for `FragmentTarget`,
  `EditData['publishActions'][number]` for `PublishActionLink`,
  `NonNullable<EditData['preview']>` for `ResolvedPreview`,
  `Extract<AdminData, { view: 'login' }>['page']` for `LoginData`,
  `Extract<AdminData, { view: 'confirm' }>['page']` for `ConfirmData`,
  `Extract<AdminData, { view: 'editors' }>['page']` for `EditorsData`,
  `ListData['entries'][number]` for `EntrySummary`, `HelpData['gettingStarted']` for
  `GettingStarted`, `HelpData['reference'][number]` for `MarkdownReferenceRow`,
  `HistoryData['entries'][number]` for `HistoryEntry`, `MediaLibraryData['usage'][string]` for
  `MediaUsageInfo`, `Extract<AdminShellData, { public: false }>['concepts'][number]` for
  `NavConcept`, `NavLoadData['pages'][number]` for `NavPageOption`,
  `Exclude<SettingsData['keyStatus'], 'missing'>` for `TidyKeyProbeResult`, and
  `Parameters<NonNullable<ReproStory['pose']>>[1]` for `ReproInstance`.

- The conventions pass (Task 3) applies the 2026-08-30 sitting's ratified **verb-rule** and
  **bare-noun** conventions to the factory population: `verify*` stays reserved for an engine-owned
  integrity check that throws, `validate*` for a check returning issues, `build*` for pure-data
  derivation, and `create*` for a function factory; `read*` reads a committed artifact or
  declaration into typed shape, retiring `extract*`; every exported function's name now begins with
  a verb. Renamed, names only, no deprecated alias: the resolver trio `createMediaResolver`
  (`/media`), `createLinkResolver`, `createFragmentResolver` (`/delivery`,
  `/delivery/data`) — function factories, so `build*` moves to `create*`; `readMenu`, `readVocabulary`
  (`.`) — `extract*` retires; `buildSiteDescriptors`, `diffNewlyPublished`, `buildSitemapView`,
  `renderJsonLdScript` (`/delivery`, `/delivery/data`); `formatMediaToken` (`/media`), paired with
  the unchanged `parseMediaToken` as the codec; `defineFieldset` (`.`), joining
  `defineAdapter`/`defineConcept`/`defineComponent`/`defineRegistry`'s established prefix for a
  declaration-time constructor; `resolveOwnerLevelRoles` (`.`), beside `resolveCapability`. One
  deliberate signature change rides the rename so the signature moves once: `createMediaResolver`
  drops its dead `opts?: { preset?: string }` parameter (`(manifest, resolved)` only), closing
  `audit-media-buildmediaresolver` — `opts.preset` had zero non-test callers anywhere and silently
  contradicted the `imageDetail` side channel's own srcset/dimensions. Everything else in this
  entry is a name-only rename; behavior, parameter order, and every other signature are unchanged.
  **Consumers must**, one rename table: `buildMediaResolver` → `createMediaResolver`;
  `buildLinkResolver` → `createLinkResolver`; `buildFragmentResolver` → `createFragmentResolver`;
  `extractMenu` → `readMenu`; `extractVocabulary` → `readVocabulary`; `siteDescriptors` →
  `buildSiteDescriptors`; `newlyPublishedEntries` → `diffNewlyPublished`; `sitemapView` →
  `buildSitemapView`; `jsonLdScript` → `renderJsonLdScript`; `mediaToken` → `formatMediaToken`;
  `glyph` → `renderGlyph`; `fieldset` → `defineFieldset`; `ownerLevelRoles` →
  `resolveOwnerLevelRoles`. A site calling `buildMediaResolver` with a third `{ preset }` argument
  drops it; the rendered `src` was already ignoring it in every real deployment (the ruled shape
  above), so this is a type-level tightening, not a behavior change for any working caller.

- The conventions pass (Task 4) applies the 2026-08-30 sitting's ratified **outcome-idiom**
  convention (discriminated `outcome` results replace conflating booleans) to the rate-limit
  wrapper and the auth-store's owner-guard family; `verifyTurnstile`'s fail-closed `boolean` return
  is recorded in its own doc comment as the ruling's stated exception. `/cloudflare`:
  `checkRateLimit` and `checkRateLimitKeys` retire in favor of one export,
  `resolveRateLimit(binding, keys: string | string[])`, returning a four-arm result —
  `{ outcome: 'allowed' }`, `{ outcome: 'limited'; key }` (naming the first key over budget),
  `{ outcome: 'no-binding' }`, or `{ outcome: 'failed'; error }` (a throwing `limit()` no longer
  propagates; it is captured into this arm, with degrade-to-open on either `no-binding` or `failed`
  staying each caller's own decision, exactly as the retired functions' contract already stated).
  `createSectionAction`'s inline rate-limit reimplementation now calls `resolveRateLimit`, with its
  own `key()` try/catch and `redirect()`/`error()` rethrow guard unchanged; the three log events
  (`admin.action.rate_limited`, `admin.action.rate_limit_absent`, `admin.action.rate_limit_failed`)
  are unchanged. `/auth-store`: `deleteEditor` and `setEditorRole` both gain an `ownerRoles`
  parameter and fold the anti-lockout guard into their own atomic write, becoming the one call a
  site needs for "remove this editor" / "change this editor's role" regardless of the target's
  current role, with no more caller-side pre-fetch-and-dispatch between a guarded and an unguarded
  function; each returns a three-arm outcome distinguishing `'not-found'` from `'last-owner'`.
  `removeOwnerIfNotLast` and `demoteOwnerIfNotLast` survive as the narrower, owner-only guards,
  their `boolean` return becoming a three-arm outcome (`'ok'` / `'last-owner'` / `'not-eligible'`,
  never `'not-found'`, since their own `WHERE` matches only owner-capability rows and cannot tell
  an absent row from a present, non-owner one apart). The refusal predicate stays inside the same
  atomic statement as the write in every case; a concurrency test (two simultaneous demotes of a
  two-owner roster) asserts exactly one succeeds. **Consumers must:** replace
  `checkRateLimit(binding, key)` and `checkRateLimitKeys(binding, keys)` with
  `resolveRateLimit(binding, keys)`, branching on `result.outcome` instead of a `boolean` (a
  `true` reader becomes `result.outcome === 'allowed'`, degrade-to-open becomes
  `result.outcome === 'allowed' || result.outcome === 'no-binding' || result.outcome === 'failed'`
  read explicitly); pass `deleteEditor(db, email, ownerRoles)` and
  `setEditorRole(db, email, role, ownerRoles)` their site's owner-capability role names (an
  existing call site with no owner concern passes `[]` to keep today's unconditional-write
  behavior) and read the returned `outcome` instead of relying on a resolved `Promise<void>`;
  replace a `removeOwnerIfNotLast`/`demoteOwnerIfNotLast` boolean check with `result.outcome ===
  'ok'`.

- The conventions pass (Task 5) flattens `ContentFormFailure` and retires the five core arm
  types it used to compose, per `audit-sveltekit-contentformfailure`'s ruled shape.
  `ContentFormFailure` is now one flat interface with every field optional (`error`,
  `brokenLinks`, `body`, `inboundLinks`, `inboundKind`, `id`, `hash`, `usage`, `foundIn`), each
  documented against the action that sets it, replacing the earlier `Partial<>` intersection over
  eleven arm types. `SaveFailure`, `DeleteRefusal`, `RenameFailure`, `CreateFailure`, and
  `PreviewMintFailure` retire from `@glw907/cairn-cms/sveltekit`: every carrying action
  (`createAction`, `saveAction`, `publishAction`, `deleteAction`, `listDeleteAction`,
  `renameAction`, `previewMintAction`, `previewRevokeAction`) is re-typed to
  `ActionFailure<ContentFormFailure>` before the retire, so `check:surface`'s regenerated
  `api-surface.md` carries zero references to any of the five names (leak-free). The five media
  arms (`MediaDeleteRefusal`, `MediaUpdateFailure`, `MediaReplaceFailure`,
  `MediaAltPropagateFailure`, `MediaBulkFailure`) and `TidyFailure` are untouched. `UsageEntry`
  does NOT retire in this pass: `ContentFormFailure` itself carries `usage?: UsageEntry[]`, so it
  stays exported; the retire decision for the whole `UsageEntry` family routes to slice 4b.
  **Consumers must:** a site importing `SaveFailure`, `DeleteRefusal`, `RenameFailure`,
  `CreateFailure`, or `PreviewMintFailure` from `@glw907/cairn-cms/sveltekit` to annotate a
  specific action's `form` prop replaces it with `ContentFormFailure`, which already carried
  every one of those fields (optionally) before this change; no other consumer action is needed,
  since every field a site could have read is still present under the same key.

### Documentation

- `docs/internal/engine-rulings.md` gains a `check:rulings-format` gate: an earlier authoring pass
  truncated 54 of the ledger's `(shape: ...)` parentheticals to exactly 160 characters mid-thought,
  and the sanctioned fix moves a repaired entry's shape to its own `- **Shape:** ` line instead of a
  parenthetical folded into `Reopens on:`. This pass repairs the 14 `/sveltekit` and
  `/admin-toolkit` entries the next two remediation slices need and migrates the dozen already-complete
  parentheticals to the new line format; the remaining 40 stay truncated, tracked on
  `scripts/checks/check-rulings-format-allowlist.json`, one slug per item still owed a repair by the
  slice that executes it. Also files the `MediaInsertPopover` deferral as its own ledger entry
  (`mediainsertpopover-export`), previously only a sub-clause of `mediaherofield-export`. Internal
  only; no consumer action.

- `docs/internal/record/2026-08-30-r4-rederivation.md` re-derives the R4 closure over the merged,
  canonical-home-narrowed surface: it reconciles the ledger's bucket totals against the audit's
  rank-plus-verify tallies (535/384/57/94 exact, the two per-bucket deltas explained by pre-existing
  ledger supersessions), re-tests the 22 `C2_READDED` keeps and the three still-live closure leaks
  (`NavIcon`, `EngineScreenId`, `SlotKind`), and emits the retires pass's input: an empty
  already-consumed list, 63 retires ready for direct execution, and 31 retires blocked on
  `createCairnAdmin`'s own un-narrowed return (with the per-item blocking signature, so the retires
  pass does not attempt a deletion that breaks the R4 closure). Internal only; no consumer action.

### Fixed

- The CSRF cookie's `Secure` derivation is now monotonic: an `https` request always resolves
  Secure, whatever `PUBLIC_ORIGIN` says, and only a non-`https` request consults the local-host
  list and then `PUBLIC_ORIGIN`. A leftover `http://localhost:8788` in a deployed site's
  `PUBLIC_ORIGIN` (which `requireOrigin` tolerates) previously minted a bare, non-Secure,
  thirty-day `cairn_csrf` on a production `https` deploy, which under `SameSite=Lax` a sibling
  subdomain could then overwrite and defeat the double-submit compare. `logoutAction` also now
  passes each cookie's own `secure` flag to its `delete`, since SvelteKit's delete default emits
  `Secure` for every host but `localhost` itself and a browser discards a Secure `Set-Cookie` sent
  over `http`, which left both cookies alive on an `http` dev host such as `127.0.0.1`.
  `CookieJar.delete` accordingly accepts `secure` alongside `path`, a widening that every existing
  implementation still satisfies. The
  `platform` argument on `csrfSecure`, `issueCsrfToken`, `csrfHeaderVerdict`, and
  `validateCsrfHeader` is now required but nullable, so omitting it is a compile error rather than
  a silent fall back to a different cookie name than the writer used. Consumers must: nothing.

- A successful login now rotates the CSRF token: `confirmAction` deletes the cookie and mints a
  fresh value once the session exists, so a value fixed on the browser before sign-in cannot carry
  into the authenticated session. This is the only rotation point besides logout, and it is safe
  where a general rotation would not be: at that instant no authenticated form exists to
  invalidate, since another open tab holds at most a sign-in form the new session makes moot.
  Consumers must: nothing; expect one extra `Set-Cookie` on the confirm redirect, once per login.

- The CSRF cookie now sets `SameSite=Lax` explicitly (never by attribute omission) with a
  `Max-Age` matching the session cookie's own thirty-day lifetime, re-anchoring that `Max-Age` on
  every issue while the cookie is present rather than rotating its value, so the cookie tracks the
  session's lifetime without invalidating a second open admin tab's already-rendered form. `Secure`
  now derives from the site's configured `PUBLIC_ORIGIN` rather than the request's own protocol
  (see the monotonic rule above for the exact precedence), closing a `SameSite=Strict` cross-tab
  denial through the public login page and an unstable cookie-name-flip class. `logoutAction` now
  deletes the CSRF cookie alongside the session cookie, so a persistent double-submit token can't
  survive a sign-out. Consumers must:
  nothing. A browser holding an old `SameSite=Strict` cookie re-mints exactly once after deploy,
  as that cookie ages out.

- The admin shell's CSRF-token issue drops its `event.cookies ? issueCsrfToken(...) : ''`
  fallback: `cookies` is required on every `CairnEvent`, so the empty branch was unreachable from
  a typed caller and, from an untyped one, silently shipped a form that could never pass CSRF with
  no readable cause. The mint now runs unconditionally. Every hardened admin response
  (`applySecurityHeaders`) now also sends `Cache-Control: private, no-store`. That header is
  load-bearing, not belt-and-braces: the CSRF cookie re-anchors its `Max-Age` on every issue, so
  every admin response carries a `Set-Cookie`, and a response's cacheability must never rest on
  that incidental side effect for HTML that embeds the token and the signed-in editor's identity. Media and preview responses are untouched; the guard returns before this header is
  applied for any non-`/admin` path. Consumers must: nothing.

- The admin guard's and `adminAction`'s CSRF rejection records (`guard.rejected` with
  `reason: 'csrf'`, and `admin.action.csrf_rejected`) now carry `detail` (`no-cookie`,
  `no-witness`, `mismatch`, or `unparseable-body`) and `witness` (`header` or `field`), so a
  residual 403 in Workers Logs names which of three previously indistinguishable causes fired,
  instead of collapsing all of them into one bare `reason: 'csrf'`. The guard's own record also
  gains a presence-only `hasSession` boolean (whether a session cookie arrived, never a resolved
  identity, since this check runs before session resolution). The precedence rule that makes
  `detail`/`witness` trustworthy: a header witness that arrives at all, matching or not, decides
  outright, so a stale `X-Cairn-CSRF` header on a raw-body upload/media/dictionary/tidy POST now
  reads `mismatch`/`witness: header` rather than misreporting as the field path's `no-witness`.
  None of the new fields, nor any existing one, ever carries token material, a prefix, or a
  length, and the HTTP response stays the single generic `auth.csrf-token-invalid` condition.
  Consumers must: nothing; see `docs/reference/log-events.md` for the field vocabulary if you
  query these events.

- An unchecked `.checkbox`/`.radio` in the packaged admin sheet raises its edge from daisyUI's
  stock 20% `--color-base-content` mix (measured 1.492:1 light / 1.773:1 dark against `base-100`,
  under the WCAG 1.4.11 3:1 non-text floor) to the same 55% mix already locked for the scrollbar
  thumb and the outline chip border (3.586:1 light / 4.959:1 dark). `.toggle` needed no change; its
  own construction already clears the floor unaided. Consumers must: nothing.

- An unfocused `.input`/`.select`/`.textarea` in the packaged admin sheet gets the same edge raise,
  from the identical 20% fallback (measured 1.492:1 light / 1.773:1 dark) to the same 55% mix
  (3.586:1 light / 4.959:1 dark), since the field family resolves its unfocused border through the
  same `--input-color` construction as `.checkbox`/`.radio`. `.toolkit-toolbar-select` is
  deliberately excluded from this rule, since its edge harmonizes with the surrounding menu facet's
  own chrome and stays a tracked exception (`ROADMAP.md`, "Next"). Consumers must: nothing.

- `cairn-audit`'s `sheet` config key now accepts a list of compiled-class sources, the same
  additive shape `static.paletteFiles` and `static.cssFiles` already carry, so `no-uncompiled-class`
  resolves a markup class against a site's own compiled stylesheet as well as the packaged one
  instead of reporting a false positive for it. A string `sheet` still works unchanged as a
  one-element list; a listed source that does not exist is a config error, never a silent skip.
  Consumers must: nothing.

- The conventions pass (Task 6) closes the session cookie's own deferred `secure` derivation
  (`session-cookie-derivation-out-of-csrf-slice`): `guard.ts`'s two session-cookie reads and
  `auth-routes.ts`'s `confirmAction`/`logoutAction` now derive `secure` through `csrfSecure({ url,
  platform })`, the exact call the CSRF cookie pair already used, instead of the bare
  `event.url.protocol` check. An `https` request always resolves Secure either way; a configured
  `PUBLIC_ORIGIN` can only raise a non-`https` request's answer, never lower it. On a guarded
  `/admin` path this is a coherence change, not a security fix: the guard already refuses an
  `http`, non-local admin request before any route runs, so the one row the two derivations used
  to disagree on was unreachable there. Belt-and-braces (security round N1): `logoutAction` now
  deletes BOTH cookie-name forms for both cookies (`cairn_session`/`__Host-cairn_session`,
  `cairn_csrf`/`__Host-cairn_csrf`), each with its own matching `secure`, so a `PUBLIC_ORIGIN`
  change between login and logout cannot strand a browser cookie under the name the current
  derivation no longer produces. One residual: an auth route a site mounts OUTSIDE `/admin` over
  `http` on a non-local host still mints a discarded `__Host-` cookie; `security-model.md`'s
  mount-under-`/admin` instruction is the guard against it. Consumers must: nothing for a site
  following the documented single mount under `/admin/**`.

- `cairn-doctor`'s live probe (`--probe`) keeps deriving its expected CSRF cookie name from the
  PROBED origin's own scheme, deliberately: it is a cross-check on what a deployed runtime
  actually presents, immune to a `--url` override diverging from the wrangler config's own
  `PUBLIC_ORIGIN`. The probe now calls `csrfSecure({ url: origin, platform: undefined })`
  directly, `csrfSecure`'s own body, instead of a hand-duplicated `origin.protocol === 'https:'`
  copy, provably the same answer on every branch since feeding no `platform` means the CSRF
  side's own `PUBLIC_ORIGIN` consultation never fires. Consumers must: nothing.

## 0.96.0

<!-- release-size: minor -->

### Added

- A new admin page, `docs/admin/what-to-run-and-when.md`, names today's target for the parts of a
  cairn site's stack an admin can act on directly (cairn itself, Node on your machine, your
  Cloudflare hosting tooling, the GitHub App key) and how to tell your site is still on target; it
  links `docs/reference/supported-toolchain.md` for the exact versions a developer needs. That
  reference page carries the exact-version target-stack table, and a new `check:target-stack` gate
  derives every expected cell from its real source (the root `package.json`'s own version,
  engines, and peer ranges; the showcase's `package.json` and `wrangler.jsonc`, the source the
  public template is emitted from) and fails when the table drifts from it. Consumers must:
  nothing.

- An advisory `check-tsgo` CI job, in its own `.github/workflows/tsgo.yml` and run weekly
  (`schedule`, Monday 16:00 UTC) plus `workflow_dispatch` rather than on every push, installs the
  side-by-side `typescript@^6` plus `@typescript/native@npm:typescript@7` layout `svelte-check`'s
  own README documents and runs `svelte-check --tsgo` against it. A red result on a scheduled run
  blocks nothing else, since it never gates a PR. A green run is the trigger the TypeScript 7 hold
  is defined by (ROADMAP.md, "TypeScript 7 is held on the toolchain"). Consumers must: nothing.

- `VariantSpec.fit` (`/media`) accepts Cloudflare Images' `aspect-crop`, `scale-up`, and
  `squeeze` fit modes, and a new `VariantSpec.upscale` option (`interpolate` or `generate`)
  picks the algorithm a fit mode that upscales uses, both from Cloudflare's 2026-06-16
  optimization GA. `upscale` joins the `/cdn-cgi/image` option string only when set.
  `VariantSpec.gravity` also accepts the `entropy` keyword, carried in
  `@cloudflare/workers-types` 5's `BasicImageTransformations` union.
  `normalizeAssets` validates the three new fit values, `upscale`, and `entropy` the same way it
  already validates `fit` and `gravity`. Consumers must: nothing; additive.

### Changed

- Tidy's default model is now `claude-sonnet-5`, run at the low effort tier since a proofread
  doesn't need extended reasoning. A site that set `tidy.model` explicitly keeps its own model
  and now sends `effort: 'low'` too, when that model supports effort tiers.

- cairn's own Node floor rose to `>=24` (from `>=22`), in the engine package, the
  `create-cairn-site` CLI, and the `cairn-cms-dev` dev backend. Every CI `node-version: 22` moved
  to 24, and the two stale "pin to 22 to dodge a vitest-pool-workers console bug on 24" comments
  are gone: a full green suite on Node 24 in this pass no longer reproduces it.
  Consumers must: run Node 24 or later; the scaffolder's preflight refuses Node 22.

- The published peer ranges rose to `@sveltejs/kit ^2.70` and `svelte ^5.56.10`, the versions
  cairn now develops and tests against. Consumers must: be on those ranges before installing;
  npm's default peer resolution refuses the install otherwise.

- Dependencies moved to their current releases: DaisyUI 5.7.20, Tailwind 4.3.3, SvelteKit
  2.70.3, Svelte 5.56.10, Vite 8.2.2, Wrangler 4.125.0, ESLint 10, and
  `@cloudflare/vitest-pool-workers` 0.22. The `@anthropic-ai/sdk` devDependency moved to 0.120,
  and its optional peer range widened to `>=0.105.0 <1` so a site pinned to either the old or the
  new SDK line satisfies it. TypeScript 7 is held; `svelte-check` cannot run on the Go compiler
  until 7.1's compiler API. Consumers must: nothing.

- DaisyUI 5.7 changed what the shipped admin sheet contains. It now emits a component's modifier
  classes alongside the base class the admin tree uses, so the sheet carries 31 more DaisyUI
  names than before (the `tabs-*`, `modal-*`, `dropdown-*`, `drawer-*`, `footer-*`, `stats-*`,
  `steps-*`, `divider-*` placements, `avatar-group`, and `aura`); they are stock DaisyUI,
  additive, and scoped the same way as the rest of the sheet. It also stopped emitting
  `footer-center` as a side effect of a neighbor, so the input sheet now safelists it explicitly
  and it stays in the sheet. Light-theme `.btn-active` follows upstream's new stock border (a 7%
  mix toward black where a plain `.btn` mixes 5%, about 0.02 oklch lightness); the dark-theme
  hairline, fill, and hover repairs are unchanged. Consumers must: nothing.

- `@cloudflare/workers-types` 5 and `vitest-browser-svelte` 3 changed two internal call shapes.
  `@cloudflare/workers-types` moved to 5 (Wrangler 4.125 peers on it), whose new global
  `Buffer: any` shadows `Buffer.toString(encoding)` wherever `@types/node` shares the program;
  the two build-script sites that called it now use `TextDecoder`. `vitest-browser-svelte` moved
  to 3 as well, whose `render`/`unmount` calls are now async; every call site in the component
  suite now awaits them. Consumers must: nothing.

- The template and showcase `wrangler.jsonc` moved `compatibility_date` to `2026-08-21` and
  dropped the `nodejs_compat` compatibility flag. Cloudflare defaults `nodejs_compat` (and
  `nodejs_compat_v2`) on for any compatibility date from 2026-08-04 onward
  ([compatibility flags](https://developers.cloudflare.com/workers/configuration/compatibility-flags/)),
  so the explicit flag was already redundant on the new date; the `vitest-pool-workers` test harness
  (`wrangler.test.jsonc`) moved the same way. This changes only the date and flags a newly
  scaffolded site starts with. Consumers must: nothing; an existing site keeps its own date and
  flags.

- Internal CI housekeeping: `actions/checkout` and `actions/setup-node` moved from v5 to v7 across
  every workflow (checked both majors' release notes; neither changes a behavior these workflows
  rely on), and `cache: npm` was added to every `actions/setup-node` step that lacked it. Consumers
  must: nothing.

- `npm run link:consumer -- <site-dir>` points a consumer site at a local engine build, and
  `--restore` puts it back on a registry range. It builds, packs, installs, and then verifies every
  file in the consumer's installed copy against the tarball it just built. It exists because the
  hand loop walks into a trap that survives a green install. `npm pack` derives the tarball name
  from the version, so re-packing changed code at one version reuses the filename, and a later plain
  `npm install` restores the older build from npm's content-addressed cache. Reproduced 2026-08-20:
  a tarball built with a change removed still installed the changed build, with npm reporting "up to
  date". Each pack is now named with a hash of its own contents, so a filename cannot outlive its
  bytes, and the file-by-file comparison fails loud rather than trusting npm's exit code. Pruning
  old packs matches the digest suffix rather than the package stem, so it can only delete tarballs
  this script wrote: a hand-packed one carries no digest and is never swept, which matters because
  a sibling repo pins an exact tarball by absolute path, and a prune that took it would break that
  repo's install with no signal here. The stem alone would also be unsafe, since
  `glw907-cairn-cms-` is a prefix of `glw907-cairn-cms-dev-`. Internal development tooling; it ships
  in no tarball. Consumers must: nothing.

- The Waymark deploy template moved into this repository at `templates/waymark/`, and the
  cross-repo sync that maintained a separate `glw907/cairn-waymark-template` is deleted. Cloudflare's
  deploy-buttons documentation allows a button URL to name a subdirectory, and their own template
  gallery is a monorepo, so the second repository was never load-bearing; C3's `--template` accepts
  the same `owner/repo/subdir` shape. The tree is still generated wholesale from `examples/showcase`
  by the bake plus the repo-only overlay, now through
  `packages/create-cairn-site/scripts/emit-template-dir.mjs` (`npm run emit:template`), and
  `npm run check:template` fails when the committed tree and a fresh bake disagree. That gate
  replaces the weekly cross-repo drift cron: it needs no push credential and fails on the change that
  caused the drift rather than the following Monday. Deleted with the sync: `sync-template.yml`,
  `publish.yml`'s `sync-template-repo` job and its release-ordering race, and
  `sync-template-repo.mjs` with its test. The template deliberately sits outside the root
  `package.json`'s `packages/*` workspace glob, because Cloudflare treats the subdirectory as the
  root of the repository it creates and requires the application be fully isolated within it, which a
  workspace member (hoisted to the root lockfile) would not be. One consequence rides every future
  cut: the emitted `package.json` names the engine version, so a version bump drifts the tree and
  `check:template` goes red until `npm run emit:template` runs and the result is committed. That is
  the gate doing its job rather than a defect, and it is deliberately a failing check rather than a
  line in a checklist, so it cannot be forgotten. One cosmetic artifact stays: `svelte-check` scans
  every subdirectory for a `svelte.config.js` and has no way to skip one, so it prints a
  module-resolution block for the committed template, which has no `node_modules` of its own. The
  run still reports 0 errors. Adding `@sveltejs/adapter-cloudflare` to the root devDependencies
  silences it and is the wrong fix, because that adapter's ambient `App.Platform` augmentation
  collides with cairn's own and breaks `check:snippets`; `test.yml` carries the note. Consumers must: nothing; none of this ships in the
  engine tarball.

- The exported `TidyClient` type (`/sveltekit`) gained an optional `output_config` field on its
  `messages.create` options, matching the effort-tier option Tidy's own call already sends.
  Consumers must: nothing, unless a hand-rolled `TidyClient` fake rejects unknown body fields.

- `@glw907/cairn-cms-dev`'s `createChannelDb` no longer carries a runtime Node.js floor guard, and
  the `checkNodeSqliteFloor` helper that ran it is gone. npm warns on an `engines` mismatch
  (`create-cairn-site`'s own preflight is what refuses outright, elsewhere in this family), and
  `node:sqlite` has been unflagged since Node.js 22.13, well below the `>=24` floor, so the guard
  checked a condition that could not occur. `checkNodeSqliteFloor` was an internal change, not a
  public-API removal: the package's exports map has only ever exposed `.`, and `index.ts` never
  re-exported it, so no supported import path could reach it. Consumers must: nothing; this
  package ships in no tarball a site installs for production.

- `@cloudflare/workers-types` is now a `peerDependency` at `^5`, alongside its existing
  `devDependency`. cairn's own shipped `.d.ts` files import named types (`D1Database`, `R2Bucket`,
  `RateLimit`, and others) directly from this package, so a consumer generating its own binding
  types with `wrangler types`, the now-recommended replacement for installing
  `@cloudflare/workers-types` directly, still needs the package installed or every cairn-typed
  binding signature silently degrades to an unresolvable-import `any` under `skipLibCheck: true`
  (a common default), with no red `TS2307` to flag the gap. Consumers must: install
  `@cloudflare/workers-types@^5` as a devDependency (a site on `wrangler types` still needs it,
  since cairn's declarations import from it); npm's default peer resolution refuses the install
  otherwise.

### Fixed

- The `/sveltekit` barrel's `previewLoad` statically imported `building` from `$app/environment`
  at module scope, so importing any single barrel export, `createD1AuditSink` for a Cloudflare
  Cron handler bundled outside Vite, pulled in that whole import graph. A consumer bundling that
  file with a plain, non-Vite esbuild pass (Wrangler's own, at `wrangler dev`/`wrangler deploy`
  time) failed to resolve `$app/environment`, a virtual module only Vite's SvelteKit plugin knows
  how to resolve; every package-level gate (`npm run check`, `npm test`, `npm run build`) stayed
  green throughout, since none of them invoke Wrangler's own bundler. A first fix moved the read to
  a dynamic `await import('$app/environment')` at call time, but esbuild resolves a bare, uncaught
  dynamic `import()` literal the same way it resolves a static import at bundle time, so the same
  build still failed. `previewLoad` now wraps that import in `try`/`catch`, esbuild's own documented
  escape hatch for downgrading an unresolvable specifier from a bundle-time error to a runtime
  concern, and falls back to `building = false` when the import rejects (a `/preview/[token]` route
  is never prerendered, so that is the correct value outside a real SvelteKit build). The unit test
  now reproduces the real consumer failure mode directly, running esbuild's own bundler over the
  built `/sveltekit` barrel and asserting it succeeds, rather than walking the static import syntax
  (which a dynamic import can route around). Consumers must: nothing; a site that added a wrangler
  alias for `$app/environment` as a workaround can remove it, because the barrel's only `$app`
  import is now a guarded dynamic import that esbuild leaves unresolved at bundle time and the
  Worker's own try/catch absorbs at runtime.

- `previewLoad` (`/sveltekit`) returned `seo` with `canonical`, `og:url`, and `jsonLd.url` still
  pointing at the entry's eventual public permalink, so a preview render could self-canonicalize
  onto a URL that was not yet live, or let a crawler or unfurler that ignores `noindex`
  consolidate a shared draft onto it. `previewLoad` now strips those three fields before
  returning. Consumers must: nothing; a site that already stripped those fields itself can drop
  its own strip.

- `PreviewBanner` (`/components`) formatted the preview expiry with
  `new Intl.DateTimeFormat(undefined, ...)` inside a `$derived`, so a Worker's runtime locale or
  timezone differing from the visitor's browser could render two different strings during SSR and
  hydration and produce a hydration mismatch. It now renders a fixed, locale-independent
  `YYYY-MM-DD HH:MM UTC` string inside a `<time datetime>` element by default, and accepts an
  optional `formatExpiry?: (iso: string) => string` prop so a site can supply its own stable
  formatter. Consumers must: nothing.

## 0.95.0

<!-- release-size: minor -->

### Added

- A reproduction seam, so a documentation page can show a real admin screen instead of describing
  one. `@glw907/cairn-cms/reproductions` carries a story registry and the `ReproContext` wrapper
  that mounts any of them with fixture data; `@glw907/cairn-cms/reproductions/manifest` is its
  node-safe half, plain data a bare `node` process can read, which is what lets a documentation
  build validate a reference to a story without loading Svelte. A story names the smallest
  component containing what it shows, so framing comes from picking the component rather than from
  cropping a picture, and nothing is captured, so a reproduction cannot fall behind the code it
  reproduces. All twenty-five planned stories ship here. A mounted story is contained from first
  paint, so an embedded reproduction cannot be driven as if it were a live admin screen:
  `ReproContext` renders what it mounts inside an inert wrapper, marks a modal dialog inert as the
  story opens it, and stops window-level keyboard, pointer, drag, and unload events before any
  handler sees them. None of that waits on a pose, which a consumer runs, and a pose receives the
  mounted component's own exports alongside the mount root, so a story can reach a state the admin
  itself reaches by calling a method rather than by clicking: the editor's insert panel is mounted
  headless and opened from the toolbar, and the reproduction now does the same instead of rendering
  a trigger button that screen has not got. A declared height is a hard crop rather than a hint, so
  a story carrying numbered callouts is held to its own box by a gate that mounts it at the width
  its embed renders at and fails when a chip falls outside; `tags/screen` shipped a height that cut
  two of its five callouts off a page whose prose list still numbered them. Two things stay with the
  site, because no code inside the frame can do them: a screen reader reaches none of an inert
  subtree, so the alt text a page authors is the whole accessible content of the embed, and a frame
  that loads and focuses a control takes the focus a reader had, in every engine and under every
  host-side `iframe` attribute, so the embedding page records `document.activeElement` before the
  frame loads and restores it after. Mount `ReproContext` only in a document dedicated to one
  reproduction: its event containment covers that whole document, not just what it renders.
  `validateReproFence`, exported from the
  manifest subpath, checks a `repro` fence's raw YAML body against the installed manifest, so this
  engine's own `check:visuals` gate and a consuming site's build-time fence validation run the same
  rule set and cannot drift apart; `check:visuals` now scans every `repro` fence in the corpus
  alongside its existing mermaid-diagram and image checks. The full surface, both subpaths and the
  fence schema, is documented at `docs/reference/reproductions.md`. No page embeds a `repro` fence
  yet: this engine exports the machinery, and a consuming docs build is where a fence resolves to a
  rendered figure. Consumers must: nothing.

- `CairnAdminShell` takes an optional `themeOverride`, and `EditPage` an optional
  `spellcheckOverride`, so a context that mounts either outside a real admin route owns what it
  renders. With `themeOverride` set the shell reads neither the admin theme cookie nor the OS
  color-scheme preference, and it renders no theme toggle at all, in the top bar or in `EditPage`'s
  own folded overflow control, rather than a control it can no longer honor;
  `spellcheckOverride` starts the editor with spellcheck off and hides the same, which also stops
  each mount constructing a spellcheck worker and fetching a dictionary. Absent, both behave exactly
  as before. Consumers must: nothing.

- Admin media surfaces resolve their delivery base from a Svelte context key rather than a
  hardcoded `/media`, falling back to `/media` when nothing provides one. This is the mechanism a
  later fix will use to close a real defect: a site with a non-default `assets.publicBase` has
  broken admin thumbnails today. Consumers must: nothing.

- The admin track quotes real recorded terminal output where it used to paraphrase it. A live
  `create-cairn-site` run against a scratch site on workers.dev, plus two `cairn-doctor` reports
  against the deployed result, are committed verbatim as fixtures under
  `packages/create-cairn-site/test/fixtures/transcripts/`. Their README records what a transcript
  means: the tool commit, the bake command and both published specs, the per-invocation
  environment, the secret sweep, and the captures no page quotes.
  `docs/admin/create-your-site.md` gained three blocks, the cost preamble, the GitHub App consent
  prompt, and the deploy summary carrying the printed live address, the last replacing the
  paraphrase that stood in for it. `docs/admin/is-it-working.md` gained one, a credentialed doctor
  report carrying pass, fail, and skip lines together, which does work the prose could not: eight
  of its lines read SKIP, printed no differently from the passes beside them, and that is the trap
  the surrounding section exists to defuse. Two rules govern the fixtures. No invented output,
  ever: a transcript is real stdout or it does not ship. And a fixture is never edited: the gate
  normalizes, the run re-captures. Consumers must: nothing.

- A new `check:transcripts` gate enforces both rules mechanically. Pass D's exit criteria named
  this gate and it was never built; it lands here with the first blocks for it to check. Every
  quoted block carries an HTML comment naming the fixture it came from, and the gate compares the
  two through one tested renderer that replays the pty control stream into its final frame, so a
  clack prompt's per-keystroke redraws collapse to the line a reader saw rather than
  concatenating. Eight failure modes each carry a tagged kind and a unit case: a block that does
  not match its fixture or appears out of order, a missing fixture, a marker with no fence, two
  markers on one fence, a path escaping the fixtures directory, a fence tagged as a shell
  language, a page below its declared block floor, and a fixture that no page quotes and the
  README does not declare unconsumed. It runs in CI beside `check:visuals`. Consumers must:
  nothing.

### Fixed

- The admin's own media surfaces now render correct thumbnails on a site with a non-default
  `assets.publicBase`. The media-base context seam landed unwired: every reader (`MediaPicker`,
  `CairnMediaLibrary`, `MediaHeroField`, the editor's inline media chips) already honored an
  injected base, but no admin mount ever provided one, so every thumbnail composed against the
  hardcoded `/media` default regardless of the site's own resolved config. `AdminShellData`'s authed
  payload now carries the resolved `mediaBase`, `shellLoad` populates it from
  `runtime.resolvedAssets.publicBase`, and `CairnAdminShell` hands it down through the existing
  context key. Consumers must: nothing to keep running; every site reaches `shellLoad` through
  `admin.shellLoad`, never by hand-assembling the shell payload, so the fix applies on upgrade with
  no site-side change. `mediaBase` is a required field on the authed `AdminShellData`, so a site
  that constructs that shape itself, a test double or a custom shell payload, gets a compile error
  until it supplies one.

- The editor's own chrome no longer keeps the theme it was born with. CodeMirror bakes its dark flag
  into a theme extension at construction, so toggling the admin theme with an editor open left its
  autocomplete tooltip, panels, and selection layer at first-mount polarity: a light editor inside a
  dark admin. The base theme now lives in a compartment that follows a later theme change. This is a
  behavior change for existing sites, and it needs no action from anyone; it is recorded because an
  upgrader who notices the editor finally matching the shell deserves a reference for why.

- The scaffolding tool's cost preamble no longer states a total the research behind it declined to
  state. `create-cairn-site` opened with "All in, a small site on its own domain runs about $6 a
  month", while the T4b cost research had left one line item open, whether the certificate a Workers
  custom domain issues is billed as an add-on, and had said of that exact figure that it would not
  put an inference in owner-facing money copy. The preamble now adds up only the two figures it
  knows, names the certificate question as unconfirmed, and points an owner at their first bill.
  `docs/admin/before-you-start.md` carries the same hedge, and `docs/admin/create-your-site.md`
  stops quoting the superseded total from its recorded run. Consumers must: nothing.

- `docs/admin/is-it-working.md` told a reader that every failing check names a condition id and to
  find that id on the page. The doctor never prints one: its report names each check by title, as
  both recorded reports confirm by carrying no id at all, so the instruction the whole 21-section
  lookup surface turns on could not be followed. The page now states the real mapping and its jump
  list leads each entry with the report titles it covers, so a reader scans for the words in front
  of them. Two claims of the same shape went with it: a skip is now described as credential or
  nothing-to-read without ranking them (one of the eight skips in the recorded report is the
  credential kind), and the page no longer implies a Cloudflare token makes the sign-in-database
  checks run, which it does not on a scaffolded site. The blocks are what made all three findable,
  since each was merely unverifiable until real output sat above it. Consumers must: nothing.

- `docs/reference/doctor.md` claimed the `config.csrf-disable` check skips on every current
  scaffold. It skips on a bare `sv create` scaffold, which writes no `svelte.config.js`, and the
  recorded report shows it passing on a `create-cairn-site` site, which bakes its template from
  `examples/showcase` and so always carries that file. The prose and the check table now hold the
  distinction. Consumers must: nothing.

- `EditPage` no longer throws on a prerendered route. It read the post-save redirect flags
  (`?drafts=`, `?refs=`) off `page.url.searchParams` unconditionally, and SvelteKit refuses that
  read on a page with prerendering enabled, since a prerendered page cannot depend on a query
  string. Any prerendered route mounting `EditPage`, including the reproduction seam's own
  `/repro/<story>` pages, 500'd with no HTML. Both reads now guard on `building`, so a
  prerendered mount renders with the warning strips absent and a real server-rendered request
  still gets the search-string-derived flash unchanged. Consumers must: nothing.

- The editor toolbar's Edit block control now names its reason to a mouse user, the way the
  Figure control beside it already does. The unavailable state rode `btn-disabled`, which sets
  `pointer-events: none`, so the `title` naming why the control was off never reached a mouse
  (only a keyboard user tabbing to it could read it). The control now dims through
  `cairn-btn-guarded` and `cursor-not-allowed`, the same guarded pattern as Figure, and keeps its
  tooltip reachable at every pointer. Consumers must: nothing.

- A delete refusal no longer names the concept in the plural where the sentence wants the singular.
  The showcase's Posts concept read "This posts could not be deleted."; both the concept list's
  banner and the editor's own copy of the same refusal interpolated `label`, the concept's plural
  noun, into a singular sentence. `EditData` gains a `singular` field (mirroring `ListData.singular`,
  populated the same way from the descriptor's own default to `label`), and four call sites
  across `ConceptList` and `EditPage` now read the singular. That count missed the confirm dialog
  every one of those four Delete controls opens: `DeleteDialog` still took the plural `label` and
  lowercased it itself, so "Delete this posts?" and "Delete this posts" stood in the dialog's own
  title and confirm button, and the inbound-linker count doubled the mistake, pluralizing an
  already-plural noun ("2 postss link here") whenever more than one entry linked in. `DeleteDialog`
  now takes `singular` directly instead of deriving a noun from `label`, and the inbound-linker
  count names an anonymous "entry"/"entries" instead of the deleted entry's own noun, since a
  linker or includer can belong to a wholly different concept than the one being deleted.
  `RenameDialog` carried the identical defect, the same `label.toLowerCase()` self-derivation in
  its title ("Change this posts URL") and its non-routable "Entries that include this posts"
  copy, missed by the same count; it now takes `singular` too. Consumers
  must: nothing to keep running; `EditPage` reaches `EditData` through `editLoad` and `ConceptList`
  reaches `ListData` (which already carried `singular`) through `listLoad`, whether wrapped by
  `createCairnAdmin` or called directly through the advanced `createContentRoutes` seam, never by
  hand-assembling either payload, so the fix applies on upgrade with no site-side change. Two
  breaks land at the type level: `EditData.singular` is a required field, so a hand-built payload (a
  test double, a custom edit route) needs one; and `DeleteDialog`'s and `RenameDialog`'s `label`
  prop is renamed to `singular` on each, so a site that mounts either directly, the way
  `ConceptList` and `EditPage` both do, renames the prop it passes (the value itself is unchanged,
  since the doc always asked for the singular, e.g. "Post").

- `SiteConfig`'s doc comment and its type both claimed an openness the parser refuses.
  `parseSiteConfig` has always thrown on a top-level `site.config.yaml` key outside its known set
  (naming the key's correct home in `cairn.config.ts` when one exists), but the doc comment said
  unknown keys are ignored, and the type carried a matching `[key: string]: unknown` index
  signature. Both now state the strict, throwing behavior; the runtime behavior is unchanged.
  Consumers must: nothing for code that reads `SiteConfig` by its declared fields, the supported
  way. A site whose own TypeScript indexed a parsed `SiteConfig` with a dynamic key, or passed one
  where a `Record<string, unknown>` was expected, gets a compile error and should read the field by
  name or narrow explicitly; the parser was already refusing that same unknown key at runtime.

- `docs/admin/create-your-site.md` claimed the Worker `create-cairn-site` deploys runs entirely on
  Cloudflare's free plan. It does not: a default site's built bundle already runs over Cloudflare's
  3 MiB (3,145,728-byte) Workers Free script limit (measured 2026-08-19: 3,246,163 bytes gzipped,
  about 100 KB over), so the Worker itself needs Workers Paid, $5 a month, independent of the
  sign-in-email boundary `docs/admin/before-you-start.md` already documents. The page now says so
  plainly, and `docs/admin/own-your-domain.md`'s domain-connection cost, which is genuinely free
  regardless of the Worker's own plan, now points a reader at that fact instead of standing alone
  and inviting the wrong generalization. The e2e workflow's bundle-size step gains a matching
  free-tier threshold that warns (never fails) whenever the gzipped bundle crosses that same 3 MiB
  line, so the overage stays visible in every CI run instead of only in a doc someone might not
  reread. That first fix left the same false premise standing in three places it also governs: the
  `create-cairn-site` CLI's own printed cost preamble (`packages/create-cairn-site/src/money.mjs`)
  said "Building and running this site is free, and stays free," quoted verbatim in its recorded
  transcript fixture and in `docs/admin/create-your-site.md`'s transcript block; and
  `docs/admin/before-you-start.md`'s "What it costs" and "The free-until boundary" sections built
  their whole story on a second person's sign-in being the first bill. All three now state the
  $5-a-month Workers Paid plan as a plain baseline fact from the first deploy, the same way a
  domain is: what running a cairn site on Cloudflare's own network costs, not an exception the
  bundle's own size explains away (that measurement stays where a developer, not a site owner,
  reads it: the e2e workflow comment above and this entry). The "the free-until boundary" section,
  no longer honestly named since nothing is deferred, is renamed "What a second editor needs" and
  reshaped into what it actually is, a capability story: a second person needs a domain connected
  and sign-in email turned on, both already covered elsewhere on the page, not a new bill. Every
  inbound link across the docs tree is repointed at the new anchor and text. Consumers must: know
  that a default cairn site runs on Cloudflare's Workers Paid plan ($5/month) from its first
  deploy, not only once a second person needs to sign in.

- A scaffolded site's very first build no longer prints a branded 400 for its own `/admin` link.
  The public footer, header, and styleguide page all link `/admin`, SvelteKit's prerender crawler
  followed every one of them, and the admin guard answered each with a `guard.rejected` (`reason:
  'https'`) the crawler logged as `400 /admin` under the template's `handleHttpError: 'warn'`
  policy, with no doc explaining it. Each anchor now renders `rel="external"`, the one attribute
  SvelteKit's crawler honors to skip queuing a link, decided by one shared `isAdminHref` predicate
  (`examples/showcase/src/theme/components/admin-link.ts`) `SiteHeader` and `SiteFooter` both read,
  rather than a hand-set per-entry flag and a separate exact-string comparison modeling the same
  exclusion two different ways; the link itself is unchanged and still clickable for a reader.
  `handleHttpError` itself is no longer a blanket `'warn'`, which is exactly what let the original
  `400 /admin` sit unnoticed alongside anything else that might go wrong during a build-time crawl:
  it now throws on every prerender HTTP error the crawl encounters, with no exception, so a link
  into `/admin` that reappears without `rel="external"` (or any other route that legitimately
  4xx/5xxs mid-crawl) fails the build red instead of printing a warning nobody reads. Consumers
  must: know this fixes only a newly scaffolded site, since `SiteFooter.svelte`, `SiteHeader.svelte`,
  `admin-link.ts`, and `site.config.yaml` are copy-in template files a site owns after scaffolding,
  not imports from the package. A site that already sees `400 /admin` in its own build output can
  add `rel="external"` to its footer and header `/admin` anchors (and to any other `/admin` link it
  has added) the same way, and should confirm its own `svelte.config.js` no longer downgrades
  `handleHttpError` to `'warn'` across the board, since SvelteKit's own default (`'fail'`) is what
  catches a link like this reappearing.

## 0.95.0-rc.1

<!-- release-size: minor -->

### Added

- A new `create-cairn-site` package (`packages/create-cairn-site`, published separately from the
  engine) carries the local half of the scaffolding tool: argument parsing, an action runner that
  makes `--dry-run` a property of the frame rather than a per-feature flag, an out-of-scaffold
  state store at `~/.config/cairn/sites/<id>.json` (mode `0600`, so no tool state or secret ever
  lands under a project directory), credential-free pre-flight checks (Node floor, loopback
  bindability, proxy detection, a Windows execution-policy note), a pack-time bake of the Waymark
  template through the existing emitter, and a fail-loud substitution pass that personalizes the
  site name, description, and brand color. The description is written under `site.config.yaml`'s
  own `description` key rather than an invented `tagline` key, since the engine validates its
  top-level keys and rejects an unrecognized one. The brand substitution rotates the hue of all
  four `--color-primary` declarations and holds each one's lightness and chroma, following the
  theme file's own re-skin recipe, so a scaffolded site keeps the contrast both its light and dark
  blocks were tuned for. The command is wired end to end: pre-flight, prompts, a copy of the baked
  template, the package rename, the substitution pass, and a state save, all through the action
  runner, so `--dry-run` describes the whole run and performs none of it. It refuses before writing
  anything when the target directory exists and holds files, or when the template was never baked,
  and every exit path prints a next step. A new `create-site.yml` workflow packs the CLI, installs
  that tarball into a scratch directory, runs the command, and then installs, typechecks, and builds
  the site it produced. Consumers must: nothing. The engine's own `files` array, exports, and
  tarball are untouched, and this package ships separately.

  The printed hand-over block is the output of a recorded setup walk rather than a guess. That
  walk found a bare `npm run dev` never reached the admin, because the scaffolded `dev` script was
  bare `vite dev` and the dev backend needed `CAIRN_DEV_BACKEND=1` at runtime on top of its
  build-time define. A later fix in this same entry, below, closes that gap at its source. The
  block also says, in the walk's own terms, that the local admin is a stand-in that touches no
  GitHub repository and sends no real email, and it names what going live will cost, including the
  Workers Paid plan that arbitrary-recipient sign-in email requires. A test locks the switch into
  the copy.

  The bake refuses to run while `@glw907/cairn-cms-dev` is unpublished, naming the package and
  the fix, rather than emit a template whose devDependency reads `^0.0.0`. A scaffolded site needs
  the dev backend to build at all, so publishing it is a prerequisite for shipping the tool.

  The scaffold now leads into a GitHub chapter. It is manifest-first: each site's admin gets their
  own GitHub App, created through GitHub's manifest flow, so there is no shared or standing OAuth
  client and nothing to register ahead of time. The whole flow takes two browser trips. The
  manifest page creates the App, and the install page, visited once more, both installs it and
  authorizes it via `request_oauth_on_install`. The chapter creates a private repository, links it
  to the App's installation, and pushes the scaffold as one commit on top of GitHub's own
  `auto_init` seed. No `git` binary is used; every call goes through the REST and Git Data APIs
  behind one fetch wrapper, and the suite exercises the whole flow against a fake GitHub server.
  Every hop's result, the App's credentials, the installation, the repository, is saved to the
  site's local state record as soon as it lands, so a later `create-cairn-site --dir <the same
  dir>` resumes from the next unfinished hop instead of repeating it, and `--start-over` sets a
  previous run's record aside and starts the chapter over. An organization that requires an
  owner's approval before installing a new App parks the run instead of failing it: the tool saves
  its progress and exits cleanly, and the next run picks up where it left off once an owner
  approves. The scaffold's target-directory claim is now atomic, using an exclusive `wx` write, so
  two concurrent runs against the same directory fail loudly instead of racing, and a run
  interrupted mid-scaffold leaves a directory the next run recognizes and recovers instead of
  treating as a stray non-empty directory. `npm run dev` now reaches the scaffolded site's local
  admin with no environment variable, because the scaffold's own `dev` script sets the dev
  backend's runtime flag itself. Consumers must: nothing (the tool is unpublished; no engine
  surface changed).

  A Cloudflare chapter now follows the GitHub one and takes the site the rest of the way to live.
  It installs the site's dependencies, signs wrangler in, builds, and deploys to the admin's free
  `workers.dev` hostname, creating one Worker, two D1 databases, and one R2 bucket on their own
  account; the free plan covers all of it and the tool asks for no payment method. The chapter
  holds no Cloudflare credential of its own, riding wrangler's own session, which a spike against
  the real API confirmed reaches every call chapter one makes. The scaffold's `wrangler.jsonc` is
  named after the site and ships **without** `database_id`s, because a deploy provisions an id-less
  binding by name and binds it by name on every later deploy, so nothing has to be written back
  into the file and a re-run that meets existing resources reuses them. Both databases are migrated
  by binding name after the first deploy, and a second deploy follows so the running site carries
  its own real origin. The GitHub App's private key then moves from the local state record into a
  Worker secret and is deleted locally, but only once Cloudflare confirms the upload, so a failed
  upload leaves the only recoverable copy where it was; after that hop the key lives in exactly one
  place. Finally the tool seeds the owner's row and one ten-minute magic-link token straight into
  the deployed database and opens the site's own confirm page, so the first sign-in takes one click
  and needs no email at all. This rides the engine's own tables, hashing, and confirm route with no
  engine change. The App's own identity (owner, repo, app id, installation id) is written into the
  scaffold's `cairn.config.ts` before the GitHub chapter pushes it, so the repository is born able
  to publish rather than carrying the showcase's placeholder. New flags: `--deploy` to opt in
  unattended, `--owner-email` for the sign-in address, and `--sign-in` to issue a fresh link for a
  site that is already live. Every hop persists, so a resumed run skips the deploy it already did,
  and `--dry-run` still prints the whole chapter while spawning nothing. Consumers must: nothing
  (the tool is unpublished; no engine surface changed).

  A domain chapter now follows the Cloudflare one and connects a scaffolded site to an owner's own
  domain. It creates a Cloudflare zone for the domain, or adopts one the account already holds, and
  offers to copy the domain's current DNS records into it behind a carry-over gate that writes
  nothing until confirmed and preserves MX priority intact. Nameserver delegation parks: the tool
  exits `0`, prints the assigned nameservers and the exact command to run again, and a resumed run
  re-detects delegation through pending, propagating, and active. The cutover attaches a Workers
  Custom Domain, confirms the site answers on the new hostname before touching anything else, and
  restores the site's own address to `workers.dev` if the closing redeploy fails. A new `--domain
  <name>` flag both supplies the domain and opts into the chapter; `--yes` alone skips it with a
  hint. The chapter's one credential is a Cloudflare API token, prefilled with the permissions it
  needs. It lives only in the site's local `0600` state record, never lands in the project
  directory or on the command line, and is deleted once the chapter, email included, reaches a
  state with nothing left to do with it. Consumers must: nothing, since the tool is unpublished
  and the engine's runtime library is untouched by this pass.

  An email chapter now finishes what the domain one started, taking a site from serving on its own
  domain to sending its own sign-in mail. It onboards the domain for Cloudflare Email Sending
  through the REST API, sends one real message to the owner's address to prove the path, then
  writes `no-reply@<domain>` into the scaffold's `cairn.config.ts` and redeploys once so the
  running Worker carries it. The test send runs before the rewrite and deploy deliberately: it
  proves the sending path without depending on the deployed Worker, and a broken path should not
  buy a deploy. The deploy itself happens only when the address actually changed, so a resumed run
  does not buy a second one. The chapter opens with the price rather than discovering it: a cost
  preamble now heads a fresh run, before the site name is even asked, covering what is free, what a
  domain costs at a registrar, and Cloudflare's Workers Paid plan at $5 US per month billed once per
  account. Every figure carries its date and a link. A new `--email` flag opts in unattended, and
  `--yes` alone declines rather than committing an owner to a subscription, naming the flag that
  would not have. Declining is a first-class outcome rather than a failure: the catalogue gains a
  fourth error kind, `declined`, which exits `0` and carries no re-run urgency, and the copy names
  what still works, what does not, and `--sign-in` as the owner's own way back in. A re-run
  re-offers. The pasted Cloudflare token now survives until chapter 2 reaches a genuinely terminal
  state, which is the email half completing or a recorded decline, and a park keeps it; this closes
  a hole where an owner who declined left a live credential on disk. Consumers must: nothing, since
  the tool is unpublished and this pass leaves the engine's runtime library untouched.

  Two platform findings from the pass's live spike are worth recording, because both contradict
  what the documentation implies. Cloudflare's REST send carries none of the `E_` codes its Workers
  binding throws, and two codes, `10203` and `10204`, both describe a sender that is not ready,
  covering a domain that was never onboarded and one whose DNS is still settling alike, so elapsed
  time since onboarding is the only thing separating them.
  Deleting a sending subdomain removes the records onboarding added except the `p=reject` DMARC
  record at the apex, so that policy outlives the feature that wrote it and any later sender for the
  domain has to be added to it. The closing copy and the deploy guide both say so now.

  A live end-to-end run of the whole chapter then found four defects its fakes could not reach, and
  all four are fixed here. Two of them stranded a real owner. A saved Cloudflare API token that
  still passed validation but lacked a write permission could never be replaced, because validation
  is a read and nothing ever cleared a token that failed later; a `token-scope-missing` or
  `token-invalid` failure now deletes the saved token before the error surfaces, so the re-run the
  message already asks for actually collects a new one. Under `--yes`, a `CAIRN_CF_API_TOKEN` that
  differs from the saved token now wins, since an operator who sets the variable is expressing an
  intent a stored value should not override. Separately, an owner whose zone already existed but
  whose token could not create zones died on a refusal for a create that was never needed:
  `ensureZone` now lists zones by name before posting a create, adopting on a hit, which is the
  read-before-write discipline every other non-idempotent call in the tool already followed. The
  1061 collision path stays as a race guard.

  The third fix is a correction, not a repair. The run proved that Cloudflare accepts a message and
  proved nothing about delivery: every send returned 200 and none arrived, on a domain a day old.
  Greylisting and SPF were both refuted by experiment, leaving new-domain sending reputation, which
  a CLI cannot observe. So the tool no longer claims delivery anywhere. The closing copy names what
  was actually proven, adds the warm-up expectation a brand-new domain should have, and points at
  `cairn-doctor --send-test` for checking the path later. The stale "Email arrives with a later
  chapter" line, which this pass's own predecessor made false, now names `--domain` and `--email`
  instead. Fourth, the `10204` refusal code joins `10203` under the propagation-window
  classification deliberately, rather than landing correctly by fall-through.

  Consumers must: nothing. `create-cairn-site` is still unpublished and the engine's runtime library
  is untouched by this pass.

  A Builds chapter now follows the email one (or, later, is entered on its own with a new
  `--connect` flag) and takes a site the rest of the way to push-to-deploy. It connects the
  repository to Cloudflare Workers Builds, creates a trigger bound to the site's existing Worker,
  reconciles the two tool-owned config files (`wrangler.jsonc`, `src/theme/cairn.config.ts`) into
  the repository through an admin-attributed commit whenever they have drifted, and watches the
  first Builds deploy to success. Connecting and the trigger are both adopted rather than
  re-created on a re-run, since the connections PUT is a true upsert and a worker's existing
  triggers each embed the connection they already point at. The build token needs no separate
  dashboard visit: the chapter registers the admin's own pasted Cloudflare API token as the build
  token, through the same paste flow the domain chapter already used, using
  `GET /user/tokens/verify` to learn the id Cloudflare's token-registration route needs.
  Two things still need a browser: a one-time authorization of Cloudflare's "Workers and Pages"
  GitHub App, and a sign-in click for the reconcile commit. That sign-in is skipped when nothing
  has drifted locally, decided by a hash of the two tool-owned files recorded at the last
  reconcile, because a scaffolded repository is private and reading it to compare needs a
  credential the tool deliberately does not keep. One narrowing follows from that, stated here
  rather than discovered later: editing either file in the repository while changing nothing on
  your machine leaves the drift unnoticed until something local changes too. A first run has no
  recorded hash, so it always signs in once, and an unattended `--yes` first run parks at that
  point instead. Both authorization refusals Cloudflare's connections API can return are read from
  their numeric codes (`8000008`, `8000012`) rather than their platform message, since both
  messages are Pages-era and factually wrong for this condition; the rows state the real
  condition in cairn's own words. A push-triggered build is found by matching the reconcile
  commit's sha; a manual kick, needed only on a genuinely first run whose config already matches,
  carries no commit metadata to match on and is tracked by its own build id instead. A
  `builds-live` re-entry (a later `--connect`) is not a no-op: it re-runs the reconcile diff, so a
  `PUBLIC_ORIGIN` that changed locally after the site went live is not silently left uncommitted.
  Every park exits `0` and names the exact command to resume; a failed or unrunnable build exits
  `1` with the build log's last few lines and a dashboard link. Consumers must: nothing. The
  engine's runtime library is untouched by this pass, and `create-cairn-site` is still
  unpublished.

  The machinery behind the public template repo lands next, though the repo itself does not.
  `scripts/sync-template-repo.mjs` generates `glw907/cairn-waymark-template` wholesale from the
  same bake the CLI scaffolds from, plus a small repo-only overlay (README, MIT license,
  `.dev.vars.example`, and the `.gitignore` negation that keeps git from swallowing it). The tree
  is regenerated on every sync and committed normally, never force-pushed, so a hand edit to the
  template repo survives at most one sync and history stays intact. GitHub Actions drives it three
  ways: a job gated on the npm publish succeeding, a manual dispatch, and a weekly `--dry-run`
  compare that fails on drift, which is the tripwire for a hand edit, an expired credential, or a
  sync gone silently inert. Write access rides a fine-grained PAT that reaches the script only as
  `TEMPLATE_REPO_TOKEN` in the environment, carried to git as an injected `http.extraheader` rather
  than embedded in the remote URL, so it appears in no subprocess argv and in no clone's persisted
  `.git/config`.

  The sync refuses to push a tree it cannot prove builds. Registry resolvability alone was not
  enough, and finding out why is what split this pass: the bake emits the showcase's **current**
  tree while the emitted engine dependency resolves to the last **published** version, so a
  template generated between releases can import engine symbols the registry does not serve. It
  did, against `0.94.0`. The gate installs and builds the composed tree before committing, and runs
  only when a real sync is about to push, so a no-op run and a `--dry-run` never pay for it.
  `docs/guides/deploy-to-cloudflare.md` gains the three-door framing this implies: the manual
  door, `create-cairn-site --connect`, and the Deploy to Cloudflare button, which is named as not
  yet available. Consumers must: nothing; none of this ships in the engine tarball.

  **Two release-checklist obligations ride this entry, and `cairn-release` must not miss them.**
  (1) Drop `--strip-dev-backend` from `sync-template.yml`'s drift cron and from its dispatch input
  default, in the same edit; the release path never strips, so leaving the flag on makes the weekly
  compare measure a stripped bake against an unstripped repo and go red every Monday forever.
  (2) Drop the pre-release notice from `packages/create-cairn-site/template-repo/README.md`. The
  remaining T5 work (creating the public repo, its first sync, the live button spike, the
  spike-derived completion checklist, and the C3 `--template` verification) belongs to the same
  cut, since the repo cannot build from a clean clone until the engine it names is on the registry.

- Every entry gains a publish history and a revert-as-draft: the `history` admin view
  (`/admin/<concept>/<id>/history`), reachable from the edit screen's overflow menu, lists the
  entry's most recent 25 publishes off `Backend`'s new `listCommits(path, ref, limit)` member (a
  new `BackendCommit` export; both the GitHub App backend and the packaged dev backend implement
  it identically), each row naming who published it and when, plus a synthetic row for an open
  draft. The list shows every publish that touched the file, including ones made outside cairn,
  and its own label, "recent versions," never claims completeness: a rename restarts the commits
  API's path filter cairn reads from. Choosing Revert beside a listed version starts a fresh
  draft holding that version's content, through the unchanged Publish gate; nothing goes live at
  revert time. Revert refuses fail-closed (a new `RevertFailure` union, `ActionFailure<RevertFailure>`
  on the new `revert` facade action key gated to the `history` view) when a pending draft already
  blocks the entry, when the posted target isn't a member of a freshly re-read history list, or
  when the default branch moved since the history page rendered; a reverted version carrying a
  since-retired field or vocabulary tag rides forward as a warn-only advisory rather than
  blocking the revert. `Backend.createBranch`'s existing-branch collision is now a typed
  `BranchExistsError` (both backends throw it identically); the packaged dev backend used to
  silently overwrite the branch on a name collision and now throws instead. See
  [SvelteKit](docs/reference/sveltekit.md), [the canonical admin
  mount](docs/reference/admin-routes.md), and [Publish and
  discard](docs/guides/publish-and-discard.md#see-an-entrys-history-and-restore-an-earlier-version).
  Consumers must: nothing, for a site that only imports the packaged backends and admin facade;
  this is purely additive, and a site that mounts the single-mount admin facade picks up the
  History link with no code change. A site implementing its own `Backend` must add the new
  `listCommits(path, ref, limit)` member and change `createBranch`'s return type from
  `Promise<void>` to `Promise<string>`, returning the sha it created the branch at. Undelete
  stays out of scope for this release (see ROADMAP.md).

- An editor can now hand a draft to someone who isn't an editor: the edit screen's new "Share
  preview" group mints an opaque link (`previewMint`/`previewRevoke` facade actions, backed by
  the new `previewMintAction`/`previewRevokeAction` route-factory members and `mintPreviewToken`,
  all `/sveltekit`), and the site mounts a new, never-prerendered `previewLoad` route that renders
  the shared draft through the exact composition its public entry page runs
  (`composeEntryData`/`EntryDataOverrides`, newly exported from `/delivery`), so the preview and
  its eventual public page can't structurally drift: full CSS, working components, hydrating
  islands. The link carries `PreviewData` (`EntryData` plus a `preview` field: `state`, `expiresAt`,
  and the live `permalink` once published), which the new `PreviewBanner` component
  (`/components`) renders as a small default banner a site may replace. A new bundled migration,
  `migrations/0003_preview.sql`, adds the opt-in `preview_tokens` table the feature needs; a link
  dies with its branch (publish and discard both delete it), rename/delete/discard clear a
  never-published entry's outstanding rows, removing an editor clears theirs, and the edit
  screen's Revoke-all button clears every row for an entry on demand. TTL defaults to seven days
  and configures through `CairnAdminOptions.preview`/`ContentRoutesOptions.preview`
  (`PreviewTokenConfig`). Four new log events (`preview.token.minted`, `preview.token.revoked`,
  `preview.cleanup_failed`, `preview.rejected`) never carry the token itself. See
  [SvelteKit](docs/reference/sveltekit.md#public-preview),
  [Components](docs/reference/components.md#previewbanner),
  [Delivery](docs/reference/delivery.md#composeentrydata), [Log
  events](docs/reference/log-events.md), and [Share a draft
  preview](docs/guides/share-a-draft-preview.md) for the full adopter walkthrough, including the
  operational notes on caching, rate limiting, and the URL-as-credential exposure a preview link
  carries.

  Consumers must: nothing to keep building and deploying as before; every addition here is
  purely additive and unmounted by default. **A site that adopts the feature** (an
  adopter-only step, not a required upgrade action) copies and applies
  `migrations/0003_preview.sql` to its `AUTH_DB` and mounts a `+page.server.ts`/`+page.svelte`
  pair at `/preview/[token]`, inside the same layout group as its entry pages; the edit screen's
  Share preview group ships automatically to every site mounting the single-mount admin facade,
  but minting produces a working link only once the route is mounted and the migration is
  applied.

- Vertical alignment is now an engine-owned mechanic on the admin surface, off a measured
  inventory of every admin screen at three widths in both themes. Three recipes land: a new
  `FieldRow` export on `/admin-toolkit` (retired in the retires pass, batch 1a) that levels a
  row mixing a stacked field with a bare control on their bottom edges, and two new classes in the
  shipped admin sheet, `cairn-icon-label` (a glyph-plus-word label that reports its own text
  baseline, so a row declaring `items-baseline` levels the word rather than the icon) and
  `cairn-line-slot` (a one-line-tall slot that levels a painted chip on the line it labels). Three
  admin rows were re-composed onto the recipes: the tidy settings screen's three developer-tier
  rows (a 2.5px baseline miss), its "Set by your developer" pill (5px low against the heading it
  labels), and the editor's Write tab glyph (2.33px above its own label's cap centre). The
  mechanics, and the `text-box-trim` default that was measured and declined, are written up in
  `docs/internal/admin-design-system.md`. Consumers must: nothing. The new export and the two new
  classes are additive, and no existing class changed.

- `create-cairn-site` gained a localhost console over its two longest waits. DNS propagation and the
  first Workers build now hold in place on an interactive run instead of parking, printing a
  `127.0.0.1` URL that serves a live view of what the run is waiting on, and resuming by themselves
  the moment the wait clears. The propagation view reads the answer from the zone's own nameservers
  beside the machine resolver's, which splits the old single `hostname-propagating` outcome into
  `hostname-records-absent` and `hostname-resolver-lagging`: a live run measured 27 minutes parked on
  a stale negative cache while the authoritative answer served the whole time, and that case now
  names itself and clears without a re-run. The marker pair remains the only authority for a live
  verdict, so the DNS answer upgrades the diagnosis and never the verdict. The builds view shows
  discovery, then the build's own state from queued to running to an outcome, and the commit it
  matched. Each page carries a chapter and hop header, refreshes on a per-class cadence, and renders
  from a per-view field allowlist, so no token or secret reaches a rendered byte or a printed line.
  The console mounts under a fresh unguessable path per run, refuses any request not addressed to
  the local machine, and exists only while a run is waiting; nothing is left listening between runs.
  A run that is `--yes`, non-TTY, or under CI never holds and parks exactly as before. An interrupt
  during a wait closes the console, saves what the loop learned, prints the same park row the expiry
  path prints, and exits `0`, where an interrupt previously died at 130 with nothing saved. A console
  that cannot bind degrades to the old behavior rather than failing the run. Three internal reuse
  moves came with it: the loopback listener extracted into a routing core that adds a Host allowlist
  and per-mount secret prefixes (the GitHub chapter's `/callback` and `/manifest` stay at their fixed
  paths, since GitHub's loopback leniency is port-only and the App's callback URLs are baked at
  creation), the authoritative-versus-recursive DNS machinery lifted out of the records module into a
  shared helper, and the fake HTTP plumbing shared by the GitHub and Cloudflare test fakes collapsed
  into one. Consumers must: nothing. The engine's runtime library, exports, and tarball are untouched,
  and this package ships separately.

### Changed

- The docs now say plainly that a production site belongs on the Workers Paid plan, and why. A new
  "Choose a Workers plan" section in [Configure auth and D1](docs/guides/configure-auth-and-d1.md)
  states that Cloudflare Email Sending reaches arbitrary recipients only on the paid plan, that
  every editor is an arbitrary recipient, and that the free tier's verified-destination path does
  not fit an editor roster, since each recipient has to click a Cloudflare verification link and the
  sending domain has to run Email Routing, which takes over the domain's root MX records. It also
  names the way out for a site that would rather not upgrade: the `SendMagicLink` seam takes any
  delivery function, so another provider's API can carry the mail with the rest of auth unchanged.
  The readiness guide and the tutorial's prerequisites both point at it, so the cost surfaces where
  a reader decides rather than only where a send fails. Prices stay linked to Cloudflare rather than
  copied, per this repo's rule that a vendor's specifics go stale on the vendor's schedule.
  Consumers must: nothing, though a site relying on magic-link sign-in should confirm its account's
  plan.
- The template emitter no longer copies showcase-only material into a scaffolded site. Three paths
  join `.cairn-template.json`'s exclude list (`.claude`, which carried seven tracked agent-memory
  notes, `scripts`, a design-lab tool, and the showcase's own `README.md`, whose relative links
  point back into the engine repo), and the `create-cairn-site` bake additionally prunes the
  `pretest:e2e`, `test:e2e`, and `design:probe` scripts and the two Playwright devDependencies,
  which survived the path exclusions because the manifest can drop files but not lines inside a
  kept `package.json`. The prune is a rot gate: it throws when an expected key is already gone, so
  a rename in the showcase surfaces here instead of silently shipping. `cairn:manifest` is
  deliberately kept, since a real site runs it. Consumers must: nothing. This changes the
  scaffolded output only, never the installed package.

- `@anthropic-ai/sdk` is now an optional peer dependency instead of a plain dependency, and the
  tidy action reaches it through a dynamic import at call time rather than a static import at
  module load. A site that never turns tidy on stops installing the SDK and its six transitive
  packages, 13 MB and roughly 1,980 files off a production install. A site that does use tidy
  behaves exactly as before once the package is present, and the injectable
  `ContentRoutesOptions.tidy.client` seam keeps its signature, so an injected client (the packaged
  dev backend's deterministic stub included) is untouched. With tidy enabled and the SDK absent,
  the action answers `fail(503)` naming the package and the install command instead of failing the
  build, and logs `tidy.failed` with a new `reason: 'sdk_missing'`; the key-health cache stays
  untouched, since no key was ever tried. See [Log events](docs/reference/log-events.md).
  Consumers must: a site using the tidy action adds `@anthropic-ai/sdk` to its own dependencies
  (`npm install @anthropic-ai/sdk`), because npm does not auto-install an optional peer; a site not
  using tidy does nothing, and its install gets lighter.

### Documentation

- The published documentation is now organized by who is reading it, not by what shape the page
  is. Three audience tracks replace the old Diataxis arms: [admin](docs/admin/README.md) for the
  person who runs the site, [editors](docs/editors/README.md) for the person who writes in it, and
  [extend](docs/extend/README.md) for the developer building on it, with the machine-gated
  [reference](docs/reference/README.md) arm kept as it was and [why cairn](docs/why-cairn.md)
  raised to sit beside the [docs index](docs/README.md) as a second front door. `docs/guides/`,
  `docs/tutorial/`, and `docs/explanation/` are deleted, 50 files in all, along with
  `docs/reference/authoring-syntax.md`, whose content was author-facing rather than a developer
  contract and now lives in the editors track. The new pages were written against the source tree
  rather than edited out of the old ones, which is what let them fix claims the old corpus had
  wrong: an edit conflict keeps your typing on screen instead of asking you to reload and reapply
  it, entry history is capped at the 25 most recent publishes, and a current SvelteKit scaffold
  carries no `svelte.config.js` to put the adapter in at all. The editors track grades under the
  Microsoft style guide rather than Google, because its reader is not a developer.

  Every gate that named the old arms moved with them. `check:docs` learned a legacy-path map so
  `CHANGELOG.md` keeps its historical links unrewritten while every other file's links still fail
  loud on a dead target, and the map fails loudly itself when an entry rots: a replacement that no
  longer exists, an old page that came back, or an entry no link reaches. `check:arm-indexes`
  gained a front-door rule for `docs/why-cairn.md`, a published page belonging to no arm
  directory, and `check:package` now treats the front doors as named files rather than covering
  them with a directory prefix.

  Consumers must: update any bookmark or inbound link into `docs/guides/`, `docs/tutorial/`, or
  `docs/explanation/`, which no longer exist; cairn-pub serves a redirect for every URL those
  pages published, so a live link keeps resolving, but a link written into your own site's content
  or code should be repointed at its new home. The published tarball's docs payload changes shape
  with it: `docs/admin`, `docs/editors`, `docs/extend`, and `docs/why-cairn.md` ship, and the three
  retired arms no longer do. Nothing in the engine's exports, types, or runtime behavior changes.

- The corpus has its first visual layer: eleven mermaid diagrams across ten extend- and
  admin-track pages, each authored as text in the page itself. The set spans the architecture
  block diagram, the write-path sequence, the trust-boundary map, the media-storage flow, the
  delete-guard decision, the render-pipeline order, the build-by-hand milestone map, the
  key-rotation overlap, and the admin track's ownership, domain, and setup-journey maps. Every
  fence carries mermaid's `accTitle` and `accDescr` directives and is followed by a one-paragraph
  caption, so assistive tech announces the authored name and gist rather than a generic label,
  and every fact a diagram draws also survives in body text. The pages were rewritten to lean on
  their diagrams: the enumerations a drawing absorbs shrank to the sentences that carry
  reasoning, the guard page's request order became an ordered list verified against the source,
  [render-safety.md](docs/extend/render-safety.md) fixed its own contradiction about which rehype
  step runs last, and the scaffold page's directory tree is now generated by running the scaffold
  rather than typed by hand. A new `check:visuals` gate enforces the authored-source convention
  (directives present, caption present, alt-text rules) across the published docs and runs in CI
  beside the sibling checks. Consumers must: nothing. The diagrams are authored markdown, and the
  engine's exports, types, and runtime behavior are untouched.

### Fixed

- A tarball-installed `create-cairn-site` scaffold now ships a real `.gitignore`. npm's own
  packlist drops any file literally named `.gitignore` from a published tarball, wherever it sits
  in the tree, so the baked template carried none and `pushScaffold`'s own ignore-honoring
  silently had nothing to read: `.dev.vars` and `.wrangler/` sat one `git add -A` away from
  landing in a scaffolded site's own GitHub repository. The bake now stores the showcase's
  `.gitignore` under the dot-free name `gitignore`, npm-safe through packing, and `scaffold.mjs`
  renames it back to `.gitignore` when it copies the template into a new site.
  `sync-template-repo.mjs`'s own git-hosted publish is unaffected, since it reuses the bake's
  plain, unrenamed output. Consumers must: nothing; this is tool-side only.

## 0.94.0

<!-- release-size: minor -->

### Consumers must

Four sites depend on the package today, each on its own `0.x` caret range (907-life `^0.84.4`,
cairn-pub `^0.87.4`, aksailingclub-org `^0.91.1`, ecxc-ski `^0.93.0`), and a caret admits only its
own minor, so a site more than one minor behind this window crosses several earlier
`Consumers must:` lists on the way here. Read every list your version range crosses, per
[the upgrade guide](docs/guides/upgrade-cairn.md); this list covers only this window, not the older
ones.

The steps below are ordered so a rename that has to compile before another change lands first;
each links to its full entry under Changed for the reasoning and the exact old and new names.

1. **Toolchain.** Be on Node 22 or later for the build (`"engines"` now states it).
2. **Imports and types.**
   - Replace `AuthEnv`/`BackendEnv` with [`CairnEnv`](docs/reference/sveltekit.md#cairnenv); drop
     any reliance on `PlatformContext.ctx`/`.context`.
   - Replace `EventBase`, `RequestContext`, `ContentEvent`, `AdminEvent`, or `AdminActionEvent`
     with [`CairnEvent`](docs/reference/sveltekit.md#the-event-shape); a hand-built event fixture
     (a test, a script) now needs `params` and `route` alongside its existing fields.
   - Drop any imported `Role` type and use `string`; drop a `CairnRolesRegister` `app.d.ts`
     augmentation and any cast that forced a custom role name past the old union.
   - Replace `CairnAdminDeps`, `ContentRoutesDeps`, `AdminActionDeps`, or `PublicRoutesDeps` with
     its renamed `*Options`/`*Config` counterpart; replace `makeMediaResolver` with
     `buildMediaResolver`; replace `OrphanScan` with `MediaOrphanScanResult` and `AdminNavIcon`
     with `NavIcon`; drop any imported `MakeIcon` or `ConceptUrlPolicy`.
   - Replace any imported `AdminActionError` with
     [`UnauditedActionError`](docs/reference/sveltekit.md#refusal-channels) and remove any
     `handleError` mapping of it; `adminAction`'s two refusals now answer with a `303` redirect
     and a `403` error instead of the old `500`, so a monitor or an alert keyed on that status
     needs the same update.
   - Replace any `@glw907/cairn-cms/admin-fields` import with
     [`@glw907/cairn-cms/admin-toolkit`](docs/reference/admin-toolkit.md#fields), renaming
     `TextField`/`SelectField`/`SelectFieldOption` to `TextInput`/`SelectInput`/
     `SelectInputOption`; replace `@glw907/cairn-cms/components`'s `OfficeList` import with the
     same `/admin-toolkit` subpath.
   - Rename any read of [`TidyResult`](docs/reference/sveltekit.md#createcontentroutes)'s `usage` field to
     `tokens`; the old name collided with `MediaDeleteRefusal.usage` inside SvelteKit's generated
     `ActionData` union for the admin route, which is why `<CairnAdmin {form} />` failed to
     typecheck.
   - Rename any read of [`AdminActionAuditRecord`](docs/reference/sveltekit.md#types)'s `editor`
     field to `actor`, in a hand-rolled `AdminActionAuditSink` or a custom `App.Locals`
     augmentation that duplicates the type; a site wiring no audit sink does nothing.
3. **`locals` reads.** Rename every `event.locals.editor`, `.backend`, and `.auditSink` read or
   write in your `hooks.server.ts` or a custom admin route to `event.locals.cairnEditor`,
   `.cairnBackend`, and `.cairnAuditSink`, including in a hand-duplicated `App.Locals`
   augmentation. See [Ambient types](docs/reference/ambient.md).
4. **Action names and posted `?/` keys.** Rename any route-factory member your site imports
   directly in its own `+page.server.ts` files (see
   [SvelteKit](docs/reference/sveltekit.md#createcontentroutes)); change the posted `?/` action
   string on any form or `fetch` call that targets a renamed facade action, for example
   `?/saveSettings` to `?/settingsSave` (see [admin
   routes](docs/reference/admin-routes.md#the-actions-vocabulary)), since a stale name now 404s at
   submit time with no compile-time warning.
5. **Adapter config.** Replace `editor.adminNav` with `editor.navLayout` on the adapter, a flat
   entry or section carrying over unchanged in shape (see [the navLayout
   seam](docs/reference/sveltekit.md#the-navlayout-seam)), and replace any imported
   `AdminNavEntry`/`AdminNavSection`/`AdminNavConfig`/`ResolvedNavSection`/`ResolvedNavItem` with
   its `NavLayoutEntry`/`NavLayoutSection`/`NavLayout`/`ResolvedLayoutSection`/
   `ResolvedLayoutNode` counterpart. Rekey any access map behind a parameterized or catch-all
   [`createSectionAction`](docs/reference/sveltekit.md#createsectionaction) route from the
   concrete request path to the bracket-form route id (`/admin/posts/[id]`); a map still keyed by
   path now fails closed and refuses every session, including owner.
6. **Log-consumer changes.** Update any Workers Logs saved query, alert, or dashboard filter
   naming `admin.audit.sink_failed`, `admin.action.audit_sink_failed`, `tidy.done`, `tidy.error`,
   `media.orphan_reconcile`, or `content.field_behavior_error` to its renamed form; update a filter
   on a kebab-case media upload `reason` or on `github.unreachable`'s `scope: 'layout'` (which
   never fired) to the corrected snake_case value. See [Log events](docs/reference/log-events.md).
   None of this breaks at compile time; these are runtime values, not exported types.
7. **`requireAccess`'s default target.** Rekey any access map behind a
   [`requireAccess`](docs/reference/sveltekit.md#requireaccess) call on a parameterized or
   catch-all admin route from the concrete request path to the bracket-form route id
   (`/admin/posts/[id]`), the same rekey step 5 already covers for `createSectionAction`; a map
   still keyed by the concrete path now fails closed and refuses every session, including owner. A
   site with no parameterized or catch-all route behind `requireAccess` sees no change.

Two more steps, neither gated by a compiler: a call to `formatCivilDate` that relied on its old
`'Not yet'` default for a missing date now renders an empty string unless you pass
`{ fallback: 'Not yet' }` explicitly (see [Admin toolkit](docs/reference/admin-toolkit.md#formatts));
and any monitoring keyed on `adminAction`'s old `500` for a missing-editor or CSRF refusal should
watch for the new `303`/`403` instead, the same change step 2 already carries, restated here
because a status-code dashboard is easy to miss on a code review.

Every other entry below (the `/cloudflare` subpath, `createD1AuditSink`, the export-rule sweep's
roughly ninety new exports, `/components`'s two new views, the newly named `AuthGuardOptions` and
`EditorRoutesOptions` bags, the newly named factory return types) is additive: no rename, no
removal, nothing this list needs to carry.

### Added

- A new server-only export subpath, `@glw907/cairn-cms/cloudflare`, publishes the
  Cloudflare-native platform primitives two sites already copy by hand:
  `verifyTurnstile(token, secret, opts?)`, the siteverify fetch, fail-closed on every
  failure mode (a malformed or over-length token or secret, a fetch that throws or times
  out, a non-200 response, an unparseable or malformed body, a `success: false` result,
  or a `hostname`/`action` mismatch all return `false`, never throw); and
  `checkRateLimit(binding, key)` plus `checkRateLimitKeys(binding, keys)`, the Workers
  `RateLimit` binding wrapper, degrade-to-open on an absent binding. `RateLimitLike`,
  already public on `./sveltekit` for `createSectionAction`, moves to this subpath as
  its one declaration and is re-exported from `./sveltekit` unchanged. See
  [Cloudflare](docs/reference/cloudflare.md). Consumers must: nothing.

- A new factory on `@glw907/cairn-cms/sveltekit`, `createD1AuditSink(db, waitUntil)`, is the
  first implementation of the `AdminActionAuditSink` seam: a fire-and-forget, parameterized
  insert into a packaged `audit_log` table (`migrations/0002_audit.sql`, opt-in, applied the
  same way as the auth migrations), fail-open so a persist failure never fails the audited
  action, with every bound field truncated to a documented maximum so an oversized `detail`
  can't suppress its own row. `waitUntil` is a required parameter that explicitly accepts
  `undefined`, so a site chooses the drop risk rather than defaulting into it. A rejected
  insert logs the whole truncated record and the error as `audit.sink.write_failed`. See
  [SvelteKit](docs/reference/sveltekit.md#created1auditsink). Consumers must: nothing.

- The export-rule sweep (C2 breaking-window pass, R4 ruling) adopts a standing doctrine: every
  type named in a public signature is exported from a subpath the consumer already imports, so an
  AI coding agent or a developer can always name a value it holds instead of inventing a
  structural duplicate. Roughly ninety previously unreachable types become named, documented
  exports, closed under their own structural bodies (a type re-exported from a subpath now pulls
  every type its own shape names along with it): the field-descriptor union's fifteen arms
  (`TextField`, `SelectField`, `ArrayField`, and the rest) from the root barrel; the facade/action
  result and plan types (`TidyResult`, `DictionaryAddResult`, `MediaBulkDeleteResult`,
  `MediaOrphanPurgeResult`, `MediaOrphanScanResult`, `MediaReplacePreviewPlan`,
  `MediaAltPreviewPlan`, and their own nested shapes) and the tidy, content, and media-preview
  supporting types (`TidyClient`, `TidyConfig`, `TidyConventions`, `TidyKeyProbeResult`,
  `FragmentTarget`, `LinkTarget`, `InboundLink`, `UsageEntry`, `ReferenceEdge`,
  `MarkdownReferenceRow`, `MediaLibraryEntry`, `ResolvedPreview`, `CookieSetOptions`,
  `GettingStarted`, `ResolveOptions`) from `./sveltekit` and, where a signature there names it,
  the root barrel. Three recurring anonymous inline load-payload shapes are named and exported
  from `./sveltekit`: `LoginData` (`loginLoad`), `ConfirmData` (`confirmLoad`), and `EditorsData`
  (`editorsLoad`), replacing the anonymous object literals `AdminData`'s `'login'`/`'confirm'`/
  `'editors'` members used to inline. See [Core](docs/reference/core.md#types),
  [SvelteKit](docs/reference/sveltekit.md#types), and
  [Delivery data](docs/reference/delivery-data.md#types). Consumers must: nothing; every addition
  is a new named export with no renamed or removed symbol.

- Five new refusal-shape exports on `./sveltekit` (pass C2b, the refusal-channel convergence),
  one per action the pass moved off the query channel onto `fail()`: `CreateFailure` (a refused
  create), `NavSaveFailure`, `SettingsSaveFailure`, and `VocabularySaveFailure` (a refused nav,
  settings, or vocabulary save), and `MediaUploadFailure` (a refused upload, including the Media
  Library's own direct-commit conflict bounce). Each is the bare `{ error: string }` one-line
  summary the engine's other single-field refusals already use. See
  [SvelteKit](docs/reference/sveltekit.md#createcontentroutes). Consumers must: nothing; every
  addition is a new named export.

- A new server-only export subpath, `@glw907/cairn-cms/auth-channel`, publishes
  `createAuthChannel(config)`: a factory for a site's own second-audience login channel (members,
  athletes, boosters), an 8-digit-by-default OTP code requested and confirmed over any transport
  the site's own `deliver` function sends, backed by the site's own D1 binding rather than
  `AUTH_DB`. The factory owns every security discipline behind the channel: salted identity
  derivation, atomic sliding-window rate budgets, the nonce-bound code row, session issuance and
  revocation, and its own D1 schema (`CHANNEL_SCHEMA_SQL`, `CHANNEL_SCHEMA_VERSION`). Every
  denying control keys on the requester, never the victim's identity; an identity-keyed control
  either escalates through a `challenge-required` retry or only logs. Also exports `devDelivery`,
  a dev-only transport that refuses outside `CAIRN_DEV_BACKEND=1`. See [Auth
  channel](docs/reference/auth-channel.md), [Add a login
  channel](docs/guides/add-a-login-channel.md), and [the security
  model](docs/explanation/auth-channel-security-model.md). Consumers must: nothing; this is a new
  subpath with no bearing on the engine's own editor magic-link auth, which is unchanged.

- A new optional `CairnAdapter.aiPosture` field (`AiPosture`, `'invite' | 'decline'`), read by
  `buildRobots`/`robotsResponse` (`@glw907/cairn-cms/delivery`). `'decline'` adds
  `Content-Signal: ai-train=no` and a `Disallow: /` group per token in a new first-party-verified
  training-crawler table, `AI_CRAWLERS` (plus its review date, `AI_CRAWLERS_REVIEWED`); `'invite'`
  adds `Content-Signal: search=yes, ai-train=yes` and no `Disallow`. Declining is a request that
  named crawlers say they honor, not enforcement: robots.txt has no mechanism to block a fetch,
  and OpenAI's `ChatGPT-User` and Perplexity's `Perplexity-User` are exempt from robots.txt by
  their own operators' first-party design. See [Delivery data](docs/reference/delivery-data.md).
  Consumers must: nothing; `aiPosture` is optional and unset on every site today, so this window's
  robots.txt output is byte-identical to before for all four.

- A nineteenth `cairn-doctor` check, `ai.posture-effective`: a plain, credential-free
  `GET /robots.txt` against the deployed origin, reporting what the live file actually carries
  rather than what the adapter declares. It distinguishes no posture stated, a stated posture the
  live file contradicts, and a managed layer (Cloudflare's AI Crawl Control or its managed
  robots.txt) prepending directives cairn did not write, a shape measured live on three of the
  four estate zones. Only the middle case fails, since a stated stance crawlers never read is a
  broken deployment. Stating no posture passes, and so does the managed layer, since whether that
  is wanted belongs to the zone's owner. The report never asserts why a zone is configured as it
  is. See [`cairn-doctor`](docs/reference/doctor.md#the-checks). Consumers must: nothing today,
  since the failing case needs a declared `aiPosture` and no site declares one. A site that adopts
  a posture and sees this check go red has a deployment that does not carry the stance it states.

- A raw-markdown twin for every routable entry (`@glw907/cairn-cms/delivery`): `markdownResponse`
  wraps a body in `text/markdown; charset=utf-8`, a sibling of `robotsResponse`/`sitemapResponse`,
  and `createPublicRoutes` gains `markdownEntries()` and `markdownLoad(event)`, enumerating and
  serving one `.md`-suffixed path per entry whose frontmatter `robots` field doesn't carry
  `noindex`. `markdownLoad` returns the entry's stored markdown body unrendered, reading only
  through the injected `SiteResolver`, so it can serve only what that resolver carries. The
  engine ships the builder and the enumerator; a site wires one small prerendered route to serve
  the set, and the build runs against committed `main` content, which is what keeps a pending
  `cairn/*` edit branch structurally out of reach. A runtime route reopens that question. See [Delivery](docs/reference/delivery.md) and [Delivery
  data](docs/reference/delivery-data.md#markdownresponse). Consumers must: nothing; no site has
  wired the route yet, so this ships no new response on any deployed site.

### Changed

- The env-genericity sweep audited every exported event and config type pinned to `AuthEnv`
  (`AdminEvent`, `RequestContext`, `HandleInput`, `ContentEvent`, `adminAction`'s own event type,
  and the rest of the route-factory surface) against a compile-only fixture proving each one still
  assigns into a real site's own `App.Platform['env']`. No exported type changed: every pin
  compiles clean as is, on the grounds `CairnPlatformBindings` documents, and each now carries a
  doc comment recording the pin as deliberate rather than an oversight. The sweep's fixtures also
  proved a sharper consequence the pins had never surfaced: a site whose `App.Platform['env']` is
  a bare `wrangler types`-generated `Env`, with no `CairnPlatformBindings` intersection, failed to
  compile `export const actions = admin.actions` (and every other route factory assignment),
  since `@cloudflare/workers-types`' `SendEmail.send` returns `Promise<EmailSendResult>` while
  `AuthEnv['EMAIL'].send` declared `Promise<void>`. **This incompatibility dissolved in the
  breaking-window pass below** (`EmailSender.send` now returns `Promise<unknown>`), so
  `CairnPlatformBindings` demotes back to a recommended convenience preset rather than a
  requirement; see that entry for the current claim.

- `AuthEnv` and `BackendEnv` collapse into one all-optional `CairnEnv` (`AUTH_DB`,
  `PUBLIC_ORIGIN`, `CAIRN_DEV_BACKEND`, `EMAIL`, `GITHUB_APP_PRIVATE_KEY_B64`), exported from both
  the root barrel and `./sveltekit`; the split's only purpose, typing which routes need what, is
  now reference-page prose rather than a second declaration. `EmailSender` is named once
  (`{ send(message: MagicLinkMessage): Promise<unknown> }`) and referenced from both `CairnEnv`
  and `CairnPlatformBindings`; the widened `Promise<unknown>` return (not `Promise<void>`)
  structurally accepts `@cloudflare/workers-types`' `SendEmail.send`, whose return is
  `Promise<EmailSendResult>`, dissolving the env-genericity sweep's incompatibility recorded
  above: a bare `wrangler types`-generated env now assigns cleanly into `CairnPlatformBindings`
  with no intersection required, so `CairnPlatformBindings` demotes from a requirement back to a
  recommended convenience preset (it still catches a forgotten binding at compile time). Route
  factory event params (`BackendProvider.connect`, `SendMagicLink`, `healthLoad`, `appCredentials`)
  now read against `CairnEnv`. `PlatformContext` narrows to `{ env?: Env }` (the engine never read
  `ctx`/`context`) and is now exported from `./sveltekit`. See
  [SvelteKit](docs/reference/sveltekit.md#cairnenv) and [Core](docs/reference/core.md#cairnenv).
  **Consumers must:** replace any imported `AuthEnv`/`BackendEnv` with `CairnEnv` on the same
  subpath; a site relying on `PlatformContext.ctx` or `.context` (the engine never read either)
  removes that reliance, since the type no longer carries them.

- `EventBase`, `RequestContext`, the content routes' `ContentEvent`, the admin facade's
  `AdminEvent`, and `adminAction`'s own `AdminActionEvent` collapse into one `CairnEvent<Env =
  CairnEnv>`, exported from `./sveltekit`. It adds `params: Record<string, string>` and
  `route: { id: string | null }`, ending the documented anti-idiom of reading route identity out of a
  form body and giving `SectionActionOptions.target` an honest derivation, and makes `cookies` and
  `setHeaders` unconditionally required, since a real SvelteKit event always carries all four.
  `locals`'s key names are renamed by the entry below; `requireSession`, `requireOwner`,
  `requireEditor`, and `requireAccess` now take `CairnEvent` in place of their old minimal inline
  shapes. See
  [SvelteKit](docs/reference/sveltekit.md#the-event-shape). **Consumers must:** replace any
  imported `EventBase`, `RequestContext`, `ContentEvent`, `AdminEvent`, or `AdminActionEvent` with
  `CairnEvent` on the same subpath; a hand-built event fixture (a test, a script) now needs
  `params` and `route` alongside the fields it already carried.

- `locals`'s four keys take the flat `cairn` prefix, with no alias and no fallback read of the
  old names: `editor` becomes `cairnEditor`, `backend` becomes `cairnBackend`, and `auditSink`
  becomes `cairnAuditSink` (`cairnAccess` already carried the prefix and stays as is). A flat key
  costs a site one optional hop (`event.locals.cairnEditor`) instead of a nested
  `locals.cairn.editor`, and a grep for `cairnEditor` now finds every engine read of the field in
  any repo. `docs/reference/ambient.md` is rewritten from `src/lib/ambient.ts`, which fixes a
  drift the rewrite surfaced: the page never documented `cairnAccess` at all. See
  [Ambient types](docs/reference/ambient.md) and
  [SvelteKit](docs/reference/sveltekit.md#the-event-shape). **Consumers must:** rename every
  `event.locals.editor`, `event.locals.backend`, and `event.locals.auditSink` read or write in
  your own `hooks.server.ts` and any custom admin route to `event.locals.cairnEditor`,
  `event.locals.cairnBackend`, and `event.locals.cairnAuditSink`; a custom `App.Locals`
  augmentation that duplicates the old field names (rather than importing
  `@glw907/cairn-cms/ambient`) needs the same rename.

- Every role-*name* position (`Editor.role`, `EditorRow.role`, `insertEditor`'s and
  `setEditorRole`'s `role` parameters, `AccessMap`'s values, `NavLayoutEntry.roles`,
  `NavLayoutSection.roles`, `AdminShellData.user.role`) widens from the implicit `'owner' |
  'editor'` union to `string` / `string[]`: role names are open (a site names its own vocabulary
  with `defineRoles`), and the literal union was a type lie the moment a site declared a role like
  `webmaster`. `Capability` (`'owner' | 'editor' | 'none'`) is unchanged and stays the one closed
  role-shaped union, since that vocabulary is genuinely fixed. The `Role` export (root barrel and
  `/auth-store`) is removed, along with the now-dead `CairnRolesRegister` registry interface it
  existed solely to narrow: with `Role` gone, no code anywhere declares the augmentation, so it
  carried no remaining read-side to serve. `editors-routes.ts`'s two `role as Role` casts, forced
  by the old narrow union, are now plain assignments. See
  [Core](docs/reference/core.md#roles) and [Auth store](docs/reference/auth-store.md).
  **Consumers must:** drop any imported `Role` type (root barrel or `/auth-store`) and use
  `string` in its place; drop any `interface CairnRolesRegister { roles: typeof roles }`
  augmentation from `app.d.ts`, since it no longer narrows anything; a hand-built `AccessMap`,
  `NavLayoutEntry`/`NavLayoutSection.roles`, or `Editor`/`EditorRow` fixture that cast a custom
  role name to `Role` drops the cast.

- The root `package.json` now declares `"engines": { "node": ">=22" }`, giving npm's own install
  check the Node floor the tutorial has always stated. This is a build-toolchain floor, not a
  runtime claim (the runtime is workerd, never Node); npm's own `EBADENGINE` is a warning that
  still lets the install finish, unless a consumer's own `.npmrc` sets `engine-strict=true`. See
  [Supported toolchain](docs/reference/supported-toolchain.md). **Consumers must:** be on Node 22
  or later for the build toolchain.

- `adminAction`'s two refusals, a missing signed-in editor (authentication) and a CSRF mismatch,
  now ride SvelteKit's own `redirect()` and `error(403, ...)`, the same shapes `requireOwner`,
  `requireEditor`, `requireAccess`, and `requireSession` throw for their own authorization checks,
  so neither of `adminAction`'s two needs a site `handleError` mapping. `adminAction` itself still
  performs no authorization: a `none`-capability editor's session passes both checks and reaches
  the wrapped handler unchanged. The old `AdminActionError` class renames to `UnauditedActionError`
  and now means exactly one thing, the dev-only unaudited-action defect signal (a build-time check,
  never a production response); the new name states that plainly instead of describing a refusal
  channel that no longer exists. The CSRF branch logs the new `admin.action.csrf_rejected` event
  before it throws. See [SvelteKit](docs/reference/sveltekit.md#refusal-channels) and
  [log events](docs/reference/log-events.md). **Consumers must:** replace any imported
  `AdminActionError` with `UnauditedActionError` and remove any `handleError` mapping of that class;
  `adminAction`'s two refusals are now SvelteKit's own `redirect()` and `error(403)`, which need no
  mapping. A site that alerted on the old `500` these refusals used to produce now sees a `303` and
  a `403` instead, and both now navigate away from the submitting page (the redirect to
  `/admin/login`, the 403 to the nearest error boundary), discarding any unsaved form input, where
  the old `500` left the page itself intact and recoverable with Back.

- The route-factory members and the admin facade's `actions` keys now follow one grammar: a
  member that is a SvelteKit `load` ends in `Load`, a member that is a form action ends in
  `Action`, and a facade `actions` key is its member name minus the `Action` suffix. Twelve
  route-factory members rename: `createContentRoutes`'s `settingsSave` to `settingsSaveAction`,
  `vocabularySave` to `vocabularySaveAction`, `shellPayload` to `shellLoad`, `indexRedirect` to
  `indexLoad`, `addDictionaryWordAction` to `dictionaryAddAction`, `mediaPurgeOrphansAction` to
  `mediaOrphanPurgeAction`, `mediaReplaceApplyAction` to `mediaReplaceAction`, and
  `mediaAltApplyAction` to `mediaAltPropagateAction`; `createNavRoutes`'s `navSave` to
  `navSaveAction`; and `createEditorRoutes`'s `addEditorAction`, `removeEditorAction`, and
  `setRoleAction` to `editorAddAction`, `editorRemoveAction`, and `editorSetRoleAction`. Seven
  facade `actions` keys on `createCairnAdmin` (`src/lib/sveltekit/cairn-admin.ts`) rename to
  match: `saveSettings` to `settingsSave`, `saveVocabulary` to `vocabularySave`,
  `addDictionaryWord` to `dictionaryAdd`, `addEditor` to `editorAdd`, `removeEditor` to
  `editorRemove`, `setRole` to `editorSetRole`, and `mediaPurge` to `mediaOrphanPurge`. The
  engine's own admin components (`CairnTidySettings`, `VocabularyAdmin`, `ManageEditors`,
  `EditPage`, `CairnMediaLibrary`) post the renamed facade keys in the same diff. See
  [SvelteKit](docs/reference/sveltekit.md#createcontentroutes) and
  [admin routes](docs/reference/admin-routes.md#the-actions-vocabulary). **Consumers must:**
  rename every renamed route-factory member in a site's own `+page.server.ts` files (per-route
  mounting only; the single-mount `createCairnAdmin` facade needs no source change). **Any site
  that posts to a renamed facade action by name, in a form's `action="?/oldName"` attribute or a
  programmatic `fetch('/admin/...?/oldName')` call, must change the posted `?/` action string to
  the new name** (for example `?/saveSettings` to `?/settingsSave`, `?/addEditor` to
  `?/editorAdd`, `?/mediaPurge` to `?/mediaOrphanPurge`); this is a runtime-only failure (a 404 on
  submit), since the action name is a string literal a type gate cannot catch.

- Every injectable-dependency bag renames from `*Deps` to `*Config` (a factory's primary bag) or
  `*Options` (a secondary or per-call bag): `CairnAdminDeps` to `CairnAdminOptions`,
  `ContentRoutesDeps` to `ContentRoutesOptions`, `AdminActionDeps` to `AdminActionOptions`, and
  `PublicRoutesDeps` to `PublicRoutesConfig` (`createPublicRoutes`'s only bag, so it takes the
  primary-bag name). `createAuthGuard`'s and `createEditorRoutes`'s previously anonymous inline
  option bags are now named and exported as `AuthGuardOptions` and `EditorRoutesOptions`.
  `CairnAdminOptions.auth` stops re-declaring `AuthRoutesConfig`'s shape inline and references it
  directly (`Partial<AuthRoutesConfig>`). Every `create*` factory's return type is now named and
  exported: `CairnAdminRoutes`, `ContentRoutes`, `AuthRoutes`, `EditorRoutes`, `NavRoutes`,
  `PublicRoutes`, and `Renderer`. `makeMediaResolver` renames to `buildMediaResolver` (`make` is
  retired; `build` derives pure data from an already-resolved config). The media orphan-scan result
  type renames from `OrphanScan` to `MediaOrphanScanResult`, and the custom-nav icon-name type from
  `AdminNavIcon` to `NavIcon`. `NavLayoutEngineRef.hidden` widens from `hidden?: true` to
  `hidden?: boolean`, so a computed flag is as valid as the literal; the runtime already treated a
  falsy `hidden` as visible. The `MakeIcon` re-export is removed from `@glw907/cairn-cms/render`
  (the type stays internal). `ConceptUrlPolicy` is removed from the root barrel (it stays internal,
  used by `defineConcept`). See [SvelteKit](docs/reference/sveltekit.md). **Consumers must:**
  replace any imported `CairnAdminDeps`, `ContentRoutesDeps`, `AdminActionDeps`, or
  `PublicRoutesDeps` with its renamed `*Options`/`*Config` counterpart; replace `makeMediaResolver`
  with `buildMediaResolver`; replace any imported `OrphanScan` with `MediaOrphanScanResult` and
  `AdminNavIcon` with `NavIcon`; and drop any imported `MakeIcon` or `ConceptUrlPolicy`.

- `adminNav` retires entirely: `CairnAdapter.editor.adminNav`, `CairnRuntime.adminNav`,
  `AdminNavConfig`, `AdminNavSection`, `normalizeAdminNav`, `filterNavByRole`, `ResolvedNavItem`,
  and `ResolvedNavSection` are removed, and `ResolveNavLayoutOptions.adminNav` and
  `validateNavLayout`'s `hasAdminNav` ctx member go with them. `navLayout` is now the one nav seam:
  `AdminNavEntry`'s members (`label`, `icon`, `href`, `ownerOnly?`) fold into `NavLayoutEntry`,
  which stops extending it and stands self-contained. The behavioral objection that kept `adminNav`
  alive, that it was additive (declare one link) where `navLayout` replaced the whole sidebar, is
  answered by `navLayout`'s own fallback: an engine screen a declared layout never references still
  lands in the trailing fallback group, so adding one link is still a one-entry declaration. See
  [the navLayout seam](docs/reference/sveltekit.md#the-navlayout-seam) and [Organize your admin
  nav](docs/guides/organize-your-admin-nav.md#omission-falls-back-hiding-is-explicit).
  **Consumers must:** replace `editor.adminNav` on the adapter with `editor.navLayout`; a flat
  `adminNav` entry becomes a top-level `NavLayoutEntry` in the `navLayout` array, unchanged in
  shape (`{ label, icon, href, ownerOnly? }`), and an `adminNav` section becomes a
  `NavLayoutSection` (`{ label, children }`) the same way. A site whose whole reason for `adminNav`
  was adding one extra link declares that single entry in `navLayout` and nothing else: every one
  of cairn's own screens the declaration omits still renders, in the same trailing fallback group
  the zero-config sidebar already uses for Help. Replace any imported `AdminNavEntry`,
  `AdminNavSection`, `AdminNavConfig`, `ResolvedNavSection`, or `ResolvedNavItem` type with
  `NavLayoutEntry`, `NavLayoutSection`, `NavLayout`, `ResolvedLayoutSection`, or
  `ResolvedLayoutNode` respectively.

- `/admin-fields` merges into `/admin-toolkit` and is removed from the exports map: two subpaths
  stating one charter ("primitives for a site building its own admin screens") is one subpath. The
  merged toolkit's form components rename to resolve a name collision with the root barrel's field
  *descriptor* arms (the export rule elsewhere in this window makes `TextField`/`SelectField`
  importable at the root as content field descriptors): `TextField` becomes `TextInput`,
  `SelectField` becomes `SelectInput`, and `SelectFieldOption` becomes `SelectInputOption`.
  `FieldLabel` is unchanged. `OfficeList` also moves from `/components` to `/admin-toolkit`,
  beside `PageHeader`, its own later generalization; both stay, since they cover different shapes,
  a header primitive versus a full list-screen scaffold. See [The admin
  toolkit](docs/reference/admin-toolkit.md#fields). **Consumers must:** replace any
  `@glw907/cairn-cms/admin-fields` import with `@glw907/cairn-cms/admin-toolkit`; rename
  `TextField` to `TextInput`, `SelectField` to `SelectInput`, and `SelectFieldOption` to
  `SelectInputOption`; replace `@glw907/cairn-cms/components`'s `OfficeList` import with
  `@glw907/cairn-cms/admin-toolkit`.

- `/components` completes its per-view seam: `VocabularyAdmin` and `WelcomeView` join the barrel,
  the two views `CairnAdmin` already rendered internally but a site on the advanced per-route
  mounting could not reach directly. The membership rule is now exact: every view `CairnAdmin` can
  render is individually mountable. See
  [Components](docs/reference/components.md#vocabularyadmin). Consumers must: nothing; both
  additions are additive.

- `createSectionAction`'s `SectionActionOptions.target` now defaults to `event.route.id`, never
  `event.url.pathname` (C2 breaking-window pass, R9 ruling): on a catch-all route the path is
  attacker-chosen and the route id is not. **On a parameterized or catch-all admin route, an
  access map must key its rule by the bracket-form route id (`/admin/posts/[id]`), never the
  concrete request path (`/admin/posts/hello-world`); a map still keyed by the concrete path
  stops matching and the section fails closed (every session refused, including owner).** A
  static route's id and path are the same string, so a site with no parameterized or catch-all
  admin section sees no change. The derived target drops route-group segments
  (`/admin/(app)/roster` reads as `/admin/roster`), the one place a route id and its URL differ on
  every site, so an access map stays keyed by URL shape; a `target` the call site declares is
  matched verbatim. A null `route.id` (unreachable for a dispatched form action)
  falls back to a fixed constant that matches no access-map key, never to the path. A wrapped
  handler's `ctx.audit` call now also defaults `action`/`entity` from the call site's own
  `SectionActionOptions`, so the common call names only `entityId`/`detail`
  (`ctx.audit({ entityId })`); a handler may still override either verb. See
  [SvelteKit](docs/reference/sveltekit.md#createsectionaction). **Consumers must:** for any
  parameterized or catch-all route behind `createSectionAction`, rekey the site's access map from
  the concrete path to the bracket-form route id, or the section silently refuses every session.

- `requireAccess`'s own `target` parameter now defaults the same way (pass C2b, the
  refusal-channel convergence): `event.route.id`, never `event.url.pathname`, closing the
  asymmetry the C2 breaking-window post-mortem flagged between the load-side helper and
  `createSectionAction`'s already-corrected default. The shared derivation
  (`targetFromRouteId`, internal to the engine) moves out of `section-action.ts` into
  `auth/access.ts`, next to `canReach` and `hasAccessRule`, so both call sites import one copy
  rather than keeping a second in sync by hand. Behavior is otherwise identical to
  `createSectionAction`'s own R9 change: route-group segments drop
  (`/admin/(app)/roster` reads as `/admin/roster`), a parameterized route id resolves verbatim
  (`/admin/posts/[id]`), and a null `route.id` falls back to a fixed constant that matches no
  access-map key, never to the request path. See
  [`requireAccess`](docs/reference/sveltekit.md#requireaccess). **Consumers must:** for any
  `requireAccess`-guarded parameterized or catch-all route, rekey the site's access map from the
  concrete request path to the bracket-form route id, or the helper fails closed and refuses
  every session, including owner. A static route's id and path are the same string, so a site
  with no parameterized or catch-all `requireAccess` route sees no change.

- The admin refusal channel converges on `fail()` (pass C2b, the refusal-channel convergence, R10
  ruling): every content, media, settings, vocabulary, and nav action's own validation and
  commit-conflict refusal now answers `fail(...)` in place, keeping the editor on the page with the
  submitted body intact, rather than throwing a redirect that discarded it. The shared
  `commitFailure` helper (reached from every read-modify-commit action) stops throwing and returns
  its caller's own typed `ActionFailure` instead. `settingsSaveAction` widens from
  `Promise<never>` to `Promise<ActionFailure<SettingsSaveFailure>>`, and `vocabularySaveAction`,
  `navSaveAction`, and `createAction` widen the same way to their own new failure type
  (`VocabularySaveFailure`, `NavSaveFailure`, `CreateFailure`). `NavTree`, `CairnTidySettings`, and
  `VocabularyAdmin` now receive `form` from the shell, the same way `ManageEditors` always has, so
  their conflict and validation refusals render. Every same-route save-validation bounce on the
  edit and list screens converts the same way; `ConceptList` and `EditPage` already received
  `form`, so no shell wiring was needed there. See [Refusal
  channels](docs/reference/sveltekit.md#refusal-channels) and
  [`createContentRoutes`](docs/reference/sveltekit.md#createcontentroutes). **Consumers must:**
  update the return-type annotation of any hand-duplicated wrapper around `settingsSaveAction`,
  `vocabularySaveAction`, `navSaveAction`, or `createAction` that assumed `Promise<never>`. A site
  that renders these built-in screens through `createCairnAdmin` or `createContentRoutes` /
  `createNavRoutes` directly, with no such wrapper, sees no change beyond the behavior note below.

- The admin facade's `viewAction` wrapper drops its `scriptPosted` branch (pass C2b, R10 ruling):
  every action's own unexpected failure now answers `fail(500, { error })` in place, form-posted or
  script-posted alike, instead of a form-posted action redirecting while a script-posted one (tidy,
  a dictionary word, an upload) got the `fail()` treatment already. The `scriptPosted` and
  `carriesNewFlag` facade options, and the request clone that supported reconstructing a dropped
  `new=1` flag on the redirect path, are removed; they had no other reader. Because this arm is
  shared, the facade's `confirm`, `logout`, `discard`, and `publishAll` actions each widen their
  own call-site return annotation to include `ActionFailure<{ error: string }>` alongside the
  `never` their underlying delegate still declares (each delegate only ever throws on its own
  deliberate success or expected-refusal path; the wrapper is what can now also return): a failed
  discard, sign-in confirm, logout, or publish-all answers in place with the same calm retry copy
  instead of navigating away on an unexpected failure. See
  [Refusal channels](docs/reference/sveltekit.md#refusal-channels). Consumers must: nothing;
  `scriptPosted` and `carriesNewFlag` were never public, since `viewAction` is internal to the
  facade, and the behavior change touches only an unexpected-failure path, not a deliberate
  success or a validated refusal.

- Every refusal that genuinely navigates (three survive: an expired sign-in link, publish-all's two
  outcomes, and the `/admin` landing relay that forwards one onward) now carries a bounded internal
  `RefusalCode` on `?error=` instead of a redirect target's own free-form string, resolved
  server-side against a small closed vocabulary that drops any value it doesn't recognize (pass
  C2b, R10 ruling; this closes a link-crafting surface documented in [the security
  model](docs/explanation/security-model.md#who-may-edit)). `RefusalCode` stays internal to the
  engine; no exported signature names it, so `ListData.formError`, `LoginData.error`, and
  `ConfirmData.error` keep their existing `string | null` type. Six other `?error=` readers now sit
  orphaned, since the redirect that used to fill them converted to `fail()` earlier in this pass,
  and are removed outright along with their data field: `EditData.error`, `EditorsData.error`,
  `NavLoadData.error`, `SettingsData.error`, `VocabularyLoadData.error`, and
  `MediaLibraryData.flashError`. See [Refusal
  channels](docs/reference/sveltekit.md#refusal-channels). **Consumers must:** drop any read of
  `EditData.error`, `EditorsData.error`, `NavLoadData.error`, `SettingsData.error`,
  `VocabularyLoadData.error`, or `MediaLibraryData.flashError`; each field is gone, not renamed,
  since its own producing refusal now answers through `fail()` instead of a redirect that carried
  it. A site that never read one of these fields directly (the common case, since cairn's own
  components already handled them) sees no change.

- The log-event vocabulary settles on one grammar (`area[.subject].verb_phrase`, past-tense for an
  occurrence or a state adjective for a detected condition) and every `reason`/`scope` value goes
  snake_case. Six renames: `admin.audit.sink_failed` to `audit.sink.write_failed`;
  `admin.action.audit_sink_failed` to `admin.action.sink_threw`; `tidy.done` to `tidy.succeeded`;
  `tidy.error` to `tidy.failed`; `media.orphan_reconcile` to `media.orphans_reconciled`; and
  `content.field_behavior_error` to `content.field_behavior_failed`. `guard.rejected`'s
  `reason: 'csrf'` and `admin.action.csrf_rejected` stay distinct on purpose (different layers).
  The media upload `reason` family goes snake_case, reaching the upload popover's own
  failure-card mapping in the same change. `github.unreachable`'s `scope` values correct to
  `shell`, `help`, and `publish_advisories` (the documented `layout` scope never fired).
  `config.invalid` gains a `scope` (`nav`, `settings`, or `vocabulary`) so its three emit sites
  and four call paths stop sharing one indistinguishable log line. See
  [Log events](docs/reference/log-events.md). **Consumers must:** update any Workers Logs saved
  query, alert, or dashboard filter naming one of the six old event names, a kebab-case media
  upload `reason`, or `github.unreachable`'s `scope: 'layout'`, to the corrected value. Nothing
  breaks at compile time, since these are runtime log values, not exported types.

- `/admin-toolkit`'s formatters settle on one nullish rule (C2 breaking-window pass, RN ruling):
  every display formatter, `formatMoney`, `formatCivilDate`, `formatTimestamp`, and `formatPhone`,
  accepts a nullish input and takes a `fallback?: string` option defaulting to `''`, so a caller
  never has to remember which formatter tolerates a missing value and which throws. `formatMoney`,
  `formatTimestamp`, and `formatPhone` widen their first parameter to `T | null | undefined` and
  gain the `fallback` option (`formatPhone` gains its first options parameter,
  `FormatPhoneOptions`, exported from `./admin-toolkit`); `formatCivilDate` already accepted
  nullish and keeps its shape, but its `fallback` default drops from the opinionated `'Not yet'`
  to `''`. `ageFromBirthdate` is unaffected: it returns `number | null`, not a display string, and
  stays outside this rule on its own documented grounds. See
  [Admin toolkit](docs/reference/admin-toolkit.md#formatts). **Consumers must:** a site that calls
  `formatMoney`, `formatTimestamp`, or `formatPhone` with a value that is statically `number`/
  `string` (never nullish) sees no change; a site relying on `formatCivilDate`'s old `'Not yet'`
  default now renders an empty string for a missing date and must pass `{ fallback: 'Not yet' }`
  explicitly to keep the old copy. This is a silent visual change, not a compile error, since the
  parameter type was already nullable.

- The admin `Strict-Transport-Security` header no longer sends `includeSubDomains` by default (the
  AI-posture pass, HSTS rider). `applySecurityHeaders` (`sveltekit/admin-response.ts`) previously
  set `max-age=63072000; includeSubDomains` on every `/admin` response unconditionally: one editor
  visit pinned the site's apex and every sibling subdomain to https in that browser for two years,
  including on a zone whose owner had left edge HSTS off, with no way for the operator to un-pin an
  already-pinned editor except by serving a corrective header from the same host.
  `max-age` still sends on every admin response the guard returns, since the admin surface is the one
  place the engine has standing to insist on https; only `includeSubDomains` becomes conditional,
  since pinning subdomains the engine knows nothing about is a decision that belongs to whoever
  owns the domain. `AuthGuardOptions` gains `includeSubDomains?: boolean`, threaded from
  `createAuthGuard`'s single call to `applySecurityHeaders`; omitted or `false` is the new default
  and matches the shape of every other `AuthGuardOptions` field, so a zero-config site sees only
  the header change, no code change. The doctor's zone-level `edge.hsts` check is reconciled to
  say so: a failing zone setting no longer reads as though nothing is protected, since cairn's own
  admin responses already carry their own header regardless of that zone setting. See
  [SvelteKit](docs/reference/sveltekit.md#createauthguard).

  The guard's rejection pages and its login redirect now send no `Strict-Transport-Security` at
  all. RFC 6797 section 8.1 has a browser replace its cached policy on every header it receives, so
  a rejection page sending `max-age` alone is not a weaker default but a policy write that clears
  the `includeSubDomains` an opted-in site's guarded responses asserted. The CSRF rejection is
  reachable by any cross-site POST carrying no session, so leaving it would have handed any page on
  the web a repeatable way to unpin an opted-in site's sibling subdomains. Omitting the header
  writes nothing, and the guarded path still pins the admin host.
  **Consumers must:** a site that wants
  the previous domain-wide pinning back sets `createAuthGuard({ includeSubDomains: true })` in its
  `hooks.server.ts`; a site that takes no action keeps `max-age` on the admin surface but stops
  pinning its sibling subdomains. Check the zone before deciding: where edge HSTS already sends
  `includeSubDomains` for the admin's host, which is the measured state on more than one site
  running this engine, set the option so the engine states the same policy rather than a weaker one.

- Site code calling `createD1AuditSink` directly with its own domain events (a roster change, a
  season rollover, anything append-only worth a durable trail) is now a sanctioned pattern, not
  only an implementation detail of `adminAction` and `createSectionAction` (the 2026-08-05
  engine-harvest sitting, ruling 1). The sink was already generic: it binds whatever
  `{ actor, action, entity, entityId, detail }` record it receives into the `actor, action, entity,
  entity_id, detail` columns with no admin-specific behavior. A namespaced action vocabulary
  (`roster.add`, not a bare `add`) keeps a domain row distinguishable from an admin-action row in
  the shared table; the existing fail-open, truncation, and `waitUntil` promises apply to a direct
  call unchanged. See [SvelteKit](docs/reference/sveltekit.md#created1auditsink).

  Sanctioning direct use means `AdminActionAuditRecord`'s identity field no longer names only a
  cairn editor, so it renames from `editor` to `actor`, matching the column it has always landed
  in: `AdminActionAuditRecord` is now `AdminActionAudit & { actor: string }`.
  `adminAction`'s own composition and the packaged sink's own read follow. Two log events follow
  the actor they can report: `admin.action.audited` (which spreads the record) and
  `audit.sink.write_failed` (composed by the sink itself, which can now fire for a non-editor
  actor) both key their identity field `actor`. `admin.action.sink_threw` fires only from inside
  `adminAction`, where the actor is always a verified cairn editor, and keeps `editor`, as do the
  auth events. `AdminActionAudit` (what a handler passes to `ctx.audit`) carries no identity field
  and is unchanged. See [SvelteKit](docs/reference/sveltekit.md#types) and
  [log events](docs/reference/log-events.md). **Consumers must:** rename any read of
  `record.editor` to `record.actor` in a hand-rolled `AdminActionAuditSink`, or in a custom
  `App.Locals` augmentation that duplicates `AdminActionAuditRecord`'s shape rather than importing
  it; a site that wires no audit sink does nothing.

### Fixed

- `@glw907/cairn-cms/auth-crypto` and `@glw907/cairn-cms/cloudflare` failed to start on Cloudflare
  Workers: both subpaths' `exports` entries published a `browser` condition pointing at a
  client-only stub that throws at import, and Wrangler's own esbuild re-bundle of the adapter
  output for `workerd` resolves that same `browser` condition, so the *server* bundle got the
  throwing stub and the Worker never started. `/auth-crypto` has carried the defect since
  `0.93.0`, the release that shipped the subpath, and it stayed latent because nothing consumed
  the subpath until this window; `/cloudflare` carried it from its first publish in
  `0.94.0-rc.1`. A consumer migration found it at an end-to-end gate, after `svelte-check`,
  `vitest`, and `vite build` had all passed; see
  [the defect filing](docs/internal/feedback/2026-08-05-rc1-worker-condition-defect.md). The fix
  adds a `worker` condition ahead of `browser` in both entries, pointing at the same module
  `default` does, so a Workers build resolves the real module while a browser build still hits the
  throwing stub. A packaging check now fails the build when a `browser`-conditioned export declares
  no `worker` condition ahead of it, and a resolver probe runs the built package under Wrangler's
  own condition set to confirm the real module resolves. **Consumers must:** nothing.

- The dev-backend build fence taught by `@glw907/cairn-cms-dev` did not eliminate. A site gating the
  dev backend on a shared exported constant (`export const devBackendEnabled = dev && ...`, the shape
  the package's README and the tutorial both taught) ships the whole dev backend in its deployed
  Worker: SvelteKit's SSR build folds the constant to `false` inside its own chunk and never
  propagates that value across the module boundary, so every consuming `if` and its dynamic
  `import()` survive. The code is unreachable behind the literal `false`, and cairn's own 503
  `dev_backend_in_prod` tripwire still backstops it, so nothing is exploitable; the fake auth store,
  the R2 and Anthropic doubles, and the seed editor identity ride into the bundle regardless. The
  README, the tutorial, and the showcase now name a build-time flag at each call site (a Vite
  `define`) so each branch folds where it is written. **Consumers must:** if you followed the old
  shape, replace the shared constant with a `define` named directly in every `if` that guards a
  dev-backend import, and verify with `npx wrangler deploy --dry-run --outdir=<dir>` plus a grep of
  that output for `devBackendHandle`. Grepping `.svelte-kit/cloudflare` proves nothing under
  adapter-cloudflare 7: it holds a loader and assets, not the server code wrangler bundles.

- `scripts/check-reference-signatures.mjs`'s `normalizeSignature` stripped every `| undefined`
  unconditionally, so the exported surface's own nullability (`ContentIndex.byId`,
  `SiteResolver.byPermalink`, `CookieJar.get`, the access-map helpers, and more) never showed up
  in a signature diff; the comment it carried claimed no deliberately-required `T | undefined`
  existed on the surface, which stopped being true once `createD1AuditSink`'s `waitUntil` and the
  rate-limit helpers' `binding` shipped. It now strips a `| undefined` only where the enclosing
  `?:` makes it an optional-parameter artifact, so a required union survives.
  `docs/internal/api-surface.md` regenerates with nullability visible for the first time, across
  all 16 export subpaths (27 entries changed). Internal tooling only; the reference pages
  themselves were already correct. Consumers must: nothing.

- `adminAction`'s `ctx.audit` now holds the audit sink's advertised fail-open promise at its own
  call site, not only by a sink's own discipline: a hand-rolled `event.locals.cairnAuditSink` that
  throws synchronously, or one that returns a rejecting promise (the seam's `(record) => void`
  type admits an async sink through void-return bivariance), no longer fails the wrapped action
  either way; the failure logs a new `admin.action.sink_threw` event instead. The same
  catch also rethrows SvelteKit's own `redirect()`/`error()` untouched, so a sink built on one of
  those control-flow primitives is never swallowed into a log line the site never sees. See
  [SvelteKit](docs/reference/sveltekit.md#adminaction) and [log
  events](docs/reference/log-events.md). Consumers must: nothing; a throwing or rejecting sink
  previously failed the action and now does not.

- `TidyResult.usage` renames to `TidyResult.tokens`: the token-usage field collided with
  `MediaDeleteRefusal.usage` (the where-used rows) inside SvelteKit's generated `ActionData` for
  the admin route once every content action carried a precise `ActionFailure<T>` (the sharpening
  landed earlier in this window), which made `<CairnAdmin {form} />` fail `svelte-check` on every
  consumer site. A type-level assertion in the library's own test suite now checks every facade
  action's awaited return, successes included, against `CairnAdmin`'s `form` prop type, so a
  future field-name collision across actions fails a compile rather than shipping unnoticed. See
  [SvelteKit](docs/reference/sveltekit.md#createcontentroutes). **Consumers must:** rename any read of
  `TidyResult.usage` to `TidyResult.tokens`.

- `requireAccess`'s default `event.route.id` derivation (and `createSectionAction`'s own copy)
  silently fell back to a shallower access-map key when a deeper key sat under a dynamic route
  segment: a route id's `[id]`/`[...rest]` segment can never equal a deeper key's own literal
  text, so a site that keyed both `/admin/money` and the stricter `/admin/money/payroll` under a
  dynamic `/admin/money/[report]` route saw the deeper rule silently never apply, admitting the
  shallower role instead (a review finding on this pass's own `route.id` change, caught before
  release). The match now refuses outright rather than falling back whenever a map holds a key
  deeper than a dynamic segment, so `requireAccess`/`createSectionAction` 403 and force an
  explicit `target` for a route this ambiguous, the same posture the fail-closed unmatched case
  already takes. A `defineAccess` screen-id key may no longer contain `(` or `)` either, closing
  off the shape of the internal fail-closed sentinel a null or all-groups route id resolves to.
  See [`requireAccess`](docs/reference/sveltekit.md#requireaccess). Consumers must: nothing for a
  correctly configured map (one concrete key per route); a site relying on the shallow-fallback
  behavior under a dynamic segment now sees a 403 and should declare `target` explicitly.

- A refused first save or publish of a brand-new entry rendered a 404 and lost the draft: `?/save`
  and `?/publish` resolve as query-only references against the page's own URL, replacing the whole
  query (RFC 3986 §5.3), so a validation `fail()`'s load re-run lost `?new=1` and `editLoad` 404'd
  on the not-yet-committed entry instead of rendering the refusal. `EditPage`'s form now carries
  `&new=1` on its own POST target for a new entry, so the flag survives the re-run. Two related
  refusal-visibility gaps close alongside it, review findings on this pass's own `fail()`
  conversion: `publishAllAction`'s unexpected (non-conflict) commit failure and a failed session
  logout both post to the bare `/admin`, whose own load unconditionally redirects away before it
  can render a `fail()`'s payload, so each now answers on its own redirect channel instead
  (publish-all gets a new bounded `publish_failed` code; logout clears the cookie before, not
  after, its own best-effort session-row delete, so a D1 fault never leaves both the row and the
  cookie valid). A `?/mediaUpdate` or `?/mediaAltPropagate` conflict lost its visible channel
  entirely when the query-error relay it used to ride was removed earlier in this pass;
  `MediaUpdateFailure`/`MediaAltPropagateFailure` now carry the asset's `hash` (optional; a
  pre-hash failure in the alt-preview fetch action still has none), so the Library's existing
  re-surface effect can re-open the right slide-over, and a hash-less refusal (no asset to
  re-home to) now renders in a new top-level banner instead of nowhere. The login and confirm
  pages likewise now render an unexpected action failure's own message instead of silently doing
  nothing (`ConfirmPage` gains a `form` prop for this). See [Refusal
  channels](docs/reference/sveltekit.md#refusal-channels). Consumers must: nothing; every changed
  surface (`EditPage`, `LoginPage`, `ConfirmPage`, `CairnMediaLibrary`) is an internal component
  behavior fix, and `MediaUpdateFailure.hash`/`MediaAltPropagateFailure.hash` are additive optional
  fields.

### Documentation

- [Add a login channel](docs/guides/add-a-login-channel.md) gains a "Prove your channel" section:
  `createChannelDb` (`@glw907/cairn-cms-dev`, the in-memory `node:sqlite` double for a channel's
  own D1 binding, with its Node.js 22.13 floor), the capture-transport pattern for a `deliver`
  that records instead of sends, the fixture-roster-only rule for a capture transport's readback
  route, the warning against wrapping a dev-only transport in a deployed Worker with observability
  turned on, and the origin-check boundary a site keeps in mind if it disables SvelteKit's own
  built-in check elsewhere. The showcase's own member fixture
  (`examples/showcase/src/members/`, `examples/showcase/src/routes/members/`, and
  `examples/showcase/e2e/members.spec.ts`) is the section's worked exemplar, with its two
  deliberate divergences from a real site named. No consumer action.

- The `./sveltekit` reference documents the admin action surface's refusal channels: the
  framework-native `error()`/`redirect()` shared by `requireOwner`/`requireEditor`/`requireAccess`/
  `requireSession` and `adminAction`'s own authorization guards, `fail(...)` from
  `createSectionAction`'s own branches, and, internal to the engine only, the built-in actions' own
  redirect and the guard's pre-routing raw `Response`. It rules on the seams whose sync-or-async
  color was previously undocumented (`ComponentDef.build`, `FieldsetOptions.refine`,
  `RendererOptions.sanitizeSchema`, and the resolver family). A new reference page,
  [Supported toolchain](docs/reference/supported-toolchain.md), states the package's
  minimum-supported and proven-against versions for `@sveltejs/kit`, `svelte`, `vite`,
  `typescript`, `node`, and TypeScript module resolution. No consumer action.

- Every one of the package's fifteen export subpaths now carries a stated membership rule, in its
  barrel header comment and in its reference page's opening: what belongs, and a plausible
  candidate ruled out. [Auth crypto](docs/reference/auth-crypto.md#tokensmatch)'s `tokensMatch`
  section also gains a fourth caller precondition: `TextEncoder` maps a lone (unpaired) surrogate
  to the replacement character, so two distinct strings differing only in a lone surrogate encode
  to the same bytes and compare equal, harmless for the CSPRNG tokens and hex hashes the function
  is for. No consumer action.

## 0.93.0

<!-- release-size: minor -->

### Added

- A new server-only export subpath, `@glw907/cairn-cms/auth-store`, re-exports the D1
  editor-provisioning functions the engine's own `editors-routes` already uses:
  `listEditors`, `insertEditor`, `deleteEditor`, `setEditorRole`, `removeOwnerIfNotLast`,
  `insertOwnerIfEmpty`, and `demoteOwnerIfNotLast`, plus the `EditorRow` and `Role` types. A
  site that provisions or manages editors from its own server code, a setup script, or a
  migration now reads and writes the same rows the `ManageEditors` screen does, instead of
  reimplementing the D1 statements. See [Auth store](docs/reference/auth-store.md). Consumers
  must: nothing.

- A new server-only export subpath, `@glw907/cairn-cms/auth-crypto`, re-exports the token and
  session-id generators, the token hash, the constant-time compare, and a new `__Host-`
  cookie-naming primitive: `generateToken`, `generateSessionId`, `generateCsrfToken`,
  `hashToken`, `tokensMatch`, and `cookieName`. A site authenticating a second audience, member
  magic-link sessions, offer tokens, an OTP flow, reuses the same cryptography primitives the
  engine's own login proves in production instead of copying them by hand. See [Auth
  crypto](docs/reference/auth-crypto.md). Consumers must: nothing.

- A new factory on `@glw907/cairn-cms/sveltekit`, `createSectionAction`, composes onto
  `adminAction` the enforcement every site-built admin section otherwise hand-rolls: an
  optional per-action rate limit (degrade-to-open, structurally typed as `RateLimitLike`, so no
  dependency on `@cloudflare/workers-types`), the section's own database binding, and the same
  access-map check `requireAccess` runs (`hasAccessRule` then `canReach`, audited on every
  refusal, with all three 403 branches emitting the existing `auth.access.denied` and both 500
  branches the new `admin.action.misconfigured`). Authorization runs before the
  database-binding check, so a session the access map refuses never learns whether the
  section's binding is deployed, and `resolveDb` returning `null` fails closed the same as
  `undefined`. A rate limit's `key()` or `limit()` call throwing still degrades to open, but now
  logs a distinct `admin.action.rate_limit_failed`, so a transient limiter error reads apart
  from `admin.action.rate_limit_absent`'s "no binding at all". `AdminActionEvent` becomes
  generic over the site's platform env (`Env = AuthEnv` by default, so every existing call site
  keeps today's meaning) and `App.Locals` (via `@glw907/cairn-cms/ambient`) gains
  `cairnAccess?: AccessMap`, the map `createAuthGuard` already attaches. See
  [SvelteKit](docs/reference/sveltekit.md#createsectionaction) and [log
  events](docs/reference/log-events.md). Consumers must: nothing.

- The content manifest gains `ManifestEntry.publishedAt`, an ISO 8601 UTC stamp a publish
  action writes once, at the commit that first lands an entry non-draft, and never overwrites
  or clears afterward. An entry already non-draft and unstamped before this release stays
  unstamped; only a future transition into published stamps. A new pure helper,
  `newlyPublishedEntries(before, after)` on `@glw907/cairn-cms/delivery/data`, diffs two
  manifests down to the entries that just carried that transition and are still currently
  live, so a site can detect a first publish and fan out its own notification with no engine
  networking or scheduling involved. The same subpath also re-exports `Manifest` and
  `parseManifest`, so a consumer can name and validate the manifest it fetches to build
  `newlyPublishedEntries`'s `before`/`after` pair without hand-casting JSON. See [Announce on
  publish](docs/guides/announce-on-publish.md) and [Delivery
  data](docs/reference/delivery-data.md#diffnewlypublished) (renamed `diffNewlyPublished` by the
  conventions pass, Task 3). Consumers must: nothing; the
  field is additive and optional, and the stamp only ever appears on a publish that happens
  after the upgrade.

### Changed

- CodeMirror dependencies updated to the latest 6.x releases within the existing ranges
  (`@codemirror/state` 6.6.0 to 6.7.1, `@codemirror/view` 6.43.0 to 6.43.7, plus patch bumps to
  `autocomplete`, `commands`, `language`, and `lang-markdown`). Lockfile-only; the full gate
  (`check` 0/0, 4552 tests, `check:cm-internals`) passes on the new versions. Consumers must:
  nothing.

## 0.92.0

<!-- release-size: minor -->

### Added

- `FieldLabel`, `SelectField`, and `TextField` (`@glw907/cairn-cms/admin-fields`) gain a
  `register: 'inline' | 'stacked'` prop (design ratchet Task 3, closes finding 3): `'stacked'`
  puts the label on its own line above the control, the individual-field-label recipe already
  proven inside the engine's own `FieldInput`; `'inline'` keeps the prior label-beside-control
  layout. A `.cairn-field-stacked` sheet hook fills a stacked control to its container, so a
  consumer cannot forget `w-full`, and a stacked field in a wide multi-column grid track fills its
  own cell edge-to-edge instead of clamping to daisyUI's fixed 20rem default. The hook matches only
  a control that's a direct child of the label (fix A2, item 1), not any descendant, so a
  consumer composing a compact row, a flex wrapper holding two or more narrower controls side by
  side, inside a stacked field can nest it and keep the row's own
  width choice instead of every nested control being forced to fill the row. **`'stacked'` is now
  the default**, a deliberate breaking change (ratified by Geoff 2026-07-30): defaulting to inline
  reproduces the harvest's trap shape, where the register that staircases in a grid stays the
  effortless path. `docs/reference/admin-fields.md` documents both registers and the compact-row
  escape; `skills/cairn-admin-screens/references/form-anatomy.md`'s composition-width guidance now
  points at `register="stacked"` by name. **Consumers must:** pass `register="inline"` on any
  `FieldLabel`/`TextField`/`SelectField` call whose inline label-beside-control layout should
  survive the upgrade; every other call renders the new stacked default. A stacked field composing
  a compact row needs no extra care: the width hook already reaches only its direct child.

- `cairn-audit`'s rendered rule set gains three geometry rules (design ratchet Task 5, the
  mechanical halves of findings 1, 3, and 6), the cap the plan set at three: `form-font-parity`
  asserts every rendered `input`/`select`/`textarea`/`button` computes the same first
  `font-family` as the admin root, the UA reset layer's own regression tripwire; registered
  **provisionally at advisory**, promoted to error only once a CI re-check confirms the rendered
  suite is green against cairn's own admin and showcase on the CI runner.
  `field-edge-alignment` (advisory) is the staircase detector: two or more form controls in the
  same visual column of a grid or flex-column container must share a left edge within 1.5px, the
  shape an `inline`-register field with a varying label width produces.
  `container-inset-asymmetry` (advisory) is the phantom-gutter detector: a `.card-shell`, `.list`,
  or `.modal-box` container whose content sits more than 24px closer to one side than the other.
  `docs/reference/cairn-audit.md`'s rule table gains all three rows.

  Consumers must: nothing; both `field-edge-alignment` and `container-inset-asymmetry` are
  advisory and `form-font-parity` is provisionally advisory, so none changes the exit code yet.

### Changed

- `cairn-audit`'s `one-filled-action` rendered rule narrows the landmarks that partition a
  surface from `<main>, <nav>, <aside>, <header>, <footer>` to just `<nav>` and `<aside>`
  (design ratchet Task 4, closes finding 4, ratified by Geoff 2026-07-30): the topmost open
  dialog layer still stands apart from the page beneath it, and a nav rail's persistent chrome
  still partitions, but `<header>`, `<footer>`, and `<main>` itself no longer do. A DOM boundary
  between a page header and the card beneath it removed none of the harm the rule exists to
  catch, same visual column, same first look, so it was never a real partition. The same change
  pushes a segmented control's selected state off `btn-primary` (now two primaries on one surface)
  and onto `btn-active`, which rebuilds the dark theme's `.btn-active`. The fill mixes `--btn-color`
  (or `--color-base-200` when no variant is set) toward white rather than daisyUI's own toward-black
  mix, so a variant selected control (`btn btn-primary btn-active`) keeps its hue and chroma instead
  of collapsing to a flat neutral, while the neutral case lands a 0.05-0.07 oklch-lightness step off
  a plain `.btn`, up from 0.011 before this change, in the dark Warm Stone family's own hue. That
  step is perceptual, not photometric: near-black compresses sRGB luminance, so the lighter fill
  alone measures 1.14:1 against an unselected sibling. The 3:1 cue WCAG 1.4.11 asks for therefore
  rides on the border, the design system's 1px inset hairline in the family's own ink, which
  measures 3.85:1 against the selected fill, 3.68:1 against the base-100 ground, and 4.37:1 against
  an unselected sibling's fill. The hairline carries no `color-mix`, so an engine without
  `color-mix` support still gets the cue. A companion `:hover` step keeps the selected control's
  hover feedback, which the resting override would otherwise have taken away, gated on
  `@media (hover: hover)` so a tap does not strand it. `btn-outline btn-active` becomes legible:
  daisyUI fills an active outline button but leaves its ink at the outline color, 1.20:1 on dark,
  and the override now restates that ink off `--btn-fg` (6.67:1 for the primary case). A disabled
  selected control keeps daisyUI's own transparent border and fill. The `EditorToolbar` Write and
  Preview tabs mark the selected tab with a check glyph, the non-color state cue WCAG 1.4.1 asks
  for and the device `ListToolbar`'s segmented facet already uses. **The light theme was
  unchanged at first release**: every rule here shipped scoped to the dark root alone, and the
  tabs' unselected `btn-ghost` is the class they already carried; a later pass widens the outline
  fix to light too (see the `.btn-active` outline/dash entry further down). `docs/reference/cairn-audit.md`'s
  `one-filled-action` row states the narrowed partition and its reasoning. A sweep of cairn's own
  admin and the showcase found no screen newly failing.

  **Consumers must:** treat a screen with a filled header action above a filled card action as a
  finding: demote the non-primary fill to `btn-ghost` or `btn-outline`. Never loosen the rule to
  pass a screen.

### Fixed

- The packaged admin sheet ships a `base` cascade layer, so a bare form control, `dialog`,
  `fieldset`/`legend`, or daisyUI's own `.list` container no longer renders its browser
  default inside the admin frame. `scripts/admin-css.input.css` reorders its `@layer`
  declaration to `theme, base, components, utilities`, so the reset loses to daisyUI's
  component classes and to any consumer override, while still beating unstyled UA defaults.
  Visible changes: a bare `<textarea>` (and any un-classed button, input, select, or optgroup)
  now renders the admin's own IBM Plex Sans face and inherited color instead of the browser's
  UA font; a `<textarea>` resizes vertically only, never horizontally; a native `<dialog>` loses
  Chrome's UA border frame; a bare `<fieldset>`/`<legend>` loses its UA border, margin, and
  padding (daisyUI's own `.fieldset` class is unaffected); and daisyUI's `.list` container loses
  the UA's 40px bullet-marker gutter. The reset never touches a bare `ul`, `ol`, heading, or `p`,
  since the admin wrapper also hosts the editor's rendered markdown preview.

  Consumers must: nothing.

- The `base` reset above scoped and narrowed two of its rules (design ratchet D2 items 1 and 2,
  reviewer triage): the `dialog` border reset now targets `dialog:where(.modal)`, the shape
  every cairn dialog renders, so a bare `<dialog>` in a consumer's own custom admin route keeps
  its UA border rather than losing its only visual boundary (WCAG 1.4.11); and the `.list`
  reset drops `list-style: none`, which strips list semantics from the accessibility tree in
  WebKit/VoiceOver (WCAG 1.3.1) and was never load-bearing, since daisyUI's own `.list-row`
  renders `display: grid` and so never generates a marker box regardless of `list-style`.

  Consumers must: for a bare `<dialog>` in a custom admin route, nothing (it already kept its UA
  border; this only narrows what the reset touches). For `.list`, only a consumer whose own
  `<ul class="list">` holds children that are NOT daisyUI's `.list-row` (which never rendered a
  marker anyway): those children now render the browser's default bullet again. Add
  `list-style: none` locally to keep them suppressed.

- The `btn-active` ink override that repairs `.btn-outline`/`.btn-dash`'s selected-state
  composition is now theme-agnostic (design ratchet D3 items 1-2, review triage): it shipped
  dark-only inside the neutral `.btn-active` fill rule above, so being unlayered it also
  outranked a plain selected control's OWN text utility (`btn btn-active text-error` painted
  `--btn-fg` instead of `text-error`'s ink, dark only). Split into its own rule scoped to
  `:is(.btn-outline, .btn-dash)`, it now touches neither a plain selected control's text utility
  (restored on dark) nor the light theme (previously untouched, and stock daisyUI's own light
  `.btn-outline btn-active` composition is illegible: measured 1.17:1, worse than dark's own
  pre-repair 1.20:1). Both themes now measure legible: light 6.61:1 primary / 11.44:1 neutral,
  dark 6.67:1 primary / 14.00:1 neutral.

  Consumers must: nothing for a plain selected control (`btn btn-active`, no outline/dash
  variant); its text utility already resolved correctly except on dark, which this restores.
  Anyone reading `btn-outline`/`btn-dash` selected-state ink off `--btn-color` on the light theme
  (the prior stock composition) sees it now resolve off `--btn-fg` instead, the same repair dark
  already shipped with.

- The `cairn-admin-screens` skill's own reference docs are now gated against the built admin
  sheet: a new unit test extracts every class token the references teach (a static `class="..."`
  attribute inside a fenced example, an inline code span that is a pure class list) and asserts
  each resolves against `cairn-admin.css`. `form-anatomy.md` prescribed `gap-x-6 gap-y-4` for a
  two-column form grid, a pair the sheet never compiled (the named `gap-group`/`gap-section`
  roles both set the single `gap` shorthand and cannot express an axis split, so the raw pair is
  the deliberate recipe); the gate also caught `exemplar-detail.md`'s divided-list row rhythm
  (`divide-y`, `divide-[var(--cairn-card-border)]`, `first:pt-0`, `last:pb-0`) never reaching the
  sheet either. All six join the labeled compatibility safelist in `scripts/admin-css.input.css`
  as documented interface classes, naming the reference doc each serves.

  Consumers must: nothing; the six classes now compile and render as the exemplars already
  describe.

## 0.91.1

<!-- release-size: patch -->

### Fixed

- The shipped admin sheet restores the nineteen class rules `0.91.0` silently dropped
  ([#12](https://github.com/glw907/cairn-cms/issues/12)). The sheet compiles from Tailwind
  scanning cairn's own source, and the `0.91.0` window migrated cairn's tree off the named type
  steps onto the grammar roles, so Tailwind tree-shook the newly unused utilities out of the
  compiled sheet: `text-sm`, `text-xs`, `text-lg`, `text-base`, `text-2xl`, `text-3xl`, `gap-6`,
  `tracking-tight`, `badge-ghost`, and ten bracketed arbitrary sizes (`text-[0.625rem]` through
  `text-[1.0625rem]`). Consumer admin markup resolves its classes from that sheet, so markup
  riding any of the nineteen rendered unstyled on `0.91.0` while the upgrade guide promised no
  rendering change. All nineteen are back through a labeled compatibility safelist in the sheet's
  compile input, and the sheet's class inventory is now a gated contract: a snapshot test diffs
  the built sheet's inventory against a committed snapshot, so a class can leave the shipped
  sheet only as a deliberate, changelog-carried act.

  Consumers must: nothing, coming from `0.90.1` or earlier; the sheet again carries every class
  it did there. Coming from `0.91.0`, upgrade and any custom admin markup that lost its styling
  (most commonly `text-sm`) styles again with no markup change.

## 0.91.0

<!-- release-size: minor -->

### Added

- The admin's structural type and spacing scale is now named: ten CSS custom properties
  (`--cairn-type-title/subtitle/body/meta/label/chip`, `--cairn-gap-label/control/group/section`)
  declared once in `cairn-admin.css`, outside the light and dark theme blocks, so a heading's size
  or a control-to-control gap holds across both themes. Ten role utilities
  (`type-title`/`type-subtitle`/`type-body`/`type-meta`/`type-label`/`type-chip`,
  `gap-control`/`gap-label`/`gap-group`/`gap-section`) are the supported way to reach a token from
  markup; each sets one property and nothing else. All ten ship in the compiled admin stylesheet
  whether or not cairn's own screens use them, so a role is available to a custom admin route on
  the strength of the documentation alone. See [Admin grammar
  tokens](./docs/reference/admin-grammar-tokens.md).
- `src/lib/admin-toolkit` and the built-in engine admin screens migrate their on-scale type and
  spacing literals to the new role utilities and tokens, pixel-identically: the committed
  admin-visual snapshots do not move. The toolkit's scoped styles carry the measured literal as a
  `var()` fallback, since those components can mount outside the admin theme root; engine screens
  reference the token bare.
- The palette/grammar boundary is now a documented contract: a site re-tunes the palette tokens
  (`--color-*`) to its own brand and never redeclares a grammar token, since grammar names
  structure and palette is the brand layer.
- The type scale closes at seven roles, each carrying a ruled line-height, and the grammar
  inventory grows from ten custom properties to eighteen. Every type role gains a paired
  `--cairn-type-<role>--leading` token, and a seventh role, `--cairn-type-heading` with its
  `type-heading` utility (18px, bold, the display face), unifies the two heading recipes the admin
  had been running side by side. Each `type-*` utility now declares
  `line-height: var(--tw-leading, var(--cairn-type-<role>--leading))`, so a `leading-*` utility
  still composes over a role rather than being overridden by it. cairn's own admin screens migrate
  onto the closed scale: 129 named type steps, 120 twelve-pixel sites resolved onto `type-meta` or
  `type-label` by the relationship each site expresses, both heading families onto `type-heading`,
  and the stray 9.6px and 11.2px slips onto `type-chip` and `type-label`. Five sites keep a value
  off the scale and each carries a counted suppression directive naming why: the three wordmark
  sites (the K4 keming fix) and the editor canvas and its document title, which set the editor's
  own type scale rather than the admin chrome's. The losing heading family and part of the
  twelve-pixel set change size by ruling, so the `admin-visual` baselines were regenerated once on
  CI and read by eye. See [Admin grammar tokens](./docs/reference/admin-grammar-tokens.md).
- Two container role utilities, `card-shell` and `card-shadow`, are the supported replacement for
  hand-copying the admin's card-shell class string
  (`rounded-box border border-[var(--cairn-card-border)] bg-base-100`, optionally with
  `shadow-[var(--cairn-shadow)]`). `card-shell` carries the shell's radius, hairline border, and
  fill; `card-shadow` carries its elevation, kept separate because a surface already nested inside
  a shadowed container takes `card-shell` alone. Both ship in the compiled admin stylesheet
  regardless of cairn's own usage, the same safelist discipline as the eleven grammar role utilities.
  cairn's own admin components migrate every verbatim shell site onto the new utilities,
  pixel-identically. See [Admin grammar tokens](./docs/reference/admin-grammar-tokens.md).

- The package ships a new bin, `cairn-audit`, the design-language audit. An install puts it on the
  project's path, and `npx cairn-audit` runs the static rules over the admin surfaces. The
  substrate is `svelte/compiler` for markup and the built `cairn-admin.css` for resolution, never a
  regex over source text: a class token is matched exactly, so `text-base` (the size utility) and
  `text-base-content` (the daisyUI color utility) can never read as the same class, and a class
  written as an array, an object, a template literal, or a `class:` directive is seen the same as
  one written in a plain attribute. Configuration is one optional `cairn-audit.config.json` whose
  every key defaults, so a site that has written no config still gets a meaningful run; a config
  that names a scan path the tree does not have fails the run instead of quietly auditing less.
  See [The `cairn-audit` CLI](./docs/reference/cairn-audit.md).

- Nine static rules ship, all error tier. `no-uncompiled-class`: every markup class token compiles
  into the built sheet or is a name the component's own `<style>` block defines. `type-scale`:
  every font size a text-sizing token resolves to comes from a `--cairn-type-*` role.
  `gap-scale`: an arbitrary margin, padding, or gap literal resolves to a `--cairn-gap-*` role or
  lands on Tailwind's own spacing grid. `stock-default-hazards`: four stock daisyUI patterns
  cairn's own recipes replace (`badge-ghost`, the focus-driven bare `.dropdown`, native `disabled`
  on a guarded button, a flat `base-300` card border), each finding citing the refuted alternative
  on record. `token-colors`: no raw hex, `rgb()`, named-color, or pure-achromatic literal outside a
  declared palette site. `grammar-boundary`: consumer CSS never redeclares a grammar token.
  `focus-parity`: every hand-authored `:hover` selector has a matching `:focus-visible` or
  `:focus-within`. `motion-band`: every declared duration lands in the admin's 150 to 250ms band,
  and `transition: all` never ships. `reduced-motion`: every motion-bearing selector is named again
  inside a `prefers-reduced-motion: reduce` guard.

- Suppression is a co-located, reasoned, counted comment:
  `cairn-audit-disable-next-line <rule-id> -- <reason>`, in HTML, `//`, or `/* */` form. The reason
  is required, a directive that silences nothing is itself a finding, and neither of those errors
  can be suppressed in turn, so a build that passes by suppression reads as one. "Next line"
  resolves to the next AST node rather than the next physical line, which is what makes a directive
  above a multi-line element attach to that element's whole source range. This replaces the
  file-plus-token JSON allowlists the repo's own gates carried, whose entries orphaned silently on
  a rename and exempted a whole file at a time.

- Two repo gates graduate onto the packaged engine and keep their names and their places in CI.
  `npm run check:invisible-craft` now runs `motion-band`, `gap-scale`, and `token-colors`, and
  `npm run check:admin-css-classes` runs `no-uncompiled-class`; both are thin wrappers, and the
  hand-rolled comment strippers, brace-matched attribute scanners, and duration and color regexes
  they carried are gone. Their two JSON side files go with them: every entry in
  `admin-css-classes-allowlist.json` proved already dead, and each entry in
  `invisible-craft-budget.json` resolved to a regex false positive the new rules recognize as
  compliant, a site outside the audited scope, a declared palette file, or a co-located suppression
  directive at the site itself.

- The package now ships a norms manifest: the admin's measured design norms as data, derived by
  rendering the admin screens in both themes and reading the computed styles of twelve semantic
  roles. `npx cairn-audit norms <selector-or-role>` answers from it, so a developer or an agent
  building a new admin surface reads a measured control height, padding ratio, border treatment,
  radius, or type recipe instead of inferring one from a screenshot. Each entry states the band, how
  many distinct element sites it rests on, whether a ratified decision settles it, and every caveat:
  an entry an open design question governs is flagged and never reads as settled, a band resting on
  one site says so, and a palette-dependent property is stored as a relationship
  (`var(--cairn-card-border)`, a `color-mix` formula) rather than a resolved Warm Stone value, so a
  re-tuned palette invalidates nothing. See [The `cairn-audit` CLI](./docs/reference/cairn-audit.md).

- `cairn-audit`'s rendered mode has a working harness. It renders every configured admin page in
  both themes, always, since a rendered rule can pass one theme and fail the other; it never starts
  a server (BASE_URL must already answer, or the run fails naming the URL it tried), and it imports
  Playwright dynamically from the consumer's own install, printing a one-line
  `npm i -D playwright && npx playwright install chromium` instruction when it is absent. A rule
  declares which interaction states it reads from (a rest render, an open menu, a keyboard
  focus-visible pass), so a rule that never needs a menu-open pass never pays for one. Exemptions
  live in a page+selector+reason JSON allowlist (`rendered.allowlist` in
  `cairn-audit.config.json`), the same reason-required discipline the static suppression comments
  carry; an allowlist entry whose selector matches nothing the run actually visited is reported as
  a stale entry rather than silently doing nothing, the same fail-loud discipline every other part
  of the engine holds. See [The `cairn-audit` CLI](./docs/reference/cairn-audit.md).

- `npx cairn-audit --rendered` runs, and the six error-tier rendered rules spec 6.3 defines are
  registered: `one-filled-action` (at most one accent-filled control per surface),
  `focus-renders` (every tab stop renders a focus indicator), `interactive-contrast` (interactive
  text against its own composited background at a ratio of at least 1.5), `touch-targets` (a tap
  target's activation region at a 390px viewport), `viewport-overflow`
  (nothing wider than the viewport at 390 and at 320), and `chip-ground-collision` (a chip's fill
  distinguishable from the background behind it). A rendered rule that compares two colors resolves
  them by painting each on a canvas in the page and reading the sRGB bytes back rather than parsing
  color syntax, so a themed admin in any color space (cairn's own palette is `oklch` end to end)
  measures correctly. A rule that cannot make its measurement, a gradient leaves no single ground
  to compare against, reports an advisory finding naming what it could not read rather than
  skipping silently. See [The `cairn-audit` CLI](./docs/reference/cairn-audit.md).

- The five advisory rendered rules spec 6.3 defines are registered, completing the rendered rule
  set at eleven: `border-contrast` (a border reads at 3:1 against at least one of the two surfaces
  it separates), `weight-budget` (at most two distinct font-weights per content region),
  `norms-bands` (a component's geometry against the bands the norms manifest observed),
  `screen-anatomy` (one PageHeader h1, content in the card region, no accent-filled action buried
  outside both), and `relational-spacing` (the `--cairn-gap-*` scale matches the relationship the
  markup renders). Advisory means advisory: none of the five can change the process exit code,
  through its own findings, through a selector the browser cannot parse, through a stale
  suppression, or through a throw inside a rule.

- Rendered rules share one set of in-page measurement helpers rather than each carrying a copy, so
  "is this visible" and "what selector names this element" mean one thing across the rule set. An
  element the visually-hidden recipe clips is no longer counted as rendered, an element under an
  ancestor `opacity: 0` is no longer measured, and every reported selector is escaped, so a
  Tailwind class such as `lg:ml-56` stays a valid CSS selector the allowlist can match on.

- A rendered allowlist entry may name the rule it exempts (`"rule": "border-contrast"`). A stale
  entry is then reported at that rule's own tier, so suppressing an advisory finding cannot gate
  the build when the selector later churns. An entry whose selector the browser refuses to parse
  reports separately and always advisory, since unreadable is a different claim from stale.

- A rendered rule that throws reports a finding at its own tier instead of aborting the run. A rule
  that reads a file inside its check (`norms-bands` reads the shipped manifest) could otherwise
  take an entire audit to exit code 2 on a substrate condition in a consumer install.

- Four design rulings settle what three rendered rules enforce, each recorded in the rule's own
  source and on the reference page so the reasoning does not have to be re-derived.
  `touch-targets` enforces a 24x24 floor, the number WCAG 2.2 level AA's success criterion 2.5.8
  sets, rather than AAA's 44x44, since AA is the conformance level cairn can honestly claim. The
  rule is a strict superset of that criterion rather than an implementation of it, so a finding is a
  house-bar failure and not on its own an AA failure; four of the criterion's five exceptions are
  not evaluated, and each finding says so. It measures the activation region rather than the painted
  box: the control's own box, a qualifying `::before` inset expansion, and every label the platform
  reports as activating the control. The `--cairn-card-border` hairline is a ratified exception,
  exempt at the rule rather than blanket disabled, so `border-contrast` still reports every other
  boundary. `chip-ground-collision`'s floor of 1.5 is ratified, and it and `interactive-contrast`
  share both the number and the reason: each tests that a control or a chip is not accidentally
  camouflaged against its own ground, which is a different claim from legibility. Legibility is WCAG
  1.4.3 Contrast (Minimum), at 4.5:1, and no rule in this engine measures it; the reference page now
  states the engine's whole WCAG coverage boundary rather than leaving a reader to infer one.
  `weight-budget`'s content region excludes chrome, and chrome is defined by HTML tag and the
  equivalent ARIA role rather than by class, so a rewritten component stays covered.

- A rendered rule can declare its own exemption, for a ratified exception no page+selector entry
  names and no source-positioned comment can reach: a design token every recipe shares, on every
  page. An exemption suppresses without silencing. The rule still constructs the finding, the
  finding still carries its own measurement, and it reaches the report's suppressed list with the
  ruling printed beside it. Only an advisory rule can exempt itself; on an error-tier finding the
  run refuses the reason, prints the refusal, and the exit code stands, because a gate any rule
  could quiet in one line is worth no more than the runs it passes. The allowlist gains the
  matching honesty in the other direction: an entry whose selector still matches an element while
  suppressing nothing reports as a dead entry, at the tier of the rule it names.

- `cairn-audit --rendered` reads an optional `CAIRN_AUDIT_COOKIES` environment variable, Cookie-
  header syntax (`name=value` entries separated by a semicolon), and adds every parsed cookie to
  each browser context alongside the theme cookie. This is how a rendered run reaches a consumer's
  authenticated admin, a session cookie against a local `wrangler dev`, since the run-specific
  credential belongs in the environment rather than the config file, the same reasoning `BASE_URL`
  follows. A malformed entry throws rather than the parser silently skipping it, and an entry named
  `cairn-admin-theme` throws too, since the run owns that cookie itself. See [The `cairn-audit`
  CLI](./docs/reference/cairn-audit.md#auditing-an-authenticated-admin).

- `StatusChip` (`@glw907/cairn-cms/admin-toolkit`) gains a `register: 'bounded' | 'quiet'` prop
  (design infrastructure Pass 3): `'bounded'`, the default, is today's discrete-object reading, its
  border demoted from `badge-outline`'s full-strength `currentColor` (which read as a clickable
  button) to a hairline that clears the audit's own 3:1 `border-contrast` floor in both themes;
  `'quiet'` is a new borderless, token-tinted recipe for a settled state (a Published pill, say)
  that should recede rather than compete. Both recipes are measured, not invented
  (`docs/internal/probes/2026-07-28-chip-registers/`). `badge-ghost` retires from cairn's own tree:
  EditPage's Published pill, CairnAdminShell's CMS pill, and every bare `badge-outline` site move
  onto the two registers, and `stock-default-hazards`' guidance for `badge-ghost` now points at
  them, naming `'quiet'` as the sanctioned put-away recipe. **Consumers must:** replace any own
  `badge-ghost` usage (`stock-default-hazards` now errors on it) with `StatusChip
  register="quiet"` or the equivalent `.cairn-chip-quiet` recipe in `cairn-admin.css`.
- The package now ships a Claude Code skill, `skills/cairn-admin-screens/` (design infrastructure
  Pass 3), carrying the admin design standard as loadable reference: an always-loaded core (screen
  anatomy, the register rules, the done-gate), two annotated exemplar screens (a list and a
  detail/slide-over), a form-anatomy contract, an extension grammar for deriving a component the
  toolkit lacks, a calibrated grader prompt, and a craft chapter translating an invisible-polish
  catalogue into rule-backed recipes. `cairn-doctor` gains a `skill.admin-screens` check: missing or
  stale (by a content hash of both trees) reports advisory and never fails the run, and
  `cairn-doctor --fix` installs or refreshes the packaged skill into a consumer's own
  `.claude/skills/cairn-admin-screens/` before the checks run. See [the `cairn-audit`
  CLI](./docs/reference/cairn-audit.md) and [`cairn-doctor`](./docs/reference/doctor.md#the---fix-skill-install).

No consumer action is required for the entries above beyond the `badge-ghost` migration named
above. No exported type, prop, or route contract changed otherwise.

### Fixed

- The Media Library no longer 500s when a stored asset's alt text is `null` or missing. A
  committed or branch `media.json` row is trusted wholesale on read, so a hand-edited or
  older-schema manifest could cross the trust boundary with a non-string `alt`; `mediaLibraryEntry`,
  the one place `MediaLibraryEntry` is constructed, now normalizes it to `''`, the library's
  existing needs-alt signal.
- `PageHeader` (`@glw907/cairn-cms/admin-toolkit`) no longer leaks its default `<h1>`/`<p>` margins
  past its own `gap-0.5` heading-stack intent. `OfficeList`, the component `PageHeader`'s own doc
  calls itself "the shape, generalized", carried this UA-margin fix already; `PageHeader` had not
  received it at graduation, so its title-to-meta gap rendered at roughly 58px instead of the
  intended 4px. The `meta` prop also now renders at the meta type role (13px, matching its own
  prop name) rather than the body role (14px), so it reads at the same size as a screen's own
  `ListToolbar` count line when both appear together. **Consumers must:** expect the header stack
  on any screen mounting `PageHeader` to render visibly tighter (a shorter title-to-meta gap) and
  its `meta` line one step smaller; no prop or type changed.
- `cairn-audit --rendered`'s `chip-ground-collision` demotes from error to advisory (design
  infrastructure Pass 3, corpus C, 2026-07-28): the formula has no chroma term and cannot see hue,
  which produced 24 false errors of 40 on the first consumer admin it measured, so as coded it
  could not serve as a consumer gate. The formula itself is unchanged; a chroma-aware repair is
  filed in ROADMAP and re-promotes the rule on re-measured evidence. **Consumers must:** expect a
  `chip-ground-collision` finding to no longer fail `cairn-audit --rendered`'s exit code; it still
  reports.
- Cairn's own admin's `cairn-audit --rendered` error tier is clean (design infrastructure Pass 3):
  `ConceptList`'s Title/Date sort buttons gain an outward `::before` hit-area expansion (a
  `touch-targets` fix) instead of a font-size bump, and its row-title link grows through real
  padding on its own box, since `truncate`'s `overflow: hidden` would clip a `::before` reaching
  past it; `ListToolbar`'s segmented filter group can now shrink below its own preferred width
  (`flex: 0 1 auto`), so it wraps onto a second line at 320px instead of overflowing the viewport
  (a `viewport-overflow` fix). Internal admin CSS and markup only; no consumer action.

### Documentation

- A new explanation page, [Why the design language is
  enforced](./docs/explanation/enforced-design.md), states the sixth front-door principle: cairn's
  admin design language is enforced, not merely documented, and the payoff is that a developer
  spends less effort building an admin interface. The README's principle ledger grows from five
  entries to six to match. [Upgrade cairn](./docs/guides/upgrade-cairn.md) gains the grammar-release
  adoption recipe: how to read a `type-scale` finding, match it to a named role in [Admin grammar
  tokens](./docs/reference/admin-grammar-tokens.md), and rename the class, plus the safelist
  reachability note that makes the rename safe.

## 0.90.1

<!-- release-size: patch -->

### Fixed

- `ListToolbar`'s `'select'` facet no longer pins to daisyUI's own fixed 320px clamp
  (`width: clamp(3rem, 20rem, 100%)`, whose middle value is a fixed length, not a container-relative
  one); it now sizes to its own content (`width: auto; max-width: 100%`), so a short-option facet
  renders narrow and a container of real-world facets (four selects plus a menu facet plus search)
  fits one line at the widths the Members-refinement recomposition targeted. A select facet's
  border also now shares the `'menu'` facet's own `var(--cairn-card-border)` treatment (via the
  same `--input-color` custom property daisy's compiled rule already reads), so the two read as one
  control family rather than two vocabularies side by side.
- A `'menu'` facet's option list and the overflow disclosure's own panel no longer open on keyboard
  focus alone: daisyUI's `.dropdown` shows `.dropdown-content` on `:focus-within` for free, which
  let Tabbing onto a trigger reveal the panel while `aria-expanded` (driven purely by this
  component's own `dropdown-open` class) stayed `false`. Both disclosures' visibility now tracks
  `dropdown-open` exactly, so `aria-expanded` always matches what is actually shown.
- A `'menu'` facet's option list carries real ARIA menu semantics (`role="menu"` with
  `role="menuitemradio"` options, previously bare buttons in a plain `<ul>`): the applied value is
  exposed programmatically via `aria-checked`, not just the sighted-only check glyph, and a roving
  tabindex makes only the focused option a Tab stop, with ArrowUp/ArrowDown/Home/End moving that
  focus, wrapping at the ends, mirroring the segmented filter's own keyboard model.
  Escape-closes-and-returns-focus and the click-to-select behavior are unchanged.

No consumer action is required; every change is inside `ListToolbar`'s own markup and styling.

## 0.90.0

<!-- release-size: minor -->

### Added

- `ExpandableRow` graduates into the `admin-toolkit` subpath (second consumer landed:
  aksailingclub-org's own `src/admin-club/toolkit/ExpandableRow.svelte`), carrying three visual
  fixes from the Members-refinement audit: the summary row's hover wash now reaches the sticky
  trigger cell with its own opaque tint (a transparent-based wash would let content scrolling
  underneath a pinned column show through); the trigger cell follows zebra parity
  (`base-200` on striped rows) instead of a hardcoded `base-100`, closing the right-edge seam;
  and the expanded panel's `<td>` gets `background: var(--color-base-300)` with an inset
  top-border, so the drawer reads as its own surface instead of merging with the zebra stripe.
  All of the component's contracts (colspan mechanics, the 390 column-hiding pattern,
  `aria-expanded`/keyboard behavior) are unchanged.
- `ListToolbar` gains a `display: 'menu'` filter variant: a quiet bordered button showing the
  facet's name at rest ("Standing") and its applied value in-control ("Standing: Overdue") with
  a separate inline clear affordance, opening a keyboard-operable option list (focus moves to
  the first option on open, Escape and outside-pointerdown close it, only one facet stays open
  at a time). The existing `'select'` variant is unchanged behaviorally and now shares the same
  30px control height and 13px text as every other control in the row.
- `formatPhone(phone: string): string` joins the `admin-toolkit` formatters: a stored E.164 NANP
  number (`+19075550100`) renders as the hyphenated `907-555-0100` for a table cell; anything
  outside that shape passes through unchanged.

### Changed

- `ListToolbar`'s controls row recomposes from a rigid `repeat(auto-fill, minmax(11rem, 1fr))`
  grid to a wrapped flex row (search `flex: 1 1 240px`), so five promoted facets plus search fit
  one line at a realistic container width and wrap cleanly at narrow widths instead of forcing
  ragged per-cell wrapping. The applied-pills row is retired; `computeAppliedFilters` now only
  feeds the count line. The 13px count line gains `tabular-nums`, as does `Pagination`'s range
  line.
- `StatusChip`'s border demotes from `badge-outline`'s full-strength `currentColor` (which read
  as a clickable button) to `color-mix(in oklab, currentColor 35%, transparent)`, the value
  verified against zebra stripes in both themes; the `sm` size keeps its `5rem` min-width floor.
- `OfficeList`'s header stack (eyebrow/title/subtitle) no longer leaks the browser's default
  `h1`/`p` margins past its own `gap-0.5` (flex does not collapse child margins), so the
  rendered gaps settle to the intended few px instead of a ~32px leak; the header's action slot
  no longer stretches full-width below the `sm` breakpoint.
- cairn's own `ConceptList` create-button label now resolves its singular noun through the same
  `itemNoun` grammar `Pagination` and `ListToolbar` use, instead of a bespoke fallback, so a
  concept that only declares a plural `label` (the showcase's `pages`, before this change) no
  longer reads "New Pages" where "New Page" was intended.

No consumer action is required. `ExpandableRow` and `formatPhone` are new, additive exports;
`ListToolbar`'s `'menu'` display value widens an existing string union; every other change is a
visual refinement inside cairn's own admin-toolkit and built-in admin screens.

## 0.89.1

### Added

- `itemNoun(count, label)` and `ItemLabel` (`{ one: string; many: string }`) join the
  `admin-toolkit` subpath's formatters, and `Pagination`'s and `ListToolbar`'s `itemLabel` prop
  widens to `string | ItemLabel`. An `{ one, many }` pair picks the grammatical number on every
  count and range line ("1 class", "6 classes"), graduating the fix aksailingclub-org's own
  toolkit proved for the "1 households" defect. A plain-string `itemLabel` renders exactly as
  before. No consumer action is required.

## 0.89.0

<!-- release-size: minor -->

### Added

- A new public subpath, `@glw907/cairn-cms/admin-toolkit`, packages the general-purpose admin
  components and formatters aksailingclub-org's own admin build proved first: `PageHeader`,
  `ListToolbar`, `AdminTable`, `StatusChip`, `Pagination`, `EmptyState`, and the
  `formatMoney`/`formatCivilDate`/`formatTimestamp`/`ageFromBirthdate` formatters. A site building
  its own `/admin/` screen reaches for the same shared vocabulary cairn's own admin now uses,
  instead of hand-rolling a bespoke parallel. See [the admin-toolkit
  reference](docs/reference/admin-toolkit.md).

### Changed

- cairn's own admin screens now build on that toolkit. `ConceptList`, `CairnMediaLibrary`,
  `ManageEditors`, `VocabularyAdmin`, `CairnTidySettings`, `NavTree`, and `HelpHome` all render
  their page header through the toolkit's `PageHeader`, converging five ad hoc header markups
  into one visible idiom: an optional eyebrow, the display-face title, an optional muted meta
  line, and one right-aligned action. `ConceptList` and `CairnMediaLibrary` also converge their
  search, filter, count, table, and pager markup onto `ListToolbar`, `AdminTable`, `StatusChip`,
  and `Pagination`. A site that already matched the old per-screen headers and lists by eye may
  notice the rhythm settle to one shape; no prop or route contract changed.

No consumer action is required. The new subpath is additive, and the visible header convergence
touches only cairn's own built-in admin screens, with no exported contract behind it.

### Fixed

- The admin CSS build's `@source` scan never included `src/lib/admin-toolkit` (the subpath was
  never added to the scan root when it graduated out of `src/lib/components`), so any daisyUI or
  Tailwind class used only there silently never compiled. `ListToolbar`'s segmented filter (the
  Posts publish-state triage, Media's asset triage) rendered its options stacked one per line
  instead of a row; `EmptyState`/`PageHeader`/`StatusChip` lost a handful of plain utilities the
  same way. A new gate, `check:admin-css-classes`, checks every admin-toolkit and admin component
  template's class tokens against the built sheet so a class miss like this fails CI instead of
  shipping. `ListToolbar`'s segmented option count also drops its parenthesized reading ("All(6)")
  for the shipped device's own presentation: the label, then the count in its own visually
  secondary span ("All 6"). No consumer action is required.

## 0.88.3

### Changed

- A new documented safelist source, `src/lib/components/admin-css-safelist.ts`, makes the admin CSS
  build compile a curated blessed set of daisyUI 5 classes that no shipped admin component references
  yet: the `stats`/`stat-*` family, `table-zebra`/`table-xs`, `toast` plus its placement modifiers,
  the `indicator`/`status`/`join` placement and orientation modifiers, and `badge-soft`/
  `badge-outline`/`badge-dash`. The pass-B "admin CSS class-inventory gap" harvest finding named the
  trap (a daisy class only styles anything once cairn's build compiles it); the ASC admin-toolkit
  design survey defines this blessed set, so a site-authored admin screen can use the vocabulary ahead
  of any cairn component adopting it. No consumer action is required: this is an internal build change
  no consumer imports.
- The showcase's banked `IntroLedger` syncs to cairn.pub's ratified masthead form: the title
  at the full step-5 masthead grade with the scaled mark, the answer one grade up, the summary
  as full-ink paragraphs (`summary` is now `string[]`), and the `leadIn` prop replaced by
  `ledgerTitle`, a tracked small-caps label on a running hairline.
- A new showcase theme component, `Carousel.svelte`, banks cairn.pub's screenshot carousel in
  generic form: stacked cross-fading slides with a caller-supplied label row, one 7-second
  auto-advance cycle that then rests, pause on hover and focus, permanent manual control on any
  dot click, and no auto-advance or transition under reduced motion.
- The showcase's content component set banks a new `micro-cta`, the cta's compact
  further-reading sibling: the same label-plus-link shape without the primary/secondary
  variant choice, plus an optional note line for a short gloss on where the link goes. The
  styleguide's reading surface demonstrates it beside the full `cta`.

No consumer action is required for the three showcase template components either; existing sites
keep their own copies until they choose to pull the updated forms.

## 0.88.2

### Changed

- The showcase's public header nav now renders from `site.config.yaml`'s `menus.primary`
  (resolved through the engine's `extractMenu` by the root layout server load) instead of a
  hardcoded array, so an editor's `/admin/nav` changes reach the rendered site. A lean
  `src/theme/site-config.ts` module now owns the template's one `parseSiteConfig` call, and
  `cairn.config.ts` re-exports `siteConfig` from it, keeping the full adapter out of the client
  bundle. The footer's nav stays hardcoded on purpose; its list is different content, not a copy
  of the primary menu.
- The tutorial's nav milestone teaches the same shape: parse the site config in a lean module,
  read the menu in a `+layout.server.ts`, and render from `data.nav`, instead of importing the
  config module in a client script. The theme tutorial (`build-a-theme.md`) is now linked from
  the docs front door.
- A new repo gate, `check:arm-indexes`, fails CI when a published docs page is missing from its
  arm's index (the inverse of `check:docs`'s dead-link direction).

No consumer action is required. The template changes land in newly scaffolded or copied sites;
an existing site keeps its own chrome.

## 0.88.1

### Changed

- A mermaid fence (` ```mermaid `) now passes through the build-time Shiki highlighter untouched,
  keeping its `language-mermaid` class on the `<code>` element instead of losing it to the
  tokenized `<pre class="shiki">` rewrite. A site's own client-side mermaid renderer can key on
  the class directly; it no longer needs a site-side marker plugin to recover it. Every other
  fenced language is unaffected.
- `@glw907/cairn-cms-dev`'s seed now includes two published fragment entries (manifest rows plus
  `src/content/fragments/<id>.md` bodies, one mirroring the showcase's own `trail-safety-notice`
  fixture), so a site with a `fragments` concept can exercise the picker, an include chip's title
  resolution, and the live preview's include splice under `vite dev` with no on-disk content of
  its own. Idempotent like the other seeds; a site's own fragments are untouched.
- `@glw907/cairn-cms-dev`'s seeded media objects are now real, browser-decodable PNGs (signature,
  IHDR, IDAT, IEND, a distinct solid color per seeded asset) instead of a 12-byte stub that only
  satisfied the delivery route's Content-Type check. The Media Library under `vite dev` now shows
  real thumbnails instead of every tile falling to its "Image missing" state.

No consumer action is required. All three changes are additive fixtures inside the dev-only
package or a non-breaking highlighter behavior change; a site's own seeded or committed content is
unaffected.

## 0.88.0

<!-- release-size: minor -->

### Added

- The admin access map: a site declares `defineAccess(roles, map)` once, mapping engine screens
  and its own `/admin` routes to the role names admitted to each, and one function, `canReach`,
  is the single authority the guard's new `requireAccess` helper, every engine route gate, and
  the sidebar resolver all read, so route enforcement and nav visibility can never drift apart.
  Capability stays the floor (owner always passes, `none` never reaches anything, `editors`
  keeps its owner-only floor); the map only narrows an editor-capability session further. A site
  that declares no map sees no behavior change. See [Restrict admin access by
  role](./docs/guides/restrict-admin-access.md). New log event `auth.access.denied` (warn:
  `email`, `role`, `target`) makes a map denial observable.
- `NavLayoutSection` gains `collapsed?: boolean`, the group's declared starting state for a
  visitor with no persisted nav-collapse cookie (default `false`, today's behavior); the
  existing cookie still wins entirely once any header is touched.
- `NavLayoutEngineRef` gains `icon?: AdminNavIcon`, overriding the engine-owned glyph for that
  door, and the bundled `AdminNavIcon`/`ADMIN_NAV_ICON_NAMES` allowlist widens from nine names to
  twenty-seven (the full working set surfaced by ASC's own declared sidebar).
- A new `attention` dependency (`ContentRoutesDeps.attention`, `CairnAdminDeps.attention`),
  awaited once per request and never cached: a site returns `AttentionItem[]` (`href`, `count`,
  an optional `label`) and the shell renders a quiet pending-work pill on the matching visible
  nav entry, summed on a collapsed section's header, dropped at zero, and dropped entirely for
  an item whose `href` the current session cannot see (a count never leaks to a role that can't
  act on it).

No `Consumers must:` action: every addition above is additive, and a site that declares none of
it sees no behavior change.

## 0.87.4

### Added

- `createRenderer` gains `renderDocument`, a sibling to `renderMarkdown` that additionally
  returns the rendered page's `headings` (`DocHeading[]`: `id`, flattened `text`, `depth`),
  collected from the final rehype tree after `rehypeSlug` and any site `rehypePlugins` have
  run. A page that needs a table of contents or a heading anchor list calls `renderDocument`
  instead of re-parsing `renderMarkdown`'s HTML string. `renderMarkdown` is unchanged. No
  consumer action.
- The published docs tree (`docs/reference`, `docs/guides`, `docs/explanation`,
  `docs/tutorial`, `docs/README.md`) now ships inside the npm tarball, so a consumer site can
  read the docs at build time without a separate checkout. `docs/internal`, `docs/superpowers`,
  and `docs/STATUS.md` stay out. The `check:package` gate now asserts both directions, so a
  future `files` edit cannot silently drop or leak either. Cost: the tarball grows from 501 to
  562 files, 1.73 MB to 1.96 MB packed (4.58 MB to 5.22 MB unpacked). No consumer action.

### Changed

- The admin's Get Help hand-off now has a default destination: a site that sets no
  `editor.supportContact` gets `https://cairn.pub/help`, cairn's own hosted editor help,
  instead of the self-serve empty state. A site that prefers its own destination sets
  `editor.supportContact` explicitly, same as before, and a site that wants the prior
  self-serve state back sets it to an explicit empty string, which passes through
  untouched. A site that relied on the prior unset (no link) state now shows the
  hosted-help link until it sets one of those two.

## 0.87.3

### Changed

- The docs-register sweep: every published docs page (the four arms, the docs index, and the
  repo README) now conforms to the banked register standard (`docs/internal/docs-register.md`).
  The sweep corrected two factual errors in the arm indexes, removed marketing register,
  internal plan citations, and private consumer names from public pages, moved git vocabulary
  out of the editor-facing guides, and restructured the tell cadences the standard bans.
  Docs only; no consumer action.

## 0.87.2

### Added

- A rendered managed image (`media:` token) now carries its intrinsic `width`/`height` when the
  media manifest records them, so the layout reserves the box before the bytes arrive. When the
  site's `AssetConfig` declares `transformations: true`, the image also gains a `srcset` over a
  400/800/1200/1600 width ladder (honest candidates only, capped at the asset's own width)
  through the existing variant URLs, with a `sizes` hint derived from the enclosing figure role.
  The sanitize floor admits the two new attributes. Raw external URLs are untouched. No consumer
  action; a site that post-processes rendered `<img>` HTML should expect the new attributes.
- The `check:invisible-craft` gate now recognizes seconds-suffixed CSS durations (previously
  only `ms` literals were checked) and scans the showcase's template tree (chassis, theme, site
  routes) alongside the admin components. The dual-gamut contrast gate also checks the cairn
  theme's full-identity override (`examples/cairn-theme/cairn.css`). Two live numeric probes
  land as `check:interactive-contrast` and `check:touch-targets`, run against a preview server.

## 0.87.1

### Added

- The editor renders an `::include` line as one atomic chip naming the fragment by its human
  title ("Include: Office contact"), falling back to the id when the title cannot resolve. The
  chip deletes whole—backspace or a selection touching it removes the entire line in one
  undoable step—so a half-deleted include can no longer leave stray directive text that
  publishes as prose. The mechanism is the media source chip's, applied to the include leaf.
- A folded directive container now absorbs its opener line into the fold pill. While folded,
  the raw fence machinery (`:::callout{title="Trail alert"}`) no longer shows; the pill reads
  "Callout · “Trail alert” · 3 lines" (label, the block's own title when it carries one, count),
  and the title also reaches the pill's accessible name. Any edit or caret entry still unfolds
  to the exact source; the touched-range safety invariant is unchanged.
- The edit-page preview marks spliced fragment content with a quiet boundary: an accent hairline
  and a "From “Office contact”" eyebrow over the included blocks, so an editor can tell which
  paragraphs live elsewhere before editing them. Preview only; a test proves the public delivery
  path renders byte-identically to before.
- A fragment with includers states its blast radius beside the publish action ("Publishing
  updates 3 entries that include this fragment."), reusing the standing Included-in data.
- Fragments carries its own sidebar glyph (layers), so it no longer shares the undated-concept
  document silhouette with Pages.
- A standing `check:invisible-craft` gate holds the polish pass's mechanical rules over the
  admin components: transition durations in the 150-250ms band, spacing brackets by allowlist,
  and no achromatic color values, each exception budgeted with a reason.

### Changed

- The login and confirm pages honor the admin theme cookie before sign-in, so a dark-mode
  editor no longer gets a light login card. `AdminShellData`'s public variant now carries the
  resolved `theme`. **Consumers must:** nothing at runtime; only a site constructing that
  public variant by hand in TypeScript must add the new member (neither production site does).
- The invisible-craft polish batch, roughly thirty look-preserving refinements from a
  two-track audit of the admin: real typographic characters and tabular numerals on numeric
  surfaces, the dark theme's shadow warm-tinted instead of pure black, modals brought into the
  theme-adaptive elevation vocabulary, transition durations herded into the 150-250ms band,
  restored focus rings on two search inputs, 44px touch targets on icon-only controls and
  checkboxes, deliberate truncation on the topbar breadcrumb and picker rows, quieted
  scrollbars and tap highlights, a `font-synthesis` guard against faux italics, and a 1px
  inset hairline on every check-and-tint pressed state so a pressed control no longer signals
  through font weight alone.
- The vocabulary ledger and the tidy settings status card recompose below the small
  breakpoint (each row stacks its metadata under its primary line) instead of squeezing four
  columns into a phone width, where the tag table's columns previously collided.

## 0.87.0

<!-- release-size: minor -->

### Changed

- A `routing: 'embedded'` concept is now genuinely non-routable: its entries no longer resolve
  through `byPermalink`, prerender through `entries()`, or appear in `site.all()`. The shorthand has
  been declarable on any concept since well before this window, but nothing enforced it, so an
  embedded concept's entries were served, prerendered, and listed in the sitemap exactly like a
  routable one. [Add authors to your site](docs/guides/add-authors.md) has always told developers
  that "marking `authors` embedded keeps it off the sitemap and out of feeds"; that promise is true
  now and was not before. **Consumers must:** check any concept declared `routing: 'embedded'`. If
  its entries are meant to have public URLs, declare `routing: 'page'` instead; if they were only
  ever meant to be referenced or included, no action is needed and the stray URLs stop being served.
  Neither ecxc.ski nor 907.life declares an embedded concept, so neither is affected.

### Added

- Fragments, a way to author one piece of markdown and reuse it across entries. A site declares
  the reserved `fragments` concept key (which requires `routing: 'embedded'`), and an editor
  includes a published fragment in any post or page with a `::include{fragment="<id>"}` directive,
  inserted by the editor's own "Include a fragment" picker. Editing the fragment updates every
  entry that includes it. The include is a block: the fragment's own markdown splices in place, so
  its headings, links, media, and registered components render exactly as they would in a native
  entry. A fragment has no public URL of its own, and its computed permalink 404s, so it reaches a
  reader only through a consuming entry. Renaming a fragment rewrites every inbound include in the
  rename's own commit. Deleting one that is still included is refused, with its consumers named,
  and a fragment's edit screen carries a standing "Included in" list of the same consumers in its
  Details panel, so the blast radius of a fragment edit is visible before Publish.
  A fragment can't include another fragment, and saving one that tries is refused. A dangling
  include shows a notice in the editor's preview and logs `include.missing`; a build fails on it,
  the same way it fails on a dangling `cairn:` link. New guide:
  [Reuse content across entries](docs/guides/reuse-content-across-entries.md). Additive; no
  consumer action beyond opting in. A site that adopts it declares the concept, globs its
  directory into `createSiteIndexes` and the manifest plugin, adds `{ screen: 'fragments' }` to a
  declared `navLayout`, and forwards `resolveFragment` in its render wrapper.

- A folded directive block now names itself. The fold pill reads "Callout · 12 lines" using the
  component registry's human label (falling back to the directive name), and carries the
  component's registered `use` line as its tooltip, so a stack of folded blocks reads as content
  rather than counts. An `::include` line renders its fragment id at label strength instead of
  dimming it with the braces, so two includes are tellable apart at reading distance. Additive; no
  consumer action.
- `SettingsData` and `VocabularyLoadData` are now exported from `@glw907/cairn-cms/sveltekit`,
  matching their facade-returned siblings `ListData` and `EditData`. Additive.
- A site that sets `AuthBranding.replyTo` now gets it on the built-in magic-link email; the field
  existed on the config and the message type but the built-in send never set it. Additive; no
  consumer action beyond configuring it.

### Fixed

- Saving Tidy settings or the tag vocabulary over a malformed committed site config (an
  unrecognized or misplaced top-level key) no longer surfaces SvelteKit's generic 500: both saves
  now refuse with the parser's own actionable message, the same way the corresponding loads
  already report the fault.
- A required closed multiselect (a checkbox tag set) tells the editor "Choose at least one."
  through the browser's own validation, revealing and focusing the field like every other required
  arm, instead of failing only at the save bounce. Native `required` on the boxes would have meant
  "check every box," so the signal is set and cleared on the group as a whole.
- The editor's suggestion popover styles a backtick-quoted word as code instead of showing the
  backticks verbatim.
- Help hints inside repeated rows and object groups get distinct ids, so each row's
  `aria-describedby` resolves to its own hint rather than row zero's. Latent until a consumer
  schema declared `help` on a leaf inside a container.
- Fragments papercuts from an adversarial UX review: deleting a still-included fragment from the
  list explains the includes (the dialog and banner no longer suggest "repointing links" that do
  not exist), the fragment picker's empty state points at the Fragments screen instead of only
  naming the precondition, and an include that names no fragment gets its own preview notice
  instead of "Missing fragment:" trailing into nothing.

## 0.86.2

### Changed

- The admin's visual system, re-expressed end to end by the design-refinement arc (2026-07-15).
  The office: an emphasis ladder replaces per-element accents (ink-solid standing openers, violet
  reserved for flow commits and pending act-on states, red only inside destructive confirms, amber
  only on needs-attention), one status-pill family with a shared wash, one-line list rows composed
  at a natural reading measure with tinted frame zones, and a documented proximity spacing scale.
  The type system: the wordmark and every display-face heading drop negative tracking (the rn pair
  kemmed — "Cairn" could read "Caim"), chrome steps to 15px, the manuscript's prose posture opens
  to 1.125rem/1.85, and small labels take tracking bands keyed to optical size and weight. The
  desk: below the `sm` breakpoint the edit route recomposes for the phone — a 48px band, Save and
  Publish in a thumb-reach bottom action bar padded above the screen edge, one scrollable
  44px-target toolbar row, and the environment strip folded into the overflow — cutting
  keyboard-open chrome from 67% of the viewport to 34%. The toolbar gains Format / Structure /
  Insert group eyebrows and a persistent Markdown-help control at every width. Tidy's review diff
  and settings examples are colorless (weight and strikethrough carry the semantics), and dark
  mode compensates saturation with a lower-chroma primary (contrast measured above the 4.5:1 floor
  throughout). All of this is admin-internal CSS and components; no consumer action.
- The showcase exemplar moves its custom Signups entry from the Content section to the Site
  section of its declared `navLayout` (signups are inbound visitor data, not authored content),
  and the organize-your-admin-nav guide's worked example follows. Exemplar and docs only.

### Added

- A resolved engine nav entry now carries `dated` when it is a content concept, and the admin
  sidebar gives dated concepts (Posts-like) their own glyph so adjacent concepts stop sharing one
  document icon. Additive; no consumer action.

### Fixed

- The admin shell zeroes the browser's default body margin while mounted. On a host site that
  never resets `body`, the fixed sidebar pinned to the true viewport while the page content
  offset by the UA's 8px margin, opening a visible seam around the brand tile and adding 16px of
  permanent scroll under the full-height drawer. The reset lives and dies with the admin mount,
  so the host's own pages are untouched. Automatic; no consumer action.

## 0.86.1

### Added

- The D1 migrations (`0000_auth.sql` and the roles migration `0001_roles.sql`) now ship inside the
  npm package under `migrations/`, so a site installed from the registry can apply them without a repo
  checkout: copy them from `node_modules/@glw907/cairn-cms/migrations/` into your own `migrations/`
  directory, then `wrangler d1 migrations apply`. The auth-and-D1 guide carries the step. A packaging
  gate (`check:package`) now fails if the migrations ever drop out of the published file set.
- `cairn-doctor` gains an `auth.role-wiring` check. A site that declares a custom role vocabulary on
  its adapter but forgets to pass the same vocabulary to `createAuthGuard({ roles })` gets a guard on
  the implicit owner/editor fallback, which resolves every custom role to the `none` capability (the
  editor authenticates but the guard refuses every route). The existing `auth.role-vocabulary` check
  cannot see this, since the editor rows still match the declared vocabulary; the new check reads the
  `createAuthGuard` call in `src/hooks.server.ts` and fails only on a high-confidence miss, skipping a
  guard it cannot read rather than reporting a false positive.

### Fixed

- Admin papercuts from the 2026-07-15 UX audit, all internal to the admin chrome a consumer never
  imports: the edit-route desk band and the editor footer now compose at phone widths instead of
  colliding or truncating (no more theme toggle astride Save/Publish, no glyph over the Published
  badge, no clipped footer labels); office lists cap at a readable width at 2560 and recompose at 320;
  the command palette gains a phone top inset and the admin focus ring; the guarded Publish and Figure
  controls read as deliberately disabled rather than as rendering gaps; the dark-mode Published badge
  clears its contrast floor; the nav drawer gains the full APG modal-dialog treatment (focus trap,
  `inert` background, independent Escape, focus return on every open method); and a copy sweep brings
  the admin's editor-facing strings to the calibrated voice.

### Changed

- The zero-config sidebar default now renders every item, cairn's own screens and a site's flat
  `adminNav` entries alike, as a loose top-level entry with no synthesized `Core` section wrapping
  them: a category header costs a reader a decision on every visit, a cost the sizes a zero-config
  sidebar actually reaches never earns back. See [Organize your admin
  nav](./docs/guides/organize-your-admin-nav.md) for the evidence and the full grouping guidance.
- A `navFilter` that matched the literal `Core` section label now sees those items as loose nodes
  instead, since no `Core` section exists to match; no known consumer does this.
- Zen now recedes the persistent sidebar too, at every width, alongside the topbar it already
  dropped.

## 0.86.0

<!-- release-size: minor -->

### Added

- Sites now declare `navLayout`, an optional adapter member that arranges the whole admin sidebar
  as one ordered tree, mixing the engine's own screens with the site's custom ones. An engine
  reference (`{ screen: 'settings', label: 'Site settings' }`) places one of cairn's own screens by
  id and can relabel or `hidden: true` it; a site entry is today's `AdminNavEntry` shape, gaining a
  declarative `roles` list; a section groups a mix of both under one label, one level deep.
  `navLayout` and `adminNav` are mutually exclusive; declaring both throws at construction. An
  engine screen the tree never references still renders, in a trailing group after a divider, in
  engine order, so an engine update that ships a new screen surfaces instead of silently vanishing.
  Absent `navLayout`, the sidebar renders today's default arrangement through the same resolver, so
  a zero-config site's markup is unchanged. A new guide, [Organize your admin
  nav](./docs/guides/organize-your-admin-nav.md), carries the grouping principles and a worked
  example. See [the navLayout seam](./docs/reference/sveltekit.md#the-navlayout-seam) for the full
  contract.
- Desk routes (the entry editor) now persist the sidebar at `xl` (1280px and up) instead of
  receding it at every width, on grounded UX research (every content-management comparable
  persists nav through editing). It still recedes behind the drawer toggle in the `lg`-`xl` tablet
  band (1024-1279px) and keeps the overlay drawer below `lg`, unchanged from before. Office routes
  and zen mode are unchanged.
- `CairnAdminShell`'s command palette now lists every visible item in the resolved sidebar,
  including a section's children, not just its top-level entries.

### Changed

- `AdminShellData`'s authed arm collapses `customNav`, `canManageEditors` (as a nav signal), and
  `navLabel` into one `nav: ResolvedNavLayout` field: the whole arranged, filtered sidebar for the
  request, `items` in declared order plus the trailing `fallback` group of cairn's screens the
  arrangement left unreferenced. `concepts` stays; its consumers are desk-route detection and
  publish grouping, not nav arrangement. **Consumers must:** update any code that reads
  `AdminShellData` fields directly (no known consumer does) to the new `nav` shape; see [the
  navLayout seam](./docs/reference/sveltekit.md#the-navlayout-seam).
- `navFilter` (`ContentRoutesDeps`, `CairnAdminDeps`) now receives the arranged top-level nodes of
  the resolved sidebar (`ResolvedLayoutNode[]`, sections and loose entries, cairn's own screens
  included when the site declares `navLayout`), not just the site's own custom `adminNav` entries,
  and returns the same shape. `fallback` never passes through this seam, since it's engine-only and
  already gated; a site hides one of its own doors with `hidden: true` inside `navLayout` instead.
  **Consumers must:** widen a declared `navFilter`'s parameter and return type from
  `ResolvedNavItem[]` to `ResolvedLayoutNode[]`; a filter that only reads `.label` (ASC's
  label-based `filterClubNav`, for example) needs no other change.

## 0.85.0

<!-- release-size: minor -->

### Added

- Sites now declare their own role vocabulary and map each role onto one of the engine's three
  fixed capability levels: `owner` (manages the roster), `editor` (writes and publishes), or
  `none` (an authenticated identity with no engine content access). `defineRoles` on the adapter's
  new `roles` member validates the vocabulary at construction; a site that declares none gets the
  implicit `{ owner: 'owner', editor: 'editor' }` pair, so a zero-config site sees no change
  anywhere in this release. A new `CairnRolesRegister` interface (a root export) lets a site
  augment `Role` in its own `app.d.ts` to narrow `locals.editor.role` to its declared names,
  including on its own custom admin routes. A role can additionally declare a `home`, the
  `/admin` route that role lands on; `/admin`'s landing is now role-aware, and a none-capability
  role with no declared `home` lands on a calm signed-in welcome view instead of the content list.
  A new `requireEditor` guard (the engine's own content and roster surfaces now call it instead of
  `requireSession`) refuses a none-capability session with 403 while still authenticating it: the
  none contract is that such a session carries a populated, typed `locals.editor` and passes
  through the `CairnAdminShell` custom-route seam untouched, so a site's own admin routes can grant
  a none-capability role access to a screen cairn's own surfaces refuse. `ManageEditors` renders
  the declared vocabulary: the default pair keeps today's toggle, and a larger vocabulary renders a
  labeled select naming each role's capability. A custom `adminNav` entry's `ownerOnly` flag now
  gates on resolved owner capability, not the literal `'owner'` role name, so a vocabulary with a
  second owner-level role name shows those entries to every owner-capability session.
  `CairnAdminDeps.auth` gains `bootstrapOwner`, a
  config-declared email and display name that seeds the very first owner row on an empty `editor`
  table from the ordinary magic-link request flow, no `wrangler d1 execute` required. A new
  migration, `migrations/0001_roles.sql`, drops the `editor.role` column's `CHECK` constraint
  (role validity moves to the app layer, validated against the declared vocabulary); a zero-config
  site can skip it, since the constraint never rejected `owner` or `editor`. `cairn-doctor` gains
  two checks, `auth.role-vocabulary` (an editor row using an undeclared role) and
  `auth.email-normalization` (an editor row whose email isn't trimmed and lowercase), and its
  existing owner-count check now counts every owner-capability row, not just the literal `owner`
  string.

No consumer action needed for an existing site: the implicit owner/editor vocabulary behaves
exactly as before. To open a larger vocabulary, declare `roles` on the adapter with `defineRoles`
and augment `CairnRolesRegister` in `app.d.ts` if you want the narrowed `Role` type; see the
[roles reference](./docs/reference/core.md#roles) and the
[upgrade guide](./docs/guides/upgrade-cairn.md).

## 0.84.4

### Changed

- A dated concept whose permalink pattern uses `:year`, `:month`, or `:day` now structurally
  requires a `date` field of that name and type. `defineConcept` and `normalizeConcepts` both
  throw at declaration when the field is missing or the wrong type, and both normalize the
  declared field to `required: true`, since the permalink cannot resolve without a date. A concept
  whose permalink carries no date token keeps its declared optionality unchanged. No consumer
  action needed unless a site's dated permalink was already missing its `date` field, in which case
  the fix is to declare one.

### Fixed

- Saving a brand-new dated entry (a post under a `:year`/`:month`/`:day` permalink, for example)
  no longer raises a raw server error when the date was left blank. The create dialog's collected
  date now rides the create redirect into the fresh editor, seeding the date field instead of
  opening it empty, and a save that still reaches the backend with no usable date bounces to the
  editor with "Pick a date for this entry." rather than throwing while resolving the entry's
  address. No consumer action needed.
- An unexpected failure inside an admin action (a bug, not a validated refusal) now shows the
  editor a calm error strip instead of the platform's raw 500 page, and logs a new
  `admin.action.failed` event naming the action, the concept and entry when there is one, and the
  acting editor. Every engine action shares the same guard, so the class of failure the ecxc save
  500 exposed can no longer escape from any of them. No consumer action needed.
- A script-posted action's unexpected failure (tidy, a dictionary word, an upload) no longer tells
  the editor their session expired. These actions fetch with `redirect: 'manual'`, so the guard
  above's redirect fallback read as an opaque, status-0 response and the client folded that into a
  false "sign in again" message for what was actually an unrelated bug; the same actions now return
  a `fail(500)` carrying the calm copy inline, which the client already renders verbatim. Form-nav
  actions (save, publish) are unaffected and still redirect. No consumer action needed.
- A required textarea, date, or free-form (open) multiselect field in the editor now carries the
  browser's native `required` attribute, so an empty one trips the capture-phase invalid handler
  and opens the Details panel before the save even reaches the server, matching the number, select,
  text, url, email, and datetime arms, which already had it. Previously these three arms enforced
  requiredness server-side only, so a required field with no value surfaced no client-side signal
  at all (this is how the ecxc "Description is required with no visible field" report happened,
  and how a required date field could reach the server unset). No consumer action needed.
- The showcase's edit-page preview now renders with the reading surface's typography (headings,
  lists, blockquotes, paragraph rhythm), not bare unstyled markup. Its `editor.preview.containerClass`
  named only `'site-main'`, the site layout's outer `<main>` wrapper, while every typography rule in
  `prose.css` is scoped to `.prose`, the nested `<article>`'s class; since the preview frame renders
  one wrapper element, not the page's nested pair, the fix is `containerClass: 'site-main prose'`, both
  classes on that one element. This is showcase-only (`examples/showcase`, which sites copy at
  scaffold time), not an engine change: a site whose `containerClass` names one wrapper class while its
  real page nests two should name both, space-separated, on the preview knob.
- A tidy call that fails because Anthropic rejects the API key (a 401 or 403, a revoked or
  mistyped key) no longer tells the editor "Try again." That auth failure is not retryable, so it
  now returns a distinct `fail(503)` reading "Tidy isn't available right now. Your site's AI
  access needs attention; let your site developer know," and the `tidy.error` log gains a `reason`
  field (`auth`, `timeout`, `abort`, or `model`) so an operator can tell an auth failure from a
  transient one at a glance. This is the exact gap the ecxc revoked-key incident exposed: every
  attempt logged the same retryable warning while the real cause needed a site developer, not
  another click. No consumer action needed.
- Tidy's visibility is now truthful about a broken key, not just its presence. An auth failure
  marks a small per-isolate cache unhealthy for ten minutes, and the edit page's tidy projection
  reads that cache (never an inline probe, so an edit load pays no added latency): the Tidy control
  disappears entirely rather than staying live to fail the same way on the next click, and it
  returns on its own once the mark expires or a fresh call succeeds. The settings screen and
  `cairn-doctor` both upgrade from a presence check to an active, zero-token probe against
  Anthropic, reporting missing, invalid, and valid distinctly (`SettingsData` gains `keyStatus`);
  a probe that cannot reach Anthropic fails soft to an honest "could not verify" rather than a
  false claim of invalid. The settings screen's probe is bounded by the same deadline as a tidy
  call (an unbounded probe on every load could otherwise hang on the Anthropic SDK's own
  multi-minute default) and its verdict is cached for the same ten-minute window, so a run of
  settings navigations spends at most one live round trip. No consumer action needed.

## 0.84.3

### Changed

- The editor's Publish button is now always visible in the desk band beside Save, matching the
  convention across comparable CMS editors (WordPress, Ghost, Sanity, Contentful). When an entry
  has nothing new to take live it stays present but guarded (`aria-disabled`, dimmed, "Nothing
  new to publish"), and it wakes on a typed edit, a pending draft, or a new entry. Previously it
  rendered only after a save had cut the draft branch, which hid the publish step from a first
  draft and forced a save-then-publish two-step the publish action never required. No consumer
  action needed.

### Fixed

- A brand-new entry now opens with the title typed in the create dialog. The create step
  collected the title but dropped it, so the editor's title field opened blank and the top bar
  showed the address instead. The typed title now rides the create redirect into the fresh
  editor. No consumer action needed.
- A brand-new, never-saved entry's status badge read Published. It now reads New until the entry
  first lands on the live site, matching the list's vocabulary. No consumer action needed.
- Common English contractions (you've, they're, doesn't, and the rest of the standard set) no
  longer show as spelling errors. The bundled en-US frequency list carried only a handful of
  contractions; the standard set is now included. Words written with a curly apostrophe (as
  rich-text paste produces) are also normalized to their straight-quote dictionary form at
  lookup, so both forms answer correct. No consumer action needed.

## 0.84.2

### Fixed

- Admin requests could hang indefinitely after login on a cold isolate. The installation-token
  cache stored the in-flight mint promise, and a fast-returning admin view (the bare `/admin`
  redirect) let the runtime cancel that mint, leaving a dead promise that every later admin
  request in the isolate awaited for the 55-minute TTL. The cache now stores only a successfully
  minted token. Affects consumers on roughly 0.77 and later (the shared admin shell load).

## 0.84.1

### Fixed

- The media route's second local-dev serialization site, which 0.84.0 missed: the route called
  `writeHttpMetadata(headers)` on the object R2 returned, and under miniflare's
  `getPlatformProxy` that object is an RPC stub whose method call cannot marshal a live
  `Headers` argument, so every `/media` read still 500'd under a consumer's `vite dev`. The
  route now builds response headers from the object's plain `httpMetadata` fields and never
  calls a method on the returned object. Verified end-to-end on a consumer checkout: seed,
  `vite dev`, and a media GET returns 200 with the stored content type. This completes the
  local-dev promise 0.84.0's changelog made; the `devMediaFallback` deletion note there applies
  as of this release.
- `cairn-media-seed` now stores each object's content type (derived from the manifest
  extension, passed as `wrangler r2 object put --content-type`), so local dev serves the same
  `Content-Type` production does instead of the route's octet-stream fallback.

## 0.84.0

<!-- release-size: minor -->

### Added

- New bin, `cairn-media-seed`: seeds wrangler's local R2 simulator with every media-library
  object from a deployed cairn site (`npx cairn-media-seed --from https://your-site.com`), so
  `vite dev` serves real media on every page with no deploy. It reads the committed media
  manifest, downloads each object with optional repeatable `--header` flags for an
  Access-protected site, and writes it under the same content-addressed key the media route
  reads; `--bucket` overrides the wrangler-config bucket resolution when a site declares more
  than one. See [the reference page](docs/reference/cli-cairn-media-seed.md) and [the local
  design-iteration guide](docs/guides/iterate-your-design-locally.md) it unblocks.

### Fixed

- `createMediaRoute` passed the request's `Headers` instance straight through as R2 `get`'s
  `onlyIf` and `range` options. Production Workers accept a `Headers` instance there, but
  miniflare's `getPlatformProxy` can't serialize one across its RPC boundary, so every `/media`
  read 500'd under a consumer's `vite dev`. The route now derives plain, structured-clone-safe
  `onlyIf` and `range` objects from the request's conditional and `Range` headers instead. The
  206 shaping also now handles a suffix range (`bytes=-n`) echoed back as `{ suffix }` rather
  than a resolved offset and length, clamping a suffix past the object size to the full window.
  A site carrying a dev-only `/media` fallback middleware for this bug (the aksailingclub-org
  `devMediaFallback`) can delete it on upgrade; the route itself now works under `vite dev`
  with no workaround.

## 0.83.0

<!-- release-size: minor -->

### Engine (publish-actions seam)

- A site can now declare `publishActions` on the adapter's `editor` group: the `adminNav` grammar
  applied to the publish-success moment. Each entry is plain data, `{ label, href, concepts? }`,
  with `href` a template string (`{concept}` and `{id}` substituted with the just-published
  entry's identity) and an optional `concepts` filter restricting the link to specific concept
  ids. The engine validates the config when the runtime composes, the same fail-loud-at-startup
  posture `adminNav` takes, so a blank field or an unknown concept id fails the build rather than
  silently rendering no link (or the wrong one) after a publish. `EditData.publishActions` carries
  the resolved links for the entry that just went live, and the edit page renders them as quiet
  links beside the publish-success confirmation strip. No callback crosses the publish redirect.
  New public types: `PublishActionEntry`, `PublishActionsConfig`, `PublishActionLink` (all
  `@glw907/cairn-cms/sveltekit`). See [the publish-actions
  seam](docs/reference/sveltekit.md#the-publish-actions-seam).

### Docs

- [Upgrade cairn](docs/guides/upgrade-cairn.md) and [the SvelteKit
  reference](docs/reference/sveltekit.md) gain the publish-actions seam's worked example and type
  reference, a sibling to the custom admin-nav seam's.

### Engine (widen the EMAIL binding types; no consumer action)

- `AuthEnv['EMAIL']`'s `send` signature and `MagicLinkMessage` widen to the current Cloudflare
  Email Sending API surface: optional `cc`/`bcc` (a bare address, a named `{ email, name }`
  address, or an array of either, via the new `EmailRecipient` type), a single-address `replyTo`,
  and typed `attachments` (`EmailAttachment[]`, base64 or binary `content`). All four are
  additive; the original five-field shape stays valid, so every existing caller compiles
  unchanged. `replyTo` stays a plain string rather than the `EmailRecipient` union: the platform
  rejects a reply-to array (live-probed 2026-07-07, the ASC migration), so the type carries only
  the accepted single-address form.

## 0.82.1

### Engine (admin shell sidebar fixes; no consumer action)

- Fixed a scroll-bleed defect in the admin shell: the persistent desktop sidebar rode DaisyUI's own
  `position: sticky`, which computes its "before it sticks" travel from the sidebar's static offset
  in the document. A host that omits Preflight (cairn's own embed-anywhere default) leaves the UA's
  default body margin in place, so the sidebar visibly moved a few pixels at the top and bottom of a
  page scroll. `cairn-admin.css` now overrides it to `position: fixed`, the same mechanism the
  mobile overlay variant already used, which is anchored to the viewport outright and carries no
  such drift.
- Fixed the persistent desktop sidebar wrongly receding on an ordinary navigation: `isDeskRoute`
  classified any three-segment `/admin` path as an open document, but a developer's own custom nav
  can route just as deep (a section entry like `/admin/club/events`) without opening a document.
  Navigating to such a route fell back to the mobile toggle-controlled overlay, which read as the
  sidebar sliding away at desktop width. `isDeskRoute` now also requires the second path segment to
  name a real content concept.

### Engine (pass 2.1 harvest; no consumer action)

- `adminAction` exempts a handler's `ActionFailure` return (SvelteKit's `fail()`) from the
  required-audit check: a rejected request mutated nothing, so it owes no audit record, and a
  validation reject no longer has to emit a spurious `ctx.audit` call just to satisfy the wrapper.
  A handler that returns normally (its request succeeded) with zero emits still throws in dev and
  logs `admin.action.unaudited` in production, unchanged. The exemption assumes the handler rejects
  before mutating: a handler that writes and then returns `fail()` must still emit its own audit,
  since nothing rolls its writes back. Additive; every existing audited handler keeps working
  exactly as before.
- The build-time dev flag swaps `import.meta.env.DEV` for `esm-env`'s `DEV`, the bundler-agnostic
  form `svelte-package` itself recommends, in both places the engine read it: `adminAction`'s
  default (the injectable `deps.isDev` override is unchanged) and the chrome-wrap dev guard. This
  also clears the warning `svelte-package` emitted at every build.
- `deriveExcerpt`'s existing word-boundary truncation gained explicit test coverage for the
  exact-fit (no ellipsis) and no-space (hard-cut) edge cases; no behavior changed.
- The `/ambient` augmentation now types `App.Locals.auditSink` (as `AdminActionAuditSink`)
  alongside `editor` and `backend`, so a site wiring `adminAction`'s audit-persistence seam in its
  hooks handle typechecks without a hand-written `declare global` block. Additive.

### Docs

- [Add a custom admin screen](docs/guides/add-a-custom-admin-screen.md) is rewritten around a
  production club-admin section as its worked example: a site-local wrapper composing `adminAction`
  with a site-owned role precondition, the reason a section's own layout guard alone cannot gate a
  POST action, the `auditSink` persistence recipe (including the Workers `waitUntil` requirement),
  and the `navFilter` seam for hiding a whole section from the sidebar by a site-owned role. It also
  carries a note on sequencing a site's own D1 migrations so a `REFERENCES` target always lands
  before the edge that points at it, since remote D1 enforces that where a local test double often
  does not.

## 0.82.0

<!-- release-size: minor -->

### Engine (admin extension seams; no consumer action)

- A new `@glw907/cairn-cms/admin-fields` subpath exports the admin field-renderer primitives a
  site's own custom `/admin/` screen composes instead of hand-rolling worse copies: `SelectField`,
  `TextField`, and the shared `FieldLabel` wrapper both compose. The set is deliberately small
  today (proven by the aksailingclub-org club-admin scaffold's one real consumer) and grows the
  same way the engine's own field vocabulary does.
- `OfficeList` joins `@glw907/cairn-cms/components`: the header-plus-card shell every triage-table
  screen composes, lifted out of `ConceptList` and kept to exactly its header and card frame, so a
  custom Club-style list screen gets the same office rhythm with no copy-paste.
- `adminAction` joins `@glw907/cairn-cms/sveltekit`: wraps a custom admin action's handler with the
  engine's editor, CSRF, and audit contract. `createAuthGuard` already verifies CSRF on every
  `/admin/**` POST, so the wrapper's check is defense-in-depth; its real job is resolving the
  signed-in editor as a typed `ctx.editor` and requiring an audit emit for a mutating action (a
  zero-emit action throws in dev and logs the new `admin.action.unaudited` event in production).
  Every emit logs `admin.action.audited`.
- `adminNav` gains one level of grouping: an `AdminNavSection` (a label plus its own flat
  `children`) renders as its own collapsible sidebar group beside the built-in Core section, the
  way a site's Club section joins Content/Media/Settings. A flat `AdminNavEntry` keeps folding into
  Core exactly as before, so an existing `adminNav` config needs no changes.
- `ContentRoutesDeps` gains `navFilter`: a per-request filter over the site's custom `adminNav`
  entries, run after the engine's own role filter and seeing only the custom items, never a
  built-in entry. A site whose own gating lives outside cairn (a role stored in its own D1, say)
  uses this to hide a section from an editor who fails that check, instead of teasing a link the
  route then refuses, and it is reachable through `CairnAdminDeps` too, so a site built on the
  single-mount `createCairnAdmin` facade gets the same seam. Additive, no consumer action needed.

## 0.81.0

<!-- release-size: minor -->

### Themes (three verified ports; no consumer action)

- Three new example themes land alongside the showcase, each an MIT-attributed port of a
  newly popular external theme, built on the chassis and verified glance-indistinguishable
  from its original by fresh-context visual review: `examples/astropaper-theme` (AstroPaper,
  the pure theme-seam proof: an empty component registry), `examples/foxi-theme` (Foxi, the
  composition-primitives stress, including the production-verified themed 404), and
  `examples/gallery-theme` (hugo-theme-gallery, the media stress: the upstream's own
  justified-layout geometry and PhotoSwipe lightbox, with an album tree expressed inside
  the fixed Posts/Pages model).
- The chassis README documents the themed-404 pattern (a root-level error page plus
  `not_found_handling: "none"`), which the showcase itself now follows.

### Showcase (Waymark template; no consumer action)

- The starter template's default theme is neutral. The display face is Figtree, a humanist
  sans matching the body's Source Sans 3, in place of the display serif Fraunces; the paper
  ladder drops its warm hue tint for a clean near-white/near-black progression; and the
  display type steps (`h3` through `h1`) sit one step back on the scale. The three signature
  prose gestures, the cairn-glyph `hr`, the diamond `ul` bullet, and the margin-hanging
  pull-quote, move behind an opt-in `.prose[data-flourish]` hook in `prose.css`, kept in place
  for the planned cairn theme layer to re-enable with one attribute.
- A design-review craft pass on the neutral template: the header and footer inner content now
  caps at the same reading measure as the article and home body, so the chrome's left edge
  lines up with the body copy instead of centering independently at a wider band; the uppercase
  eyebrow label is dosed down to where it differentiates two sections on the same page (the
  home's new "Latest"/"Archive" split) rather than repeating on every masthead; the home gives
  its newest entry a lead treatment above a tightened archive index; and the styleguide now
  demonstrates the full component kit (`icon`, `cta`, `video`, `faq`, and the real `pull-quote`
  directive in place of a hand-styled paragraph), a lone FAQ renders in its own bordered
  container, an empty callout points list no longer leaves a phantom gap, markdown nested in a
  callout/alert/FAQ slot scales down instead of rendering at full display size, and the two
  demo code samples are reworded to fit the column instead of clipping mid-word.
- A viewport-extremes audit at 320px and 2560px: a markdown table used to satisfy its own
  `width: 100%` by wrapping words inside a cell, breaking an inline code token like
  `[text](address)` across lines at a narrow width. Every other hunted surface (the video
  facade, the CTA button, FAQ, the banner island, image figures, code blocks, and the
  tag-filter chips) held up at both extremes with no change needed.
- That audit is now a permanent gate: `site-visual.spec.ts` adds light-theme pixel baselines for
  the home page and the reading-surface article at 320px and 2560px, plus one mid-width (1920px)
  baseline on the article that pins the fluid root-scale clamp's active interpolation slope, not
  just its floor and cap.
- A follow-up a11y review of that audit's own fix found it fixed the 320px squeeze but broke
  WCAG 1.3.1: putting `display: block; overflow-x: auto` directly on the `<table>` strips its
  row/cell roles from the accessibility tree in every current engine. Every rendered table now
  sits inside a `.table-scroll` wrapper instead, a small rehype step in the showcase's own render
  pipeline (`table-scroll.ts`, composed onto `renderMarkdown`'s output in `cairn.config.ts`); the
  wrapper carries `role="region"`, a `tabindex` and an `aria-label` naming the table, and the
  scroll, while the table itself keeps `display: table`. The same review flagged the footer nav
  for WCAG 2.5.8: it now carries the same `flex-wrap` and 44px-class tap targets the header nav
  already had. The pixel baselines above are regenerated for both changes.
- The header gains a manual light/dark toggle (`SiteHeader.svelte`), the template's answer to a
  known extensible-lens gap: a returning visitor's choice persists to a `cairn-site-theme` cookie,
  read by a no-flash inline script in `app.html` before first paint; with no stored choice,
  `data-theme` stays unset and the existing `prefers-color-scheme` default still drives the page
  live, with no JS at all. `theme.css`'s dark custom-token block (the on-surface inks, the
  elevation pair, the CTA, the code ramp) gains a `:not([data-theme])` guard alongside a new
  unconditional `[data-theme='cairn-dark']` block, so an explicit choice overrides the system
  scheme for the custom tokens the same way it already does for DaisyUI's own compiled role
  tokens. The added control widens the header row slightly, so the nav wraps onto its own line a
  little earlier at the standard desktop width; the affected pixel baselines are regenerated.

### Editor

- Pasting rich text from Word, Google Docs, or a web page now converts headings, emphasis,
  links, and lists to markdown instead of dropping all formatting; plain-text and image
  paste are unchanged.
- Component blocks open folded when an entry loads; the touch-to-unfold safety invariant is
  unchanged.
- The editor footer shows a live count of open check issues beside the word count (visible
  counterpart of the screen-reader announcer).
- The in-editor cheat-sheet lists undo and redo.
- Editor-facing vocabulary: the create dialog, rename dialog, and media forms say "Address"
  (formerly "Slug"), and the admin sidebar's media item says "Library".

### Added

- `createRenderer`'s `RendererOptions` gains a `remarkPlugins`/`rehypePlugins` seam: a site's own
  unified plugins run after cairn's own markdown- and hast-stage steps, over the already-built
  tree, in place of re-parsing `renderMarkdown`'s output string. Both owned sites' local
  table-scroll post-processing (a hand-rolled `unified().use(rehypeParse, ...)` pipeline run over
  the returned HTML) migrates onto `rehypePlugins`. No consumer action required; the addition is
  additive.
- Every rendered table is now wrapped in a labeled, keyboard-reachable `role="region"` scroll
  region by default (the same `table-scroll` fix both owned sites independently hand-wired), a new
  `RendererOptions.tableScroll` (default `true`) opts out. The showcase and both owned sites delete
  their local `table-scroll.ts` wiring in favor of the built-in default. No consumer action
  required for a site with no local table-scroll wiring of its own; a site that already wraps
  tables itself sets `tableScroll: false` to avoid a doubled wrapper.
- `sitemapView` gains a fourth `extraRoutes` argument: a site's own bespoke, non-concept pages (an
  about page, a tag index), as root-relative paths, become origin-anchored `SitemapUrl`s ahead of
  the concept URLs, so a whole sitemap route can come from one call instead of a hand-built array.
  A new `unlistedRoutes` helper flags a site's static page-route ids missing from that same list, so
  a forgotten page directory fails the site's own test suite instead of shipping a silent sitemap
  gap. No consumer action required; both additions are additive.
- `CairnHead` gains an optional `titleTemplate`, a `(title: string) => string` callback carrying
  a site's own title-suffix convention (for example the `· 907.life` or `— ECXC` pattern each
  owned site was hand-building at every call site). It applies to `seo.title` only when `title`
  is left undefined, so an explicit `title` or `title={false}` still wins. Both owned sites'
  entry pages migrate their inline title-suffix string onto it. No consumer action required; the
  addition is additive.

### Fixed

- `examples/showcase/svelte.config.js` now sets `csrf: { checkOrigin: false }`, matching the
  deploy guide's instruction (cairn's guard owns admin CSRF).
- The `media.upload_failed` log event's documented-but-never-populated `code` field is
  reconciled with the emitters.
- `theme.css`'s fluid type scale was compounding with `site.css`'s root clamp: both are
  viewport-driven, and a step expressed in `rem` multiplies whatever the root's own clamp
  currently is, so body text overshot to about 21 to 22px at desktop-and-up widths instead of the
  intended high-17s. Every `--text-step-*` ceiling is rescaled by the same factor (holding every
  step-to-step ratio) so body tops out at 17px on its own before the root clamp takes over, landing
  at about 17px at 1440px and about 19px at 2560px. A site that copied `theme.css` during
  scaffolding (as a re-skin's starting point) and did not touch the type scale should pull the
  same rescale.
- Follow-up to the type-scale fix above: rescaling the ceiling by the same factor as the floor also
  shrank the mobile size (body would have read about 14.85px at 320px), and the mobile end never
  had the overshoot problem the ceiling rescale fixes. Every `--text-step-*` floor now keeps its
  original, pre-rescale value, with each step's middle term recomputed for a smooth interpolation
  between that floor and the rescaled ceiling; body stays a comfortable ~17px from 320px up. A site
  that already pulled the ceiling rescale should pull this floor correction too.

### Documentation

- The documentation tree rewritten end to end against the approved information
  architecture: new front doors, the editor arm, 25 guides, a consolidated explanation arm,
  reference restructures, and a rewritten ten-milestone tutorial with typechecked snippets.
  No consumer action required.
- New doc gates: `check:snippets` typechecks every fenced code block against the built
  package; the suspended reference, signature, and link gates are re-enabled; a monthly
  cloud drift routine samples published pages against the code
  (`docs/internal/docs-maintenance.md` records the system).

### Chassis boundary (showcase; internal reorganization, no consumer action)

- The showcase's `src/lib` splits into `src/chassis/` (the genre-free layer: delivery content
  and feed wiring, the one server-side runtime composition point, the dev-backend feature
  flag, the component-grammar icon wiring, the light/dark toggle mechanism, the token system,
  the prose foundation, and the card/band/section/hero/sidebar composition primitives) and
  `src/theme/` (Waymark's own adapter config, chrome components, and real color/type values),
  with `$chassis`/`$theme` SvelteKit aliases mirroring the split. `src/chassis/README.md`
  states the boundary rule ("a theme is everything that isn't chassis"), every override seam,
  and a removal note per element proving the chassis is subtractable, not a fixed contract; a
  new `check:chassis-boundary` gate fails any theme import that reaches chassis internals
  instead of one of the documented seams. Both owned sites (907.life, ecxc.ski) restructured
  onto the identical split in their own repos, verified against their live sitemaps with an
  exact permalink crawl and no rendering change. No consumer action required: the package's
  public API is unaffected, and a site that has not adopted this showcase reorganization loses
  nothing.
- `composition.css` gains a sticky-footer flex-column recipe, `.cairn-site-shell` /
  `.cairn-site-main`, harvested from the first theme port (AstroPaper): a flex item's own width
  is auto and does not resolve against the flex line the way a plain block's width does, so a
  wide descendant anywhere inside a growing `<main>` silently breaks the layout at narrow
  viewports unless the item carries an explicit width. `.cairn-site-main` bakes the fix in so
  the next theme adopting this shape gets it for free. No consumer action required.

### Editor experience

- The create dialog, the Change URL control, and the media library's asset metadata form now
  label an entry or asset's URL field "Address" rather than "Slug", matching the vocabulary the
  docs already used. The matching validation errors (an invalid value, a collision, a no-op
  rename) read "address" instead of "slug" too. The stored field name and every internal
  identifier stay `slug`; only the editor-facing copy changed.
- Pasting rich text from Word, Google Docs, or a web page now converts its formatting to
  markdown instead of dropping it: headings, bold and italic emphasis (including Google Docs'
  style-attribute runs), links, and bulleted or numbered lists all arrive as the matching
  marks. Anything else (a table, an image, code, a blockquote, strikethrough) degrades to its
  plain text. Plain-text paste and image paste are unchanged. New dependencies: `rehype-parse`
  and `rehype-remark`, both official unified.js packages already alongside `rehype-sanitize`
  and `remark-rehype`.

## 0.80.0

<!-- release-size: minor -->

### Waymark starter components (showcase/template only; no consumer action)

- The starter template gains six content components, each a worked `defineComponent` with a
  schema-driven picker form: `icon` (renders only names from the adapter's declared icon set,
  loud failure on an unknown name), `video` (a zero-request static facade that links out;
  in-page embedding would need `iframe` through the sanitize floor and is deliberately not
  done), `pull-quote`, `cta`, and `faq` (native `details`, markdown-capable answer slot).
- The converter island demo is retired. Its replacement exemplar is an expiring-announcement
  banner: frontmatter-date-driven, hides itself after expiry (checked at both build and
  hydration), renders nothing on an invalid date.
- Not shipped, recorded: `figure` needs no component (the engine owns `:::figure` natively;
  the name is reserved), and `gallery` waits on the component-attribute image gap filed in
  ROADMAP.

# Changelog

All notable changes to this project are recorded here, most recent first.

## 0.79.0

<!-- release-size: minor -->

The pre-beta surface-pruning pass shrinks and firms the public contract to exactly what the beta
freeze will promise. An adversarial audit (19 agents: a prosecutor per export subpath, an Opus
defender, three shape auditors) convicted every demoted name for having no real consumer import
across the showcase, ecxc-ski, and 907-life; `docs/internal/api-surface.md`'s diff for this pass is
the exhaustive, generated list, since the counts below summarize rather than enumerate.

The root `@glw907/cairn-cms` barrel sheds 72 content-graph, manifest, component-grammar, and
field-arm internals plus the duplicate `ResolvedReference` re-export (its home is `/delivery`);
every demoted symbol keeps living in its module for the engine's own relative imports, nothing is
deleted. `/sveltekit` loses `isPublicAdminPath`, `parseAdminPath`, `AdminView`, and `NavRoutesDeps`,
and `ContentRoutesDeps` loses its `backend` test-injection member from the published type (the
factories now resolve their backend from `event.locals.backend`, the same seam the dev double
already rides). `/components` loses `ComponentInsertDialog`, `ComponentForm`, `IconPicker`, and
`LinkPicker`, plus the three `spellcheck-worker`/`spellcheck-assets` export-map keys;
`MarkdownEditor` already resolves the spellcheck worker and its two assets itself through a
module-relative `new URL(..., import.meta.url)`, so no consumer needs a frozen public subpath for
them, and the showcase's spike route that imported them is deleted. `/delivery` and
`/delivery/data` each lose `createSiteResolver`, `ConceptIndex`, `createContentIndex`, `RawFile`,
`fromGlob`, `wordCount`, and `permalink`, all internals of the `createSiteIndexes` hand-assembly
escape hatch. `/media` loses 14 names: the manifest CRUD, the content-hash naming helpers, the
Cloudflare Images transform-URL builders, and `manifestMediaResolver`. `/vite` loses
`writeManifest`, `readAdapterFacts`, `AdapterFacts`, `verifyManifestFromVite`,
`buildManifestFromVite`, and `stripCairnManifest`, keeping only `cairnManifest` and
`CairnManifestOptions`.

Five shape reshapes ride the same window. `ConceptConfig.routing` closes to the
`'feed' | 'page' | 'embedded'` shorthand union; the `RoutingRule` object form leaves the barrel, and
`resolveRouting` now throws on a defined-but-unrecognized routing value instead of silently
resolving to `undefined`, closing the runtime edge a cast can still reach around the closed
compile-time union. `parseSiteConfig` becomes loud about the config boundary: an unrecognized
top-level `site.config.yaml` key throws, and a closed set of adapter-owned keys
(`content`, `backend`, `email`, `rendering`, `media`, `editor`) names `cairn.config.ts` as their
correct home. `createMediaRoute` now takes the composed `runtime` and reads `resolvedAssets`
itself, matching every other route factory's convention, so `ResolvedAssetConfig` stops being
load-bearing `/sveltekit` surface (it stays exported from `/media`). `CairnAdminDeps` and
`ContentRoutesDeps` regroup their flat `branding`/`send`/`anthropic`/`tidyTimeoutMs` members into
two cohesive bags, `auth` and `tidy`. A new `CairnPlatformBindings` interface names every binding
the engine reads off `platform.env` at runtime: `AUTH_DB`, `EMAIL`, `PUBLIC_ORIGIN`, and
`GITHUB_APP_PRIVATE_KEY_B64` are required, and the opt-in tidy action's `ANTHROPIC_API_KEY` is
optional, so an `app.d.ts` intersection missing a required binding now fails at compile time
instead of surfacing as a runtime `config.bindings-missing` error. The GitHub App's id and
installation id are not runtime bindings; they are compile-time adapter config passed to
`githubApp({ appId, installationId })`. A separate `CairnMediaBindings` carries `MEDIA_BUCKET`,
present only on a media-enabled site. Finally, `src/lib` leaves the npm tarball's `files` array; the package ships only `dist` and
`CHANGELOG.md`, and a packaging boundary test locks a deep import of shipped source or an
unexported `dist` path to fail closed with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

The pass also lands the gate-enforced three-tier stability vocabulary: `Extension API` and
`Scaffold API` (both existing) are the frozen contract, and a new `Unstable API` tier marks an
export that stays importable with no stability promise across minors. `check:reference` now fails
on any enumerated export missing a tier and on any backticked name in a page's export table or
heading that no longer exists in that subpath's exports (the reverse stale-prose lock). The sweep
assigns `Unstable API` to the eleven page-level components, the four piecewise route factories and
their config/deps/result satellite types, and `feedView`; `MarkdownEditor`'s stable contract
narrows to eleven props (`value`, `name`, `registerInsert`, `registerFormat`,
`completionSources`, `focusMode`, `typewriter`, `surface`, `spellcheck`, `spellcheckDictionary`,
`siteDictionary`), with every other prop documented as `Unstable API` `EditPage` wiring.

This is breaking. Consumers must:

- Import `ResolvedReference` from `@glw907/cairn-cms/delivery`, not the root barrel (no known
  consumer imported it from root).
- Pass the runtime to `createMediaRoute(runtime)` instead of `runtime.resolvedAssets`.
- Regroup `createCairnAdmin` deps: `anthropic` becomes `tidy.client`, `tidyTimeoutMs` becomes
  `tidy.timeoutMs`, and `branding`/`send` become `auth.branding`/`auth.send`.
- Declare a concept's `routing` with only the string shorthand; the `RoutingRule` object form no
  longer type-checks or resolves at runtime (no known consumer used the object form).
- Fix a `site.config.yaml` that carries an adapter-owned or otherwise unrecognized top-level key;
  `parseSiteConfig` now throws with the key's correct home.
- Declare `Platform.env` via `CairnPlatformBindings & CairnMediaBindings & { /* the site's own
  bindings */ }` (recommended, not strictly required) instead of hand-listing each binding.
- Stop importing any name demoted above; `docs/internal/api-surface.md`'s diff for this pass is
  the authoritative list, and grepping the showcase, ecxc-ski, and 907-life found no consumer
  import touching any of them, so no site is known to need this action.

The code-polish pass converges the whole engine, the gate scripts, the tests, the Wayfinder
showcase, and the dev package on one agent-facing idiom charter (`docs/internal/code-idioms.md`),
behavior-preserving throughout: a survey of ~10 subsystems catalogued every divergent pattern
family (error and result shapes, validation, factory anatomy, module layout, naming, async
patterns, logging, test structure, Svelte component anatomy), and a module-by-module sweep applied
the picked convention with `check:surface` and the signatures gate as a machine-checked invariant
at every cluster. `content-routes.ts`, the codebase's largest file at 3,435 lines and its densest
duplication cluster, decomposes into per-domain internal modules (media, tidy, settings and
vocabulary, dictionary, core content actions) behind an unchanged `createContentRoutes` composer.
The sweep also dedupes real duplication across clusters: the sveltekit-routes cluster's dead
exports and entry-action preamble, the tests cluster's shared harnesses, the admin cluster's
dialog and segmented-control and typed-confirm and fetch idioms (dropping redundant ARIA roles the
convergence made unnecessary), the editor cluster's async-race guards and fetch round trips, the
content and nav-config clusters' shared helpers, the media and delivery clusters' error-message
idiom, the auth-github and tooling and scripts clusters' module layout and indentation, and the
showcase's structural idioms. A new root gate, `check:consumers`, typechecks the showcase and the
dev package against the published surface so a public reshape can no longer silently break either,
closing the incident class the pruning pass's Task 6 surfaced. The admin CSS build's Tailwind
content detection now scopes to the components glob instead of scanning the whole repo, shrinking
the shipped `dist/components/cairn-admin.css` by 31% (415,976 to 286,719 bytes) with the
`admin-visual` baseline proving no real utility dropped. A guarded rider wrote a component-test
suite pinning the leaf-field-rendering family's two deliberately different conventions
(`FieldInput`'s native uncontrolled form participation, `ComponentForm`'s controlled
touched-tracking validation, and the phase-3a multi-instance focus model) before evaluating whether
to merge them; the merge proved architecturally wrong on all four walls the guard suite now pins
permanently, so it did not land (see `ROADMAP.md`, "Later," for the narrower prop-context dedup
that remains).

This is breaking. Consumers must: rename any direct call onto the `createContentRoutes` return that
dropped the `Action` suffix (`mediaLibraryUpload` to `mediaLibraryUploadAction`, `mediaBulkDelete`
to `mediaBulkDeleteAction`, `mediaOrphanScan` to `mediaOrphanScanAction`, `mediaPurgeOrphans` to
`mediaPurgeOrphansAction`, `mediaReplacePreview` to `mediaReplacePreviewAction`,
`mediaReplaceApply` to `mediaReplaceApplyAction`, `mediaAltPreview` to `mediaAltPreviewAction`,
`mediaAltApply` to `mediaAltApplyAction`, `addDictionaryWord` to `addDictionaryWordAction`); the
SvelteKit named-action wire names (`?/mediaBulkDelete` and kin) are unchanged. Unstable API tier
makes the rename legal across minors, and this pre-beta window makes it cheap.

The owner-gated editor-management actions (add, remove, role change) now log `editor.added`,
`editor.removed`, and `editor.role_changed`, each carrying the acting owner's and the target
editor's email and, where relevant, the role, closing the one route-layer path with no audit
trail (`docs/reference/log-events.md`). No consumer action.

## 0.78.2

<!-- release-size: patch -->

The editor's spellcheck and objective-error suggestion popover is now cairn's own recipe DOM, rendered
through CodeMirror's public `showTooltip` facet instead of the skinned `@codemirror/lint` tooltip. It
matches the admin design language (the Warm Stone surface, DaisyUI buttons, the body face) and gains the
keyboard and screen-reader path it never had: the popover appears when the caret enters a flagged word
without stealing focus, a polite live region announces it, `Alt-Enter` moves focus into the popover, and
Escape returns focus to the editor. The misspelling underline keeps its locked amber color, now tuned for
weight and offset. A `check:cm-internals` gate holds the editor theme's coupling to CodeMirror's internal
classes at a by-name floor, so a future CodeMirror major stays cheap to absorb.

The public API and every other runtime behavior are unchanged, so an upgrading site needs no action.

The editor also gains a coherent accessibility model beyond that popover. A debounced, polite live
region speaks a settled summary of the document's diagnostics ("2 spelling suggestions, 1 style
issue"), so an author knows issues exist without hunting for them. `F8` and `Shift-F8` jump the
caret to the next or previous flagged range and land in the existing popover, bound through
CodeMirror's own exported `nextDiagnostic` / `previousDiagnostic` commands. The directive-fold
control now carries `aria-expanded` alongside a state-neutral name, so a screen reader hears the
fold state instead of a verb-shaped label. The editing surface itself (`.cm-content`) carries an
accessible name, "Markdown source", closing a WCAG 4.1.2 gap the surface had from the start.

The public API is unchanged and every addition is on by default with no new prop, so an upgrading
site needs no action.

The showcase starter template is re-expressed in the same native DaisyUI 5.6 and Tailwind 4 idiom as
the admin. Its design-scale tokens moved into Tailwind's `@theme` namespaces (`--text-step-*`,
`--spacing-*`, `--color-muted`), its chrome folded onto named utilities, and its bespoke custom
surface reached the same zero floor the admin holds, gated by `check:custom-surface` on both trees.
The developer-facing role vocabulary is now published as the versioned seam in
`docs/internal/admin-design-system.md`. The template governs newly scaffolded sites; an upgrading
site needs no action.

The Media Library gains direct image upload. Its two Upload buttons and a drop target that accepts a
file anywhere on the page now open the same name-and-describe capture the editor's insert flow uses,
then store the file and commit its record to `main` in one step, so a new image appears in the
Library without opening a post first. Upload is single-file for now, and a re-upload of identical
bytes is a no-op. A freshly uploaded image is unreferenced until you place it, so its where-used
reads "No references found" until then. The change is admin-side and additive, with no public API,
delivery, or manifest-schema change, so an upgrading site needs no action.

## 0.78.1

<!-- release-size: patch -->

The admin interface is re-expressed in native DaisyUI 5.6 and Tailwind 4. The idiomatic re-expression
sweep (Phases 2 through 6) retired the admin's bespoke arbitrary-token color classes (the
`var(--color-muted)` and `var(--color-subtle)` references a component wrapped in square brackets) to the
named `text-muted` and `text-subtle` role utilities across every admin component, ending at a zero
retired-token floor that a `check:custom-surface` gate now holds. The work changes only the admin's
internal styling, which a consumer never imports.

The public API and runtime behavior are unchanged, so an upgrading site needs no action. Phases 0 and 1
of the same sweep (the gate and the role vocabulary, and the vocabulary-screen pilot) shipped in `0.78.0`.

## 0.78.0

<!-- release-size: minor -->

The taxonomy marker now drives a concept's tags. A concept declares its tag field by marking one
top-level multiselect `taxonomy: true`, and the content index reads that field's validated value for
each entry's tags. The content index and the feed categories both read the marked field.
The old behavior read a field hardcoded as `tags`, so a concept whose tag field has another name now
needs the marker. Released as `0.78.0`, the first free minor after the held `0.77.0`; since `0.77.0`
was never published, this publish rolls both windows for a site upgrading from `0.76.0`.

A concept marks at most one top-level field, and the marker is top-level only. The field set
constructor throws at startup on a second marked field or a marker nested inside an `object` or
`array`, the mirror of the single-SEO-image rule. An unmarked multiselect named `tags`, `freetags`, or
`categories` is legal but draws a `taxonomy.unmarked_field` build advisory, since it reads as a tag
field a site forgot to mark.

This is breaking. Consumers must: mark each concept's tag field by adding `taxonomy: true` to its
top-level multiselect. A concept with no tag field needs no change.

`createPublicRoutes` resolves one entry per request path. It returns `{ entryLoad, entries }`;
`entryLoad(event)` returns the entry payload and throws `error(404)` on a miss. The pre-`0.77.0`
`archiveLoad`, `tagIndexLoad`, and `tagLoad` loaders are removed: cairn ships no public tag pages, and a
site renders an archive from `site.concept(id).all()` and a tag list from the tags-as-data on
`ContentSummary.tags`.

This is breaking. Consumers must: drop any call to the removed `archiveLoad`, `tagIndexLoad`, or
`tagLoad`; render those surfaces from `site.concept(id).all()` and `ContentSummary.tags` in site code.
The catch-all keeps calling `entryLoad`; no `data.kind` branching is needed.

A site can now configure an editor-owned tag vocabulary. A new `vocabulary` key in `site.config.yaml`
lists the allowed tags as `{ value, label }` entries, validated at build through the new public
`validateVocabulary`, `extractVocabulary`, and `setVocabulary` functions and the `VocabularyEntry` type.
Once a site configures a vocabulary, the concept's taxonomy field (the multiselect it marks
`taxonomy: true`) becomes a closed picker on save and on edit: the editor picks from the configured
tags, and a save of a value that is neither in the vocabulary nor already on the entry is rejected. A
value already on an entry that the vocabulary does not list, an orphan, is preserved, never silently
dropped, and renders flagged "not in your tag list." `ManifestEntry.tags` now carries each entry's
projected tags.

This is opt-in and non-breaking. A site with no `vocabulary` key is unaffected: the taxonomy field
stays the open creatable multiselect it is today. The build read is unchanged, since tags-as-data is
identical with or without a vocabulary; enforcement is a save-and-edit concern only. Consumers must:
nothing.

An editor can now curate the vocabulary from the admin. A new `vocabulary` admin view at
`/admin/vocabulary`, with a `saveVocabulary` action, lets an editor add a tag, rename a tag's label,
delete an unused tag, and seed the list from tags already in use on posts but absent from the
vocabulary. Deleting a tag that is in use across the default branch or any open edit branch is
rejected, failing closed, so a tag stays until the posts that use it drop it. The screen commits the
curated list to the `vocabulary` key in `site.config.yaml`. The size-gated archive tag filter is a
showcase and template surface, the site's own design over `ContentSummary.tags`; cairn ships no public
filter component.

This is opt-in and non-breaking. The screen appears for any site, and edits it only when an editor
saves; a site that configures no vocabulary simply curates an empty list. Consumers must: nothing.

## 0.77.0

<!-- release-size: minor -->

The developer-extensibility seam: a site can add its own admin screen as a normal SvelteKit route under
`/admin/`, rendered inside cairn's chrome, behind the editor login, with a data-only sidebar entry. This
entry covers Plan 1 (the capability); the boundary-enforcement work (Plan 2) lands under the same `0.77.0`
and the release ships once both are in, so this version stays unpublished until then. cairn is still `0.x`
and the contract may change again before a stable 1.0; this release is breaking and applies the "Consumers
must" steps below.

What changed. cairn's admin chrome moves out of the `CairnAdmin` view switch into a shared
`/admin/+layout.svelte` that renders the new exported `CairnAdminShell` component. The catch-all
`/admin/[...path]` route now renders bare inside that shell. A concrete route you add, such as
`/admin/signups`, wins over the catch-all and inherits the admin guard, so `locals.editor` and the
exported `requireSession`/`requireOwner` helpers work with no extra wiring. A new `adminNav` config field
on the adapter's `editor` group adds a sidebar entry as plain data, validated at startup against a typed
icon allowlist and the built-in routes. See [Add a custom admin screen](docs/guides/add-a-custom-admin-screen.md).

The enforced boundary (Plan 2). The public surface is now a versioned, enforced contract, not merely a
documented one, so an extension survives engine updates and a surface change is a deliberate, visible event.
Every export is labeled `Stability tier: Extension API` (hand-author against this; promised hardest) or
`Stability tier: Scaffold API` (generated by `create-cairn-site`), and a build-time gate snapshots the full
declared shape of every export and fails loud on undisclosed drift. `cairn-doctor` gains a best-effort,
non-blocking check that nudges when the four-file `/admin` mount looks incomplete. These are engine-internal
gates; the consumer-visible change is the per-export stability tiers in the reference docs and the
`LayoutData` removal below.

This is breaking. Consumers must, in order:

1. Add the shell layout mount. Create `src/routes/admin/+layout.server.ts` with `export const load =
   admin.shellLoad;` and `src/routes/admin/+layout.svelte` that renders `<CairnAdminShell
   data={data.shell}>{@render children()}</CairnAdminShell>`. The chrome no longer rides the catch-all
   load; it rides this layout. Copy the showcase files at `examples/showcase/src/routes/admin/`.
2. Rename `AdminLayout` to `CairnAdminShell`. The component export is renamed. A site on the canonical
   single-mount never imported it directly, so this affects only a hand-rolled per-route mount.
3. Read `siteName` and other shell fields from `page.data.shell`, not `data.layout`. The per-view
   `AdminData` members no longer carry a `layout` field; the shell payload is the one source.
4. No action for `requireOwner`. It now accepts a minimal `{ locals: { editor } }` event, which widens
   the old signature, so existing callers keep working and a custom route can pass its standard load
   event.
5. Remove any `import type { LayoutData }`. `LayoutData` is removed from `@glw907/cairn-cms/sveltekit`;
   read the admin payload from `AdminShellData` (via `page.data.shell`) instead.

## 0.76.0

<!-- release-size: minor -->

The Contract v2 rollup, plus content islands, published as one release. cairn is still `0.x` and the
contract may change again before a stable 1.0. This consolidates the unpublished `0.69.0`–`0.75.0`
development minors plus islands into one published `0.76.0` release. The last published release was
`0.68.0`, so a consumer crosses the whole window in a single jump and applies the "Consumers must" steps
below; the granular per-phase history lives in `docs/STATUS.md` and the plan post-mortems.

What changed. The field system unifies on the `fieldset({...})` record built from the `fields.*`
constructors, the one live field system for concepts and directive components alike, with the leaf
vocabulary (`text`, `textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`,
`boolean`, `image`, `icon`, `reference`) plus the `object` and `array` containers. The adapter moves from
flat keys into six subsystem groups (`content`, `backend`, `email`, `rendering`, `media`, `editor`), and a
concept owns its own URL policy through `defineConcept`. The `backend` becomes a `Backend` interface behind
a `githubApp(...)` provider, so content stays build-time over the committed manifest and no runtime database
slips in. The `render` seam becomes the entry-aware `render({ body, concept?, frontmatter?, resolve?,
resolveMedia? }) => Promise<string>`. Content islands add opt-in client interactivity over a static, no-JS
fallback. References and structured fields arrive additively.

This is breaking. Consumers must, in order:

The field system (replaces the v1 `defineFields`):

1. Move each concept's `schema` from `defineFields([...])` (an array) to `fieldset({...})` (a record).
2. Drop the per-field `name`; the record key is now the frontmatter key.
3. Rename field help from `description` to `help`.
4. Move a closed `tags` field to `fields.multiselect({ options: [...] })`, and an open `freetags` field to
   `fields.multiselect({ creatable: true })` (its `placeholder` is preserved).
5. Preserve each field's frontmatter key, especially `tags`, or tag pages and feeds read empty.
6. Extract a frontmatter type with `InferFieldset`, and drop imports of the removed `defineFields`,
   `ConceptSchema`, `Infer`, `InferFields`, `DefineFieldsOptions`, `FrontmatterField`, `TagsField`, and
   `FreeTagsField`.

The adapter and concepts:

7. Regroup the adapter into `content`/`backend`/`email`/`rendering`/`media`/`editor` (`sender` to `email`,
   `render`/`registry`/`icons` to `rendering.{render,components,icons}`, `assets` to `media`,
   `navMenu`/`preview`/`supportContact` to `editor.{nav,preview,supportContact}`).
8. Rename each concept's `schema:` to `fields:` and declare it through `defineConcept`.
9. Move `permalink` and `datePrefix` from the YAML `content:` block onto the concept via `defineConcept`,
   and declare each concept's routing with the routing shorthand. A leftover YAML `content:` block now
   throws at `parseSiteConfig`.
10. Move `siteName` out of the adapter into the YAML site-config.

Directive components:

11. Declare each component's `attributes` as a `fields.*` record (was an `AttributeField[]` array), a
    repeatable slot's `itemFields` the same way, and wrap each component in `defineComponent({ ... })`.
12. Move any cross-field attribute `validate` into the component's `behavior` table with the
    `validate(value, siblings)` signature, reading `siblings.min` rather than `all.attributes.min`.
13. Replace a `pattern: { source, message }` attribute with `fields.text({ pattern })` plus a
    `behavior.validate` for a custom message, and drop imports of `AttributeField` and `FieldType`.
    Attribute validation now format-checks every value, so a directive that previously saved a malformed
    value now fails `validateComponent`.

The backend:

14. Change the adapter's `backend` from a `{ owner, repo, branch, appId, installationId }` object literal to
    `backend: githubApp({ ... })`, importing `githubApp` from `@glw907/cairn-cms`. Drop imports of the
    removed `BackendConfig`, `RepoRef`, and `AppCredentials`, and replace `GithubKeyEnv` (from the
    `/sveltekit` subpath) with `BackendEnv`.

The render seam:

15. Change the adapter `render` from `(md, opts) => ...` to
    `({ body, resolve, resolveMedia }) => ...`, read the markdown from `body`, and return a
    `Promise<string>` (a typical body is `renderMarkdown(body, { resolve, resolveMedia })`). Drop any
    `stagger` option; `data-rise` is now always emitted and is inert without `[data-rise]` CSS. The
    attribute now appears in all rendered output, including the syndication feeds and prerendered pages,
    so a consumer that snapshots rendered HTML sees it.

Additive in this window, with no action required to keep working: reference fields (`fields.reference` and
`fields.array(fields.reference(...))`), structured fields (`fields.object` and the generalized
`fields.array`), and content islands (`hydrate` on a component, `rendering.islands`, and the `./islands`
runtime). Adopt them through their guides: [references](docs/guides/link-content-with-references.md),
[structured fields](docs/guides/structured-fields.md), and [islands](docs/guides/add-an-island.md).

ecxc-ski and 907-life stay pinned to the prior version range until they cut over. See [Upgrading
cairn](docs/guides/upgrade-cairn.md) for the per-change actions.

## 0.68.0

<!-- release-size: minor -->

The second pre-cutover engine-hardening pass clears eight engine-misc items: two admin accessibility
fixes, an engine default-icon fallback, and gate, doc, and tooling hygiene.

The component picker dialog now caps its height at 85vh and scrolls its catalog within a held header
and footer, so a long catalog no longer takes the page over. A repeated content-lifecycle error in the
concept list now re-announces to a screen reader: the errors route through one polite live region that
re-speaks an identical message through an invisible nonce, and the visible alerts drop their redundant
`role` so the message announces once.

The component registry ships a default role-to-glyph fallback for the conventional admonition roles
(`note`, `tip`, `important`, `warning`, `caution`, `info`, `danger`). A component that declares an icon
field but no `defaultIconByRole` entry for a role now resolves the engine default, which a site's icon
set styles; a component's own `defaultIconByRole` still wins. The `ComponentDef.icon` and
`defaultIconByRole` guidance now states the "logically representative, prefer distinct" rule.

Three gates and one doc tightened: the admin-prose gate now scans the `.ts` copy modules it skipped, a
new `check:dev-package` gate type-checks and comment-lints `packages/**` in CI, the two
`rehype-dispatch` helpers gained real doc contracts, and the friction log marks its killed and shipped
items resolved so it stops resurfacing dead work.

No consumer action is required. The accessibility fixes and the icon fallback are additive; a site using
the registry's `defaultIcon` may now see an engine default glyph where it previously saw none.

## 0.67.0

<!-- release-size: minor -->

The Contract v2 `fieldset` validator reaches constraint parity with `defineFields`, the first of two
pre-cutover engine-hardening passes. Both validators now call one shared constraint module, so they
cannot drift, and a v1-vs-v2 parity matrix proves they agree on the overlapping field types.

The `fieldset` validator gains the checks it lacked. A `text` or `textarea` field now enforces its
`min`, `max`, `length`, and `pattern`, and a `date` field enforces its `min` and `max`, with the same
messages `defineFields` produces. A malformed `pattern` now fails at `fieldset()` call time, not on
every save, the way `defineFields` already compiled patterns at declaration. The validator also reads a
parsed value, not only a form string: a numeric `number` (a finite `0` included), a `Date` on a
`datetime` field, the way the `date` field already coerced a parsed `Date`. A `multiselect` given a lone
scalar (a single hand-edited `tags: news`) coerces it to a single-element list rather than dropping it
or reporting a misleading "required".

No consumer action is required. The `fieldset` surface is still additive and not yet wired into the
adapter or editor, and the new behavior brings it in line with the long-standing `defineFields` checks.

## 0.66.0

<!-- release-size: minor -->

Contract v2 begins with an additive `fields.*` field vocabulary, exported beside the existing
`defineFields` model. The new surface is opt-in and does not yet wire into the adapter or editor, so a
site on the current field model is unaffected.

A concept can declare its fields as a record of `fields.*` constructors, each returning a plain-data
descriptor. The scalars are `text`, `textarea`, `number`, `select`, `multiselect`, `url`, `email`,
`date`, `datetime`, and `boolean`, with `image` as the rich leaf. `fieldset(record)` derives a
server-side validator from those descriptors, returning field-keyed errors or normalized data, and
exposes Standard Schema v1 at its boundary. `InferFieldset` reads the inferred frontmatter type from a
fieldset, and `initialValues` resolves each field's `default` for the editor form, including the
`'today'` sentinel on a date field through an injected clock. The new root-barrel exports are `fields`,
`fieldset`, `initialValues`, and the types `FieldDescriptor`, `Fieldset`, `InferFieldset`,
`FieldsetOptions`, and `BehaviorTable`.

No consumer action is required. The vocabulary is a foundation; the contract-v2 cutover, a later
breaking release, migrates concepts off `defineFields` and carries the "Consumers must:" line then.

## 0.65.0

<!-- release-size: minor -->

Build-time syntax highlighting moves into the engine render pipeline, and the public side gains the
Waymark design foundation in the showcase template (the scaffolder's Part B2).

Fenced code is now highlighted at build time. The render pipeline runs Shiki at build and SSR and
emits role-bound `.cairn-tok-*` token classes with no inline style and no client highlighter, so the
reading route ships no highlighter JavaScript and the colors come from the site's theme. The engine
owns the `.cairn-tok-*` class contract (the way it owns `.cairn-place-*` for figures); a site styles
the classes from its own `--cairn-code-*` variables. Adds `shiki` and `hast-util-to-string` to the
engine's dependencies.

GFM task-list checkboxes now carry an `aria-label` from their item text, so a screen reader names the
read-only control. This clears an axe `label` violation on every site while keeping the real disabled
input the design calls for.

No consumer action is required. A site gets highlighting automatically; to color the tokens, style the
`.cairn-tok-*` classes from a `--cairn-code-*` ramp (the Waymark showcase template does this, bound to
the DaisyUI roles). The broader Waymark design foundation (the oklch token layer, the bespoke reading
surface, the chrome, the `/styleguide` route, and the dual-gamut contrast, token-resolution, and
re-skin CI gates) ships in `examples/showcase`, the deployable starter, not the published engine.

## 0.64.0

<!-- release-size: minor -->

A small pre-Part-B DX pass fixes two engine warts the scaffolder's template would otherwise bake in,
and retires a third item that was already resolved.

`readCommittedManifest`, exported from `/media`, reads a committed media manifest from an
`import.meta.glob` result and degrades a missing file to an empty manifest. A fresh site with no
`src/content/.cairn/media.json` no longer fails its build: the static import that crashed gives way to
the glob, which returns `{}` for no match. The showcase reads its manifest this way.

A new `media.resolver_absent` log event (level `warn`) makes a silently-broken public-image setup
diagnosable. The public route emits it once, at construction, when media is configured on but no
`resolveMedia` reached it, so a forgotten resolver wiring becomes a queryable Workers Logs event
instead of a bare `media:` token on every hero image. `PublicRoutesDeps` gains an optional
`assetsEnabled` flag a site threads from its resolved asset config.

No consumer action is required. A site that wants the no-crash manifest read can adopt
`readCommittedManifest`, and a site that wants the resolver diagnostic threads `assetsEnabled` into
`createPublicRoutes`.

## 0.63.0

<!-- release-size: minor -->

The local-development fake backend moves out of the engine and the showcase into a separate, dev-only
package, `@glw907/cairn-cms-dev`, the first part of the `create-cairn-site` scaffolder. The package
holds the in-memory GitHub, R2, D1, and Anthropic doubles and a blessed `devBackendHandle()` that
installs them and an owner-session bypass, so a site runs `/admin` locally with no cloud accounts. A
consumer installs it as a `devDependency` and activates it from `hooks.server.ts` behind a
build-foldable `dev` gate, so a production build eliminates it from the bundle.

The auth guard gains a fail-closed tripwire. If `CAIRN_DEV_BACKEND` is set in a deployed runtime, the
guard refuses the request with a 503 and logs `guard.rejected` with `reason: "dev_backend_in_prod"`.
It reads the flag from both the Worker `platform.env` and `process.env`, so it fires on Cloudflare and
adapter-node alike. `AuthEnv` carries a new optional `CAIRN_DEV_BACKEND?: string | boolean` field for
it.

No consumer action is required. The tripwire fires only when the flag is set, and the new package is
opt-in for sites that want the local dev backend.

## 0.62.2

The edit-load address-collision advisory now checks the published corpus only. It fires when an entry
you are editing collides with an entry already published on `main`, and it no longer reads sibling
`cairn/<concept>/<id>` branches when an editor opens an entry, so opening the editor adds no GitHub
reads. The publish-time re-check is unchanged: it stays full cross-branch and still emits the
`publish.address_collision` log event when a publish overrides another entry's address. No consumer
action is required.

## 0.62.1

The entry editor gains an advisory channel and its first notice: a cross-branch address-collision
warning. When another entry already resolves to the same public address, the editor shows a
non-blocking warning that names that entry and links to it. The warning never blocks Publish. It makes
the last-write-wins outcome visible instead of silent, since publishing replaces whatever currently
lives at that address.

The check runs at edit-load across `main` and every open `cairn/<concept>/<id>` branch. A publish
re-checks the address and emits a `publish.address_collision` log event (level `warn`, fields `editor`,
`address`, `displacedConcept`, `displacedId`) when it overrides one. The existing needs-alt notice now
renders through the same advisory region, with its live count and per-row actions unchanged.

This adds two exported types on `/sveltekit`, `AdvisoryNotice` and `AdvisoryAction`, the shape
`EditData.advisories` carries. No consumer action is required.

## 0.62.0

<!-- release-size: minor -->

The admin gains a Help home, the pull half of the in-admin editor help. It is a standing screen at
`/admin/help`, reached from a labeled Help home pinned at the foot of the office sidebar (and from the
Ctrl+K command palette).

The screen carries three sections. A getting-started checklist derives its progress from what is
really on the site: writing a post, publishing one, and creating a page. The count is never stored, so
it always reflects the corpus, and the whole section drops away once all three steps are done. A hide
control tucks it away per device. A formatting reference promotes the editor's Ctrl+/ cheat sheet to a
standing two-column table. A support hand-off points a stuck author at the site's `supportContact`,
shaped to the contact (an email opens a `mailto`, a URL opens a link, anything else shows as a note),
and it renders only when the adapter sets one.

This adds two exports: the `HelpHome` component on the `/components` subpath and the `HelpData` type on
`/sveltekit`. The new `/admin/help` route is additive.

No consumer action is required. A site that sets no `supportContact` sees the Help home with a
self-serve line in place of the contact hand-off.

This release also fixes the admin-copy prose gate (`check:prose`): a component whose `@component` doc
comment wrote the literal `<style>` tag had its whole markup silently skipped, so its copy was never
scanned. The gate now strips comments before the script and style blocks.

## 0.61.0

<!-- release-size: minor -->

The editor gains the groundwork for in-admin help. This pass adds the engine seams and one built-in
clarity default the help layer will build on.

A frontmatter field can now carry a `description`: one author-facing sentence shown under the field in
the editor's Details panel and tied to the input with `aria-describedby`. Set it on any field in a
concept's `defineFields` schema.

The `date` field ships a built-in publish-clarity hint ("Sets the date for this post. Publishing is a
separate step you choose.") when the field sets no `description`, so a new site gets the reassurance
without writing per-field copy. A field-level `description` overrides it; the hint cannot be turned
off, only replaced.

The adapter gains an optional `supportContact`: an email, a URL, or a name and instruction the
in-admin help points a stuck editor to. It passes through to the runtime untouched, and the help
renders the hand-off only when it is set, so there is never a button to a blank contact.

The admin design system documents the recipes the help shell will follow, including the non-modal help
region, the single right-slide-over slot, the disclosure-button ARIA contract, the getting-started
progress checklist, and the empty-state starter slot.

No consumer action is required. Every change is additive: the new field and adapter members are
optional, and a site that sets neither sees only the date field's new default hint.

## 0.60.1

A packaging fix so the library bundles cleanly in a Vite 8 consumer. It supersedes `0.60.0`, whose
consumer build failed on Vite 8 / Rolldown. `svelte-package` ships `.svelte` with `<script lang="ts">`
and the TypeScript intact, and Rolldown parses that `<script>` as JavaScript before the Svelte plugin
compiles the file, failing on a TypeScript optional parameter (`registry?: T` loses its type but keeps
the `?`). The shipped `.svelte` now carry a plain-JavaScript `<script>` body. The `lang="ts"` tag
stays, because the component markup still uses TypeScript that the Svelte compiler reads (typed
`{#snippet}` parameters and `{@const x = y as T}` casts).

No consumer action is required. The change is to the published `dist` only; the public API and the
types are unchanged.

## 0.60.0

<!-- release-size: minor -->

The editor learns to copy-edit. Two features land together on the markdown source: a spellcheck that
runs as you write, and an opt-in tidy that reads a draft once with a language model and proposes a
light copy-edit you review before any of it lands.

Spellcheck is on by default. Misspelled words pick up a quiet amber underline, and the correction
popover offers ranked suggestions, an add-to-dictionary action, and an ignore-for-this-session
action, all keyboard-reachable. It runs locally on a Web Worker, so no text leaves the browser, and
it reads the markdown structure: code, links, frontmatter, layout-block machinery, and `media:`
tokens are never flagged. A second quiet layer catches the objective slips spellcheck misses: a
doubled word, a double space inside a line, a stray run of punctuation. The dialect is declared once
per site under `spellcheck.dialect` (default `en-us`), so a British site loads the British word list
and "colour" reads as correct. The personal dictionary is a git-committed file at
`src/content/.cairn/dictionary.txt`, so a word one editor adds is shared with the rest through the
same commit pipeline the content uses.

Tidy is opt-in and off until a developer enables it. When on, an editor runs it over the whole
document or a selection, and cairn reads the draft once through the Anthropic API and computes the
diff locally. The review is a step-in diff dialog: insertions show in green, deletions struck through
in red, and the author's original stays in the buffer until they apply. Objective fixes come pre-kept;
a judgment edit (a configured style normalization, a grammar reword) carries a review-this treatment
and a plain-language reason, and it is not swept by Accept fixes until confirmed. The prompt is built
from the site's own convention config and never harmonizes to the author's habits or guesses an
undeclared style, so an author's voice is preserved. Output is validated as a proofread, not a
restructure: a result that changes the heading structure, the frontmatter, a `media:` token, a code
block, or more than a bounded fraction of the wording is discarded with an honest message and the
document is left untouched. Conventions are edited in a two-tier settings screen and stored in the
committed site config under `tidy.conventions`.

New dependencies: `@codemirror/lint` (the surfacing layer for both spellcheck and the objective-error
underlines), `@anthropic-ai/sdk` (the Worker-side tidy model call, guarded off the client), and
`spellchecker-wasm` plus its bundled English dictionary asset (the spellcheck engine, delivered from
the packaged `dist` so the Worker and the word list reach a consumer build).

No consumer action is required for an existing site. Both features are additive. Spellcheck replaces
the browser's native spell checking with cairn's own, so an upgrading editor sees the new amber
underline and the in-editor correction popover in place of the browser's right-click menu, with no
config change needed. Tidy gives a site nothing until a developer turns it on: set `tidy.enabled: true`
in the site config, add the `ANTHROPIC_API_KEY` Worker secret, and optionally pick a model and
conventions. `cairn doctor` checks that the key is configured once tidy is enabled. The editor
walkthrough is in [write in the editor](docs/guides/write-in-the-editor.md), the developer setup is in
[enable tidy and the editor copy-edit](docs/guides/enable-tidy.md), and the design rationale is in
[the editor copy-edit](docs/explanation/editor-copyedit.md).

## 0.59.0

<!-- release-size: minor -->

The Media Library learns to clear out images in bulk and to collect the files nothing uses any more.
Two surfaces ship together, sharing one safety floor: a strict cross-branch usage index built fresh
per action, and a refusal that commits nothing when usage cannot be verified.

Multi-select lands in both the grid and the table. Tick the images you mean, a sticky bar shows the
count, and one Delete runs the single safe-delete gate across the whole selection. cairn deletes the
assets nothing references and skips any still in use, reporting them rather than force-deleting one.
The batch is one commit that removes the manifest rows before the R2 objects, so a bulk delete is
recoverable from git history the same way a single safe-delete is. The dialog is a plain confirm with
the count, since nothing in use can be removed this way.

Find orphaned files collects stored bytes that drifted loose from content. It pairs a storage
reconcile with a strict usage read and reports two populations. Orphaned files are stored R2 bytes
with no manifest row and no reference anywhere across `main` and every open branch; a branch-only
upload is excluded, because the branch that uploaded it still references it. Broken references are the
reverse, a manifest row whose bytes are gone, shown as a read-only data-integrity readout with no
delete. The scan fails closed at detection: a branch it cannot read produces no result and an offer
to check again, rather than a half-answer that might call an in-use file orphaned.

The byte purge is the one irreversible media action. Everything else in the Library edits git-tracked
state and can be walked back from history, but raw R2 bytes carry no git record, so a purge cannot be
undone. It gates on a typed-count confirm, and at action time it re-derives the orphan set and
re-checks the strict usage index, so a key claimed by a new manifest row or referenced on a branch
since the scan is skipped, never purged. The shipped "Unused" triage facet is renamed to "No
references found", with the raw-HTML caveat stated where an editor acts: absence of a found reference
is not proof of disuse, since cairn cannot see an image hidden in raw HTML or a URL hardcoded in a
template.

No consumer action is required. The whole surface is admin-side and additive, with no public surface
change and no content-format change. An editor walkthrough is in
[manage the media library](docs/guides/manage-the-media-library.md), and the design rationale is in
[media storage](docs/explanation/media-storage.md).

## 0.58.0

<!-- release-size: minor -->

The Media Library learns to fix an image everywhere it is used. Two new operations rewrite every
placement of one asset in a single commit to `main`, each behind a preview an editor confirms before
anything changes. Both read usage across `main` and every open edit branch, both report the held edits
they will not touch, and both fail closed when usage cannot be verified.

Replace swaps the file behind an image without revisiting the pages that use it. cairn is
content-addressed, so a corrected upload is a new object with a new content hash; replace repoints
every published reference from the old hash to the new one and keeps the slug, so `media:first-light.<old>`
becomes `media:first-light.<new>` and the name an author sees is unchanged. The old row and its R2 bytes
are kept, recoverable from git history, rather than erased. A typed-slug confirm gates the apply, since
it rewrites published content and can break a draft, and the preview names the open edit branches still
on the old file. Those branches keep the old file until they republish; they are never rewritten.

Push alt fills missing descriptions from one place. An image's default alt copies into every placement
that has none, in one atomic commit. An explicit opt-in, off by default, also overwrites placements
that already carry a custom alt, since that replaces an author's words. A frontmatter hero marked
decorative is skipped, because its empty alt is deliberate. The media manifest is not changed: the
default alt is read from the row, never rewritten there. Alt fill is reversible and frequent, so it
carries no typed-slug gate.

No consumer action is required. Both operations are admin-side and additive, with no public surface
change and no content-format change. An editor walkthrough is in
[manage the media library](docs/guides/manage-the-media-library.md), and the design rationale is in
[media storage](docs/explanation/media-storage.md).

## 0.57.1

Media polish and cutover DX, the first follow-on after the `0.57.0` media stack. The Media Library
gains the action feedback it lacked: a delete, a rename, and a commit conflict now land on a strip
that confirms the result or shows the error, instead of a silent page. With the detail slide-over open
and focus in the search box, Escape now clears the search and leaves the panel open, rather than doing
both at once. A frontmatter hero marked decorative persists that choice as an additive `decorative` key
on the `image` object, so a deliberately decorative hero stops reading as needs-alt after a reload (a
decorative body image still cannot persist the choice, since markdown alt text has no slot for it). The
reserved-`figure` build error now names the colliding component and points at the fix.

The rest is documentation. The public media resolver wiring moved into the required media setup steps
in both the upgrade guide and the wire-the-delivery guide, since a published `media:` token ships bare
without it. The reserved-`figure` collision is now a prominent breaking callout. A new
[content authoring syntax reference](docs/reference/authoring-syntax.md) documents the `cairn:` and
`media:` token schemes together. The guides now show the `wrangler.toml` binding dialect, the
`@glw907/cairn-cms/media` import path, the empty-`media.json` bootstrap, and the `.site-main` re-scope
for the figure placement CSS.

No consumer action is required. The `decorative` key is additive and optional, so existing content
parses and builds unchanged, and the feedback strip, the Escape fix, and the registry error message
are admin or build-time with no public surface change.

## 0.57.0

Images become first-class. An editor can paste, drag, or insert an image straight into a post, and
cairn stores it, names it by its content, commits it with the entry, and serves it from the site's
own R2 bucket. This is the whole media stack landing together: the foundation that models a stored
image, the infrastructure that ingests and delivers the bytes, and the insert UI that puts it in an
editor's hands. It is additive to the public API, but it needs per-site wiring, so it is a minor.

The foundation models an image as a logical reference, not a path. Content commits a `media:` token
keyed to the first 16 hex characters of the bytes' sha256, so the same image resolves no matter where
it is stored or what it is named, and identical bytes always land at one key. A small git-committed
manifest (`media.json`) carries the human layer the bytes cannot: the display name, the alt text, the
original filename, and the pixel facts. A render-time resolver reads that manifest and rewrites each
`media:` token to its delivery URL, optionally through a Cloudflare Images transform URL when a site
turns transforms on. The adapter's `AssetConfig` grew to declare the R2 bucket binding, the URL form,
the upload limits, and the named variants.

The infrastructure ingests and serves the bytes. A locked-down `/media` delivery route, built from
`createMediaRoute`, streams content-addressed bytes from R2: it validates the hash and extension
before any read, derives the object key from the validated values alone, carries the load-bearing
security headers (nosniff, inline disposition, a `default-src 'none'; sandbox` CSP, a one-year
immutable cache), and forwards `If-None-Match` and `Range` for 304 and 206 responses. An admin
`uploadAction` takes the editor's bytes, hashes them, dedups against the manifest with a put-first
head check, and rejects a hash collision with a 409. A client ingest helper normalizes a HEIC to a
web format before upload. A save merges the editor's optimistic records into `media.json` at commit
time, and the edit load hands the admin preview a lean `mediaTargets` projection so an in-session
image renders before it is committed.

The insert UI puts it in an editor's hands. Three gestures start an insert: paste from the clipboard,
drag a file onto the editor, or the toolbar's Insert image button. A paste or drag opens an at-caret
popover on the capture card with the dropped file; the button opens a chooser with upload first and a
combobox picker below it for reusing an image already on the site. The capture card pre-fills the name
from the filename and never blocks on alt text, so an editor can insert now and describe later. The
inserted reference renders in the editor as an atomic chip (thumbnail, name, and a needs-alt marker),
and an upload still in flight shows a widget-only placeholder with a determinate progress bar that
writes no document text until it resolves. A non-blocking needs-alt notice on the edit page counts the
images still waiting for a description and jumps to each one, never blocking a save or a Publish. The
edit-page preview renders inserted images through the same resolver the live site uses.

Figures land in the same release. An inline image can carry a caption and a placement through a
cairn-reserved `:::figure` directive that wraps the image as a child node. The caption is the
directive's body text, rendered to a real `<figcaption>`, and the placement is a closed role set
(`center`, `wide`, `full`, plus the bare measure default) carried as a class on the `<figure>`. A
persistent editor control wraps a bare image, edits an existing figure's caption and role, or unwraps
it, writing the markdown source the author can read and hand-edit, and the source chip shows the
figure's role so the decoration agrees with the source. `figure` and `figcaption` join the base
sanitize floor, so a captioned figure survives on every site, and `figure` is a reserved directive
name the registry refuses to let a site component shadow. cairn ships default `.cairn-place-*` CSS in
the showcase reference, and a site restyles those classes to own the placement pixels. A guide section
covers it in [add an image](docs/guides/add-an-image.md).

Hero images land in the same release. A Post or Page carries a lead image in frontmatter as a nested
`image: { src, alt, caption }` object, where `src` is a `media:` reference, `alt` is the screen-reader
description, and `caption` is an optional line the template may show. `image` is a new built-in field
type declared through `defineFields` like `text` or `date`. The editor renders it in the details panel
as a one-row resting field that opens the same picker and capture flow the body insert uses. Alt stays
debt, and the needs-alt notice now counts a hero with an empty alt alongside the body images. One
image serves two jobs: the delivery read path resolves the frontmatter reference into a derived
`heroImage` projection the template lays out, and the SEO head reads the same resolved image as the
`og:image` and `twitter:image`. The on-disk `media:` token stays canonical, since resolution is a
separate projection that is never written back. `resolveImageUrl` now rejects a non-http(s) result, so
an unresolved `media:` token degrades to no social image rather than shipping a broken tag. The site
template owns the hero layout: cairn ships the resolved data and the social-card wiring, not a hero
render step. A required `image` field is enforced on the presence of its `src`, never on its alt.

The Media Library lands in the same release. A first-class admin screen at `/admin/media`, a peer of
Posts and Pages, browses every committed asset, shows where each one is used, edits its name and
default alt, and deletes it safely. The resting surface is a contact-sheet grid with a list-density
toggle; a non-modal detail slide-over carries the preview, the alt editor, the grouped where-used
list, and the actions. The Library computes where-used by content hash across `main` and every open
edit branch, so a not-yet-published upload still shows and a renamed slug still resolves. The content
manifest gained an additive `mediaRefs` field per entry to feed the `main` side of that index; an
existing manifest without it still parses and builds. Safe-delete rechecks usage server-side against
a fresh read at delete time, refuses an in-use asset (the in-use face names what would break and
requires typing the slug), commits the manifest row removal before deleting the R2 object, and fails
closed if it cannot verify usage. Rename and default-alt are a single `media.json` row commit with no
reference rewrite, since the resolver and route key on the hash; the default alt is the value
prefilled into the next placement, not a rewrite of alt already committed. Replace, bulk actions, and
tags are deferred.

Consumers must: bind an R2 bucket and mount the delivery route before media works. Add an
`r2_buckets` binding named `MEDIA_BUCKET` in `wrangler.jsonc`, and mount the delivery route at
`src/routes/media/[...path]/+server.ts` with `createMediaRoute(runtime.resolvedAssets)`. Declare the
adapter's `assets` block naming that binding, and regenerate nothing else; media stays off until the
`assets` block is present. Cloudflare Images transforms stay behind the `transformations: false`
default, so a site serves full-size bytes until it opts in. The wiring steps are in
[the upgrade guide](docs/guides/upgrade-cairn.md) and the
[wire the delivery surface guide](docs/guides/wire-the-delivery-surface.md); the surface is documented
in [the media reference](docs/reference/media.md) and
[the sveltekit reference](docs/reference/sveltekit.md).

Consumers must also wire the public media resolver for any public image. The bucket, route, and
`assets` block make media work for the editor, but a published `![](media:...)` (a body image or a
frontmatter hero) ships a bare token to the live page unless the site threads a resolver into the
render path and `createPublicRoutes`. Build one with
`makeMediaResolver(mediaManifest, normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' }))` from
`@glw907/cairn-cms/media`, where `mediaManifest` is the committed `src/content/.cairn/media.json`
(create it as `{}` on a fresh site so the import resolves). The
[upgrade guide](docs/guides/upgrade-cairn.md) gives the full snippet.

Breaking: `figure` is now a reserved directive name. `defineRegistry` throws if a site registers a
component named `figure`, which hard-fails both `cairn-manifest` and the build. A custom `figure` that
the engine's built-in figure now covers should be removed so the site adopts the engine's; a `figure`
that does something else should be renamed. Check too for any hand-authored `:::figure` block in your
content, which now renders as an engine figure.

Recommended, not required: regenerate the content manifest (`cairn-manifest`) and commit it so the
Media Library's `main` where-used is accurate. The `mediaRefs` field is additive, so a site builds
without it, but an un-regenerated manifest reads every published media reference as absent until it
is regenerated. Save and publish keep the field current from then on.

## 0.56.2

The component insert picker gains a live preview and round-trip editing, and the component contract
grows the optional fields that make a good picker possible. These refine the existing
component-editing surface and are all additive, so it is a patch; existing definitions compile
unchanged with no action required.

How the design was reached. Two research arms ran first. One surveyed how comparable systems build
their insert pickers (Gutenberg, Sanity, Wagtail, Payload, Contentful, Builder, and the git-backed and
document tools). The other hunted documented complaints from both the editor and the developer, then
paired each with a correction. Five pains recur across systems that share no code, and cairn already
beats four of them by its existing architecture: a single `ComponentDef` co-locates render and schema
(no schema-render drift), content is markdown in git (no database-migration tax), and the parser reads
real directives (lossless re-edit stays reachable). The fifth pain, configuring a block without seeing
the result, no system has solved. An adversarial critique of the first mockup then caught the preview
faked with static HTML and an ironic "Untitled" placeholder, which the shipped design corrects.

What an editor gets. The picker lists components in one column, grouped under headings, each row a
glyph, a description, and a line on when to reach for it; a search box appears once a site declares
more than eight. Picking a component that declares a `preview` opens a two-pane configure step: the
fill form on the left, and on the right the configured component rendered through the site's own
pipeline, the same machinery the edit page preview uses. This is the part no comparable CMS offers,
and cairn can offer it because it already owns the render path. The preview settles on a debounce
rather than re-rendering on every keystroke, and it stays honest: a still-empty required field shows
the skeleton with the empty region called out rather than a fabricated result, and a render that
throws shows a failed-to-render surface and keeps the form. A component that declares no `preview`
keeps the single-column form. Required fields are marked and block Insert with inline messages, and
the modal collapses to one column on a narrow screen.

Round-trip editing closes the loop. With the cursor in a placed component, an Edit block control opens
it back into the same guided form, pre-filled, and Update rewrites that block in place. It is offered
only when the round-trip is provably lossless for that block: one that carries an attribute or a child
the component does not declare is left for hand-editing rather than silently rewritten, the failure
that corrupts content in the git-backed editors the research surveyed. A guided edit that does run
preserves content and normalizes formatting to the canonical serialization. A consumer site that
mounts `CairnAdmin` gets this with no change.

For consumers, the `ComponentDef` contract gains optional fields, so existing definitions compile
unchanged with no action required:

- `icon` shows a glyph from the site icon set beside the label in the picker.
- `group` puts a component under a category heading, in declaration order.
- `hidden` keeps a component out of the top-level picker (for a nested-only component).
- `preview` is a structured sample (`attributes` and `slots`) the picker seeds the form with and
  renders. Declaring it is what opts a component into the two-pane preview layout.
- `pattern` and `validate` on an attribute field add inline validation, the regex case and a pure
  cross-field escape hatch.
- `itemLabel` on a repeatable slot derives a row's label, so a list of items is not a column of blanks.

Round-trip editing of a placed component, a persistent catalog rail, and a slash-trigger are designed
for but deferred to a later pass.

## 0.56.1

Test and CI reliability only; the published library is unchanged from 0.56.0. The component test job
flaked in CI on the editor's heavier pages because the editor's per-browser preferences live in
localStorage and nothing cleared it between tests, so a leaked zen preference could hide the toolbar a
later test waited for. localStorage is now isolated before each component test, with a regression
guard, plus a retry on the browser test project and steadier waits in the insert-dialog tests. No
consumer action.

## 0.56.0

Two passes ship together: the markdown editor's folding gets a proper home, and the engine's gates,
tooling, and docs harden.

The editor folds directive containers (`:::name` blocks), and the fold control now lives in a real
gutter column to the left of the text rather than a chevron hidden in the line. At rest the gutter is
empty; the chevron reveals when you hover the gutter cell, stays while a block is folded, and shows
while the caret is inside a block. The control is a real button now, so folding is reachable by
keyboard and screen reader, where before only unfolding was. The folded-row tint and the "N lines"
pill carry over unchanged, and the fold scope is the same: directive containers only.

For consumers, two additive surface touches from the tooling pass. A concept can now set an optional
`singular` label, so the create affordances read "New post" instead of "New Posts"; it defaults to the
concept's `label`, so a concept that sets nothing is unchanged. And `AuthEnv` is now exported from
`@glw907/cairn-cms/sveltekit` as well as the root, so the `app.d.ts` Platform block can import it from
the subpath the auth helpers live on (the deploy guide now shows that block verbatim).

The rest hardens the engine's own gates and docs. A new `check:reference:signatures` gate compares
each reference page's declared type signature against the export's real type, so a stale signature in
an existing page is caught (it found and fixed two on its first run). A plain-Node dist-spawn test
rot-proofs the `/delivery/data` node-safety guarantee, an admin-shell DOM check guards the drawer
layout against a silent scoping regression, and the `cairn-manifest` bin now resolves the Vite root
from the loaded config rather than the current directory. A docs sweep documents the preview frame's
dual stylesheet emission, the `cairnManifest`-derived `cairn-doctor` inputs, the prerender policy for
the feed routes, and an interim security contact.

No consumer action: every change is additive, the `singular` field is optional, and the folding
redesign is internal to the admin editor.

## 0.55.0

The office list rises to the gold standard. The post and page list gains a triage filter layer and
self-describing rows, so a concept with a handful of entries reads as content rather than a few bare
titles.

Above the list, a triage bar filters by publish state in the admin's segmented check-and-tint
grammar: All, Pending edits (the entries on a `cairn/` branch, whether branch-only or live with held
edits), and Published, each with a live count, plus an orthogonal Hidden toggle for the draft
entries. The counts come from the loaded set, so they are exact, and the filtering runs client-side
over the entries already in hand. Search composes with the active filter.

Each row now describes itself. A summary line sits under the title, drawn from the entry's
description or, lacking one, a short excerpt of its body. The Edited badge tints in the brand violet
as the one state to act on, mirroring the "Publish site (N)" count; Hidden reads as a de-emphasized
row with an eye-off tag rather than a competing badge; and the foot of the list carries a quiet
"New" row so a short list always shows its next step. A concept with no entries centers its empty
state on the page.

One data change feeds the rows: the content manifest now indexes a per-entry `summary`, built by the
same excerpt helper the public delivery already uses. Because the manifest is verified whole-string,
a site's committed manifest is stale until it is regenerated once.

Consumers must: regenerate the content manifest (`npm run cairn:manifest` or `npx cairn-manifest`,
then commit). The `cairnManifest` build fails closed until the regenerated manifest with the new
`summary` keys is committed.

## 0.54.0

The editor takes the shell. On an edit route the page is now one context, the desk: the edit page's
sticky header dissolves into the single topbar (one band in three clusters, the way back and the
status and the lifecycle actions), the nav drawer opens closed and the breadcrumb is the way out,
the frontmatter fields move behind a right slide-over panel, and a zen toggle (and `Ctrl+Shift+.`)
fades the remaining chrome to leave the manuscript alone, with a floating chip carrying the save
state and the way out. List and settings pages keep the office chrome unchanged.

The editor ergonomics round out alongside it: the directive rail pitch widens to 8px and the
caret-active rail reads by strength alone (no width step), wrapped quote and list lines hang under
their content, directive containers fold from the rail band (a chevron on the opener row, a folded
row with an `N lines` pill, the safety invariant that an edit or selection never hides text), the
format keymap completes (inline code, quote, both lists, the heading pair) and the page-level
actions get keys, a `Ctrl+/` sheet lists every shortcut, and `####` gains a real heading size step.
The everyday formats (inline code, strikethrough, table) promote onto the strip, and the footer
controls dress as what they are: a segmented posture control, check-and-tint mode toggles, and a
plain Markdown-help link. The whole admin picks up the same grade of polish, including a scoped
reset so every bare admin button sheds its native chrome.

Consumers may: nothing is required, the new chrome and the editor behaviors apply in place. A site
that embeds `MarkdownEditor` directly gets the rail, hang, fold, and keymap changes automatically;
the editor's public props are unchanged.

## 0.53.0

An iterative design session on the editor-as-home direction, shipped as one window.

The admin's UI face is now IBM Plex Sans (self-hosted, SIL OFL), replacing Figtree: the editor
writes in iA Writer Mono, which descends from IBM Plex Mono, so the chrome and the manuscript
share one type skeleton. The brand display face (Bricolage Grotesque) is unchanged.

The editor gains two surface postures, persisted and toggled from the card footer: Prose (the
default) is the writing instrument, a 72ch centered measure at a larger type step; Markup is the
working surface, a wide dense fill for tables, attributed directives, and long URLs. The footer
is now the writing-environment strip (word count, postures, focus mode, typewriter, help), the
insert actions joined the toolbar as icons, and the document title sits on the manuscript's left
edge. Focus mode now also eases the directive rails and the title back with the dimmed field.

The chrome cedes the stage: a narrower nav sidebar and details column, a wider gutter around the
editor, a quieter details card, rebalanced surface margins, and the topbar pinned to the brand
band's height so the header hairline meets across the seam.

Consumers may: pass the new optional `surface` prop ('prose' | 'markup') when embedding
`MarkdownEditor` directly. No action required; the release is additive.

## 0.52.1

Two field reports from the first 0.52.0 session, both in-editor polish with no consumer action.
In Write mode the editor card now hugs the manuscript (the column caps at 48rem and centers), so
a wide window no longer frames empty space inside the card; Preview keeps the full column for
its device widths. The directive rails take a 4px gap between nested bars (twice the bar
weight, so two rails read as two lines), and directive text gains a matching step of gutter.

## 0.52.0

The editor became a quiet writing surface. The manuscript renders in self-hosted iA Writer Mono
(SIL OFL) at a centered 70-character measure, heading sizes step by level, every syntax marker
and URL recedes to the muted ink while the content keeps full strength, inline code sits on a
soft chip, and quote text reads in full ink with only the `>` dimmed. The editor also parses
GFM now, so the toolbar's strikethrough, tables, and task lists highlight as you type.

Directive machinery trades its row bands for bracket rails: a container draws a depth-stepped
rail from opener to closer, nested containers draw nested rails, the fence line's name and label
keep the accent while the colons and braces fade, and the block holding your caret reads one
step stronger. The treatment is AA-checked in both themes.

Two writing modes join the toolbar's overflow menu, each persisted per browser: focus mode fades
every paragraph but the caret's (a deliberate, documented sub-AA dim with chip backgrounds
flattened), and typewriter scrolling holds the caret line at vertical center.

Consumers may: pass the new optional `focusMode` and `typewriter` booleans when embedding
`MarkdownEditor` directly; sites on the stock `EditPage` get the toggles and persistence for
free. No action required; the release is additive.

## 0.51.0

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
