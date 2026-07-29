// cairn-audit's interactive-contrast rule: an interactive element's own text color has to read
// against whatever actually paints behind it, not the white the browser falls back to when nothing
// upstream declares a background. This graduates the numeric probe from
// scripts/check-interactive-contrast.mjs (the 2026-07-17 Waymark final design review audit's
// invisible-CTA lesson: a control that technically renders but reads as blank against its own
// ground until hovered or selected). The floor, 1.5, is deliberately looser than the WCAG text
// floor (4.5 normal text, 3.0 large text): this rule is not proving legibility, only that a control
// is not accidentally camouflaged against itself.
//
// Composited matters, which is the whole reason this is a RENDERED rule and not a static one: an
// element's own background-color is very often transparent (a button that inherits its card's
// paint, a link with no background of its own), so the ground under its text is whatever the
// nearest opaque ancestor, walking up from the element itself, actually resolves to. The DOM walk
// that answers this can only happen in a live browser; the arithmetic does not need one, so the
// browser half reads raw color strings and every measurement runs back in Node against
// `../../color.js`, reachable by a unit test with no browser in the loop.
//
// Four failures an adversarial pass demonstrated against real Chromium, all closed here and all
// fixture-covered in browser-regressions.test.ts:
//
//  1. The graduated probe's `rgb()`-only parser was ported verbatim, and cairn's palette is oklch
//     end to end, so every themed candidate failed to parse and vanished with no finding. Worse,
//     a half-parsed chain silently fell back to white and manufactured a confident pass on a real
//     dark-on-dark collision. Colors now go through the shared canvas normalizer, which the browser
//     itself answers.
//  2. A `background-image` layer keeps `background-color: rgba(0, 0, 0, 0)`, so the walk stepped
//     straight past a solid gradient band to the body underneath. A gradient has no single color
//     to composite, so the ground is now reported as indeterminate rather than guessed at.
//  3. The candidate net required a DIRECT text child, which misses every label wrapped in a
//     `<span>` (ComponentInsertDialog's picker rows are exactly this shape) and every form control,
//     since an `<input>` has no child nodes at all. The walk now starts from text nodes and reads
//     an input's own value or placeholder.
//  4. Gradient-clipped text (`background-clip: text` with a transparent `color`) rendered
//     perfectly and was flagged at ratio 1.00, because its paint is the background, not the color.
//     Those elements are now recognized and skipped.
//
// Only the `rest` state is read (contrast is a property of the resting render), so no `states`
// field is declared; the runner's default `['rest']` already covers this rule.
//
// One deliberate deviation from the graduated script, carried from this rule's first build: the
// script keyed its findings into a `Map` by selector signature, so two elements sharing the same
// tag-plus-classes fingerprint silently collapsed into whichever was visited last. This rule
// reports every matching candidate instead, since collapsing findings is a second, unrelated
// judgment call it has no evidence to make well.
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
  resolveGround,
  type PaintLayer,
} from '../../color.js';

/**
 * Below this contrast ratio, an interactive element's own text and its composited background are
 * close enough to read as camouflaged rather than merely low-contrast. RATIFIED (Task 16b ruling 3,
 * Geoff, 2026-07-28) alongside `chip-ground-collision`, which borrowed this exact number from the
 * graduated probe this rule itself graduates from. The shared rationale, now on the record so
 * neither rule re-litigates it: both test "not accidentally camouflaged," and neither is a contrast
 * standard. Legibility is WCAG 1.4.3 Contrast (Minimum), AA, at 4.5:1 for normal text and 3:1 for
 * large, and NO rule in this engine measures it. Do not redirect a reader to `border-contrast` for
 * it, which an earlier draft of this paragraph did: that rule measures a border stroke against the
 * surfaces it separates and never measures text at all, so the redirect told a consumer a gap was
 * covered. This 1.5 is deliberately looser than every one of those numbers, because "camouflaged"
 * and "legible" are different claims and only the first one is being made.
 *
 * Treat this floor as load-bearing, not a rounding nicety: `chip-ground-collision`'s own
 * `RATIO_FLOOR` doc records how an always-opaque canvas default there manufactured a measured
 * ratio of 1.514 against this same 1.5 line, one hundredth over it, and silently dropped two real
 * dark-theme collisions from the report while every other gate passed. Both rules share the same
 * ground-resolution arithmetic (`resolveGround` in `../../color.js`), so the same one-hundredth
 * failure mode is live here too; prove any future change to that shared arithmetic against a
 * real-Chromium boundary fixture at this floor rather than by inspection.
 */
