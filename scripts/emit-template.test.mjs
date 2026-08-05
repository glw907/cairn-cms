import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformPackageJson, isExcluded, stripMarkedBlocks } from './emit-template.mjs';

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

test('stripMarkedBlocks drops every line from start through end, inclusive, and leaves the rest', () => {
  const content = [
    'kept-before',
    '// cairn-template:exclude-start',
    'dropped-one',
    'dropped-two',
    '// cairn-template:exclude-end',
    'kept-after',
  ].join('\n');
  assert.equal(stripMarkedBlocks(content, 'fixture.ts'), 'kept-before\nkept-after');
});

test('stripMarkedBlocks carries the marker as a substring, so any comment form works', () => {
  const content = ['kept', '  # cairn-template:exclude-start', 'gone', '  # cairn-template:exclude-end'].join('\n');
  assert.equal(stripMarkedBlocks(content, 'fixture.sh'), 'kept');
});

test('stripMarkedBlocks throws, naming the file, on an unterminated start marker', () => {
  const content = ['kept', '// cairn-template:exclude-start', 'never-closed'].join('\n');
  assert.throws(() => stripMarkedBlocks(content, 'unterminated.ts'), /unterminated.ts/);
});

test('stripMarkedBlocks throws, naming the file, on a nested start marker', () => {
  const content = [
    '// cairn-template:exclude-start',
    'one',
    '// cairn-template:exclude-start',
    'two',
    '// cairn-template:exclude-end',
  ].join('\n');
  assert.throws(() => stripMarkedBlocks(content, 'nested.ts'), /nested.ts/);
});

test('stripMarkedBlocks throws, naming the file, on an end marker with no matching start', () => {
  const content = ['kept', '// cairn-template:exclude-end'].join('\n');
  assert.throws(() => stripMarkedBlocks(content, 'orphan.ts'), /orphan.ts/);
});

test('stripMarkedBlocks returns content unchanged when it carries a NUL byte', () => {
  const content = 'abc\0// cairn-template:exclude-start\ndef';
  assert.equal(stripMarkedBlocks(content, 'binary.bin'), content);
});

test('stripMarkedBlocks returns content unchanged when it carries no marker', () => {
  const content = 'nothing to see here\njust plain lines';
  assert.equal(stripMarkedBlocks(content, 'plain.ts'), content);
});
