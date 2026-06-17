// cairn-cms: frontmatter form decoding and on-disk serialization. `frontmatterFromForm`
// is the form-to-data half of the edit loop; `serializeMarkdown`/`parseMarkdown` are the
// on-disk write/read pair. Kept as one seam so a site owns its serialization contract
// (quoting, key order) without the save endpoint reaching for gray-matter directly.
import matter from 'gray-matter';
import type { FrontmatterField } from './types.js';

/** Decode submitted form data into raw frontmatter, one rule per field type. */
export function frontmatterFromForm(
  fields: FrontmatterField[],
  form: FormData,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    switch (field.type) {
      case 'boolean':
        data[field.name] = form.get(field.name) === 'on';
        break;
      case 'tags':
        data[field.name] = form.getAll(field.name).map(String);
        break;
      case 'freetags':
        // One comma-separated input to trimmed, de-duplicated, non-empty tags.
        data[field.name] = [
          ...new Set(
            String(form.get(field.name) ?? '')
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
          ),
        ];
        break;
      case 'image': {
        // The hero submits three sub-fields under one key. An empty src means no hero, so omit the
        // whole key. Alt is stored verbatim (it is not markdown, so no escaping). A blank caption
        // is dropped so committed frontmatter stays minimal.
        const src = String(form.get(`${field.name}.src`) ?? '').trim();
        if (src === '') break;
        const value: { src: string; alt: string; caption?: string } = {
          src,
          alt: String(form.get(`${field.name}.alt`) ?? ''),
        };
        const caption = String(form.get(`${field.name}.caption`) ?? '').trim();
        if (caption !== '') value.caption = caption;
        data[field.name] = value;
        break;
      }
      default:
        // FormData.get returns null for an absent field; normalize to an empty string so
        // a caller reading a text value never gets null.
        data[field.name] = form.get(field.name) ?? '';
    }
  }
  return data;
}

/**
 * Coerce a frontmatter date value to the `YYYY-MM-DD` an `<input type="date">` wants.
 * gray-matter parses an unquoted YAML date into a JS Date, so a string-only read would
 * leave the input empty and drop the date on save. A parsed YAML date is UTC midnight, so
 * slicing the ISO string avoids a local-timezone shift.
 */
export function dateInputValue(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : '';
  }
  return '';
}

/**
 * True when `s` is a canonical zero-padded `YYYY-MM-DD` string naming a real calendar date.
 * Rejects a wrong format, an impossible month or day, and a JS date-rollover such as
 * `2026-02-30` (which `Date` would silently roll forward to March 2). The committed form a
 * date field carries is exactly this canonical shape, which is what the form and
 * `dateInputValue` emit, so a value outside it is a hand-edit or odd-YAML error.
 */
export function isCalendarDate(s: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Reassemble a markdown file from frontmatter and body for committing. */
export function serializeMarkdown(frontmatter: object, body: string): string {
  return matter.stringify(body, frontmatter);
}

/** Parse a markdown file into its frontmatter and body: the read-side inverse of serialize. */
export function parseMarkdown(source: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const parsed = matter(source);
  return { frontmatter: parsed.data, body: parsed.content };
}
