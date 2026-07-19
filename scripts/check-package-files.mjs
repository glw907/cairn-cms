// cairn-cms: the packed-files gate. publint and attw check the export map and the emitted types,
// never an arbitrary file set, so a `files` array that dropped the D1 migrations would ship a
// package a registry consumer cannot provision the auth store from, with nothing to catch it. This
// asserts the tarball npm would publish carries the migrations directory. The core is a pure
// function the test drives; the CLI runs `npm pack --dry-run` and feeds it the real file list.
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// One .sql migration under migrations/ is the floor. The auth store cannot be provisioned without
// them, and they reach a registry consumer only through the packed tarball (no repo checkout).
const MIGRATION_RE = /^migrations\/.+\.sql$/;

/**
 * Check a packed file list for at least one migrations/*.sql entry.
 * @param {string[]} filePaths the paths npm would include in the tarball
 * @returns {{ ok: true, count: number } | { ok: false, error: string }}
 */
export function checkPackageFiles(filePaths) {
  const migrations = filePaths.filter((p) => MIGRATION_RE.test(p));
  if (migrations.length === 0) {
    return {
      ok: false,
      error:
        'the packed tarball carries no migrations/*.sql; add "migrations" to package.json "files" so a registry consumer can provision the auth store',
    };
  }
  return { ok: true, count: migrations.length };
}

// The four published arm indexes plus the docs index; the tutorial's index is its single lesson
// page, since docs/tutorial carries no README.md of its own.
const DOCS_INDEX_PATHS = [
  'docs/README.md',
  'docs/reference/README.md',
  'docs/guides/README.md',
  'docs/explanation/README.md',
  'docs/tutorial/build-your-first-cairn-site.md'
];

// The published docs allowlist. A registry consumer's site build reads the published arms only,
// so any other docs/ path (the write-only planning trees, the rolling status file, or a future
// tree nobody has named yet) fails by construction instead of by an ever-growing denylist.
const DOCS_ALLOWED_ARM_PREFIXES = [
  'docs/reference/',
  'docs/guides/',
  'docs/explanation/',
  'docs/tutorial/'
];
const DOCS_INDEX_PATH = 'docs/README.md';

/**
 * Check a packed file list for the published docs arms, present, and every other docs/ path,
 * absent.
 * @param {string[]} filePaths the paths npm would include in the tarball
 * @returns {{ ok: true, count: number } | { ok: false, error: string }}
 */
export function checkDocsPacked(filePaths) {
  const packed = new Set(filePaths);
  const missing = DOCS_INDEX_PATHS.filter((path) => !packed.has(path));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `the packed tarball is missing ${missing.join(', ')}; add the docs arms to package.json "files" so a registry consumer's site build can read the published docs`
    };
  }
  const leaked = filePaths.filter(
    (path) =>
      path.startsWith('docs/') &&
      path !== DOCS_INDEX_PATH &&
      !DOCS_ALLOWED_ARM_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
  if (leaked.length > 0) {
    return {
      ok: false,
      error: `the packed tarball carries docs paths outside the published allowlist: ${leaked.join(', ')}; check package.json "files" for an overly broad docs entry`
    };
  }
  return { ok: true, count: filePaths.filter((path) => path.startsWith('docs/')).length };
}

/**
 * Extract the packed file paths from `npm pack --json` stdout. The `prepare` lifecycle
 * (svelte-package, which prints `src/lib -> dist`) can leak onto stdout ahead of the JSON on some
 * npm versions even under --ignore-scripts, so parse from the first array bracket, not the raw
 * stream.
 * @param {string} stdout the raw stdout of `npm pack --dry-run --json`
 * @returns {string[]} the paths npm would include in the tarball
 */
export function parsePackFilePaths(stdout) {
  const jsonStart = stdout.indexOf('[');
  if (jsonStart === -1) {
    throw new Error(`npm pack --json produced no JSON array; got: ${stdout.slice(0, 200)}`);
  }
  /** @type {{ files?: { path: string }[] }[]} */
  const parsed = JSON.parse(stdout.slice(jsonStart));
  const files = parsed[0]?.files ?? [];
  return files.map((f) => f.path);
}

function packedFilePaths() {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return parsePackFilePaths(out);
}

function main() {
  const files = packedFilePaths();

  const migrationsResult = checkPackageFiles(files);
  if (!migrationsResult.ok) {
    console.error(`check-package-files: ${migrationsResult.error}`);
    process.exit(1);
  }

  const docsResult = checkDocsPacked(files);
  if (!docsResult.ok) {
    console.error(`check-package-files: ${docsResult.error}`);
    process.exit(1);
  }

  console.log(
    `check-package-files: OK (${migrationsResult.count} migration file(s), ${docsResult.count} docs file(s) packed)`
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
