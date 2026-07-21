# The admin toolkit (`@glw907/cairn-cms/admin-toolkit`)

The admin toolkit's own general-purpose components and formatters, born in
aksailingclub-org's theme layer (a consuming site's own admin screens, not the ceiling) and
graduated here so a site building its own `/admin/` screen, and cairn's own admin screens,
reach for one shared vocabulary instead of a bespoke parallel. Graduation is re-expression,
not a file copy: every contract here stays general-purpose, carrying no domain knowledge from
its first consumer.

```ts
import { formatMoney, formatCivilDate, formatTimestamp, ageFromBirthdate } from '@glw907/cairn-cms/admin-toolkit';
```

The TypeScript types in `src/lib/admin-toolkit` are the source of truth, and the
export-coverage gate checks every name here against them.

Every component this subpath carries assembles daisyUI classes only from the blessed set
compiled into cairn's own `cairn-admin.css` (`src/lib/components/admin-css-safelist.ts`); each
component's own section below lists its exact class inventory as the grep surface a future
daisyUI upgrade checks against. Spacing, truncation, and wrapper layout live in each
component's own scoped `<style>` block rather than an arbitrary Tailwind utility string, since
only a safelisted component class is guaranteed to survive into the compiled admin sheet.

---

## `format.ts`

Pure formatter functions: no daisyUI assembly, no markup, no CSS. Every formatter takes its
locale (and, for `formatTimestamp`, its time zone) as an option with a neutral default, so a
second consumer in another locale or zone is a parameter, not a fork.

### `formatMoney`

Stability tier: Extension API.

```ts
declare function formatMoney(cents: number, options?: FormatMoneyOptions): string;
```

