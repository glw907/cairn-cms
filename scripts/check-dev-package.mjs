// check-dev-package.mjs: the gate over the dev-package (packages/cairn-cms-dev, @glw907/cairn-cms-dev).
// The root check:* gates cover src/lib and the published package, but the dev-package sits in a
// workspace of its own and no gate reaches it. This runs the two checks that keep it honest:
//
//   (1) tsc --noEmit over its tsconfig (which extends the root and includes src/**/*.ts), so a type
//       error in the dev backend or a fake fails CI.
//   (2) eslint over packages/cairn-cms-dev/src, which the flat config (eslint.config.js) now covers
//       with the same TSDoc structure rules and the house/no-em-dash-in-comments ban as src/lib.
//
// Wired as `npm run check:dev-package`. Exits non-zero if either check fails.
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TSCONFIG = 'packages/cairn-cms-dev/tsconfig.json';
const ESLINT_PATH = 'packages/cairn-cms-dev/src';

/**
 * Run a command in the repo root, streaming its output, and return whether it succeeded.
 * @param {string} label the human label echoed before the run
 * @param {string[]} args the npx argv (command and flags)
 * @returns {boolean} true when the command exits 0
 */
function run(label, args) {
  console.log(`== ${label} ==`);
  const result = spawnSync('npx', ['--no-install', ...args], { cwd: ROOT, stdio: 'inherit' });
  return result.status === 0;
}

const tscOk = run('tsc --noEmit (dev-package types)', ['tsc', '--noEmit', '-p', TSCONFIG]);
const lintOk = run('eslint (TSDoc structure + the em-dash ban on the dev-package)', ['eslint', ESLINT_PATH]);

if (tscOk && lintOk) {
  console.log('check:dev-package OK');
  process.exit(0);
}
console.log('check:dev-package FAILED');
process.exit(1);
