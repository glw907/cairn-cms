# Exemplar: a list screen

Load this when building or reviewing a list screen: a searchable, filterable table over a
collection, with a row that expands in place for detail.

Source: a production member-management screen from a consumer site's `/admin` extension,
built entirely from `@glw907/cairn-cms/admin-toolkit` and `@glw907/cairn-cms/components`. The
household-grouped anatomy and the filter grammar are ratified decisions from that site's own
private design record, a planning archive no cairn package ships, so this file states them on
its own authority rather than a citation a builder could open; what follows translates the
shipped markup into the register vocabulary a builder holds in working memory. Where the
source predates a rule this skill now states, the annotation says so and shows the
cairn-native call instead of a literal transcription.

## Anatomy at a glance

One office-style header, one toolbar band (search, facets, count line), one table (zebra
rows that expand in place), one pagination footer. Five components, no bespoke layout:
`OfficeList`, `ListToolbar`, `AdminTable` + `ExpandableRow`, `StatusChip`, `Pagination`.

## The header: one filled action

```svelte
<OfficeList eyebrow="Club" title="Members">
  {#snippet action()}
    <button type="button" class="btn btn-primary btn-sm" onclick={openAddHouseholdDialog}>Add household</button>
  {/snippet}
  ...
</OfficeList>
```

- `OfficeList` is the shape `PageHeader` later generalized into `admin-toolkit`; either
  satisfies `screen-anatomy`'s mechanical check (one `<h1>`, a header landmark, a
  `.card-shell` region). A new build reaches for `PageHeader` first; `OfficeList` stays
  correct where it already ships.
- The eyebrow ("Club") names the custom nav section this screen lives under. `title`
  ("Members") is the page's one display-face `h1`. Neither takes a subtitle here: the
  toolbar's own count line, not a header subtitle, states the list's scope (see below), so
  `OfficeList`'s `subtitle` prop stays unused rather than duplicating that line.
- The header's `action` slot carries the screen's one accent-filled control,
  `btn btn-primary btn-sm`. This is the primary-action-in-the-header-slot half of
  `screen-anatomy` that no mechanical rule can enforce (it can't know whether a screen has
  one to place): "Add household" is the single deliberate thing this screen invites a
  visitor to start, so it sits beside the `h1`, not trailing the table in a footer row.
  `one-filled-action` is the mechanical half: it would catch a second accent fill
  appearing anywhere else on this surface.

## The toolbar: search, facets, and the count line

```svelte
<ListToolbar
  search={searchQuery}
  {onSearch}
  searchLabel="Search by name, standing, or phone"
  {filters}
  count={data.households.length}
  itemLabel={{ one: 'household', many: 'households' }}
/>
```

Five filters feed `filters`, four `'select'`-display and one `'menu'`-display:

```ts
{
  id: 'archived',
  label: 'Archived',
  value: includeArchived ? 'include' : 'active',
  defaultValue: 'active',
  display: 'menu',
  options: [
    { value: 'active', label: 'Active only' },
    { value: 'include', label: 'Include archived' },
  ],
  onChange: (value) => (includeArchived = value === 'include'),
},
```

- **Facet quietness.** Every filter here, `'select'` or `'menu'`, is a facet in
  `ListToolbar`'s own vocabulary: quiet bordered chrome showing only its own name
  (`"Archived"`) at rest, picking up a primary-tinted applied treatment only once its value
  departs `defaultValue`. None of the five competes with the header's one filled action;
  a facet never carries `btn-primary`.
- `itemLabel` is the `{ one, many }` pair, not a bare string, because the count line has to
  read `"1 household"` and not `"1 households"`. `Pagination`'s own `itemLabel` below takes
  the identical shape for the identical reason; a list screen states both in the plural-aware
  form by default rather than adding it after someone notices the grammar defect.
- The count line always renders, even at zero applied filters, and always states the list's
  own scope (`computeCountLine`). This is why `OfficeList` above carries no `subtitle`: a
  second line stating a count would either duplicate or race the toolbar's own count line
  for whichever total is true.
- `searchLabel` is the search box's accessible name, not visible chrome; it names what the
  search actually matches ("name, standing, or phone"), since "Search" alone would promise
  less than the field delivers.

## The table: the row register

```svelte
<AdminTable density="sm" zebra rowCount={paged.length} emptyColspan={5}>
  {#snippet header()}
    <th class={HEADER_CELL}>Household</th>
    <th class={HEADER_CELL}>Members</th>
    ...
  {/snippet}
```

