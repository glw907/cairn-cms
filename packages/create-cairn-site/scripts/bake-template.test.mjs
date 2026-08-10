import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { bake } from './bake-template.mjs';

test('bake emits the template with published-engine specs when both specs are given', async () => {
  const to = await mkdtemp(path.join(tmpdir(), 'cairn-bake-'));
  await bake({ to, engineSpec: '^0.94.0', devSpec: '^0.1.0' });
  const pkg = JSON.parse(await readFile(path.join(to, 'package.json'), 'utf8'));
  assert.match(pkg.dependencies['@glw907/cairn-cms'], /^\^\d+\.\d+\.\d+$/);
  assert.ok(!JSON.stringify(pkg).includes('file:'), 'no workspace-relative specs survive');
  await rm(to, { recursive: true, force: true });
});

test('bake emits a real tree, not just a rewritten package.json', async () => {
  const to = await mkdtemp(path.join(tmpdir(), 'cairn-bake-'));
  await bake({ to, engineSpec: '^0.94.0', devSpec: '^0.1.0' });
  await access(path.join(to, 'package.json'));
  await access(path.join(to, 'src'));
  await access(path.join(to, 'wrangler.jsonc'));
  await rm(to, { recursive: true, force: true });
});

// @glw907/cairn-cms-dev is unpublished (version 0.0.0 in packages/cairn-cms-dev/package.json)
// as of this writing, so bake() cannot resolve a usable default devSpec and must throw rather
// than emit a scaffold whose devDependency install fails. Once the dev backend is published,
// update this test to assert the resolved default matches /^\^\d+\.\d+\.\d+$/ instead.
test('bake with no overrides throws naming the unpublished dev backend', async () => {
  const to = await mkdtemp(path.join(tmpdir(), 'cairn-bake-'));
  await assert.rejects(
    () => bake({ to }),
    (err) => {
      assert.match(err.message, /@glw907\/cairn-cms-dev/);
      assert.match(err.message, /0\.0\.0/);
      return true;
    },
  );
  await rm(to, { recursive: true, force: true });
});

test('an explicit file: devSpec throws naming the file: spec', async () => {
  const to = await mkdtemp(path.join(tmpdir(), 'cairn-bake-'));
  await assert.rejects(
    () => bake({ to, engineSpec: '^0.94.0', devSpec: 'file:../whatever' }),
    (err) => {
      assert.match(err.message, /file:/);
      return true;
    },
  );
  await rm(to, { recursive: true, force: true });
});
