import type { Root, Element, ElementContent } from 'hast';
import { h } from 'hastscript';
import type { ComponentRegistry } from './registry.js';

export function isElement(node: ElementContent | undefined): node is Element {
  return !!node && node.type === 'element';
}

// hast Properties values are PropertyValue (string | number | boolean | array | null).
// Directive markers (dataIcon/dataRole/dataPrimitive) are always stamped as strings;
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

// Pull the section's <h2> out, retag it .card-title, and build the .ec-head row
// (optional icon + heading). Returns the head plus the remaining body children.
// `makeIcon` (site-supplied) turns the stamped data-icon into an element; omit it
// for a head with no icon.
export function splitHead(node: Element, makeIcon?: MakeIcon): { head: Element; rest: ElementContent[] } {
  const children = node.children as ElementContent[];
  const i = children.findIndex((c) => isElement(c) && c.tagName === 'h2');
  const h2 = children[i] as Element;
  h2.properties = { ...h2.properties, className: ['card-title'] };
  const rest = children.filter((_, j) => j !== i);
  const icon = strProp(node, 'dataIcon');
  const role = strProp(node, 'dataRole');
  const headKids: ElementContent[] = [];
  if (makeIcon && icon) headKids.push(makeIcon(icon, role));
  headKids.push(h2);
  return { head: h('div', { className: ['ec-head'] }, headKids), rest };
}

/** Section wrapper: `<section class=…><div class="card-body">…</div></section>`. */
export function cardShell(classes: string[], body: ElementContent[]): Element {
  return h('section', { className: classes }, [h('div', { className: ['card-body'] }, body)]);
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

function transformNode(node: Element, registry: ComponentRegistry): Element {
  node.children = transformChildren(node.children as ElementContent[], registry);
  const name = strProp(node, 'dataPrimitive');
  const def = name ? registry.get(name) : undefined;
  return def ? def.build(node) : node;
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