`HEADER_CELL` is `text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted`, one
token this site declared for every column header. That value, 0.6875rem, is exactly
`--cairn-type-label`: a cairn-native table writes the role utility instead of the literal,
`type-label font-semibold uppercase tracking-[0.08em] text-muted`, the same Eyebrow recipe
`OfficeList`'s own eyebrow line uses, because a column header and a section eyebrow are the
same register.

The row's own cells carry a scoped type scale:

```css
.members-name-cell {
  font-size: 0.875rem;      /* == --cairn-type-body */
  font-weight: 600;
  ...
}
.members-cell {
  font-size: 0.875rem;      /* == --cairn-type-body */
  ...
}
.members-primary-tag {
  font-size: 0.8125rem;     /* == --cairn-type-meta */
}
```

- The name cell and the members cell both resolve to `--cairn-type-body` (0.875rem); the
  name cell adds `font-weight: 600` since it is the row's own subject, the one thing a
  scanning eye should land on first. A cairn-native build writes `type-body` on both cells
  and keeps the weight as a separate, deliberate choice on the name cell alone: weight
  carries the emphasis, the role utility carries only the size and its leading.
  `--cairn-type-body--leading` is 1.25rem; nothing here overrides it.
- The "(primary)" tag demotes one step to `--cairn-type-meta` (0.8125rem), a plain-Tailwind
  literal here that a cairn-native build writes as `type-meta`. A step down from the row's
  own body text is the correct register for a qualifier the reader doesn't need to scan for.

## The standing chip: chip passivity in practice

```svelte
<StatusChip
  tone={HOUSEHOLD_STANDING_TONE[row.standing]}
  label={HOUSEHOLD_STANDING_CHIP[row.standing].label}
  legend={row.standing === 'former' && row.lastSeason ? `Last active ${row.lastSeason}` : undefined}
/>
```

This call predates `StatusChip`'s `register` prop, so it renders in the default `bounded`
register for every standing. Applying chip passivity to the screen's standing vocabulary (Current, Overdue, Former) is
the judgment call a builder makes at each call site, not a fact this screen has already
settled: **Overdue**
needs the visitor's attention (a household approaching Former), so it stays `bounded`; a
standing that reads as the row's settled, put-away state (the household is simply Current
and needs nothing from the visitor) is the `register="quiet"` candidate. The rule from the
standard doc applies per state, not per component: decide by what the state is asking the
reader to do, not by habit.

The holdings panel below uses the same tone vocabulary for a payment state
(`Paid`/`Outstanding`/`Not billed`) at `size="xs"`, the density tier for a cell that budgets
its own width rather than taking the 5rem `sm` floor. The same register question applies:
`Paid` is the row's settled state and reads as a `quiet` candidate; `Outstanding` is the one
that should stay bounded.

## The expand-in-place panel

```svelte
{#snippet panel(datum: HouseholdListRow)}
  <div class="household-panel">
    <div class="household-panel-grid">
      <section>
        <h2 class={HEADER_CELL}>Contacts</h2>
        ...
```

- `ExpandableRow` supplies the summary `<tr>`, the trigger cell, and the panel's spanning
  `<td>`; the panel's own internal grid (`household-panel-grid`,
  `repeat(auto-fit, minmax(12rem, 1fr))`) is this screen's content, not the toolkit's
  concern. Each of the panel's four sections repeats the same `HEADER_CELL` micro-label
  over its own content, the identical register the table's column headers use: a panel
  section heading and a table column header are siblings in the same role, `type-label`.
- The panel's own action row (`Open household`, `Email household`, `Add member`) is three
  `btn btn-sm` (no `-primary`) actions. None of them fills. The expand panel gets no
  `one-filled-action` exemption of its own in this build: the toolbar's screen still
  carries exactly one accent fill, the header's "Add household," and the panel's own actions
  stay ghost/plain so they never compete with it. A panel that genuinely needs its own
  filled action is the signal to make it a real desk route instead (see
  `exemplar-detail.md`), not to add a second fill to this surface.

## Pagination

```svelte
<Pagination
  page={pageIndex}
  pageCount={totalPages}
  onPageChange={(p) => (pageIndex = p)}
  totalItems={data.households.length}
  pageSize={PAGE_SIZE}
  itemLabel={{ one: 'household', many: 'households' }}
/>
```

Same `{ one, many }` `itemLabel` as the toolbar's count line, for the same reason: a range
line reading `"1-10 of 149 households"` never degrades to `"1 households"` at a total of one.

## What this exemplar doesn't cover

The "Add household" dialog this header opens is a form, not a list concern; its field-label
register is `form-anatomy.md`'s subject, not this file's. The household desk this panel's
"Open household" link opens is `exemplar-detail.md`.
