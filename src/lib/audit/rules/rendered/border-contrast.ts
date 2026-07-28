// cairn-audit's border-contrast rule: WCAG 1.4.11 non-text contrast (3:1) between a rendered
// border and the surfaces it separates. Advisory, and deliberately report-only by ruling, not by
// accident: the ratified `--cairn-card-border` hairline measures 1.11:1 in light and 1.43:1 in dark
// against the page's base-200 ambient (both numbers reproduced exactly by this rule's own fixtures
// against real Chromium), and whether that hairline stays as designed or tightens is an open
// question on the design owner's queue, spec section 6.3. This rule exists to answer the
// measurement honestly, not to pass cairn's own admin: do not allowlist the hairline into silence
// and do not loosen the floor to make the fixture pass. The finding count this rule produces
// against the shipped admin is itself the input the ruling needs.
//
// A BORDER SEPARATES TWO SURFACES, and both are measured. The first cut measured one, the element's
// DOM PARENT chain, on the evidence that this reading reproduces the two ratified numbers. It does
// reproduce them, but only because a card's parent chain HAPPENS to be what its border is adjacent
// to. An adversarial pass measured the rendered pixels either side of 124 bordered elements per
// theme on the shipped admin and found 21 whose rule ground was not the surface painted beside the
// border at all, six of them flipping the verdict: `/admin/media`'s type badge is overlaid on a
// thumbnail, and its border was scored against the card fill behind the thumbnail (1.15 reported,
// 3.63 actual). The mirror case was worse: a divider between two opaque table rows, whose painted
// contrast is 1.00 and which no user can see, reported clean, because neither adjacent row is in
// the element's ancestor chain.
//
// So adjacency is read GEOMETRICALLY: hit-test a point just beyond each border edge, and resolve
// the ground from whatever element actually paints there. The INSIDE surface is the element's own
// fill, which fixes a third demonstrated defect: `background-clip` defaults to `border-box`, so an
// element's own fill paints under its own border, and compositing a translucent stroke over the
// ancestor instead reported a border 27% off what the pixels show, on the 35 translucent-bordered
// elements `/admin/posts` alone ships.
//
// The verdict is that a border renders no visible boundary when it clears the floor against
// NEITHER surface. The ratified hairline still reports under that reading (1.11 outside, 1.19
// against the card's own fill), so the number on record survives in the message, and the
// badge-on-thumbnail case stops reporting because a 3.63 boundary is genuinely visible.
//
// Hit testing is viewport-relative, so the window scrolls each candidate into view and scrolls back
// afterward. It scrolls the WINDOW, never `scrollIntoView`, which would also move any scrollable
// ancestor and leave a page the following rules could not measure the way they expected. A
// candidate the hit test still cannot reach (inside a sub-scroller, off-screen) falls back to the
// DOM ancestor chain and SAYS so in the finding, which is the honest form of a fallback.
import {
  ensurePageHelpers,
  resolveColors,
  type RenderedFinding,
  type RenderedRule,
  type RenderedRuleContext,
} from '../../rendered.js';
import {
  composite,
  contrastRatio,
  describeColor,
  indeterminateFinding,
  OPAQUE_WHITE,
  resolveGround,
  type PaintLayer,
} from '../../color.js';

/**
 * WCAG 1.4.11's non-text contrast floor for a UI component boundary. Not the 4.5:1 text floor and
 * not `chip-ground-collision`'s 1.5 "not camouflaged" bar: this rule proves the specific numeric
 * requirement the standard states for a graphical boundary, which is why it is the one rule in
 * this family allowed to cite a ratio below 3.0 as a plain, unqualified finding rather than a
 * softened one.
 */
const RATIO_FLOOR = 3;

/** Below this alpha, a border is not a rendered boundary at all, the same reasoning as a chip with no fill. */
const NO_BORDER_ALPHA = 0.02;

/** One rendered border side, read before any color parsing happens. */
interface BorderSide {
  side: 'top' | 'right' | 'bottom' | 'left';
  /** The side's computed `border-*-color`, unparsed. */
  color: string;
  /** The paint chain just beyond this edge, from the hit-tested element outward. */
  outer: PaintLayer[];
  /** Whether `outer` came from the hit test rather than the DOM ancestor fallback. */
  outerSampled: boolean;
}

/** One element's rendered borders, read in-browser and left unparsed. */
interface BorderContrastCandidate {
  selector: string;
  /** Every side that actually renders: a width past the sub-pixel floor and a drawn style. */
  sides: BorderSide[];
  /** The paint chain just inside the border, starting with the element's own fill. */
  inner: PaintLayer[];
  /** The page canvas, as a CSS color string, for each chain to resolve onto. */
  canvas: string;
}

