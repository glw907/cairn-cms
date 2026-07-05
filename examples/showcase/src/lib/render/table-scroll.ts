// The showcase's own post-processing rehype step, run after the engine's renderMarkdown. cairn's
// public createRenderer keeps its internal remark/rehype plugin ordering closed (rehypeDispatch and
// the sanitize floor are engine-internal for safety), so a site adds its own render behavior at the
// boundary: over the HTML string createRenderer already returned, not inside the engine's pipeline.
//
// A markdown table renders as a bare `<table>` with no wrapper. `.prose table { display: block;
// overflow-x: auto }` alone made a narrow viewport scroll a wide table instead of squeezing its
// columns, but it also strips the table's row/cell display roles from the accessibility tree (a
// `display: block` table is no longer exposed as a table to a screen reader, in every current
// engine). The standard fix keeps the table a real table and scrolls a wrapper around it instead.
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { visit, SKIP } from 'unist-util-visit';
import { toString } from 'hast-util-to-string';
import type { Root, Element } from 'hast';

/** Find the first table row that carries a header cell, `<thead>` or not. */
function findHeaderRow(table: Element): Element | undefined {
  let found: Element | undefined;
  visit(table, 'element', (node: Element) => {
    if (found) return SKIP;
    const hasHeaderCell = node.children.some(
      (child) => child.type === 'element' && child.tagName === 'th',
    );
    if (node.tagName === 'tr' && hasHeaderCell) {
      found = node;
      return SKIP;
    }
  });
  return found;
}

/** Name a table from its header row's cell text, falling back to a generic label. */
function tableLabel(table: Element): string {
  const headerRow = findHeaderRow(table);
  if (!headerRow) return 'Table';
  const headers = headerRow.children
    .filter((child): child is Element => child.type === 'element' && child.tagName === 'th')
    .map((cell) => toString(cell).trim())
    .filter((text) => text !== '');
  return headers.length > 0 ? `Table: ${headers.join(', ')}` : 'Table';
}

/**
 * Wrap every table in a labeled, keyboard-reachable scroll region. The table itself keeps
 *  `display: table` (prose.css), so it stays a real table in the accessibility tree; only the
 *  wrapper scrolls (WCAG 1.3.1). `role="region"` plus an `aria-label` names the region, and
 *  `tabIndex: 0` puts it in the tab order so a keyboard user who cannot use a trackpad can still
 *  reach the horizontal scroll (the same pattern the reading surface's code blocks would need if
 *  they ever grew wider than their own line-wrap).
 */
export function rehypeTableScroll() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === undefined) return;
      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['table-scroll'],
          role: 'region',
          tabIndex: 0,
          ariaLabel: tableLabel(node),
        },
        children: [node],
      };
      parent.children[index] = wrapper;
      // SKIP alone (not `[SKIP, index]`): the wrapper now sits at this same index, and re-stating
      // the unchanged index here would tell the traversal to revisit that slot, descend into the
      // wrapper (SKIP only covers the node just visited, the original table), and rewrap it
      // forever. Plain SKIP lets the walk advance past this index normally.
      return SKIP;
    });
  };
}

const processor = unified().use(rehypeParse, { fragment: true }).use(rehypeTableScroll).use(rehypeStringify);

/**
 * Post-process rendered HTML so every table sits inside a scrollable, labeled region. Called from
 *  the site's `rendering.render` after `renderMarkdown`, so it applies to the public build, the
 *  feed, and the editor preview alike, the three callers of the one render function.
 */
export async function wrapScrollableTables(html: string): Promise<string> {
  const file = await processor.process(html);
  return String(file);
}
