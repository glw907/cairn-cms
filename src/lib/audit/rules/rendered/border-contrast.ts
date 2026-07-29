// cairn-audit's border-contrast rule: WCAG 1.4.11 non-text contrast (3:1) between a rendered
// border and the surfaces it separates. Advisory, and deliberately report-only by ruling, not by
// accident: the ratified `--cairn-card-border` hairline measures 1.11:1 in light and 1.43:1 in dark
// against the page's base-200 ambient (both numbers reproduced exactly by this rule's own fixtures
// against real Chromium). RULING 2 (Task 16b, 2026-07-28) settled the question spec 6.3 raised: the
// hairline stays as designed, the quiet edge is deliberate, and `check` below stops reporting the
// page's own `--cairn-card-border` while it still renders the way Geoff signed it off (see
// `RATIFIED_TOKEN` and `RATIFIED_HAIRLINE_FLOOR`). Do not loosen the floor or widen the exemption
// to make cairn's own admin quiet; every OTHER boundary still has to answer the measurement
// honestly, including a border that merely resolves to the same bytes as the ratified one, and
// including the ratified token itself wherever it stops separating anything.
//
// The identity half of that exemption is proved by DERIVATION, never by comparing colors. An
// adversarial pass refuted a byte-equality cut on cairn's own admin: `cairn-admin.css` declares
// `--color-base-300: oklch(30% 0.014 75)` and `--cairn-card-border: oklch(30% 0.014 75)` in the same
// dark block, so equality swallowed every `border-base-300` boundary in the dark theme (the shell's
// CMS pill, the media library's clear-selection button, RepeatableField, MediaHeroField) under a
// printed reason naming a ruling Geoff never made about them. A flat `border-base-300` on a floating
// surface is a hazard `stock-default-hazards` exists to flag, so silencing it is the exact inversion
// of this engine's job. The same cut also swallowed `static-admin-page.ts`'s separate `--border` and
// any hard-coded `rgb(235, 231, 226)`. `readBorderCandidates` therefore probes each candidate with a
// sentinel (see `RATIFIED_SENTINEL`) instead.
//
// Neither existing suppression idiom fits this exception, which is why it is a check inside the
// rule. `suppress.ts` resolves a directive against a source position and a rendered finding carries
// none, and the hairline is not one component's choice but every card recipe's shared token. The
// page+selector rendered allowlist is scoped to one selector on one named page, so it would need
// duplicating per page and would rot the moment a card's class list changed. What the exception
// does NOT get is silence: the finding is still constructed, still carries its measurement, and
// carries an `exemption` reason that routes it to the report's suppressed list, so every run prints
// the ruling and counts what it let through.
//
// The engine's own norms manifest carries the ruling too: `card`/`border-color` sits in
// `RATIFIED_NORMS` with this ruling as its reference, and `norms-manifest.json` records it as
// `ratified` with no `open-question` flag, so `cairn-audit norms card` prints the decision rather
// than a question. `checkManifestDisciplines` holds the two halves against each other in both
// directions, which is what makes that reconciliation a gate rather than a promise.
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
// NEITHER surface, and the badge-on-thumbnail case stops reporting because a 3.63 boundary is
// genuinely visible. The ratified hairline measures 1.11 outside and 1.19 against the card's own
// fill under that reading, which is the pair Ruling 2's exemption is bounded by, and it is still
// the pair the message prints for any border painted in that color WITHOUT the token.
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
  cumulativeOpacity,
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

/**
 * The custom property RULING 2 ratified. Never compared as a value: what qualifies a border is that
 * it is PAINTED THROUGH this property, which {@link RATIFIED_SENTINEL} decides per element.
 *
 * Two cuts failed here and both are worth keeping named. Hard-coding cairn's own resolved sRGB
 * bytes silenced any surface that landed on `rgb(235, 231, 226)` and silenced nothing for a
 * consumer whose Warm Stone re-tune moves the hairline a few hundredths in OKLCH, the population
 * mismatch `norms.ts`'s own `isTokenDerived` doc warns about in the same words. Reading the token
 * off the element and comparing THAT to the stroke fixed the consumer half and left the collision
 * half wide open, because a page is free to declare two properties with identical bytes, and
 * cairn's own dark theme does.
 */
const RATIFIED_TOKEN = '--cairn-card-border';

/**
 * The probe color the derivation test substitutes for {@link RATIFIED_TOKEN} on one element at a
 * time. A border derives from the token when, and only when, its computed color follows the
 * substitution; a border painted in any other property, or in a literal, does not move. That is a
 * question about the cascade rather than about color, so no two properties sharing a value can be
 * confused, and a consumer's re-tuned hairline still answers yes.
 *
 * The value only has to be one no page paints and the browser serializes back unchanged. It is set
 * inline, read, and removed inside a single synchronous pass, so nothing a later rule measures ever
 * sees it.
 */
