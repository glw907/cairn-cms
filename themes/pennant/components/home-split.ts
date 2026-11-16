// The home page shows a site's banner above the hero, though the banner is authored as the first
// block of the home page's body. This lifts that one block out so the page can place it first and
// render the rest of the body in its usual place.

/** The home body's opening part, split into a leading banner and the rest. */
export interface HomeSplit {
  /** The banner's whole wrapper, or an empty string when the body opens with no banner. */
  banner: string;
  /** The rest of the opening part, unchanged when there is no banner. */
  rest: string;
}

const BANNER_OPEN = /^\s*<div\s[^>]*data-cairn-island="banner"/;
const DIV_TAG = /<(\/?)div\b[^>]*>|<!--[\s\S]*?-->/gi;

/**
 * Lifts a banner island off the start of `before`, the home body ahead of its last rule. The
 * banner is lifted only when its `<div data-cairn-island="banner"` wrapper comes first, after
 * whitespace; its end is found by counting `<div` and `</div>` depth, skipping comments. Any other
 * body, or a wrapper that never closes, comes back whole as `rest`.
 */
export function splitHomeBanner(before: string): HomeSplit {
  const opening = BANNER_OPEN.exec(before);
  if (!opening) return { banner: '', rest: before };

  const start = before.length - before.trimStart().length;
  let depth = 0;
  DIV_TAG.lastIndex = start;
  for (let tag = DIV_TAG.exec(before); tag; tag = DIV_TAG.exec(before)) {
    if (tag[0].startsWith('<!--')) continue;
    depth += tag[1] === '/' ? -1 : 1;
    if (depth === 0) {
      const end = tag.index + tag[0].length;
      return { banner: before.slice(start, end), rest: before.slice(end).trimStart() };
    }
  }
  return { banner: '', rest: before };
}
