// The catalog screenshots: each PNG a manifest names exists, and its IHDR carries the size the
// viewer's `--viewport-only` run gives, 1440 by 960 for the two desktop shots and 390 wide for the
// mobile one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../repo-root.mjs';

const THEME = path.join(repoRoot(import.meta.url), 'themes/waymark');

/**
 * Read a PNG's width and height from its IHDR chunk.
 * @param {string} file
 * @returns {{ width: number, height: number }}
 */
function size(file) {
  const bytes = readFileSync(file);
  assert.equal(bytes.subarray(1, 4).toString('latin1'), 'PNG', `${file} is a PNG`);
  assert.equal(bytes.subarray(12, 16).toString('latin1'), 'IHDR');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test("waymark's manifest names the three screenshots, at the sizes the viewer writes", () => {
  const manifest = JSON.parse(readFileSync(path.join(THEME, 'cairn-theme.json'), 'utf8'));
  const sizes = Object.fromEntries(manifest.screenshots.map((shot) => [shot.path, size(path.join(THEME, shot.path))]));
  assert.deepEqual(Object.keys(sizes).sort(), ['screenshots/home-dark.png', 'screenshots/home-light.png', 'screenshots/home-mobile.png']);
  for (const name of ['home-light', 'home-dark']) assert.deepEqual(sizes[`screenshots/${name}.png`], { width: 1440, height: 960 });
  assert.equal(sizes['screenshots/home-mobile.png'].width, 390);
});
