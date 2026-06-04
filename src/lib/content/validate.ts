// cairn-cms: the field-driven baseline validator. A site's `validate` calls this for the
// required-and-coerce baseline, then layers any bespoke rules on top, so the per-site
// validator stays thin (engine-fat rule). Saving runs the concept's validator on the
// server before any commit; invalid input bounces to the form (spec §7.4).
import type { FrontmatterField, ValidationResult } from './types.js';
import { dateInputValue, isCalendarDate } from './frontmatter.js';

/**
 * Validate raw frontmatter against a field list. Required text and date fields must be
 * non-empty; required tag fields must be non-empty lists. A present boolean coerces to `true`
 * and an unchecked one is omitted; a present tag field coerces to a string array and an empty
 * one is omitted, so validated data carries no key for an absent tag field (`tags` or `freetags`).
 * The delivery read model
 * (`ContentSummary.tags`) fills that case with an empty array; the two layers differ on purpose.
 * An empty optional text or date field is omitted, so the normalized data
 * carries only meaningful values and committed frontmatter stays minimal. Returns the
 * normalized data, or field-keyed errors when any required field is empty.
 *
 * Frontmatter may arrive from the edit form (all string values) or from `parseMarkdown`,
 * where gray-matter turns an unquoted YAML date into a JS `Date`. The `date` case coerces a
 * `Date` to `YYYY-MM-DD` so a valid parsed date is not mistaken for an empty one.
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
        // Absent or unchecked means false; omit it so a published file carries no draft: false noise.
        if (value === true) data[field.name] = true;
        break;
      case 'tags':
      case 'freetags': {
        const list = Array.isArray(value) ? value.map(String) : [];
        if (field.required && list.length === 0) errors[field.name] = `${field.label} is required`;
        else if (field.type === 'tags') {
          const unknown = list.find((tag) => !field.options.includes(tag));
          if (unknown !== undefined) errors[field.name] = `${field.label} contains an unknown value: ${unknown}`;
        }
        if (list.length > 0) data[field.name] = list;
        break;
      }
      case 'date': {
        const text = value instanceof Date ? dateInputValue(value) : typeof value === 'string' ? value.trim() : '';
        if (field.required && text === '') errors[field.name] = `${field.label} is required`;
        else if (text !== '' && !isCalendarDate(text)) errors[field.name] = `${field.label} must be a valid date (YYYY-MM-DD)`;
        if (text !== '') data[field.name] = text;
        break;
      }
      default: {
        const text = typeof value === 'string' ? value.trim() : '';
        if (field.required && text === '') errors[field.name] = `${field.label} is required`;
        if (text !== '') data[field.name] = text;
      }
    }
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data };
}
