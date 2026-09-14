# Release-notes draft: the unreleased window since 0.96.0

**The conductor re-derives at the cut.** This file is an input to the release step, not the
release decision. `~/.claude/skills/cairn-release/SKILL.md` is explicit about where the size is
settled: *"Derive the size HERE, at the cut, against this rule and the actual `## Unreleased`
window, never inherit it from the conversation."* Everything below was measured on the
`polish-c` branch at its records task, so the conductor starts the cut with the numbers already
in hand and re-derives them rather than trusting them. A measurement that disagrees at the cut
wins over this file.

Written by polish-C's records task (Task 15 of
`docs/superpowers/plans/2026-09-08-polish-c-pass.md`). The window is `CHANGELOG.md:1` through the
`## 0.96.0` heading at `CHANGELOG.md:2039`, 2,038 lines, carrying one `##` heading and **six**
`###` subsections, not the five the plan measured: `Added` (`:5`), `Removed` (`:276`), `Changed`
(`:335`), `Documentation` (`:1383`), `Fixed` (`:1496`), and a **second `Documentation`** (`:1997`)
that the three records tasks of polish-11b-i, polish-C's Task 13, and polish-C's Task 14 appended
after `Fixed`. **One thing for the conductor at the cut:** the release body gathers the two
`Documentation` groups into one section, or the published notes carry the heading twice. Nothing
was restructured here, since merging the two would move every line number this file cites and the
duplication reaches no gate.

Every line number in this file was measured at this task's own commit. A later edit to the window
moves them, so re-measure rather than trusting a citation.

## The free number

`npm view @glw907/cairn-cms versions --json`, run on this branch, ends:

```
0.92.0
0.93.0
0.94.0-rc.1
0.94.0-rc.2
0.94.0
0.95.0-rc.1
0.95.0
0.96.0
```

The highest published version is `0.96.0`, which matches the plan's own measurement at authoring.
Published numbers are global and immutable, and every sub-`0.68` number is burned by the
pre-rebuild history, so the free numbers this output implies are `0.96.1` for a patch and
`0.97.0` for a minor. Neither appears in the registry. **The first free number under the derived
size below is `0.97.0`.** Re-run the command at the cut: another publish between this
measurement and the cut would move it.

## The derived size

The rule, quoted from the skill:

> In `0.x` a minor (`0.X.0`) is reserved for a NEW SUBSYSTEM OR PUBLIC SURFACE that did not exist
> before; everything else (refinement, fix, DX, internal, even new optional exports on an existing
> surface) is a patch.

**Derived size: minor.** The window is graded whole, not by its last pass.

Evidence for a minor, all of it from the held passes rather than from polish-C:

- **`MediaPicker` publishes from `/admin-toolkit`** with `MediaSelection` and `MediaLibraryEntry`
  (`CHANGELOG.md:47`, the toolkit-seams pass). A media-picking surface a site can mount did not
  exist on the public surface before.
- **`ToolbarDisclosure` publishes from `/admin-toolkit`** (`CHANGELOG.md:29`), extracting the
  trigger-plus-panel disclosure as its own composable primitive.
- **The identity seam** (`CHANGELOG.md:1893`): `createAuthGuard` gains an `identity` option and an
  `IdentityResolver` contract a site supplies in place of magic-link, with
  `locals.cairnIdentity` published on every admin path. This is a replaceable-authentication
  subsystem, not a refinement of one.
- **Three new standing gates with public-facing contracts** (`check:self-use`, `check:idioms`,
  `check:editor-quotes`) plus the `SITE_CONFIG_PATH` data-file convention.

Evidence for a patch:

- **Polish-C's own eleven entries add no new subsystem.** Every one is a rename, a signature
  reshape, or a removal: thirty renamed identifiers, four route factories moved onto one config
  bag, eight log events re-keyed, and `OfficeList` retired. `NavRoutesConfig` and
  `MediaRouteConfig` are genuinely new exported types, but they are new bags on an existing
  factory surface, which the rule classifies as a patch in its own parenthetical.
- Read against polish-C alone, the window would be a patch that happens to break every consumer.
  The rule sizes on new surface, not on breakage, and the changelog carries compatibility through
  its `Consumers must:` lines rather than through the number.

**Agreement with the existing marker: yes.** `CHANGELOG.md:3` already carries
`<!-- release-size: minor -->`, and the derivation above lands on minor for the same reason the
marker was written. No change to the marker was made by this task, and a disagreement would have
been reported rather than resolved here.

`check:version` proves the marker is well formed against the window by simulating the cut it would
become (`scripts/checks/check-version.mjs`, `checkUnreleasedWindow`), and it is green on this
branch.

## The upgrade guide

The skill's section 4 orders a per-version entry in `docs/guides/upgrade-cairn.md`. **That file
does not exist in this repo, and `docs/extend/migration-notes.md` supersedes it**: its
`## Unreleased` section is the per-version upgrade record, reconciled against this whole window by
polish-C's Task 14, and it closes with a subsection naming the four consumer sites, their touched
files, and the upgrade order. At the cut, rename that section's heading to the number alongside
the changelog's.

## The window, one paragraph per HISTORY entry

`docs/HISTORY.md` is the authority for the held-pass list. The `0.96.0` tag is dated 2026-08-22
(`v0.96.0`, `719b5e25`), so the window opens with the engine-consultation pass of 2026-08-26 and
runs to polish-C. The `newest-toolchain` pass of the same day (`d2972d11`) is an ancestor of the
tag and shipped in `0.96.0`, so it is not in the window. Twenty entries, newest first.

