import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySubstitutions, hexToOklchHue, verifySiteConfigPath } from './substitute.mjs';

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
 * `src/theme/site.config.yaml` with the `siteName:` line and the tagline beneath it, and
 * `src/theme/theme.css` with both the light and dark brand blocks.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the fixture directory's absolute path
 */
async function fixture(t) {
  const dir = await tempDir(t);
  await mkdir(path.join(dir, 'src/theme'), { recursive: true });
  await writeFile(
    path.join(dir, 'src/theme/site.config.yaml'),
    'siteName: Waymark\ndescription: Trail reports and gear notes from the field.\nmenus:\n  primary: []\n',
  );
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

test('a nonempty description replaces the template tagline; an empty one removes it', async (t) => {
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

test('verifySiteConfigPath accepts a plain relative path', () => {
  assert.equal(verifySiteConfigPath('src/theme/site.config.yaml'), 'src/theme/site.config.yaml');
});

test('verifySiteConfigPath rejects a traversal-shaped value', () => {
  assert.throws(() => verifySiteConfigPath('../../etc/passwd'), /\.\./);
  assert.throws(() => verifySiteConfigPath('src/../../etc/passwd'), /\.\./);
});

test('verifySiteConfigPath rejects a leading slash', () => {
  assert.throws(() => verifySiteConfigPath('/etc/passwd'), /relative/);
});

test('verifySiteConfigPath rejects a NUL byte', () => {
  assert.throws(() => verifySiteConfigPath('site.config.yaml\0'), /NUL/);
});

test('verifySiteConfigPath rejects a non-string or empty value', () => {
  assert.throws(() => verifySiteConfigPath(undefined), /non-empty string/);
  assert.throws(() => verifySiteConfigPath(''), /non-empty string/);
});

// The DEFAULT shape ruling 5 sanctions: a generated data file both the doctor and the bake read
// as data, never a cross-package import (the bake never import()s engine code). One source of
// truth is proved here, not by a shared module: a synthetic doctor/bake divergence fails this
// test rather than shipping silently.
test('the committed site-config-path.json matches the engine doctor\'s own copy', () => {
  const bakeCopy = JSON.parse(
    readFileSync(fileURLToPath(new URL('./site-config-path.json', import.meta.url)), 'utf8'),
  );
  const engineCopy = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../../../src/lib/doctor/site-config-path.json', import.meta.url)),
      'utf8',
    ),
  );
  assert.deepEqual(bakeCopy, engineCopy);
});

// Regression: the pass wrote its own `description:` line without touching the template's, so a
// showcase that carries a tagline scaffolded a config with the key twice, which every YAML
// parser rejects as a duplicate map key. The fixture above cannot catch that on its own, since
// a hand-written fixture drifts from the showcase silently, so this reads the real source the
// template is emitted from.
test('the real showcase config personalizes to exactly one top-level description key', async (t) => {
  const showcaseConfig = readFileSync(
    fileURLToPath(new URL('../../../examples/showcase/src/theme/site.config.yaml', import.meta.url)),
    'utf8',
  );

  const withDescription = await tempDir(t);
  await mkdir(path.join(withDescription, 'src/theme'), { recursive: true });
  await writeFile(path.join(withDescription, 'src/theme/site.config.yaml'), showcaseConfig);
  await applySubstitutions(withDescription, {
    name: 'CI Site',
    description: 'Built by CI',
    brandColor: '',
  });
  const personalized = await readFile(path.join(withDescription, 'src/theme/site.config.yaml'), 'utf8');
  assert.deepEqual(
    personalized.split('\n').filter((line) => line.startsWith('description:')),
    ['description: Built by CI'],
  );
  assert.match(personalized, /^siteName: CI Site$/m);

  const withoutDescription = await tempDir(t);
  await mkdir(path.join(withoutDescription, 'src/theme'), { recursive: true });
  await writeFile(path.join(withoutDescription, 'src/theme/site.config.yaml'), showcaseConfig);
  await applySubstitutions(withoutDescription, { name: 'CI Site', description: '', brandColor: '' });
  const bare = await readFile(path.join(withoutDescription, 'src/theme/site.config.yaml'), 'utf8');
  assert.deepEqual(
    bare.split('\n').filter((line) => line.startsWith('description:')),
    [],
    'the showcase tagline must not survive into a site that answered no description',
  );
});
