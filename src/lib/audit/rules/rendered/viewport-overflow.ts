// cairn-audit's viewport-overflow rule: nothing on an admin page renders wider than the viewport,
// at 390px AND at 320px, the family's composition floor (docs/internal/public-design-system.md).
// The motivating finding, ExpandableRow's own overflow, was rediscovered independently by two
// consumers before this rule existed, which is the fail-open this rule closes: a layout that fits
// at 390 can still overflow at 320, so checking one width and calling the floor covered is exactly
// the shape of clean-because-it-never-looked report this rule exists to rule out.
//
// Three failures an adversarial review demonstrated, all closed here and all fixture-covered in
// browser-regressions.test.ts:
//
//  1. The rule measured element border boxes only, and a block element's border box is CLAMPED to
//     its container. So an unbreakable string (a long title, a commit sha, a GitHub error carrying
//     a URL) overflowed by hundreds of pixels with no element rect exceeding the viewport and the
//     page reported clean, while wrapping that identical string in a `<code>` made it visible. For
//     a CMS that is the primary overflow vector, since the overflowing string is what an editor
//     typed. The scan now also reports an element whose own CONTENT is wider than its box, which is
//     the same read that catches an absolutely positioned pseudo-element bleeding past its parent.
//  2. `getBoundingClientRect` reports unclipped geometry, so every child of a deliberate
//     `overflow-x: auto` scroll container was flagged. Both instances are cairn's own idioms
//     (AdminTable's and OfficeList's table wrapper, EditorToolbar's small-screen rail), and the
//     only remedy would have been an allowlist entry keyed on a selector the real defect shares,
//     which would have silenced the real defect permanently. The whole scan is now gated on the
//     document actually scrolling horizontally, and any element inside a scroll container is
//     skipped, so the false positive never reaches the allowlist in the first place.
//  3. A `visibility: hidden` ancestor suppressed a visible overflowing child, because the
//     parent-already-overflows shortcut did not ask whether the parent was itself reportable.
//
// The rule also runs under `menu-open` now, not rest alone. Every dialog in this admin (the entry,
// link, fragment, media, and reference pickers, the insert palette, the media library grid) is the
// surface most likely to blow 320, and at rest every one of them is closed.
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/** Both widths the family's responsive floor is checked against, narrower second. */
const CHECK_WIDTHS = [390, 320] as const;

/** The viewport height every width is checked at. Only the width is part of this rule's contract. */
const VIEWPORT_HEIGHT = 844;

/** One element the in-page scan found rendering past the current viewport's right edge. */
interface OverflowOrigin {
  selector: string;
  /** The right edge the element reaches, in viewport coordinates. */
  right: number;
  /** Whether the element's own box overflows, or its content overflows the element's own box. */
  kind: 'box' | 'content';
}

/**
 * Every element that originates real horizontal overflow at the current viewport. Playwright
 * serializes this into the page, so it stays self-contained: no references outside its own body.
 */
function findOverflowOrigins(): OverflowOrigin[] {
  function signature(el: Element): string {
    const cls =
      typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 4).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
  }

  const root = document.documentElement;
  const viewportWidth = root.clientWidth;
  // Ground truth first: if the document does not scroll horizontally, nothing renders past the
  // viewport, whatever an individual unclipped rect reports. This is the guard that keeps a
  // deliberate scroll container from reading as a broken layout.
  if (root.scrollWidth <= viewportWidth + 1) return [];

  function isRendered(el: Element): boolean {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  }

  function inScrollContainer(el: Element): boolean {
    for (let node = el.parentElement; node && node !== root; node = node.parentElement) {
      if (getComputedStyle(node).overflowX !== 'visible') return true;
    }
    return false;
  }

  function reportable(el: Element | null): boolean {
    if (!el || el === root) return false;
    if (!isRendered(el) || inScrollContainer(el)) return false;
    return el.getBoundingClientRect().right > viewportWidth + 1;
  }

  const all = Array.from(document.querySelectorAll('body, body *'));

  // An element whose own box clears the viewport while its parent's does not is where the overflow
  // originates; a nested descendant of an already-reported ancestor repeats the same fact.
  const boxOrigins = all.filter((el) => reportable(el) && !reportable(el.parentElement));

  // An element whose content is wider than its own box overflows even though its border box does
  // not, which is the bare-text and bleeding-pseudo-element case. The deepest such element is the
  // origin, and one that already contains a box origin has been named more precisely there.
  const contentCandidates = all.filter(
    (el) =>
      isRendered(el) &&
      !inScrollContainer(el) &&
      getComputedStyle(el).overflowX === 'visible' &&
      el.clientWidth > 0 &&
      el.scrollWidth > el.clientWidth + 1
  );
  const contentOrigins = contentCandidates.filter(
    (el) =>
      !contentCandidates.some((other) => other !== el && el.contains(other)) &&
      !boxOrigins.some((origin) => el.contains(origin))
  );

  // One finding per distinct signature, box origins first: several elements sharing a signature
  // repeat one layout fact, and a box origin names it more precisely than a content one.
  const findings = new Map<string, OverflowOrigin>();
  function record(el: Element, kind: OverflowOrigin['kind'], right: number): void {
    const key = signature(el);
    if (findings.has(key)) return;
    findings.set(key, { selector: key, right: Math.round(right), kind });
  }
  for (const el of boxOrigins) record(el, 'box', el.getBoundingClientRect().right);
  for (const el of contentOrigins) record(el, 'content', el.getBoundingClientRect().left + el.scrollWidth);
  return [...findings.values()];
}

export const viewportOverflow: RenderedRule = {
  id: 'viewport-overflow',
  tier: 'error',
  states: ['rest', 'menu-open'],
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    // Every rule registered for one interaction state shares one page in sequence (runRendered's
    // rule loop), so the original viewport is restored before returning.
    const original = ctx.page.viewportSize();
    const findings: RenderedFinding[] = [];
    try {
      for (const width of CHECK_WIDTHS) {
        await ctx.page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        const origins = await ctx.page.evaluate(findOverflowOrigins);
        for (const origin of origins) {
          const what = origin.kind === 'box' ? 'renders' : 'holds content';
          findings.push({
            ruleId: 'viewport-overflow',
            tier: 'error',
            selector: origin.selector,
            message: `${what} ${origin.right}px wide against a ${width}px viewport (overflows by ${origin.right - width}px)`,
          });
        }
      }
    } finally {
      if (original) await ctx.page.setViewportSize(original);
    }
    return findings;
  },
};
