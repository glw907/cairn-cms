// cairn-cms: a scalar-or-array frontmatter value coerced to a string list. A closed taxonomy
// field (taxonomy.ts) and an open multiselect form value (frontmatter.ts) both read a stored
// value the same way, so one shared coercer keeps the two decode paths from drifting apart.

/**
 * Coerce a raw multi-valued frontmatter value to a string array. An array maps each element to a
 *  string; a non-empty scalar becomes a one-element array; anything else (absent, empty string)
 *  yields none.
 */
export function coerceStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim() !== '') return [value.trim()];
  return [];
}
