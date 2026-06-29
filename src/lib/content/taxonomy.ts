// cairn-cms: taxonomy resolution. A concept's taxonomy is the single top-level multiselect field
// it marks `taxonomy: true`; its values are the tags that drive the tag index, tag archives, and
// feed categories. resolveTaxonomyField names that field for the content index to read.
import type { NamedField } from './types.js';

/** The name of the single top-level field marked `taxonomy: true`, or null when none is. */
export function resolveTaxonomyField(fields: NamedField[]): string | null {
  const marked = fields.find((f) => f.type === 'multiselect' && f.taxonomy === true);
  return marked ? marked.name : null;
}