**Polish-C (audit remediation slice 12, the breaking window).** The initiative's one breaking
slice. Four route factories take a single config bag with `runtime` a required member; six
parameter and load-data bags rename onto `*Config` and `*Data`; ten functions move onto a verb
(`formatManifest`, `buildExcerpt`, `buildNewlyPublished`, `buildCookieName`, `createGithubApp`,
`createAdminAction`, `mintPreview`, `revokePreview`, `loadPreview`, `loadHealth`); four
discriminated results move onto the `outcome` grammar; `EditorRow` becomes `UnresolvedEditor`
derived from `Editor`; eight log events move onto the `refused` verb or their true area; and
`OfficeList` retires so `AdminTable` is the toolkit's one scroll owner. Eleven `Consumers must:`
lines, every one of them mechanical.

**Polish-11b-ii (slice 11b-ii, the dev-backend access seam and the signups exemplar,
non-breaking, 2026-09-13).** `devBackendHandle` accepts `access` and `roles`, so a dev backend
authorizes a `createSectionAction` form action the way `createAuthGuard` does in production. The
showcase's Signups screen and the Waymark template drop their hand-rolled owner check for
`createSectionAction`, gain visible stacked labels, an always-mounted `role="status"` region that
progressively enhances, and a shared safe-delete `<dialog role="alertdialog">`.
`formatTimestamp` widens to two more ISO 8601 zone spellings. No consumer action.

**Polish-11b-i (slice 11b-i, the design system and the engine admin surface, non-breaking,
2026-09-13).** The design system gains a ruled busy idiom and corrects eight stale `AdminLayout`
references to `CairnAdminShell`. `CairnAdminShell`'s two keyboard blockers clear, the command
palette becomes a real ARIA combobox, the pressed-segment cue clears the WCAG 1.4.11 non-text
floor, five `role="status"` regions mount unconditionally, and the edit page's desk band moves
onto `StatusChip` with `inert` deciding reachability. No consumer action.

**Polish-11a (slice 11a, the engine and CLI half, non-breaking, 2026-09-12).** Both retired route
monoliths split into named cluster modules with the public surface byte-identical:
`content-routes-entry.ts` (1,630 lines) into read, write, destructive, and revert clusters, and
`content-routes-media.ts` (1,447 lines) into shared, library-read, ingest, delete, and metadata
clusters. Three `Refusal`/`Skip`-suffix retirements rode the split (`DeleteFailure`,
`MediaDeleteFailure`, `BulkDeleteSkippedAsset`).

