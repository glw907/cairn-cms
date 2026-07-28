// cairn-audit's color arithmetic, shared by every rendered rule that compares two painted colors.
// Three rendered rules landed with their own copy of this math and their own `rgb()`-only regex
// parser, and an adversarial pass demonstrated the same fail-open in all three: cairn's admin
// palette is oklch end to end (`src/lib/components/cairn-admin.css` declares every Warm Stone token
// as `oklch(...)`, and Tailwind's opacity modifier compiles to `color-mix(in oklab, ...)`), so
// `getComputedStyle` hands back a color function the regex could not read, the candidate was
// skipped, and the rule reported clean against the very interface it exists to audit.
//
// The fix is to stop parsing color syntax at all. `resolveColors` in rendered.ts hands the string
// to the browser's own canvas and reads the sRGB bytes back, so any color the page can paint
// (oklch, oklab, lab, color(), color-mix, a named keyword) arrives here already normalized. This
// module therefore only composites and measures; it never parses.
import type { Tier } from './types.js';

/** A color already normalized to sRGB, alpha in 0..1. Never a parsed CSS string. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Fully transparent, the identity a background chain starts from. */
export const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** Opaque white, the color a browser canvas shows where nothing in the chain ever painted. */
export const OPAQUE_WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };

/** Alpha-composites `fg` over `bg`. */
export function composite(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return TRANSPARENT;
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(c: Rgba): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** WCAG 2.x contrast ratio, order-independent. */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** A color as a finding message prints it. */
export function describeColor(c: Rgba): string {
  const channels = `${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}`;
  return c.a >= 0.999 ? `rgb(${channels})` : `rgba(${channels}, ${Number(c.a.toFixed(3))})`;
}

/** Whether two normalized colors are the same paint, within the canvas round trip's rounding. */
export function sameColor(a: Rgba, b: Rgba): boolean {
  return (
    Math.abs(a.r - b.r) <= 1.5 && Math.abs(a.g - b.g) <= 1.5 && Math.abs(a.b - b.b) <= 1.5 && Math.abs(a.a - b.a) <= 0.02
  );
}

/**
 * One painted layer as a rule's in-page walk reports it: the element's own background, the
 * `opacity` that scales it, and whether an image (a gradient, a sprite) also paints there.
 */
export interface PaintLayer {
  /** The layer's own `background-color`, as `getComputedStyle` reports it, unparsed. */
  backgroundColor: string;
  /** The layer's own computed `opacity`. */
  opacity: number;
  /** Whether the layer paints a `background-image`, which no color arithmetic can resolve. */
  hasImage: boolean;
}

/** What a background chain resolved to, or why it could not be resolved. */
export type GroundResolution =
  | { kind: 'resolved'; color: Rgba }
  | { kind: 'indeterminate'; reason: string };

/**
 * The color a chain of layers actually paints, composited from the outermost layer inward.
 *
 * `layers` runs nearest-first (the element's own layer, then each ancestor up to the document
 * root), matching the order a DOM walk produces, and `colors` carries the same entries already
 * normalized by `resolveColors`. A layer's `opacity` scales its own alpha and every layer inside
 * it, which is how a chip painted at 4% opacity stops reading as an opaque fill.
 *
 * Returns `indeterminate` rather than a color when a layer paints a `background-image` and
 * contributes no color at all. That is exactly the demonstrated fail-open: a gradient band keeps
 * `background-color: rgba(0, 0, 0, 0)`, so a color-only walk steps straight past a solid surface to
 * the white underneath and calls invisible text clean. Skipping that layer loses the whole ground.
 *
 * A layer that paints an image over a color it DOES contribute is resolved normally, because the
 * color composites and the walk continues from there rather than from nothing. daisyUI v5 paints
 * `--btn-noise` over every `.btn`, so the stricter reading (any image at all) reports an
 * unmeasurable ground on every button in the admin, which buries the real case instead of
 * surfacing it. The residual gap is a full-cover gradient over a partly transparent color, where
 * the color under it is an approximation of what paints; that is a bounded and stated limit rather
 * than a silent one.
 */
export function resolveGround(layers: PaintLayer[], colors: (Rgba | null)[]): GroundResolution {
  const imaged = layers.findIndex((layer, index) => layer.hasImage && (colors[index]?.a ?? 0) === 0);
  if (imaged >= 0) {
    return {
      kind: 'indeterminate',
      reason:
        imaged === 0
          ? 'the element paints its own background-image over no color at all'
          : 'an ancestor paints a background-image over no color at all, so no single ground color exists to measure against',
    };
  }
  // Cumulative opacity, outermost inward: an ancestor's opacity scales everything inside it.
  const opacityAt: number[] = new Array(layers.length);
  let cumulative = 1;
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    cumulative *= Number.isFinite(layers[i].opacity) ? layers[i].opacity : 1;
    opacityAt[i] = cumulative;
  }

  let ground: Rgba = TRANSPARENT;
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const color = colors[i];
    if (!color) continue;
    const alpha = color.a * opacityAt[i];
    if (alpha <= 0) continue;
    ground = composite({ ...color, a: alpha }, ground);
  }
  return { kind: 'resolved', color: ground.a === 0 ? OPAQUE_WHITE : ground };
}

/**
 * The finding an indeterminate ground raises. Advisory rather than error: the measurement could
 * not be made, which is a different claim from "this is wrong", but reporting nothing at all would
 * be the silent pass the audit exists to rule out.
 */
export function indeterminateFinding(ruleId: string, selector: string, reason: string): {
  ruleId: string;
  tier: Tier;
  selector: string;
  message: string;
} {
  return {
    ruleId,
    tier: 'advisory',
    selector,
    message:
      `could not measure this element's ground: ${reason}. Give the surface a solid background-color, ` +
      `or allowlist this selector with a reason, so the check is answered rather than skipped.`,
  };
}