/**
 * Runs inside the page. Playwright serializes this by source, so it stays self-contained: every
 * helper is nested and the shared measurement helpers are reached through the global the rule
 * installs before calling this.
 */
function readBorderCandidates(): BorderContrastCandidate[] {
  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());
  const isPainted = (el: Element) => (helpers ? helpers.isVisible(el) : true);

  function layersFor(el: Element | null): PaintLayer[] {
    if (helpers && el) return helpers.paintLayers(el);
    const layers: PaintLayer[] = [];
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      layers.push({
        backgroundColor: style.backgroundColor,
        opacity: Number(style.opacity),
        hasImage: style.backgroundImage !== 'none',
      });
    }
    return layers;
  }

  function drawnSides(style: CSSStyleDeclaration): { side: BorderSide['side']; color: string }[] {
    // `border-image` paints OVER `border-color`, so the computed color is not what renders at all.
    // A near-white border under a black gradient border image reported 1.01 where the painted
    // pixel measures 21:1.
    if (style.borderImageSource !== 'none') return [];
    const raw: [BorderSide['side'], string, string, string][] = [
      ['top', style.borderTopWidth, style.borderTopStyle, style.borderTopColor],
      ['right', style.borderRightWidth, style.borderRightStyle, style.borderRightColor],
      ['bottom', style.borderBottomWidth, style.borderBottomStyle, style.borderBottomColor],
      ['left', style.borderLeftWidth, style.borderLeftStyle, style.borderLeftColor],
    ];
    // A sub-pixel width is not filtered out. It was reported as a defect worth closing, on the
    // reasoning that `border-width: 0.05px` renders nothing; measured against Chromium, the
    // computed value of `0.05px` is `1px`, and it paints. There is no sub-pixel case to exclude.
    return raw
      .filter(([, width, borderStyle]) => {
        const value = Number.parseFloat(width);
        return Number.isFinite(value) && value > 0 && borderStyle !== 'none' && borderStyle !== 'hidden';
      })
      .map(([side, , , color]) => ({ side, color }));
  }

  /** The element painting just beyond `el`'s border on `side`, by hit test; `null` when unsampleable. */
  function neighborOn(el: Element, side: BorderSide['side']): Element | null {
    const rect = el.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const midY = rect.top + rect.height / 2;
    let point: { x: number; y: number };
    switch (side) {
      case 'top':
        point = { x: midX, y: rect.top - 1 };
        break;
      case 'bottom':
        point = { x: midX, y: rect.bottom + 1 };
        break;
      case 'left':
        point = { x: rect.left - 1, y: midY };
        break;
      default:
        point = { x: rect.right + 1, y: midY };
    }
    if (point.x < 0 || point.y < 0 || point.x > window.innerWidth || point.y > window.innerHeight) return null;
    const hits = document.elementsFromPoint(point.x, point.y).filter((hit) => !el.contains(hit));
    return hits[0] ?? null;
  }

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const canvas = helpers ? helpers.canvasColor() : '#ffffff';
  const results: BorderContrastCandidate[] = [];
  try {
    for (const el of document.querySelectorAll('*')) {
      if (!isPainted(el)) continue;
      const drawn = drawnSides(getComputedStyle(el));
      if (drawn.length === 0) continue;
      const rect = el.getBoundingClientRect();
      window.scrollTo(
        Math.max(0, window.scrollX + rect.left + rect.width / 2 - window.innerWidth / 2),
        Math.max(0, window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2)
      );
      const sides: BorderSide[] = drawn.map(({ side, color }) => {
        const neighbor = neighborOn(el, side);
        return { side, color, outer: layersFor(neighbor ?? el.parentElement), outerSampled: neighbor !== null };
      });
      results.push({ selector: signature(el), sides, inner: layersFor(el), canvas });
    }
  } finally {
    window.scrollTo(scrollX, scrollY);
  }
  return results;
}

/**
 * A rendered border must read at {@link RATIO_FLOOR} against at least one of the two surfaces it
 * separates. Advisory, and never gates by construction (see the file header): the finding is honest
 * measurement, not a verdict on whether `--cairn-card-border` should change.
 */
