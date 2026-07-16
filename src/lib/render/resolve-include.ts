// cairn-cms: the ::include fragment resolver, an mdast step in the render pipeline (the fragments
// design). It runs first in the remark plugin array, immediately after remark-directive and before
// remarkDirectiveStamp, which unconditionally restores every leaf/text directive to literal prose
// (remark-directives.ts:109-120). It is therefore the only step that ever sees the include directive
// as a real node; every other leaf directive falls through to that restore untouched. A resolved
// fragment's raw markdown is parsed with the same directive-aware pipeline (remark-parse + remark-gfm
// + remark-directive) that media-rewrite.ts's parseFigureDoc uses, and its block nodes splice in
// place of the directive, so the fragment's own markup (a registered component, a cairn: link, a
// media: token) flows through the identical downstream chain (stamp, link/media resolution,
// remark-rehype, the sanitize floor, dispatch) that a native entry does.
//
// Resolution is one pass only, the defense-in-depth backstop for the engine's save-time nesting
// rejection: a nested ::include inside a spliced fragment body is never revisited by this same
// traversal. unist-util-visit walks a parent's children by index, and replacing one node with N
// nodes leaves those N nodes as ordinary next siblings the traversal would otherwise continue into
// (see the visitor-result docs in unist-util-visit-parents: "adding ... next siblings of node is
// handled as expected without needing to return a new Index", which is exactly the behavior this
// plugin does NOT want). Returning `[SKIP, index + spliced.length]` jumps the parent's iteration
// straight past the whole spliced range, so nothing inside it, at any depth, is ever visited by this
// plugin's own traversal.
import type { Paragraph, Root, RootContent } from 'mdast';
import type { LeafDirective } from 'mdast-util-directive';
import { visit, SKIP } from 'unist-util-visit';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import type { VFile } from 'vfile';
import { log } from '../log/index.js';

/** The VFile data key the renderer sets the per-call fragment resolver under. */
export const FRAGMENT_RESOLVE = 'fragmentResolve';

/**
 * Resolve a fragment id to its raw markdown body. `undefined` is a preview miss (the plugin
 *  replaces the include directive with a notice node); a resolver that throws is the build
 *  backstop, exactly like `LinkResolve` and `MediaResolve`.
 */
export type FragmentResolve = (id: string) => string | undefined;

/** The class the missing-fragment notice carries, so the admin preview can style it and an e2e test can assert it. */
const MISSING_CLASS = 'cairn-include-missing';

/**
 * Parse a fragment body with the directive extension, so its own directive markup survives as real
 *  nodes rather than literal text. Mirrors parseFigureDoc in media-rewrite.ts.
 */
function parseFragmentBody(markdown: string): Root {
  return unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(markdown) as Root;
}

/** The calm, id-naming notice block a missing fragment renders in place of the directive. */
function missingFragmentNode(id: string): Paragraph {
  return {
    type: 'paragraph',
    data: { hName: 'p', hProperties: { className: [MISSING_CLASS] } },
    children: [{ type: 'text', value: `Missing fragment: ${id}` }],
  };
}

/**
 * Resolve `::include{fragment="<id>"}` leaf directives against the VFile's resolver, splicing the
 *  fragment's parsed body in place of the directive. With no resolver supplied every include
 *  directive is left untouched for the stamp step's literal-prose restore. A missing or empty
 *  `fragment` attribute, or a resolver miss, replaces the directive with a calm notice block and
 *  emits `include.missing` once. A resolver that throws propagates out of render, the build
 *  backstop for a dangling include.
 */
export function remarkResolveIncludes() {
  return (tree: Root, file: VFile): void => {
    const resolve = file.data[FRAGMENT_RESOLVE] as FragmentResolve | undefined;
    if (!resolve) return;
    visit(tree, 'leafDirective', (node: LeafDirective, index, parent) => {
      if (node.name !== 'include' || !parent || index == null) return;
      const id = node.attributes?.fragment || undefined;
      if (!id) {
        log.warn('include.missing', { fragment: '' });
        parent.children.splice(index, 1, missingFragmentNode(''));
        return [SKIP, index + 1];
      }
      const body = resolve(id); // may throw (build backstop); propagates out of render
      if (body == null) {
        log.warn('include.missing', { fragment: id });
        parent.children.splice(index, 1, missingFragmentNode(id));
        return [SKIP, index + 1];
      }
      const spliced = parseFragmentBody(body).children as RootContent[];
      parent.children.splice(index, 1, ...spliced);
      return [SKIP, index + spliced.length];
    });
  };
}
