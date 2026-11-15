// cairn-cms: the iCalendar feed builder (RFC 5545) behind `buildICalendarResponse`. A pure function
// over plain events a site has already resolved, so the engine holds no events concept, no time
// zone math, and no repeat rule: a site expands repeats and converts wall times before it calls.

/**
 * One calendar occurrence. A date start pairs only with a date end and an instant with an
 *  instant, so a feed never mixes an all-day start with a timed end.
 * @public
 */
export type ICalendarEvent = {
  /** A globally unique, stable id for the occurrence, such as `field-day-2027-06-05@example.com`; a calendar app matches updates on it. */
  uid: string;
  /** The event's title. */
  summary: string;
  /** Where the event happens, as free text. */
  location?: string;
  /** Longer text; a newline in it is kept as a line break. */
  description?: string;
  /** An absolute URI for the event's page, written as given with no escaping. */
  url?: string;
  /** Marks a cancelled occurrence, which stays in the feed so a subscriber's copy is updated rather than left stale. */
  status?: 'cancelled';
} & (
  | {
      /** The first day of an all-day event, `YYYY-MM-DD`. */
      start: `${number}-${number}-${number}`;
      /** The last day, inclusive, on or after `start`; omitted, the event lasts one day. */
      end?: `${number}-${number}-${number}`;
    }
  | {
      /** The UTC instant a timed event starts. */
      start: Date;
      /** The UTC instant it ends, after `start`; omitted, the event is a point in time. */
      end?: Date;
    }
);

/**
 * A calendar feed: its name, its product id, and its events in the order the feed writes them.
 * @public
 */
export interface ICalendar {
  /** The calendar's display name, written as both `NAME` and `X-WR-CALNAME` so subscribing apps that read either show it. */
  name: string;
  /** The formal public identifier of the producer, such as `-//Example Club//Events//EN`. */
  productId: string;
  /** The `DTSTAMP` every event carries; omitted, the build time. A fixed value makes the output reproducible. */
  stamp?: Date;
  /** One entry per occurrence; an empty list writes a calendar with no events. */
  events: ICalendarEvent[];
}

const encoder = new TextEncoder();

/** Escape a TEXT value per RFC 5545 section 3.3.11: the backslash first, so later escapes stay single. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Fold one content line per RFC 5545 section 3.1: at most 75 octets per physical line, each
 *  continuation led by one space. Iterating code points keeps a multi-octet character whole.
 */
function fold(line: string): string {
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (octets + size > 75) {
      parts.push(current);
      current = ' ';
      octets = 1;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join('\r\n');
}

/** A UTC DATE-TIME per RFC 5545 section 3.3.5, milliseconds dropped. */
function formatInstant(instant: Date): string {
  return instant.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '');
}

/** A DATE per RFC 5545 section 3.3.4, `days` after the given `YYYY-MM-DD`, crossing month and year ends. */
function formatDate(date: string, days = 0): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10).replace(/-/g, '');
}

/** The DTSTART and DTEND lines; an all-day end becomes the exclusive next day (RFC 5545 section 3.8.2.2). */
function timeLines(start: string | Date, end: string | Date | undefined): string[] {
  if (typeof start === 'string') {
    const last = typeof end === 'string' ? end : start;
    return [`DTSTART;VALUE=DATE:${formatDate(start)}`, `DTEND;VALUE=DATE:${formatDate(last, 1)}`];
  }
  const lines = [`DTSTART:${formatInstant(start)}`];
  if (end instanceof Date) lines.push(`DTEND:${formatInstant(end)}`);
  return lines;
}

/**
 * Build an iCalendar feed (RFC 5545) as a string with `CRLF` line ends.
 *
 * @remarks
 * Each event is one occurrence. A date is `YYYY-MM-DD`, and an all-day `end` is the last day,
 * inclusive and on or after `start`; the feed writes the exclusive next day. A timed `start` and
 * `end` are UTC instants, `end` after `start`, and a timed event with no `end` is a point in time.
 * Text carries no control character but a newline or a tab, and `url` is a URI with no line
 * break. Nothing is validated: an invalid `Date` throws from `toISOString`. The builder does no
 * time zone math and writes no repeat rule, so a site converts wall times and expands repeats
 * into separate events first.
 */
export function buildICalendar(calendar: ICalendar): string {
  const stamp = formatInstant(calendar.stamp ?? new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    `PRODID:${escapeText(calendar.productId)}`,
    'VERSION:2.0',
    `NAME:${escapeText(calendar.name)}`,
    `X-WR-CALNAME:${escapeText(calendar.name)}`,
  ];
  for (const event of calendar.events) {
    lines.push('BEGIN:VEVENT', `UID:${escapeText(event.uid)}`, `DTSTAMP:${stamp}`);
    lines.push(...timeLines(event.start, event.end));
    lines.push(`SUMMARY:${escapeText(event.summary)}`);
    if (event.location !== undefined) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.description !== undefined) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.url !== undefined) lines.push(`URL:${event.url}`);
    if (event.status === 'cancelled') lines.push('STATUS:CANCELLED');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
