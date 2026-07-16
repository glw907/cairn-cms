// cairn-cms: the ::include directive extractor. A body's include ids are the main side of the
// fragments where-used index that inboundIncludes reads, mirroring extractCairnLinks/inboundLinks.
// The pipeline adds remark-directive, unlike extractCairnLinks's bare remark-parse + remark-gfm:
// without it a leaf directive parses as literal text, leaving no node to visit. This module reads
// the grammar for the content graph; the render pipeline resolves the same directive separately
// (resolve-include.ts).
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import type { LeafDirective } from 'mdast-util-directive';

/**
 * The fragment ids a markdown body includes via `::include{fragment="<id>"}`, in first-occurrence
 *  order, deduped. Parses the body as mdast, so an include token inside a code span or fence is
 *  never matched. Only a `leafDirective` named `include` counts: a container or text directive of
 *  the same name contributes nothing, as does a missing or empty `fragment` attribute.
 */
export function extractIncludes(body: string): string[] {
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(body) as Root;
  const seen = new Set<string>();
  const ids: string[] = [];
  visit(tree, 'leafDirective', (node: LeafDirective) => {
    if (node.name !== 'include') return;
    const id = node.attributes?.fragment;
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  });
  return ids;
}

/**
 * The `fragment` attribute's source run, in any form the directive grammar accepts:
 *  double-quoted, single-quoted, or bare. The value is not matched against the target id here,
 *  since the caller has already confirmed the parsed node's attribute IS the target; this only
 *  has to find the run's extent within one directive's source span.
 */
const FRAGMENT_ATTR = /\bfragment\s*=\s*(?:"[^"]*"|'[^']*'|[^\s}]+)/;

/**
 * Rewrite every `::include{fragment="<oldId>"}` directive so its `fragment` attribute becomes
 * `newId`, keeping the rest of the directive (any other attribute, its spacing) byte-for-byte.
 * Rename calls this to repoint an inbound include when its target fragment moves, mirroring
 * rewriteCairnLink for body `cairn:` links. Parsed with the same directive-aware pipeline as
 * extractIncludes, so a token inside a code span is never a directive node and is never touched.
 * Each matching node's source span is rewritten from last to first, replacing only the `fragment`
 * attribute run so any other attribute stays exact.
 *
 * The rewrite normalizes the attribute to the double-quoted form, since matching only that form
 * would silently no-op on a hand-typed bare or single-quoted attribute that extractIncludes
 * accepts. A silent no-op here strands the body on the old id while the manifest row re-derives
 * from that same body, so the rename would land a dangling include and break the next build.
 */
export function rewriteIncludeDirective(doc: string, oldId: string, newId: string): string {
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(doc) as Root;
  const spans: { start: number; end: number }[] = [];
  visit(tree, 'leafDirective', (node: LeafDirective) => {
    if (node.name !== 'include' || node.attributes?.fragment !== oldId) return;
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (start == null || end == null) return;
    spans.push({ start, end });
  });
  spans.sort((a, b) => b.start - a.start);
  let out = doc;
  for (const span of spans) {
    const src = out.slice(span.start, span.end);
    const rewritten = src.replace(FRAGMENT_ATTR, `fragment="${newId}"`);
    out = out.slice(0, span.start) + rewritten + out.slice(span.end);
  }
  return out;
}
