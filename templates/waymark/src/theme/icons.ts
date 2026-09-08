// The theme's icon set: the concrete glyph data the render helpers (`$chassis/render.js`) and the
// picker fields draw from. Kept in its own module, apart from `cairn.config.ts`, so re-skinning
// the glyph set never touches the adapter or the component declarations that reference it.
import type { IconSet } from '@glw907/cairn-cms';

export const icons: IconSet = {
  snowflake: 'M128 24v208M44 76l168 104M212 76L44 180',
  leaf: 'M48 208c0-88 72-160 160-160 0 88-72 160-160 160Z',
  // A speech glyph for the callout picker row and a triangle-bang for the alert row.
  callout: 'M216 48H40a8 8 0 0 0-8 8v160l40-32h144a8 8 0 0 0 8-8V56a8 8 0 0 0-8-8Z',
  alert: 'M128 24 8 224h240L128 24Zm0 72v56m0 32v8',
  // A trail-marker pennant: the icon component's own picker row, a selectable content glyph, and the
  // banner component's picker row (a banner is, literally, a flag).
  flag: 'M64 24v208M64 32h128l-32 32 32 32H64',
  // A solid right-pointing triangle, the video facade's picker row and its thumbnail glyph.
  play: 'M80 32v192l152-96Z',
  // Two stylized quote marks, for the pull-quote picker row.
  quote:
    'M48 64h64v64c0 35-29 64-64 64v-32c18 0 32-14 32-32H48Zm112 0h64v64c0 35-29 64-64 64v-32c18 0 32-14 32-32h-32Z',
  // A thick right arrow, for the CTA picker row and its link glyph.
  'arrow-right': 'M32 104h128v-32l96 56-96 56v-32H32Z',
  // A thick downward chevron, echoing the native <details> disclosure marker for the FAQ picker row.
  'chevron-down': 'M32 64 128 176 224 64 224 104 128 216 32 104Z',
};
