// cairn-cms: the figure render step, an mdast step in the shared render pipeline. It rewrites the
// cairn-reserved `figure` container directive into a <figure><img><figcaption> structure. The
// directive wraps a real media image (`![alt](media:slug.hash)`), so the image stays a child node
// and remarkResolveMedia resolves it untouched, exactly as a bare inline image. The caption is the
// directive's body text, and the placement role rides the directive's class attribute as a value
// from a closed set. This step runs before remarkResolveMedia and before remark-rehype flattens the
// tree. It is engine-internal and reserved, the sibling of resolveMedia and resolveLinks, exported
// from no public subpath. A site cannot register a component named `figure`, so it cannot shadow it.
import type { Root, Paragraph, PhrasingContent } from 'mdast';
import type { ContainerDirective } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';
import { parseMediaToken } from '../media/reference.js';

// The directive's children are block content. The unwrap lifts the media image to a direct child of
// the figure, which is a phrasing node in block position: legal in the rendered <figure> and handled
// by mdast-util-to-hast, but outside mdast's block-content union. This alias names that child slot.
type FigureChild = ContainerDirective['children'][number];

/** The closed placement role set. A class outside this set is ignored, never passed through. */
const ROLES = new Set(['center', 'wide', 'full']);

// mdast-util-to-hast reads hName/hProperties off node.data to override the element. The shipped
// mdast Data type does not carry them, so this mirrors the local cast idiom in remark-directives.ts.
interface HastData {
  hName?: string;
  hProperties?: Record<string, unknown>;
}

function setData(node: { data?: unknown }, patch: HastData): void {
  const data = (node.data ?? (node.data = {})) as HastData;
  Object.assign(data, patch);
}

// A node whose subtree carries non-whitespace text is a caption candidate.
function hasText(node: FigureChild): boolean {
  let found = false;
  visit(node, 'text', (text) => {
    if (text.value.trim() !== '') found = true;
  });
  return found;
}

// Find the first descendant image node whose url is a media: reference, with its enclosing direct
// child of the directive (the paragraph holding it) and that child's index.
function findMediaImage(
  directive: ContainerDirective,
): { image: PhrasingContent; childIndex: number } | null {
  for (let i = 0; i < directive.children.length; i++) {
    const child = directive.children[i];
    if (child.type !== 'paragraph') continue;
    const image = child.children.find(
      (n) => n.type === 'image' && parseMediaToken(n.url) !== null,
    );
    if (image) return { image, childIndex: i };
  }
  return null;
}

// Strip a leading newline or all-whitespace prefix from the first phrasing child, so a caption
// split off the image line reads cleanly without a stray softbreak.
function trimLeadingNewline(children: PhrasingContent[]): PhrasingContent[] {
  if (children.length === 0) return children;
  const [first, ...rest] = children;
  if (first.type === 'text') {
    const trimmed = first.value.replace(/^\s+/, '');
    if (trimmed === '') return rest;
    return [{ ...first, value: trimmed }, ...rest];
  }
  return children;
}

/**
 * Rewrite the reserved `figure` container directive into a placed <figure>. Every other directive
 *  is left to remarkDirectiveStamp, which already skips unregistered names.
 */
export function remarkFigure() {
  return (tree: Root): void => {
    visit(tree, 'containerDirective', (node: ContainerDirective) => {
      if (node.name !== 'figure') return;

      // The role rides the class attribute, kept only when it is exactly one closed-set value.
      const className = node.attributes?.class ?? undefined;
      const role = className && ROLES.has(className) ? className : undefined;
      setData(node, {
        hName: 'figure',
        ...(role ? { hProperties: { className: ['cairn-place-' + role] } } : {}),
      });

      const found = findMediaImage(node);
      // A figure with no media image is a degraded authoring state: leave its children, invent no
      // image, never throw. The hName is already set, so it still renders as a <figure>.
      if (!found) return;

      const { image, childIndex } = found;
      const paragraph = node.children[childIndex] as Paragraph;

      // The image lifts into block position (the unwrap), so it carries the FigureChild slot type.
      const imageChild = image as FigureChild;

      // Unwrap the image to a direct child of the directive, handling both paragraph forms.
      let captionNode: FigureChild | undefined;
      if (paragraph.children.length === 1) {
        // Blank-line form: the image is alone in its paragraph. The bare image replaces it; a
        // separate following text-bearing paragraph is the caption.
        node.children.splice(childIndex, 1, imageChild);
      } else {
        // No-blank-line form: the image and the caption share one paragraph. Split it into the bare
        // image followed by a paragraph holding the remaining children as the caption.
        const imageIndex = paragraph.children.indexOf(image);
        const rest = trimLeadingNewline(paragraph.children.slice(imageIndex + 1));
        const replacement: FigureChild[] = [imageChild];
        if (rest.length > 0) {
          const captionParagraph: Paragraph = { type: 'paragraph', children: rest };
          replacement.push(captionParagraph);
          captionNode = captionParagraph;
        }
        node.children.splice(childIndex, 1, ...replacement);
      }

      // The caption is the first text-bearing block after the image. In the split case it is the
      // paragraph just appended; otherwise scan the blocks following the image.
      const imagePos = node.children.indexOf(imageChild);
      if (!captionNode) {
        for (let i = imagePos + 1; i < node.children.length; i++) {
          if (hasText(node.children[i])) {
            captionNode = node.children[i];
            break;
          }
        }
      }
      if (captionNode) setData(captionNode, { hName: 'figcaption' });
    });
  };
}
