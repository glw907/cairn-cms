// The launcher's proof: the real binary, packed into a platform package and installed beside the
// packed launcher, runs as `create-cairn-site` does for an owner. Nothing here reads a registry or
// an account: both packages install from local tarballs, and the binary is built from `tool/`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { binaryTarget, platformKey } from '../../../scripts/release/pack-platforms.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const packScript = path.join(root, 'scripts/release/pack-platforms.mjs');
const VERSION = '0.0.0-test';
const host = platformKey(process.platform, process.arch);
const exe = process.platform === 'win32' ? 'cairn.exe' : 'cairn';

/** One packed set shared by every case: the host's binary, its platform package, and the launcher. */
const fixture = (() => {
  if (!host) return null;
  const dir = mkdtempSync(path.join(tmpdir(), 'launcher-test-'));
  const binaries = path.join(dir, 'binaries', host);
  mkdirSync(binaries, { recursive: true });
  execFileSync('go', ['build', '-o', path.join(binaries, exe), './cmd/cairn'], {
    cwd: path.join(root, 'tool'),
    stdio: 'inherit',
  });
  const out = path.join(dir, 'packed');
  const stdout = execFileSync(
    process.execPath,
    [packScript, '--version', VERSION, '--binaries', path.join(dir, 'binaries'), '--targets', host, '--out', out],
    { encoding: 'utf8' },
  );
  return { dir, binaries, out, packed: JSON.parse(stdout) };
})();

/** Installs the given tarballs into a fresh project, optional dependencies off, and returns its path. */
function install(...tarballs) {
  const project = mkdtempSync(path.join(fixture.dir, 'project-'));
  execFileSync('npm', ['init', '-y'], { cwd: project, stdio: 'ignore', shell: process.platform === 'win32' });
  execFileSync('npm', ['install', '--omit=optional', '--no-audit', '--no-fund', '--ignore-scripts', ...tarballs], {
    cwd: project,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return project;
}

/** Runs the installed `create-cairn-site` with no terminal on stdin. */
function runLauncher(project, args) {
  const bin =
    process.platform === 'win32'
      ? [process.execPath, [path.join(project, 'node_modules/create-cairn-site/bin.mjs'), ...args]]
      : [path.join(project, 'node_modules/.bin/create-cairn-site'), args];
  return spawnSync(bin[0], bin[1], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

test('the host platform is one the launcher ships', () => {
  assert.ok(host, `no platform package for ${process.platform} ${process.arch}`);
});

test('with no terminal and no flags, the launcher prints the agent guide', { skip: !host }, () => {
  const project = install(fixture.packed.launcher, fixture.packed.platforms[host]);
  const run = runLauncher(project, []);
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /^# Set up a site with an agent/);
});

test('flags and the exit status pass through to the binary', { skip: !host }, () => {
  const project = install(fixture.packed.launcher, fixture.packed.platforms[host]);
  const run = runLauncher(project, [
    '--dry-run',
    '--json',
    '--name',
    'Test Site',
    '--email',
    'owner@example.com',
    '--posture',
    'invite',
  ]);
  assert.equal(run.status, 0, run.stderr);
  const plan = JSON.parse(run.stdout);
  assert.equal(plan.kind, 'dryRun');
  assert.equal(plan.repository, 'test-site');
  assert.equal(plan.worker, 'test-site');
  assert.equal(plan.database, 'test-site-auth');
  assert.equal(plan.bucket, 'test-site-media');
  assert.equal(plan.app, 'cairn-test-site');
  assert.equal(plan.ownerEmail, 'owner@example.com');

  const refused = runLauncher(project, ['--json']);
  assert.notEqual(refused.status, 0, 'a usage error exits non-zero');
});

test('a missing platform package says how to install it', { skip: !host }, () => {
  const project = install(fixture.packed.launcher);
  const run = runLauncher(project, []);
  assert.notEqual(run.status, 0);
  assert.equal(run.stdout, '');
  assert.ok(run.stderr.includes(`@glw907/cairn-${host}`), run.stderr);
  assert.match(run.stderr, /npm install/);
});

test('a signal sent to the launcher reaches the binary, and its exit status comes back', { skip: !host || process.platform === 'win32' }, async () => {
  // A stand-in binary that traps SIGTERM the way `cairn new` does and exits 7 once it is stopped.
  const project = install(fixture.packed.launcher);
  const pkgDir = path.join(project, 'node_modules/@glw907', `cairn-${host}`);
  mkdirSync(path.join(pkgDir, 'bin'), { recursive: true });
  writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: `@glw907/cairn-${host}`, version: VERSION }));
  writeFileSync(
    path.join(pkgDir, 'bin/cairn'),
    '#!/bin/sh\ntrap \'echo stopped; exit 7\' TERM\necho ready\nwhile true; do sleep 0.1; done\n',
    { mode: 0o755 },
  );
  const child = spawn(path.join(project, 'node_modules/.bin/create-cairn-site'), [], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => {
    out += d;
    if (out.includes('ready') && !child.killed) child.kill('SIGTERM');
  });
  const status = await new Promise((resolve) => child.on('exit', (code, signal) => resolve(signal ?? code)));
  assert.equal(status, 7);
  assert.match(out, /stopped/);
});

test('a platform package at another version is not run', { skip: !host || process.platform === 'win32' }, () => {
  const project = install(fixture.packed.launcher);
  const pkgDir = path.join(project, 'node_modules/@glw907', `cairn-${host}`);
  mkdirSync(path.join(pkgDir, 'bin'), { recursive: true });
  writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: `@glw907/cairn-${host}`, version: '9.9.9' }));
  writeFileSync(path.join(pkgDir, 'bin/cairn'), '#!/bin/sh\necho planted\n', { mode: 0o755 });
  const run = runLauncher(project, []);
  assert.notEqual(run.status, 0);
  assert.doesNotMatch(run.stdout, /planted/);
  assert.ok(run.stderr.includes(`@glw907/cairn-${host}@${VERSION}`), run.stderr);
});