**Chassis-B2 (slice 9b, the paint-changing half's second slice, 2026-09-09).** The paginated
archive proven on a real 27-post corpus, site identity read from one server-side source
(`page.data.siteName`), the footer nav moved out of a component array into `site.config.yaml`'s
`menus.footer`, and `site.css` brought under `check-public-tokens`.

**Chassis-B1 (slice 9a, the paint-changing half's first slice, 2026-09-08).** The showcase now
uses the chassis it ships. The capture tool and a committed intended-moves manifest drove every
paint task's before/after proof; the width matrix gained `error404` and `admin/signups` at five
widths in both schemes; the public chrome adopted the chassis site shell; and the five
composition primitives landed on real site surfaces.

**Identity seam (slice 10, 2026-09-08).** The seam the charter promised: `createAuthGuard({
identity })`, an `IdentityResolver` contract returning `ResolvedIdentity` or `IdentityRefusal`,
`locals.cairnIdentity` published unconditionally on every admin path, the two branded pages, and
the doctor probe's redirect classifier. This is the window's clearest new public surface.

**Chassis-A (slice 8, structural, 2026-09-08).** Prettier and the comment gate over the showcase,
the two fixture routes excluded from the scaffold, `cairn.config.ts` split into `icons.ts` and
`markdown-components.ts`, public routes single-sourced through `siteMeta`, and the render trio
(`iconSpan`, `cardShell`, `headRow`) deleted from the engine and re-homed in the chassis with
`/render` now type-only, which carries its own `Consumers must:` line naming four sites' imports.

**internals-C (slice 7, coherence, 2026-09-05).** Type-level exhaustiveness over
`FieldDescriptor`'s five dispatch sites, the `check:idioms` gate born green, a comment-citation
purge across `src/lib`, the `ec-*` to `cairn-*` emitted-class rename (the pass's one
`Consumers must:` event), the full `as never` retirement from `src/tests`, and the
`docs/internal/src-lib-map.md` contributor map.

**internals-B (slice 6, four monolith splits, 2026-09-04).** `content-routes-core.ts` retired into
five siblings behind an unchanged composition root, `audit/rendered.ts` became a directory barrel,
`CairnMediaLibrary.svelte` shed five dialogs, and `EditPage.svelte` collapsed thirteen `EditorApi`
holders onto one identity-guarded `editor` grant.

**internals (slice 5, 2026-09-03).** The standing gates (`check:self-use`, the F-1 leak-class
rider on `check:surface`, `check:editor-quotes`), the `MarkdownEditor` seam collapse onto one
`registerEditor(api)` prop, the `list-role` and `panel-width` audit-rule re-groundings, the
`CAIRN_DEV_BACKEND` tripwire, the `SITE_CONFIG_PATH` convention, and the `previewRevoke` export
half.

**conformance (slice 4b, 2026-09-02).** The 26 Tier 1 retires, alias prunes, the `CairnHistory`
reshapes, `TidyClient` narrowed, `previewMint` made safe, `ctx.attr()`, the OfficeList-onto-
PageHeader collapse, the StatusChip badge tiers, ten log-event evenness fixes, two audit-rule
repairs, five `rendered.*` renames, and the `variants` retirement.

**conventions (slice 4a, 2026-09-01).** The sitting's rulings written into the ledger, bags and
contracts, verb renames, the outcome idiom, the `ContentFormFailure` flatten, cookie posture, the
login nonce, `createAdminAction`'s authorization, the channel fold, coupled pairs, doctor, and
bins. This pass set the conventions polish-C finishes applying.

**retires (slice 3, 2026-08-30).** The 56 ratified retires executed: 38 unsanctioned in three
family batches plus 18 F-1 sanctioned leaks with a move record, seven format-allowlist repairs,
four ledger annotations, and the `f1-return-position-leak-sanction` standing rule. Surface diff
against the branch point: 58 export rows removed, none added, none modified.

**foundations B (slice 2b, 2026-08-30).** `createContentRoutes`' declared return narrowed to a
25-member `Pick`-derived `ContentRoutes`, with ten media-janitorial members internal-only and
`createContentRoutesInternal` keeping the wide shape for the composer. The R4 re-derivation record
landed with the partition proven exact.

**foundations A (slice 2a, 2026-08-29).** Fourteen truncated ledger shapes repaired and
`check:rulings-format` landed; R-1 executed, so a canonical home follows the publishing barrel,
moving 18 duplicate publications and recording 120 R4-justified re-exports under a new
`check:surface` canonical-home rule; and 14 stale rows removed from
`docs/reference/delivery-data.md`.

**csrf-hardening (slice 1, 2026-08-30).** A `Lax` cookie with a re-anchored `Max-Age` and one
`csrfSecure` derivation, the unreadable failure paths, and the
detail/witness/`hasSession` rejection discriminator, plus a pass-end security review that caught
a defect no per-task review could see.

**harvest-detection (2026-08-29).** The `config.no-referrer-blanket` doctor check, `sheet` as a
source list, four audit rules (stripe and trim parity, unlayered font clobber, `list-role`,
`panel-width`), showcase smooth-scroll with router-scroll exclusion, and two admin recipes.

**toolkit-seams (2026-08-27).** Six absorptions from the aksailingclub harvest: the media picker
seam (`MediaPicker`), `ExpandableRow`'s inert-cell escape, `ToolbarDisclosure`, `CsrfField`
hardening, `StatusChip`'s three-register grammar with `tone` and the dot retired, and admin sheet
contrast fixes. Two of the window's new public surfaces come from here.

**engine-consultation (2026-08-26).** The consultation protocol itself: the `engine-consult`
skill, the `engine-triage` agent, the rulings ledger, and the consultations arm, plus the two
audits that produced this whole initiative (the whole-surface any-site audit, 535 items ruled 384
keep, 57 reshape, 94 retire, and the internals-and-chassis audit's 175 findings).

## Every `Consumers must:` line in the window

Eighty-two occurrences of the string sit in the window; one of them is prose inside polish-C's
Task 14 entry (a backticked mention of the convention, not an instruction), leaving **81
`Consumers must:` lines**. Thirty-six of the 81 read "nothing", so **45 demand real consumer
action**. Polish-C contributed 11, one from each of Tasks 2 through 12; the other 70 are the held
passes'. Four of the 81 wrap across a line break in the source ("Consumers" ending one line and
"must:" opening the next), which is the
repo's own idiom and not a defect, so a same-line `grep -c 'Consumers must:'` under-reports the
window by four and reads 78. Each line below is flattened to one line and carries the source line
it starts on. Two adjustments, both mechanical: the one Markdown link a line carried is written as
a plain path, since a relative link resolves against this file's own directory and the link gate
would reject it; and one line quotes a pair of em dashes from the source, kept because a quotation
is a record.

### Added (12 lines)

- **`CHANGELOG.md:27`.** Consumers must: nothing.
- **`CHANGELOG.md:44`.** Consumers must: nothing.
- **`CHANGELOG.md:55`.** Consumers must: nothing.
- **`CHANGELOG.md:67`.** Consumers must: replace any hand-authored
  `text-[var(--cairn-warning-ink)]` with `cairn-text-warning` and any
  `text-[var(--color-positive-ink)]` with `cairn-text-success`, since the arbitrary-value classes
  no longer ship.
- **`CHANGELOG.md:80`.** Consumers must: nothing.
- **`CHANGELOG.md:92`.** Consumers must: nothing.
- **`CHANGELOG.md:106`.** Consumers must: nothing.
- **`CHANGELOG.md:120`.** Consumers must: nothing.
- **`CHANGELOG.md:132`.** Consumers must: nothing; a site that already copied `site.css` and the
  (site) layout during scaffolding can pull the same rules and the toggle.
- **`CHANGELOG.md:158`.** Consumers must: a script that passed `cairn-manifest` an unrecognized
  argument, previously silently ignored, now exits 2 naming it; a CI job piping `cairn-manifest`'s
  output no longer risks a truncated error message. Nothing else changes for a caller already
  passing no arguments or valid flags.
- **`CHANGELOG.md:208`.** Consumers must: nothing, for a site whose local dev already sets
  `CAIRN_DEV_BACKEND` only on a local host, which every documented pattern already does.
- **`CHANGELOG.md:248`.** Consumers must: nothing.

### Removed (2 lines)

- **`CHANGELOG.md:283`.** Consumers must: replace an `<OfficeList eyebrow title meta action>...
  </OfficeList>` composition with `PageHeader` beside `AdminTable` inside a bare `card-shell
  card-shadow` div (no `overflow-x-auto` on that div; `AdminTable`'s own wrapper already carries
  the horizontal scroll):
- **`CHANGELOG.md:313`.** Consumers must: inline `iconSpan`'s one-`h()` body at its call site,
  `role === 'secondary' ? ['cairn-icon', 'cairn-icon-secondary'] : ['cairn-icon']` then `h('span',
  { className }, [glyphEl])`; inline `cardShell`'s body the same way, `h('section', { className:
  classes }, [h('div', { className: ['cairn-alert-body'] }, body)])`; and re-home `headRow` as
  site-owned code with its signature unchanged (`headRow(title, icon?, level = 2)`, building
  `h('div', { className: ['cairn-head'] }, [icon, h('h' + level, { className: ['cairn-head-title']
  }, title)])`, icon omitted when absent), the shape `examples/showcase/src/chassis/render.ts` now
  ships beside `makeIconRenderer`. The emitted classes read `cairn-*` (`cairn-icon`,
  `cairn-icon-secondary`, `cairn-head`) since internals-C's rename. `cardShell`'s inlined form
  carries the `card-body` literal, moving it out of the unscanned engine package and into the
  consuming site's own Tailwind-scanned source; `headRow`'s re-homed form carries the `card-title`
  literal the same way. A site that keeps DaisyUI's `card` component enabled for other markup (a
  members-area card, say) will have DaisyUI's own `.card-body`/`.card-title` rules generated and
  applied to the alert too unless it renames whichever literal it re-homes; the showcase renames
  them to `cairn-alert-body`/`cairn-head-title` (and its `prose.css` selectors to match) as the
  worked example. Every family site that imports `cardShell` or `headRow` needs the same
  inner-class rename at its own call site if it enables DaisyUI's `card` component. Today:
  `ecxc-ski`, `xcathletes-org`, and `cairn-pub` import `cardShell`; all four sites, `ecxc-ski`,
  `xcathletes-org`, `cairn-pub`, and `aksailingclub-org`, import `headRow` and `iconSpan` in their
  own `src/chassis/render.ts`.

### Changed (45 lines)

- **`CHANGELOG.md:343`.** Consumers must: change `createContentRoutes(runtime, config)` to
  `createContentRoutes({ runtime, ...config })`, and `createCairnAdmin(runtime, config)` to
  `createCairnAdmin({ runtime, ...config })`; a call with no `config` becomes
  `createContentRoutes({ runtime })` or `createCairnAdmin({ runtime })`.
- **`CHANGELOG.md:350`.** Consumers must: change `createNavRoutes(runtime)` to `createNavRoutes({
  runtime })`, and `createMediaRoute(runtime)` to `createMediaRoute({ runtime })`.
- **`CHANGELOG.md:361`.** Consumers must: rename any imported type reference from the old name to
  the new one; a call site passing the bag positionally or by inference needs no change.
- **`CHANGELOG.md:373`.** Consumers must: rename `serializeManifest` to `formatManifest`,
  `deriveExcerpt` to `buildExcerpt`, and `diffNewlyPublished` to `buildNewlyPublished` at any call
  site.
- **`CHANGELOG.md:383`.** Consumers must: rename `cookieName` to `buildCookieName`, `githubApp` to
  `createGithubApp` (in `cairn.config.ts`'s `backend` call), and `adminAction` to
  `createAdminAction` at any call site.
- **`CHANGELOG.md:479`.** Consumers must: nothing.
- **`CHANGELOG.md:492`.** Consumers must: nothing.
- **`CHANGELOG.md:507`.** Consumers must: replace any `register*` prop passed to `MarkdownEditor`
  directly (`registerInsert`, `registerInsertLink`, `registerInsertImage`, `registerCaretCoords`,
  `registerFocusEditor`, `registerImagePlaceholders`, `registerGetSelection`,
  `registerGetSelectionRange`, `registerTidy`, `registerUndo`, `registerFormat`,
  `registerReplaceRange`, `registerSelectRange`) with one `registerEditor` callback that reads the
  matching member off the `EditorApi` it receives.
- **`CHANGELOG.md:521`.** Consumers must: a direct `MarkdownEditor` mount whose `registerEditor`
  callback assumes it is only ever called with a live `EditorApi` must narrow the parameter
  (`(api) => { if (!api) return; ... }`), since the type is now `EditorApi | null`.
- **`CHANGELOG.md:562`.** Consumers must: rename `taxonomy.unmarked_field` to
  `taxonomy.field_unmarked` and `publish.address_collision` to `publish.address_collided` in any
  log filter or alert; read `scope` rather than `concept` on a `commit.succeeded`/`commit.failed`
  for a nav, settings, vocabulary, or media commit; expect no `auth.session.destroyed` or
  `auth.channel.session.destroyed` record when a logout's session id or token names no row, or
  names a row that had already expired, so an alert counting sign-outs now counts live ones only;
  read `wordCount` rather than `words` on `dictionary.added` and `dictionary.add_conflict`; stop
  reading `enabled` on `media.resolver_absent`, a field that carried one possible value; and read
  the stringified throw off `error` rather than `reason` on `preview.cleanup_failed`.
- **`CHANGELOG.md:579`.** Consumers must: pass `mediaBase` to `ReproContext` instead of importing
  `fixtureMediaBase`; a site deployed under a SvelteKit `paths.base` now composes fixture image
  URLs inside its own namespace by passing that prefix.
- **`CHANGELOG.md:586`.** Consumers must: replace `strAttr(ctx, key)` with `ctx.attr(key)`.
- **`CHANGELOG.md:623`.** Consumers must: (1) replace every `AuthChannelEvent` import with
  `CairnEvent`, from `@glw907/cairn-cms/auth-channel` or `@glw907/cairn-cms/sveltekit`; (2)
  rewrite `ttl: { X }` as `limits: { <group>: { X } }` per the grouping above (`ttl: {
  sessionTtlMs }` becomes `limits: { session: { ttlMs } }`); (3) add the `ctx` parameter to
  `lookup` and to `verify`, and read the binding off `ctx.env` rather than from a captured
  closure; (4) copy `node_modules/@glw907/cairn-cms/migrations-channel/0000_channel.sql` into the
  channel binding's own `migrations_dir` in place of any file transcribed from
  `CHANNEL_SCHEMA_SQL`, then run `wrangler d1 migrations apply <channel-db>`. Run it on an
  already-provisioned channel database too: every statement in the file is idempotent, so the
  apply is a no-op against the existing schema and records its own `d1_migrations` marker, which
  is safer than hand-inserting that marker. Hand-inserting it stays available for an operator who
  must not run the migration runner at all. Nothing changes for `revokeSessions`.
- **`CHANGELOG.md:649`.** Consumers must: nothing to keep today's behavior. A site that opts an
  action in starts receiving denial records through its `cairnAuditSink`, one per refused request,
  alongside the existing `auth.access.denied` log record.
- **`CHANGELOG.md:676`.** Consumers must: replace `CairnAdminOptions` with `CairnAdminConfig`,
  `ContentRoutesOptions` with `ContentRoutesConfig`, and `EditorRoutesOptions` with
  `EditorRoutesConfig` in any import from `@glw907/cairn-cms/sveltekit`; a site annotating
  `createPublicRoutes`'s return imports the newly declared `PublicRoutes` type from
  `@glw907/cairn-cms/delivery` instead of deriving it with `ReturnType<typeof createPublicRoutes>`
  (see the amended retires-pass line below); `AuthRoutes`, `EditorRoutes`, `NavRoutes`, and
  `SectionAction` keep their existing names and shapes, so no action is needed for those beyond
  the type now being hand-declared rather than derived. One test-only consequence of the
  `createAuthGuard: Handle` annotation: a guard test that drives the returned handle with a
  structural fake event no longer satisfies kit's own `Handle` parameter types, so it needs an `as
  unknown as`-style shim on the handle before the call. The engine's own suite does this once per
  file (`src/tests/integration/auth-guard.test.ts`'s `asHandle`) rather than casting at every call
  site.
- **`CHANGELOG.md:698`.** Consumers must: nothing at runtime. This is a type-level capability
  withdrawal, not a runtime boundary: `createCairnAdmin` returns the same object
  `createCairnAdminInternal` builds, so every action is still present and still runs the session,
  CSRF, and view gates it always ran; a site that annotated a hand-held reference to one of the
  ten (uncommon, since the documented mount is `export const actions = admin.actions;`) keeps them
  dispatchable at runtime with a spread (`{ ...admin.actions }`), which copies the properties the
  object still carries, and recovers them in TYPES with a cast, since a spread reproduces the
  narrowed type rather than widening it. That is the same recovery `ContentRoutes`'s own narrowing
  documented.
- **`CHANGELOG.md:730`.** Consumers must: import these names from their canonical home rather than
  from `/delivery` or `/delivery/data`. From `@glw907/cairn-cms`: `AssetConfig`, `SenderConfig`,
  `NavMenuConfig`, `PreviewConfig`, `SiteRender`, `ComponentRegistry`, `ComponentDef`,
  `ComponentContext`, `SlotDef`, `IconSet`, `MediaResolve`. From `@glw907/cairn-cms/sveltekit`:
  `NavLayout`, `NavLayoutEntry`, `NavLayoutEngineRef`, `NavLayoutSection`. From
  `@glw907/cairn-cms/islands`: `IslandRegistry`. From `@glw907/cairn-cms/media`: `MediaRef`. All
  are type-only imports, so no runtime behavior changes; `@glw907/cairn-cms/delivery` still
  carries `MediaRef`, `MediaResolve`, and `SiteRender`. `VariantSpec`'s canonical-home move to
  `/media` is superseded within this same window: it's retired outright, below.
- **`CHANGELOG.md:760`.** Consumers must: replace `register="bounded"` with `register="outline"`
  and `.cairn-chip-bounded` with `.cairn-chip-outline`; remove the `tone` prop and any dependency
  on the status dot, mapping `neutral`/`info`/`success` to `register="quiet"` (or leave `register`
  unset, since `quiet` is now the default) and `warning`/`danger` to `register="warning"`; remove
  any reference to the removed `STATUS_CHIP_DOT_CLASS` export; and remove any weight utility from
  a hand-composed `.cairn-chip-*` element, since it renders at 400 regardless.
- **`CHANGELOG.md:773`.** Consumers must: stop relying on any `status-<tone>` class
  (`status-neutral`, `status-info`, `status-success`, `status-warning`, `status-error`, and every
  size variant) in hand-authored admin markup; it no longer compiles into the shipped sheet.
- **`CHANGELOG.md:782`.** Consumers must: nothing.
- **`CHANGELOG.md:793`.** Consumers must: a site that hand-mounts the public `CairnMediaLibrary`
  component has lost its public seam for wiring the media actions. There is no replacement factory
  for them; mount the Media Library through `createCairnAdmin`, which serves the component the
  full action vocabulary it posts to. A site that hand-mounts any other admin view is unaffected,
  `uploadAction` and `mediaLibraryLoad` included.
- **`CHANGELOG.md:993`.** Consumers must: replace `checkRateLimit(binding, key)` and
  `checkRateLimitKeys(binding, keys)` with `resolveRateLimit(binding, keys)`, branching on
  `result.outcome` instead of a `boolean` (a `true` reader becomes `result.outcome === 'allowed'`,
  degrade-to-open becomes `result.outcome === 'allowed' || result.outcome === 'no-binding' ||
  result.outcome === 'failed'` read explicitly); pass `deleteEditor(db, email, ownerRoles)` and
  `setEditorRole(db, email, role, ownerRoles)` their site's owner-capability role names (an
  existing call site with no owner concern passes `[]` to keep today's unconditional-write
  behavior) and read the returned `outcome` instead of relying on a resolved `Promise<void>`;
  replace a `removeOwnerIfNotLast`/`demoteOwnerIfNotLast` boolean check with `result.outcome ===
  'ok'`.
- **`CHANGELOG.md:1020`.** Consumers must: a site importing `SaveFailure`, `DeleteRefusal`,
  `RenameFailure`, `CreateFailure`, or `PreviewMintFailure` from `@glw907/cairn-cms/sveltekit` to
  annotate a specific action's `form` prop replaces it with `ContentFormFailure`, which already
  carried every one of those fields (optionally) before this change; no other consumer action is
  needed, since every field a site could have read is still present under the same key.
- **`CHANGELOG.md:1052`.** Consumers must: a caller of `validateReproFence` that relied on the
  previous baked-in register (an alt prefix, a length ceiling, an unknown-key refusal) now
  supplies `options` explicitly to keep that behavior; a caller that imported
  `ReproFenceValidation` to annotate the return value annotates the inline `{ issues: string[] }`
  shape instead. A site that imported `DEFAULT_ROLES` from `@glw907/cairn-cms` to satisfy
  `defineAccess`'s first parameter now passes `undefined` there directly; nothing else changes for
  a site already passing a declared `RolesDeclaration`.
- **`CHANGELOG.md:1086`.** Consumers must: a CI job that gates on `cairn-doctor`'s exit code
  alone still works unmodified (both 1 and 3 are nonzero), but a pnpm or yarn site that previously
  read a silent SKIP on `config.dependency-floors` now gets a real verdict, which may surface a
  below-floor dependency that was invisible before. A job that wants to distinguish a real failure
  (exit 1) from an unchecked environment gap (exit 3), to warn on the latter without blocking on
  it, captures the exit code and branches on it; see the CI wiring example in the reference page.
  Nothing else in the report's shape changed: every prior PASS/FAIL/SKIP line still prints exactly
  as before.
- **`CHANGELOG.md:1117`.** Consumers must: a site importing `MediaDeleteRefusal`,
  `MediaUpdateFailure`, `MediaReplaceFailure`, `MediaAltPropagateFailure`, `MediaBulkFailure`,
  `MediaUploadFailure`, `VocabularySaveFailure`, `SettingsSaveFailure`, or `NavSaveFailure` from
  `@glw907/cairn-cms/sveltekit` to annotate one of `CairnMediaLibrary`'s, the settings screen's,
  or the nav editor's own action failures replaces it with `ContentFormFailure` where the action
  already routes through the flattened union (every media-delete, media-replace, and
  media-alt-propagation refusal), or reads the action's return type through inference instead of a
  named import for the settings, nav, upload, and dictionary actions, none of which route through
  `ContentFormFailure`. A site importing `UploadResult` to annotate `uploadAction`'s success
  branch, `MediaBulkDeleteResult` to annotate `mediaBulkDeleteAction`'s return,
  `MediaOrphanPurgeResult`/`MediaOrphanScanResult` to annotate the orphan scan/purge actions,
  `MediaReplacePreviewPlan`/`MediaReplacePreviewEntry` to annotate the replace preview,
  `MediaAltPreviewPlan`/`MediaAltPreviewEntry` to annotate the alt-propagation preview,
  `TidyResult` to annotate `tidyAction`'s success branch, or `DictionaryAddResult` to annotate
  `dictionaryAddAction`'s success branch, reads the action's return type through inference
  instead; none of these ten media-janitorial and settings/tidy/dictionary actions are reachable
  outside `createCairnAdmin`'s own composition (the media-janitorial ten) or already returned an
  inferred shape a hand-mounting site read structurally. `RepointPlacement`, `AltPlacement`,
  `BranchRef`, `BulkDeleteSkip`, `OrphanByteRow`, and `BrokenRefRow` had no supported import path
  of their own (each was always reached as a nested field of an already-retired or
  already-inferred parent shape); a site that named one directly reads the parent action's return
  type structurally instead.
- **`CHANGELOG.md:1146`.** Consumers must: index the element type off the carrier —
  `NonNullable<ContentFormFailure['usage']>[number]` — instead of importing `UsageEntry` by name.
- **`CHANGELOG.md:1152`.** Consumers must: import `AuthBranding` from
  `@glw907/cairn-cms/sveltekit` instead of the root package.
- **`CHANGELOG.md:1157`.** Consumers must: import `MediaEntry` from `@glw907/cairn-cms/media`
  instead of `/sveltekit`.
- **`CHANGELOG.md:1167`.** Consumers must: replace `PublishActionsConfig` with
  `PublishActionEntry[]` wherever it annotated `editor.publishActions` or a runtime read.
- **`CHANGELOG.md:1172`.** Consumers must: import `PublishActionEntry` from
  `@glw907/cairn-cms/sveltekit` instead of `/delivery` or `/delivery/data`.
- **`CHANGELOG.md:1182`.** Consumers must: rename `HistoryData.draft.startedAt` to
  `draft.lastSavedAt`, and `RevertFailure`'s `draft_exists.draftStartedAt` to `draftLastSavedAt`.
- **`CHANGELOG.md:1193`.** Consumers must: supply a zone (`Z` or a `±hh:mm` offset) when passing
  a near-ISO timestamp to `formatTimestamp`; a zone-less near-ISO string now passes through
  unformatted, where published `0.96.0` rendered it as UTC.
- **`CHANGELOG.md:1211`.** Consumers must: a site injecting a hand-rolled `TidyClient` fake
  (through `ContentRoutesConfig.tidy.client`, for a gateway or proxy in front of Anthropic)
  implements `tidy(request, options)` returning `{ corrected, refused, tokens: { input, output }
  }` in place of `messages.create`'s wire body; `models?.list` is unchanged for a client that
  already implements it. A site reading `tidy.succeeded` log records renames its `usage` field
  read to `tokens`.
- **`CHANGELOG.md:1234`.** Consumers must: rename the import to `previewMint` and call it as
  `previewMint(runtime, config, event, { concept, entryId })`. The `db` parameter is gone (the
  function reads `AUTH_DB` off `event.platform.env` itself) and so is `record.editor` (the
  guard-resolved session is now the only editor source), so call it from a route where the admin
  guard has already resolved `locals.cairnEditor`. Narrow the returned value on `result.outcome
  === 'minted'` before reading `token` and `expiresAt`, where the old call returned that pair
  directly.
- **`CHANGELOG.md:1251`.** Consumers must: rename `OfficeList`'s `subtitle` prop to `meta` (no
  forwarding alias survives); expect the office header to adopt `PageHeader`'s rhythm (`mb-10`,
  the meta line at `type-meta`) on every screen composing `OfficeList`.
- **`CHANGELOG.md:1269`.** Consumers must: nothing. A build already treating either rule's
  advisory findings as non-gating sees fewer of them; nothing that previously passed now fails.
- **`CHANGELOG.md:1281`.** Consumers must: update any `cairn-audit.config.json` allowlist `rule`
  values from `rendered-*` to `rendered.*`; a build filtering or alerting on the old ids by name
  stops matching once this ships.
- **`CHANGELOG.md:1299`.** Consumers must: nothing beyond the `registerEditor` change recorded
  above.
- **`CHANGELOG.md:1307`.** Consumers must: rename `.ec-head` to `.cairn-head`, `.ec-icon` to
  `.cairn-icon`, `.ec-icon-secondary` to `.cairn-icon-secondary`, `.ec-glyph` to `.cairn-glyph`,
  and `.ec-grid` to `.cairn-grid` in any hand-authored prose CSS that targets the built-in
  directive output; a site's own chassis copy (forked from the showcase's) still carries the old
  names until that site's own pass re-homes them.
- **`CHANGELOG.md:1326`.** Consumers must: rename `previewMint` to `mintPreview`, `previewRevoke`
  to `revokePreview`, `previewLoad` to `loadPreview`, and `healthLoad` to `loadHealth` at any call
  site.
- **`CHANGELOG.md:1346`.** Consumers must: rename any imported type reference from the old name to
  the new one; a site rendering its own login form switches from `form.status` to `form.outcome`
  and from `'send_error'` to `'send-error'`; a site rendering its own history screen switches from
  `form.reason` to `form.outcome` and from `'draft_exists'`/`'ref_unknown'`/`'history_stale'` to
  `'draft-exists'`/`'ref-unknown'`/`'history-stale'`; a site holding `createAuthChannel`'s return
  switches its `request` and `confirm` result handling from the `sent`/`ok`/`error` fields to the
  single `outcome` field, including the renamed `'sent'`/`'confirmed'` success values.
- **`CHANGELOG.md:1358`.** Consumers must: rename any imported `EditorRow` type reference to
  `UnresolvedEditor`.
- **`CHANGELOG.md:1368`.** Consumers must: rename any of the six event strings a site's own log
  subscriber matches on, old to new, per the list above.
- **`CHANGELOG.md:1379`.** Consumers must: rename `taxonomy.field_unmarked` to
  `content.field_unmarked` and `admin.action.sink_threw` to `audit.sink.call_failed` in any log
  filter, alert, or subscriber.

### Documentation (3 lines)

- **`CHANGELOG.md:1397`.** Consumers must: nothing; sites already on the duplicated form may hoist
  one shared `media` object of their own, at their convenience.
- **`CHANGELOG.md:1413`.** Consumers must: nothing.
- **`CHANGELOG.md:1463`.** Consumers must: audit your access map for coverage. A map you believed
  was a whitelist may have left a screen or concept open; the new `config.access_unmapped` warning
  names exactly which ones on the next server start, and
  `docs/extend/security-model.md#recovering-whitelist-semantics` gives the exhaustive-map recipe
  to close the gap.

