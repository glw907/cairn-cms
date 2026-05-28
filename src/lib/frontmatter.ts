// cairn-core: coerce a frontmatter value to the YYYY-MM-DD string an <input type="date"> wants.
// gray-matter parses an unquoted YAML date (date: 2026-05-14) into a JS Date, so a string-only
// read leaves the date input empty and drops the date on save. This normalizes a Date or an
// ISO-ish string to YYYY-MM-DD. A parsed YAML date is UTC midnight, so slicing the ISO string
// avoids a local-timezone shift. Internal (not re-exported from the barrel), like utils.ts.

/** A frontmatter date value (Date or string) to the `YYYY-MM-DD` an `<input type="date">` expects. */
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
