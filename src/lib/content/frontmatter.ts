// cairn-cms: frontmatter form decoding and on-disk serialization. `frontmatterFromForm`
// is the form-to-data half of the edit loop; `serializeMarkdown`/`parseMarkdown` are the
// on-disk write/read pair. Kept as one seam so a site owns its serialization contract
// (quoting, key order) without the save endpoint reaching for gray-matter directly.
import matter from 'gray-matter';
import type { ImageValue, NamedField } from './types.js';

/**
 * True when a multiselect field is a closed checkbox group: it declares an options vocabulary and is
 *  not author-extendable. The save decoder and the editor render arm both call this, so the
 *  closed-versus-open multiselect decision can never drift between decode and display.
 */
export function isClosedMultiselect(field: {
  type: string;
  options?: readonly string[];
  creatable?: boolean;
}): boolean {
  return field.type === 'multiselect' && !!field.options && !field.creatable;
}

/** Decode submitted form data into raw frontmatter, one rule per field type. */
export function frontmatterFromForm(
  fields: NamedField[],
  form: FormData,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    switch (field.type) {
      case 'boolean':
        data[field.name] = form.get(field.name) === 'on';
        break;
      case 'multiselect':
        if (isClosedMultiselect(field)) {
          // A closed vocabulary submits one form value per checked box.
          data[field.name] = form.getAll(field.name).map(String);
        } else {
          // An open or creatable set is one comma-separated input to trimmed, de-duplicated tags.
          data[field.name] = [
            ...new Set(
              String(form.get(field.name) ?? '')
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            ),
          ];
        }
        break;
      case 'image': {
        // The hero submits three sub-fields under one key. An empty src means no hero, so omit the
        // whole key. Alt is stored verbatim (it is not markdown, so no escaping). A blank caption
        // is dropped so committed frontmatter stays minimal.
        const src = String(form.get(`${field.name}.src`) ?? '').trim();
        if (src === '') break;
        const value: ImageValue = {
          src,
          alt: String(form.get(`${field.name}.alt`) ?? ''),
        };
        const caption = String(form.get(`${field.name}.caption`) ?? '').trim();
        if (caption !== '') value.caption = caption;
        // An explicit decorative choice persists so a reload tells it apart from a left-blank alt.
        // The key is dropped otherwise to keep committed frontmatter minimal.
        const decorative = String(form.get(`${field.name}.decorative`) ?? '');
        if (decorative === 'true') value.decorative = true;
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
 * Coerce a frontmatter datetime value to the naive-local, minute-precision `YYYY-MM-DDTHH:mm` an
 * `<input type="datetime-local">` wants. A datetime is round-tripped as TEXT, so a stored value is
 * already this string; the `Date` branch is the fallback for a value gray-matter parsed into a JS
 * `Date` from an unquoted full-ISO scalar. UTC getters read the value back as it was written,
 * avoiding a local-timezone shift.
 */
export function datetimeInputValue(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const yyyy = value.getUTCFullYear().toString().padStart(4, '0');
    const mm = (value.getUTCMonth() + 1).toString().padStart(2, '0');
    const dd = value.getUTCDate().toString().padStart(2, '0');
    const hh = value.getUTCHours().toString().padStart(2, '0');
    const min = value.getUTCMinutes().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }
  if (typeof value === 'string') {
    const match = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
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

/** Coerce parsed frontmatter to the form-ready values the editor inputs expect, one rule per field type. */
export function formValues(
  fields: NamedField[],
  frontmatter: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const value = frontmatter[field.name];
    if (field.type === 'date') out[field.name] = dateInputValue(value);
    // A datetime round-trips as text; a value gray-matter parsed into a Date reformats to the
    // naive-local minute-precision string the datetime-local input wants.
    else if (field.type === 'datetime') out[field.name] = datetimeInputValue(value);
    else if (field.type === 'boolean') out[field.name] = value === true;
    else if (field.type === 'multiselect') out[field.name] = Array.isArray(value) ? value.map(String) : [];
    // A hero is a nested object; the default String() arm would corrupt it to '[object Object]'.
    // Hand the stored object back as-is so the editor reads .src/.alt/.caption on open.
    else if (field.type === 'image') out[field.name] = value !== null && typeof value === 'object' ? value : undefined;
    // Every other type is a plain string input: a nullish value reads as empty, anything else
    // stringifies (a string passes through unchanged).
    else out[field.name] = value == null ? '' : String(value);
  }
  return out;
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
