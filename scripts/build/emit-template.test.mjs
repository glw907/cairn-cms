import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { transformPackageJson, isExcluded, stripMarkedBlocks, emitTemplate } from './emit-template.mjs';

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

test('emitTemplate regenerates the manifest by dropping excluded entries, with no installed dependencies', async () => {
  const from = await mkdtemp(path.join(tmpdir(), 'cairn-emit-from-'));
  const to = path.join(tmpdir(), `cairn-emit-to-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    await writeFile(
      path.join(from, '.cairn-template.json'),
      JSON.stringify({ exclude: ['src/content/posts/2025-01-01-excluded.md'] }),
    );
    await writeFile(path.join(from, 'package.json'), JSON.stringify({ name: 'fixture', dependencies: {} }));
    await mkdir(path.join(from, 'src/content/posts'), { recursive: true });
    await writeFile(path.join(from, 'src/content/posts/2024-01-01-kept.md'), '---\ntitle: Kept\n---\nbody');
    await writeFile(path.join(from, 'src/content/posts/2025-01-01-excluded.md'), '---\ntitle: Excluded\n---\nbody');
    await mkdir(path.join(from, 'src/content/.cairn'), { recursive: true });
    const sourceManifest = {
      version: 1,
      entries: [
        { id: '2024-01-01-kept', concept: 'posts', title: 'Kept', permalink: '/posts/kept', draft: false, links: [] },
        {
          id: '2025-01-01-excluded',
          concept: 'posts',
          title: 'Excluded',
          permalink: '/posts/excluded',
          draft: false,
          links: [],
        },
      ],
    };
    await writeFile(
      path.join(from, 'src/content/.cairn/index.json'),
      JSON.stringify(sourceManifest, null, 2) + '\n',
    );

    await emitTemplate({ from, to, engineSpec: '^1.0.0', devSpec: '^1.0.0' });

    const emitted = JSON.parse(await readFile(path.join(to, 'src/content/.cairn/index.json'), 'utf8'));
    assert.deepEqual(emitted, {
      version: 1,
      entries: [sourceManifest.entries[0]],
    });
  } finally {
    await rm(from, { recursive: true, force: true });
    await rm(to, { recursive: true, force: true });
  }
});