const RATIO_FLOOR = 1.5;

/** Every candidate on the page, with the one canvas color all of their chains resolve onto. */
interface ContrastReading {
  /** `null` when the shared page helpers are not installed, which leaves the canvas unmeasured. */
  canvas: string | null;
  candidates: ContrastCandidate[];
}

/** One candidate's raw paint data, read in-browser and left unparsed. */
interface ContrastCandidate {
  selector: string;
  /** Up to 60 characters of the candidate's own trimmed text, for the finding message. */
  text: string;
  /** The computed color the text is painted in, unparsed. */
  color: string;
  /** The candidate's own paint layer, then every ancestor's, nearest first up to the document root. */
  layers: PaintLayer[];
}

/**
 * Runs inside the page. Playwright serializes this by source, so it stays self-contained: every
 * helper is nested and no constant is referenced from module scope.
 *
 * The walk starts from TEXT, not from elements: for every non-empty text node, the element that
 * owns the text is the candidate, provided it sits inside something interactive. That is what
 * reaches a label wrapped in a `<span>`, which an element-first walk requiring a direct text child
 * cannot see. Form controls carry no text nodes at all, so they are collected separately from their
 * own value or placeholder.
 */
function readContrastCandidates(): ContrastReading {
  const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, summary';
  const helpers = globalThis.__cairnAudit;

  function signature(el: Element): string {
    const cls =
      typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 4).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
  }

  function isPainted(el: Element): boolean {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isInteractive(el: Element): boolean {
    const control = el.closest(INTERACTIVE);
    // A disabled control's quiet text is the deliberate signal that it is inactive, and WCAG 1.4.3
    // exempts inactive components for exactly that reason. `touch-targets` already exempts them on
    // the same grounds, so the two rules agree on what counts as a live control.
    if (control && ((control as HTMLButtonElement).disabled || control.getAttribute('aria-disabled') === 'true')) {
      return false;
    }
    return control !== null || getComputedStyle(el).cursor === 'pointer';
  }

  // Text painted through a clipped background (a gradient wordmark) takes its color from the
  // background-image, not from `color`, which computes transparent. Measuring `color` against the
  // ground there reports ratio 1.00 on text that renders perfectly.
  function paintsThroughBackground(el: Element): boolean {
    const style = getComputedStyle(el) as CSSStyleDeclaration & { webkitBackgroundClip?: string };
    return style.backgroundClip === 'text' || style.webkitBackgroundClip === 'text';
  }

  function layersFor(el: Element): PaintLayer[] {
    const layers: PaintLayer[] = [];
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      layers.push({
        backgroundColor: style.backgroundColor,
        opacity: Number(style.opacity),
        hasImage: style.backgroundImage !== 'none' && style.backgroundClip !== 'text',
      });
    }
    return layers;
  }

  const candidates: ContrastCandidate[] = [];
  const visited = new Set<Element>();

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if ((node.textContent ?? '').trim().length === 0) continue;
    const el = node.parentElement;
    if (!el || visited.has(el)) continue;
    visited.add(el);
    if (!isInteractive(el) || !isPainted(el) || paintsThroughBackground(el)) continue;
    candidates.push({
      selector: signature(el),
      text: (el.textContent ?? '').trim().slice(0, 60),
      color: getComputedStyle(el).color,
      layers: layersFor(el),
    });
  }

  for (const el of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')) {
    if (visited.has(el) || !isPainted(el)) continue;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
    if (el instanceof HTMLInputElement && (el.type === 'hidden' || el.type === 'checkbox' || el.type === 'radio')) {
      continue;
    }
    visited.add(el);
    const value = el.value.trim();
    const placeholder = (el.placeholder ?? '').trim();
    if (value === '' && placeholder === '') continue;
    candidates.push({
      selector: signature(el),
      text: (value || placeholder).slice(0, 60),
      color: value !== '' ? getComputedStyle(el).color : getComputedStyle(el, '::placeholder').color,
      layers: layersFor(el),
    });
  }

  return { canvas: helpers ? helpers.canvasColor() : null, candidates };
}