### Fixed (19 lines)

- **`CHANGELOG.md:1650`.** Consumers must: nothing.
- **`CHANGELOG.md:1666`.** Consumers must: nothing.
- **`CHANGELOG.md:1673`.** Consumers must: nothing; expect one extra `Set-Cookie` on the confirm
  redirect, once per login.
- **`CHANGELOG.md:1683`.** Consumers must: nothing. A browser holding an old `SameSite=Strict`
  cookie re-mints exactly once after deploy, as that cookie ages out.
- **`CHANGELOG.md:1695`.** Consumers must: nothing.
- **`CHANGELOG.md:1709`.** Consumers must: nothing; see `docs/reference/log-events.md` for the
  field vocabulary if you query these events.
- **`CHANGELOG.md:1716`.** Consumers must: nothing.
- **`CHANGELOG.md:1723`.** Consumers must: nothing.
- **`CHANGELOG.md:1730`.** Consumers must: nothing.
- **`CHANGELOG.md:1746`.** Consumers must: nothing for a site following the documented single
  mount under `/admin/**`.
- **`CHANGELOG.md:1755`.** Consumers must: nothing.
- **`CHANGELOG.md:1770`.** Consumers must: nothing for a typed TypeScript caller; a hand-rolled
  JavaScript caller omitting `event.cookies` on one of the five actions above now sees a 500
  instead of a 403 response body.
