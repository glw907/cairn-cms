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
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TSCONFIG = 'packages/cairn-cms-dev/tsconfig.json';
const ESLINT_PATH = 'packages/cairn-cms-dev/src';
const MANIFEST = 'packages/cairn-cms-dev/package.json';
const EXPECTED_REPOSITORY_URL = 'git+https://github.com/glw907/cairn-cms.git';

/**
 * Check the dev-package manifest for the fields its OIDC publish depends on. npm validates a
 * provenance bundle against the manifest's own `repository.url` and rejects the publish with a 422
 * when the two disagree, which is invisible to every other gate because nothing else reads the
 * field. The 0.95.0 cut is why this exists: the dev backend's first publish was done by hand, so
 * the OIDC path had never run against this manifest, and the release published the engine while
 * this half failed.
 * @returns {boolean} true when the manifest carries a repository URL matching the engine's
 */
function checkManifest() {
  console.log('== dev-package manifest (the fields provenance validation reads) ==');
  const manifest = JSON.parse(readFileSync(resolve(ROOT, MANIFEST), 'utf8'));
  const url = manifest.repository?.url;
  if (url !== EXPECTED_REPOSITORY_URL) {
    console.log(
      `${MANIFEST}: repository.url is ${JSON.stringify(url)}, expected ${JSON.stringify(EXPECTED_REPOSITORY_URL)}.`
    );
    console.log('An OIDC publish fails with a 422 when provenance and the manifest disagree.');
    return false;
  }
  console.log('repository.url matches the engine repository');
  return true;
}

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
const manifestOk = checkManifest();

if (tscOk && lintOk && manifestOk) {
  console.log('check:dev-package OK');
} else {
  console.log('check:dev-package FAILED');
  process.exitCode = 1;
}
