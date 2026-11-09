// The viewer's headless mode on the options fixture: one conformance page, two widths, both color
// modes, and both accent values give eight PNGs, the accent changes the pixels, and a dark build's
// options sheet ends with the dark mode sheet.
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { test } from 'node:test';
import path from 'node:path';
import { runHeadless } from './viewer.mjs';
import { copyOptionsFixture } from './viewer/fixture.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('headless mode writes eight PNGs, the accent changes them, and the dark runs end with the dark mode sheet', { timeout: 800_000 }, async () => {
  const fixture = copyOptionsFixture();
  const darkSheet = readFileSync(path.join(fixture.dir, 'modes/dark.css'), 'utf8');
  /** @type {string[]} */
  const sheets = [];
  try {
    const shots = await runHeadless({
      root: REPO,
      theme: fixture.dir,
      pages: ['/commonmark-blocks'],
      widths: [390, 1440],
      options: { accent: ['ember', 'tide'] },
      inspect: (shot, _body, siteDir) => {
        if (shot.mode === 'dark') sheets.push(readFileSync(path.join(siteDir, 'src/site/theme-options.css'), 'utf8'));
      },
    });
    assert.equal(shots.length, 8, 'two widths, two modes, two accents');
    const files = new Set(shots.map((shot) => shot.file));
    assert.equal(files.size, 8, 'each shot names its own file');
    for (const shot of shots) {
      assert.equal(shot.status, 200, `${shot.page} at ${shot.width}`);
      assert.deepEqual(shot.consoleErrors, []);
      assert.equal(shot.theme, 'options-theme');
      assert.ok(readFileSync(shot.file).subarray(0, 8).equals(PNG_MAGIC), `${shot.file} is a PNG`);
    }
    const png = (/** @type {string} */ accent, /** @type {string} */ mode, /** @type {number} */ width) => {
      const shot = shots.find((s) => s.options.accent === accent && s.mode === mode && s.width === width);
      assert.ok(shot, `a shot for ${accent} ${mode} ${width}`);
      return readFileSync(shot.file);
    };
    for (const mode of ['light', 'dark']) {
      for (const width of [390, 1440]) {
        assert.ok(!png('ember', mode, width).equals(png('tide', mode, width)), `the accents differ at ${mode} ${width}`);
      }
    }
    assert.equal(sheets.length, 4, 'two accents and two widths make four dark runs');
    for (const sheet of sheets) assert.ok(sheet.endsWith(darkSheet), 'the dark runs end with modes/dark.css');
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