- **`CHANGELOG.md:1827`.** Consumers must: apply migration 0004 before deploying (`cp
  node_modules/@glw907/cairn-cms/migrations/0004_login_nonce.sql migrations/` then `npx wrangler
  d1 migrations apply <auth-db> --remote`). An un-migrated `AUTH_DB` is a total login outage with
  no second channel, since every confirm names the `nonce_hash` column; `npx cairn doctor`'s
  `auth.store` check now fails when the column is absent, so run it before the deploy, and if a
  deploy slips through anyway the store maps D1's `no such column: nonce_hash` onto the new
  `auth.store-unmigrated` condition, whose message names the migration to apply, rather than
  leaving a bare 500 on the login POST. The column is nullable and a row without a binding still
  confirms, whatever the confirming browser carries, so applying the migration cannot strand a
  link already in an inbox.
- **`CHANGELOG.md:1845`.** Consumers must: drop any `variants:` key from a `media` block, since
  it's now an excess-property type error rather than a merged-and-ignored no-op; a site needing a
  size beyond the four built-ins builds the Cloudflare Images transform URL directly against
  Cloudflare's own `/cdn-cgi/image/<options>/<path>` format, since cairn's own URL builder
  (`variantUrl`/`presetUrl`) was never exported from any public subpath.
- **`CHANGELOG.md:1866`.** Consumers must: nothing; these five components are internal to
  `CairnMediaLibrary`.
