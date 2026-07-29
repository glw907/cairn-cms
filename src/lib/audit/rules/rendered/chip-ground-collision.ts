// cairn-audit's chip-ground-collision rule: a chip's own painted background must not be
// CAMOUFLAGED against the background of whatever it sits on, the "badge-ghost melting into the zebra
// stripe" failure StatusChip's own header comment documents and the static stock-default-hazards
// rule catches only by class name (a rewritten equivalent could still collide). This rule proves
// the actual rendered result instead of trusting a class name: it composites the chip's own
// background over the ambient color behind it (the admin runs both zebra and plain table rows, so
// there is no single "row background" constant to compare against) and measures whether the two
// are still distinguishable.
//
// A chip with no fill of its own (StatusChip's `badge-outline`, alpha 0 on its own
// background-color, its border carries the tone instead) has nothing to collide with by
// definition: the ambient color shows straight through it, which is the deliberate outcome
// `badge-outline` was chosen for. Border-vs-ground contrast is a different question (WCAG 1.4.11,
// the advisory `border-contrast` rule); this rule only ever compares a chip's own FILL against its
// ground, so a filled-but-see-through chip is skipped rather than flagged.
//
// Four failures demonstrated against the real admin, all closed here and all fixture-covered in
// browser-regressions.test.ts:
//
//  1. The color parser matched `rgb()` only, and the built admin sheet contains zero `rgb()`
//     background declarations against 82 oklch token references. The rule could not fire against
//     the shipped admin at all: the exact `badge-ghost`-on-zebra collision named in this header
//     passed it with zero findings against the real stylesheet, and a half-parsed chain
//     manufactured a confident pass by scoring a chip against a fallback white. Colors now go
//     through the shared canvas normalizer.
//  2. `opacity` was tested for exactly zero and never composited, so a chip painted at 4% opacity
//     was scored as an opaque fill. Opacity now multiplies down the whole layer chain.
//  3. The `.badge` selector missed cairn's own unclassed pills. Seven shipped sites
//     (CairnMediaLibrary, VocabularyAdmin, CairnTidySettings) render a filled `rounded-full`
//     chip carrying no daisyUI badge class at all. "Chip" is now a RENDERED shape rather than a
//     class name, which is the same reason this rule reads paint instead of markup: a pill-radius,
//     chip-height, filled, text-carrying element is a chip whatever it is called.
//  4. The chip's own translucent fill was resolved against an assumed white canvas rather than
//     against the ground it paints on, so a 90%-alpha chip came back lightened by that white. Under
//     a light ground the assumption is close enough to leave the verdict intact, which is why the
//     light half kept firing while both real dark-theme collisions on /admin/media and
//     /admin/vocabulary went silent at a manufactured 1.51 against a true 1.11. The backdrop is now
//     required by `resolveGround` rather than defaulted, and the chip's fill resolves onto its own
//     ground.
//  5. The chip's fill was resolved at the chip's OWN opacity while its ground was resolved at the
//     whole chain's, so an ancestor `opacity` washed out one side of the comparison and not the
//     other: a chip under a 25%-opacity wrapper measured 4.4:1 where the painted pixels, read off a
//     screenshot, measure 1.18:1. The chip's own color is now the WHOLE chain resolved onto the
//     canvas, and `resolveGround` itself was corrected to composite a subtree before dimming it,
//     which is what `opacity` actually does.
//  6. The ground was taken from the ancestor chain even where something else paints behind the
//     chip. `CairnMediaLibrary` renders its usage chip as an absolutely positioned sibling of the
//     thumbnail `<img>`, so the rule composited the card fill and reported a constant 1.06 error on
//     a chip measuring 12.98 against the image it actually sits on. An overlapping painter outside
//     the chip's own ancestors now makes the ground indeterminate, which is advisory, because
//     "cannot measure" is a different claim from "this collides".
//
// Only the `rest` state is read (no interaction reveals or hides a chip's own background), so no
// `states` field is declared; the runner's default `['rest']` already covers this rule.
import {
  ensurePageHelpers,
  resolveColors,
  type RenderedFinding,
  type RenderedRule,
  type RenderedRuleContext,
} from '../../rendered.js';
import {
  contrastRatio,
  cumulativeOpacity,
  describeColor,
  indeterminateFinding,
  resolveGround,
  type PaintLayer,
} from '../../color.js';

