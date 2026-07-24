// cairn-cms: the admin toolkit's formatter primitives, graduated from aksailingclub-org's
// `src/admin-club/toolkit/format.ts` ("Formatters as citizens" -- no consuming admin screen should
// hand-roll money, civil-date, timestamp, or age arithmetic). Every formatter takes its locale and
// time zone as an option with a neutral default rather than assuming any one site's own locale or
// zone, so a second consumer in another zone or locale is a parameter, not a fork.
//
// `formatTimestamp` differs from the ASC original on one point, deliberately: its `timeZone`
// default is `'UTC'`, not ASC's own `'America/Anchorage'`. A shared engine formatter cannot default
// to one consumer's zone; a site that wants its own local time passes `timeZone` explicitly.

/** Options for {@link formatMoney}. */
export interface FormatMoneyOptions {
  /** ISO 4217 currency code. Defaults to `'USD'`. */
  currency?: string;
  /** A BCP 47 locale tag. Defaults to `'en-US'`. */
  locale?: string;
}

/**
 * Format signed integer cents (a ledger's `amount_total_cents`/`amount_cents` shape) as a currency
 * string with thousands separators, e.g. `formatMoney(30044)` reads `"$300.44"` rather than the
 * raw-cents artifact `"$30044"`. Negative cents (a refund or a credit) render with a leading minus
 * sign, matching the ledger's own signed-integer convention.
 */
export function formatMoney(cents: number, options: FormatMoneyOptions = {}): string {
  const { currency = 'USD', locale = 'en-US' } = options;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

/** Options for {@link formatCivilDate}. */
export interface FormatCivilDateOptions {
  /** The word to show for a null or missing date. Defaults to `'Not yet'`. */
  fallback?: string;
  /** A BCP 47 locale tag. Defaults to `'en-US'`. */
  locale?: string;
  /**
   * A passthrough overriding the default `{ year: 'numeric', month: 'short', day: 'numeric' }`
   * shape, for a screen that renders only part of the date (a month/day list) or a longer form (a
   * full month name).
   */
  intlOptions?: Intl.DateTimeFormatOptions;
}

/**
 * Format a civil date (a calendar day with no time of day, e.g. "joined on the 2nd") from an ISO
 * `YYYY-MM-DD` string, or the leading date portion of a full SQLite datetime string. Parses at
 * local midnight so the calendar day never shifts a day west of Greenwich the way a bare
 * `new Date(iso)` UTC parse would, and never routes a civil date through a time-of-day formatter
 * (the "4:00 PM" artifact a timestamp formatter produces for a value that carries no time).
 */
export function formatCivilDate(iso: string | null | undefined, options: FormatCivilDateOptions = {}): string {
  const { fallback = 'Not yet', locale = 'en-US', intlOptions = { year: 'numeric', month: 'short', day: 'numeric' } } =
    options;
  if (!iso) return fallback;
  const civil = iso.slice(0, 10);
  const parsed = new Date(`${civil}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, intlOptions).format(parsed);
}

/** Options for {@link formatTimestamp}. */
export interface FormatTimestampOptions {
  /**
   * An IANA time zone name. Defaults to `'UTC'`, the neutral zone a Cloudflare Worker's own
   * runtime already reads in; a site passes its own zone (a club's Anchorage, say) explicitly
   * rather than inheriting one from this formatter.
   */
  timeZone?: string;
  /** A BCP 47 locale tag. Defaults to `'en-US'`. */
  locale?: string;
}

/**
 * Format a SQLite `datetime('now')`-shaped UTC string (`"YYYY-MM-DD HH:MM:SS"`, no offset) as a
 * date and time in `timeZone`. Swapping the space for `T` and appending `Z` keeps `Date` reading
 * the input as UTC rather than the runtime's own zone, the same reasoning {@link formatCivilDate}
 * applies to a bare calendar day.
 */
export function formatTimestamp(sqliteDatetime: string, options: FormatTimestampOptions = {}): string {
  const { timeZone = 'UTC', locale = 'en-US' } = options;
  const parsed = new Date(`${sqliteDatetime.replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) return sqliteDatetime;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(parsed);
}

/**
 * Derive a whole-years age from an ISO birthdate, as of `asOf` (defaults to now; pass a fixed date
 * for deterministic tests). Turns over on the birthday itself rather than the day after, and reads
 * `null` for a missing or unparseable birthdate so a caller can render its own "age unknown" copy
 * instead of a formatter guessing at it.
 */
export function ageFromBirthdate(birthdateIso: string | null | undefined, asOf: Date = new Date()): number | null {
  if (!birthdateIso) return null;
  const civil = birthdateIso.slice(0, 10);
  const birth = new Date(`${civil}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  let age = asOf.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    asOf.getMonth() > birth.getMonth() || (asOf.getMonth() === birth.getMonth() && asOf.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/**
 * A stored E.164 `+1` NANP number (10 digits after the country code), the one shape a phone
 * normalized at write time (a member-normalize style parse) produces.
 */
const NANP_E164 = /^\+1(\d{3})(\d{3})(\d{4})$/;

/**
 * Format a stored E.164 phone number for a table cell: `+19075550100` becomes the hyphenated
 * `907-555-0100`, no leading `+1`. A number outside the NANP `+1` shape (a non-US country code,
 * or anything that fails to parse) passes through unchanged; a table cell has no reason to
 * reformat what it cannot parse.
 */
export function formatPhone(phone: string): string {
  const match = NANP_E164.exec(phone);
  if (!match) return phone;
  const [, area, prefix, line] = match;
  return `${area}-${prefix}-${line}`;
}

/**
 * A count-line noun in both grammatical numbers, graduated from aksailingclub-org's own
 * `format.ts` (the "1 households" defect: a bare plural noun reads wrong at exactly one). `one`
 * is the singular form, used when the count is exactly 1; `many` is the plural, used for every
 * other count, zero included ("0 households").
 */
export interface ItemLabel {
  /** The singular noun, used when the count is exactly 1. */
  one: string;
  /** The plural noun, used for every other count, zero included ("0 households"). */
  many: string;
}

/**
 * Pick the grammatical number for a count surface: `one` at exactly 1, `many` otherwise. `label`
 * also accepts a plain string, which is invariant across every count -- the original `Pagination`/
 * `ListToolbar` contract's behavior, unchanged, for a caller that has not opted into grammatical
 * number. `Pagination`'s range line and `ListToolbar`'s count line both route through this, so the
 * "1 households" defect class has a single fix point.
 */
export function itemNoun(count: number, label: string | ItemLabel): string {
  if (typeof label === 'string') return label;
  return count === 1 ? label.one : label.many;
}
