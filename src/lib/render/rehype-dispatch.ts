import type { Root, Element, ElementContent } from 'hast';
import { h } from 'hastscript';
import { dataAttrProp, type ComponentContext, type ComponentDef, type ComponentRegistry } from './registry.js';

export function isElement(node: ElementContent | undefined): node is Element {
  return !!node && node.type === 'element';
}

/** Read a declared string attribute off the component context, returning undefined for a boolean or
 *  absent value. Replaces the `typeof ctx.attributes[key] === 'string'` narrowing a build repeats. */
export function strAttr(ctx: ComponentContext, key: string): string | undefined {
  const value = ctx.attributes[key];
  return typeof value === 'string' ? value : undefined;
}

// hast Properties values are PropertyValue (string | number | boolean | array | null).
// Directive markers (dataPrimitive/dataRole/dataAttr<Key>) are always stamped as strings;
// this reads them back with that guarantee instead of casting at each call site.
export function strProp(node: Element, name: string): string | undefined {
  const value = node.properties?.[name];
  return typeof value === 'string' ? value : undefined;
}

/** Wrap a pre-built glyph in an ec-icon span; secondary role adds the modifier. */
export function iconSpan(glyphEl: Element, role?: string): Element {
  const className = role === 'secondary' ? ['ec-icon', 'ec-icon-secondary'] : ['ec-icon'];
  return h('span', { className }, [glyphEl]);
}

/** A site's icon factory: turn a stamped icon name + role into a hast element. */
export type MakeIcon = (name: string, role?: string) => Element;

/** Section wrapper: `<section class=…><div class="card-body">…</div></section>`. */
export function cardShell(classes: string[], body: ElementContent[]): Element {
  return h('section', { className: classes }, [h('div', { className: ['card-body'] }, body)]);
}

/** Card head row: `<div class="ec-head">[icon]<h2 class="card-title">{title}</h2></div>`.
 *  Pass the title's inline children and an optional pre-built icon element, the way `cardShell`
 *  takes already-built body content. This factors the icon-plus-heading head that a titled
 *  component build would otherwise rebuild by hand (the shape the removed `splitHead` produced). */
export function headRow(title: ElementContent[], icon?: Element): Element {
  const children: ElementContent[] = [];
  if (icon) children.push(icon);
  children.push(h('h2', { className: ['card-title'] }, title));
  return h('div', { className: ['ec-head'] }, children);
}

/** Tag the first <ul> among children with `ec-grid` and strip its whitespace-only
 *  text nodes so the bare list serializes without newlines. Returns that <ul>. */
export function markFirstList(children: ElementContent[]): Element | undefined {
  const ul = children.find((c) => isElement(c) && c.tagName === 'ul') as Element | undefined;
  if (ul) {
    ul.properties = { ...ul.properties, className: ['ec-grid'] };
    ul.children = (ul.children as ElementContent[]).filter(
      (c) => !(c.type === 'text' && /^\s*$/.test(c.value)),
    );
  }
  return ul;
}

// Recurse into a node's children, transforming any nested primitive sections
// (a grid inside a card, panels inside a split). Nested primitives never carry the
// entrance stagger; only top-level ones do (stamped in the transformer below).
function transformChildren(children: ElementContent[], registry: ComponentRegistry): ElementContent[] {
  return children.map((c) => {
    if (isElement(c) && c.properties?.dataPrimitive) return transformNode(c, registry);
    if (isElement(c)) c.children = transformChildren(c.children as ElementContent[], registry);
    return c;
  });
}

// Read a stamped attribute back into its typed value. Booleans arrive as the strings
// 'true'/'false'; everything else is the literal string the author wrote.
function readAttributes(node: Element, def: ComponentDef): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const field of def.attributes ?? []) {
    const value = strProp(node, dataAttrProp(field.key));
    if (value == null) continue;
    out[field.key] = field.type === 'boolean' ? value === 'true' : value;
  }
  return out;
}

// The title label paragraph carries data-slot="title"; build() wants its inline children, not
// the marked paragraph. Return the paragraph's children.
function stripSlotMarker(child: ElementContent): ElementContent[] {
  return isElement(child) ? (child.children as ElementContent[]) : [child];
}

// Split a component's stamped children into named slots and the default body. A child marked
// data-slot="title"/<name> routes to that slot; an unmarked child is body. A repeatable slot
// wraps a <ul>, so its items are that list's <li> children, one child-list per item.
function partitionSlots(node: Element): {
  slot(name: string): ElementContent[];
  items(name: string): ElementContent[][];
} {
  const named = new Map<string, ElementContent[]>();
  const body: ElementContent[] = [];
  for (const child of node.children as ElementContent[]) {
    const slotName = isElement(child) ? strProp(child, 'dataSlot') : undefined;
    if (slotName === 'title') named.set('title', stripSlotMarker(child));
    else if (slotName) named.set(slotName, [child]);
    else body.push(child);
  }
  return {
    slot(name: string): ElementContent[] {
      if (name === 'body') return body;
      const wrap = named.get(name);
      if (!wrap) return [];
      // For title we stored the label's own children, so return them as-is. For a markdown or
      // inline named slot the wrapper <div> holds the rendered children; unwrap it.
      if (name === 'title') return wrap;
      const div = wrap[0];
      return isElement(div) ? (div.children as ElementContent[]) : wrap;
    },
    items(name: string): ElementContent[][] {
      const wrap = named.get(name);
      const div = wrap?.[0];
      if (!div || !isElement(div)) return [];
      const ul = (div.children as ElementContent[]).find((c) => isElement(c) && c.tagName === 'ul');
      if (!ul || !isElement(ul)) return [];
      return (ul.children as ElementContent[])
        .filter((li) => isElement(li) && li.tagName === 'li')
        .map((li) => (li as Element).children as ElementContent[]);
    },
  };
}

function transformNode(node: Element, registry: ComponentRegistry): Element {
  node.children = transformChildren(node.children as ElementContent[], registry);
  const name = strProp(node, 'dataPrimitive');
  const def = name ? registry.get(name) : undefined;
  if (!def) return node;
  const parts = partitionSlots(node);
  const ctx: ComponentContext = {
    attributes: readAttributes(node, def),
    slot: parts.slot,
    items: parts.items,
    node,
  };
  return def.build(ctx);
}

/** Rehype transformer: dispatch each stamped element through its registry `build`
 *  fn. When `stagger` is on, each top-level primitive gets a `data-rise` attribute
 *  carrying its document-order index (0, 1, 2, …); the site's CSS maps that ordinal
 *  to an entrance delay. The index is inert, so a consumer's sanitize floor can keep
 *  `data-rise` while dropping `style`. Nested primitives never get it. Non-primitive
 *  content (lede, intro paragraphs, the page-toc nav) passes through untouched. */
export function rehypeDispatch(registry: ComponentRegistry, stagger?: boolean) {
  return (tree: Root) => {
    let idx = 0;
    tree.children = (tree.children as ElementContent[]).map((child) => {
      if (isElement(child) && child.properties?.dataPrimitive) {
        const el = transformNode(child, registry);
        if (stagger) el.properties = { ...el.properties, dataRise: String(idx++) };
        return el;
      }
      if (isElement(child)) child.children = transformChildren(child.children as ElementContent[], registry);
      return child;
    });
  };
}
