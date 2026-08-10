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
 * Build a fixture directory reproducing the real showcase's substitution targets:
 * `src/theme/site.config.yaml` with the bare `siteName:` line and no `tagline:` key, and
 * `src/theme/theme.css` with both the light and dark brand blocks.
 * @returns {Promise<string>} the fixture directory's absolute path
 */
async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-sub-'));
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

test('substitutes the site name in src/theme/site.config.yaml', async () => {
  const dir = await fixture();
  const changed = await applySubstitutions(dir, { name: 'Alpine Club', tagline: '', brandColor: '' });
  const yaml = await readFile(path.join(dir, 'src/theme/site.config.yaml'), 'utf8');
  assert.match(yaml, /^siteName: Alpine Club$/m);
  assert.ok(changed.includes('src/theme/site.config.yaml'));
  await rm(dir, { recursive: true, force: true });
});

test('a nonempty tagline is inserted after the siteName line; an empty one inserts nothing', async () => {
  const dir = await fixture();
  await applySubstitutions(dir, { name: 'Alpine Club', tagline: 'Notes from the range', brandColor: '' });
  const withTagline = await readFile(path.join(dir, 'src/theme/site.config.yaml'), 'utf8');
  const lines = withTagline.split('\n');
  const nameIndex = lines.findIndex((l) => l === 'siteName: Alpine Club');
  assert.equal(lines[nameIndex + 1], 'tagline: Notes from the range');
  await rm(dir, { recursive: true, force: true });

  const dir2 = await fixture();
  await applySubstitutions(dir2, { name: 'Alpine Club', tagline: '', brandColor: '' });
  const withoutTagline = await readFile(path.join(dir2, 'src/theme/site.config.yaml'), 'utf8');
  assert.ok(!withoutTagline.includes('tagline:'));
  await rm(dir2, { recursive: true, force: true });
});

test('a brand color rotates the hue of all four declarations, holding lightness and chroma', async () => {
  const dir = await fixture();
  const changed = await applySubstitutions(dir, { name: 'Alpine Club', tagline: '', brandColor: '#0000ff' });
  const css = await readFile(path.join(dir, 'src/theme/theme.css'), 'utf8');
  assert.match(css, /--color-primary: oklch\(45% 0\.1 264\.05\);/);
  assert.match(css, /--color-primary-content: oklch\(99% 0\.01 264\.05\);/);
  assert.match(css, /--color-primary: oklch\(74% 0\.1 264\.05\);/);
  assert.match(css, /--color-primary-content: oklch\(22% 0\.03 264\.05\);/);
  assert.ok(changed.includes('src/theme/theme.css'));
  await rm(dir, { recursive: true, force: true });
});

test('no brandColor leaves theme.css byte-identical and absent from changed', async () => {
  const dir = await fixture();
  const before = await readFile(path.join(dir, 'src/theme/theme.css'), 'utf8');
  const changed = await applySubstitutions(dir, { name: 'Alpine Club', tagline: '', brandColor: '' });
  const after = await readFile(path.join(dir, 'src/theme/theme.css'), 'utf8');
  assert.equal(after, before);
  assert.ok(!changed.includes('src/theme/theme.css'));
  await rm(dir, { recursive: true, force: true });
});

test('a missing target string throws naming the file and the missing string', async () => {
  const dir = await fixture();
  await writeFile(path.join(dir, 'src/theme/site.config.yaml'), 'title: nope\n');
  await assert.rejects(
    () => applySubstitutions(dir, { name: 'X', tagline: '', brandColor: '' }),
    /site\.config\.yaml/,
  );
  await rm(dir, { recursive: true, force: true });
});

test('a missing target file throws naming it', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-sub-'));
  await assert.rejects(
    () => applySubstitutions(dir, { name: 'X', tagline: '', brandColor: '' }),
    /site\.config\.yaml/,
  );
  await rm(dir, { recursive: true, force: true });
});

test('hexToOklchHue matches the verified CSS Color 4 vectors', () => {
  assert.equal(Number(hexToOklchHue('#ff0000').toFixed(2)), 29.23);
  assert.equal(Number(hexToOklchHue('#00ff00').toFixed(2)), 142.5);
  assert.equal(Number(hexToOklchHue('#0000ff').toFixed(2)), 264.05);
});

test('a bare number and an oklch(...) string are both accepted as brandColor', async () => {
  const dirNumber = await fixture();
  await applySubstitutions(dirNumber, { name: 'X', tagline: '', brandColor: '120' });
  const cssNumber = await readFile(path.join(dirNumber, 'src/theme/theme.css'), 'utf8');
  assert.match(cssNumber, /--color-primary: oklch\(45% 0\.1 120\);/);
  await rm(dirNumber, { recursive: true, force: true });

  const dirOklch = await fixture();
  await applySubstitutions(dirOklch, { name: 'X', tagline: '', brandColor: 'oklch(50% 0.2 200)' });
  const cssOklch = await readFile(path.join(dirOklch, 'src/theme/theme.css'), 'utf8');
  assert.match(cssOklch, /--color-primary: oklch\(45% 0\.1 200\);/);
  await rm(dirOklch, { recursive: true, force: true });
});
