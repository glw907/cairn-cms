// The client-side justified-grid algorithm the upstream demo's own `main.js` implements (a
// bespoke row packer, not a library dependency): lay out a row of photos to a shared height close
// to a target, filling the container's width, the classic Flickr-style justified grid. Reverse-
// engineered from the upstream's own compiled bundle (nicokaiser/hugo-theme-gallery, MIT); see
// this theme's README for the capability-test verdict this powers.

/** One photo's resolved box in the grid, in container-relative pixels. */
export interface LayoutBox {
  /** The photo's index into the original list, so the caller can map a box back to its data. */
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The layout's tunables. */
export interface JustifiedLayoutOptions {
  /** The available width to fill, in pixels. */
  containerWidth: number;
  /** The row height the algorithm aims for; a completed row's real height may differ slightly. */
  targetRowHeight: number;
  /** The gap between adjacent photos, both across a row and between rows, in pixels. */
  spacing: number;
  /** How far a row may exceed the target height, as a fraction, before this port's own choice
   *  (matching the upstream's observed behavior) is to leave the last, incomplete row unstretched
   *  rather than blow it up to an ungainly height just to fill the last row's width. */
  heightTolerance: number;
}

/**
 * Packs a list of aspect ratios (width divided by height) into justified rows. Each non-final row
 * closes as soon as adding one more photo would bring its height to or below the target: the row's
 * real height is then whatever value fills the container exactly, which is always at or below
 * `targetRowHeight`. The final row, if it can only reach `targetRowHeight` by overshooting
 * `heightTolerance`, is left unstretched: every photo in it renders at `targetRowHeight` and the
 * row does not reach the container's full width.
 */
export function layoutJustified(aspectRatios: number[], options: JustifiedLayoutOptions): { boxes: LayoutBox[]; height: number } {
  const { containerWidth, targetRowHeight, spacing, heightTolerance } = options;
  const boxes: LayoutBox[] = [];
  let top = 0;
  let rowStart = 0;
  let rowSum = 0;

  const closeRow = (rowEndExclusive: number, height: number): void => {
    let left = 0;
    for (let i = rowStart; i < rowEndExclusive; i++) {
      const width = aspectRatios[i] * height;
      boxes.push({ index: i, left, top, width, height });
      left += width + spacing;
    }
    top += height + spacing;
    rowStart = rowEndExclusive;
    rowSum = 0;
  };

  for (let i = 0; i < aspectRatios.length; i++) {
    rowSum += aspectRatios[i];
    const itemsInRow = i - rowStart + 1;
    const candidateHeight = (containerWidth - spacing * (itemsInRow - 1)) / rowSum;
    const isLast = i === aspectRatios.length - 1;

    if (candidateHeight <= targetRowHeight) {
      closeRow(i + 1, candidateHeight);
    } else if (isLast) {
      if (candidateHeight <= targetRowHeight * (1 + heightTolerance)) {
        closeRow(i + 1, candidateHeight);
      } else {
        closeRow(i + 1, targetRowHeight);
      }
    }
  }

  return { boxes, height: top > 0 ? top - spacing : 0 };
}

/** The target row height grows with the viewport, matching the upstream's own denser mobile grid
 *  and looser desktop grid; the widest step (past 1536px) is this port's own addition, so the
 *  justified algorithm packs more photos per row as an ultrawide viewport grows, rather than
 *  capping out the way a fixed-column CSS grid would. */
export function targetRowHeightFor(containerWidth: number): number {
  if (containerWidth < 640) return 170;
  if (containerWidth < 1024) return 240;
  if (containerWidth < 1536) return 320;
  return 380;
}
