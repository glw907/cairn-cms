import { parseComponentWithRawKeys } from './component-grammar.js';
import type { ComponentDef, ComponentValues } from './registry.js';

/** A validation verdict: ok, or field-keyed error messages. */
export type ComponentValidation = { ok: true } | { ok: false; errors: Record<string, string> };

/**
 *
 */
export async function validateComponent(markdown: string, def: ComponentDef): Promise<ComponentValidation> {
  const { values, rawKeys } = await parseComponentWithRawKeys(markdown, def);
  const errors: Record<string, string> = {};
  const declared = new Set((def.attributes ?? []).map((f) => f.key));

  for (const field of def.attributes ?? []) {
    const v = values.attributes[field.key];
    const filled = field.type === 'boolean' ? true : typeof v === 'string' && v !== '';
    if (field.required && !filled) {
      errors[field.key] = `${field.label} is required.`;
      continue;
    }
    if (field.type === 'select' && typeof v === 'string' && v !== '' && !(field.options ?? []).includes(v)) {
      errors[field.key] = `${field.label} must be one of: ${(field.options ?? []).join(', ')}.`;
      continue;
    }
    if (field.pattern && typeof v === 'string' && v !== '' && !new RegExp(field.pattern.source).test(v)) {
      errors[field.key] = field.pattern.message;
      continue;
    }
    if (field.validate) {
      const message = runFieldValidator(def, field.key, () => field.validate!(v, values));
      if (typeof message === 'string') errors[field.key] = message;
    }
  }

  for (const key of rawKeys) {
    if (!declared.has(key)) errors[key] = `Unknown attribute "${key}".`;
  }

  for (const slot of def.slots ?? []) {
    if (!slot.required) continue;
    const v = values.slots[slot.name];
    const filled = Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v !== '';
    if (!filled) errors[slot.name] = `${slot.label} is required.`;
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

// Run a site-supplied attribute validator. The validator is author code, so a throw is contained:
// the field is treated as valid and a dev-time warning names the component and field so the author
// can find the bug. A returned string is the field error; anything else (null) is clean.
function runFieldValidator(def: ComponentDef, key: string, call: () => string | null): string | null {
  try {
    return call();
  } catch (err) {
    console.warn(`cairn: validate() for component "${def.name}" field "${key}" threw; treating the field as valid.`, err);
    return null;
  }
}
