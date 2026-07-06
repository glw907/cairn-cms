import { visit, SKIP } from 'unist-util-visit';
import { toString } from 'hast-util-to-string';
import type { Root, Element } from 'hast';

// A markdown table renders as a bare `<table>` with no wrapper. `.prose table { display: block;
// overflow-x: auto }` alone made a narrow viewport scroll a wide table instead of squeezing its
// columns, but it also strips the table's row/cell display roles from the accessibility tree (a
// `display: block` table is no longer exposed as a table to a screen reader, in every current
// engine). The standard fix keeps the table a real table and scrolls a wrapper around it instead.
// Two sites independently rediscovered this gap and wrote the identical rehype step at their own
// boundary, so the engine now ships it as the pipeline's default.

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
 *  reach the horizontal scroll. Runs over the fully built tree, so it wraps a component's own
 *  table output the same as an author's markdown table.
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
