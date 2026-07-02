// cairn-cms: the shared preview-miss marking for the cairn: link and media: image resolvers
// (resolve-links.ts, resolve-media.ts). Both mark a missing target the same way: neutralize the
// href/src to `#` and append a broken-reference className plus a descriptive title to the node's
// hProperties, so a miss renders inertly instead of a dead link or a 404 image.

/** A link or image mdast node carrying the hProperties a resolver marks a broken reference on. */
export interface ResolvableNode {
  url: string;
  data?: { hProperties?: Record<string, unknown> };
}

/**
 * Mark a node's target broken: neutralize its href/src to `#` and append className to its
 *  hProperties className list alongside title.
 */
export function markNodeBroken(node: ResolvableNode, className: string, title: string): void {
  node.url = '#';
  node.data = node.data ?? {};
  const props = (node.data.hProperties = node.data.hProperties ?? {});
  const existing = Array.isArray(props.className) ? (props.className as string[]) : [];
  props.className = [...existing, className];
  props.title = title;
}
