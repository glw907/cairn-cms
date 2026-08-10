import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, access, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scaffold, handoverText, dryRunNotice } from './scaffold.mjs';

// Every scaffold test answers identically: the name is what the slug and the substitution
// assertions key on, and both optional answers stay empty. Frozen so a scaffold run that ever
// mutated its answers would fail here rather than leak into the next test.
const ANSWERS = Object.freeze({ name: 'Alpine Club', tagline: '', brandColor: '' });

/**
 * Make a temporary directory that is removed when the test that asked for it finishes.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the directory's absolute path
 */
async function tempDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * Set CAIRN_STATE_DIR to a fresh temp directory for a test, restoring the prior value (or
 * deleting the var) once the test finishes, so tests never leak state between each other or into
 * a developer's real `~/.config/cairn/sites`.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the state directory's absolute path
 */
async function withStateDir(t) {
  const previous = process.env.CAIRN_STATE_DIR;
  const dir = await tempDir(t);
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    if (previous === undefined) delete process.env.CAIRN_STATE_DIR;
    else process.env.CAIRN_STATE_DIR = previous;
  });
  return dir;
}

/**
 * Build a fixture template directory reproducing the REAL showcase layout that
 * applySubstitutions reads (`src/theme/site.config.yaml`, `src/theme/theme.css`), not the
 * plan's stale root-level guess.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the fixture template's absolute path
 */
async function templateFixture(t) {
  const dir = await tempDir(t);
  await writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'cairn-site', dependencies: { '@glw907/cairn-cms': '^0.94.0' } }),
  );
  await mkdir(path.join(dir, 'src/theme'), { recursive: true });
  await writeFile(path.join(dir, 'src/theme/site.config.yaml'), 'siteName: Waymark\n');
  await writeFile(
    path.join(dir, 'src/theme/theme.css'),
    '--color-primary: oklch(45% 0.15 30);\n',
  );
  return dir;
}

test('dry run creates nothing and lists every action', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  const lines = [];
  await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: true,
    log: (line) => lines.push(line),
  });
  await assert.rejects(() => access(dir));
  assert.ok(lines.length >= 3);
});

test('real run scaffolds, renames, substitutes, and saves state outside the scaffold', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: false,
    log: () => {},
  });
  const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'alpine-club');
  assert.match(await readFile(path.join(dir, 'src/theme/site.config.yaml'), 'utf8'), /Alpine Club/);
  await assert.rejects(() => access(path.join(dir, '.cairn-state.json')), undefined,
    'no state under the scaffold');
});

test('a missing template directory fails with a message naming the bake', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  const missingTemplate = path.join(outDir, 'no-such-template');
  await assert.rejects(
    () => scaffold({
      templateDir: missingTemplate,
      answers: ANSWERS,
      dir,
      dryRun: false,
      log: () => {},
    }),
    /npm run prepack/,
  );
});

test('a non-empty target directory is refused before any file is written', async (t) => {
  const stateDir = await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'already-here.txt'), 'pre-existing\n');

  const fixtureDir = await templateFixture(t);
  await assert.rejects(
    () => scaffold({
      templateDir: fixtureDir,
      answers: ANSWERS,
      dir,
      dryRun: false,
      log: () => {},
    }),
    /already exists and is not empty/,
  );
  // The refusal runs before any action, including the out-of-scaffold state save.
  assert.deepEqual(await readdir(stateDir), []);
});

test('an existing empty target directory is fine', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  await mkdir(dir, { recursive: true });
  await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: false,
    log: () => {},
  });
  const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'alpine-club');
});

test('the hand-over block names CAIRN_DEV_BACKEND and never prints a bare npm run dev line', () => {
  const text = handoverText({ dir: 'alpine-club', platform: 'linux' });
  assert.match(text, /CAIRN_DEV_BACKEND=1/);
  assert.ok(text.includes('CAIRN_DEV_BACKEND=1 npm run dev'));
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === 'npm run dev') {
      assert.fail('found a bare "npm run dev" line unaccompanied by the CAIRN_DEV_BACKEND switch');
    }
  }
});

test('an absolute --dir prints without a doubled leading slash', () => {
  const text = handoverText({ dir: '/tmp/alpine-dry', platform: 'linux' });
  assert.ok(text.startsWith('Your site is scaffolded at /tmp/alpine-dry.'));
  assert.ok(!text.includes('.//tmp'));
});

test('a dry run closes by saying nothing was created, never that the site is scaffolded', () => {
  const text = dryRunNotice({ dir: '/tmp/alpine-dry' });
  assert.match(text, /nothing was written/);
  assert.ok(text.includes('/tmp/alpine-dry'));
  assert.ok(!text.includes('Your site is scaffolded'));
});

test('the win32 branch prints the PowerShell form instead of the env-prefix form', () => {
  const text = handoverText({ dir: 'alpine-club', platform: 'win32' });
  assert.ok(text.includes('$env:CAIRN_DEV_BACKEND=1; npm run dev'));
  assert.ok(!text.includes('CAIRN_DEV_BACKEND=1 npm run dev'));
});
