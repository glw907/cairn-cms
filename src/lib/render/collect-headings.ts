// cairn-cms: the heading-collection rehype step behind renderDocument. It reads no injected
// resolver (unlike resolve-links.ts and resolve-media.ts); it only writes, following the same
// symbol-keyed file.data pattern in the other direction so renderDocument can read the collected
// list back off the VFile after the processor finishes.
import { visit } from 'unist-util-visit';
import { toString } from 'hast-util-to-string';
import type { Root, Element } from 'hast';
import type { VFile } from 'vfile';

/** The VFile data key `renderDocument` reads the collected heading list off. */
export const DOC_HEADINGS = 'docHeadings';

/**
 * One heading collected from a rendered document, in document order. `id` is whatever id the
 *  final rehype tree carries (rehypeSlug's stamp, or a site rehypePlugins rewrite of it); `text`
 *  is the heading's flattened plain text, with inline code, emphasis, and links reduced to their
 *  text content.
 */
export interface DocHeading {
  /** The heading's id. */
  id: string;
  /** The heading's flattened plain text. */
  text: string;
  /** The heading level, 1 through 6. */
  depth: number;
}

const HEADING_DEPTH: Record<string, number> = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };

/**
 * Collect every h1-h6 in the tree, in document order, into the VFile's `DOC_HEADINGS` data slot.
 *  Must run last in the rehype pipeline (after `rehypeSlug` and any site `rehypePlugins`), so an
 *  id a later step assigns or rewrites is the id collected.
 */
export function rehypeCollectHeadings() {
  return (tree: Root, file: VFile): void => {
    const headings: DocHeading[] = [];
    visit(tree, 'element', (node: Element) => {
      const depth = HEADING_DEPTH[node.tagName];
      if (!depth) return;
      const id = typeof node.properties?.id === 'string' ? node.properties.id : '';
      headings.push({ id, text: toString(node), depth });
    });
    file.data[DOC_HEADINGS] = headings;
  };
}
