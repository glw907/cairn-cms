// cairn-audit's field-edge-alignment rule: the staircase detector, the
// mechanical half of finding 3. Within a grid or flex-column container, two or more form controls
// (`.input`, `.select`, `.textarea`) that render in the same visual column must share a left edge,
// within 1.5px. The motivating shape is a consumer-site harvest's own corpus finding: an
// `inline`-register field (`FieldLabel`'s label-beside-control layout, `FieldLabel.svelte`) whose
// label text varies row to row pushes each row's control to a different left edge, since the
// label's own width is what the control's start position rides on. `register="stacked"` (the
// default) cannot produce this shape at all, since a stacked control always starts at
// its own container's edge; this rule is what catches a developer reaching for `inline` in a
// multi-column composition where the staircase reappears.
//
// GROUPING. A control's group is keyed by its NEAREST ancestor that is itself a CSS grid or a
// flex-column box (`display: grid`/`inline-grid`, or `flex`/`inline-flex` with `flex-direction:
// column`). An `inline`-register field's own wrapper is a flex ROW (`FieldLabel.svelte`'s `flex
// items-center gap-1.5`), so the walk passes through it to the grid or list container above, and
// two inline fields under that same container land in the same group. A `stacked`-register field's
// wrapper IS itself a flex-column box, so the walk stops there: that field's control is grouped
// alone, with no sibling to compare against, which is correct rather than an omission, since a
// stacked control's left edge is fixed by construction and cannot stagger.
//
// COLUMN CLUSTERING. A group can hold controls from several real grid columns (an office form's
// whole two-column grid, say), and this rule must not compare a column-1 control's left edge
// against a column-2 control's, which would report every ordinary two-column form as broken. Within
// a group, controls are clustered by LEFT-EDGE PROXIMITY, not whole-rect overlap: sort the group's
// controls by left edge, then start a new column whenever the gap to the previous control's left
// edge exceeds `CLUSTER_GAP_PX`. Rect overlap was the original design and it has a bridging defect:
// a `col-span-2` control's rect stretches across two real columns, so it horizontally overlaps a
// column-1 control's range AND a column-2 control's range, and transitive clustering ("share a
// column with anything I overlap") chains the two real columns into one, comparing controls that
// were never meant to align. Left-edge proximity only ever asks whether two edges are close to each
// other, so a spanning control's own left edge (wherever its column starts) clusters with that
// column alone, however far its rect reaches to the right.
//
// Advisory: "same column" is a heuristic over arbitrary layouts, not a DOM contract cairn's own
// components declare, and a legitimately narrower control deliberately placed off-grid (a compact
// inline filter beside a wider stacked field, say) is a real composition this rule cannot tell from
// a defect.
import { ensurePageHelpers } from '../../rendered.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/** The floor a control's left edge may trail its column's leftmost sibling by and still pass. */
const TOLERANCE_PX = 1.5;

/** One control whose left edge trails its column's leftmost sibling by more than the tolerance. */
interface EdgeMismatch {
  selector: string;
  containerSelector: string;
  leftPx: number;
  columnLeftPx: number;
}

/**
 * Every form control whose left edge disagrees with its column's leftmost sibling, grouped by
 * nearest grid/flex-column ancestor and clustered by left-edge proximity. Playwright serializes
 * this into the page, so it stays self-contained: every helper is nested and the tolerance arrives
 * through `args`.
 */
function findFieldEdgeMismatches(args: { tolerancePx: number }): EdgeMismatch[] {
  const { tolerancePx } = args;
  const CONTROL_SELECTOR = '.input, .select, .textarea';
  // The floor a gap between two sorted left edges may reach and still cluster as the same column.
  // 80px comfortably clears the corpus staircase shape (a ~50px stagger from label-width variance)
  // while staying far short of a real grid column's own width plus gutter (hundreds of pixels).
  const CLUSTER_GAP_PX = 80;
  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());
  const isVisible = (el: Element) => (helpers ? helpers.isVisible(el) : true);

  function isColumnContainer(el: Element): boolean {
    const style = getComputedStyle(el);
    if (style.display === 'grid' || style.display === 'inline-grid') return true;
    return (style.display === 'flex' || style.display === 'inline-flex') && style.flexDirection === 'column';
  }

  /** The nearest ancestor that is itself a grid or flex-column box, or null past the document root. */
  function nearestColumnContainer(el: Element): Element | null {
    for (let node = el.parentElement; node; node = node.parentElement) {
      if (isColumnContainer(node)) return node;
    }
    return null;
  }

  const byContainer = new Map<Element, Element[]>();
  for (const control of document.querySelectorAll(CONTROL_SELECTOR)) {
    if (!isVisible(control)) continue;
    const container = nearestColumnContainer(control);
    if (!container) continue;
    const list = byContainer.get(container) ?? [];
    list.push(control);
    byContainer.set(container, list);
  }

  const findings: EdgeMismatch[] = [];
  for (const [container, controls] of byContainer) {
    if (controls.length < 2) continue;
    const items = controls
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .sort((a, b) => a.rect.left - b.rect.left);
    // Cluster into columns by left-edge proximity along the sorted sequence: a new column starts
    // whenever the gap to the previous edge exceeds the threshold.
    const columns: { el: Element; rect: DOMRect }[][] = [];
    for (const item of items) {
      const current = columns[columns.length - 1];
      const previous = current?.[current.length - 1];
      if (previous && item.rect.left - previous.rect.left <= CLUSTER_GAP_PX) {
        current.push(item);
      } else {
        columns.push([item]);
      }
    }
    for (const column of columns) {
      if (column.length < 2) continue;
      const columnLeft = Math.min(...column.map((member) => member.rect.left));
      for (const member of column) {
        const delta = member.rect.left - columnLeft;
        if (delta <= tolerancePx) continue;
        findings.push({
          selector: signature(member.el),
          containerSelector: signature(container),
          leftPx: Math.round(member.rect.left),
          columnLeftPx: Math.round(columnLeft),
        });
      }
    }
  }
  return findings;
}

export const fieldEdgeAlignment: RenderedRule = {
  id: 'field-edge-alignment',
  tier: 'advisory',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ensurePageHelpers(ctx.page);
    const mismatches = await ctx.page.evaluate(findFieldEdgeMismatches, { tolerancePx: TOLERANCE_PX });
    return mismatches.map((mismatch) => ({
      ruleId: 'field-edge-alignment',
      tier: 'advisory' as const,
      selector: mismatch.selector,
      message:
        `renders its left edge at ${mismatch.leftPx}px, ${mismatch.leftPx - mismatch.columnLeftPx}px right of ` +
        `its column's leftmost control (${mismatch.columnLeftPx}px) inside ${mismatch.containerSelector}. A ` +
        `staggered left edge is the staircase an inline label of varying width produces; switch the field to ` +
        `register="stacked" (docs/reference/admin-toolkit.md), the register that cannot stagger.`,
    }));
  },
};