const RATIFIED_SENTINEL = 'rgb(1, 2, 3)';

/**
 * The contrast the ratified hairline actually renders at, and the floor its exemption is gated on.
 * RULING 2 ratified a MEASUREMENT, not a color, so matching the token is necessary and not
 * sufficient: the exemption applies only while the boundary still reads at least this well against
 * one of the two surfaces it separates, which is the rule's own verdict shape ({@link RATIO_FLOOR})
 * evaluated at the ratified number instead of WCAG's.
 *
 * The measured pairs, reproduced by `rulings.border-contrast.test.ts` against real Chromium: light
 * 1.11 against the ambient beside it and 1.19 against the card's own fill; dark 1.43 and 1.20 on a
 * base-100 ambient, 1.33 and 1.20 on base-200. The card-fill pairing is the invariant one, since it
 * is two tokens against each other rather than against whatever surface a card lands on, so the
 * floor sits just under it. A colour-only exemption had no such bound and silenced the token
 * rendered at contrast 1.00 on BOTH sides, which is the divider-between-identical-rows case this
 * file's own header names as the defect the geometric rewrite exists to catch.
 */
const RATIFIED_HAIRLINE_FLOOR = 1.15;

/**
 * The reason the report prints beside a hairline this rule exempts. It has to stand on its own in a
 * CI log, so it names the ruling, the token the exemption keys on, and the measurement that
 * qualified this particular boundary; a reader who has never opened this file can tell from the
 * line what was let through and on whose authority.
 */
function ratifiedExemption(bestRatio: number): string {
  return (
    `RULING 2 (2026-07-28): painted in this page's own ${RATIFIED_TOKEN}, the ratified hairline, and still ` +
    `separating its two surfaces at ${bestRatio.toFixed(2)} (ratified floor ${RATIFIED_HAIRLINE_FLOOR})`
  );
}

/** One rendered border side, read before any color parsing happens. */
interface BorderSide {
  side: 'top' | 'right' | 'bottom' | 'left';
  /** The side's computed `border-*-color`, unparsed. */
  color: string;
  /** The paint chain just beyond this edge, from the hit-tested element outward. */
  outer: PaintLayer[];
  /** Whether `outer` came from the hit test rather than the DOM ancestor fallback. */
  outerSampled: boolean;
  /** Whether this side's color is painted through {@link RATIFIED_TOKEN}, by sentinel substitution. */
  tokenDerived: boolean;
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
  /**
   * Whether {@link RATIFIED_TOKEN} is declared at all where this element sits, so the exemption
   * still means "the hairline THIS admin declares" rather than "a property nobody defined". Read
   * per element rather than per page because a custom property inherits and can be re-declared on a
   * subtree, so the declaration that governs a card is the one that reaches the card.
   */
  declaresRatifiedToken: boolean;
}

/**
 * Runs inside the page. Playwright serializes this by source, so it stays self-contained: every
 * helper is nested and the shared measurement helpers are reached through the global the rule
 * installs before calling this.
 */
