// The card image: a 720 by 480 WebP from a theme's first screenshot, refused when that screenshot
// isn't 3:2 or when the result is over the catalog's 100 KB limit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { repoRoot } from '../repo-root.mjs';
import { buildCard, CARD_HEIGHT, CARD_WIDTH, MAX_CARD_BYTES } from './card.mjs';

const ROOT = repoRoot(import.meta.url);

/**
 * A scratch theme whose manifest names one screenshot, the given raw RGB pixels as a PNG.
 * @param {import('node:test').TestContext} t
 * @param {number} width
 * @param {number} height
 * @param {(i: number) => number} pixel the byte at index `i` of the raw RGB buffer
 */
async function themeWithScreenshot(t, width, height, pixel) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-card-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = pixel(i);
  await mkdir(path.join(dir, 'screenshots'));
  await sharp(raw, { raw: { width, height, channels: 3 } }).png().toFile(path.join(dir, 'screenshots/home.png'));
  await writeFile(
    path.join(dir, 'cairn-theme.json'),
    JSON.stringify({ screenshots: [{ path: 'screenshots/home.png', shows: 'The home page' }] }),
  );
  return dir;
}

test("Waymark's card is a 720 by 480 WebP within the limit", async () => {
  const card = await buildCard(path.join(ROOT, 'themes/waymark'));
  assert.equal(CARD_WIDTH, 720);
  assert.equal(CARD_HEIGHT, 480);
  const meta = await sharp(card.bytes).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 720);
  assert.equal(meta.height, 480);
  assert.equal(card.width, 720);
  assert.equal(card.height, 480);
  assert.equal(card.size, card.bytes.length);
  assert.ok(card.size <= MAX_CARD_BYTES, `${card.size} bytes`);
});

test("a first screenshot that isn't 3:2 is refused", async (t) => {
  const dir = await themeWithScreenshot(t, 390, 960, () => 128);
  await assert.rejects(buildCard(dir), /3:2/);
});

test('a card over 100 KB is refused with the limit', async (t) => {
  // Noise from a fixed linear congruential sequence, which WebP cannot compress to 100 KB.
  let seed = 1;
  const dir = await themeWithScreenshot(t, 1440, 960, () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed >> 16;
  });
  await assert.rejects(buildCard(dir), /100 KB/);
});