Format signed integer cents (a ledger's `amount_total_cents`/`amount_cents` shape) as a
currency string with thousands separators. For example, `formatMoney(30044)` reads
`"$300.44"` rather than the raw-cents artifact `"$30044"`. Negative cents (a refund or a
credit) render with a leading minus sign. `options.currency` defaults `'USD'`; `options.locale`
defaults `'en-US'`.

### `formatCivilDate`

Stability tier: Extension API.

```ts
declare function formatCivilDate(iso: string | null | undefined, options?: FormatCivilDateOptions): string;
```

Format a civil date (a calendar day with no time of day, for example "joined on the second")
from an ISO `YYYY-MM-DD` string, or the leading date portion of a full SQLite datetime string. Parses at
local midnight so the calendar day never shifts a day west of Greenwich the way a bare
`new Date(iso)` UTC parse would, and never routes a civil date through a time-of-day formatter
(the "4:00 PM" artifact a timestamp formatter produces for a value that carries no time).
`options.fallback` (the word shown for a null or missing date) defaults `'Not yet'`;
`options.locale` defaults `'en-US'`. `options.intlOptions` overrides the default
`{ year: 'numeric', month: 'short', day: 'numeric' }` shape, for a screen that renders only
part of the date (a month/day list) or a longer form (a full month name).

### `formatTimestamp`

Stability tier: Extension API.

```ts
declare function formatTimestamp(sqliteDatetime: string, options?: FormatTimestampOptions): string;
```

Format a SQLite `datetime('now')`-shaped UTC string (`"YYYY-MM-DD HH:MM:SS"`, no offset) as a
date and time in `options.timeZone`. Swapping the space for `T` and appending `Z` keeps `Date`
reading the input as UTC rather than the runtime's own zone. `options.timeZone` defaults
`'UTC'`, the neutral zone a Cloudflare Worker's own runtime already reads in, never a site's own
zone; a site that wants its own local time (a club's Anchorage, say) passes `timeZone`
explicitly. `options.locale` defaults `'en-US'`.

### `ageFromBirthdate`

Stability tier: Extension API.

```ts
declare function ageFromBirthdate(birthdateIso: string | null | undefined, asOf?: Date): number | null;
```

Derive a whole-years age from an ISO birthdate, as of `asOf` (defaults to now; pass a fixed
date for deterministic call sites). Turns over on the birthday itself rather than the day
after, and reads `null` for a missing or unparseable birthdate so a caller renders its own "age
unknown" copy instead of a formatter guessing at it.

---

## Components

Each component assembles daisyUI classes only from cairn's admin CSS blessed set, and keeps
spacing, truncation, and wrapper layout in its own scoped `<style>` rather than a Tailwind
utility string, per the compiled-CSS constraint at the top of this page.

```ts
import { StatusChip, Pagination, AdminTable, ListToolbar, PageHeader, EmptyState } from '@glw907/cairn-cms/admin-toolkit';
```

### `StatusChip`

Stability tier: Extension API.

```ts
let { tone, label, size = 'sm', legend }: {
  tone: StatusChipTone;
  label: string;
  size?: StatusChipSize;
  legend?: string;
};
```

The toolkit's one surface allowed a semantic status color. `tone` carries the full daisyUI
semantic vocabulary (`neutral`/`info`/`success`/`warning`/`danger`); the tone-to-standing mapping
(which standing reads `warning`, which reads `neutral`) lives with the consumer, so the same chip
serves a publish-state pill on one screen and a household-standing pill on another with no shared
domain knowledge baked in. `size` defaults `'sm'`, matching AdminTable's own density tier names.
`sm` keeps a `5rem` minimum width, comfortable next to a longer generic label; `xs` carries no
minimum of its own, so a dense table column (a publish-state cell, an alt/usage cell) budgets the
chip's width against its own short vocabulary rather than a floor sized for a longer label.
`legend` carries optional explanatory text for a tone a label alone can't fully carry, for example
"full member benefits continue during the grace window." It surfaces as a native tooltip and as a
visually hidden `sr-only` span that reads straight after the visible label, so the chip's
accessible name reads `"<label>: <legend>"` from plain text instead of an `aria-label` on the
outer element; some assistive technology exposes an outer `aria-label` inconsistently. A
self-explanatory label omits `legend` entirely, and the chip then carries neither the tooltip nor
the hidden span.

**daisyUI assembly:** `badge badge-outline` (shape only, no tone reads through the badge fill)
plus a `status status-<tone>` dot for the color signal, and `badge-xs`/`badge-sm` +
`status-xs`/`status-sm` for the two sizes. `badge-error`/`badge-success` do not compile into the
packaged `cairn-admin.css`, while every `status-<tone>` modifier does, which is why the dot, not
the badge fill, carries color: one consistent mechanism across all five tones. `badge-outline`
(not `badge-ghost`) sets no `--badge-color`, so its border resolves to the inherited text color,
reading the same against either of AdminTable's zebra stripes or no zebra at all.

**Exact class inventory:** `badge`, `badge-outline`, `badge-xs`, `badge-sm`, `status`,
`status-neutral`, `status-info`, `status-success`, `status-warning`, `status-error`, `status-xs`,
`status-sm`.

```svelte
<StatusChip tone="warning" label="Overdue" legend="Full benefits continue for 30 days." />
```

`STATUS_CHIP_DOT_CLASS` (below) is exported from the component's module context so a future
legend or key component reuses the identical dot color without duplicating the mapping.

### `Pagination`

Stability tier: Extension API.

```ts
let {
  page,
  pageCount,
  onPageChange,
  totalItems,
  pageSize,
  itemLabel = 'items',
  pageSizeOptions,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  itemLabel?: string;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
};
```

Page navigation plus an optional item-range line. `page` and `pageCount` drive the nav on their
own; `totalItems`/`pageSize` are optional and only add the "Showing X&ndash;Y of N `<itemLabel>`"
line, so a consumer that knows its own page count but not a raw item total (or the reverse) still
gets a working pager. `itemLabel` defaults `'items'`. A page count of 7 or fewer renders every
page button; beyond that, `computePageWindow` (below) reduces the control to first, last, and a
run around the current page with `'ellipsis'` gap markers. A single page renders no nav at all,
only the range line (and the page-size select, if given) if one applies.

The range line carries `role="status"` (`aria-live="polite"`, `aria-atomic="true"`), so a page or
page-size change announces the new range to assistive technology even though nothing moves focus.

`pageSizeOptions`/`onPageSizeChange` are an additive graduation extension over the ASC-born
contract: omit both for the original behavior unchanged, or pass both to add a page-size
`<select>` beside the range line, reading its current value from `pageSize` and calling
`onPageSizeChange` with the chosen size on change.

**daisyUI assembly:** `join` + `join-item` + `btn`/`btn-sm`/`btn-active` for the page nav, plus
`select`/`select-sm` for the optional page-size control. Every class already compiles from
cairn's own admin usage or the blessed safelist (`join-item` and the `join` orientation
modifiers).

**Exact class inventory:** `join`, `join-item`, `btn`, `btn-sm`, `btn-active`, `btn-disabled`,
`select`, `select-sm`.

```svelte
<Pagination page={page} pageCount={pageCount} onPageChange={(p) => (page = p)} totalItems={149} pageSize={20} itemLabel="households" />
```

### `AdminTable`

Stability tier: Extension API.

```ts
let { density = 'sm', zebra = false, header, children, rowCount, empty, emptyColspan = 100 }: {
  density?: AdminTableDensity;
  zebra?: boolean;
  header: Snippet;
  children: Snippet;
  rowCount: number;
  empty?: Snippet;
  emptyColspan?: number;
};
```

The table shell. `density` (defaults `'sm'`) names the two density tiers; `zebra` (defaults
`false`) turns on alternating-row shading, off by default so a screen opts in rather than
inheriting a house style. `header` and `children` are snippets, a `<tr>` of `<th>` cells and the
`<tbody>` row markup respectively, so this component owns the table's own chrome and never a row
shape or a data contract: it carries no `rows: T[]` prop, and a caller's row markup is entirely its
own template. `rowCount` switches the body to the `empty` snippet when `0` (omit `empty` for an
empty `<tbody>` instead); `emptyColspan` (defaults `100`, which HTML's own `colspan` clamps to the
real column count) sizes the empty-state cell's span.

Single-line enforcement is a contract, not a full mechanism. Every cell gets `white-space: nowrap`
from this component's own scoped CSS, so a wrap never happens even if a caller forgets, but
ellipsis truncation of one specific long value is the calling cell's own scoped-CSS
responsibility, the same scoped-truncation model `StatusChip`'s `.status-chip-label` carries; this
component can't reach inside a snippet's own markup to add truncation there itself. The wrapper's
`overflow-x: auto` is the horizontal-scroll fallback for a table wider than its viewport.

**daisyUI assembly:** `table`, `table-xs`, `table-sm`, `table-zebra`, every one already compiled
into the packaged `cairn-admin.css`.

**Exact class inventory:** `table`, `table-xs`, `table-sm`, `table-zebra`.

```svelte
<AdminTable {density} zebra rowCount={rows.length}>
  {#snippet header()}
    <th>Household</th>
    <th>Standing</th>
  {/snippet}
  {#snippet children()}
    {#each rows as row (row.id)}
      <tr><td>{row.household}</td><td><StatusChip tone={row.tone} label={row.standing} /></td></tr>
    {/each}
  {/snippet}
  {#snippet empty()}
    <p>No households match.</p>
  {/snippet}
</AdminTable>
```

### `ListToolbar`

Stability tier: Extension API.

```ts
let {
  search,
  onSearch,
  searchLabel = 'Search',
  autofocus = false,
  filters = [],
  overflowLabel = 'More filters',
  primaryAction,
  count,
  itemLabel,
  trailing,
}: {
  search: string;
  onSearch: (value: string) => void;
  searchLabel?: string;
  autofocus?: boolean;
  filters?: ListToolbarFilter[];
  overflowLabel?: string;
  primaryAction?: ListToolbarAction;
  count: number;
  itemLabel: string;
  trailing?: Snippet;
};
```

The list-header band: search, any number of promoted filters, an overflow disclosure for filters
a screen chooses not to promote (present in the contract even when a consumer promotes every
filter and never renders it), exactly one right-aligned primary action, applied-filter pills with
a remove control, and a count line that always states its own filter scope. Every prop is a
controlled value plus a change callback, the same fully controlled convention `Pagination`
establishes. A search box's own text, a filter's own selected value, and each filter's own promotion status
are all state the caller owns, never this component.

Each `ListToolbarFilter` carries `id`, `label` (the control's accessible name, never rendered as
visible chrome), `options`, `value`, `onChange`, an optional `defaultValue` (the "no filter
applied" value, defaults `'all'`), `promoted` (defaults `true`, choosing the band versus the
overflow disclosure), and `display` (`'select'` or `'segmented'`, defaults `'select'`, see below).
`primaryAction` is `{ label, onClick }`, the toolbar's one right-aligned action; the contract never
accepts more than one. `count`/`itemLabel` feed the count line's own scope.

`display: 'segmented'` renders a filter as a group of always-visible toggle buttons instead of a
`<select>`, for a filter whose vocabulary reads better as tabs than a dropdown (a publish-state
filter, a triage radiogroup); each `ListToolbarFilterOption`'s optional `count` renders beside its
label. A segmented filter that opts out of promotion (`promoted: false`) still renders as a
`<select>` in the overflow disclosure, since a button group behind a disclosure menu loses the
always-visible scan-ability segmented display exists for. `trailing` is an optional snippet
rendered after the toolbar band, for a screen-specific view control this component has no
vocabulary for (a grid/list density toggle).

A segmented filter is a real ARIA radiogroup: the wrapping group is `role="radiogroup"` and each
option is `role="radio"` with `aria-checked`, never `aria-pressed`. Only the checked option is a
tab stop; ArrowRight/ArrowDown, ArrowLeft/ArrowUp, Home, and End move the selection and the focus
together, the native radio-button keyboard model. The checked option also carries a small
`aria-hidden` check glyph beside its label, the non-color selected cue WCAG 1.4.1 calls for. The
search box wraps in a `label.input` with a leading search icon.

The module context exports two functions, independently unit tested the same way `Pagination`'s
`computePageWindow`/`computeItemRange` are:

- `computeAppliedFilters(filters)` returns every filter away from its own `defaultValue`, as a
  pill `{ id, label }` where `label` reads from the matching option's own label, falling back to
  the raw value for a stale or externally set one, so a pill is never blank.
- `computeCountLine(count, itemLabel, appliedLabels)` returns the count line's own copy pattern:
  `"<count> <itemLabel>"`, followed by every applied-filter label joined with a middle dot
  (`"12 households · Overdue · Holding assets"`). The line always renders, even at zero applied
  filters or a zero count, per the count-line-always-states-its-scope contract.

Applied-filter pills render in the toolkit's one neutral badge tone (`badge-neutral`), never an
alarm color: an applied filter is a normal state of the list, not a warning. A pill's remove
control keeps its glyph at the pill's own quiet visual size but grows its own hit box to WCAG
2.5.8's 24x24 CSS px floor through `min-width`/`min-height`, never a visible size change.

The count line carries `role="status"` (`aria-live="polite"`, `aria-atomic="true"`), so a search
or filter change announces the new scope to assistive technology even though nothing moves focus.

The overflow disclosure is a full disclosure pattern, not just an `aria-expanded` toggle. Escape,
fired from the trigger or from a control inside the panel, closes it and returns focus to the
trigger; a pointerdown outside the trigger and panel closes it without moving focus.

**daisyUI assembly:** `input`/`input-sm` (search), `select`/`select-sm` (a `'select'`-display
filter, promoted or overflow), `join`/`join-item`/`btn`/`btn-sm`/`btn-active` (a `'segmented'`-
display filter, the same assembly `Pagination`'s own page nav uses), `btn`/`btn-sm`/`btn-primary`/
`btn-outline` (the primary action and the overflow trigger), `dropdown`/`dropdown-content`/
`dropdown-open`/`menu` (the overflow disclosure), `badge`/`badge-neutral`/`badge-sm` (the pills).
Every one of these already compiles from cairn's own admin usage. None needed a safelist addition.

**Exact class inventory:** `input`, `input-sm`, `select`, `select-sm`, `join`, `join-item`, `btn`,
`btn-sm`, `btn-active`, `btn-primary`, `btn-outline`, `dropdown`, `dropdown-content`,
`dropdown-open`, `menu`, `badge`, `badge-neutral`, `badge-sm`.

```svelte
<ListToolbar
  search={query}
  onSearch={(value) => (query = value)}
  filters={[
    { id: 'state', label: 'Publish state', display: 'segmented',
      options: [{ value: 'all', label: 'All', count: 149 }, { value: 'draft', label: 'Draft', count: 4 }],
      value: state, onChange: (v) => (state = v) },
  ]}
  primaryAction={{ label: 'New entry', onClick: create }}
  count={filtered.length}
  itemLabel="entries"
/>
```

### `PageHeader`

Stability tier: Extension API.

```ts
let { eyebrow, title, meta, action }: {
  eyebrow?: string;
  title: string;
  meta?: string;
  action?: Snippet;
};
```

The canonical admin page-header recipe, the `OfficeList` shape generalized: an optional eyebrow,
the page's one display-face `h1`, an optional muted meta line, and an optional single
right-aligned action. `eyebrow` names a grouping (a custom nav section, "Media") and is omitted
entirely when a screen has none worth naming. `meta` is the toolkit's one home for a page-level
count outside a toolbar: `ListToolbar`'s own `computeCountLine` covers a screen with a search or
filter row, and this line covers a screen with neither (a stats-prose summary, a scope note).
`action` is the header's one right-aligned control (a create button, an upload trigger); search
never lives in this band, since `ListToolbar` owns it.

**daisyUI assembly:** none. This component is typography and layout only, the eyebrow and
page-heading recipes from `docs/internal/admin-design-system.md`.

**Exact class inventory:** none (no daisyUI component class).

```svelte
<PageHeader eyebrow="Media" title="Media library" meta="128 images · 4 need alt text">
  {#snippet action()}
    <button type="button" class="btn btn-sm btn-primary" onclick={openUpload}>Upload</button>
  {/snippet}
</PageHeader>
```

### `EmptyState`

Stability tier: Extension API.

```ts
let { icon, heading, headingLevel = 'p', message, action }: {
  icon?: Snippet;
  heading: string;
  headingLevel?: EmptyStateHeadingLevel;
  message: string;
  action?: Snippet;
};
```

The centered first-run empty state: a fill on the content area holding an icon (the cairn mark by
default, or a caller-supplied `icon` snippet for a site's own custom section), a heading, muted
explanatory copy, and an optional action. This is the whole-concept-empty state only (a fresh "no
posts yet" screen); a filtered-to-zero state (a search or filter narrowing a non-empty list to
nothing) is a smaller, in-card notice inside `AdminTable`'s own `empty` snippet instead, never this
component.

`headingLevel` picks the heading's own element (`'p'`, `'h1'`, `'h2'`, or `'h3'`) and defaults to
`'p'`, the original contract unchanged. A screen that already carries its own `h1` (a preceding
`PageHeader`) keeps the default; a screen that renders `EmptyState` as its only content,
with no heading of its own (`WelcomeView`, the none-capability landing view), passes `'h1'` so the
page still has a real heading in its accessible tree.

**daisyUI assembly:** none. Typography and layout only, the same empty-state recipe
`docs/internal/admin-design-system.md` documents.

**Exact class inventory:** none (no daisyUI component class).

```svelte
<EmptyState heading="No posts yet" message="Stack your first one and it will show up here.">
  {#snippet action()}
    <button type="button" class="btn btn-sm btn-primary" onclick={create}>New post</button>
  {/snippet}
</EmptyState>
```

---

## Types

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| `FormatMoneyOptions` | Extension API | `interface FormatMoneyOptions { currency?: string; locale?: string }` | `formatMoney`'s options: the ISO 4217 currency code and BCP 47 locale tag. |
| `FormatCivilDateOptions` | Extension API | `interface FormatCivilDateOptions { fallback?: string; locale?: string; intlOptions?: Intl.DateTimeFormatOptions }` | `formatCivilDate`'s options: the null-date fallback word, locale, and the `Intl.DateTimeFormat` options passthrough. |
| `FormatTimestampOptions` | Extension API | `interface FormatTimestampOptions { timeZone?: string; locale?: string }` | `formatTimestamp`'s options: the IANA time zone and BCP 47 locale tag. |
| `StatusChipTone` | Extension API | `type StatusChipTone = 'neutral' \| 'info' \| 'success' \| 'warning' \| 'danger'` | `StatusChip`'s full semantic tone vocabulary. `danger` reads as daisyUI's `error` semantic under the hood. |
| `StatusChipSize` | Extension API | `type StatusChipSize = 'xs' \| 'sm'` | `StatusChip`'s two named sizes, matching AdminTable's own density tier names. |
| `STATUS_CHIP_DOT_CLASS` | Extension API | `const STATUS_CHIP_DOT_CLASS: Record<StatusChipTone, string>` | The daisyUI `status-<tone>` suffix for each public tone, exported from `StatusChip`'s module context. |
| `PageWindowItem` | Extension API | `type PageWindowItem = number \| 'ellipsis'` | One entry in `Pagination`'s windowed page list: a real page number, or a gap marker between two runs. |
| `ItemRange` | Extension API | `interface ItemRange { first: number; last: number; total: number }` | The inclusive item range a page covers (`computeItemRange`'s return shape), plus the total it is drawn from. |
| `computePageWindow` | Extension API | `declare function computePageWindow(page: number, pageCount: number): PageWindowItem[]` | Reduces `1..pageCount` to a bounded set of page buttons, windowing to first, last, and a run around `page` once `pageCount` exceeds 7. Returns `[]` for `pageCount <= 0`. |
| `computeItemRange` | Extension API | `declare function computeItemRange(page: number, pageSize: number, totalItems: number): ItemRange \| null` | The inclusive 1-based item range `page` covers at `pageSize`, clamped to `totalItems`. Returns `null` for a non-positive `pageSize`/`totalItems`, or a `page` past the last item. |
| `AdminTableDensity` | Extension API | `type AdminTableDensity = 'xs' \| 'sm'` | `AdminTable`'s two named density tiers, matching `StatusChip`'s own size vocabulary. |
| `ListToolbarFilterOption` | Extension API | `interface ListToolbarFilterOption { value: string; label: string; count?: number }` | One option in a `ListToolbarFilter`'s own vocabulary. `count` is an optional per-option match count for the segmented display. |
| `ListToolbarFilter` | Extension API | `interface ListToolbarFilter { id: string; label: string; options: ListToolbarFilterOption[]; value: string; onChange: (value: string) => void; defaultValue?: string; promoted?: boolean; display?: 'select' \| 'segmented' }` | One filter control, fully controlled by the caller. |
| `ListToolbarAction` | Extension API | `interface ListToolbarAction { label: string; onClick: () => void }` | The toolbar's one right-aligned primary action. |
| `AppliedFilterPill` | Extension API | `interface AppliedFilterPill { id: string; label: string }` | One rendered applied-filter pill, `computeAppliedFilters`'s return shape. |
| `computeAppliedFilters` | Extension API | `declare function computeAppliedFilters(filters: ListToolbarFilter[]): AppliedFilterPill[]` | Every filter away from its own default value, as a pill. |
| `computeCountLine` | Extension API | `declare function computeCountLine(count: number, itemLabel: string, appliedLabels: string[]): string` | The count line's own copy pattern: `"<count> <itemLabel>"`, followed by every applied-filter label joined with a middle dot. |
| `EmptyStateHeadingLevel` | Extension API | `type EmptyStateHeadingLevel = 'p' \| 'h1' \| 'h2' \| 'h3'` | `EmptyState`'s `headingLevel` prop vocabulary: the heading's own element, defaulting to `'p'`. |