export const borderContrast: RenderedRule = {
  id: 'border-contrast',
  tier: 'advisory',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ensurePageHelpers(ctx.page);
    const candidates = await ctx.page.evaluate(readBorderCandidates);
    if (candidates.length === 0) return [];

    const flat = candidates.flatMap((candidate) => [
      candidate.canvas,
      ...candidate.sides.map((side) => side.color),
      ...candidate.sides.flatMap((side) => side.outer.map((layer) => layer.backgroundColor)),
      ...candidate.inner.map((layer) => layer.backgroundColor),
    ]);
    const resolved = await resolveColors(ctx.page, flat);

    const findings: RenderedFinding[] = [];
    let cursor = 0;
    const take = (count: number) => resolved.slice(cursor, (cursor += count));

    for (const candidate of candidates) {
      const canvas = take(1)[0] ?? OPAQUE_WHITE;
      const sideColors = take(candidate.sides.length);
      const outerColors = candidate.sides.map((side) => take(side.outer.length));
      const innerColors = take(candidate.inner.length);

      // Sides sharing one computed color and one RESOLVED neighbor surface are one visual boundary,
      // not four findings; reporting per side would quadruple every uniform-border component's
      // count for no added information. Grouping on the resolved color rather than the raw layer
      // chain matters, because two sides of one card routinely hit-test different elements that
      // paint the same surface: a top margin collapsing out of `<body>` puts the root element under
      // the top edge and the body under the other three.
      //
      // The outer chain never starts with the audited element, so an unresolvable ground there is
      // always someone else's paint. Wording it as the element's own was a reporting defect the
      // slice-by-one idiom introduced: a gradient on the immediate parent read as "the element
      // paints its own background-image".
      const grounds = candidate.sides.map((side, index) =>
        resolveGround(side.outer, outerColors[index], { canvas, firstLayerIs: 'ancestor' })
      );
      const groups = new Map<string, { sides: BorderSide['side'][]; index: number }>();
      candidate.sides.forEach((side, index) => {
        const ground = grounds[index];
        const key = `${side.color}|${ground.kind === 'resolved' ? describeColor(ground.color) : ground.reason}`;
        const group = groups.get(key);
        if (group) group.sides.push(side.side);
        else groups.set(key, { sides: [side.side], index });
      });

      const ownOpacity = Number.isFinite(candidate.inner[0]?.opacity) ? candidate.inner[0].opacity : 1;
      for (const group of groups.values()) {
        const side = candidate.sides[group.index];
        const outer = grounds[group.index];
        if (outer.kind === 'indeterminate') {
          findings.push(indeterminateFinding('border-contrast', candidate.selector, outer.reason));
          continue;
        }
        // The surface INSIDE the border is the element's own fill over whatever is behind it, which
        // is the surface the outward sample just measured. Resolving it against the DOM ancestor
        // chain instead is what scored an overlaid badge against the card behind its thumbnail.
        const inner = resolveGround(candidate.inner.slice(0, 1), innerColors.slice(0, 1), { canvas: outer.color });
        if (inner.kind === 'indeterminate') {
          findings.push(indeterminateFinding('border-contrast', candidate.selector, inner.reason));
          continue;
        }

        const stroke = sideColors[group.index];
        if (!stroke) {
          findings.push(
            indeterminateFinding(
              'border-contrast',
              candidate.selector,
              `the browser could not resolve the ${group.sides.join('/')} border color (${side.color})`
            )
          );
          continue;
        }
        const alpha = stroke.a * ownOpacity;
        // A border painted at negligible alpha is not a rendered boundary to measure, the same
        // "no fill, nothing to collide with" reasoning chip-ground-collision applies to a chip
        // with a transparent background.
        if (alpha < NO_BORDER_ALPHA) continue;

        // `background-clip: border-box` is the default, so the border band paints over the
        // element's OWN fill. The pixel a user sees is the stroke composited onto that fill, not
        // onto the ancestor behind it: a 5%-white stroke on a white card reads white (21:1 against
        // a black page), and compositing it over the ancestor reported 1.08.
        const painted = composite({ ...stroke, a: alpha }, inner.color);
        const outerRatio = contrastRatio(painted, outer.color);
        const innerRatio = contrastRatio(painted, inner.color);
        if (Math.max(outerRatio, innerRatio) >= RATIO_FLOOR) continue;

        findings.push({
          ruleId: 'border-contrast',
          tier: 'advisory',
          selector: candidate.selector,
          message:
            `${group.sides.join('/')} border ${describeColor(painted)} reads at contrast ${outerRatio.toFixed(2)} ` +
            `against the surface beside it ${describeColor(outer.color)}` +
            `${side.outerSampled ? '' : ' (its DOM ancestor: the adjacent surface could not be sampled)'}` +
            `, and ${innerRatio.toFixed(2)} against its own fill ${describeColor(inner.color)}, so it renders no ` +
            `visible boundary on either side (floor ${RATIO_FLOOR}, WCAG 1.4.11)`,
        });
      }
    }
    return findings;
  },
};
