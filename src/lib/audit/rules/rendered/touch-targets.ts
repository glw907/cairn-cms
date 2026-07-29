// cairn-audit's touch-targets rule: every tap target (a link, button, form control, or
// `[role="button"]`) renders at least 24x24 CSS px at a 390px viewport, WCAG 2.5.8's AA
// target-size floor (Target Size Minimum). Graduates scripts/check-touch-targets.mjs and closes the
// one gap the source probe carried: that script measures only a control's own visual box, so a
// control deliberately shrunk to its intended small size and widened only through an `::before`
// inset hit area (the `.nav-caret` finding) reads as a violation the fix itself had already closed.
// This rule measures the EFFECTIVE hit rectangle, own box unioned with a qualifying `::before`, so a
// real fix stops tripping the floor it already clears and a fake one (a `::before` with no rendered
// content, or one `pointer-events: none` strips of its own click-catching) still does.
//
// The floor is 24x24, not 44x44, by Geoff's ruling (Task 16b, ruling 1). Spec 6.3 originally set
// 44x44, which is WCAG 2.2's AAA criterion (2.5.5, Target Size Enhanced); the bar cairn can honestly
// claim is AA, and AA's own target-size criterion (2.5.8, Target Size Minimum) is 24x24. At 44x44
// this rule raised 138 error-tier findings against cairn's own shipped admin: `btn-sm` runs 32px,
// `btn-xs` runs 24px, and several toolbar controls run 30px, none of which the admin's own design
// treats as a defect. At 24x24 nearly all of those clear, and `btn-xs` sits exactly on the line, so
// its exact 24px measurement has to pass, not fail (pinned in rulings.touch-targets.test.ts). The
// rule keeps its whole job at the new number: it still catches anything genuinely too small, own
// box or a fake `::before` expansion either one.
//
// THE TARGET IS THE ACTIVATION REGION, not the control's own painted box, which is WCAG 2.5.8's
// own wording ("the region of the display that will accept a pointer action"). The plain box
// reading raised an error-tier false positive on cairn's own shipped label-wrapped checkbox
// (EditPage's "Hidden" toggle, FieldInput's boolean field, five more sites): the input paints 20x20
// and the `<label>` around it is 342x34, clicking anywhere on that label toggles the box, so the
// target clears the floor on both axes and the rule reported the input. `labelRegions` returns
// every region that operates the control, one per label the PLATFORM says activates it
// (`HTMLInputElement.labels`, which covers both a wrapping `<label>` and a `for=`-associated one),
// unioned with the control's own box where the two are contiguous. A control meets the floor when
// any one of its regions does.
//
// WCAG 2.5.8's other named exceptions (user-agent controls, essential targets, and the spacing
// exception for a target that does not intersect another's 24px circle) are NOT implemented; the
// one that is, and the only one, is the inline exception, applied to a link that is a run of text
// inside prose. It is narrowed to that: an icon-only inline link carries no sentence to be part of,
// and the unnarrowed clause silently passed a 10x10 image link inside a `<p>`.
//
// A measured rect a fraction of a pixel under 24 is layout snapping, not a design defect, so
// `meetsFloor` allows exactly one Chromium layout quantum (1/64 CSS px, the LayoutUnit the engine
// rounds every rect to). Nothing wider is justified: a control declared 24px measures exactly 24,
// and a half-pixel tolerance would silently enforce 23.5 instead of the AA number the ruling just
// chose. Both sides of the constant are pinned in rulings.touch-targets.test.ts (a 23.99px control,
// which snaps to 23.984375, passes; a 23.5px control is flagged).
//
// The expansion arithmetic is the whole delta over the graduated script, and the first build had it
// exactly backwards, which an adversarial pass demonstrated three ways against real Chromium. For
// an absolutely positioned `::before`, a NEGATIVE computed offset is what reaches outward; the
// first build subtracted on top and left and added on right and bottom, so it expanded on positive
// insets, which reach inward and widen nothing, and refused to expand on the negative ones that are
// the actual technique. The consequences were symmetric: daisyUI's own `.tab::before` underline
// (a decorative 3px rule with positive computed left and right) inflated a 42px tab past the floor
// and silenced a true positive, while the `.nav-caret` pattern the rule exists to understand was
// flagged. Both directions are fixture-covered in browser-regressions.test.ts.
//
// The signs alone were not enough. Computed `top/right/bottom/left` on a pseudo-element resolve
// against its CONTAINING BLOCK, which is the element only when the element is itself positioned; a
// `::before` on a static control is laid out against some ancestor and can report a large negative
// offset while painting nowhere near the control. The element's own `position` is now checked, and
// a percentage offset, which resolves against that same containing block, disqualifies the
// expansion rather than being read as pixels.
import { ensurePageHelpers, type RenderedFinding, type RenderedRule, type RenderedRuleContext } from '../../rendered.js';

/** WCAG 2.5.8's AA target-size floor, in CSS px on each axis. */
const TARGET_MIN = 24;

