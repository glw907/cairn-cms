# The admin toolkit (`@glw907/cairn-cms/admin-toolkit`)

General-purpose primitives a site building its own `/admin/` screen, and cairn's own admin
screens, reach for instead of a bespoke parallel. Two tiers share this one charter. The **field**
primitives (`FieldLabel`, `FieldRow`, `TextInput`, `SelectInput`) render one labeled control in
the admin's label and control rhythm; they merged here from the retired `admin-fields` subpath
(CHANGELOG `0.94.0`), since two subpaths stating the same charter is one subpath. The
**screen-scaffold** primitives (`PageHeader`, `OfficeList`, `AdminTable`, `ListToolbar`,
`ToolbarDisclosure`, `Pagination`, `StatusChip`, `EmptyState`, `ExpandableRow`, `MediaPicker`) plus
the formatters compose a whole screen's chrome. Both tiers carry no domain knowledge from the sites they were first built for:
every contract here is general-purpose across sites. A component that renders one of cairn's own
content concepts (a `ConceptList` row, an `EditPage` field) lives on `/components` instead, even
though it also renders inside the admin theme.

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

Every display formatter in this file, `formatMoney`, `formatCivilDate`, `formatTimestamp`, and
`formatPhone`, accepts a nullish input and takes a `fallback?: string` option that defaults to
`''`. This is a standing rule, not a per-formatter choice. A screen often renders a field that
isn't set yet, a member's phone, a ledger row before it posts, a date the editor hasn't
published, and the caller shouldn't have to remember which formatter tolerates nullish input and
which one throws, or carry a per-formatter opinion about what absence looks like. A site that
wants its own text for absence, such as Not yet or TBD, passes `fallback` explicitly, and a
future display formatter added to this file follows the same shape. `ageFromBirthdate` isn't a
display formatter, since it returns a number rather than a string, so it sits outside this rule;
see its own entry below.

### `formatMoney`

Stability tier: Extension API.

```ts
declare function formatMoney(cents: number | null | undefined, options?: FormatMoneyOptions): string;
```

Format signed integer cents (a ledger's `amount_total_cents`/`amount_cents` shape) as a
currency string with thousands separators. For example, `formatMoney(30044)` reads
`"$300.44"` rather than the raw-cents artifact `"$30044"`. Negative cents (a refund or a
credit) render with a leading minus sign. A nullish `cents` reads `options.fallback`.
`options.currency` defaults `'USD'`; `options.locale` defaults `'en-US'`; `options.fallback`
defaults `''`.

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
`options.fallback` (the word shown for a null or missing date) defaults `''`; a site that wants
"Not yet" passes it explicitly. `options.locale` defaults `'en-US'`. `options.intlOptions`
overrides the default `{ year: 'numeric', month: 'short', day: 'numeric' }` shape, for a screen
that renders only part of the date (a month/day list) or a longer form (a full month name).

### `formatTimestamp`

Stability tier: Extension API.

```ts
declare function formatTimestamp(sqliteDatetime: string | null | undefined, options?: FormatTimestampOptions): string;
```

Format a SQLite `datetime('now')`-shaped UTC string (`"YYYY-MM-DD HH:MM:SS"`, no offset) as a
date and time in `options.timeZone`. Swapping the space for `T` and appending `Z` keeps `Date`
reading the input as UTC rather than the runtime's own zone. A nullish `sqliteDatetime` reads
`options.fallback`. `options.timeZone` defaults `'UTC'`, the neutral zone a Cloudflare Worker's
own runtime already reads in, never a site's own zone; a site that wants its own local time (a
club's Anchorage, say) passes `timeZone` explicitly. `options.locale` defaults `'en-US'`;
`options.fallback` defaults `''`.

### `ageFromBirthdate`

Stability tier: Extension API.

```ts
declare function ageFromBirthdate(birthdateIso: string | null | undefined, asOf?: Date): number | null;
```

Derive a whole-years age from an ISO birthdate, as of `asOf` (defaults to now; pass a fixed
date for deterministic call sites). Turns over on the birthday itself rather than the day
after, and reads `null` for a missing or unparseable birthdate so a caller renders its own "age
unknown" copy instead of a formatter guessing at it. This is not a display formatter (it
returns a number, not a string), so it carries no `fallback` string option; the nullish rule
above does not apply to it.

### `formatPhone`

Stability tier: Extension API.

```ts
declare function formatPhone(phone: string | null | undefined, options?: FormatPhoneOptions): string;
```

Format a stored E.164 NANP phone number for a table cell: `+19075550100` becomes the
hyphenated `907-555-0100`, no leading `+1`. A value outside the NANP `+1` shape (a non-US
country code, or anything that fails to parse) passes through unchanged; a table cell has no
reason to reformat what it cannot parse. A nullish `phone` reads `options.fallback`, which
defaults `''`.

### `itemNoun`

Stability tier: Extension API.

```ts
declare function itemNoun(count: number, label: string | ItemLabel): string;
```

