# Migration notes

The per-version record of what a consumer must do to take a cairn upgrade, distilled from
`CHANGELOG.md`'s own `Consumers must:` lines. `CHANGELOG.md` is the authoritative, gate-checked
source; this page exists so you can scan the versions that carried a real action without reading
the whole file. A version not listed here stated no consumer action for that release.

This record starts at `0.84.4`, the oldest version among the sites that depend on cairn today (per
`CHANGELOG.md`'s own `0.94.0` entry). A site upgrading from further back crosses more history than
this page carries; read `CHANGELOG.md` directly for anything older.

## Unreleased

- **The tidy action's SDK dependency moved.** `@anthropic-ai/sdk` is now an optional peer
  dependency instead of a plain one. A site using the tidy action adds it to its own dependencies
  (`npm install @anthropic-ai/sdk`); a site not using tidy does nothing, and its install gets
  lighter. See [`CHANGELOG.md`](../../CHANGELOG.md#unreleased).

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
