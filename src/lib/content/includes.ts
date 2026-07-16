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
