// cairn-audit's focus-renders rule: as a keyboard user tabs through a page, does each stop
// actually render a focus indicator, not merely does a `:focus-visible` selector exist somewhere in
// the sheet. The static `focus-parity` rule proves a selector pair exists in source text; it cannot
// see the cascade resolving at render time, so a later layer (DaisyUI's `.menu` items quieting
// `:focus-visible` before cairn-admin.css's own unlayered override restores it, section 6.2's
// `focus-parity` evidence line) reads as covered in source while a real keyboard user sees nothing.
//
// Two demonstrated failures shaped what this rule became, both fixture-covered in
// browser-regressions.test.ts.
//
// It walks the WHOLE tab order, not one stop. The harness's `focus-visible` state is a single Tab
// press, and the first build read `document.activeElement` once, so it inspected exactly one
// element per page: the breadcrumb or brand link, which the page-wide ring already covers. The
// `.menu` items this rule was written for sit at tab stop five and beyond and were structurally
// unreachable, so the rule shipped green on a page carrying the precise defect it exists to catch.
//
// And "indicator" is wider than `outline`. The first build scoped itself to `outline` on the stated
// grounds that the admin uses nothing else, which is false: MediaPicker, ComponentInsertDialog,
// CairnMediaLibrary, and MediaHeroField all render a Tailwind `ring` (a `box-shadow`) and three of
// them explicitly clear the outline, so an outline-only check reports four error-tier false
// positives against cairn's own components. The bar is now the honest one: focus must CHANGE
// something a sighted user can see. Each stop's focused paint is compared against that same
// element's own resting paint, so a permanent decorative shadow cannot be mistaken for a focus
// ring, and a real ring in any mechanism counts.
import { resolveColors } from '../../rendered.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/**
 * How many tab stops one page is walked for. A generous ceiling over the admin's real tab orders,
 * high enough that no page is truncated in practice and low enough that a focus trap terminates.
 */
const MAX_TAB_STOPS = 150;

/** The paint that decides whether focus rendered, for one element in one state. */
interface FocusPaint {
  outlineStyle: string;
  outlineWidth: string;
  outlineColor: string;
  boxShadow: string;
  borderColor: string;
  backgroundColor: string;
}

/** One tab stop, as the in-page read reports it. */
interface FocusStop {
  /** Identity within this page's walk, so the rest-state pass can read the same element again. */
  id: number;
  selector: string;
  /** Why this stop cannot be judged from outside, or the empty string when it can. */
  unreadable: string;
  /**
   * The focused element's own paint first, then each near ancestor's. daisyUI renders an input's
   * focus ring on the WRAPPING label through `:focus-within` and clears the input's own outline,
   * which cairn's own ListToolbar search field uses, so an element-only read reports a false
   * positive on a ring a keyboard user can plainly see.
   */
  chain: { id: number; paint: FocusPaint }[];
}

/** How far up from a focused element a `:focus-within` indicator is looked for. */
const ANCESTOR_DEPTH = 3;

/** Tags every element with a walk-local identity and clears focus, so the walk starts from the top. */
function prepareFocusWalk(): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  let next = 1;
  for (const el of document.querySelectorAll('*')) {
    (el as unknown as Record<string, number>).__cairnFocusId = next;
    next += 1;
  }
}

/** Reads the currently focused element's paint and its near ancestors', or `null` when focus is on nothing. */
function readFocusedStop(depth: number): FocusStop | null {
  function paintOf(el: Element): FocusPaint {
    const style = getComputedStyle(el);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow,
      borderColor: style.borderColor,
      backgroundColor: style.backgroundColor,
    };
  }

  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const idPart = el.id ? `#${el.id}` : '';
  const classes = Array.from(el.classList).slice(0, 3).join('.');

  const chain: { id: number; paint: FocusPaint }[] = [];
  let node: Element | null = el;
  for (let step = 0; node && node !== document.body && step <= depth; step += 1) {
    chain.push({ id: (node as unknown as Record<string, number>).__cairnFocusId ?? 0, paint: paintOf(node) });
    node = node.parentElement;
  }

  // A frame or a shadow root reports the CONTAINER as the active element, never the descendant a
  // user is actually on, so judging the container's own paint would flag a deliberate tab stop
  // (EditPage's sandboxed preview iframe) for a style that was never the indicator.
  let unreadable = '';
  if (el.tagName === 'IFRAME') {
    unreadable = 'focus moved into a frame, whose indicator renders inside a document this rule cannot read';
  } else if (el.shadowRoot) {
    unreadable = 'focus moved into a shadow root, whose indicator renders on a node this rule cannot read';
  }
  return {
    id: chain[0].id,
    selector: `${el.tagName.toLowerCase()}${idPart}${classes ? `.${classes}` : ''}`,
    unreadable,
    chain,
  };
}