- **`CHANGELOG.md:1874`.** Consumers must: nothing; `heroFieldRefs` was never public surface.
- **`CHANGELOG.md:1884`.** Consumers must: nothing.
- **`CHANGELOG.md:1890`.** Consumers must: nothing; a site scaffolded before this fix should
  confirm its own `.dev.vars` never landed in a shared template.
- **`CHANGELOG.md:1919`.** Consumers must: nothing to build, deploy, or configure differently; a
  site that has typed a custom login route against the exported `LoginData` union narrows on
  `'identity' in data` before reading `csrf` or `error`. A site reading the `admin.login-probe`
  check's exit status programmatically must: treat the workers.dev arm's exposure finding as
  `info`, not `fail`, on a plain magic-link site (no gate of its own) that still leaves
  `workers_dev` enabled and gets the ordinary unauthenticated redirect to `/admin/login` there;
  the fix is `workers_dev: false` (and `preview_urls: false`) in the wrangler config, which the
  info detail now names. A site that treated a 401 or 403 answering `GET /admin/login` as a probe
  failure must: read it as `info` instead, since a WAF rule or a broken deploy answers the same
  way as a real gate and the check cannot tell them apart; the info detail now says so and names
  the deploy-fault possibility directly. See
  `docs/extend/sign-in-through-your-organization.md`.

