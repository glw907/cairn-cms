import { serializeComponent } from './component-grammar.js';
import { emptyValues, type ComponentDef, type ComponentRegistry, type ComponentValues } from './registry.js';

export interface ReferenceOptions {
  /** The H1 title of the reference document. */
  title: string;
  /** The one-line blockquote summary under the title. */
  summary: string;
}

/** Build a self-contained markdown reference (the llms-full.txt shape) for a component registry, for
 *  authors and for pointing an LLM at one curated file. */
export function generateComponentReference(registry: ComponentRegistry, opts: ReferenceOptions): string {
  const sections = registry.defs.map((def) => componentSection(def));
  return `# ${opts.title}\n\n> ${opts.summary}\n\n${sections.join('\n\n')}\n`;
}

function componentSection(def: ComponentDef): string {
  const lines = [`## ${def.label} (\`:::${def.name}\`)`, '', def.description ?? ''];
  if (def.use) lines.push('', `**When to use:** ${def.use}`);
  lines.push('', '```', serializeComponent(def, exampleValues(def)), '```');
  return lines.join('\n');
}

/** Seed example values that show every declared field: an ellipsis for strings, one sample list item. */
function exampleValues(def: ComponentDef): ComponentValues {
  const values = emptyValues(def);
  for (const field of def.attributes ?? []) {
    if (field.type === 'boolean') values.attributes[field.key] = false;
    else values.attributes[field.key] = field.options?.[0] ?? '…';
  }
  for (const slot of def.slots ?? []) {
    if (slot.kind === 'repeatable') values.slots[slot.name] = ['…'];
    else if (slot.name === 'title') values.slots[slot.name] = 'Title';
    else values.slots[slot.name] = '…';
  }
  return values;
}
