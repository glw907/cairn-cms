import { defaultSchema, type Schema } from 'hast-util-sanitize';
import type { Root, Element } from 'hast';
import { visit } from 'unist-util-visit';
import { toString } from 'hast-util-to-string';
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
 * on anchors are admitted. figure/figcaption join the base so the engine's placed figure survives
 * the floor on every site, including one that supplies its own `sanitizeSchema` extension. A site
 * extends the result through `extend`, always starting from this safe base, so it can add to the
 * allowlist but not weaken the core strip.
 */
export function buildSanitizeSchema(
  registry: ComponentRegistry,
  extend?: (defaults: Schema) => Schema,
): Schema {
  const attrMarkers = registry.defs.flatMap((d) => Object.keys(d.attributes ?? {}).map((key) => dataAttrProp(key)));
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
    tagNames: [...(defaultSchema.tagNames ?? []), 'nav', 'details', 'summary', 'figure', 'figcaption'],
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
 * Force a `rel` value on every target="_blank" anchor, to prevent reverse-tabnabbing.
 * hast-util-sanitize runs no per-node hook, so this small transform carries the behavior the old
 * DOMPurify preview pass enforced, now on the delivered output as well. The value is the renderer's
 * `anchorRel` option (default `noopener noreferrer`); a site can override it or disable it entirely.
 */
export function rehypeAnchorRel(rel: string) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'a' && node.properties?.target === '_blank') {
        node.properties.rel = rel;
      }
    });
  };
}

/**
 * Give every GFM task-list checkbox an accessible name from its item text. remark-gfm emits a real
 * `<input type="checkbox" disabled>` with no label, which axe's `label` rule flags as a critical
 * violation even though the control is read-only; the visible label is the surrounding `<li>` text,
 * not associated programmatically. This sets `aria-label` on each task-list checkbox to its item's
 * text so the name travels with the control, keeping the engine's real disabled input (the bar's
 * non-color cue) while clearing the violation on every site. It must run after the sanitize floor,
 * which does not allow `aria-label`, so the attribute is added once the floor has run.
 */
export function rehypeTaskListA11y() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const className = node.properties?.className;
      const isTaskItem =
        node.tagName === 'li' && Array.isArray(className) && className.includes('task-list-item');
      if (!isTaskItem) return;
      const checkbox = node.children.find(
        (child): child is Element =>
          child.type === 'element' &&
          child.tagName === 'input' &&
          child.properties?.type === 'checkbox',
      );
      if (!checkbox) return;
      const label = toString(node).trim();
      // Only when there is text to name it; an empty item leaves the box unnamed rather than blank.
      if (label) (checkbox.properties ??= {})['ariaLabel'] = label;
    });
  };
}

// URL-bearing hast properties the post-dispatch guard scheme-checks. hast camelCases attribute
// names through property-information (srcset -> srcSet, xlink:href -> xLinkHref with a capital L,
// formaction -> formAction). data is the <object data> URL attribute; data-* attributes camelCase
// to dataFoo and are not matched here.
const URL_PROPS = new Set([
  'href',
  'src',
  'srcSet',
  'xLinkHref',
  'poster',
  'formAction',
  'action',
  'data',
  'background',
]);

// The safe URL schemes: the union of every protocol list in defaultSchema, plus cairn. The
// floor admits these and strips the rest, so deriving from the same source keeps the floor and
// this guard from drifting on what a safe scheme is. javascript:/data:/vbscript: are never in
// defaultSchema, so they are never safe.
const SAFE_SCHEMES: Set<string> = (() => {
  const protocols = defaultSchema.protocols ?? {};
  const schemes = new Set<string>(['cairn']);
  for (const list of Object.values(protocols)) {
    for (const scheme of list ?? []) schemes.add(String(scheme).toLowerCase());
  }
  return schemes;
})();

// Read a URL value's scheme for the safety check, defeating the whitespace and control-character
// tricks a browser ignores inside a scheme (java\tscript:, a leading space). A value with no
// scheme (relative, anchor, query) returns undefined and is always safe.
function urlScheme(value: string): string | undefined {
  const cleaned = value.replace(/[\x00-\x20]+/g, '');
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned);
  return match ? match[1].toLowerCase() : undefined;
}

function isSafeUrl(value: string): boolean {
  const scheme = urlScheme(value);
  return scheme === undefined || SAFE_SCHEMES.has(scheme);
}

// srcset is "url descriptor, url descriptor, …". hast may store it as a string or, because
// property-information marks it comma-separated, as a string array. One unsafe candidate makes
// the whole attribute unsafe.
function isSafeSrcset(value: unknown): boolean {
  const candidates = Array.isArray(value)
    ? value.map(String)
    : typeof value === 'string'
      ? value.split(',')
      : [];
  return candidates.every((candidate) => {
    const url = candidate.trim().split(/\s+/)[0];
    return url === '' || isSafeUrl(url);
  });
}

// Decide whether one URL-bearing property value is safe to keep. srcset has its own
// multi-candidate grammar. A non-string value carries no scheme to abuse, so the floor's own
// handling stands and the guard leaves it alone.
function isSafeUrlProp(key: string, value: unknown): boolean {
  if (key === 'srcSet') return isSafeSrcset(value);
  if (typeof value !== 'string') return true;
  return isSafeUrl(value);
}

/**
 * Post-dispatch safety floor over the fully-built tree. The pre-dispatch rehype-sanitize floor
 * cleans author content, but a component build() runs after it and can route a raw author
 * attribute value into a sink. This guard runs last and neutralizes those sinks on every element
 * no matter which plugin or which build() produced it: an unsafe URL scheme in a URL-bearing
 * attribute, an inline on* event handler, or an inline style (stripped wholesale, matching the
 * floor and cairn's class-driven styling). It is gated by the same unsafeDisableSanitize switch as
 * the floor.
 *
 * The guard's boundary is the URL scheme check plus the on* and style strip. It does not remove a
 * build()-emitted raw script, style, or iframe srcdoc element node. A build() that emits those is
 * running site-developer code, and author markdown is cleaned by the pre-dispatch floor.
 */
export function rehypeSinkGuard() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const props = node.properties;
      if (!props) return;
      for (const key of Object.keys(props)) {
        if (/^on/i.test(key) || key === 'style') {
          delete props[key];
          continue;
        }
        if (!URL_PROPS.has(key)) continue;
        if (!isSafeUrlProp(key, props[key])) delete props[key];
      }
    });
  };
}
