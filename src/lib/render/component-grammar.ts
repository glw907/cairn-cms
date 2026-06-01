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

  for (const slot of nestedSlots(def)) {
    const raw = values.slots[slot.name];
    const content =
      slot.kind === 'repeatable'
        ? ((raw as string[] | undefined) ?? []).filter((i) => i !== '').map((i) => `- ${i}`).join('\n')
        : ((raw as string | undefined) ?? '');
    if (!content) continue;
    if (lines.length > 1) lines.push(''); // blank line before this block
    lines.push(`${COLON.repeat(3)}${slot.name}`, content, COLON.repeat(3));
  }

  lines.push(fence);
  return lines.join('\n');
}
