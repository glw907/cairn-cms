import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformPackageJson, isExcluded } from './emit-template.mjs';

test('transformPackageJson rewrites the engine and dev specs and renames the package', () => {
  const input = {
    name: 'cairn-showcase',
    private: true,
    dependencies: { '@glw907/cairn-cms': 'file:../..' },
    devDependencies: { '@glw907/cairn-cms-dev': 'file:../../packages/cairn-cms-dev', vite: '^8' },
  };
  const out = transformPackageJson(input, {
    name: 'my-cairn-site',
    engineSpec: 'file:/tmp/glw907-cairn-cms-0.64.0.tgz',
    devSpec: 'file:/tmp/glw907-cairn-cms-dev-0.64.0.tgz',
  });
  assert.equal(out.name, 'my-cairn-site');
  assert.equal(out.dependencies['@glw907/cairn-cms'], 'file:/tmp/glw907-cairn-cms-0.64.0.tgz');
  assert.equal(out.devDependencies['@glw907/cairn-cms-dev'], 'file:/tmp/glw907-cairn-cms-dev-0.64.0.tgz');
  assert.equal(out.devDependencies.vite, '^8');
});

test('isExcluded matches an excluded dir and its children, not a prefix sibling', () => {
  const exclude = ['src/routes/test', 'playwright.config.ts'];
  assert.equal(isExcluded('src/routes/test', exclude), true);
  assert.equal(isExcluded('src/routes/test/last-commit/+server.ts', exclude), true);
  assert.equal(isExcluded('playwright.config.ts', exclude), true);
  assert.equal(isExcluded('src/routes/testimonials/+page.svelte', exclude), false);
  assert.equal(isExcluded('src/routes/(site)/+page.svelte', exclude), false);
});
