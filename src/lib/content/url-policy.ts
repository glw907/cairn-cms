// cairn-cms: the home for entry-permalink URL shaping. `permalink` resolves an entry's canonical
// path from its concept's pattern. The date is read straight from the YYYY-MM-DD string, so a
// permalink never shifts across a timezone.
import type { ConceptDescriptor } from './types.js';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateParts(date?: string): { year: string; month: string; day: string } | null {
  const match = date?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? { year: match[1], month: match[2], day: match[3] } : null;
}

/**
 * Resolve an entry's canonical path from its concept's permalink pattern. Throws when the
 * pattern uses a date token and the entry has no valid date, or when a token is unknown, so
 * a misconfiguration fails at build rather than emitting a broken path.
 */
export function permalink(
  descriptor: ConceptDescriptor,
  entry: { id: string; slug: string; date?: string },
): string {
  return descriptor.permalink.replace(/:(\w+)/g, (_match, token: string) => {
    if (token === 'slug') return entry.slug;
    if (token === 'year' || token === 'month' || token === 'day') {
      const parts = dateParts(entry.date);
      if (!parts) {
        throw new Error(
          `permalink: concept "${descriptor.id}" pattern uses :${token}, but entry "${entry.id}" has no valid date`,
        );
      }
      if (token === 'year') return parts.year;
      if (token === 'month') return pad(Number(parts.month));
      return pad(Number(parts.day));
    }
    throw new Error(`permalink: unknown token :${token} in pattern "${descriptor.permalink}"`);
  });
}
