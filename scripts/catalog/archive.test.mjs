// The archive builder: the same bytes from the same source on any machine, a tar that system tar
// reads, a theme archive holding what a lay-in writes, and the catalog's size and content limits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { repoRoot } from '../repo-root.mjs';
import { rewriteAppHtml } from '../theme/theme-names.mjs';
import { buildSetArchive, buildThemeArchive, MAX_ARCHIVE_BYTES, MAX_SET_IMAGE_BYTES } from './archive.mjs';

const ROOT = repoRoot(import.meta.url);
const FIXTURES = path.join(ROOT, 'scripts/catalog/fixtures/archive');
const WAYMARK = path.join(ROOT, 'themes/waymark');

// The fixture theme's archive digest. The builder writes ustar and stored-deflate gzip itself, so
// the bytes depend on no tar or zlib build, and CI and the workstation must both reach this value.
// It changes only when the fixture, the lay-in, or the generated theme-names text changes.
const FIXTURE_THEME_INTEGRITY = 'sha512-AsoScXYhTGKOYgXJJQ2m/JwcJx9jd6Nl0uhtw9y3VL4pR6WCFA9UT8E0L3zy/McSmDrTLIwaE9vMsjkkLgw1LQ==';

/**
 * A scratch directory removed when the test ends.
 * @param {import('node:test').TestContext} t
 */
async function scratch(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-archive-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * Writes the archive to a file and runs system tar over it with the given flags.
 * @param {import('node:test').TestContext} t
 * @param {Buffer} bytes
 * @param {string[]} args
 */
async function runTar(t, bytes, args) {
  const dir = await scratch(t);
  const file = path.join(dir, 'archive.tgz');
  await writeFile(file, bytes);
  const run = spawnSync('tar', [...args, file], { cwd: dir, encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });
  return { run, dir };
}

test('the fixture theme archive hashes to the committed digest', () => {
  const archive = buildThemeArchive(path.join(FIXTURES, 'theme'));
  assert.equal(archive.integrity, FIXTURE_THEME_INTEGRITY);
  assert.equal(archive.size, archive.bytes.length);
});

test('two builds of Waymark give the same digest', () => {
  const first = buildThemeArchive(WAYMARK);
  const second = buildThemeArchive(WAYMARK);
  assert.match(first.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/);
  assert.equal(first.integrity, second.integrity);
  assert.ok(first.bytes.equals(second.bytes));
});

test('tar lists the Waymark archive, every path under theme/, with the generated files', async (t) => {
  const archive = buildThemeArchive(WAYMARK);
  const { run } = await runTar(t, archive.bytes, ['-tzf']);
  assert.equal(run.status, 0, run.stderr);
  const paths = run.stdout.trim().split('\n');
  for (const p of paths) assert.ok(p.startsWith('theme/'), `${p} is outside theme/`);
  assert.ok(paths.includes('theme/theme-names.ts'));
  assert.ok(paths.includes('theme/app-html-block.html'));
  assert.ok(paths.includes('theme/cairn-theme.json'));
  assert.ok(!paths.some((p) => p.startsWith('theme/screenshots')), 'screenshots are not laid in');
  const sorted = [...paths].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  assert.deepEqual(paths, sorted, 'entries are in bytewise path order');
});

test('the extracted block equals what rewriteAppHtml writes for Waymark, unindented', async (t) => {
  const archive = buildThemeArchive(WAYMARK);
  const { run, dir } = await runTar(t, archive.bytes, ['-xzf']);
  assert.equal(run.status, 0, run.stderr);
  const block = await readFile(path.join(dir, 'theme/app-html-block.html'), 'utf8');
  const manifest = JSON.parse(await readFile(path.join(WAYMARK, 'cairn-theme.json'), 'utf8'));
  const appHtml = await readFile(path.join(ROOT, 'examples/showcase/src/app.html'), 'utf8');
  const lines = rewriteAppHtml(appHtml, manifest.colorModes).split('\n');
  const start = lines.findIndex((l) => l.includes('cairn-theme-names:start'));
  const end = lines.findIndex((l) => l.includes('cairn-theme-names:end'));
  const written = lines.slice(start + 1, end).map((l) => l.trimStart());
  assert.equal(block, `${written.join('\n')}\n`);
  assert.match(block, /cairn-site-theme=\(cairn-dark\|cairn\)/);
});

test('a theme archive entry is owned by 0 with mtime 0 and fixed modes', async (t) => {
  const archive = buildThemeArchive(path.join(FIXTURES, 'theme'));
  const { run } = await runTar(t, archive.bytes, ['--numeric-owner', '-tvzf']);
  assert.equal(run.status, 0, run.stderr);
  for (const line of run.stdout.trim().split('\n')) {
    assert.match(line, /^(drwxr-xr-x|-rw-r--r--) 0\/0 /, line);
    assert.match(line, / 1970-01-01 /, line);
  }
  // The gzip header: deflate, no flags, mtime 0, and OS byte 255.
  assert.deepEqual([...archive.bytes.subarray(0, 10)], [0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 0, 0xff]);
});

test('a set archive is rooted at set/ and holds the set as it is', async (t) => {
  const archive = buildSetArchive(path.join(FIXTURES, 'set-blog'));
  const { run } = await runTar(t, archive.bytes, ['-tzf']);
  assert.equal(run.status, 0, run.stderr);
  const paths = run.stdout.trim().split('\n');
  for (const p of paths) assert.ok(p.startsWith('set/'), `${p} is outside set/`);
  for (const p of ['set/cairn-set.json', 'set/src/site/site.config.yaml', 'set/static/images/map.png']) {
    assert.ok(paths.includes(p), `${p} is missing`);
  }
  assert.equal(buildSetArchive(path.join(FIXTURES, 'set-blog')).integrity, archive.integrity);
});

test('a set without the literal siteName: Waymark is refused', () => {
  assert.throws(() => buildSetArchive(path.join(FIXTURES, 'set-no-site-name')), /siteName: Waymark/);
});

test('a set image over 400 KB is refused with the limit', async (t) => {
  const dir = await scratch(t);
  await cp(path.join(FIXTURES, 'set-blog'), dir, { recursive: true });
  await writeFile(path.join(dir, 'static/images/big.webp'), Buffer.alloc(MAX_SET_IMAGE_BYTES + 1, 1));
  assert.throws(() => buildSetArchive(dir), /big\.webp.*400 KB/);
  await writeFile(path.join(dir, 'static/images/big.webp'), Buffer.alloc(MAX_SET_IMAGE_BYTES, 1));
  assert.doesNotThrow(() => buildSetArchive(dir));
});

test('an archive over 8 MiB is refused with the limit', async (t) => {
  const dir = await scratch(t);
  await cp(path.join(FIXTURES, 'theme'), dir, { recursive: true });
  await writeFile(path.join(dir, 'large.bin'), Buffer.alloc(MAX_ARCHIVE_BYTES, 7));
  assert.throws(() => buildThemeArchive(dir), /8 MiB/);
});
