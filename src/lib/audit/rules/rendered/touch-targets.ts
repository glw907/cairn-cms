// cairn-audit's touch-targets rule: every tap target (a link, button, form control, or
// `[role="button"]`) renders at least 24x24 CSS px at a 390px viewport. That floor is DERIVED from
// WCAG 2.2's SC 2.5.8, Target Size (Minimum), and is not an implementation of it: the rule enforces
// a strict superset, so a red run is a house-bar failure and never, on its own, an AA failure. See
// the exception list below for what is missing. Graduates scripts/checks/check-touch-targets.mjs and closes the
// one gap the source probe carried: that script measures only a control's own visual box, so a
// control deliberately shrunk to its intended small size and widened only through an `::before`
// inset hit area (the `.nav-caret` finding) reads as a violation the fix itself had already closed.
// This rule measures the EFFECTIVE hit rectangle, own box unioned with a qualifying `::before`, so a
// real fix stops tripping the floor it already clears and a fake one (a `::before` with no rendered
// content, or one `pointer-events: none` strips of its own click-catching) still does.
//
// The floor is 24x24, not 44x44, by Geoff's ruling (ruling 1). Spec 6.3 originally set
// 44x44, which is WCAG 2.2's AAA criterion (2.5.5, Target Size (Enhanced)); the bar cairn can
// honestly claim is AA, and AA's own target-size criterion (2.5.8, Target Size (Minimum)) is 24x24.
// At 44x44
// this rule raised 138 error-tier findings against cairn's own shipped admin: `btn-sm` runs 32px,
// `btn-xs` runs 24px, and several toolbar controls run 30px, none of which the admin's own design
// treats as a defect. At 24x24 nearly all of those clear, and `btn-xs` sits exactly on the line, so
// its exact 24px measurement has to pass, not fail (pinned in rulings.touch-targets.test.ts). The
// rule keeps its whole job at the new number: it still catches anything genuinely too small, own
// box or a fake `::before` expansion either one.
//
// THE TARGET IS THE ACTIVATION REGION, not the control's own painted box. That is the WCAG 2.2
// glossary's definition of "target", which 2.5.8 links to ("region of the display that will accept
// a pointer action"); the criterion's own sentence is only "the size of the target for pointer
// inputs is at least 24 by 24 CSS pixels, except where". The plain box
// reading raised an error-tier false positive on cairn's own shipped label-wrapped checkbox
// (EditPage's "Hidden" toggle, FieldInput's boolean field, five more sites): the input paints 20x20
// and the `<label>` around it is 342x34, clicking anywhere on that label toggles the box, so the
// target clears the floor on both axes and the rule reported the input. `labelRegions` returns
// every region that operates the control, one per label the PLATFORM says activates it
// (`HTMLInputElement.labels`, which covers both a wrapping `<label>` and a `for=`-associated one),
// unioned with the control's own box where the two are contiguous. A control meets the floor when
// any one of its regions does.
//
// SC 2.5.8 HAS FIVE NAMED EXCEPTIONS AND THIS RULE IMPLEMENTS ONE, which is why the floor above is
// a house bar rather than the criterion. In the criterion's own order: Spacing (an undersized target
// is exempt when a 24px-diameter circle centred on it intersects no other target's circle),
// Equivalent (the same function is reachable through another control on the page that does meet the
// floor), Inline (a target in a sentence or block of text), User agent control, and Essential.
//
// Implemented: Inline, narrowed to a link that is a run of text inside prose. An icon-only inline
// link carries no sentence to be part of, and the unnarrowed clause silently passed a 10x10 image
// link inside a `<p>`.
//
// Not implemented: Spacing, User agent control, Essential. Spacing is the one most real admin
// toolbars pass on, and the calibration measured its cost precisely: the sort button's nearest
// target centre sits 47px away on both table shapes, clear of the 24px-circle test, so 8 of the 10
// corpus-A errors this rule raises would not be 2.5.8 violations.
//
// Informally applied: Equivalent. `labelRegions` returns a label that does NOT touch its control as
// its own region, and a control passes when any region clears the floor, so a 20x20 checkbox with a
// 120x32 label parked across the page passes. Under the criterion that control's own target really
// is 20x20 and conformance runs through Equivalent, where it is arguable whether an associated
// label is "a different control" at all. This is a deliberate, stated narrowing rather than an
// omission: a platform-associated label is the one case where the alternative control is named by
// the platform instead of guessed at. The CONTIGUOUS half is not an exception at all, it is the
// measurement, since a wrapping or adjacent label is part of the region that accepts the pointer
// action.
//
// THREE MORE BOUNDS ON THE COVERAGE, all stated rather than closed, and all filed as rule-repair
// follow-ups in ROADMAP:
//
//  - ONE VIEWPORT. `VIEWPORT` is 390x844 and nothing else is sampled. The criterion carries no
//    viewport qualifier, so a control that renders 24px tall at 390 and 20px at 320, or a toolbar
//    that reflows at a desktop width, fails the criterion where this rule never looks.
//    `viewport-overflow` already sweeps 390 and 320 and is the cheapest place to borrow a width list.
//  - THE TARGET NET IS TAG-SHAPED. The query below is `a, button, [role="button"], input, select,
//    summary`, so `textarea`, `<area>`, the widget roles (`link`, `checkbox`, `switch`, `radio`,
//    `tab`, `menuitem`, `option`), and a custom control carrying `tabindex` plus a pointer handler
//    are all outside it. `interactive-contrast` uses a different, wider list plus a `cursor:
//    pointer` fallback, so the two error-tier rules do not hold the same definition of a control.
//    The repair is one shared selector in the page helpers.
//  - FINDINGS COLLAPSE PER SIGNATURE. Twenty undersized rows sharing a class fingerprint report as
//    one finding at the smallest measured height, so a count here is a count of SHAPES, not of
//    elements, and it is not a remediation estimate. `interactive-contrast` deliberately refuses the
//    same idiom, so the two rules disagree; that disagreement is real and unresolved.
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

