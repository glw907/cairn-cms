import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  bake,
  bakeForPacking,
  assertInstallableSpec,
  PRUNED_SCRIPTS,
  PRUNED_DEV_DEPENDENCIES,
  pruneShowcaseOnlyPackageFields,
  rewriteDevScript,
} from './bake-template.mjs';
import { TEMPLATE_GITHUB_APP_LITERAL } from '../src/github/finalize.mjs';

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

// The rot gate: finalizeGithubIdentity (src/github/finalize.mjs) rewrites this exact literal in
// a pushed scaffold's cairn.config.ts, verified against the showcase directly. Pinning it here
// too means showcase drift that changes the backend line's shape fails this fast bake test,
// rather than surfacing only inside a live create-cairn-site run against real GitHub.
test('the baked template\'s cairn.config.ts carries the exact githubApp(...) literal finalizeGithubIdentity targets', async (t) => {
  const to = await tempTarget(t);
  await bake({ to, ...PUBLISHED_SPECS });
  const config = await readFile(path.join(to, 'src/theme/cairn.config.ts'), 'utf8');
  assert.ok(
    config.includes(TEMPLATE_GITHUB_APP_LITERAL),
    `expected the baked cairn.config.ts to contain "${TEMPLATE_GITHUB_APP_LITERAL}"`,
  );
});

// @glw907/cairn-cms-dev first published at the 0.95.0-rc.1 cut, so bake() now resolves a usable
// default devSpec instead of refusing one. This is the update the previous version of this test
// asked for in its own comment. The refusal it used to prove is not lost: assertInstallableSpec
// is exercised directly below against a constructed 0.0.0, which tests the guard's contract
// rather than a passing state of the repo's own version files.
test('bake with no overrides resolves installable default specs', async (t) => {
  const to = await tempTarget(t);
  await bake({ to });
  const pkg = JSON.parse(await readFile(path.join(to, 'package.json'), 'utf8'));
  // A caret on a prerelease is admitted: the specs the bake resolves track the repo's own
  // versions, and a release line opens on an rc before its stable exists.
  const INSTALLABLE = /^\^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
  assert.match(pkg.dependencies['@glw907/cairn-cms'], INSTALLABLE);
  assert.match(pkg.devDependencies['@glw907/cairn-cms-dev'], INSTALLABLE);
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

test('bake emits a tree with no showcase-only .claude directory, and scripts/ holds exactly dev.mjs', async (t) => {
  const to = await tempTarget(t);
  await bake({ to, ...PUBLISHED_SPECS });
  await assert.rejects(() => access(path.join(to, '.claude')));
  const scriptsEntries = await readdir(path.join(to, 'scripts'));
  assert.deepEqual(scriptsEntries, ['dev.mjs']);
});

test('the dev shim names CAIRN_DEV_BACKEND', async (t) => {
  const to = await tempTarget(t);
  await bake({ to, ...PUBLISHED_SPECS });
  const shim = await readFile(path.join(to, 'scripts', 'dev.mjs'), 'utf8');
  assert.match(shim, /CAIRN_DEV_BACKEND/);
});

test('bake rewrites package.json.scripts.dev to run the shim', async (t) => {
  const to = await tempTarget(t);
  await bake({ to, ...PUBLISHED_SPECS });
  const pkg = JSON.parse(await readFile(path.join(to, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.dev, 'node scripts/dev.mjs');
});

// The rot gate: rewriteDevScript must fail loud when the showcase's own dev script is not the
// exact string it expects to replace, rather than silently overwrite an unrelated command.
test('rewriteDevScript throws naming an unexpected showcase dev script', () => {
  const pkg = { scripts: { dev: 'vite dev --host' } };
  assert.throws(
    () => rewriteDevScript(pkg),
    /expected the showcase dev script to be "vite dev", found "vite dev --host"/,
  );
});

// Plain bake() (sync-template-repo.mjs's own entry point) keeps the emitted .gitignore under its
// real dot name: a git-hosted template repo has no npm packlist to strip it, and the sync's own
// overlay appends its `.dev.vars.example` negation onto that exact file (OVERLAY_MERGE_RULES).
test('bake keeps the emitted .gitignore under its real name, covering the secret-bearing entries', async (t) => {
  const to = await tempTarget(t);
  await bake({ to, ...PUBLISHED_SPECS });
  await assert.rejects(
    () => access(path.join(to, 'gitignore')),
    'no dot-free gitignore should exist after plain bake()',
  );
  const gitignore = await readFile(path.join(to, '.gitignore'), 'utf8');
  assert.match(gitignore, /\.dev\.vars/);
  assert.match(gitignore, /\.wrangler/);
});

// The rot gate against npm's own packlist: it drops any file literally named ".gitignore" from a
// published tarball, so bakeForPacking (create-cairn-site's own prepack entry point) must rename
// the emitted copy to a dot-free name before packing; scaffold.mjs renames it back on the way out.
test('bakeForPacking renames the emitted .gitignore to a dot-free "gitignore", covering the secret-bearing entries', async (t) => {
  const to = await tempTarget(t);
  await bakeForPacking({ to, ...PUBLISHED_SPECS });
  await assert.rejects(
    () => access(path.join(to, '.gitignore')),
    'no dot-prefixed .gitignore should survive bakeForPacking',
  );
  const gitignore = await readFile(path.join(to, 'gitignore'), 'utf8');
  assert.match(gitignore, /\.dev\.vars/);
  assert.match(gitignore, /\.wrangler/);
});

test('bake writes a site README that is not the showcase README', async (t) => {
  const to = await tempTarget(t);
  await bake({ to, ...PUBLISHED_SPECS });
  const readme = await readFile(path.join(to, 'README.md'), 'utf8');
  assert.ok(!readme.includes('cairn showcase'));
  assert.ok(!readme.includes('../../docs'));
});

// The scaffold's own dev script now sets CAIRN_DEV_BACKEND at runtime (scripts/dev.mjs), so the
// README teaches plain `npm run dev` and must never mention the variable or a PowerShell branch.
test('the baked README teaches plain npm run dev and never mentions CAIRN_DEV_BACKEND', async (t) => {
  const to = await tempTarget(t);
  await bake({ to, ...PUBLISHED_SPECS });
  const readme = await readFile(path.join(to, 'README.md'), 'utf8');
  assert.match(readme, /npm run dev/);
  assert.ok(!readme.includes('CAIRN_DEV_BACKEND'));
  assert.ok(!readme.includes('$env:'));
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