/**
 * How far under {@link TARGET_MIN} a measured axis may sit and still count as meeting it: one
 * Chromium LayoutUnit, the 1/64 CSS px every rect is snapped to. That is the whole shortfall layout
 * snapping can manufacture, so anything wider would not absorb noise, it would lower the enforced
 * floor. A half-pixel tolerance, this constant's first value, enforced 23.5 while the code and the
 * message both said 24, and no fixture noticed.
 */
const FLOOR_TOLERANCE = 1 / 64;

/** The viewport the floor is checked at; mirrors the graduated script's own pinned size. */
const VIEWPORT = { width: 390, height: 844 };

/** One tap target under the floor, and the effective hit box the rule measured it at. */
interface SmallTarget {
  selector: string;
  width: number;
  height: number;
  text: string;
}

/**
 * Every tap target under `targetMin` (less `tolerance`) at the current viewport, `::before`
 * hit-area expansion accounted for. Playwright serializes this into the page, so it stays
 * self-contained: every helper is nested and the floor arrives as an argument. The first build
 * referenced a module-scope constant here and threw `ReferenceError` on every real page, so it had
 * never once executed against a browser.
 */
function findSmallTouchTargets({ targetMin, tolerance }: { targetMin: number; tolerance: number }): SmallTarget[] {
  const meetsFloor = (value: number) => value >= targetMin - tolerance;
  // The shared page helpers name an element the one way every rendered rule names it, escaped so
  // the rendered allowlist can actually probe the selector. This rule carried its own unescaped
  // copy, the drift `ensurePageHelpers` exists to end.
  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());

  function union(a: DOMRect, b: DOMRect): DOMRect {
    const left = Math.min(a.left, b.left);
    const top = Math.min(a.top, b.top);
    const right = Math.max(a.right, b.right);
    const bottom = Math.max(a.bottom, b.bottom);
    return new DOMRect(left, top, right - left, bottom - top);
  }

  /** Whether two rects overlap or sit within a pixel of each other, so a pointer reads them as one region. */
  function touches(a: DOMRect, b: DOMRect): boolean {
    return a.left <= b.right + 1 && b.left <= a.right + 1 && a.top <= b.bottom + 1 && b.top <= a.bottom + 1;
  }

  // Every region that accepts the pointer action for this control. A labelled form control has one
  // per activating label as well as its own box, and the platform's own `labels` list answers which
  // labels those are (a wrapping `<label>` and a `for=`-associated one both appear there), so no
  // markup convention is guessed at. A label that CONTAINS the control, or whose box touches it, is
  // one contiguous region with it and returned unioned; a label parked elsewhere is its own region,
  // returned on its own rather than unioned, since the gap between them accepts nothing.
  function labelRegions(el: Element, own: DOMRect): DOMRect[] {
    const labels = 'labels' in el ? (el as HTMLInputElement).labels : null;
    if (!labels) return [];
    const regions: DOMRect[] = [];
    for (const label of labels) {
      const style = getComputedStyle(label);
      if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') continue;
      const labelRect = label.getBoundingClientRect();
      if (labelRect.width <= 0 || labelRect.height <= 0) continue;
      regions.push(label.contains(el) || touches(labelRect, own) ? union(own, labelRect) : labelRect);
    }
    return regions;
  }

  // Whether a control is parked where no pointer reaches it (a skip link at `left: -9999px`) rather
  // than merely out of view. The rightward half of this test asks about the scroll box the control
  // actually lives in: comparing against `document.documentElement.scrollWidth` alone exempted every
  // control past the viewport's right edge inside an inner horizontal scroller, which is exactly the
  // shape cairn's own EditorToolbar renders at small widths (`max-sm:overflow-x-auto`), so three
  // identically undersized toolbar controls were silently unmeasured.
  function isParkedOffCanvas(control: Element, own: DOMRect): boolean {
    const docTop = own.top + window.scrollY;
    const docLeft = own.left + window.scrollX;
    if (docTop + own.height <= 0 || docLeft + own.width <= 0) return true;
    const extent = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
    if (docLeft < extent) return false;
    for (let node: Element | null = control.parentElement; node; node = node.parentElement) {
      const overflowX = getComputedStyle(node).overflowX;
      if ((overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth) return false;
    }
    return true;
  }

  // The effective hit rectangle: the element's own box, expanded by an absolutely (or fixed)
  // positioned `::before` reaching past it through a negative offset. Trusting those offsets means
  // proving they are measured from the element itself, so the element has to be the pseudo-
  // element's containing block (any `position` other than `static`) and every offset has to be a
  // pixel length. A `::before` with no rendered content, a static or relative position, or
  // `pointer-events: none` changes nothing a pointer can reach, so none of those expand the box.
  function hitRect(el: Element, own: DOMRect): DOMRect {
    if (getComputedStyle(el).position === 'static') return own;
    const before = getComputedStyle(el, '::before');
    if (before.content === 'none' || before.content === 'normal') return own;
    if (before.pointerEvents === 'none') return own;
    if (before.position !== 'absolute' && before.position !== 'fixed') return own;

    const offsets = [before.top, before.right, before.bottom, before.left];
    if (offsets.some((value) => value === 'auto' || value.endsWith('%') || Number.isNaN(Number.parseFloat(value)))) {
      return own;
    }
    const [top, right, bottom, left] = offsets.map((value) => Number.parseFloat(value));
    // A negative offset reaches outward, a positive one inward; `Math.min`/`Math.max` against the
    // element's own edges is what refuses to let an inward inset shrink the measured target.
    const hitLeft = Math.min(own.left + left, own.left);
    const hitTop = Math.min(own.top + top, own.top);
    const hitRight = Math.max(own.right - right, own.right);
    const hitBottom = Math.max(own.bottom - bottom, own.bottom);
    return new DOMRect(hitLeft, hitTop, hitRight - hitLeft, hitBottom - hitTop);
  }

  const findings = new Map<string, SmallTarget>();
  for (const el of document.querySelectorAll('a, button, [role="button"], input, select, summary')) {
    const control = el as HTMLElement;
    // A disabled control takes no taps, so the floor does not apply (GFM task-list checkboxes
    // render disabled by design).
    if ((control as HTMLButtonElement).disabled || control.getAttribute('aria-disabled') === 'true') continue;
    const style = getComputedStyle(control);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const own = control.getBoundingClientRect();
    // A control clipped to a pixel is a screen-reader affordance, not a tap target: the visible
    // control is the styled label beside it, and that label is measured on its own. cairn's own
    // upload input is exactly this shape.
    if (own.width <= 1 || own.height <= 1) continue;
    // A control parked off-canvas at rest (a skip link revealed only on focus) takes no taps. The
    // graduated script tested that against the WINDOW, so on any page taller than one screenful it
    // silently exempted every control below the fold, which on the showcase styleguide is every
    // control there is: at a 390px viewport all eleven tap targets, the four the gate's own
    // allowlist names included, sat past `window.innerHeight` and were skipped before the floor was
    // ever applied. Document coordinates are what the guard always meant.
    if (isParkedOffCanvas(control, own)) continue;
    // WCAG 2.5.8's inline exception: a link inside running prose, where the line of text carries
    // the tappable area rather than the link glyph alone. A link with no text of its own is not in
    // a sentence and the exception does not reach it; without that narrowing an icon-only 10x10
    // image link inside a `<p>` passed silently.
    if (
      style.display === 'inline' &&
      control.tagName === 'A' &&
      control.closest('article, .prose, p') &&
      (control.textContent ?? '').trim().length > 0
    ) {
      continue;
    }

    // Every region a pointer can use to operate this control: its own box (widened by a qualifying
    // `::before`), and each activating label. The control meets the floor when ANY of them does,
    // which is the criterion's own question, and the finding names the largest so a developer sees
    // the biggest thing the rule could find rather than the smallest.
    const regions = [hitRect(control, own), ...labelRegions(control, own)];
    if (regions.some((region) => meetsFloor(region.width) && meetsFloor(region.height))) continue;
    const rect = regions.reduce((widest, region) =>
      region.width * region.height > widest.width * widest.height ? region : widest
    );

    const key = signature(control);
    const prior = findings.get(key);
    if (!prior || rect.height < prior.height) {
      findings.set(key, {
        selector: key,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (control.textContent || control.getAttribute('aria-label') || '').trim().slice(0, 40),
      });
    }
  }
  return [...findings.values()];
}

