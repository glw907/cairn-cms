import { defaultSchema, type Schema } from 'hast-util-sanitize';
import type { Root, Element } from 'hast';
import { visit } from 'unist-util-visit';
import { dataAttrProp, type ComponentRegistry } from './registry.js';

// The fixed directive markers the stamp writes and the dispatch reads. They are inert data
// attributes, never a script vector, and must survive the floor so the dispatch still runs.
const FIXED_MARKERS = ['dataPrimitive', 'dataSlot', 'dataRole', 'dataRise'];

/**
 * Build the delivery sanitize schema. Starts from hast-util-sanitize's defaultSchema, the
 * GitHub-lineage allowlist that strips scripts, inline event handlers, and javascript:/data: URLs,
 * then adds exactly what cairn's render needs. The directive markers (the fixed ones plus the
 * dataAttr<Key> markers derived from the registry) survive so the dispatch reads its stamps after
 * the floor. The benign author tags real content uses (nav, details, summary) and class/target/rel
 * on anchors are admitted. A site extends the result through `extend`, always starting from this
 * safe base, so it can add to the allowlist but not weaken the core strip.
 */
export function buildSanitizeSchema(
  registry: ComponentRegistry,
  extend?: (defaults: Schema) => Schema,
): Schema {
  const attrMarkers = registry.defs.flatMap((d) => (d.attributes ?? []).map((a) => dataAttrProp(a.key)));
  const markers = [...FIXED_MARKERS, ...attrMarkers];
  const attributes = defaultSchema.attributes ?? {};
  // defaultSchema's `a` entry carries a className tuple (`['className', 'data-footnote-backref']`)
  // that restricts a link's class to that one value. A per-tag tuple wins over a bare `*` entry, so
  // it would strip an author's link class. Drop that tuple before admitting a free-form `className`.
  const anchorAttrs = (attributes.a ?? []).filter(
    (entry) => !(Array.isArray(entry) && entry[0] === 'className'),
  );
  // Admit the inert `cairn:` href scheme on top of the default protocol allowlist. The render
  // resolver rewrites a `cairn:` link to a live permalink before delivery; an unresolved one
  // survives the floor in its inert token form (a visible unresolved-link signal), never as an
  // executable vector. The dangerous-protocol strip (javascript:, data:) is preserved.
  const protocols = defaultSchema.protocols ?? {};
  const schema: Schema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames ?? []), 'nav', 'details', 'summary'],
    attributes: {
      ...attributes,
      '*': [...(attributes['*'] ?? []), 'className', ...markers],
      a: [...anchorAttrs, 'className', 'target', 'rel'],
    },
    protocols: {
      ...protocols,
      href: [...(protocols.href ?? []), 'cairn'],
    },
  };
  return extend ? extend(schema) : schema;
}

/**
 * Force rel="noopener noreferrer" on every target="_blank" anchor, to prevent reverse-tabnabbing.
 * hast-util-sanitize runs no per-node hook, so this small transform carries the behavior the old
 * DOMPurify preview pass enforced, now on the delivered output as well.
 */
export function rehypeAnchorRel() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'a' && node.properties?.target === '_blank') {
        node.properties.rel = 'noopener noreferrer';
      }
    });
  };
}
