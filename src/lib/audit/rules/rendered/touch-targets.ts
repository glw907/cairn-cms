// cairn-audit's touch-targets rule: every tap target (a link, button, form control, or
// `[role="button"]`) renders at least 44x44 CSS px at a 390px viewport, WCAG 2.5.8's AA
// target-size floor. Graduates scripts/check-touch-targets.mjs and closes the one gap the source
// probe carried: that script measures only a control's own visual box, so a control deliberately
// shrunk to its intended small size and widened only through an `::before` inset hit area (the
// `.nav-caret` finding) reads as a violation the fix itself had already closed. This rule measures
// the EFFECTIVE hit rectangle, own box unioned with a qualifying `::before`, so a real fix stops
// tripping the floor it already clears and a fake one (a `::before` with no rendered content, or
// one `pointer-events: none` strips of its own click-catching) still does.
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
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/** WCAG 2.5.8's AA target-size floor, in CSS px on each axis. */
const TARGET_MIN = 44;

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
 * Every tap target under `targetMin` at the current viewport, `::before` hit-area expansion
 * accounted for. Playwright serializes this into the page, so it stays self-contained: every helper
 * is nested and the floor arrives as an argument. The first build referenced a module-scope
 * constant here and threw `ReferenceError` on every real page, so it had never once executed
 * against a browser.
 */
function findSmallTouchTargets(targetMin: number): SmallTarget[] {
  function signature(el: Element): string {
    const cls =
      typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 4).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
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
    const docTop = own.top + window.scrollY;
    const docLeft = own.left + window.scrollX;
    if (docTop + own.height <= 0 || docLeft + own.width <= 0) continue;
    if (docLeft >= document.documentElement.scrollWidth) continue;
    // WCAG 2.5.8's own exemption: an inline link inside running prose, where the surrounding text
    // carries the tappable area rather than the link glyph alone.
    if (style.display === 'inline' && control.tagName === 'A' && control.closest('article, .prose, p')) continue;

    const rect = hitRect(control, own);
    if (rect.width >= targetMin && rect.height >= targetMin) continue;

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
 * Every tap target must clear WCAG 2.5.8's 44x44 CSS px floor at a 390px viewport, its own box or
 * an expanded `::before` hit area either one. Error tier: a false negative here ships a control a
 * thumb cannot reliably hit, and a false positive (flagging a control an already-expanded hit area
 * covers) costs a developer real time chasing a floor that was never actually missed, so the
 * expansion is checked before this rule raises a finding.
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
      const small = await ctx.page.evaluate(findSmallTouchTargets, TARGET_MIN);
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
