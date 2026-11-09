#!/usr/bin/env node
// The `create-cairn-site` entry: finds the prebuilt `cairn` binary that npm installed for this
// platform and runs `cairn new` with it, passing every argument through and inheriting the
// terminal. The binary is a separate package per platform (`@glw907/cairn-<os>-<cpu>`) that
// the launcher lists as optional dependencies, so npm installs only the one that matches.
import { spawn } from 'node:child_process';
import { chmodSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const key = `${process.platform}-${process.arch}`;
const scope = '@glw907';
const pkg = `${scope}/cairn-${key}`;
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
    if (manifest.name !== pkg || manifest.version !== version) return null;
    // The package sits beside the launcher (npm's hoisted layout, and pnpm's) or inside it (npm's
    // nested layout). Compare real paths, since pnpm links both through its store.
    const real = realpathSync(platformDir);
    const where = [
      path.join(path.dirname(launcherDir), scope, `cairn-${key}`),
      path.join(launcherDir, 'node_modules', scope, `cairn-${key}`),
    ];
    const installedWithLauncher = where.some((candidate) => {
      try {
        return realpathSync(candidate) === real;
      } catch {
        return false;
      }
    });
    return installedWithLauncher ? path.join(platformDir, 'bin', exe) : null;
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
 * On Windows the console already delivers Ctrl-C to the child, and `kill()` there ends it
 * abruptly, so the launcher ignores SIGINT instead of forwarding it.
 */
function run() {
  return new Promise((resolve) => {
    const child = spawn(binary, ['new', ...process.argv.slice(2)], { stdio: 'inherit' });
    const forward = process.platform === 'win32' ? () => {} : (signal) => child.kill(signal);
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
  // Reached only when the signal does not end this process (SIGPIPE is ignored, SIGUSR1 opens
  // the inspector): exit as a shell reports a signal death, never 0.
  process.exit(128 + (os.constants.signals[result.signal] ?? 1));
} else {
  process.exit(result.status ?? 1);
}
