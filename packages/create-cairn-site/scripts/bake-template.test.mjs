import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { bake, assertInstallableSpec, PRUNED_SCRIPTS, PRUNED_DEV_DEPENDENCIES, pruneShowcaseOnlyPackageFields } from './bake-template.mjs';

// Published specs, so a bake under test never depends on what the monorepo's own versions
// happen to be. The unresolvable defaults have their own test below.
const PUBLISHED_SPECS = { engineSpec: '^0.94.0', devSpec: '^0.1.0' };

/**
 * Make a temporary emit target that is removed when the test that asked for it finishes.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the directory's absolute path
 */
async function tempTarget(t) {
  const to = await mkdtemp(path.join(tmpdir(), 'cairn-bake-'));
  t.after(() => rm(to, { recursive: true, force: true }));
  return to;
}

test('bake emits the template with published-engine specs when both specs are given', async (t) => {
  const to = await tempTarget(t);
  await bake({ to, ...PUBLISHED_SPECS });
  const pkg = JSON.parse(await readFile(path.join(to, 'package.json'), 'utf8'));
  assert.match(pkg.dependencies['@glw907/cairn-cms'], /^\^\d+\.\d+\.\d+$/);
  assert.ok(!JSON.stringify(pkg).includes('file:'), 'no workspace-relative specs survive');
});

test('bake emits a real tree, not just a rewritten package.json', async (t) => {
  const to = await tempTarget(t);
  await bake({ to, ...PUBLISHED_SPECS });
  await access(path.join(to, 'package.json'));
  await access(path.join(to, 'src'));
  await access(path.join(to, 'wrangler.jsonc'));
});

// @glw907/cairn-cms-dev is unpublished (version 0.0.0 in packages/cairn-cms-dev/package.json)
// as of this writing, so bake() cannot resolve a usable default devSpec and must throw rather
// than emit a scaffold whose devDependency install fails. Once the dev backend is published,
// update this test to assert the resolved default matches /^\^\d+\.\d+\.\d+$/ instead.
test('bake with no overrides throws naming the unpublished dev backend', async (t) => {
  const to = await tempTarget(t);
  await assert.rejects(
    () => bake({ to }),
    (err) => {
      assert.match(err.message, /@glw907\/cairn-cms-dev/);
      assert.match(err.message, /0\.0\.0/);
      return true;
    },
  );
});

test('an explicit file: devSpec throws naming the file: spec', async (t) => {
  const to = await tempTarget(t);
  await assert.rejects(
    () => bake({ to, ...PUBLISHED_SPECS, devSpec: 'file:../whatever' }),
    (err) => {
      assert.match(err.message, /file:/);
      return true;
    },
  );
});

// Regression: the unpublished-version check tested the spec as a substring, so `^10.0.0` and
// `^20.0.0` both contained the literal "0.0.0" and failed a gate they should pass.
test('a high major version is not mistaken for an unpublished 0.0.0', () => {
  for (const spec of ['^10.0.0', '^20.0.0', '^1.0.0', '^0.94.0']) {
    assert.doesNotThrow(() => assertInstallableSpec('@glw907/cairn-cms', spec), spec);
  }
  for (const spec of ['^0.0.0', '0.0.0', '^0.0.0-rc.1']) {
    assert.throws(() => assertInstallableSpec('@glw907/cairn-cms-dev', spec), /0\.0\.0/, spec);
  }
});

test('bake prunes showcase-only scripts and devDependencies, keeping the rest', async (t) => {
  const to = await tempTarget(t);
  await bake({ to, ...PUBLISHED_SPECS });
  const pkg = JSON.parse(await readFile(path.join(to, 'package.json'), 'utf8'));
  for (const script of PRUNED_SCRIPTS) {
    assert.ok(!(script in pkg.scripts), `expected ${script} to be pruned from scripts`);
  }
  for (const dep of PRUNED_DEV_DEPENDENCIES) {
    assert.ok(!(dep in pkg.devDependencies), `expected ${dep} to be pruned from devDependencies`);
  }
  assert.ok('dev' in pkg.scripts);
  assert.ok('build' in pkg.scripts);
  assert.ok('check' in pkg.scripts);
  assert.ok('cairn:manifest' in pkg.scripts);
});

test('bake emits a tree with no showcase-only .claude or scripts directory', async (t) => {
  const to = await tempTarget(t);
  await bake({ to, ...PUBLISHED_SPECS });
  await assert.rejects(() => access(path.join(to, '.claude')));
  await assert.rejects(() => access(path.join(to, 'scripts')));
});

test('bake writes a site README that is not the showcase README', async (t) => {
  const to = await tempTarget(t);
  await bake({ to, ...PUBLISHED_SPECS });
  const readme = await readFile(path.join(to, 'README.md'), 'utf8');
  assert.ok(!readme.includes('cairn showcase'));
  assert.ok(!readme.includes('../../docs'));
});

// The rot gate: pruneShowcaseOnlyPackageFields must fail loud when the showcase drops or renames
// one of the fields it expects to remove, rather than silently doing nothing.
test('pruneShowcaseOnlyPackageFields throws naming a missing expected script', () => {
  const pkg = {
    scripts: { dev: 'vite dev', 'test:e2e': 'playwright test', 'design:probe': 'node scripts/design-probe.mjs' },
    devDependencies: { '@playwright/test': '^1.60.0', '@axe-core/playwright': '^4.10.0' },
  };
  // pretest:e2e is missing from scripts.
  assert.throws(() => pruneShowcaseOnlyPackageFields(pkg), /pretest:e2e/);
});

test('pruneShowcaseOnlyPackageFields throws naming a missing expected devDependency', () => {
  const pkg = {
    scripts: {
      dev: 'vite dev',
      'pretest:e2e': 'npm --prefix ../.. run package',
      'test:e2e': 'playwright test',
      'design:probe': 'node scripts/design-probe.mjs',
    },
    devDependencies: { '@playwright/test': '^1.60.0' },
  };
  // @axe-core/playwright is missing from devDependencies.
  assert.throws(() => pruneShowcaseOnlyPackageFields(pkg), /@axe-core\/playwright/);
});