/** Reads the resting paint of the elements the walk visited, identified by their walk-local ids. */
function readRestingPaint(ids: number[]): (FocusPaint | null)[] {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  const byId = new Map<number, Element>();
  for (const el of document.querySelectorAll('*')) {
    const id = (el as unknown as Record<string, number>).__cairnFocusId;
    if (typeof id === 'number') byId.set(id, el);
  }
  return ids.map((id) => {
    const el = byId.get(id);
    if (!el) return null;
    const style = getComputedStyle(el);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow,
      borderColor: style.borderColor,
      backgroundColor: style.backgroundColor,
    };
  });
}

/**
 * Whether the focused paint differs from the resting paint anywhere a sighted user would notice.
 * The outline is deliberately absent: `outline-width` and `outline-color` change under Tailwind's
 * `outline-hidden` while `outline-style` stays `none` and nothing renders, so a diff on those
 * properties would read a cleared outline as an indicator. The outline is judged on its own, by
 * whether it actually renders.
 */
function paintChanged(focused: FocusPaint, rest: FocusPaint | null): boolean {
  if (!rest) return false;
  return (
    focused.boxShadow !== rest.boxShadow ||
    focused.borderColor !== rest.borderColor ||
    focused.backgroundColor !== rest.backgroundColor
  );
}

/**
 * Every tab stop must render a focus indicator: a real computed outline, or any other paint the
 * element does not carry at rest. Error tier: a false negative ships a control that is invisible to
 * a keyboard user, and a false positive costs a developer real time chasing a ring that was never
 * broken, so the outline's rendered color and the element's own resting paint are both consulted
 * before this rule raises a finding.
 */
export const focusRenders: RenderedRule = {
  id: 'focus-renders',
  tier: 'error',
  states: ['focus-visible'],
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ctx.page.evaluate(prepareFocusWalk);

    const stops: FocusStop[] = [];
    const seen = new Set<number>();
    for (let i = 0; i < MAX_TAB_STOPS; i += 1) {
      await ctx.page.keyboard.press('Tab');
      const stop = await ctx.page.evaluate(readFocusedStop, ANCESTOR_DEPTH);
      if (stop === null) break;
      if (stop.id !== 0 && seen.has(stop.id)) break;
      seen.add(stop.id);
      stops.push(stop);
    }
    if (stops.length === 0) return [];

    const links = stops.flatMap((stop) => stop.chain);
    const rest = await ctx.page.evaluate(
      readRestingPaint,
      links.map((link) => link.id)
    );
    const outlineColors = await resolveColors(
      ctx.page,
      links.map((link) => link.paint.outlineColor)
    );

    const findings: RenderedFinding[] = [];
    let cursor = 0;
    stops.forEach((stop, index) => {
      const start = cursor;
      cursor += stop.chain.length;
      if (stop.unreadable !== '') return;
      const rendered = stop.chain.some((link, offset) => {
        const color = outlineColors[start + offset];
        const outlineVisible =
          link.paint.outlineStyle !== 'none' &&
          Number.parseFloat(link.paint.outlineWidth) > 0 &&
          color !== null &&
          color.a > 0;
        return outlineVisible || paintChanged(link.paint, rest[start + offset]);
      });
      if (rendered) return;
      const own = stop.chain[0].paint;
      findings.push({
        ruleId: 'focus-renders',
        tier: 'error',
        selector: stop.selector,
        message:
          `tab stop ${index + 1} renders no focus indicator: the computed outline is ` +
          `${own.outlineStyle} ${own.outlineWidth} ${own.outlineColor}, and neither this element ` +
          `nor its ${ANCESTOR_DEPTH} nearest ancestors change box-shadow, border color, or background ` +
          `color from their own resting paint`,
      });
    });
    return findings;
  },
};
