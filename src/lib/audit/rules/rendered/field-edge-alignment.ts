// cairn-audit's field-edge-alignment rule: the staircase detector (design ratchet Task 5, the
// mechanical half of finding 3). Within a grid or flex-column container, two or more form controls
// (`.input`, `.select`, `.textarea`) that render in the same visual column must share a left edge,
// within 1.5px. The motivating shape is the ASC Assets-trial harvest's own corpus finding: an
// `inline`-register field (`FieldLabel`'s label-beside-control layout, `FieldLabel.svelte`) whose
// label text varies row to row pushes each row's control to a different left edge, since the
// label's own width is what the control's start position rides on. `register="stacked"` (the
// default since Task 3) cannot produce this shape at all, since a stacked control always starts at
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
// a group, controls are clustered by horizontal overlap of their rendered rects: two controls "are
// in the same column" when their left/right ranges intersect, the same read `viewport-overflow` and
// `relational-spacing` use for "shares a line" turned onto the perpendicular axis. Two controls in
// different grid tracks do not overlap horizontally and cluster apart; two controls staggered
// within one track still overlap (the label difference is smaller than the control's own width in
// every real case this rule was built against) and cluster together, which is what lets their edges
// be compared at all.
//
// Advisory: "same column" is a heuristic over arbitrary layouts, not a DOM contract cairn's own
// components declare, and a legitimately narrower control deliberately placed off-grid (a compact
// inline filter beside a wider stacked field, say) is a real composition this rule cannot tell from
// a defect.
import { ensurePageHelpers } from '../../rendered.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/** One control whose left edge trails its column's leftmost sibling by more than the tolerance. */
interface EdgeMismatch {
  selector: string;
  containerSelector: string;
  leftPx: number;
  columnLeftPx: number;
}

/**
 * Every form control whose left edge disagrees with its column's leftmost sibling, grouped by
 * nearest grid/flex-column ancestor and clustered by horizontal overlap. Playwright serializes this
 * into the page, so it stays self-contained: every helper is nested and the tolerance arrives
 * through `args`.
 */
function findFieldEdgeMismatches(args: { tolerancePx: number }): EdgeMismatch[] {
  const { tolerancePx } = args;
  const CONTROL_SELECTOR = '.input, .select, .textarea';
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
    const items = controls.map((el) => ({ el, rect: el.getBoundingClientRect() }));
    // Cluster into columns by horizontal overlap, so two controls in different grid tracks are
    // never compared against each other.
    const columns: { el: Element; rect: DOMRect }[][] = [];
    for (const item of items) {
      const column = columns.find((group) =>
        group.some((member) => member.rect.left < item.rect.right && item.rect.left < member.rect.right)
      );
      if (column) column.push(item);
      else columns.push([item]);
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

/** The floor a control's left edge may trail its column's leftmost sibling by and still pass. */
const TOLERANCE_PX = 1.5;

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
        `register="stacked" (docs/reference/admin-fields.md), the register that cannot stagger.`,
    }));
  },
};
