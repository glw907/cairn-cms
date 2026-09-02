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
import type { RenderedFinding } from './rendered.js';

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
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
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
 * How far two colors sit from each other in hue and saturation alone, with luminance projected
 * out. `contrastRatio` answers a different, WCAG-defined question (how far apart two colors' relative
 * luminance sits) and is blind to this axis by construction: a bright purple and a bright orange at
 * the same luminance measure 1:1 on it. This is the axis `chip-ground-collision` was missing (design
 * infrastructure Pass 3, corpus C): a chip and its ground can read as plainly distinct to a sighted
 * user on hue alone even where their luminance sits close enough to fail the contrast floor.
 *
 * Implemented as Euclidean distance in the Cb/Cr plane of YCbCr (ITU-R BT.601), over the same sRGB
 * bytes every other measurement in this module reads. Two colors that differ only in
 * lightness (any two grays, or the same hue at two shades) land at the same Cb/Cr point, so this
 * distance is exactly zero for the achromatic pairs `contrastRatio` already measures correctly on its
 * own, and grows only where the colors actually diverge in hue or saturation.
 *
 * Ignores `a` entirely: like `contrastRatio`, this takes colors a caller has already composited
 * onto an opaque backdrop (`resolveGround`'s return is always opaque by construction), so there is
 * no remaining alpha to account for by the time either function sees the pair.
 */
export function chromaDistance(a: Rgba, b: Rgba): number {
  const cb = (c: Rgba) => -0.168736 * c.r - 0.331264 * c.g + 0.5 * c.b;
  const cr = (c: Rgba) => 0.5 * c.r - 0.418688 * c.g - 0.081312 * c.b;
  return Math.hypot(cb(a) - cb(b), cr(a) - cr(b));
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

/**
 * One layer's opacity as the arithmetic below reads it. A computed `opacity` that does not parse to
 * a number is read as fully opaque, so an unreadable value never manufactures a dimming that the
 * page does not paint.
 */
function layerOpacity(layer: PaintLayer): number {
  return Number.isFinite(layer.opacity) ? layer.opacity : 1;
}

/**
 * The opacity that scales whatever the innermost element in `layers` paints: its own, multiplied by
 * every ancestor's, since `opacity` always composites a whole subtree.
 *
 * For a background chain, {@link resolveGround} handles this itself. This is for paint that is NOT
 * a layer in the chain, a border stroke above all, and for a caller that deliberately resolves one
 * element's own fill against a backdrop the DOM chain does not supply (`border-contrast` samples
 * the adjacent surface geometrically instead). Both were refuted against real Chromium for missing
 * it: a card hairline under an 8%-opacity ancestor kept its full-strength stroke while the ground
 * beside it washed out, so a barely-there line measured as if nothing had dimmed it.
 */
export function cumulativeOpacity(layers: PaintLayer[]): number {
  return layers.reduce((product, layer) => product * layerOpacity(layer), 1);
}

/** What is behind a caller's layer chain, and how the chain's first entry should be read. */
export interface GroundOptions {
  /**
   * The color already painted behind `layers`, which the chain composites onto and which fills in
   * wherever the chain paints nothing. Required, and the caller has to name the real backdrop:
   * every silent default here has shipped as a fail-open. Assuming opaque white read an invisible
   * dark-on-dark panel as clean under `color-scheme: dark`, and it also erased a translucent chip's
   * true color when the chain was the chip's own single layer.
   *
   * For a whole-element chain (the element's own layer through the document root) this is the page
   * canvas, which the shared page helpers' `canvasColor` reads off the live page. For a
   * single-layer chain holding one element's own fill, it is that element's already-resolved
   * ground, which makes the returned color the pixels that element actually paints.
   */
  canvas: Rgba;
  /**
   * What `layers[0]` is, which only changes how an indeterminate ground is worded. A caller that
   * already dropped the element's own layer passes `'ancestor'`, so a gradient on the immediate
   * parent is not reported as one the element paints on itself.
   */
  firstLayerIs?: 'self' | 'ancestor';
}

/** What a background chain resolved to, or why it could not be resolved. */
export type GroundResolution =
  | { kind: 'resolved'; color: Rgba }
  | { kind: 'indeterminate'; reason: string };

/**
 * The color a chain of layers actually paints, resolved onto `options.canvas`.
 *
 * `layers` runs nearest-first (the element's own layer, then each ancestor up to the document
 * root), matching the order a DOM walk produces, and `colors` carries the same entries already
 * normalized by `resolveColors`. A layer's `opacity` dims that layer's own background together with
 * everything inside it, once, as a group, which is how a chip painted at 4% opacity stops reading
 * as an opaque fill and why a 25%-opacity wrapper does not thin the chip inside it twice over.
 *
 * Returns `indeterminate` rather than a color when a layer paints a `background-image` and
 * contributes no color at all. That is exactly the demonstrated fail-open: a gradient band keeps
 * `background-color: rgba(0, 0, 0, 0)`, so a color-only walk steps straight past a solid surface to
 * the white underneath and calls invisible text clean. Skipping that layer loses the whole ground.
 * A `null` in `colors` is read as a layer that painted nothing, and it is worth knowing why that is
 * not the whole truth. `resolveColors` returns `null` for BOTH an empty string and a string the
 * browser refused, so a refused color composites away here exactly as an unpainted layer does, which
 * is a residual fail-open of the family this doc describes. Task 18's review pass proposed making
 * the null case indeterminate; that is wrong at this level, and two pinned fixtures in
 * `color.test.ts` demonstrate it, since both pass `null` to mean "nothing painted" and one of them
 * exists to hold the dark-canvas defect closed. The repair belongs at the `resolveColors` boundary,
 * where the two facts can be told apart and given separate sentinels the way `probeSelectors`
 * already separates "nothing matched" from "the browser refused this selector". Filed in ROADMAP.
 *
 * `options.canvas` is what the chain resolves onto, and it is required rather than defaulted: the
 * result is the color a user sees, so a caller that does not know what is behind the chain cannot
 * ask this question honestly. A chip rule that let the canvas default to white got its own
 * translucent fill back lightened by that white, which cleared the collision floor and hid two real
 * dark-theme collisions while the light-theme half kept firing (white being close enough to a light
 * ground to leave the answer intact).
 *
 * A layer that paints an image over a color it DOES contribute is resolved normally, because the
 * color composites and the walk continues from there rather than from nothing. daisyUI v5 paints
 * `--btn-noise` over every `.btn`, so the stricter reading (any image at all) reports an
 * unmeasurable ground on every button in the admin, which buries the real case instead of
 * surfacing it. The residual gap is a full-cover gradient over a partly transparent color, where
 * the color under it is an approximation of what paints; that is a bounded and stated limit rather
 * than a silent one.
 */
export function resolveGround(
  layers: PaintLayer[],
  colors: (Rgba | null)[],
  options: GroundOptions
): GroundResolution {
  const canvas = options.canvas;
  const firstIsSelf = options.firstLayerIs !== 'ancestor';
  const imaged = layers.findIndex((layer, index) => layer.hasImage && (colors[index]?.a ?? 0) === 0);
  if (imaged >= 0) {
    return {
      kind: 'indeterminate',
      reason:
        imaged === 0 && firstIsSelf
          ? 'the element paints its own background-image over no color at all'
          : 'an ancestor paints a background-image over no color at all, so no single ground color exists to measure against',
    };
  }
  // `opacity` is a GROUP operation: an element's own background and everything inside it composite
  // together first, and the result is dimmed once. So the chain is built innermost outward, each
  // layer's accumulated content scaled by that layer's own opacity before the next layer's
  // background goes behind it.
  //
  // Applying each layer's cumulative opacity to its own alpha instead, which is the same arithmetic
  // for the common case and diverges the moment an ANCESTOR carries opacity, dims an inner layer
  // twice over: it thins the inner paint AND lightens the backdrop it lands on. Against a
  // screenshot of a chip inside a 25%-opacity wrapper, that model returned rgb(177, 174, 170) where
  // the painted pixels are rgb(216, 213, 210), and the error ran the wrong way, reporting the
  // collision as milder than it renders.
  let content: Rgba = TRANSPARENT;
  for (const [i, layer] of layers.entries()) {
    const color = colors[i];
    // What is already accumulated sits INSIDE this layer, so it paints over this layer's own
    // background, and only then does this layer's opacity dim the pair as one.
    if (color && color.a > 0) content = composite(content, color);
    const opacity = layerOpacity(layer);
    if (opacity < 1) content = { ...content, a: content.a * opacity };
  }
  // The chain always resolves onto the caller's backdrop, so a ground is opaque by construction.
  // Returning a partly transparent ground let `contrastRatio` measure a color no user ever sees:
  // `relativeLuminance` discards alpha, so a 50%-black panel over white read as pure black, and a
  // black border on it reported 1.00 where the painted pixels measure 5.24.
  return { kind: 'resolved', color: composite(content, canvas) };
}

/**
 * The finding an indeterminate ground raises. Advisory rather than error: the measurement could
 * not be made, which is a different claim from "this is wrong", but reporting nothing at all would
 * be the silent pass the audit exists to rule out.
 */
export function indeterminateFinding(ruleId: string, selector: string, reason: string): RenderedFinding {
  return {
    ruleId,
    tier: 'advisory',
    selector,
    message:
      `could not measure this element's ground: ${reason}. Give the surface a solid background-color, ` +
      `or allowlist this selector with a reason, so the check is answered rather than skipped.`,
  };
}
