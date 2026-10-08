# Exemplar: a list screen

Load this when building or reviewing a list screen: a table over a collection, with the search,
filters, and in-place detail a longer list needs.

Source: the Signups screen every scaffolded site ships at `/admin/signups`
(`src/routes/admin/signups/+page.svelte`, with its `+page.server.ts` beside it). Open it beside
this file. It is built from `PageHeader` and `AdminTable` in `@glw907/cairn-cms/admin-toolkit`
and `CsrfField` in `@glw907/cairn-cms/admin`, and it is the small form of a list screen: a
header, an inline create row, one table, and a shared delete confirm. It has no toolbar, no
expandable row, no status chip, and no pagination, because three columns of a short list need
none of them.

This file annotates the shipped markup where it exists and shows, under a **Growth** label, what
the same screen gains once the list needs more. Growth snippets are not shipped code. They are
written in the Signups vocabulary, and they assume the developer has added a `status` column to
their own `signups` table (`pending`, `confirmed`, `waitlisted`), which the shipped table does
not have. The annotations translate the markup into the register vocabulary a builder holds in
working memory.

## Anatomy at a glance

Shipped: one office-style header, one create row, one table, one delete confirm. Components:
`PageHeader`, `AdminTable`, and `CsrfField`.

Growth: the same header, one toolbar band (search, facets, count line), one table (zebra rows
that expand in place), one pagination footer. Five components, no bespoke layout: `PageHeader`,
`ListToolbar`, `AdminTable` + `ExpandableRow`, `StatusChip`, `Pagination`.

## The header: one filled action

Shipped:

```svelte
<PageHeader title="Signups" />

<form method="POST" action="?/create" use:enhance={onCreate}>
  <CsrfField />
  ...
  <button class="btn btn-primary signup-create-submit">Add</button>
</form>
```

Growth, with the create form moved into a dialog the header opens:

```svelte
<PageHeader eyebrow="Site" title="Signups">
  {#snippet action()}
    <button type="button" class="btn btn-primary btn-sm" onclick={openAddSignupDialog}>Add signup</button>
  {/snippet}
</PageHeader>
```

- `PageHeader` satisfies `screen-anatomy`'s mechanical check (one `<h1>`, a header landmark)
  on its own. The grown screen's table carries the `.card-shell` region the rule also looks
  for, composed beside this header rather than wrapped inside it (see "The table" below).
- The shipped screen sets only `title`, the page's one display-face `h1`. The grown header adds
  an eyebrow ("Site"), which names the nav section the screen lives under; the scaffold's
  `navLayout` puts Signups in its Site group. Neither takes a meta line: the toolbar's own count
  line, not a header meta line, states the list's scope (see below), so `PageHeader`'s `meta`
  prop stays unused rather than duplicating that line.
