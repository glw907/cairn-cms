import { s } from 'hastscript';
import type { Element } from 'hast';

/** A glyph name → SVG path-data map (the site owns the icon set). */
export type IconSet = Record<string, string>;

/** Inline SVG glyph as a real hast node: class ec-glyph, 256 viewBox, currentColor fill. */
export function glyph(name: string, icons: IconSet): Element {
	return s(
		'svg',
		{ className: ['ec-glyph'], viewBox: '0 0 256 256', fill: 'currentColor', ariaHidden: 'true' },
		[s('path', { d: icons[name] })],
	);
}
