import { s } from 'hastscript';
import type { Element } from 'hast';

/** A glyph name to SVG path-data map (the site owns the icon set). */
export type IconSet = Record<string, string>;

/** Inline SVG glyph as a real hast node: class ec-glyph, 256 viewBox, currentColor fill.
 *  An unknown icon name yields the bare svg shell with no path child, so it never serializes
 *  a stray empty (or undefined) path. Callers always wrap the returned element, so the shell
 *  keeps them safe. */
export function glyph(name: string, icons: IconSet): Element {
  const d = icons[name];
  return s(
    'svg',
    { className: ['ec-glyph'], viewBox: '0 0 256 256', fill: 'currentColor', ariaHidden: 'true' },
    d == null ? [] : [s('path', { d })],
  );
}