/**
 * Below this contrast ratio, a chip's composited fill and the ground behind it are close enough
 * to read as the same color. RATIFIED (Task 16b ruling 3, Geoff, 2026-07-28): spec 6.3 named no
 * number here, a builder borrowed this value from `interactive-contrast`'s own probe-derived floor,
 * and Geoff confirmed the borrow on review rather than leaving it as an open question. The shared
 * rationale, now on the record so neither rule re-litigates it: both rules test "not accidentally
 * camouflaged," and neither is a contrast standard. Legibility is WCAG 1.4.3 Contrast (Minimum),
 * AA, at 4.5:1 for normal text and 3:1 for large, and NO rule in this engine measures it. Do not
 * redirect a reader to `border-contrast` for it, which an earlier draft of this paragraph did: that
 * rule measures a border stroke against the surfaces it separates and never measures text at all.
 * This 1.5 sits well under every one of those numbers and never tries to clear one. The admin's own
 * measured chip collisions run 1.01 to 1.12, far below all of them, so the floor is not a close call
 * in practice.
 *
 * WHAT THIS RULE STILL DOES NOT PROVE about a chip, worth naming because the number invites the
 * assumption: not its label's contrast against its own fill (1.4.3), and not its status cue, which
 * engages 1.4.1 Use of Color (Level A) where hue alone carries the state and 1.4.11 Graphical
 * Objects at 3:1 where the fill is what identifies it. None of the three is checked anywhere here.
 *
 * The number is LOAD-BEARING, not a rounding nicety, and this pass demonstrated why: the
 * always-opaque canvas default this file's header describes (closed by making
 * `GroundOptions.canvas` required in `color.ts`) manufactured a measured ratio of 1.514 against
 * this exact 1.5 line, one hundredth over it, and that one hundredth silently took two real
 * collisions (chips measuring 1.11 and 1.12 against their own ground, both invisible to a sighted
 * user) out of the report while every other gate stayed green. `rulings.chip-ground-collision.test.ts`
 * pins this line against real Chromium from both sides: an opaque pair one sRGB channel step either
 * side of 1.5 pins the NUMBER, and a translucent chip over a ground the page canvas differs from
 * pins the ARITHMETIC that feeds it. The second fixture is the one that matters for drift. The
 * opaque pair cannot see a canvas change at all, so with it alone the exact one-line edit this
 * paragraph describes could be reintroduced and the whole suite stayed green.
 */
const RATIO_FLOOR = 1.5;

/** Below this alpha, a chip's own background-color is treated as no fill at all. */
const NO_FILL_ALPHA = 0.02;

/** One chip's raw paint data, read in-browser and left unparsed. */
interface ChipGroundCandidate {
  selector: string;
  /** The chip's own paint layer, first, then every ancestor's up to the document root. */
  layers: PaintLayer[];
  /**
   * How an element outside the chip's own ancestor chain paints behind it, when one does; `null`
   * when the ancestor chain really is what the chip sits on.
   */
  overlaps: string | null;
}

/** Every chip on the page, with the one canvas color all of their chains resolve onto. */
interface ChipGroundReading {
  /** `null` when the shared page helpers are not installed, which leaves the canvas unmeasured. */
  canvas: string | null;
  chips: ChipGroundCandidate[];
}

/**
 * Runs inside the page. Playwright serializes this by source, so it stays self-contained: every
 * helper is nested and no constant is referenced from module scope.
 *
 * A chip is daisyUI's `.badge`, or any element that RENDERS as one: a pill (every corner rounded to
 * at least half the box height), no taller than a chip, carrying text and a background of its own.
 * Reading the shape rather than the class name is the same discipline that makes this a rendered
 * rule at all, and it is what reaches the seven filled `rounded-full` pills the admin ships with no
 * badge class.
 */
