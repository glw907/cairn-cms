// check-dev-package.mjs: the gate over the dev-package (packages/cairn-cms-dev, @glw907/cairn-cms-dev).
// The root check:* gates cover src/lib and the published package, but the dev-package sits in a
// separate workspace and no gate reaches it. This runs the checks that keep it honest:
//
//   (1) tsc --noEmit over its tsconfig (which extends the root and includes src/**/*.ts), so a type
//       error in the dev backend or a fake fails CI.
//   (2) eslint over packages/cairn-cms-dev/src, which the flat config (eslint.config.js) now covers
//       with the same TSDoc structure rules and the house/no-em-dash-in-comments ban as src/lib.
//   (3) the manifest fields the OIDC publish depends on.
//   (4) the dev-package's version against the root package's, since no release step aligns them.
//   (5) every `exports` condition and `files` entry points into dist/ (or is README.md), so a
//       registry install never resolves a source path the tarball does not carry.
//
// Wired as `npm run check:dev-package`. Exits non-zero if any check fails.
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
 * provenance bundle against the manifest's `repository.url` and rejects the publish with a 422
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
 * Compare the root package's version against the dev-package's version. The cairn-releasing skill has
 * no step that aligns the two, so a cut can publish the engine at a new version while the
 * dev-package manifest sits at the old one, undetected until someone reads the tarball.
 * @param {string} rootVersion the version from the root package.json
 * @param {string} devVersion the version from packages/cairn-cms-dev/package.json
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function checkVersionMatch(rootVersion, devVersion) {
  if (rootVersion !== devVersion) {
    return {
      ok: false,
      error: `package.json version ${rootVersion} does not match ${MANIFEST} version ${devVersion}; align them`
    };
  }
  return { ok: true };
}

/**
 * Collect every string leaf of an `exports` value, however deeply the conditions nest.
 * @param {unknown} value an `exports` subtree
 * @returns {string[]} every condition target string
 */
function exportTargets(value) {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(exportTargets);
  return [];
}

/**
 * Check that every `exports` condition target and every `files` entry of the manifest points into
 * dist/ (or is README.md). Vite resolves the `svelte` condition first, so a leftover source path
 * breaks every registry install while the monorepo symlink hides it.
 * @param {{ exports?: unknown, files?: string[] }} manifest the parsed dev-package manifest
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function checkDistOnly(manifest) {
  const errors = [];
  for (const target of exportTargets(manifest.exports)) {
    if (!target.startsWith('./dist/')) errors.push(`exports target ${target} is outside dist/`);
  }
  for (const entry of manifest.files ?? []) {
    if (entry !== 'README.md' && entry !== 'dist' && !entry.startsWith('dist/')) {
      errors.push(`files entry ${entry} is outside dist/`);
    }
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Read the manifest and run {@link checkDistOnly} against it.
 * @returns {boolean} true when every exports target and files entry points into dist/
 */
function checkDist() {
  console.log('== dev-package ships dist/ only (exports and files) ==');
  const manifest = JSON.parse(readFileSync(resolve(ROOT, MANIFEST), 'utf8'));
  const result = checkDistOnly(manifest);
  if (!result.ok) {
    for (const error of result.errors) console.log(error);
    return false;
  }
  console.log('every exports target and files entry points into dist/');
  return true;
}

/**
 * Read both manifests and run {@link checkVersionMatch} against them.
 * @returns {boolean} true when the two versions match
 */
function checkVersion() {
  console.log('== dev-package version (must match the root package.json) ==');
  const rootPkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  const devPkg = JSON.parse(readFileSync(resolve(ROOT, MANIFEST), 'utf8'));
  const result = checkVersionMatch(rootPkg.version, devPkg.version);
  if (!result.ok) {
    console.log(result.error);
    return false;
  }
  console.log(`versions match (${rootPkg.version})`);
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

/** Run every check, then report and set a failing exit code when any check failed. */
function main() {
  const tscOk = run('tsc --noEmit (dev-package types)', ['tsc', '--noEmit', '-p', TSCONFIG]);
  const lintOk = run('eslint (TSDoc structure + the em-dash ban on the dev-package)', ['eslint', ESLINT_PATH]);
  const manifestOk = checkManifest();
  const versionOk = checkVersion();
  const distOk = checkDist();

  if (tscOk && lintOk && manifestOk && versionOk && distOk) {
    console.log('check:dev-package OK');
  } else {
    console.log('check:dev-package FAILED');
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