Pick the grammatical number for a count surface: `label.one` at exactly 1, `label.many`
otherwise, zero included (for example `"0 households"`). `label` also accepts a plain string,
which is invariant across every count, the original `Pagination`/`ListToolbar` contract's
behavior unchanged for a caller that hasn't opted into grammatical number. `Pagination`'s range
line and `ListToolbar`'s count line both route their own `itemLabel` prop through this, so the
"1 households" defect class has a single fix point.

---

## Fields

The field primitives a site's own custom `/admin/` screen composes, such as an events or members
editor. They render with the admin's own label and control rhythm, matching the built-in content
editor's fields. Merged here from the retired `admin-fields` subpath (CHANGELOG `0.94.0`): the set
is small today, `TextInput`, `SelectInput`, `FieldLabel`, and `FieldRow`; new field types
land as new consumers need them.

```ts
import { TextInput, SelectInput, FieldLabel, FieldRow } from '@glw907/cairn-cms/admin-toolkit';
import type { SelectInputOption } from '@glw907/cairn-cms/admin-toolkit';
```

`FieldLabel`, and the `TextInput`/`SelectInput` primitives that wrap it, render one of two label
registers, chosen with the `register` prop: `'inline'` or `'stacked'`. These are two of the three
label registers the admin design system distinguishes. The third, the group legend, is a
`<legend>` rather than this component.

**`register="stacked"`** is the default. It puts the label on its own line preceding the control.
Use it for any field inside a multi-column form grid: a stacked label never competes with its own
control for a shared row's width, so it never wraps at a width an inline label would.
**`register="inline"`** puts the label beside its control on one line, muted, for a genuinely
control-adjacent composition, such as a toolbar filter or a compact panel where a group legend
already scopes the control enough that a full stacked label would be excess.

### `TextInput`

Stability tier: Extension API.

```ts
let { label, name, value = $bindable(), type = 'text', placeholder, register }: {
  label: string;
  name: string;
  value: string;
  type?: 'text' | 'search' | 'email' | 'url';
  placeholder?: string;
  register?: 'inline' | 'stacked';
};
```

