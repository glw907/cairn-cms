import { parseComponent } from './component-grammar.js';
import type { ComponentDef } from './registry.js';

/** A validation verdict: ok, or field-keyed error messages. */
export type ComponentValidation = { ok: true } | { ok: false; errors: Record<string, string> };

export async function validateComponent(markdown: string, def: ComponentDef): Promise<ComponentValidation> {
  const values = await parseComponent(markdown, def);
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
    }
  }

  for (const key of rawAttributeKeys(markdown)) {
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

/** Pull attribute keys straight from the opening fence's `{...}` so unknown keys are caught even
 *  though the schema-driven parse drops them. */
function rawAttributeKeys(markdown: string): string[] {
  const m = markdown.match(/^:+[a-zA-Z0-9_-]+(?:\[[^\]]*\])?\{([^}]*)\}/m);
  if (!m) return [];
  return [...m[1].matchAll(/([a-zA-Z0-9_-]+)=/g)].map((x) => x[1]);
}
