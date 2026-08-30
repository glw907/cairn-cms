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

- **Eighteen type-only names moved to their canonical home.** The engine now publishes each
  exported name from exactly one subpath. Re-point these imports away from
  `@glw907/cairn-cms/delivery` and `@glw907/cairn-cms/delivery/data`, which no longer carry them:
  to `@glw907/cairn-cms` for `AssetConfig`, `SenderConfig`, `NavMenuConfig`, `PreviewConfig`,
  `SiteRender`, `ComponentRegistry`, `ComponentDef`, `ComponentContext`, `SlotDef`, `IconSet`, and
  `MediaResolve`; to `@glw907/cairn-cms/sveltekit` for `NavLayout`, `NavLayoutEntry`,
  `NavLayoutEngineRef`, and `NavLayoutSection`; to `@glw907/cairn-cms/islands` for `IslandRegistry`;
  and to `@glw907/cairn-cms/media` for `MediaRef` and `VariantSpec`. All are type-only,
  so a missed one is a type error at build, never a runtime failure. `MediaRef`, `MediaResolve`,
  and `SiteRender` are still importable from `@glw907/cairn-cms/delivery`, whose
  `PublicRoutesConfig` names all three.
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