- The shipped screen's one accent-filled control is the create row's `btn btn-primary` "Add".
  That is the primary-action half of `screen-anatomy` that no mechanical rule can enforce (it
  can't know whether a screen has one to place): adding a signup is the single deliberate thing
  this screen invites a visitor to start. By `screen-anatomy`'s location rule that control sits
  outside both the header and any `.card-shell` region, so a rendered audit of this route would
  read it as a buried primary action; the Growth form is the corrected placement. Once the form
  moves into a dialog, the fill moves to the header's `action` slot beside the `h1`, not
  trailing the table in a footer row.
  `one-filled-action` is the mechanical half: it would catch a second accent fill appearing
  anywhere else on this surface. The shipped table's row verb is `btn btn-ghost btn-xs`, and the
  delete confirm's `btn-error` fill lives in its own dialog, a separate surface.

## The toolbar: search, facets, and the count line (Growth)

```svelte
<ListToolbar
  search={searchQuery}
  {onSearch}
  searchLabel="Search by name or email"
  {filters}
  count={data.signups.length}
  itemLabel={{ one: 'signup', many: 'signups' }}
/>
```

A status filter is `'select'`-display and an archive filter is `'menu'`-display. The menu one:

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

- **Facet quietness.** Every filter, `'select'` or `'menu'`, is a facet in `ListToolbar`'s own
  vocabulary: quiet bordered chrome showing only its own name (`"Archived"`) at rest, picking up
  a primary-tinted applied treatment only once its value departs `defaultValue`. No facet
  competes with the header's one filled action; a facet never carries `btn-primary`.
- `itemLabel` is the `{ one, many }` pair, not a bare string, because the count line has to
  read `"1 signup"` and not `"1 signups"`. `Pagination`'s own `itemLabel` below takes the
  identical shape for the identical reason; a list screen states both in the plural-aware form
  by default rather than adding it after someone notices the grammar defect.
- The count line always renders, even at zero applied filters, and always states the list's
  own scope (`computeCountLine`, an internal mechanism `ListToolbar` computes and renders
  itself, not an importable export). This is why `PageHeader` above carries no `meta`: a
  second line stating a count would either duplicate or race the toolbar's own count line
  for whichever total is true.
- `searchLabel` is the search box's accessible name, not visible chrome; it names what the
  search actually matches ("name or email"), since "Search" alone would promise less than the
  field delivers.

## The table: the row register

Shipped:

```svelte
<AdminTable density="sm" rowCount={data.signups.length}>
  {#snippet header()}
    <th scope="col">Name</th>
    <th scope="col">Email</th>
    <th scope="col"><span class="sr-only">Actions</span></th>
  {/snippet}
  {#snippet children()}
    {#each data.signups as s (s.id)}
      <tr>
        <td>{s.name}</td>
        <td>{s.email}</td>
        <td>...</td>
      </tr>
    {/each}
  {/snippet}
</AdminTable>
```

Growth, the table in its card and zebra-striped:

```svelte
<div class="overflow-hidden card-shell card-shadow">
  <AdminTable density="sm" zebra rowCount={paged.length} emptyColspan={4}>
    {#snippet header()}
      <th class={HEADER_CELL}>Name</th>
      <th class={HEADER_CELL}>Guests</th>
      ...
    {/snippet}
    ...
  </AdminTable>
</div>
```

The shipped screen leaves the table bare and gives the last column an `sr-only` name, since a
column of row verbs has no visible header. The grown screen wraps the table in the card recipe.
The `card-shell card-shadow` wrapper carries no `overflow-x-auto` of its own: `AdminTable`'s own
`toolkit-admin-table-wrap` div is the one horizontal scroll container in this composition, so
the outer card never nests a second scroll boundary over the same table. It does carry
`overflow-hidden`, since `card-shell` rounds its border but does not clip, and the table's
square edges would otherwise paint over the card's rounded corners.

`HEADER_CELL` is a token the screen declares once for every column header. A cairn-native table
writes it as the role utility, `type-label font-semibold uppercase tracking-[0.08em] text-muted`,
never the literal `text-[0.6875rem]`: it is the same Eyebrow recipe `PageHeader`'s own eyebrow
line uses, because a column header and a section eyebrow are the same register.

The row's own cells can carry a scoped type scale. The shipped screen scopes only its create row
this way, in a `<style>` block (`.signup-create-label`, `.signup-create-field`); a grown row
would add:

```css
.signup-name-cell {
  font-size: var(--cairn-type-body);
  font-weight: 600;
  ...
}
.signup-cell {
  font-size: var(--cairn-type-body);
  ...
}
.signup-guest-tag {
  font-size: var(--cairn-type-meta);
}
```

- The name cell and the plain cell both resolve to `--cairn-type-body` (0.875rem); the name
  cell adds `font-weight: 600` since it is the row's own subject, the one thing a scanning eye
  should land on first. A cairn-native build writes `type-body` on both cells and keeps the
  weight as a separate, deliberate choice on the name cell alone: weight carries the emphasis,
  the role utility carries only the size and its leading. `--cairn-type-body--leading` is
  1.25rem; nothing here overrides it.
- The "(+2 guests)" tag demotes one step to `--cairn-type-meta` (0.8125rem), which a cairn-native
  build writes as `type-meta`. A step down from the row's own body text is the correct register
  for a qualifier the reader doesn't need to scan for.

## The status chip: chip passivity in practice (Growth)

```svelte
<StatusChip
  register={SIGNUP_STATUS_REGISTER[row.status]}
  label={SIGNUP_STATUS_LABEL[row.status]}
  legend={row.status === 'waitlisted' && row.position ? `Position ${row.position} on the waitlist` : undefined}
/>
```

Applying chip passivity to the screen's status vocabulary (Pending, Confirmed, Waitlisted) is
the judgment call a builder makes at each call site, not a fact the screen has already settled.
**Pending** needs the visitor's attention (a signup awaiting a decision), so it takes
`register="warning"`. A status that reads as the row's settled, put-away state (a Confirmed
signup needs nothing from the visitor) is the default `quiet` register. **Waitlisted** is a
transient absence of a seat, so it reads as `outline`. The rule from the standard doc applies per
state, not per component: decide by what the state is asking the reader to do, not by habit.

A payment state in a nested panel (`Paid`/`Outstanding`/`Not billed`) would use the same register
vocabulary at `size="xs"`, the density tier for a cell that budgets its own width rather than
taking the 5rem `sm` floor. The same register question applies: `Paid` is the row's settled state
and reads as `quiet`; `Outstanding` is the one that should stay `warning`.

## The expand-in-place panel (Growth)

```svelte
{#snippet panel(datum: SignupRow)}
  <div class="signup-panel">
    <div class="signup-panel-grid">
      <section>
        <h2 class={HEADER_CELL}>Contact</h2>
        ...
      </section>
    </div>
  </div>
{/snippet}
```

- `ExpandableRow` supplies the summary `<tr>`, the trigger cell, and the panel's spanning
  `<td>`; the panel's own internal grid (`signup-panel-grid`,
  `repeat(auto-fit, minmax(12rem, 1fr))`) is this screen's content, not the toolkit's
  concern. Each of the panel's sections repeats the same `HEADER_CELL` micro-label over its own
  content, the identical register the table's column headers use: a panel section heading and a
  table column header are siblings in the same role, `type-label`.
- The panel's own action row (`Open signup`, `Email signup`, `Add guest`) is three `btn btn-sm`
  (no `-primary`) actions. None of them fills. The expand panel gets no `one-filled-action`
  exemption of its own: the screen still carries exactly one accent fill, the header's "Add
  signup," and the panel's own actions stay plain so they never compete with it. A panel that
  genuinely needs its own filled action is the signal to make it a real desk route instead (see
  `exemplar-detail.md`), not to add a second fill to this surface.

## Pagination (Growth)

```svelte
<Pagination
  page={pageIndex}
  pageCount={totalPages}
  onPageChange={(p) => (pageIndex = p)}
  totalItems={data.signups.length}
  pageSize={PAGE_SIZE}
  itemLabel={{ one: 'signup', many: 'signups' }}
/>
```

Same `{ one, many }` `itemLabel` as the toolbar's count line, for the same reason: a range
line reading `"1-10 of 149 signups"` never degrades to `"1 signups"` at a total of one.

## What this exemplar doesn't cover

The shipped screen's inline create form and its delete confirm are forms and dialogs, not list
concerns; their field-label register is `form-anatomy.md`'s subject, and the dialog's one filled
action is covered in `exemplar-detail.md`. The detail screen a panel's "Open signup" link would
open is also `exemplar-detail.md`.
