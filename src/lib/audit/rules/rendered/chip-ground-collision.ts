// cairn-audit's chip-ground-collision rule: a chip's own painted background has to read as
// distinct from the background of whatever it sits on, the "badge-ghost melting into the zebra
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
import { contrastRatio, describeColor, indeterminateFinding, resolveGround, type PaintLayer } from '../../color.js';

/**
 * Below this contrast ratio, a chip's composited fill and the ground behind it are close enough
 * to read as the same color. Not the WCAG text floor (4.5) or the non-text boundary floor (3.0,
 * `border-contrast`'s own number): this rule is not proving legibility, only that the chip is not
 * accidentally camouflaged against its own row, the same "not camouflaged" bar the graduated
 * `interactive-contrast` probe set for a control's text against its own background.
 */
const RATIO_FLOOR = 1.5;

/** Below this alpha, a chip's own background-color is treated as no fill at all. */
const NO_FILL_ALPHA = 0.02;

/** One chip's raw paint data, read in-browser and left unparsed. */
interface ChipGroundCandidate {
  selector: string;
  /** The chip's own paint layer, first, then every ancestor's up to the document root. */
  layers: PaintLayer[];
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

  const chips: ChipGroundCandidate[] = [];
  for (const el of document.querySelectorAll('*')) {
    if (!isPainted(el)) continue;
    const style = getComputedStyle(el);
    const isChip = el.classList.contains('badge') || (isPillShaped(el, style) && (el.textContent ?? '').trim() !== '');
    if (!isChip) continue;
    const classes = Array.from(el.classList).slice(0, 4).join('.');
    chips.push({
      selector: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${classes ? `.${classes}` : ''}`,
      layers: layersFor(el),
    });
  }
  return { canvas: helpers ? helpers.canvasColor() : null, chips };
}

/**
 * A chip's own painted background must read as distinct from whatever it sits on. Error tier: a
 * false negative ships a chip that reads as blank against its row (the StatusChip evidence line,
 * `badge-ghost` melting into a zebra stripe), and a false positive would flag the correct
 * `badge-outline` pattern (see the file header), so a chip with no fill of its own is skipped
 * rather than compared.
 */
export const chipGroundCollision: RenderedRule = {
  id: 'chip-ground-collision',
  tier: 'error',
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
      const backdrop = ground.kind === 'resolved' ? ground.color : canvas;
      const own = resolveGround(candidate.layers.slice(0, 1), colors.slice(0, 1), { canvas: backdrop });
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
      if ((colors[0]?.a ?? 0) * candidate.layers[0].opacity < NO_FILL_ALPHA) continue;

      const ratio = contrastRatio(own.color, ground.color);
      if (ratio >= RATIO_FLOOR) continue;

      findings.push({
        ruleId: 'chip-ground-collision',
        tier: 'error',
        selector: candidate.selector,
        message:
          `chip background ${describeColor(own.color)} reads as indistinguishable from its row ` +
          `background ${describeColor(ground.color)} (contrast ${ratio.toFixed(2)}, floor ${RATIO_FLOOR})`,
      });
    }
    return findings;
  },
};