test('the packed launcher holds only its entry, manifest, and README', { skip: !host }, () => {
  const listing = execFileSync('tar', ['-tzf', fixture.packed.launcher], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((l) => l.replace(/^package\//, ''))
    .sort();
  assert.deepEqual(listing, ['README.md', 'bin.mjs', 'package.json']);
});

test('the launcher pins all six platform packages at its own version', { skip: !host }, () => {
  const manifest = JSON.parse(
    execFileSync('tar', ['-xzOf', fixture.packed.launcher, 'package/package.json'], { encoding: 'utf8' }),
  );
  assert.equal(manifest.version, VERSION);
  assert.deepEqual(Object.keys(manifest.optionalDependencies).sort(), [
    '@glw907/cairn-darwin-arm64',
    '@glw907/cairn-darwin-x64',
    '@glw907/cairn-linux-arm64',
    '@glw907/cairn-linux-x64',
    '@glw907/cairn-win32-arm64',
    '@glw907/cairn-win32-x64',
  ]);
  for (const v of Object.values(manifest.optionalDependencies)) assert.equal(v, VERSION);
});

test('a platform manifest names the os and cpu its binary was built for', { skip: !host }, () => {
  const tarball = fixture.packed.platforms[host];
  const manifest = JSON.parse(execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], { encoding: 'utf8' }));
  const header = execFileSync('tar', ['-xzOf', tarball, `package/bin/${exe}`], { maxBuffer: 1 << 28 }).subarray(0, 4096);
  const target = binaryTarget(header);
  assert.deepEqual(manifest.os, [target.os]);
  assert.deepEqual(manifest.cpu, [target.cpu]);
  assert.equal(manifest.name, `@glw907/cairn-${host}`);
});

test('packing refuses a binary placed under the wrong platform', { skip: !host }, () => {
  const wrong = host === 'linux-arm64' ? 'linux-x64' : 'linux-arm64';
  const misplaced = path.join(fixture.dir, 'misplaced', wrong);
  mkdirSync(misplaced, { recursive: true });
  const name = wrong.startsWith('win32') ? 'cairn.exe' : 'cairn';
  copyFileSync(path.join(fixture.binaries, exe), path.join(misplaced, name));
  const run = spawnSync(
    process.execPath,
    [packScript, '--version', VERSION, '--binaries', path.join(fixture.dir, 'misplaced'), '--targets', wrong, '--out', path.join(fixture.dir, 'nope')],
    { encoding: 'utf8' },
  );
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, new RegExp(wrong));
  assert.equal(existsSync(path.join(fixture.dir, 'nope')) && readdirSync(path.join(fixture.dir, 'nope')).length > 0, false);
});

test('binaryTarget reads the os and cpu from each executable format', () => {
  const elf = (machine) => {
    const b = Buffer.alloc(64);
    b.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1], 0);
    b.writeUInt16LE(machine, 18);
    return b;
  };
  const macho = (cputype) => {
    const b = Buffer.alloc(64);
    b.set([0xcf, 0xfa, 0xed, 0xfe], 0);
    b.writeUInt32LE(cputype, 4);
    return b;
  };
  const pe = (machine) => {
    const b = Buffer.alloc(256);
    b.write('MZ', 0, 'latin1');
    b.writeUInt32LE(128, 0x3c);
    b.write('PE\0\0', 128, 'latin1');
    b.writeUInt16LE(machine, 132);
    return b;
  };
  assert.deepEqual(binaryTarget(elf(0x3e)), { os: 'linux', cpu: 'x64' });
  assert.deepEqual(binaryTarget(elf(0xb7)), { os: 'linux', cpu: 'arm64' });
  assert.deepEqual(binaryTarget(macho(0x01000007)), { os: 'darwin', cpu: 'x64' });
  assert.deepEqual(binaryTarget(macho(0x0100000c)), { os: 'darwin', cpu: 'arm64' });
  assert.deepEqual(binaryTarget(pe(0x8664)), { os: 'win32', cpu: 'x64' });
  assert.deepEqual(binaryTarget(pe(0xaa64)), { os: 'win32', cpu: 'arm64' });
  assert.throws(() => binaryTarget(Buffer.from('#!/bin/sh\n')), /not a Linux, macOS, or Windows executable/);
});

test.after(() => {
  if (fixture) rmSync(fixture.dir, { recursive: true, force: true });
});
