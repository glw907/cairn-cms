import type { Paragraph, PhrasingContent, Root, Text } from 'mdast';
import type { ContainerDirective, LeafDirective, TextDirective } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';
import { dataAttrProp, type ComponentRegistry } from './registry.js';

// mdast-util-directive carries the `[label]` as a paragraph whose `data.directiveLabel` is set.
function isDirectiveLabel(node: unknown): boolean {
  return Boolean((node as { data?: { directiveLabel?: boolean } }).data?.directiveLabel);
}

// Stamp data-slot on a child so the rehype dispatch partitioner can route it. For a nested
// container directive we also set hName so it renders as a <div> wrapper rather than being
// dropped as an unknown directive.
function markSlot(node: unknown, name: string): void {
  const n = node as { type?: string; data?: { hName?: string; hProperties?: Record<string, string> } };
  const data = n.data ?? (n.data = {});
  if (n.type === 'containerDirective') data.hName = 'div';
  data.hProperties = { ...(data.hProperties ?? {}), dataSlot: name };
}

// Reconstruct a directive's authored attribute block (`{#id .class key="value"}`).
// Accidental prose directives carry none, so this is almost always empty.
function serializeAttributes(attributes?: Record<string, string | null | undefined> | null): string {
  if (!attributes) return '';
  const tokens: string[] = [];
  for (const [key, value] of Object.entries(attributes)) {
    if (value == null) tokens.push(key);
    else if (key === 'id') tokens.push(`#${value}`);
    else if (key === 'class') for (const c of value.split(/\s+/).filter(Boolean)) tokens.push(`.${c}`);
    else tokens.push(`${key}="${value}"`);
  }
  return tokens.length ? `{${tokens.join(' ')}}` : '';
}

// The vocabulary is container-only (`:::name`). A text directive (`:name`) or
// leaf directive (`::name`) is therefore always an accidental colon in prose
// ("4:00", "9:30", "ratio 16:9") that micromark tokenized as a directive.
// Restore it to its literal source text so prose renders verbatim.
function restoreLiteral(node: TextDirective | LeafDirective): PhrasingContent[] {
  const marker = node.type === 'leafDirective' ? '::' : ':';
  const attrs = serializeAttributes(node.attributes);
  if (node.children.length === 0) {
    return [{ type: 'text', value: marker + node.name + attrs }];
  }
  const open: Text = { type: 'text', value: `${marker}${node.name}[` };
  const close: Text = { type: 'text', value: `]${attrs}` };
  return [open, ...(node.children as PhrasingContent[]), close];
}

// Stamp each registered container directive with data-* markers carrying its
// component name, icon, and role. No structure is built here; the rehype
// dispatcher rewrites the marked elements once their children are hast.
// Text and leaf directives are restored to literal text (accidental prose colons).
export function remarkDirectiveStamp(registry: ComponentRegistry) {
  const known = new Set(registry.names);
  return (tree: Root) => {
    visit(tree, 'containerDirective', (node: ContainerDirective) => {
      if (!known.has(node.name)) return;
      const def = registry.get(node.name);
      const attrs = node.attributes ?? {};
      const role = attrs.role || undefined;
      let icon = attrs.icon || undefined;
      if (!icon && role) icon = registry.defaultIcon(node.name, role);

      const properties: Record<string, string> = { dataPrimitive: node.name };
      if (icon) properties.dataIcon = icon;
      if (role) properties.dataRole = role;
      // Carry every declared attribute to hast so the dispatch partitioner can build the
      // component context. data-attr-<key> survives to the element; build() consumes it and
      // returns a fresh element, so the marker never reaches the published DOM.
      for (const field of def?.attributes ?? []) {
        const raw = attrs[field.key];
        if (raw != null) properties[dataAttrProp(field.key)] = raw;
      }

      const data = node.data ?? (node.data = {});
      data.hName = 'div';
      data.hProperties = properties;

      // Mark the title label paragraph and the nested slot directives so they survive to hast
      // and the partitioner can find them. A slot named in the component schema (other than the
      // default body) is a nested container directive; the title is the directive [label].
      const slotNames = new Set((def?.slots ?? []).map((s) => s.name));
      for (const child of node.children) {
        if (isDirectiveLabel(child) && slotNames.has('title')) {
          markSlot(child, 'title');
        } else if (
          (child as { type?: string }).type === 'containerDirective' &&
          slotNames.has((child as { name: string }).name)
        ) {
          markSlot(child, (child as { name: string }).name);
        }
      }
    });

    visit(tree, ['textDirective', 'leafDirective'], (node, index, parent) => {
      if (!parent || index == null) return;
      const literal = restoreLiteral(node as TextDirective | LeafDirective);
      if (node.type === 'leafDirective') {
        // Leaf directives sit at block level; wrap the restored text in a paragraph.
        const paragraph: Paragraph = { type: 'paragraph', children: literal };
        parent.children.splice(index, 1, paragraph);
      } else {
        parent.children.splice(index, 1, ...literal);
      }
      return index;
    });
  };
}
