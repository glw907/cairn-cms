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
 * The longest `fragment` value an `include.missing` record carries. A fragment id is author-typed
 *  document content with no bound, and the record's job is to name which include failed, not to
 *  reproduce the directive.
 */
const FRAGMENT_LOG_MAX = 160;

/**
 * A `FragmentResolve` carrying the optional markers the engine's own resolver builders stamp on
 *  it. `previewTitle` is the preview-only boundary cue's title lookup (the invisible-craft
 *  design's ratified 4B): EditPage's client-side resolver is the only caller that ever sets it,
 *  so `remarkResolveIncludes` wraps a splice only when the resolver it was handed carries it.
 *  `entry` names the containing entry for the `include.missing` diagnostic. Both ride the
 *  resolver rather than a render option because a site's own render forwards whichever resolver
 *  it received unchanged, so a marker survives the passthrough by reference.
 */
export interface MarkedFragmentResolve extends FragmentResolve {
  /** Looks up a fragment id's title for the boundary eyebrow. `undefined` falls back to the id. */
  previewTitle?: (id: string) => string | undefined;
  /** The entry whose body is being rendered, as `<concept>/<id>`. */
  entry?: string;
}

/** The classes the preview-only boundary cue carries; `preview-doc.ts` supplies their CSS. */
const BOUNDARY_CLASS = 'cairn-fragment-boundary';
const BOUNDARY_EYEBROW_CLASS = 'cairn-fragment-boundary-eyebrow';

/**
 * Wrap a resolved fragment's spliced blocks in the preview-only boundary cue: a quiet left
 *  hairline and a `From "<title>"` eyebrow, so an editor can tell which paragraphs an `::include`
 *  actually pulled in from elsewhere. Built only when the resolver carries `previewTitle`; the
 *  return type is cast because hast conversion runs off `data.hName`/`hProperties` alone; the
 *  literal `type` field only needs to satisfy `RootContent`'s discriminant, not a real node shape.
 */
function fragmentBoundaryNode(title: string, children: RootContent[]): RootContent {
  const eyebrow = {
    type: 'paragraph',
    data: { hName: 'p', hProperties: { className: [BOUNDARY_EYEBROW_CLASS] } },
    children: [{ type: 'text', value: `From “${title}”` }],
  };
  return {
    type: 'paragraph',
    data: { hName: 'div', hProperties: { className: [BOUNDARY_CLASS] } },
    children: [eyebrow, ...children],
  } as unknown as RootContent;
}

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
 * The notice for an `::include` with no `fragment` attribute at all, distinct from
 *  {@link missingFragmentNode}: there is no id to name, so the copy says so directly rather than
 *  trailing "Missing fragment: " off into nothing.
 */
function noFragmentNamedNode(): Paragraph {
  return {
    type: 'paragraph',
    data: { hName: 'p', hProperties: { className: [MISSING_CLASS] } },
    children: [{ type: 'text', value: "This include doesn't name a fragment." }],
  };
}

/**
 * Resolve `::include{fragment="<id>"}` leaf directives against the VFile's resolver, splicing the
 *  fragment's parsed body in place of the directive. With no resolver supplied every include
 *  directive is left untouched for the stamp step's literal-prose restore. A missing or empty
 *  `fragment` attribute, or a resolver miss, replaces the directive with a calm notice block and
 *  emits `include.missing` once, under the `reason` that separates the two faults. A resolver
 *  that throws propagates out of render, the build backstop for a dangling include.
 */
export function remarkResolveIncludes() {
  return (tree: Root, file: VFile): void => {
    const resolve = file.data[FRAGMENT_RESOLVE] as MarkedFragmentResolve | undefined;
    if (!resolve) return;
    // The containing entry, when the engine built this resolver. Spread into each record so a
    // site's own resolver, which carries no marker, simply omits the field.
    const entryField = resolve.entry !== undefined ? { entry: resolve.entry } : {};
    visit(tree, 'leafDirective', (node: LeafDirective, index, parent) => {
      if (node.name !== 'include' || !parent || index == null) return;
      const id = node.attributes?.fragment || undefined;
      if (!id) {
        log.warn('include.missing', { reason: 'empty_fragment', fragment: '', ...entryField });
        parent.children.splice(index, 1, noFragmentNamedNode());
        return [SKIP, index + 1];
      }
      const body = resolve(id); // may throw (build backstop); propagates out of render
      if (body == null) {
        log.warn('include.missing', {
          reason: 'not_found',
          fragment: id.slice(0, FRAGMENT_LOG_MAX),
          ...entryField,
        });
        parent.children.splice(index, 1, missingFragmentNode(id));
        return [SKIP, index + 1];
      }
      const spliced = parseFragmentBody(body).children as RootContent[];
      // resolve.previewTitle only exists on EditPage's client-side resolver, never on the
      // build-time createFragmentResolver, so this wrap is provably preview-only.
      const previewTitle = resolve.previewTitle;
      const wrapped = previewTitle
        ? [fragmentBoundaryNode(previewTitle(id) || id, spliced)]
        : spliced;
      parent.children.splice(index, 1, ...wrapped);
      return [SKIP, index + wrapped.length];
    });
  };
}
