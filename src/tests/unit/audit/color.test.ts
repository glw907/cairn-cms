// The color substrate every rendered rule that compares two paints now shares. Three rules landed
// with their own copy of this math and their own rgb()-only parser, and an adversarial pass
// demonstrated the same fail-open in all three against real Chromium. Parsing moved out of Node
// entirely (rendered.ts hands the string to the browser's canvas), so what remains here is
// compositing and measurement, and these fixtures pin the two behaviors the rules got wrong: an
// opacity chain that was never composited, and a background-image layer the walk stepped straight
// past on its way to a white that was never there.
import { describe, expect, it } from 'vitest';
import {
  composite,
  contrastRatio,
  describeColor,
  indeterminateFinding,
  relativeLuminance,
  resolveGround,
  sameColor,
  OPAQUE_WHITE,
  type PaintLayer,
  type Rgba,
} from '../../../lib/audit/color.js';

const opaque = (r: number, g: number, b: number): Rgba => ({ r, g, b, a: 1 });

/** A layer that paints `backgroundColor` at full opacity with no image. */
function layer(opacity = 1, hasImage = false): PaintLayer {
  return { backgroundColor: 'unused-by-these-tests', opacity, hasImage };
}

describe('contrast measurement', () => {
  it('measures the WCAG extremes', () => {
    expect(contrastRatio(opaque(255, 255, 255), opaque(0, 0, 0))).toBeCloseTo(21, 5);
    expect(contrastRatio(opaque(120, 120, 120), opaque(120, 120, 120))).toBeCloseTo(1, 5);
  });

  it('is order independent', () => {
    const a = opaque(30, 60, 150);
    const b = opaque(240, 240, 240);
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it('weights green most, per the relative-luminance coefficients', () => {
    expect(relativeLuminance(opaque(0, 255, 0))).toBeGreaterThan(relativeLuminance(opaque(255, 0, 0)));
    expect(relativeLuminance(opaque(255, 0, 0))).toBeGreaterThan(relativeLuminance(opaque(0, 0, 255)));
  });
});

describe('compositing', () => {
  it('leaves an opaque foreground unchanged', () => {
    expect(composite(opaque(10, 20, 30), opaque(255, 255, 255))).toEqual(opaque(10, 20, 30));
  });

  it('returns the background under a fully transparent foreground', () => {
    const bg = opaque(200, 100, 50);
    expect(composite({ r: 0, g: 0, b: 0, a: 0 }, bg)).toEqual(bg);
  });

  it('meets a half-alpha black over white in the middle', () => {
    const result = composite({ r: 0, g: 0, b: 0, a: 0.5 }, OPAQUE_WHITE);
    expect(result.r).toBeCloseTo(127.5, 5);
    expect(result.a).toBeCloseTo(1, 5);
  });
});

describe('ground resolution', () => {
  it('composites nearest-first layers from the outermost inward', () => {
    // A transparent element over a white card over a dark page resolves to the card, not the page.
    const layers = [layer(), layer(), layer()];
    const ground = resolveGround(layers, [
      { r: 0, g: 0, b: 0, a: 0 },
      opaque(255, 255, 255),
      opaque(20, 20, 20),
    ]);
    expect(ground).toEqual({ kind: 'resolved', color: opaque(255, 255, 255) });
  });

  it('falls back to opaque white when nothing in the chain ever painted', () => {
    const ground = resolveGround([layer(), layer()], [null, { r: 0, g: 0, b: 0, a: 0 }]);
    expect(ground).toEqual({ kind: 'resolved', color: OPAQUE_WHITE });
  });

  // The demonstrated defect: a chip painted at four percent opacity is indistinguishable from its
  // row, and reading `opacity` only as an is-it-exactly-zero visibility test scored it as an opaque
  // fill.
  it('scales a layer alpha by its own opacity', () => {
    const ground = resolveGround([layer(0.04), layer()], [opaque(90, 60, 200), opaque(246, 244, 242)]);
    expect(ground.kind).toBe('resolved');
    if (ground.kind !== 'resolved') return;
    expect(contrastRatio(ground.color, opaque(246, 244, 242))).toBeLessThan(1.1);
  });

  it('scales an inner layer by an ancestor opacity too', () => {
    const half = resolveGround([layer(1), layer(0.5)], [{ r: 0, g: 0, b: 0, a: 0 }, opaque(0, 0, 0)]);
    expect(half.kind).toBe('resolved');
    if (half.kind !== 'resolved') return;
    expect(half.color.a).toBeCloseTo(0.5, 5);
  });

  // The demonstrated defect: a gradient band keeps `background-color: rgba(0, 0, 0, 0)`, so a
  // color-only walk continued past a solid dark surface to the body underneath and reported
  // invisible text as clean. Reporting that the ground cannot be measured is the honest answer;
  // guessing white is the fail-open.
  it('refuses to resolve a chain whose image layer paints over no color at all', () => {
    const ground = resolveGround([layer(), layer(1, true)], [{ r: 0, g: 0, b: 0, a: 0 }, { r: 0, g: 0, b: 0, a: 0 }]);
    expect(ground.kind).toBe('indeterminate');
    if (ground.kind !== 'indeterminate') return;
    expect(ground.reason).toContain('ancestor');
  });

  it('names the element itself when the element is what paints the image', () => {
    const ground = resolveGround([layer(1, true)], [{ r: 0, g: 0, b: 0, a: 0 }]);
    expect(ground.kind).toBe('indeterminate');
    if (ground.kind !== 'indeterminate') return;
    expect(ground.reason).toContain('own background-image');
  });

  // daisyUI v5 paints `--btn-noise` over every `.btn`, so treating any image layer as unmeasurable
  // would report an unresolvable ground on every button in the admin and bury the real case. An
  // image over an opaque color resolves to that color.
  it('resolves an image layer that paints over a color it contributes', () => {
    const ground = resolveGround([layer(1, true)], [opaque(115, 88, 200)]);
    expect(ground).toEqual({ kind: 'resolved', color: opaque(115, 88, 200) });
  });
});

describe('the indeterminate finding', () => {
  // Advisory, not error: "this could not be measured" is a different claim from "this is wrong",
  // and reporting nothing at all would be the silent pass the audit exists to rule out.
  it('reports advisory and says what to do about it', () => {
    const finding = indeterminateFinding('interactive-contrast', 'a.cta', 'an ancestor paints a background-image');
    expect(finding.tier).toBe('advisory');
    expect(finding.ruleId).toBe('interactive-contrast');
    expect(finding.message).toContain('allowlist');
  });
});

describe('color equality and description', () => {
  it('absorbs the canvas round trip rounding but not a real difference', () => {
    expect(sameColor(opaque(120, 60, 200), { r: 121, g: 59, b: 200.5, a: 1 })).toBe(true);
    expect(sameColor(opaque(120, 60, 200), opaque(126, 60, 200))).toBe(false);
    expect(sameColor(opaque(120, 60, 200), { r: 120, g: 60, b: 200, a: 0.5 })).toBe(false);
  });

  it('prints alpha only when a color carries one', () => {
    expect(describeColor(opaque(1, 2, 3))).toBe('rgb(1, 2, 3)');
    expect(describeColor({ r: 1, g: 2, b: 3, a: 0.5 })).toBe('rgba(1, 2, 3, 0.5)');
  });
});
