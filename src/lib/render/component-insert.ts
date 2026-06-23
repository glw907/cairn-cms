import { serializeComponent } from './component-grammar.js';
import { validateComponent } from './component-validate.js';
import type { ComponentDef, ComponentValues } from './registry.js';

/**
 * The outcome of preparing a guided-form component for insertion: the markdown to insert, or the
 *  field-keyed errors to show on the form.
 */
export type ComponentInsert = { ok: true; markdown: string } | { ok: false; errors: Record<string, string> };

/**
 * Serialize a component's form values, then validate the result against its schema. Returns the
 *  markdown to insert at the cursor, or the field errors keyed by attribute key or slot name.
 */
export async function buildComponentInsert(def: ComponentDef, values: ComponentValues): Promise<ComponentInsert> {
  const markdown = serializeComponent(def, values);
  const verdict = await validateComponent(markdown, def);
  return verdict.ok ? { ok: true, markdown } : { ok: false, errors: verdict.errors };
}
