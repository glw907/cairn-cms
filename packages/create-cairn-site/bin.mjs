#!/usr/bin/env node
// The `create-cairn-site` entry: finds the prebuilt `cairn` binary that npm installed for this
// platform and runs `cairn new` with it, passing every argument through and inheriting the
// terminal. The binary is a separate package per platform (`@glw907/cairn-<os>-<cpu>`) that
// the launcher lists as optional dependencies, so npm installs only the one that matches.
import { spawnSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const key = `${process.platform}-${process.arch}`;
const pkg = `@glw907/cairn-${key}`;
const exe = process.platform === 'win32' ? 'cairn.exe' : 'cairn';

let binary;
try {
  const manifest = createRequire(import.meta.url).resolve(`${pkg}/package.json`);
  binary = path.join(path.dirname(manifest), 'bin', exe);
} catch {
  process.stderr.write(
    [
      `create-cairn-site: the cairn program for ${key} is not installed.`,
      `npm installs it as the optional dependency ${pkg}, and skips it under --omit=optional or on a platform cairn does not build for.`,
      `To add it, run: npm install ${pkg}`,
      'Releases and downloads: https://github.com/glw907/cairn-cms/releases',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

function run() {
  return spawnSync(binary, ['new', ...process.argv.slice(2)], { stdio: 'inherit' });
}

let result = run();
if (result.error?.code === 'EACCES') {
  // Some installers drop the executable bit; the file is ours, so restore it once.
  chmodSync(binary, 0o755);
  result = run();
}
if (result.error) {
  process.stderr.write(`create-cairn-site: could not run ${binary}: ${result.error.message}\n`);
  process.exit(1);
}
if (result.signal) process.kill(process.pid, result.signal);
process.exit(result.status ?? 1);
