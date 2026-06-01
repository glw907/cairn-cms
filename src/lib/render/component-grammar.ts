import type { ComponentDef, ComponentValues, SlotDef } from './registry.js';

const COLON = ':';

function attrBlock(def: ComponentDef, values: ComponentValues): string {
  const parts: string[] = [];
  for (const field of def.attributes ?? []) {
    const v = values.attributes[field.key];
    if (field.type === 'boolean') {
      if (v === true) parts.push(`${field.key}="true"`);
    } else if (typeof v === 'string' && v !== '') {
      parts.push(`${field.key}="${v.replace(/"/g, '\\"')}"`);
    }
  }
  return parts.length ? `{${parts.join(' ')}}` : '';
}

function slotByName(def: ComponentDef, name: string): SlotDef | undefined {
  return (def.slots ?? []).find((s) => s.name === name);
}

function nestedSlots(def: ComponentDef): SlotDef[] {
  return (def.slots ?? []).filter((s) => s.name !== 'title' && s.name !== 'body');
}

export function serializeComponent(def: ComponentDef, values: ComponentValues): string {
  const fence = COLON.repeat(nestedSlots(def).length > 0 ? 4 : 3);

  const title = slotByName(def, 'title') ? (values.slots.title as string) ?? '' : '';
  const label = title ? `[${title}]` : '';

  const open = `${fence}${def.name}${label}${attrBlock(def, values)}`;

  const lines: string[] = [open];
  const body = slotByName(def, 'body') ? (values.slots.body as string) ?? '' : '';
  if (body) lines.push(body);

  lines.push(fence);
  return lines.join('\n');
}