One labeled single-line text input in the admin idiom. It's DaisyUI v5's default-bordered
`input`, with no `-bordered` modifier. `type` narrows the native input type to `search`, `email`,
or `url`; it defaults to a plain text input. `register` picks the label register described above,
defaulting to `'stacked'`. Named `TextInput`, not `TextField`, because the root barrel's field
*descriptor* arm already owns that name (`fields.text`'s return shape); this component wraps a
real `<input>` element, so `Input` is the honest noun for the rendered control.

```svelte
<script lang="ts">
  import { TextInput } from '@glw907/cairn-cms/admin-toolkit';

  let query = $state('');
</script>

<TextInput label="Search" name="q" type="search" bind:value={query} />
```

### `SelectInput`

Stability tier: Extension API.

```ts
let { label, name, value = $bindable(), options, register }: {
  label: string;
  name: string;
  value: string;
  options: SelectInputOption[];
  register?: 'inline' | 'stacked';
};
```

One labeled select in the same admin idiom as `TextInput`. It's DaisyUI v5's default-bordered
`select`, with no `-bordered` modifier. `label` renders to the side of the control (inline) or
preceding it (stacked). `name` is the native form-field name, so the select posts inside an
ordinary form submit. `value` is bindable. `options` is the option list in display order.
`register` picks the label register described above, defaulting to `'stacked'`. Named
`SelectInput`, not `SelectField`, for the same reason `TextInput` isn't `TextField`.

```svelte
<script lang="ts">
  import { SelectInput } from '@glw907/cairn-cms/admin-toolkit';

  let status = $state('open');
</script>

<SelectInput label="Status" name="status" bind:value={status} options={[
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]} />
```

### `FieldLabel`

Stability tier: Extension API.

```ts
let { label, children, register }: {
  label: string;
  children: Snippet;
  register?: 'inline' | 'stacked';
};
```

The label wrapper `TextInput` and `SelectInput` both compose internally. Compose it directly
around a bare custom control (an admin field this subpath does not yet cover) to keep the same
label rhythm. `register` picks the label register. `'stacked'` is the default:
the label sits on its own line preceding the control, which fills to its container. `'inline'`
puts the label beside the control on one line instead, muted, for a genuinely control-adjacent
composition. A control that's a direct child of a stacked `FieldLabel` fills the label's own
width. A control nested one level deeper, such as a compact row of two or more controls side by
side, keeps its own width instead, since the stacked register's width hook only reaches a direct
child.

`FieldLabel` renders one wrapping `<label>` with no `for` attribute, and the browser associates a
wrapping label with only the *first* labelable descendant it contains. In a compact row of two or
more controls, only the first control picks up the wrapping label's accessible name; every
control after it has none. Give each control after the first its own accessible name, either its
own `<label>` (visually hidden if the row's own layout already reads clearly) or an `aria-label`.

```svelte
<script lang="ts">
  import { FieldLabel } from '@glw907/cairn-cms/admin-toolkit';
</script>

<FieldLabel label="Instructor">
  <input class="input input-sm" name="instructor" />
</FieldLabel>
```

### `FieldRow`

Stability tier: Extension API.

```ts
let { children }: {
  children: Snippet;
};
```

One flex row that levels its children on their bottom edges. Use it for a row that mixes a
stacked field with a bare control, such as a button or a checkbox that carries no label of its
own: the labelled child stands a whole label taller than the bare one, and only their controls
belong on one line. `FieldRow` lines those controls up. For children of equal height it changes
nothing, so a row doesn't have to know which case it has.

One composition it gets wrong: a field that renders an error line or a hint *below* its control
no longer ends at that control, so the row levels the trailing line against the bare control
instead. No field in this subpath renders one, so compose such a row yourself.

```svelte
<script lang="ts">
  import { FieldRow, TextInput } from '@glw907/cairn-cms/admin-toolkit';

  let instructor = $state('');
</script>

<FieldRow>
  <TextInput label="Instructor" name="instructor" bind:value={instructor} />
  <button type="button" class="btn btn-sm">Add</button>
</FieldRow>
```

---

## Components

Each component assembles daisyUI classes only from cairn's admin CSS blessed set, and keeps
spacing, truncation, and wrapper layout in its own scoped `<style>` rather than a Tailwind
utility string, per the compiled-CSS constraint at the top of this page.

```ts
import { StatusChip, Pagination, AdminTable, ListToolbar, ToolbarDisclosure, PageHeader, OfficeList, EmptyState, ExpandableRow, MediaPicker } from '@glw907/cairn-cms/admin-toolkit';
```

### `StatusChip`

Stability tier: Extension API.

```ts
let { label, size = 'sm', register = 'quiet', legend }: {
  label: string;
  size?: StatusChipSize;
  register?: StatusChipRegister;
  legend?: string;
};
```

The toolkit's one surface allowed a semantic status color, second generation (the 2026-08-24 owner
probe, Geoff's own ratification: `docs/internal/probes/2026-08-26-chip-registers-v2`). `register`
alone now carries both shape and color; there is no separate `tone` prop, and there is no
chip-level danger tier. `size` defaults `'sm'`, matching AdminTable's own density tier names. `sm`
keeps a `5rem` minimum width, comfortable next to a longer generic label; `xs` carries no minimum
of its own, so a dense table column (a publish-state cell, an alt/usage cell) budgets the chip's
width against its own short vocabulary rather than a floor sized for a longer label. `register`
picks which of the three ratified chip recipes the badge renders in: `'quiet'` (the default) tints
the ground for a settled state that should recede, such as Published; `'warning'` tints the same
way off the warning tone, for a state needing attention, such as an unpublished-changes marker or
a needs-alt notice; `'outline'` drops the fill for a hairline border, for a transient or reversible
absence (a removable tag, a not-yet-confirmed suggestion). `legend` carries optional explanatory
text a label alone can't fully carry, for example "full member benefits continue during the grace
window." It surfaces as a native `title` tooltip (hover only; a bare `<span>` carries no focus of
its own, so a keyboard user never reaches it that way) and as a visually hidden `sr-only` span that
reads straight after the visible label, the assistive-technology-reachable half of the same
information, so the chip's accessible name reads `"<label>: <legend>"` from plain text instead of
an `aria-label` on the outer element; some assistive technology exposes an outer `aria-label`
inconsistently. A self-explanatory label omits `legend` entirely: the chip then carries no `title`
and no hidden span, never the label itself repeated as its own tooltip.

All three registers carry a measured constraint rather than an unconditional guarantee. `outline`'s
hairline is `color-mix(in oklab, currentColor 55%, transparent)`, so it inherits its color from
the chip's own ancestor. Inside a `text-muted` ancestor the mix reads roughly 2.4:1 against a
card ground and 2.97:1 against a page ground, under the audit's own 3:1 border-contrast floor.
Cairn's five call sites, ConceptList, EditPage, CairnAdminShell, ReferenceField,
MediaCaptureCard, and ManageEditors, all clear this floor; a consumer that places an `outline`
chip inside its own muted-text ancestor should re-measure. `quiet` and `warning` are tuned to a
1.16-1.47:1 contrast band against both admin row grounds (plain and zebra) in both admin themes,
and the whole ratified band sits under the audit's own 1.5 ground-collision floor, by design: a
`quiet` or `warning` chip measures as an advisory camouflaged finding on some row/theme pairs.
`chip-ground-collision` stays advisory rather than gating today, pending its own chroma-aware
reshape that can tell a hue-distinct low-contrast tint from a truly invisible one; a measured
"violation" from that rule is expected here, not a regression.

**daisyUI assembly:** `badge badge-outline` (shape only; `badge-outline` sets no `--badge-color`,
so its fill and border resolve through the `register` recipe rather than the full-strength
inherited text color `badge-outline` would resolve to on its own), plus `badge-xs`/`badge-sm` for
the two sizes.

**Exact class inventory:** `badge`, `badge-outline`, `badge-xs`, `badge-sm`. Every other admin
surface that composes a status chip by hand instead of through this component (EditPage,
CairnAdminShell, ReferenceField, MediaCaptureCard, ManageEditors) reaches the same three registers
through `cairn-admin.css`'s shared `cairn-chip-quiet`/`cairn-chip-warning`/`cairn-chip-outline`
classes; none paints anything on its own; all three compose with `badge` (and typically
`badge-outline` for `cairn-chip-outline`, which supplies the border's width and style), the same
shape `StatusChip` itself assembles from. All three pin `font-weight: 400`; since none carries a
Tailwind layer, that pin outranks any `font-semibold`/`font-medium` Tailwind utility placed on the
same element, so a hand-composed chip should carry no weight utility of its own.

```svelte
<StatusChip label="Overdue" register="warning" legend="Full benefits continue for 30 days." />
```

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
  itemLabel?: string | ItemLabel;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
};
```

Page navigation plus an optional item-range line. `page` and `pageCount` drive the nav on their
own; `totalItems`/`pageSize` are optional and only add the "Showing X&ndash;Y of N `<itemLabel>`"
line, so a consumer that knows its own page count but not a raw item total (or the reverse) still
gets a working pager. `itemLabel` defaults `'items'` and accepts a plain string (invariant across
every total, the original contract unchanged) or an `{ one, many }` pair, picked by grammatical
number through `itemNoun` -- so `totalItems={1}` with `itemLabel={{ one: 'household', many:
'households' }}` reads `"1 household"`, never `"1 households"`. A page count of 7 or fewer renders every
page button; beyond that, `computePageWindow` (below) reduces the control to first, last, and a
run around the current page with `'ellipsis'` gap markers. A single page renders no nav at all,
only the range line (and the page-size select, if given) if one applies.

The range line carries `role="status"` (`aria-live="polite"`, `aria-atomic="true"`), so a page or
page-size change announces the new range to assistive technology even though nothing moves focus.

`pageSizeOptions`/`onPageSizeChange` are an additive extension over the original
contract: omit both for the original behavior unchanged, or pass both to add a page-size
`<select>` beside the range line, reading its current value from `pageSize` and calling
`onPageSizeChange` with the chosen size on change.

**daisyUI assembly:** `join` + `join-item` + `btn`/`btn-sm`/`btn-active` for the page nav, plus
`select`/`select-sm` for the optional page-size control. Every class already compiles from
cairn's own admin usage or the blessed safelist (`join` itself, `join-item`, and the `join`
orientation modifiers; see `ListToolbar`'s own daisyUI-assembly note for why `join` moved from an
incidental compile to an explicit safelist entry).

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
      <tr><td>{row.household}</td><td><StatusChip register={row.register} label={row.standing} /></td></tr>
    {/each}
  {/snippet}
  {#snippet empty()}
    <p>No households match.</p>
  {/snippet}
</AdminTable>
```

**The in-card empty-notice recipe.** `empty` takes bare content, typically one `<p>`, as the
preceding example shows. The table's own scoped CSS (`.toolkit-admin-table-empty-row td`) already
owns the register: centered text, `2.5rem`/`1rem` padding, the muted color, and normal (not
single-line) wrapping. A caller adds no size, color, or alignment class of its own; a call site
that does is reinventing a register `AdminTable` already carries.

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
  itemLabel: string | ItemLabel;
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
accepts more than one. `count`/`itemLabel` feed the count line's own scope; `itemLabel` accepts a
plain string (invariant across every count, the original contract unchanged) or an `{ one, many }`
pair, picked by grammatical number through `itemNoun`, the same widening `Pagination`'s own
`itemLabel` carries.

`display: 'segmented'` renders a filter as a group of always-visible toggle buttons instead of a
`<select>`, for a filter whose vocabulary reads better as tabs than a dropdown (a publish-state
filter, a triage radiogroup); each `ListToolbarFilterOption`'s optional `count` renders in its own
visually secondary span after the label: `All 6`, never a parenthesized `All(6)`. A segmented
filter that opts out of promotion (`promoted: false`) still renders as a
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
  filters or a zero count, per the count-line-always-states-its-scope contract. `itemLabel`
  accepts a plain string or an `{ one, many }` pair, routed through `itemNoun`, so
  `computeCountLine(1, { one: 'household', many: 'households' }, [])` reads `"1 household"`.

`computeAppliedFilters` feeds the count line's own scope labels only; there is no separate
applied-pills row. An applied filter shows its own value in-control instead, on the
`'menu'`-display facet documented earlier in this entry.

The count line carries `role="status"` (`aria-live="polite"`, `aria-atomic="true"`), so a search
or filter change announces the new scope to assistive technology even though nothing moves focus.

The overflow disclosure and each `'menu'`-display facet both fold onto `ToolbarDisclosure`, below.
It is a full disclosure pattern, not just an `aria-expanded` toggle. Escape closes it and returns
focus to the trigger. A pointerdown outside the trigger and panel, or focus leaving the
trigger-plus-panel entirely, closes it without moving focus. Single-open-at-a-time for the facets
stays in `ListToolbar` itself, since no self-contained disclosure primitive can enforce it across
siblings.

**daisyUI assembly:** `input`/`input-sm` (search), `select`/`select-sm` (a `'select'`-display
filter, promoted or overflow), `join`/`join-item`/`btn`/`btn-sm`/`btn-active` (a `'segmented'`-
display filter, the same assembly `Pagination`'s own page nav uses), `btn`/`btn-sm`/`btn-primary`/
`btn-outline` (the primary action and the overflow trigger), `dropdown`/`dropdown-content`/
`dropdown-open`/`menu` (the overflow disclosure and each `'menu'`-display facet's own option list).
The CSS build's `@source` now scans `src/lib/admin-toolkit` (it didn't when this component first
graduated there, the visual regression `check:admin-css-classes` now guards against), and `join`
carries an explicit, deliberate safelist entry alongside `join-item`; every other class already
compiles from cairn's own admin usage.

**Exact class inventory:** `input`, `input-sm`, `select`, `select-sm`, `join`, `join-item`, `btn`,
`btn-sm`, `btn-active`, `btn-primary`, `btn-outline`, `dropdown`, `dropdown-content`,
`dropdown-open`, `menu`.

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

### `ToolbarDisclosure`

Stability tier: Extension API.

```ts
let {
  open,
  onOpenChange,
  ariaHaspopup,
  containerClass,
  trigger,
  extra,
  panel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaHaspopup?: ToolbarDisclosureAriaHaspopup; // 'menu' | 'listbox' | 'dialog' | 'grid' | 'tree' | 'true'
  containerClass?: string;
  trigger: Snippet<[ToolbarDisclosureTriggerAttrs]>;
  extra?: Snippet;
  panel: Snippet<[ToolbarDisclosurePanelAttrs]>;
};
```

The trigger-plus-panel disclosure `ListToolbar`'s own overflow menu and each `'menu'`-display
facet fold onto (`audit-admin-listtoolbar`'s reshape): both duplicated the same five dismissal
mechanics, and the one consumer that hand-copied the pattern missed them on its first pass. Five
mechanics, always on: the trigger's `aria-expanded`/`aria-controls` track `open`; focus moves into
the panel on open (the first focusable descendant of whatever the `panel` snippet renders); Escape
closes and returns focus to the trigger; a pointerdown outside the trigger-plus-panel closes
without moving focus; and focus leaving the trigger-plus-panel (a Tab out) closes without moving
focus either.

Fully controlled, the same convention `ExpandableRow` and `Pagination` carry: `open` and
`onOpenChange` are props, never internal state. This component never decides whether it is allowed
to be open, only reports when it wants to change; a caller coordinating several disclosures (a
single-open-at-a-time id, say) derives each instance's own `open` from its own shared state.

The trigger and panel are always the caller's own markup: `trigger` and `panel` are snippets,
given attrs to spread onto the caller's own elements (`aria-expanded`/`aria-controls`/
`aria-haspopup`/`onclick` for the trigger, `id`/`hidden` for the panel's own root element), rather
than elements this component renders itself. Spread the trigger attrs last on the caller's own
element, so this component's own `onclick` (the toggle handler) is never shadowed by a
caller-supplied one on the same element. `ariaHaspopup` only forwards the trigger's own
`aria-haspopup` value through; this component carries no opinion about what the panel holds (a
`role="menu"` option list, a plain form, anything else). The panel's own root still wants a
`dropdown-content` positioning class for its `position: absolute` layout, but hiding it while
closed is this component's own job, not the caller's class string: `hidden` (`true` while closed)
keeps every panel descendant unfocusable and unpainted even if that class is ever omitted. `extra`
is an optional sibling of the trigger inside the same containment boundary (a facet's own inline
clear button, say): activating it never counts as "outside" or "left" for the dismissal mechanics.

This component does render one element of its own: the containing `<div>` the trigger, `extra`,
and the panel all render inside, carrying `dropdown`/`toolkit-toolbar-disclosure` always plus
`dropdown-open` while `open` is true. It is the outside-pointerdown/focusout boundary and the
panel's `position: absolute` containing block (via the always-applied `dropdown` class). This
container is deliberately non-interactive (no role, no tabindex): its Escape and focusout handling
is event delegation over the trigger/extra/panel snippets, not an affordance of its own. This
component emits only its own generic classes on that element; `containerClass` is the one piece of
visual configuration it carries, for a caller's own consumer-specific chrome on that same
containing element (`ListToolbar`'s own applied-state tint on a `'menu'` facet, say), since a
caller's own scoped `<style>` cannot reach an element rendered by a different component without
either duplicating a rule back into the caller or reaching across with `:global()`.

**daisyUI assembly:** `dropdown`/`dropdown-open`/`dropdown-content` (the panel's own positioning
context and open-state toggle; the caller's own panel snippet root carries `dropdown-content`).

**Exact class inventory:** `dropdown`, `dropdown-open`, `dropdown-content`.

```svelte
<ToolbarDisclosure
  open={menuOpen}
  onOpenChange={(next) => (menuOpen = next)}
  ariaHaspopup="menu"
>
  {#snippet trigger(attrs)}
    <button type="button" class="btn btn-sm" {...attrs}>Sort by</button>
  {/snippet}
  {#snippet panel(attrs)}
    <ul id={attrs.id} hidden={attrs.hidden} class="dropdown-content menu" role="menu">
      <li role="none"><button type="button" role="menuitemradio">Newest</button></li>
    </ul>
  {/snippet}
</ToolbarDisclosure>
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

### `OfficeList`

Stability tier: Extension API.

```ts
let { eyebrow, title, subtitle, action, children }: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: Snippet;
  children: Snippet;
};
```

The office-list primitive: the header-plus-card shell every triage-table screen composes, lifted
out of `ConceptList` and kept to exactly its header and card frame. A site's own custom `/admin/`
screen, a Club-style events or members list say, wraps its own `<table>` in this to reuse the
shared header and card frame instead of rebuilding it. `eyebrow` names a grouping, such as a
custom nav section's label, and is omitted entirely when there is none to name. `title` is the
display-face heading. `subtitle` is the muted one-line note under it, a live count or a scope
note. `action` is an optional header-right control such as a filter or a primary button.
`children` is the screen's own content, rendered inside the shared bordered, theme-adaptive card
shell.

`OfficeList` moved here from `/components` in CHANGELOG `0.94.0`: `PageHeader`, this
component's own later generalization above, already lived on the toolkit, and a header-plus-card
screen scaffold belongs beside it. `PageHeader` and `OfficeList` both stay; they cover different
shapes, a header primitive versus a full list-screen scaffold, never a duplicate. A new build
reaches for `PageHeader` first; `OfficeList` stays correct where it already ships.

```svelte
<script lang="ts">
  import { OfficeList } from '@glw907/cairn-cms/admin-toolkit';
</script>

<OfficeList eyebrow="Club" title="Events" subtitle="12 upcoming">
  {#snippet action()}
    <button type="button" class="btn btn-primary btn-sm">New event</button>
  {/snippet}
  <table class="table">
    <!-- rows -->
  </table>
</OfficeList>
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

### `ExpandableRow`

Stability tier: Extension API.

```ts
let { expanded, onToggle, datum, colspan, summary, panel, triggerLabel }: {
  expanded: boolean;
  onToggle: () => void;
  datum: T;
  colspan: number;
  summary: Snippet;
  panel: Snippet<[T]>;
  triggerLabel: string;
};
```

The expand-in-place table row: a summary `<tr>` plus a conditional panel `<tr>` whose single
spanning cell receives the row's own `datum`, so the `panel` snippet never needs a closure over
the row it belongs to. Fully controlled, matching `Pagination`'s own convention: `expanded` and
`onToggle` are props, not internal state, so the caller holds a single expanded-row id and derives
`expanded={expandedId === row.id}` per instance, the "one row expanded at a time" contract living
in the caller the same way a radio group's own `checked` prop carries it. `summary` is the row's
own `<td>` cells (this component supplies the wrapping `<tr>` and the trailing trigger cell);
`colspan` is the summary row's own `<td>` count, including that trigger cell, since the panel's
single spanning cell must cover the whole row.

Keyboard operability rides the native `<button>` element's own Enter/Space activation; the summary
`<tr>` also carries a mouse-only click convenience, but the trailing button is the one control
carrying `aria-expanded` and `triggerLabel` as its accessible name, so a summary cell renders plain
content (text, a `StatusChip`, and similar) by default. A summary cell that needs a genuinely
interactive control inline, an inline-editable value or a per-row action, wraps it in an element
carrying **`data-cairn-inert-cell`**: the row's own click handler walks the click target's ancestry
with `closest('[data-cairn-inert-cell]')` and ignores any click that resolves inside one, so the
wrapped control's own handler runs without also toggling the row, no `stopPropagation()` wrapper of
the caller's own. The escape leaves the trigger button's own `aria-expanded` control and keyboard
behavior unchanged; its own `onclick` already calls `event.stopPropagation()`, and it carries no
`onkeydown` handler by design, since native `<button>` Enter/Space activation already covers it. The
trigger cell is `position: sticky; right: 0`, so `AdminTable`'s own horizontal-scroll fallback never
strands it off-screen: a summary row wider than its viewport scrolls rather than wraps, and the
trigger stays reachable at every scroll position, unconditionally, with no caller opt-in. The panel
cell stays a genuine `<td colspan>`, not `display: block`, because a spanning cell removed from table
layout still resolves its width against the table's own real column widths through the browser's
anonymous fixup row; a caller that wants the panel's own internal grid to collapse at a narrow width
needs the table itself to never need horizontal scroll in the first place (hide lower-priority
summary columns under a breakpoint instead).

**Touch target, measured:** the trigger (`btn btn-ghost btn-xs`) renders at 24x24 CSS px at the
390px viewport against the packaged `cairn-admin.css`, exactly the engine's ruled AA floor
(`rulings.touch-targets.test.ts`, Web Content Accessibility Guidelines 2.5.8, 24x24, not 2.5.5's
44x44) and clears it, so the trigger keeps its size unchanged. The same 24x24 floor applies to any
interactive control a caller places inside a summary cell (inert-wrapped or not); it is the
caller's own responsibility to meet, the same idiom `ReferenceField.svelte`'s own remove button
uses (`max-sm:min-h-11 max-sm:min-w-11`, a narrow-viewport-only floor for a dense cell that reads
smaller than that at wider widths).

**Out of scope:** a `colspan` full-width summary variant is deliberately not offered.

Three treatments carry no prop of their own. They apply unconditionally. The whole summary row
washes with `color-mix(in oklab, var(--color-base-content) 5%, transparent)` on hover, including
the sticky trigger cell (adversarially verified against a zebra-striped row, where a plain
`base-200` wash reads as invisible, being the stripe's own color). The trigger cell's own
background follows zebra parity instead of a fixed `base-100`: on a `table-zebra` ancestor it
mirrors the exact `tr:nth-child(2n)` selector daisyUI's own zebra striping uses, so the pinned
column never seams against a striped row underneath it. The panel `<td>` carries a depth story,
`background: var(--color-base-300)` plus `box-shadow: inset 0 1px 0 var(--cairn-card-border)`, so
it reads as a recessed drawer rather than a flat continuation of the row preceding it. A `base-200`
recess was the first attempt, and adversarial review refuted it: it's the zebra stripe's own color,
so the drawer visually merged with a striped row.

**daisyUI assembly:** `btn`, `btn-ghost`, `btn-xs` for the trigger control, every class already
compiled from cairn's own admin usage.

**Exact class inventory:** `btn`, `btn-ghost`, `btn-xs`.

```svelte
<AdminTable {density} zebra rowCount={households.length}>
  {#snippet header()}
    <th>Household</th>
    <th>Standing</th>
    <th></th>
  {/snippet}
  {#snippet children()}
    {#each households as household (household.id)}
      <ExpandableRow
        expanded={expandedId === household.id}
        onToggle={() => (expandedId = expandedId === household.id ? null : household.id)}
        datum={household}
        colspan={3}
        triggerLabel={`${expandedId === household.id ? 'Collapse' : 'Expand'} the ${household.name} household`}
      >
        {#snippet summary()}
          <td>{household.name}</td>
          <td><StatusChip register={household.register} label={household.standing} /></td>
        {/snippet}
        {#snippet panel(household)}
          <p>{household.contact}</p>
        {/snippet}
      </ExpandableRow>
    {/each}
  {/snippet}
</AdminTable>
```

---

### `MediaPicker`

Stability tier: Extension API.

```ts
let { entries, onselect }: {
  entries: MediaLibraryEntry[];
  onselect: (selection: MediaSelection) => void;
};
```

The read-only combobox over a site's committed media library: a search input, an optional media-type
facet, and one option row per asset. It sits in this subpath rather than `/components` because it
selects an asset and hands it back, which is a screen primitive a site composes into its own admin
screen, not a rendering of one of cairn's content concepts. Nothing about it writes: uploading,
replacing, and committing an asset stay inside cairn's own media screens.

`entries` is the manifest-entry array `mediaLibraryLoad` returns on `MediaLibraryData.assets`, so a
site's own `/admin/` route passes the loader's output straight through with no projection step. Row
order follows the array as given. `mediaLibraryLoad` is authed load data, gated the same way every
other cairn admin load is; mount `MediaPicker` on an `/admin` route (inside `CairnAdminShell` or a
site's own authenticated custom route), never on a public page. `onselect` receives a
`MediaSelection`: the chosen entry, its `media:<slug>.<hash>` reference token to write into content,
and the asset's manifest alt to prefill a placement. The picker never mutates the array and holds no
selection of its own, so the caller owns what a pick does next.

**Contract term, the delivery base.** Option thumbnails compose their `src` under the delivery base
the mounting context supplies through cairn's internal `MEDIA_BASE_CONTEXT_KEY` Svelte context.
`CairnAdminShell` sets it from the site's resolved `assets.publicBase`, so a picker mounted anywhere
inside the shell renders thumbnails under the site's own base. Mounted outside the shell, with no
provider, thumbnails fall back to `/media`. The key itself is internal, so a site that serves media
from another base configures `assets.publicBase` and mounts inside the shell rather than setting the
context by hand.

Accessibility is the WAI-ARIA combobox pattern: focus stays in the search input, arrow keys move
`aria-activedescendant` across the owned listbox, and Enter selects the active row. Two separate
`aria-live` regions carry the result count and the active-row narration, so neither announcement
clobbers the other. An asset with an empty alt carries a "Needs alt" flag as a glyph plus a label,
never hue alone. Escape is left to bubble, so a host dialog or popover keeps its own dismiss.

**daisyUI assembly:** `btn`, `btn-xs`, `btn-primary`, `btn-ghost` for the media-type facet chips,
which render only once the library holds more than one top-level content type.

**Exact class inventory:** `btn`, `btn-xs`, `btn-primary`, `btn-ghost`.

```svelte
<script lang="ts">
  import { MediaPicker } from '@glw907/cairn-cms/admin-toolkit';
  import type { MediaLibraryData } from '@glw907/cairn-cms/sveltekit';

  let { data }: { data: MediaLibraryData } = $props();
  let chosen = $state('');
</script>

<MediaPicker entries={data.assets} onselect={(selection) => (chosen = selection.ref)} />
```

---

## Types

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| `FormatMoneyOptions` | Extension API | `interface FormatMoneyOptions { currency?: string; locale?: string; fallback?: string }` | `formatMoney`'s options: the ISO 4217 currency code, BCP 47 locale tag, and the nullish-input fallback string (defaults `''`). |
| `FormatCivilDateOptions` | Extension API | `interface FormatCivilDateOptions { fallback?: string; locale?: string; intlOptions?: Intl.DateTimeFormatOptions }` | `formatCivilDate`'s options: the nullish-or-empty-input fallback string (defaults `''`), locale, and the `Intl.DateTimeFormat` options passthrough. |
| `FormatTimestampOptions` | Extension API | `interface FormatTimestampOptions { timeZone?: string; locale?: string; fallback?: string }` | `formatTimestamp`'s options: the IANA time zone, BCP 47 locale tag, and the nullish-input fallback string (defaults `''`). |
| `FormatPhoneOptions` | Extension API | `interface FormatPhoneOptions { fallback?: string }` | `formatPhone`'s options: the nullish-input fallback string (defaults `''`). |
| `StatusChipSize` | Extension API | `type StatusChipSize = 'xs' \| 'sm'` | `StatusChip`'s two named sizes, matching AdminTable's own density tier names. |
| `StatusChipRegister` | Extension API | `type StatusChipRegister = 'quiet' \| 'warning' \| 'outline'` | `StatusChip`'s three ratified visual registers (second generation): `'quiet'`, a token-tinted ground with no border for a settled state that should recede; `'warning'`, the same tinted-ground shape for a state needing attention; and `'outline'`, a demoted-hairline border for a transient or reversible absence. |
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
| `computeCountLine` | Extension API | `declare function computeCountLine(count: number, itemLabel: string \| ItemLabel, appliedLabels: string[]): string` | The count line's own copy pattern: `"<count> <itemLabel>"`, followed by every applied-filter label joined with a middle dot. |
| `EmptyStateHeadingLevel` | Extension API | `type EmptyStateHeadingLevel = 'p' \| 'h1' \| 'h2' \| 'h3'` | `EmptyState`'s `headingLevel` prop vocabulary: the heading's own element, defaulting to `'p'`. |
| `ItemLabel` | Extension API | `interface ItemLabel { one: string; many: string }` | A count-line noun in both grammatical numbers, for `Pagination`'s and `ListToolbar`'s `itemLabel` prop and `computeCountLine`'s own parameter. |
| `itemNoun` | Extension API | `declare function itemNoun(count: number, label: string \| ItemLabel): string` | Picks the grammatical number for a count surface: `label.one` at exactly 1, `label.many` otherwise. A plain string `label` is invariant across every count. |
| `SelectInputOption` | Extension API | `interface SelectInputOption { value: string; label: string }` | One `SelectInput` option: the submitted value and its visible text. |
| <a id="medialibraryentry"></a>`MediaLibraryEntry` | Extension API | `interface MediaLibraryEntry { hash: string; slug: string; ext: string; contentType: string; displayName: string; alt: string; width: number \| null; height: number \| null; bytes: number; createdAt: string }` | One committed asset's display facts, the row shape `MediaLibraryData.assets` carries and `MediaPicker`'s `entries` prop takes. This subpath is its canonical home, beside the component whose prop signature names it; `/sveltekit` re-exports the same type so a route-factory importer can name a member of the data it already holds. |
| `MediaSelection` | Extension API | `interface MediaSelection { entry: MediaLibraryEntry; ref: string; alt: string }` | What `MediaPicker` hands its `onselect` prop: the chosen entry, its `media:<slug>.<hash>` reference token, and the asset's manifest alt (empty when the asset has none). |
| `ToolbarDisclosureAriaHaspopup` | Extension API | `type ToolbarDisclosureAriaHaspopup = 'menu' \| 'listbox' \| 'dialog' \| 'grid' \| 'tree' \| 'true'` | `ToolbarDisclosure`'s `ariaHaspopup` prop vocabulary, forwarded onto the trigger's own `aria-haspopup` unchanged. |
| `ToolbarDisclosureTriggerAttrs` | Extension API | `interface ToolbarDisclosureTriggerAttrs { 'aria-expanded': boolean; 'aria-controls': string; 'aria-haspopup': ToolbarDisclosureAriaHaspopup \| undefined; onclick: (event: MouseEvent) => void; [key: symbol]: Attachment<HTMLElement> }` | The attrs `ToolbarDisclosure`'s `trigger` snippet receives, to spread onto the caller's own trigger element last, so the toggle `onclick` is never shadowed by the caller's own. |
| `ToolbarDisclosurePanelAttrs` | Extension API | `interface ToolbarDisclosurePanelAttrs { id: string; hidden: true \| undefined }` | The attrs `ToolbarDisclosure`'s `panel` snippet receives; `id` is what the trigger's `aria-controls` resolves to, and `hidden` is this component's own primitive-owned hiding (`true` while closed), so an omitted `dropdown-content` positioning class on the caller's panel root can never leave the panel visible and tabbable while `aria-expanded` reads `false`. |
