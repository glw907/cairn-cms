// cairn-cms: taxonomy resolution. A concept's taxonomy is the single top-level multiselect field
// it marks `taxonomy: true`; its values are the tags that drive the tag index, tag archives, and
// feed categories. resolveTaxonomyField names that field for the content index to read.
import type { NamedField } from './types.js';

/** The name of the single top-level field marked `taxonomy: true`, or null when none is. */
export function resolveTaxonomyField(fields: NamedField[]): string | null {
  const marked = fields.find((f) => f.type === 'multiselect' && f.taxonomy === true);
  return marked ? marked.name : null;
}

/**
 * A raw taxonomy frontmatter value as a tag array. An array maps each element to a string; a
 *  non-empty scalar coerces to a one-element array; anything else (absent, empty string) yields
 *  none. This is the scalar-coercing form the validator and the multiselect form layer use, so a
 *  lone `topics: svelte` projects `['svelte']` rather than dropping, which the tag-usage index
 *  relies on for its delete-safety gate.
 */
export function coerceTags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(String)
    : typeof value === 'string' && value.trim() !== ''
      ? [value.trim()]
      : [];
}
