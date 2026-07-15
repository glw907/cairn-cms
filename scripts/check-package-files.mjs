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

function packedFilePaths() {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const parsed = JSON.parse(out);
  return (parsed[0]?.files ?? []).map((f) => f.path);
}

function main() {
  const result = checkPackageFiles(packedFilePaths());
  if (!result.ok) {
    console.error(`check-package-files: ${result.error}`);
    process.exit(1);
  }
  console.log(`check-package-files: OK (${result.count} migration file(s) packed)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