## The Tailwind gotcha grep

The skill's grep, `grep -rnE '[a-z-]+-\[[^]]*(\||\*|\.\.\.)[^]]*\]' docs/ CHANGELOG.md ROADMAP.md`,
returns thirteen hits on this branch. **None is a hazard and none was written by polish-C**, which
`git diff f1c72dbf..HEAD -- docs/ CHANGELOG.md ROADMAP.md` confirms by returning no added line that
matches. Eleven of the thirteen sit in write-once trees (`docs/superpowers/**`,
`docs/internal/record/**`) and the other two are a ruling row and a `cairn-audit` rule description,
each naming `font-[family-name:...]` as a pattern the font-parity rule recognizes. The failure mode
the grep exists to catch cannot fire from any of them: `scripts/build/admin-css.input.css` pins the
Tailwind scan to explicit `@source` globs over `src/lib/components` and `src/lib/admin-toolkit`
only, exactly so a docs page cannot feed the compiler a bad candidate (the file's own comment names
the `tailwind-scans-docs-bad-candidate` incident family), and `npm run package` is green at this
head. Nothing was repaired, and repairing a write-once record would itself be a violation.

## The admin-surface read the skill asks for

The reproduction stories Tasks 1 and 12 touched were re-read at this task, since the skill's
admin-surface step asks for it before a release carrying admin changes.

