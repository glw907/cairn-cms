// cairn-cms: the field-driven baseline validator. A site's `validate` calls this for the
// required-and-coerce baseline, then layers any bespoke rules on top, so the per-site
// validator stays thin (engine-fat rule). Saving runs the concept's validator on the
// server before any commit; invalid input bounces to the form (spec §7.4).
import type { FrontmatterField, ValidationResult } from './types.js';

/**
 * Validate raw frontmatter against a field list. Required text and date fields must be
 * non-empty; required tag fields must be non-empty lists. Booleans coerce to `true`/`false`
 * and tag fields to string arrays. Returns the normalized data, or field-keyed errors when
 * any required field is empty.
 */
export function validateFields(
  fields: FrontmatterField[],
  frontmatter: Record<string, unknown>,
): ValidationResult {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = frontmatter[field.name];
    switch (field.type) {
      case 'boolean':
        data[field.name] = value === true;
        break;
      case 'tags':
      case 'freetags': {
        const list = Array.isArray(value) ? value.map(String) : [];
        if (field.required && list.length === 0) errors[field.name] = `${field.label} is required`;
        data[field.name] = list;
        break;
      }
      default: {
        const text = typeof value === 'string' ? value.trim() : '';
        if (field.required && text === '') errors[field.name] = `${field.label} is required`;
        data[field.name] = text;
      }
    }
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data };
}
