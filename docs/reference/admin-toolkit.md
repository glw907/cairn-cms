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
import { StatusChip, Pagination } from '@glw907/cairn-cms/admin-toolkit';
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
`legend` is optional explanatory text for a tone a label alone does not fully carry (for example
"full member benefits continue during the grace window"); it surfaces as a native tooltip and
folds into the chip's accessible name (`aria-label="<label>: <legend>"`), and is omitted
entirely for a self-explanatory label.

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