`src/lib/reproductions/stories/CustomScreen.svelte` is the `toolkit/custom-screen` subject. Its
`@component` caption now states that the story transcribes the worked example under "Compose the
screen" in `docs/extend/add-a-custom-admin-screen.md`, that it composes only `PageHeader`,
`AdminTable`, and `StatusChip`, and that the card div is written at the call site with the design
system's floating-card recipe (`card-shell card-shadow`) rather than by a wrapping component,
because `AdminTable` already owns its own horizontal overflow and a second `overflow-x-auto` there
would double the scroll container. The caption closes by telling the next editor to keep the story
in lockstep with the doc snippet rather than improving on it. The markup matches that caption:
`PageHeader` beside a bare `card-shell card-shadow` div wrapping `AdminTable`. Its registration
caption in `src/lib/reproductions/stories/site.ts` reads "The composed custom screen from the
worked doc snippet, mounted for real", and the manifest row (`src/lib/reproductions/manifest.ts`)
is unchanged at `host: 'shell'`, `ownThemeRoot: true`, `heights: { column: 640 }`. A grep for
`OfficeList` across `src/lib/reproductions/` and `docs/extend/add-a-custom-admin-screen.md`
returns nothing, so no story or caption still teaches the retired component.

## What this draft does not carry

The token spend, the spend against the pass's 9M ceiling, the planning-miss count, and the
execution-sitting count are the conductor's close-out records, not an implementer's: those numbers
exist only in the conductor's session. The same holds for the release body itself, which the
conductor composes from the window at the cut.