function readBorderCandidates(probe: { token: string; sentinel: string }): BorderContrastCandidate[] {
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

  /**
   * Which of `drawn`'s sides are painted through the ratified token, decided by substituting the
   * sentinel for it on this element and seeing which computed border colors follow. The inline
   * declaration wins over anything the cascade put on the element and is restored before the
   * function returns, including the rare case of an element that carried its own inline value.
   */
  function derivedSides(el: Element, drawn: { side: BorderSide['side']; color: string }[]): boolean[] {
    const inline = (el as HTMLElement).style;
    if (!inline || typeof inline.setProperty !== 'function') return drawn.map(() => false);
    const priorValue = inline.getPropertyValue(probe.token);
    const priorPriority = inline.getPropertyPriority(probe.token);
    inline.setProperty(probe.token, probe.sentinel, 'important');
    const probed = getComputedStyle(el);
    const bySide: Record<BorderSide['side'], string> = {
      top: probed.borderTopColor,
      right: probed.borderRightColor,
      bottom: probed.borderBottomColor,
      left: probed.borderLeftColor,
    };
    const derived = drawn.map(({ side }) => bySide[side] === probe.sentinel);
    if (priorValue === '') inline.removeProperty(probe.token);
    else inline.setProperty(probe.token, priorValue, priorPriority);
    return derived;
  }

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const canvas = helpers ? helpers.canvasColor() : '#ffffff';
  const results: BorderContrastCandidate[] = [];
  try {
    for (const el of document.querySelectorAll('*')) {
      if (!isPainted(el)) continue;
      const style = getComputedStyle(el);
      const drawn = drawnSides(style);
      if (drawn.length === 0) continue;
      const derived = derivedSides(el, drawn);
      const rect = el.getBoundingClientRect();
      window.scrollTo(
        Math.max(0, window.scrollX + rect.left + rect.width / 2 - window.innerWidth / 2),
        Math.max(0, window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2)
      );
      const sides: BorderSide[] = drawn.map(({ side, color }, index) => {
        const neighbor = neighborOn(el, side);
        return {
          side,
          color,
          outer: layersFor(neighbor ?? el.parentElement),
          outerSampled: neighbor !== null,
          tokenDerived: derived[index],
        };
      });
      results.push({
        selector: signature(el),
        sides,
        inner: layersFor(el),
        canvas,
        declaresRatifiedToken: style.getPropertyValue(probe.token).trim() !== '',
      });
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
    const candidates = await ctx.page.evaluate(readBorderCandidates, {
      token: RATIFIED_TOKEN,
      sentinel: RATIFIED_SENTINEL,
    });
    if (candidates.length === 0) return [];

    // Ruling 2's identity question was already answered in the page, by substitution, so nothing
    // here has to resolve the token as a color. That is the whole point: two properties holding the
    // same bytes are indistinguishable to any color comparison and distinguishable to this one.
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
        // Derivation joins the key so a side painted through the token and a side painted in a
        // literal of the same color never merge into one finding, which would hand one verdict two
        // different answers to Ruling 2's identity question.
        const key = `${side.color}|${side.tokenDerived}|${ground.kind === 'resolved' ? describeColor(ground.color) : ground.reason}`;
        const group = groups.get(key);
        if (group) group.sides.push(side.side);
        else groups.set(key, { sides: [side.side], index });
      });

      // `opacity` composites an element WITH its whole subtree, so an ancestor's dims this
      // element's stroke and fill exactly as much as it dims the ground the outward sample already
      // resolved through the same arithmetic. Reading only the element's own opacity left a
      // full-strength stroke over a washed-out ground: a hairline under an 8%-opacity ancestor,
      // which renders as a barely-there line, measured as if nothing had dimmed it.
      const chainOpacity = cumulativeOpacity(candidate.inner);
      for (const group of groups.values()) {
        const side = candidate.sides[group.index];
        const outer = grounds[group.index];
        if (outer.kind === 'indeterminate') {
          findings.push(indeterminateFinding('border-contrast', candidate.selector, outer.reason));
          continue;
        }
        // The surface INSIDE the border is the element's own fill over whatever is behind it, which
        // is the surface the outward sample just measured. Resolving it against the DOM ancestor
        // chain instead is what scored an overlaid badge against the card behind its thumbnail. The
        // fill carries the whole chain's opacity for the same reason the stroke does, so the layer
        // handed to `resolveGround` is the element's own with `chainOpacity` substituted for its own.
        const innerLayer = candidate.inner.slice(0, 1).map((layer) => ({ ...layer, opacity: chainOpacity }));
        const inner = resolveGround(innerLayer, innerColors.slice(0, 1), { canvas: outer.color });
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
        const alpha = stroke.a * chainOpacity;
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
        // How well the border reads against the better of the two surfaces it separates, which is
        // this rule's whole verdict shape and the quantity both floors below are applied to.
        const bestRatio = Math.max(outerRatio, innerRatio);
        if (bestRatio >= RATIO_FLOOR) continue;

        // RULING 2, applied last because it is a claim about a MEASUREMENT and not only about
        // which property paints the line: the page declares the hairline, this side is painted
        // THROUGH it (proved in-page by sentinel substitution, never by comparing bytes), and it
        // still separates its two surfaces at least as well as the rendering Geoff signed off on.
        // Any of those three failing reports the finding plainly: a different token or a literal
        // that happens to resolve to the same bytes, the token dimmed by an ancestor's `opacity`,
        // and, the case a colour-only exemption silenced, the ratified token used where it
        // separates nothing (both surfaces at 1.00, invisible to any eye).
        //
        // Passing all three suppresses the finding rather than skipping it. The measurement below
        // is written the same either way, because the ruling exempts a boundary from GATING, never
        // from being measured honestly.
        const ratified =
          candidate.declaresRatifiedToken && side.tokenDerived && bestRatio >= RATIFIED_HAIRLINE_FLOOR;

        findings.push({
          ruleId: 'border-contrast',
          tier: 'advisory',
          selector: candidate.selector,
          ...(ratified ? { exemption: ratifiedExemption(bestRatio) } : {}),
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