/** The house target-size floor, in CSS px on each axis, taking its number from WCAG 2.5.8's AA bar. */
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
      // A label parked off-canvas (the older `position: absolute; left: -9999px` visually-hidden
      // idiom) has a real, full-size rect and reaches no pointer, so admitting it as a region
      // silenced the rule for every control carrying one. The control's own box already runs
      // through this same guard; the label half was simply missing. Nothing in cairn's own tree
      // trips it (its `sr-only` is Tailwind's clip-based 1x1 recipe, which fails the floor anyway),
      // and the rule ships to consumers writing their own admin routes.
      if (isParkedOffCanvas(label, labelRect)) continue;
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
    // A control that accepts no pointer action is not a target under the glossary definition this
    // rule's header quotes. `pointer-events: none` and an `inert` ancestor both say so outright, and
    // the rule already honored `pointer-events` on a `::before` expansion and on a label while
    // ignoring it on the control itself, which was an inconsistency rather than a position.
    //
    // `opacity: 0` is deliberately NOT here, against a review suggestion to add it. A fully
    // transparent element still hit-tests in CSS (that is exactly how daisyUI's own `.drawer-toggle`
    // works), so exempting it would be a fail-open on a gating rule.
    if (style.pointerEvents === 'none' || control.closest('[inert]')) continue;
    const own = control.getBoundingClientRect();
    // A control clipped to a pixel takes no pointer action on its own box. The visible affordance is
    // a `<label>` the platform associates with it, and the criterion measures THAT region, so the
    // labels are measured here instead of the control being dropped. The first build asserted the
    // label "is measured on its own" while no label was ever a candidate, so cairn's own drawer
    // trigger, a `btn btn-square` `<label>` over daisyUI's 0x0 `.drawer-toggle`, sat entirely
    // outside the rule; it passes today only because that button happens to render 48px.
    //
    // A clipped control with NO label stays unmeasured, and that is a stated fail-open rather than a
    // claim: whatever a pointer actually reaches is some element this rule cannot name from here,
    // and reporting the 0x0 box would name the wrong one.
    const clipped = own.width <= 1 || own.height <= 1;
    const labels = labelRegions(control, own);
    if (clipped && labels.length === 0) continue;
    // A control parked off-canvas at rest (a skip link revealed only on focus) takes no taps. The
    // graduated script tested that against the WINDOW, so on any page taller than one screenful it
    // silently exempted every control below the fold, which on the showcase styleguide is every
    // control there is: at a 390px viewport all eleven tap targets, the four the gate's own
    // allowlist names included, sat past `window.innerHeight` and were skipped before the floor was
    // ever applied. Document coordinates are what the guard always meant.
    if (!clipped && isParkedOffCanvas(control, own)) continue;
    // WCAG 2.5.8's inline exception: a link inside running prose, where the line of text carries
    // the tappable area rather than the link glyph alone. A link with no text of its own is not in
    // a sentence and the exception does not reach it; without that narrowing an icon-only 10x10
    // image link inside a `<p>` passed silently.
    if (
      !clipped &&
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
    const regions = clipped ? labels : [hitRect(control, own), ...labels];
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
 * Every tap target must clear a 24x24 CSS px floor at a 390px viewport, measured on the region that
 * accepts the pointer action: the control's own box, an outward `::before` hit area, and an
 * activating label, whichever reach furthest. The number comes from WCAG 2.5.8 and the enforcement
 * is a strict superset of that criterion, so a finding is a house-bar failure (file header). Error
 * tier: a false negative here ships
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
          `${target.text ? ` ("${target.text}")` : ''}` +
          `. cairn's floor, derived from WCAG 2.2 SC 2.5.8: its spacing, equivalent, user-agent, and ` +
          `essential exceptions are not evaluated, so this is not on its own an AA failure`,
      }));
    } finally {
      if (original) await ctx.page.setViewportSize(original);
    }
  },
};
