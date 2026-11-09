#!/usr/bin/env node
// The `create-cairn-site` entry: finds the prebuilt `cairn` binary that npm installed for this
// platform and runs `cairn new` with it, passing every argument through and inheriting the
// terminal. The binary is a separate package per platform (`@glw907/cairn-<os>-<cpu>`) that
// the launcher lists as optional dependencies, so npm installs only the one that matches.
import { spawn } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const key = `${process.platform}-${process.arch}`;
const pkg = `@glw907/cairn-${key}`;
const exe = process.platform === 'win32' ? 'cairn.exe' : 'cairn';

const require = createRequire(import.meta.url);
const { version } = require('./package.json');

/**
 * Finds the installed platform package and returns its binary's path, or null. Node's resolution
 * also searches ancestor directories and global paths, so the match must be the exact package at
 * the launcher's own version, installed in the same `node_modules` as the launcher: a stale or
 * planted copy elsewhere never runs.
 */
function findBinary() {
  try {
    const manifestPath = require.resolve(`${pkg}/package.json`);
    const manifest = require(manifestPath);
    const platformDir = path.dirname(manifestPath);
    const launcherDir = path.dirname(fileURLToPath(import.meta.url));
    const sameModules = path.dirname(path.dirname(platformDir)) === path.dirname(launcherDir);
    if (manifest.name !== pkg || manifest.version !== version || !sameModules) return null;
    return path.join(platformDir, 'bin', exe);
  } catch {
    return null;
  }
}

const binary = findBinary();
if (!binary) {
  process.stderr.write(
    [
      `create-cairn-site: the cairn program for ${key} is not installed.`,
      `npm installs it as the optional dependency ${pkg}, and skips it under --omit=optional or on a platform cairn does not build for.`,
      `To add it, run: npm install ${pkg}@${version}`,
      'Releases and downloads: https://github.com/glw907/cairn-cms/releases',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

/**
 * Runs the binary and settles with its exit status. The launcher stays alive until the child
 * exits and forwards the signals a terminal or a harness sends it: `cairn new` traps SIGINT
 * and SIGTERM to stop gracefully, and a launcher that died first would orphan it mid-setup.
 */
function run() {
  return new Promise((resolve) => {
    const child = spawn(binary, ['new', ...process.argv.slice(2)], { stdio: 'inherit' });
    const forward = (signal) => child.kill(signal);
    const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
    for (const s of signals) process.on(s, forward);
    child.on('error', (error) => resolve({ error }));
    child.on('exit', (status, signal) => {
      for (const s of signals) process.off(s, forward);
      resolve({ status, signal });
    });
  });
}

let result = await run();
if (result.error?.code === 'EACCES') {
  // Some installers drop the executable bit; the file is ours, so restore it once.
  try {
    chmodSync(binary, 0o755);
  } catch {
    // A read-only install falls through to the error below.
  }
  result = await run();
}
if (result.error) {
  process.stderr.write(`create-cairn-site: could not run ${binary}: ${result.error.message}\n`);
  process.exit(1);
}
if (result.signal) {
  process.removeAllListeners(result.signal);
  process.kill(process.pid, result.signal);
} else {
  process.exit(result.status ?? 1);
}
