// cairn-cms: the admin toolkit's formatter primitives, graduated from a consumer site's admin
// toolkit ("Formatters as citizens" -- no consuming admin screen should hand-roll civil-date or
// timestamp arithmetic). Every formatter takes its locale and time zone as
// an option with a neutral default rather than assuming any one site's own locale or zone, so a
// second consumer in another zone or locale is a parameter, not a fork.
//
// `formatTimestamp` differs from the ASC original on one point, deliberately: its `timeZone`
// default is `'UTC'`, not ASC's own `'America/Anchorage'`. A shared engine formatter cannot default
// to one consumer's zone; a site that wants its own local time passes `timeZone` explicitly.
//
// Every display formatter in this file (formatCivilDate, formatTimestamp) accepts a nullish input
// and takes a `fallback?: string` option defaulting to `''`. The point is uniformity: a caller
// rendering a possibly-absent value never has to remember which formatter tolerates nullish and
// which throws, nor which one carries its own opinion about what absence looks like.

/** Options for {@link formatCivilDate}. */
export interface FormatCivilDateOptions {
  /** The string to return for a nullish or empty `iso` value. Defaults to `''`. */
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
 * (the "4:00 PM" artifact a timestamp formatter produces for a value that carries no time). A
 * nullish or empty `iso` reads `options.fallback`.
 */
export function formatCivilDate(iso: string | null | undefined, options: FormatCivilDateOptions = {}): string {
  const { fallback = '', locale = 'en-US', intlOptions = { year: 'numeric', month: 'short', day: 'numeric' } } =
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
  /** The string to return for a nullish `sqliteDatetime` value. Defaults to `''`. */
  fallback?: string;
}

// A SQLite `datetime('now')`-shaped UTC string, `"YYYY-MM-DD HH:MM:SS"`, carries no `T` and no
// offset.
const SQLITE_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

// A full ISO 8601 string that names its own zone, either a `Z` suffix or an explicit `+hh:mm` /
// `-hh:mm` offset. A zone-less near-ISO shape (no `Z`, no offset) does NOT match this, and is
// passed through unchanged rather than handed to `new Date()`, which would parse it in the
// runtime's own local zone; that fall-through is exactly what let a Worker's SSR and a browser's
// hydration render different text for the same input.
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Format a SQLite `datetime('now')`-shaped UTC string with no offset, or a full ISO 8601 string
 * carrying its own `Z` suffix or explicit offset, as a date and time in `timeZone`. Any other
 * shape, including a zone-less near-ISO string, is returned unchanged: the input's own moment is
 * always read from its own text, an offset it names or the UTC this function assumes for the
 * SQLite shape, and NEVER from the runtime's local zone, so a Worker's SSR and a browser's
 * hydration render identical text for every shape this function accepts. `timeZone` governs only
 * the RENDERED zone. A nullish `input` reads `options.fallback`.
 */
export function formatTimestamp(input: string | null | undefined, options: FormatTimestampOptions = {}): string {
  const { timeZone = 'UTC', locale = 'en-US', fallback = '' } = options;
  if (input == null) return fallback;
  let parsed: Date;
  if (SQLITE_DATETIME.test(input)) {
    parsed = new Date(`${input.replace(' ', 'T')}Z`);
  } else if (ISO_WITH_ZONE.test(input)) {
    parsed = new Date(input);
  } else {
    return input;
  }
  if (Number.isNaN(parsed.getTime())) return input;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(parsed);
}

/**
 * A count-line noun in both grammatical numbers, graduated from a consumer site's own formatter
 * (the "1 households" defect: a bare plural noun reads wrong at exactly one). `one`
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