/**
 * Interactive text must read against its own composited background at a ratio of at least
 * {@link RATIO_FLOOR}. Error tier: a false negative ships the invisible-CTA shape this rule
 * graduates from (a control that technically renders but reads as blank), and a false positive
 * costs a developer real time chasing a control that was never actually camouflaged, so both
 * directions matter and the fixtures prove discrimination, not just detection.
 */
export const interactiveContrast: RenderedRule = {
  id: 'interactive-contrast',
  tier: 'error',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ensurePageHelpers(ctx.page);
    const reading = await ctx.page.evaluate(readContrastCandidates);
    const candidates = reading.candidates;
    if (candidates.length === 0) return [];

    // The canvas leads the batch so it is normalized the same way every layer color is. It is what
    // the chains resolve onto, and it is measured rather than assumed: a chain that paints nothing
    // of its own sits on a near-black canvas under `color-scheme: dark`, where assuming white
    // reports dark-on-dark text as high contrast.
    const flat = [
      reading.canvas ?? '',
      ...candidates.flatMap((candidate) => [candidate.color, ...candidate.layers.map((l) => l.backgroundColor)]),
    ];
    const resolved = await resolveColors(ctx.page, flat);
    const canvas = resolved[0];
    if (!canvas) {
      return [
        indeterminateFinding(
          'interactive-contrast',
          'html',
          `the page canvas color could not be read (${reading.canvas ?? 'the shared page helpers are not installed'}), ` +
            `so no control on this page has a known backdrop to resolve against`
        ),
      ];
    }

    const findings: RenderedFinding[] = [];
    let cursor = 1;
    for (const candidate of candidates) {
      const fg = resolved[cursor];
      const layerColors = resolved.slice(cursor + 1, cursor + 1 + candidate.layers.length);
      cursor += 1 + candidate.layers.length;
      // Dropping a candidate whose color the browser itself refused is the shape of skip this rule
      // exists to rule out, so it is reported rather than swallowed.
      if (!fg) {
        findings.push(
          indeterminateFinding(
            'interactive-contrast',
            candidate.selector,
            `the browser could not resolve its computed text color (${candidate.color})`
          )
        );
        continue;
      }

      const ground = resolveGround(candidate.layers, layerColors, { canvas });
      if (ground.kind === 'indeterminate') {
        findings.push(indeterminateFinding('interactive-contrast', candidate.selector, ground.reason));
        continue;
      }
      // The ink is resolved as one more layer at the INSIDE of the same chain, rather than
      // composited onto the finished ground. Both readings agree while every `opacity` in the chain
      // is 1, and they diverge the moment one is not: `resolveGround` composites a subtree and dims
      // the group once, so the ground already carries every ancestor's opacity while a separately
      // composited `color` carries none. That measured full-strength ink on a washed-out ground and
      // reported HIGHER contrast than the control paints, a false negative on a rule that gates.
      // Task 18's review pass named it; `border-contrast` and `chip-ground-collision` closed the
      // same shape earlier and this rule was the last of the three still carrying it.
      const painted = resolveGround(
        [{ backgroundColor: candidate.color, opacity: 1, hasImage: false }, ...candidate.layers],
        [fg, ...layerColors],
        { canvas }
      );
      if (painted.kind === 'indeterminate') {
        findings.push(indeterminateFinding('interactive-contrast', candidate.selector, painted.reason));
        continue;
      }
      const ratio = contrastRatio(painted.color, ground.color);
      if (ratio >= RATIO_FLOOR) continue;

      findings.push({
        ruleId: 'interactive-contrast',
        tier: 'error',
        selector: candidate.selector,
        message:
          `text "${candidate.text}" reads at contrast ${ratio.toFixed(2)} against its own composited ` +
          `background ${describeColor(ground.color)} (floor ${RATIO_FLOOR}); color ${candidate.color}`,
      });
    }
    return findings;
  },
};
