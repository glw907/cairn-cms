// cairn-cms: the icon-glyph renderer, a public seam a site's own icon-rendering helper wraps in
// its own inline-icon-span markup to turn a stamped icon name into an inline SVG hast node, from
// the site's own IconSet path-data map.
import { s } from 'hastscript';
import type { Element } from 'hast';

/**
 * A glyph name to SVG path-data map (the site owns the icon set). Each path is filled shape
 * data on a `0 0 256 256` box: renderGlyph renders it with fill=currentColor and no stroke, so a
 * stroke-only path (one whose `d` encloses no area) renders invisible.
 */
export type IconSet = Record<string, string>;

/**
 * Inline SVG glyph as a real hast node: class cairn-glyph, 256 viewBox, currentColor fill.
 *  An unknown icon name yields the bare svg shell with no path child, so it never serializes
 *  a stray empty (or undefined) path. Callers always wrap the returned element, so the shell
 *  keeps them safe.
 */
export function renderGlyph(name: string, icons: IconSet): Element {
  const d = icons[name];
  return s(
    'svg',
    { className: ['cairn-glyph'], viewBox: '0 0 256 256', fill: 'currentColor', ariaHidden: 'true' },
    d == null ? [] : [s('path', { d })],
  );
}
