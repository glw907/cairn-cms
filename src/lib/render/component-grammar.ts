import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkStringify from 'remark-stringify';
import type { Root, RootContent } from 'mdast';
import type { ComponentDef, ComponentValues, SlotDef } from './registry.js';

const COLON = ':';

function attrBlock(def: ComponentDef, values: ComponentValues): string {
  const parts: string[] = [];
  for (const field of def.attributes ?? []) {
    const v = values.attributes[field.key];
    if (field.type === 'boolean') {
      if (v === true) parts.push(`${field.key}="true"`);
    } else if (typeof v === 'string' && v !== '') {
      // The directive attribute grammar (mdast-util-directive) treats a literal `"` as the value
      // terminator and decodes HTML entities, so a backslash escape does not survive a round-trip.
      // Encode `&` first (so existing entities are not double-decoded) then `"`; the parser decodes
      // both back. A backslash is literal in this grammar and needs no escaping.
      const escaped = v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      parts.push(`${field.key}="${escaped}"`);
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
  // Escape brackets in the label so a `[` or `]` in the title does not break the directive label
  // grammar; remark un-escapes them back to literal text on parse, so readLabel recovers them.
  const label = title ? `[${title.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}]` : '';

  const open = `${fence}${def.name}${label}${attrBlock(def, values)}`;

  const lines: string[] = [open];
  const body = slotByName(def, 'body') ? (values.slots.body as string) ?? '' : '';
  if (body) lines.push(body);

  for (const slot of nestedSlots(def)) {
    const raw = values.slots[slot.name];
    const content =
      slot.kind === 'repeatable'
        ? (Array.isArray(raw) ? raw : []).filter((i) => i !== '').map((i) => `- ${i}`).join('\n')
        : ((raw as string | undefined) ?? '');
    if (!content) continue;
    if (lines.length > 1) lines.push(''); // blank line before this block
    lines.push(`${COLON.repeat(3)}${slot.name}`, content, COLON.repeat(3));
  }

  lines.push(fence);
  return lines.join('\n');
}

// A minimal structural view of a mdast containerDirective node (mdast-util-directive shape).
interface DirectiveNode {
  type: 'containerDirective' | 'leafDirective' | 'textDirective';
  name: string;
  attributes?: Record<string, string | null> | null;
  children: RootContent[];
}

function isContainer(node: RootContent): node is RootContent & DirectiveNode {
  return (node as DirectiveNode).type === 'containerDirective';
}

// Pin the bullet to `-` so a markdown body or slot that uses dash bullets round-trips unchanged
// rather than drifting to remark-stringify's default `*`, which would silently mutate author content.
const toMd = unified().use(remarkStringify, { bullet: '-' });

/** Render mdast children back to trimmed markdown text. */
function childrenToText(children: RootContent[]): string {
  const root: Root = { type: 'root', children };
  return String(toMd.stringify(root)).trim();
}

// Parse the markdown and find the component's opening container directive. The single seam both
// parseComponent and parseRawAttributeKeys (and the combined validator helper) build on, so one
// parse derives both the form values and the raw attribute keys.
function findComponentRoot(markdown: string, def: ComponentDef): (RootContent & DirectiveNode) | undefined {
  const tree = unified().use(remarkParse).use(remarkDirective).parse(markdown) as Root;
  return tree.children.find(
    (c): c is RootContent & DirectiveNode => isContainer(c) && (c as DirectiveNode).name === def.name,
  );
}

// Build guided-form values from an already-found component root. Returns the empty base when the
// root is absent.
function valuesFromRoot(root: (RootContent & DirectiveNode) | undefined, def: ComponentDef): ComponentValues {
  const values = emptyComponentValues(def);
  if (!root) return values;

  for (const field of def.attributes ?? []) {
    const raw = root.attributes?.[field.key];
    if (field.type === 'boolean') values.attributes[field.key] = raw === 'true';
    else if (typeof raw === 'string') values.attributes[field.key] = raw;
  }

  const titleSlot = slotByName(def, 'title');
  const bodySlot = slotByName(def, 'body');
  const nested = nestedSlots(def);
  const nestedNames = new Set(nested.map((s) => s.name));

  const directChildren = root.children.filter(
    (c) => !(isContainer(c) && nestedNames.has((c as DirectiveNode).name)) && !isDirectiveLabel(c),
  );
  const nestedChildren = root.children.filter(
    (c): c is RootContent & DirectiveNode => isContainer(c) && nestedNames.has((c as DirectiveNode).name),
  );

  if (titleSlot) values.slots.title = readLabel(root) ?? '';
  if (bodySlot) values.slots.body = childrenToText(directChildren);

  for (const slot of nested) {
    const node = nestedChildren.find((c) => c.name === slot.name);
    if (!node) continue;
    if (slot.kind === 'repeatable') values.slots[slot.name] = readListItems(node.children);
    else values.slots[slot.name] = childrenToText(node.children);
  }

  return values;
}

// The raw attribute keys on an already-found component root.
function rawKeysFromRoot(root: (RootContent & DirectiveNode) | undefined): string[] {
  return Object.keys(root?.attributes ?? {});
}

/** Parse a serialized component directive back into guided-form values, the inverse of
 *  {@link serializeComponent}. The grammar is reversible, so the editor can round-trip a
 *  saved directive through the form. */
export async function parseComponent(markdown: string, def: ComponentDef): Promise<ComponentValues> {
  return valuesFromRoot(findComponentRoot(markdown, def), def);
}

/** The raw attribute keys present on the component's opening directive, read from the parsed tree
 *  (quote-aware, unlike a regex over the source). Used by validation to flag unknown keys. */
export function parseRawAttributeKeys(markdown: string, def: ComponentDef): string[] {
  return rawKeysFromRoot(findComponentRoot(markdown, def));
}

/** Parse the component once and derive both the guided-form values and the raw attribute keys.
 *  Validation needs both, so this seam spares it the double parse that calling
 *  {@link parseComponent} and {@link parseRawAttributeKeys} separately would cost. */
export async function parseComponentWithRawKeys(
  markdown: string,
  def: ComponentDef,
): Promise<{ values: ComponentValues; rawKeys: string[] }> {
  const root = findComponentRoot(markdown, def);
  return { values: valuesFromRoot(root, def), rawKeys: rawKeysFromRoot(root) };
}

// A bare parse base: empty strings, false, and empty lists, with no attribute defaults applied. The
// `emptyValues` helper in registry.ts seeds form defaults instead, so it is deliberately not reused
// here; the parse must overwrite only the fields actually present in the markdown.
function emptyComponentValues(def: ComponentDef): ComponentValues {
  const attributes: Record<string, string | boolean> = {};
  for (const f of def.attributes ?? []) attributes[f.key] = f.type === 'boolean' ? false : '';
  const slots: Record<string, string | string[]> = {};
  for (const s of def.slots ?? []) slots[s.name] = s.kind === 'repeatable' ? [] : '';
  return { attributes, slots };
}

// mdast-util-directive carries the `[label]` as a paragraph whose `data.directiveLabel` is set.
function isDirectiveLabel(node: RootContent): boolean {
  return Boolean((node as { data?: { directiveLabel?: boolean } }).data?.directiveLabel);
}

function readLabel(root: DirectiveNode): string | undefined {
  for (const child of root.children) {
    const p = child as { type: string; data?: { directiveLabel?: boolean }; children?: { value?: string }[] };
    if (p.type === 'paragraph' && p.data?.directiveLabel) return (p.children ?? []).map((c) => c.value ?? '').join('');
  }
  return undefined;
}

function readListItems(children: RootContent[]): string[] {
  const list = children.find((c) => (c as { type: string }).type === 'list') as { children?: RootContent[] } | undefined;
  if (!list?.children) return [];
  return list.children.map((li) => childrenToText((li as { children?: RootContent[] }).children ?? []));
}
