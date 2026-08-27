// cairn-audit's panel-width rule: an ExpandableRow's summary row (`.toolkit-expandable-row-summary`)
// or its expanded panel (`.toolkit-expandable-row-panel`) must not clip its own content at 390 or
// 320, the family's composition floor (docs/internal/public-design-system.md), the same floor
// `viewport-overflow` enforces everywhere else.
//
// MEMBERSHIP: this is a hole `viewport-overflow` declines on purpose, not a duplicate of it.
// `viewport-overflow.ts:64` short-circuits clean whenever the document itself does not scroll
// horizontally, which is exactly what happens when AdminTable's own `overflow-x: auto` wrap
// absorbs a wide summary row: the DOCUMENT never scrolls, the wrap does, and the whole scan returns
// before it ever measures a row. And `viewport-overflow.ts:75` treats every element under ANY
// `overflowX !== 'visible'` ancestor as out of scope, which correctly exempts a row the ancestor
// genuinely scrolls to reach but ALSO exempts a row merely CLIPPED by an ancestor that never offers
// a scrollbar at all (`overflow-x: hidden`, or an `overflow-x: auto` box whose own content never
// grows past its own width). Neither test ever measures the row itself, so a row clipped inside a
// non-scrolling wrapper reaches neither.
//
// EVIDENCE: the column-drop recipe (hiding lower-priority summary columns under a breakpoint so a
// row never needs to scroll) failed at its third consumer. The summary row column-dropped cleanly,
// but the row's expanded PANEL is caller-authored content outside that column-drop, and a panel cell
// given its own explicit width plus `overflow: hidden` (a `truncate`-style utility, or a fixed-width
// inner layout) clipped a wide inline control mid-word at 390, with the document never scrolling and
// `viewport-overflow` reporting clean.
//
// CONTRACT, both halves sharing the same qualifier: a summary row or an expanded panel is flagged
// only when some element inside it overflows its own box (`scrollWidth > clientWidth`) while no
// ancestor between that element and the table wrapper is itself GENUINELY scrolling: styled
// `overflow-x: auto`/`scroll` (an `overflow-x: hidden` ancestor never offers a scrollbar, so it
// never counts) AND currently overflowing its own box. That single test is symmetric: it is what
// exempts a deliberately scrollable AdminTable (the wrap itself scrolls, AdminTable's own sanctioned
// idiom) and what exempts a deliberately scrollable descendant living inside the panel (a nested
// `overflow-x: auto` region absorbs its own content before it ever reaches the panel's own box). A
// blanket every-row assertion is rejected: it fires on the engine's own sanctioned scrollable
// tables, the false-positive failure mode the `chip-ground-collision` reshape priced at 24 false
// errors of 40. A violation names both the row and the overflowing cell.
import { ensurePageHelpers } from '../../rendered.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/** Both widths the family's responsive floor is checked against, narrower second. */
const CHECK_WIDTHS = [390, 320] as const;

/** The viewport height every width is checked at. Only the width is part of this rule's contract. */
const VIEWPORT_HEIGHT = 844;

/** ExpandableRow's own two row shapes; see this rule's own header for why these two, specifically. */
const ROW_SELECTOR = '.toolkit-expandable-row-summary, .toolkit-expandable-row-panel';

/** One row whose content clips against its own box, with no reachable scroll ancestor. */
interface PanelWidthViolation {
  rowSelector: string;
  cellSelector: string;
  overflowPx: number;
}

/**
 * Every summary row or expanded panel with an unabsorbed self-overflow at the current viewport.
 * Playwright serializes this into the page, so it stays self-contained: every helper is nested and
 * `rowSelector` arrives through `args`, since a module-scope constant read from inside this function
 * throws `ReferenceError` on a real page.
 */
function findPanelWidthViolations(args: { rowSelector: string }): PanelWidthViolation[] {
  const { rowSelector } = args;
  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());
  const isVisible = (el: Element) => (helpers ? helpers.isVisible(el) : true);

  // Whether `el` itself is a genuinely reachable scroll container: styled `auto`/`scroll` (an
  // `overflow-x: hidden` ancestor never offers a scrollbar, so it is deliberately excluded) AND
  // currently overflowing its own box. A box that merely declares `overflow-x: auto` but never
  // actually grows past its own width (AdminTable's wrap when nothing forces it wider) does not
  // qualify either.
  function scrolls(el: Element): boolean {
    const style = getComputedStyle(el);
    const reachable = style.overflowX === 'auto' || style.overflowX === 'scroll';
    return reachable && el.scrollWidth > el.clientWidth + 1;
  }

  // Whether some ancestor strictly between `el` and the document root absorbs `el`'s own overflow.
  // If `el` ITSELF is styled off `visible`, its own boundary already decided the question (the
  // `scrolls(el)` check above this call covers a reachable one; an `overflow-x: hidden` `el` is
  // never rescued by a scrolling ancestor further up, since that ancestor's scroll can never reach
  // content `el` already clips at its own edge). Only when `el`'s own overflow is `visible` does an
  // ancestor's behavior matter, and the walk stops at the FIRST ancestor styled off `visible`, which
  // is "the table wrapper" this rule's contract names: an intermediate clipping ancestor blocks
  // reachability regardless of what sits further up, the same reasoning `viewport-overflow`'s own
  // scroll-container skip rests on.
  function isAbsorbed(el: Element): boolean {
    if (getComputedStyle(el).overflowX !== 'visible') return false;
    for (let node = el.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX !== 'visible') return scrolls(node);
    }
    return false;
  }

  const violations: PanelWidthViolation[] = [];
  for (const row of document.querySelectorAll(rowSelector)) {
    if (!isVisible(row)) continue;
    let worst: { el: Element; overflowPx: number } | null = null;
    for (const el of [row, ...Array.from(row.querySelectorAll('*'))]) {
      if (!isVisible(el)) continue;
      // A candidate that is itself a genuinely scrolling region (a deliberately scrollable
      // descendant inside the panel) absorbs its own content and is exempt by the same test; so is
      // one sitting under such an ancestor, whether that ancestor is inside the row (a nested
      // scroll region) or outside it (the table wrapper's own sanctioned scroll).
      if (scrolls(el) || isAbsorbed(el)) continue;
      const overflowPx = el.scrollWidth - el.clientWidth;
      if (overflowPx > 1 && (!worst || overflowPx > worst.overflowPx)) worst = { el, overflowPx };
    }
    if (worst) {
      violations.push({
        rowSelector: signature(row),
        cellSelector: signature(worst.el),
        overflowPx: Math.round(worst.overflowPx),
      });
    }
  }
  return violations;
}

export const panelWidth: RenderedRule = {
  id: 'panel-width',
  tier: 'error',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    // Every rule registered for one interaction state shares one page in sequence (runRendered's
    // rule loop), so the original viewport is restored before returning.
    const original = ctx.page.viewportSize();
    const findings: RenderedFinding[] = [];
    try {
      await ensurePageHelpers(ctx.page);
      for (const width of CHECK_WIDTHS) {
        await ctx.page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        const violations = await ctx.page.evaluate(findPanelWidthViolations, { rowSelector: ROW_SELECTOR });
        for (const violation of violations) {
          findings.push({
            ruleId: 'panel-width',
            tier: 'error',
            selector: violation.rowSelector,
            message:
              `clips ${violation.cellSelector} by ${violation.overflowPx}px against a ${width}px viewport, ` +
              `with no ancestor between it and the table wrapper genuinely scrolling to reach it`,
          });
        }
      }
    } finally {
      if (original) await ctx.page.setViewportSize(original);
    }
    return findings;
  },
};
