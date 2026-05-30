import type { Paragraph, PhrasingContent, Root, Text } from 'mdast';
import type { ContainerDirective, LeafDirective, TextDirective } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';
import type { ComponentRegistry } from './registry';

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
			const attrs = node.attributes ?? {};
			const role = attrs.role || undefined;
			let icon = attrs.icon || undefined;
			if (!icon && role) icon = registry.defaultIcon(node.name, role);

			const properties: Record<string, string> = { dataPrimitive: node.name };
			if (icon) properties.dataIcon = icon;
			if (role) properties.dataRole = role;

			const data = node.data ?? (node.data = {});
			data.hName = 'div';
			data.hProperties = properties;
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
