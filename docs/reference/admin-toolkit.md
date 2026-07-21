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

## Types

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| `FormatMoneyOptions` | Extension API | `interface FormatMoneyOptions { currency?: string; locale?: string }` | `formatMoney`'s options: the ISO 4217 currency code and BCP 47 locale tag. |
| `FormatCivilDateOptions` | Extension API | `interface FormatCivilDateOptions { fallback?: string; locale?: string; intlOptions?: Intl.DateTimeFormatOptions }` | `formatCivilDate`'s options: the null-date fallback word, locale, and the `Intl.DateTimeFormat` options passthrough. |
| `FormatTimestampOptions` | Extension API | `interface FormatTimestampOptions { timeZone?: string; locale?: string }` | `formatTimestamp`'s options: the IANA time zone and BCP 47 locale tag. |
