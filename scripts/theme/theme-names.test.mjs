import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateThemeNames, COOKIE_NAME } from './theme-names.mjs';

const SHOWCASE = path.resolve(import.meta.dirname, '../../examples/showcase');
const WAYMARK = { light: 'cairn', dark: 'cairn-dark' };

/** A scratch site holding the showcase's committed app.html, ready for a generator run. */
async function scratchSite(transformHtml = (html) => html) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-theme-names-'));
  await mkdir(path.join(dir, 'src/theme'), { recursive: true });
  const html = await readFile(path.join(SHOWCASE, 'src/app.html'), 'utf8');
  await writeFile(path.join(dir, 'src/app.html'), transformHtml(html));
  return dir;
}

test('the generator names a theme in both files', async () => {
  const dir = await scratchSite();
  try {
    generateThemeNames(dir, { light: 'survey', dark: 'survey-dark' });
    const names = await readFile(path.join(dir, 'src/theme/theme-names.ts'), 'utf8');
    const html = await readFile(path.join(dir, 'src/app.html'), 'utf8');
    assert.match(names, /light: 'survey'/);
    assert.match(names, /dark: 'survey-dark'/);
    assert.match(names, /export type Theme = 'survey' \| 'survey-dark'/);
    assert.match(html, /cairn-site-theme=\(survey-dark\|survey\)/);
    assert.doesNotMatch(html, /cairn-dark/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a missing marker throws, naming the marker and leaving the file alone', async () => {
  for (const marker of ['cairn-theme-names:start', 'cairn-theme-names:end']) {
    const dir = await scratchSite((html) => html.replace(marker, 'removed'));
    try {
      const before = await readFile(path.join(dir, 'src/app.html'), 'utf8');
      assert.throws(() => generateThemeNames(dir, WAYMARK), new RegExp(marker));
      assert.equal(await readFile(path.join(dir, 'src/app.html'), 'utf8'), before);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

test("Waymark's names leave the committed app.html byte-identical", async () => {
  const dir = await scratchSite();
  try {
    generateThemeNames(dir, WAYMARK);
    assert.equal(
      await readFile(path.join(dir, 'src/app.html'), 'utf8'),
      await readFile(path.join(SHOWCASE, 'src/app.html'), 'utf8'),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Waymark's manifest names the two themes the generator is fed", async () => {
  const manifest = JSON.parse(await readFile(path.join(SHOWCASE, '../../themes/waymark/cairn-theme.json'), 'utf8'));
  assert.deepEqual(manifest.colorModes, WAYMARK);
});

test("Waymark's names match the two daisyUI theme blocks in its stylesheet", async () => {
  const css = (await readFile(path.join(SHOWCASE, '../../themes/waymark/theme.css'), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
  const names = [...css.matchAll(/@plugin\s+"daisyui\/theme"\s*\{[^}]*?\bname:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(names.sort(), [WAYMARK.light, WAYMARK.dark].sort());
});

test("the regex in app.html accepts exactly the manifest's two names", async () => {
  const html = await readFile(path.join(SHOWCASE, 'src/app.html'), 'utf8');
  const source = /document\.cookie\.match\(\/(.+)\/\)/.exec(html)?.[1];
  assert.ok(source, 'app.html carries a document.cookie.match regex literal');
  const pattern = new RegExp(source);
  assert.equal(pattern.exec(`${COOKIE_NAME}=${WAYMARK.light}`)?.[1], WAYMARK.light);
  assert.equal(pattern.exec(`${COOKIE_NAME}=${WAYMARK.dark}`)?.[1], WAYMARK.dark);
  assert.equal(pattern.test(`${COOKIE_NAME}=${WAYMARK.light}-retired`), false);
  assert.equal(pattern.test(`${COOKIE_NAME}=retired`), false);
});
