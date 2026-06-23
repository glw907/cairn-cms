// cairn-cms: the cairn: link resolver, an mdast step in the render pipeline (content-graph design).
// It runs before remark-rehype, so the rewritten href passes through the sanitize floor exactly as
// any other anchor. The per-call resolver is read off the VFile (set by renderMarkdown), so the
// processor is still built once. A miss either marks the link broken (preview) or throws (build),
// decided by the injected resolver.
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import { parseCairnToken, type LinkResolve } from '../content/links.js';

/** The VFile data key the renderer sets the per-call resolver under. */
export const CAIRN_RESOLVE = 'cairnResolve';

interface LinkNode {
  url: string;
  data?: { hProperties?: Record<string, unknown> };
}

/**
 * Resolve cairn: link nodes against the VFile's resolver. A non-cairn href and a malformed token
 *  pass through. A missing target is marked with the cairn-broken-link class (the resolver returns
 *  undefined) or, when the resolver throws, the error propagates and fails the build.
 */
export function remarkResolveCairnLinks() {
  return (tree: unknown, file: VFile): void => {
    const resolve = file.data[CAIRN_RESOLVE] as LinkResolve | undefined;
    if (!resolve) return;
    visit(tree as Parameters<typeof visit>[0], 'link', (node: LinkNode) => {
      const ref = parseCairnToken(node.url);
      if (!ref) return;
      const url = resolve(ref); // may throw (build backstop); propagates out of render
      if (url) {
        node.url = url;
        return;
      }
      // Missing target in the preview: mark it broken and neutralize the href, keeping the text.
      node.url = '#';
      node.data = node.data ?? {};
      const props = (node.data.hProperties = node.data.hProperties ?? {});
      const existing = Array.isArray(props.className) ? (props.className as string[]) : [];
      props.className = [...existing, 'cairn-broken-link'];
      props.title = 'Broken internal link';
    });
  };
}
