import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  applyOverlay,
  composeTemplate,
  diffTrees,
  OVERLAY_DIR,
  TEMPLATE_DIR,
} from './emit-template-dir.mjs';
import { walk } from '../../../scripts/walk-files.mjs';

// Published specs, so a compose under test never depends on what the monorepo's own versions
// happen to be.
const PUBLISHED_SPECS = { engineSpec: '^0.95.0', devSpec: '^0.95.0' };

/**
 * Make a scratch directory that is removed when the test that asked for it finishes.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the directory's absolute path
 */
async function tempDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'emit-template-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('the template lands outside the workspace glob, so it keeps its own install', async () => {
  const rootPackageJson = path.resolve(import.meta.dirname, '../../../package.json');
  const rootPkg = JSON.parse(await readFile(rootPackageJson, 'utf8'));
  // Cloudflare treats the subdirectory as the root of the repo it creates and requires the app be
  // fully isolated within it. A `packages/*` member would be hoisted to the root lockfile instead.
  for (const glob of rootPkg.workspaces) {
    const prefix = glob.replace(/\*+$/, '');
    assert.ok(
      !TEMPLATE_DIR.startsWith(prefix),
      `${TEMPLATE_DIR} must not sit under the workspace glob ${glob}`,
    );
  }
});

test('applyOverlay replaces a baked file and appends the gitignore negation', async (t) => {
  const source = await tempDir(t);
  const overlay = await tempDir(t);
  await writeFile(path.join(source, 'README.md'), 'baked readme\n');
  await writeFile(path.join(source, '.gitignore'), '.dev.vars.*\n');
  await writeFile(path.join(overlay, 'README.md'), 'overlay readme\n');
  await writeFile(path.join(overlay, '.gitignore'), '!.dev.vars.example\n');

  await applyOverlay(source, overlay);

  assert.equal(await readFile(path.join(source, 'README.md'), 'utf8'), 'overlay readme\n');
  // The negation must land AFTER the ignore line it negates, or git ignores the file anyway.
  assert.equal(
    await readFile(path.join(source, '.gitignore'), 'utf8'),
    '.dev.vars.*\n!.dev.vars.example\n',
  );
});

test('a composed tree carries the overlay files the deploy flow reads', async (t) => {
  const composed = await composeTemplate(PUBLISHED_SPECS);
  t.after(() => rm(composed, { recursive: true, force: true }));

  // Cloudflare's deploy-buttons doc names .dev.vars.example as how a template declares the
  // secrets its flow prompts for, and the baked showcase has none; the overlay supplies it.
  const ignore = await readFile(path.join(composed, '.gitignore'), 'utf8');
  assert.match(ignore, /^!\.dev\.vars\.example$/m, 'the gitignore negation must survive the bake');
  await readFile(path.join(composed, '.dev.vars.example'), 'utf8');
  await readFile(path.join(composed, 'LICENSE'), 'utf8');

  const pkg = JSON.parse(await readFile(path.join(composed, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies['@glw907/cairn-cms'], PUBLISHED_SPECS.engineSpec);
});

test('diffTrees reports a changed, a missing, and an extra file', async (t) => {
  const fresh = await tempDir(t);
  const committed = await tempDir(t);
  await writeFile(path.join(fresh, 'same.txt'), 'x\n');
  await writeFile(path.join(committed, 'same.txt'), 'x\n');
  await writeFile(path.join(fresh, 'changed.txt'), 'a\n');
  await writeFile(path.join(committed, 'changed.txt'), 'b\n');
  await mkdir(path.join(fresh, 'nested'), { recursive: true });
  await writeFile(path.join(fresh, 'nested', 'only-fresh.txt'), 'a\n');
  await writeFile(path.join(committed, 'stale.txt'), 'a\n');

  const differences = await diffTrees(fresh, committed);

  assert.deepEqual(differences, [
    'differs: changed.txt',
    `missing from the repo: ${path.join('nested', 'only-fresh.txt')}`,
    'not produced by the bake: stale.txt',
  ]);
});

test('diffTrees is empty for identical trees, so the gate can pass', async (t) => {
  const fresh = await tempDir(t);
  const committed = await tempDir(t);
  await writeFile(path.join(fresh, 'f.txt'), 'same\n');
  await writeFile(path.join(committed, 'f.txt'), 'same\n');

  assert.deepEqual(await diffTrees(fresh, committed), []);
});

test('the overlay directory holds only the repo-only files, not a second copy of the site', () => {
  const files = walk(OVERLAY_DIR, () => true)
    .map((file) => path.relative(OVERLAY_DIR, file))
    .sort();
  assert.deepEqual(files, ['.dev.vars.example', '.gitignore', 'LICENSE', 'README.md']);
});