/**
 * Every tap target must clear WCAG 2.5.8's AA 24x24 CSS px floor at a 390px viewport, measured on
 * the region that accepts the pointer action: the control's own box, an outward `::before` hit
 * area, and an activating label, whichever reach furthest. Error tier: a false negative here ships
 * a control a thumb cannot reliably hit, and a false positive (a control an already-expanded hit
 * area covers, a labelled checkbox whose label is the real target, or a rect layout snapping nudged
 * a fraction under the line) costs a developer real time chasing a floor that was never actually
 * missed, so all three are resolved before this rule raises a finding.
 */
export const touchTargets: RenderedRule = {
  id: 'touch-targets',
  tier: 'error',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    // Every rule registered for one interaction state shares one page in sequence (runRendered's
    // rule loop), so the original viewport is restored before returning and the next rule never
    // inherits a 390px browser it did not ask for.
    const original = ctx.page.viewportSize();
    try {
      await ctx.page.setViewportSize(VIEWPORT);
      await ensurePageHelpers(ctx.page);
      const small = await ctx.page.evaluate(findSmallTouchTargets, {
        targetMin: TARGET_MIN,
        tolerance: FLOOR_TOLERANCE,
      });
      return small.map((target) => ({
        ruleId: 'touch-targets',
        tier: 'error' as const,
        selector: target.selector,
        message:
          `renders ${target.width}x${target.height}px against the ${TARGET_MIN}x${TARGET_MIN}px floor` +
          `${target.text ? ` ("${target.text}")` : ''}`,
      }));
    } finally {
      if (original) await ctx.page.setViewportSize(original);
    }
  },
};