function readChipGrounds(): ChipGroundReading {
  const CHIP_MAX_HEIGHT = 32;
  const helpers = globalThis.__cairnAudit;

  function isPainted(el: Element): boolean {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isPillShaped(el: Element, style: CSSStyleDeclaration): boolean {
    const rect = el.getBoundingClientRect();
    if (rect.height > CHIP_MAX_HEIGHT) return false;
    const radii = [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius,
    ];
    return radii.every((radius) => {
      const value = Number.parseFloat(radius);
      return !Number.isNaN(value) && value >= rect.height / 2 - 0.5;
    });
  }

  function layersFor(el: Element): PaintLayer[] {
    if (helpers) return helpers.paintLayers(el);
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

  // What paints behind a chip is its ancestor chain ONLY while nothing else is layered under it.
  // The admin's own media grid breaks that: `CairnMediaLibrary` renders the usage chip as an
  // absolutely positioned SIBLING of the thumbnail `<img>`, so the pixels behind it belong to the
  // image and no ancestor carries them. The rule composited the card fill instead and reported a
  // constant 1.06 collision on a chip that measures 12.98 against the thumbnail, at error tier, on
  // every media row whatever the image contains. An element painting content this arithmetic cannot
  // read (a replaced element, or a background-image) that overlaps the chip's own box and is not in
  // its ancestor chain is named here, and the rule reports the measurement as impossible rather
  // than answering it with a ground that is not there.
  // Collected once for the whole page rather than per chip: the second half needs a computed style
  // per element, and running that inside the chip loop is a full-document style read per chip.
  const painters: { el: Element; rect: DOMRect; what: string }[] = [];
  for (const el of document.querySelectorAll('img, video, canvas, svg, picture, object, iframe')) {
    if (isPainted(el)) painters.push({ el, rect: el.getBoundingClientRect(), what: `a <${el.tagName.toLowerCase()}>` });
  }
  for (const el of document.querySelectorAll('*')) {
    if (getComputedStyle(el).backgroundImage === 'none' || !isPainted(el)) continue;
    painters.push({ el, rect: el.getBoundingClientRect(), what: 'an element painting a background-image' });
  }

  // THE PAINTER SET IS WIDER THAN THE CASE IT WAS BUILT FOR, and every widening here turns a gating
  // finding into a non-gating one, so state the breadth. daisyUI v5 paints `--btn-noise` as a
  // background-image on every `.btn` (`color.ts` reads the same fact from the other side), so every
  // button in the admin joins this list, as does every inline `<svg>` from `admin-icons.ts`. The
  // test below is a 2D bounding-box intersection with no z-order or paint-order reading, so any chip
  // whose box happens to intersect a button's or an icon's downgrades to an advisory "could not
  // measure": a count badge positioned over a `.btn`, or a `join` group sharing a row band with one.
  // Narrowing this (requiring the painter to sit earlier in paint order, or restricting the
  // background-image half to elements whose own background-color is fully transparent) is a real
  // repair and is filed in ROADMAP; it is not taken here because loosening a gating rule's downgrade
  // path deserves its own adversarial pass rather than a gate-stage edit.
  function overlappingPainter(el: Element): string | null {
    const rect = el.getBoundingClientRect();
    for (const painter of painters) {
      if (painter.el === el || painter.el.contains(el) || el.contains(painter.el)) continue;
      const other = painter.rect;
      if (other.left >= rect.right || rect.left >= other.right) continue;
      if (other.top >= rect.bottom || rect.top >= other.bottom) continue;
      return `${painter.what} outside this chip's own ancestors paints behind it`;
    }
    return null;
  }

  const chips: ChipGroundCandidate[] = [];
  for (const el of document.querySelectorAll('*')) {
    if (!isPainted(el)) continue;
    const style = getComputedStyle(el);
    const isChip = el.classList.contains('badge') || (isPillShaped(el, style) && (el.textContent ?? '').trim() !== '');
    if (!isChip) continue;
    chips.push({
      // The shared page helpers name an element the one way every rendered rule names it, escaped
      // so the rendered allowlist can probe the selector. The hand-rolled copy this replaced could
      // emit a Tailwind variant class the browser refuses to parse.
      selector: helpers ? helpers.signature(el) : el.tagName.toLowerCase(),
      layers: layersFor(el),
      overlaps: overlappingPainter(el),
    });
  }
  return { canvas: helpers ? helpers.canvasColor() : null, chips };
}

/**
 * A chip's own painted background must not be camouflaged against whatever it sits on. At 1.5:1 two
 * surfaces are not distinct, only not identical, so "not camouflaged" is the verb throughout and
 * "distinct" is the overstatement it replaced. A false negative ships a chip that reads as blank
 * against its row (the StatusChip evidence line, `badge-ghost` melting into a zebra stripe), and a
 * false positive would flag the correct `badge-outline` pattern (see the file header), so a chip
 * with no fill of its own is skipped rather than compared.
 *
 * DEMOTED TO ADVISORY (Task 3, ruling 3, corpus C, Geoff 2026-07-28): the formula produced 24 false
 * errors of 40 on the first consumer admin it measured, because it has no chroma term and cannot
 * see hue, so a hue-distinct chip a sighted user reads as plainly bounded still flags. As coded it
 * cannot serve as a consumer gate. This is a tier change only; the formula is untouched, and the
 * chroma-aware repair is filed in ROADMAP behind its own adversarial pass (per the Pass 2
 * discipline: a gating rule's repair earns its own pass rather than a gate-stage patch). Sequencing
 * also argued for demoting first: ruling 1 moved the rule's own domain (the chip recipe StatusChip
 * ships), and repairing the formula before that recipe settled would have fit it twice. The
 * repair re-promotes this rule to error on re-measured evidence.
 */
export const chipGroundCollision: RenderedRule = {
  id: 'chip-ground-collision',
  tier: 'advisory',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ensurePageHelpers(ctx.page);
    const reading = await ctx.page.evaluate(readChipGrounds);
    if (reading.chips.length === 0) return [];

    // The canvas leads the batch so it goes through the same normalizer as every layer color, and
    // an unreadable canvas is reported rather than replaced by a guess: assuming white is the
    // defect this rule is recovering from.
    const flat = [
      reading.canvas ?? '',
      ...reading.chips.flatMap((candidate) => candidate.layers.map((layer) => layer.backgroundColor)),
    ];
    const resolved = await resolveColors(ctx.page, flat);
    const canvas = resolved[0];
    if (!canvas) {
      return [
        indeterminateFinding(
          'chip-ground-collision',
          'html',
          `the page canvas color could not be read (${reading.canvas ?? 'the shared page helpers are not installed'}), ` +
            `so no chip on this page has a known backdrop to resolve against`
        ),
      ];
    }

    const findings: RenderedFinding[] = [];
    let cursor = 1;
    for (const candidate of reading.chips) {
      const colors = resolved.slice(cursor, cursor + candidate.layers.length);
      cursor += candidate.layers.length;

      // The ground comes first because the chip's own fill resolves ONTO it. Resolving that fill
      // against the page canvas instead handed back the chip lightened by an assumed white, which
      // is only harmless when the ground is itself near-white: in dark theme it lifted a 1.11
      // collision to a passing 1.51 and reported the chip clean.
      const ground = resolveGround(candidate.layers.slice(1), colors.slice(1), {
        canvas,
        firstLayerIs: 'ancestor',
      });
      // The chip's own painted color is its WHOLE chain resolved onto the canvas, chip layer
      // included, not its fill sliced out and resolved against the ground. The slice was the first
      // fix for an assumed-white canvas and it carried its own error: an ancestor's `opacity` is a
      // group operation, so slicing dropped it from the chip while leaving it in the ground, and a
      // chip under a 25%-opacity wrapper measured 4.4 where the painted pixels measure 1.18.
      const own = resolveGround(candidate.layers, colors, { canvas });
      // The chip's own layer is reported first when both are unmeasurable, so a gradient the chip
      // paints on itself is named as its own rather than as an ancestor's.
      if (own.kind === 'indeterminate') {
        findings.push(indeterminateFinding('chip-ground-collision', candidate.selector, own.reason));
        continue;
      }
      if (ground.kind === 'indeterminate') {
        findings.push(indeterminateFinding('chip-ground-collision', candidate.selector, ground.reason));
        continue;
      }
      // A chip with no fill of its own shows the ground straight through, which is what
      // `badge-outline` is for. `own.color` is the ground itself in that case, so the unresolved
      // alpha, not the returned color, is what answers "was there a fill at all".
      if ((colors[0]?.a ?? 0) * cumulativeOpacity(candidate.layers) < NO_FILL_ALPHA) continue;
      // Reported after the fill test so a see-through chip over a thumbnail stays the non-finding
      // it already was, and before the ratio so no number is printed for a ground that is not the
      // one painting there.
      if (candidate.overlaps) {
        findings.push(indeterminateFinding('chip-ground-collision', candidate.selector, candidate.overlaps));
        continue;
      }

      const ratio = contrastRatio(own.color, ground.color);
      if (ratio >= RATIO_FLOOR) continue;

      findings.push({
        ruleId: 'chip-ground-collision',
        tier: chipGroundCollision.tier,
        selector: candidate.selector,
        message:
          `chip background ${describeColor(own.color)} reads as indistinguishable from its row ` +
          `background ${describeColor(ground.color)} (contrast ${ratio.toFixed(2)}, floor ${RATIO_FLOOR})`,
      });
    }
    return findings;
  },
};
