// Makes a theme's catalog card: its manifest's first screenshot scaled to 720 by 480 and encoded as
// WebP. The card's bytes need not repeat across machines, since the publish job keeps a card
// already at its path, so only its shape and size are held here.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/** The card's width in pixels. */
export const CARD_WIDTH = 720;

/** The card's height in pixels. */
export const CARD_HEIGHT = 480;

/** The largest card the catalog accepts, in bytes (100 KB). */
export const MAX_CARD_BYTES = 100_000;

// Waymark's cards land near 10 KB at this quality, a tenth of the limit, and read cleanly.
const QUALITY = 80;

/**
 * @typedef {object} Card
 * @property {Buffer} bytes the WebP image
 * @property {number} width
 * @property {number} height
 * @property {number} size the length of `bytes`
 */

/**
 * Builds the card from the theme's first screenshot, refusing one whose shape isn't exactly 3:2
 * (a scale would distort it) and a result over {@link MAX_CARD_BYTES}.
 * @param {string} themeDir the theme directory, holding `cairn-theme.json`
 * @returns {Promise<Card>}
 */
export async function buildCard(themeDir) {
  const manifest = JSON.parse(readFileSync(path.join(themeDir, 'cairn-theme.json'), 'utf8'));
  const first = manifest.screenshots?.[0]?.path;
  if (typeof first !== 'string') throw new Error(`card: ${themeDir} names no screenshot`);
  const source = path.join(themeDir, first);
  const { width, height } = await sharp(source).metadata();
  if (!width || !height || width * 2 !== height * 3) {
    throw new Error(`card: the first screenshot ${first} is ${width} by ${height}, not 3:2`);
  }
  const bytes = await sharp(source).resize(CARD_WIDTH, CARD_HEIGHT).webp({ quality: QUALITY }).toBuffer();
  if (bytes.length > MAX_CARD_BYTES) {
    throw new Error(`card: ${bytes.length} bytes is over the 100 KB limit (${MAX_CARD_BYTES} bytes)`);
  }
  return { bytes, width: CARD_WIDTH, height: CARD_HEIGHT, size: bytes.length };
}
