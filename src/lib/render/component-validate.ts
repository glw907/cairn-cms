import { parseComponentWithRawKeys } from './component-grammar.js';
import { fieldset } from '../content/fieldset.js';
import type { ComponentDef } from './registry.js';

/** A validation verdict: ok, or field-keyed error messages. */
export type ComponentValidation = { ok: true } | { ok: false; errors: Record<string, string> };

/**
 * Validate a serialized component directive against its definition: the attributes through the same
 *  `fieldset` validator a concept field uses (coercion, constraints, required, select domain, pattern,
 *  and any per-attribute `behavior.validate`), then the two component-only checks, an unknown attribute
 *  key and an unfilled required slot.
 */
export async function validateComponent(markdown: string, def: ComponentDef): Promise<ComponentValidation> {
  const { values, rawKeys } = await parseComponentWithRawKeys(markdown, def);
  const errors: Record<string, string> = {};

  const schema = def.attributeSchema ?? fieldset(def.attributes ?? {}, { behavior: def.behavior });
  const result = schema.validate(values.attributes, '');
  if (!result.ok) Object.assign(errors, result.errors);

  const declared = new Set(Object.keys(def.attributes ?? {}));
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
