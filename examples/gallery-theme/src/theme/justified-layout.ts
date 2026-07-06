// The client-side justified-grid layout the upstream demo's own `main.js` drives (a Flickr-style
// row packer): lay out a row of photos to a shared height close to a target, filling the
// container's width. Inspecting the upstream's own compiled bundle (nicokaiser/hugo-theme-gallery,
// MIT) shows its variable names, closing-row heuristic, and default tunables (a target row height
// of 288px held CONSTANT across every viewport, an 8px spacing, a 0.25 height tolerance) are an
// exact match for `justified-layout` (github.com/flickr/justified-layout, ISC, zero dependencies),
// the small open-source library Flickr published for this exact problem; this wraps that package
// directly rather than reimplementing its row-closing heuristic by hand, which a first pass at
// this port got subtly wrong (a breakpoint-stepped target height, which packs a narrow viewport
// into a multi-column contact sheet instead of the upstream's near-single-column mobile layout).
// A wider container alone packs more photos per row as the constant target height is held fixed,
// which is this port's own "beat the original at 2560" lever; see this theme's README.
import createJustifiedLayout from 'justified-layout';

/** One photo's resolved box in the grid, in container-relative pixels. */
export interface LayoutBox {
  /** The photo's index into the original list, so the caller can map a box back to its data. */
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The layout's tunables, matching the upstream's own compiled defaults. */
export interface JustifiedLayoutOptions {
  /** The available width to fill, in pixels. */
  containerWidth: number;
  /** The row height the algorithm aims for; a completed row's real height may differ slightly. */
  targetRowHeight: number;
  /** The gap between adjacent photos, both across a row and between rows, in pixels. */
  spacing: number;
  /** How far a row may exceed the target height, as a fraction, before the algorithm leaves an
   *  under-filled last row unstretched rather than blow it up to fill the container's width. */
  heightTolerance: number;
}

/** Packs a list of aspect ratios (width divided by height) into justified rows via the real
 *  `justified-layout` package. */
export function layoutJustified(
  aspectRatios: number[],
  options: JustifiedLayoutOptions,
): { boxes: LayoutBox[]; height: number } {
  if (aspectRatios.length === 0) return { boxes: [], height: 0 };
  const geometry = createJustifiedLayout(aspectRatios, {
    containerWidth: options.containerWidth,
    containerPadding: 0,
    boxSpacing: options.spacing,
    targetRowHeight: options.targetRowHeight,
    targetRowHeightTolerance: options.heightTolerance,
  });
  return {
    boxes: geometry.boxes.map((box, index) => ({
      index,
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
    })),
    height: geometry.containerHeight,
  };
}

/** The upstream demo's own target row height (`Le=288` in its compiled bundle): a literal
 *  constant, not scaled by breakpoint. Holding it constant is what lets a wider container pack
 *  more photos per row on its own, with no explicit breakpoint logic. */
export const TARGET_ROW_HEIGHT = 288;

/** The upstream demo's own spacing (`It=8`) and height tolerance (`Tt=.25`). */
export const SPACING = 8;
export const HEIGHT_TOLERANCE = 0.25;
