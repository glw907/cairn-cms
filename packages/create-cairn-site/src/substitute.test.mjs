import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { applySubstitutions, hexToOklchHue } from './substitute.mjs';

const LIGHT_PRIMARY = '  --color-primary: oklch(45% 0.1 248);';
const LIGHT_CONTENT = '  --color-primary-content: oklch(99% 0.01 248);';
const DARK_PRIMARY = '  --color-primary: oklch(74% 0.1 248);';
const DARK_CONTENT = '  --color-primary-content: oklch(22% 0.03 248);';

/**
 * Make a temporary directory that is removed when the test that asked for it finishes.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the directory's absolute path
 */
async function tempDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-sub-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * Build a fixture directory reproducing the real showcase's substitution targets:
 * `src/theme/site.config.yaml` with the bare `siteName:` line and no `description:` key, and
 * `src/theme/theme.css` with both the light and dark brand blocks.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the fixture directory's absolute path
 */
async function fixture(t) {
  const dir = await tempDir(t);
  await mkdir(path.join(dir, 'src/theme'), { recursive: true });
  await writeFile(path.join(dir, 'src/theme/site.config.yaml'), 'siteName: Waymark\nmenus:\n  primary: []\n');
  await writeFile(
    path.join(dir, 'src/theme/theme.css'),
    [
      ':root, [data-theme="waymark-light"] {',
      LIGHT_PRIMARY,
      LIGHT_CONTENT,
      '}',
      '',
      '[data-theme="waymark-dark"] {',
      DARK_PRIMARY,
      DARK_CONTENT,
      '}',
      '',
    ].join('\n'),
  );
  return dir;
}

test('substitutes the site name in src/theme/site.config.yaml', async (t) => {
  const dir = await fixture(t);
  const changed = await applySubstitutions(dir, { name: 'Alpine Club', description: '', brandColor: '' });
  const yaml = await readFile(path.join(dir, 'src/theme/site.config.yaml'), 'utf8');
  assert.match(yaml, /^siteName: Alpine Club$/m);
  assert.ok(changed.includes('src/theme/site.config.yaml'));
});

test('a nonempty description is inserted after the siteName line; an empty one inserts nothing', async (t) => {
  const dir = await fixture(t);
  await applySubstitutions(dir, { name: 'Alpine Club', description: 'Notes from the range', brandColor: '' });
  const withDescription = await readFile(path.join(dir, 'src/theme/site.config.yaml'), 'utf8');
  const lines = withDescription.split('\n');
  const nameIndex = lines.findIndex((l) => l === 'siteName: Alpine Club');
  assert.equal(lines[nameIndex + 1], 'description: Notes from the range');

  const dir2 = await fixture(t);
  await applySubstitutions(dir2, { name: 'Alpine Club', description: '', brandColor: '' });
  const withoutDescription = await readFile(path.join(dir2, 'src/theme/site.config.yaml'), 'utf8');
  assert.ok(!withoutDescription.includes('description:'));
});

test('a brand color rotates the hue of all four declarations, holding lightness and chroma', async (t) => {
  const dir = await fixture(t);
  const changed = await applySubstitutions(dir, { name: 'Alpine Club', description: '', brandColor: '#0000ff' });
  const css = await readFile(path.join(dir, 'src/theme/theme.css'), 'utf8');
  assert.match(css, /--color-primary: oklch\(45% 0\.1 264\.05\);/);
  assert.match(css, /--color-primary-content: oklch\(99% 0\.01 264\.05\);/);
  assert.match(css, /--color-primary: oklch\(74% 0\.1 264\.05\);/);
  assert.match(css, /--color-primary-content: oklch\(22% 0\.03 264\.05\);/);
  assert.ok(changed.includes('src/theme/theme.css'));
});

test('no brandColor leaves theme.css byte-identical and absent from changed', async (t) => {
  const dir = await fixture(t);
  const before = await readFile(path.join(dir, 'src/theme/theme.css'), 'utf8');
  const changed = await applySubstitutions(dir, { name: 'Alpine Club', description: '', brandColor: '' });
  const after = await readFile(path.join(dir, 'src/theme/theme.css'), 'utf8');
  assert.equal(after, before);
  assert.ok(!changed.includes('src/theme/theme.css'));
});

test('a missing target string throws naming the file and the missing string', async (t) => {
  const dir = await fixture(t);
  await writeFile(path.join(dir, 'src/theme/site.config.yaml'), 'title: nope\n');
  await assert.rejects(
    () => applySubstitutions(dir, { name: 'X', description: '', brandColor: '' }),
    /site\.config\.yaml/,
  );
});

test('a missing target file throws naming it', async (t) => {
  const dir = await tempDir(t);
  await assert.rejects(
    () => applySubstitutions(dir, { name: 'X', description: '', brandColor: '' }),
    /site\.config\.yaml/,
  );
});

test('hexToOklchHue matches the verified CSS Color 4 vectors', () => {
  assert.equal(Number(hexToOklchHue('#ff0000').toFixed(2)), 29.23);
  assert.equal(Number(hexToOklchHue('#00ff00').toFixed(2)), 142.5);
  assert.equal(Number(hexToOklchHue('#0000ff').toFixed(2)), 264.05);
});

test('a bare number and an oklch(...) string are both accepted as brandColor', async (t) => {
  const dirNumber = await fixture(t);
  await applySubstitutions(dirNumber, { name: 'X', description: '', brandColor: '120' });
  const cssNumber = await readFile(path.join(dirNumber, 'src/theme/theme.css'), 'utf8');
  assert.match(cssNumber, /--color-primary: oklch\(45% 0\.1 120\);/);

  const dirOklch = await fixture(t);
  await applySubstitutions(dirOklch, { name: 'X', description: '', brandColor: 'oklch(50% 0.2 200)' });
  const cssOklch = await readFile(path.join(dirOklch, 'src/theme/theme.css'), 'utf8');
  assert.match(cssOklch, /--color-primary: oklch\(45% 0\.1 200\);/);
});

// Regression: the pass threw only when ZERO declarations matched, so a template that drifted
// half-way (two of the four rewritten into a form the pattern misses) would rotate the light
// block, leave the dark block on the old brand hue, and report success.
test('partial drift throws rather than rotating only some declarations', async (t) => {
  const dir = await fixture(t);
  const themePath = path.join(dir, 'src/theme/theme.css');
  const partial = (await readFile(themePath, 'utf8')).replace(
    '--color-primary: oklch(74% 0.1 248);',
    '--color-primary: oklch(0.74 0.1 248);',
  );
  await writeFile(themePath, partial);
  await assert.rejects(
    () => applySubstitutions(dir, { name: 'X', description: '', brandColor: '#0000ff' }),
    /matched 3/,
  );
});
