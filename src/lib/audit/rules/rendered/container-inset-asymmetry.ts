// cairn-audit's container-inset-asymmetry rule: the phantom-gutter detector,
// the mechanical half of finding 1. A block container's rendered content should sit roughly as far
// from its left edge as from its right; when it does not, the container reads as pushed off-center
// even though nothing about its own box moved.
//
// PROVENANCE, measured against the running corpus rather than paraphrased from the harvest (design
// ratchet fix C). The motivating shape is the ASC Assets-trial gutter on `/admin/club/asset-requests`:
// a bare `<ul class="list">` keeping the user agent's own 40px bullet indent, which the published
// sheet of that moment never reset, so the rule reads a 40px left inset against a 0px right one on
// the `ul` itself. The harvest's headline number, 57px, was a different origin: the card's left edge
// out to the row's text, which sums the card's border, that same 40px, and the row's own padding.
// Localizing the asymmetry to the element that actually carries it is the point, since that is the
// element a repair edits. Note the cause was a MISSING reset, not an author's one-sided utility;
// both reach the same rendered result, and the finding text names both.
//
// SCOPE. A "block container" is cairn's own three content-holding recipes: `.card-shell` (the card
// surface), `.list` (daisyUI's list container), and `.modal-box` (a dialog's own content box).
// Narrowing to these three, rather than every element on the page, is deliberate: an arbitrary div
// has no claim to symmetric insets at all, and widening the scope would just relocate the false
// positives this rule exists to avoid.
//
// MEASUREMENT. The container's rendered content is the union of its own visible DIRECT children's
// boxes, never a deep subtree walk: a direct child is what the container's own padding or a stray
// margin utility on the container itself would actually offset, and a deep walk would pull in a
// nested element's OWN margin as if it were the container's asymmetry. The left inset is the
// distance from the container's left edge to the content union's left edge, the right inset the
// mirror on the right, and the finding is the signed difference between them: positive reads as
// content pushed right, negative as pushed left.
//
// Advisory: the 24px threshold is judged, not derived from a spec the way `touch-targets` borrows
// one, and a deliberately asymmetric layout (a card with a wide illustration rail on one side) is a
// real composition this rule cannot tell from a defect.
import { ensurePageHelpers } from '../../rendered.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/** The three container recipes this rule measures: card, list, and a dialog's own content box. */
const CONTAINER_SELECTOR = '.card-shell, .list, .modal-box';

/** How far a container's left inset may exceed its right (or vice versa) before it is reported. */
const ASYMMETRY_THRESHOLD_PX = 24;

/** One container whose measured left and right insets diverge past the threshold. */
interface InsetAsymmetry {
  selector: string;
  leftInsetPx: number;
  rightInsetPx: number;
  pushedRight: boolean;
}

/**
 * Every `.card-shell`/`.list`/`.modal-box` container whose content union sits closer to one side
 * than the other by more than `thresholdPx`. Playwright serializes this into the page, so it stays
 * self-contained: every helper is nested and both the threshold and the container selector arrive
 * through `args`, a module-scope constant read from inside this function throws `ReferenceError`
 * on a real page (the same mistake `touch-targets`'s own header warns against).
 */
function findInsetAsymmetries(args: { thresholdPx: number; containerSelector: string }): InsetAsymmetry[] {
  const { thresholdPx, containerSelector } = args;
  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());
  const isVisible = (el: Element) => (helpers ? helpers.isVisible(el) : true);

  const findings: InsetAsymmetry[] = [];
  for (const container of document.querySelectorAll(containerSelector)) {
    if (!isVisible(container)) continue;
    const children = Array.from(container.children).filter((child) => isVisible(child));
    if (children.length === 0) continue;
    const containerRect = container.getBoundingClientRect();
    if (containerRect.width <= 0) continue;

    let contentLeft = Infinity;
    let contentRight = -Infinity;
    for (const child of children) {
      const rect = child.getBoundingClientRect();
      if (rect.width <= 0 && rect.height <= 0) continue;
      contentLeft = Math.min(contentLeft, rect.left);
      contentRight = Math.max(contentRight, rect.right);
    }
    if (!Number.isFinite(contentLeft) || !Number.isFinite(contentRight)) continue;

    const leftInset = contentLeft - containerRect.left;
    const rightInset = containerRect.right - contentRight;
    const asymmetry = leftInset - rightInset;
    if (Math.abs(asymmetry) <= thresholdPx) continue;
    findings.push({
      selector: signature(container),
      leftInsetPx: Math.round(leftInset),
      rightInsetPx: Math.round(rightInset),
      pushedRight: asymmetry > 0,
    });
  }
  return findings;
}

export const containerInsetAsymmetry: RenderedRule = {
  id: 'container-inset-asymmetry',
  tier: 'advisory',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ensurePageHelpers(ctx.page);
    const asymmetries = await ctx.page.evaluate(findInsetAsymmetries, {
      thresholdPx: ASYMMETRY_THRESHOLD_PX,
      containerSelector: CONTAINER_SELECTOR,
    });
    return asymmetries.map((finding) => ({
      ruleId: 'container-inset-asymmetry',
      tier: 'advisory' as const,
      selector: finding.selector,
      message:
        `renders a ${finding.leftInsetPx}px left inset against a ${finding.rightInsetPx}px right inset ` +
        `(content reads pushed ${finding.pushedRight ? 'right' : 'left'}). Check for a one-sided padding or ` +
        `margin utility on this container, an unreset user-agent default such as a list's own bullet indent, ` +
        `or either of those on a wrapper immediately inside it.`,
    }));
  },
};
