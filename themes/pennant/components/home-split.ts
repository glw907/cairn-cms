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

// An attribute run that steps over quoted values whole, since the serialized banner props sit in a
// `data-cairn-props` attribute that can hold a raw `>` or `</div>` an editor typed.
const ATTRS = `(?:[^>"']|"[^"]*"|'[^']*')*`;
const BANNER_OPEN = new RegExp(`^\\s*<div\\s${ATTRS}?\\bdata-cairn-island="banner"`);
const TAG = new RegExp(`<!--[\\s\\S]*?-->|<(\\/?)([a-zA-Z][\\w-]*)${ATTRS}>`, 'g');

/**
 * Lifts a banner island off the start of `before`, the home body ahead of its last rule. The
 * banner is lifted only when its `<div data-cairn-island="banner"` wrapper comes first, after
 * whitespace. Its end is found by counting `<div` and `</div>` depth over whole tags, so a quoted
 * attribute value never ends a tag early, and comments are skipped. Any other body, or a wrapper
 * that never closes, comes back whole as `rest`.
 */
export function splitHomeBanner(before: string): HomeSplit {
  const opening = BANNER_OPEN.exec(before);
  if (!opening) return { banner: '', rest: before };

  const start = before.length - before.trimStart().length;
  let depth = 0;
  TAG.lastIndex = start;
  for (let tag = TAG.exec(before); tag; tag = TAG.exec(before)) {
    if (tag[2]?.toLowerCase() !== 'div') continue;
    depth += tag[1] === '/' ? -1 : 1;
    if (depth === 0) {
      const end = tag.index + tag[0].length;
      return { banner: before.slice(start, end), rest: before.slice(end).trimStart() };
    }
  }
  return { banner: '', rest: before };
}
